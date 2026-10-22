"""Blended Hangman bot: exact planning on known words, a letter model for unseen words.

Strategy
--------
1. Candidates. Filter the public word list for the game's difficulty (or all
   lists if the state has no difficulty) down to words consistent with the
   pattern and guessed letters.
2. Exact planner. When the word is very likely one of those candidates, search
   every guess sequence over them and pick the letter with the best result:
   most wins first, then most lives left. Ties between equally good letters go
   to the one most likely to hit if the word turns out to be unseen. Results
   are memoized, so each word length is solved once.
3. Out-of-dictionary (OOV) model. For every blank, estimate a letter
   distribution from
     * a bigram letter chain (with word-start/end markers) run forward-backward
       over the pattern, so each blank is conditioned on everything revealed, and
     * substring windows: short slices of the pattern such as "^c_n" or "_ion$"
       matched against every substring of the training words.
   The chance a letter is in the word is 1 - prod(1 - p_blank(letter)).
4. Blending. A Bayesian weight decides how much to trust the dictionary. It
   compares how likely the observed pattern is if the word came from the
   dictionary (|candidates| / |words of that length|) against how likely it is
   under the bigram chain. Real dictionary words are quickly confirmed, while
   unseen words lose their candidates and shift weight to the OOV model.
   Below the planner's trust threshold, pick the letter with the highest
   blended hit probability. Near ties go to the letter that splits the
   candidates most evenly (expected information gain). English frequency is
   only the last tie-breaker.

The bot reads `pattern`, `guessed_letters`, `incorrect_letters`,
`remaining_guesses` and (when present) `difficulty`. It never looks at `word`
while a game is in progress.
"""

from __future__ import annotations

import math
import re
import sys
from collections import Counter
from collections.abc import Iterable
from dataclasses import dataclass
from pathlib import Path
from typing import Any

ROOT = Path(__file__).resolve().parent
EXAMPLES_DIR = ROOT / "bot_examples"
# runner.py imports api_client/leaderboard from the project root. In this
# checkout they live inside bot_examples/, so make that folder importable too.
if str(EXAMPLES_DIR) not in sys.path:
    sys.path.append(str(EXAMPLES_DIR))

from bot_examples.runner import run_cli  # noqa: E402

ALPHABET = "abcdefghijklmnopqrstuvwxyz"
ENGLISH_ORDER = "etaoinshrdlucmfwypvbgkjqxz"  # last-resort tie-breaker only
DIFFICULTIES = ("easy", "medium", "hard")
START, END = "^", "$"
BLANK = "_"
ALL_POOL = "all"


def default_words_dir() -> Path:
    """Return the folder holding easy/medium/hard.txt (root or bot_examples)."""
    for folder in (ROOT / "words", EXAMPLES_DIR / "words"):
        if (folder / "easy.txt").exists():
            return folder
    return ROOT / "words"


def load_word_lists(words_dir: Path | None = None) -> dict[str, list[str]]:
    """Load each public word list, lowercased, alphabetic only, deduplicated."""
    folder = words_dir or default_words_dir()
    lists: dict[str, list[str]] = {}
    for difficulty in DIFFICULTIES:
        path = folder / f"{difficulty}.txt"
        if path.exists():
            lines = path.read_text(encoding="utf-8").splitlines()
            lists[difficulty] = clean_words(lines)
    return lists


def clean_words(words: Iterable[str]) -> list[str]:
    """Lowercase, keep plain a-z words, drop duplicates, sort."""
    return sorted({w.strip().lower() for w in words if w.strip().isalpha() and w.strip().isascii()})


def group_by_length(words: Iterable[str]) -> dict[int, list[str]]:
    groups: dict[int, list[str]] = {}
    for word in words:
        groups.setdefault(len(word), []).append(word)
    return groups


def filter_candidates(words: list[str], slots: list[str], guessed: set[str]) -> list[str]:
    """Words (already the right length) that agree with every public fact.

    A revealed slot must hold that letter. A blank can't hold any guessed
    letter, which covers both misses and revealed letters in wrong spots.
    """
    result = []
    for word in words:
        for letter, slot in zip(word, slots):
            if slot == BLANK:
                if letter in guessed:
                    break
            elif letter != slot:
                break
        else:
            result.append(word)
    return result


@dataclass
class BotConfig:
    """Tunable weights. Defaults are the values picked with simulate.py."""

    prior_in_dictionary: float = 0.9  # prior belief the hidden word is in our lists
    planner_trust: float = 0.5  # use the exact planner once dictionary trust reaches this
    chain_smoothing: float = 0.5  # add-k smoothing for the bigram chain
    chain_weight: float = 1.0  # weight of the bigram posterior per blank
    window_weight: float = 1.0  # base weight of substring-window evidence
    window_length_power: float = 1.0  # longer windows are more specific
    window_confidence: float = 3.0  # matches needed before a window is trusted
    max_window: int = 6  # longest substring window (including ^ and $)
    info_weight: float = 0.02  # how much expected information can break near ties


class WordModel:
    """Everything learned from the training words, precomputed once."""

    def __init__(self, words: Iterable[str], config: BotConfig) -> None:
        self.config = config
        self.words = clean_words(words)
        self._build_chain()
        self._build_substrings()
        self._window_cache: dict[tuple[str, str], Counter[str]] = {}

    # ----- training -------------------------------------------------------

    def _build_chain(self) -> None:
        """Bigram transition probabilities P(next | prev) with start/end markers."""
        counts: dict[str, Counter[str]] = {s: Counter() for s in START + ALPHABET}
        for word in self.words:
            padded = START + word + END
            for prev, nxt in zip(padded, padded[1:]):
                counts[prev][nxt] += 1
        k = self.config.chain_smoothing
        targets = ALPHABET + END
        self.trans: dict[str, dict[str, float]] = {}
        for prev, row in counts.items():
            total = sum(row.values()) + k * len(targets)
            self.trans[prev] = {t: (row[t] + k) / total for t in targets}

    def _build_substrings(self) -> None:
        """Count every substring (2..max_window chars) of the padded words.

        Each length is stored as one newline-joined string so a compiled regex
        can scan all of them in C instead of a Python loop.
        """
        self._sub_counts: dict[int, Counter[str]] = {}
        self._sub_text: dict[int, str] = {}
        for n in range(2, self.config.max_window + 1):
            counter: Counter[str] = Counter()
            for word in self.words:
                padded = START + word + END
                for i in range(len(padded) - n + 1):
                    counter[padded[i : i + n]] += 1
            self._sub_counts[n] = counter
            self._sub_text[n] = "\n".join(counter)

    # ----- out-of-dictionary model ----------------------------------------

    def chain_posteriors(
        self, slots: list[str], allowed: str
    ) -> tuple[float, list[dict[str, float]]]:
        """Forward-backward over the bigram chain.

        Returns the probability of the observed pattern given the word length,
        and, for every position, the posterior letter distribution.
        Time O(L * 26^2), space O(L * 26).
        """
        options = [allowed if s == BLANK else s for s in slots]
        forward = self._forward(options)
        free = self._forward([ALPHABET] * len(slots))
        evidence = sum(forward[-1][a] * self.trans[a][END] for a in options[-1])
        normalizer = sum(free[-1][a] * self.trans[a][END] for a in ALPHABET)
        likelihood = evidence / normalizer if normalizer > 0 else 0.0

        backward: list[dict[str, float]] = [{} for _ in slots]
        backward[-1] = {a: self.trans[a][END] for a in options[-1]}
        for i in range(len(slots) - 2, -1, -1):
            nxt = backward[i + 1]
            backward[i] = {
                a: sum(self.trans[a][b] * nxt[b] for b in options[i + 1]) for a in options[i]
            }

        posteriors = []
        for i in range(len(slots)):
            joint = {a: forward[i][a] * backward[i][a] for a in options[i]}
            total = sum(joint.values())
            posteriors.append({a: v / total for a, v in joint.items()} if total > 0 else {})
        return likelihood, posteriors

    def _forward(self, options: list[str]) -> list[dict[str, float]]:
        forward = [{a: self.trans[START][a] for a in options[0]}]
        for i in range(1, len(options)):
            prev = forward[-1]
            forward.append(
                {b: sum(p * self.trans[a][b] for a, p in prev.items()) for b in options[i]}
            )
        return forward

    def window_evidence(self, slots: list[str], allowed: str) -> list[list[tuple[float, Counter[str]]]]:
        """For each position, (weight, letter counts) from matching substring windows.

        A window is a slice of the padded pattern with at least one blank and
        at least one known symbol (a revealed letter or a word boundary).
        """
        cfg = self.config
        padded = [START, *slots, END]
        evidence: list[list[tuple[float, Counter[str]]]] = [[] for _ in slots]
        for n in range(2, cfg.max_window + 1):
            for start in range(len(padded) - n + 1):
                window = padded[start : start + n]
                blanks = [j for j, s in enumerate(window) if s == BLANK]
                if not blanks or len(blanks) == n:
                    continue
                matches = self._match_window("".join(window), allowed)
                total = sum(matches.values())
                if total == 0:
                    continue
                weight = (n - 1) ** cfg.window_length_power * total / (total + cfg.window_confidence)
                for j in blanks:
                    letters: Counter[str] = Counter()
                    for sub, count in matches.items():
                        letters[sub[j]] += count
                    evidence[start + j - 1].append((weight, letters))
        return evidence

    def _match_window(self, window: str, allowed: str) -> Counter[str]:
        """Substrings matching a window like '^c_n', blanks limited to `allowed`."""
        key = (window, allowed)
        cached = self._window_cache.get(key)
        if cached is not None:
            return cached
        blank_class = f"[{allowed}]"
        body = "".join(blank_class if ch == BLANK else re.escape(ch) for ch in window)
        counts = self._sub_counts[len(window)]
        found = re.findall(f"^{body}$", self._sub_text[len(window)], flags=re.MULTILINE)
        result = Counter({sub: counts[sub] for sub in found})
        if len(self._window_cache) > 200_000:
            self._window_cache.clear()
        self._window_cache[key] = result
        return result


class ExactPlanner:
    """Optimal guessing when the hidden word is one of a fixed set of same-length words.

    A set of candidates is an int bitmask over `words`. Guessing a letter splits
    the set by where that letter appears; the "nowhere" group costs a life.
    The value of a set is a pair of exact integers over its words:

        (words won, total lives left on those wins)

        value(set, lives) = (1, lives)                          if one word is left
                          = best over letters of the sum of its groups' values

    Pairs compare wins first, then lives, which is exactly the leaderboard
    order (wins, then score = 100 * wins + 10 * lives). Sums of integer pairs
    are exact, so equal choices never get decided by rounding noise. Picking
    the best pair per group also gives the best total, because adding pairs
    keeps their order.

    Only letters that split the set are tried: a letter every candidate shares
    at the same spots changes nothing. Every distinct letter of the word must
    be guessed anyway, so fewer misses also means fewer total guesses.

    Time: each (set, lives) pair is solved once, about 1-3 s per word length
    for these lists. Space: one cached pair per (set, lives).
    """

    def __init__(self, words: list[str]) -> None:
        self.words = words
        self.bit = {word: 1 << i for i, word in enumerate(words)}
        # For each letter: (positions it occupies, bitmask of words with exactly those positions)
        self.splits: dict[str, list[tuple[tuple[int, ...], int]]] = {}
        for letter in ALPHABET:
            groups: dict[tuple[int, ...], int] = {}
            for word in words:
                spots = tuple(i for i, ch in enumerate(word) if ch == letter)
                groups[spots] = groups.get(spots, 0) | self.bit[word]
            self.splits[letter] = list(groups.items())
        self._memo: dict[tuple[int, int], tuple[int, int]] = {}

    def optimal_letters(self, candidates: list[str], lives: int) -> list[str]:
        """Every letter that reaches the best (wins, lives) outcome.

        Several letters are often exactly tied; the caller breaks the tie.
        Empty if no letter splits the set.
        """
        members = 0
        for word in candidates:
            members |= self.bit[word]
        lives = max(lives, 1)
        outcomes = {}
        for letter in ALPHABET:
            outcome = self._letter_outcome(letter, members, lives)
            if outcome is not None:
                outcomes[letter] = outcome
        if not outcomes:
            return []
        best = max(outcomes.values())
        return [letter for letter, outcome in outcomes.items() if outcome == best]

    def _outcome(self, members: int, lives: int) -> tuple[int, int]:
        if members & (members - 1) == 0:  # exactly one word left: it's a win
            return (1, lives)
        key = (members, lives)
        cached = self._memo.get(key)
        if cached is not None:
            return cached
        best = (0, 0)
        for letter in ALPHABET:
            outcome = self._letter_outcome(letter, members, lives)
            if outcome is not None and outcome > best:
                best = outcome
        self._memo[key] = best
        return best

    def _letter_outcome(self, letter: str, members: int, lives: int) -> tuple[int, int] | None:
        """Summed outcome after guessing `letter`, or None if it doesn't split the set."""
        groups = [(spots, members & mask) for spots, mask in self.splits[letter] if members & mask]
        if len(groups) < 2:
            return None
        wins = total_lives = 0
        for spots, group in groups:
            left = lives if spots else lives - 1
            if left > 0:
                won, kept = self._outcome(group, left)
                wins += won
                total_lives += kept
        return (wins, total_lives)


class BlendedBot:
    """Hangman bot: exact planning on known words, blended OOV model otherwise."""

    def __init__(
        self,
        word_lists: dict[str, list[str]] | None = None,
        config: BotConfig | None = None,
    ) -> None:
        self.config = config or BotConfig()
        lists = load_word_lists() if word_lists is None else word_lists
        every_word = clean_words(w for words in lists.values() for w in words)
        # Word pools by name: each difficulty, plus "all" for unknown difficulty.
        self.pools: dict[str, dict[int, list[str]]] = {
            name: group_by_length(clean_words(words)) for name, words in lists.items()
        }
        self.pools[ALL_POOL] = group_by_length(every_word)
        self.model = WordModel(every_word, self.config)
        self._planners: dict[tuple[str, int], ExactPlanner] = {}

    def choose_letter(self, state: dict[str, Any]) -> str:
        """Return the next letter. Never raises and never repeats a guess."""
        guessed = {str(g).lower() for g in (state.get("guessed_letters") or [])}
        try:
            letter = self._best_letter(state, guessed)
        except Exception:  # any surprise falls through to the safe choice
            letter = None
        if letter and len(letter) == 1 and letter in ALPHABET and letter not in guessed:
            return letter
        return safe_unused_letter(guessed)

    # ----- decision ---------------------------------------------------------

    def _best_letter(self, state: dict[str, Any], guessed: set[str]) -> str | None:
        slots = [s.lower() for s in str(state.get("pattern") or "").split()]
        guessed |= {str(g).lower() for g in (state.get("incorrect_letters") or [])}
        guessed |= {s for s in slots if s != BLANK}
        unguessed = "".join(c for c in ALPHABET if c not in guessed)
        if not slots or not unguessed:
            return None
        blanks = [i for i, s in enumerate(slots) if s == BLANK]

        pool, pool_words, candidates = self._candidates(state, slots, guessed)
        oov_likelihood, oov_hit = self._oov_hit_probabilities(slots, blanks, unguessed)
        trust = self._dictionary_trust(len(pool_words), len(candidates), oov_likelihood)

        dict_hit = letter_shares(candidates, unguessed)
        info = information_gain(candidates, unguessed) if len(candidates) > 1 else {}
        max_info = math.log(len(candidates)) if len(candidates) > 1 else 1.0

        def score(letter: str) -> tuple[float, float]:
            hit = trust * dict_hit.get(letter, 0.0) + (1 - trust) * oov_hit.get(letter, 0.0)
            bonus = trust * self.config.info_weight * info.get(letter, 0.0) / max_info
            return hit + bonus, -ENGLISH_ORDER.index(letter)

        if candidates and trust >= self.config.planner_trust:
            if len(candidates) == 1:  # word is known: reveal its letters
                return next((c for c in candidates[0] if c not in guessed), None)
            lives = int(state.get("remaining_guesses") or 1)
            optimal = self._planner(pool, len(slots)).optimal_letters(candidates, lives)
            if optimal:
                # Equally optimal for known words, so prefer the safest bet
                # in case the word is unseen.
                return max(optimal, key=score)

        return max(unguessed, key=score)

    def _candidates(
        self, state: dict[str, Any], slots: list[str], guessed: set[str]
    ) -> tuple[str, list[str], list[str]]:
        """(pool name, pool words of this length, consistent candidates).

        Use the game's difficulty list when the state names one. If no word
        there fits, widen to every list before giving up on the dictionary.
        """
        difficulty = str(state.get("difficulty") or "").lower()
        names = [difficulty, ALL_POOL] if difficulty in self.pools else [ALL_POOL]
        for name in names:
            words = self.pools[name].get(len(slots), [])
            candidates = filter_candidates(words, slots, guessed)
            if candidates:
                return name, words, candidates
        return ALL_POOL, self.pools[ALL_POOL].get(len(slots), []), []

    def _planner(self, pool: str, length: int) -> ExactPlanner:
        key = (pool, length)
        if key not in self._planners:
            self._planners[key] = ExactPlanner(self.pools[pool][length])
        return self._planners[key]

    def _dictionary_trust(self, n_words: int, n_candidates: int, oov_likelihood: float) -> float:
        """Posterior probability that the hidden word is one of our candidates.

        P(pattern | dictionary) = |candidates| / |pool words of this length|.
        P(pattern | OOV) comes from the bigram chain.
        """
        if n_candidates == 0 or n_words == 0:
            return 0.0
        dict_likelihood = n_candidates / n_words
        prior = self.config.prior_in_dictionary
        in_dict = prior * dict_likelihood
        out_dict = (1 - prior) * oov_likelihood
        return in_dict / (in_dict + out_dict) if in_dict + out_dict > 0 else 1.0

    def _oov_hit_probabilities(
        self, slots: list[str], blanks: list[int], unguessed: str
    ) -> tuple[float, dict[str, float]]:
        """P(letter is somewhere in the word) for a word we have never seen."""
        cfg = self.config
        likelihood, chain = self.model.chain_posteriors(slots, unguessed)
        windows = self.model.window_evidence(slots, unguessed)

        miss = {c: 1.0 for c in unguessed}
        for i in blanks:
            blended = Counter({c: cfg.chain_weight * chain[i].get(c, 0.0) for c in unguessed})
            for weight, letters in windows[i]:
                total = sum(letters.values())
                for c, count in letters.items():
                    blended[c] += cfg.window_weight * weight * count / total
            norm = sum(blended.values())
            if norm <= 0:
                continue
            for c in unguessed:
                miss[c] *= 1 - blended[c] / norm
        return likelihood, {c: 1 - miss[c] for c in unguessed}


def letter_shares(candidates: list[str], unguessed: str) -> dict[str, float]:
    """Fraction of candidates containing each unguessed letter."""
    if not candidates:
        return {}
    counts: Counter[str] = Counter()
    for word in candidates:
        counts.update(set(word))
    return {c: counts[c] / len(candidates) for c in unguessed}


def information_gain(candidates: list[str], unguessed: str) -> dict[str, float]:
    """Entropy of the pattern partition each letter would split candidates into.

    Time O(26 * |candidates| * L).
    """
    total = len(candidates)
    gains = {}
    for letter in unguessed:
        groups = Counter(
            tuple(i for i, ch in enumerate(word) if ch == letter) for word in candidates
        )
        gains[letter] = -sum((n / total) * math.log(n / total) for n in groups.values())
    return gains


def safe_unused_letter(guessed: set[str]) -> str:
    """Most common English letter not yet guessed (always returns a letter)."""
    for letter in ENGLISH_ORDER:
        if letter not in guessed:
            return letter
    return "e"  # unreachable in a real game: 26 guesses always end it


if __name__ == "__main__":
    sys.exit(run_cli(BlendedBot(), "Blended bot"))
