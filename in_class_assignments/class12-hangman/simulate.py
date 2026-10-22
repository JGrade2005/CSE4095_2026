"""Offline Hangman simulator for comparing bots without touching the server.

Same rules as the server: 6 lives, one letter per guess, and the bot sees the
same state shape (pattern, guessed_letters, incorrect_letters,
remaining_guesses, status, plus difficulty like the official evaluation). The
hidden word is only added once a game ends.

Two test modes:
  full     the bot knows every public word and plays every word once.
  holdout  5-fold split. Each fold hides 20% of words (stratified by
           difficulty) from the bot's training data and plays only those, so
           every word is played once as an unseen word.

Examples:
  python simulate.py                       # my bot, both modes
  python simulate.py --bots my,dictionary  # compare with the reference bot
  python simulate.py --no-difficulty       # casual games (state has no difficulty)

The reference bots ship only as Python 3.13 .pyc files, so "dictionary" and
"frequency" need a Python 3.13 interpreter.
"""

from __future__ import annotations

import argparse
import importlib.util
import random
import sys
import time
import types
from collections.abc import Callable
from pathlib import Path
from typing import Any

from my_bot import ALPHABET, DIFFICULTIES, BlendedBot, BotConfig, default_words_dir

LIVES = 6
MAX_GUESSES = 26
FOLDS = 5
PYCACHE = Path(__file__).resolve().parent / "bot_examples" / "__pycache__"

BotFactory = Callable[[dict[str, list[str]]], Any]


class Game:
    """One local Hangman game with the server's rules and state shape."""

    def __init__(self, word: str, difficulty: str | None) -> None:
        self.word = word
        self.difficulty = difficulty
        self.guessed: list[str] = []
        self.incorrect: list[str] = []
        self.violation: str | None = None

    @property
    def lives(self) -> int:
        return LIVES - len(self.incorrect)

    @property
    def status(self) -> str:
        if self.violation or self.lives <= 0:
            return "lost"
        if all(ch in self.guessed for ch in self.word):
            return "won"
        return "playing"

    def state(self) -> dict[str, Any]:
        state = {
            "pattern": " ".join(ch if ch in self.guessed else "_" for ch in self.word),
            "guessed_letters": list(self.guessed),
            "incorrect_letters": list(self.incorrect),
            "remaining_guesses": self.lives,
            "status": self.status,
        }
        if self.difficulty:
            state["difficulty"] = self.difficulty
        if state["status"] != "playing":
            state["word"] = self.word
        return state

    def guess(self, letter: Any) -> None:
        """Apply a guess. Anything the hard rules forbid ends the game as a forfeit."""
        if not (isinstance(letter, str) and len(letter) == 1 and letter in ALPHABET):
            self.violation = f"invalid letter {letter!r}"
        elif letter in self.guessed:
            self.violation = f"duplicate letter {letter!r}"
        else:
            self.guessed.append(letter)
            if letter not in self.word:
                self.incorrect.append(letter)


def play(bot: Any, word: str, difficulty: str | None) -> dict[str, Any]:
    """Play one word to the end and return the outcome."""
    game = Game(word, difficulty)
    while game.status == "playing" and len(game.guessed) < MAX_GUESSES:
        try:
            letter = bot.choose_letter(game.state())
        except Exception as exc:  # a raising bot forfeits, like on the server
            game.violation = f"raised {exc!r}"
            break
        game.guess(letter)
    won = game.status == "won"
    return {
        "won": won,
        "score": 100 + 10 * game.lives if won else 0,
        "misses": len(game.incorrect),
        "violation": game.violation,
    }


def load_lists() -> dict[str, list[str]]:
    """Words per difficulty, lowercased and deduplicated across lists."""
    folder = default_words_dir()
    seen: set[str] = set()
    lists: dict[str, list[str]] = {}
    for difficulty in DIFFICULTIES:
        words = []
        for line in (folder / f"{difficulty}.txt").read_text(encoding="utf-8").splitlines():
            word = line.strip().lower()
            if word.isalpha() and word not in seen:
                seen.add(word)
                words.append(word)
        lists[difficulty] = words
    return lists


def run_full(
    factory: BotFactory, lists: dict[str, list[str]], show_difficulty: bool
) -> dict[str, list[dict]]:
    """Bot trained on everything, every word played once."""
    bot = factory(lists)
    return {
        d: [play(bot, w, d if show_difficulty else None) for w in words]
        for d, words in lists.items()
    }


def run_holdout(
    factory: BotFactory, lists: dict[str, list[str]], seed: int, show_difficulty: bool
) -> dict[str, list[dict]]:
    """K-fold held-out test: train on 80%, play the hidden 20%."""
    rng = random.Random(seed)
    fold_of: dict[str, int] = {}
    for words in lists.values():  # stratify so every fold has every difficulty
        shuffled = sorted(words)
        rng.shuffle(shuffled)
        for i, word in enumerate(shuffled):
            fold_of[word] = i % FOLDS
    results: dict[str, list[dict]] = {d: [] for d in lists}
    for fold in range(FOLDS):
        train = {d: [w for w in words if fold_of[w] != fold] for d, words in lists.items()}
        bot = factory(train)
        for difficulty, words in lists.items():
            shown = difficulty if show_difficulty else None
            results[difficulty] += [play(bot, w, shown) for w in words if fold_of[w] == fold]
    return results


def report(name: str, mode: str, results: dict[str, list[dict]]) -> None:
    print(f"\n{name}  [{mode}]")
    print(f"  {'difficulty':10} {'games':>5} {'wins':>5} {'win%':>7} {'avg score':>9} {'avg miss':>8}")
    rows = list(results.items()) + [("ALL", [r for rs in results.values() for r in rs])]
    for difficulty, rs in rows:
        wins = sum(r["won"] for r in rs)
        print(
            f"  {difficulty:10} {len(rs):5} {wins:5} {wins / len(rs):7.1%} "
            f"{sum(r['score'] for r in rs) / len(rs):9.1f} "
            f"{sum(r['misses'] for r in rs) / len(rs):8.2f}"
        )
    violations = [r["violation"] for rs in results.values() for r in rs if r["violation"]]
    if violations:
        print(f"  RULE VIOLATIONS: {len(violations)} e.g. {violations[:3]}")


def load_reference_module(name: str) -> types.ModuleType:
    """Import a reference bot from its compiled .pyc (needs Python 3.13).

    dictionary_bot imports a `word_manager` module that was not shipped, so a
    small stand-in is registered. We always pass the dictionary explicitly,
    so the stand-in only has to exist.
    """
    if sys.version_info[:2] != (3, 13):
        raise RuntimeError("reference bots are Python 3.13 .pyc files; run with python3.13")
    if "word_manager" not in sys.modules:
        stub = types.ModuleType("word_manager")
        stub.DIFFICULTIES = DIFFICULTIES
        stub.DEFAULT_WORDS_DIR = default_words_dir()
        stub.WordManager = None
        sys.modules["word_manager"] = stub
    full_name = f"bot_examples.{name}"
    if full_name in sys.modules:
        return sys.modules[full_name]
    path = PYCACHE / f"{name}.cpython-313.pyc"
    spec = importlib.util.spec_from_file_location(full_name, path)
    module = importlib.util.module_from_spec(spec)
    sys.modules[full_name] = module
    spec.loader.exec_module(module)
    return module


def bot_factories() -> dict[str, BotFactory]:
    def dictionary(lists: dict[str, list[str]]) -> Any:
        load_reference_module("frequency_bot")  # dictionary_bot imports it
        words = [w for ws in lists.values() for w in ws]
        return load_reference_module("dictionary_bot").DictionaryBot(dictionary=words)

    def frequency(_lists: dict[str, list[str]]) -> Any:
        return load_reference_module("frequency_bot").FrequencyBot()

    return {
        "my": lambda lists: BlendedBot(lists, BotConfig()),
        "dictionary": dictionary,
        "frequency": frequency,
    }


def main() -> int:
    parser = argparse.ArgumentParser(description="Offline Hangman bot simulator.")
    parser.add_argument("--bots", default="my", help="comma list of: my, dictionary, frequency")
    parser.add_argument("--modes", default="full,holdout", help="comma list of: full, holdout")
    parser.add_argument("--seed", type=int, default=0, help="seed for the holdout split")
    parser.add_argument(
        "--no-difficulty", action="store_true", help="hide difficulty from the state"
    )
    args = parser.parse_args()

    lists = load_lists()
    factories = bot_factories()
    for name in args.bots.split(","):
        for mode in args.modes.split(","):
            started = time.perf_counter()
            show = not args.no_difficulty
            if mode == "full":
                results = run_full(factories[name], lists, show)
            else:
                results = run_holdout(factories[name], lists, args.seed, show)
            report(name, mode, results)
            print(f"  ({time.perf_counter() - started:.1f}s)")
    return 0


if __name__ == "__main__":
    sys.exit(main())
