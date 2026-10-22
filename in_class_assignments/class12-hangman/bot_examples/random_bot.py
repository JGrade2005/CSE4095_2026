"""Level 1 Hangman bot: guess unused letters uniformly at random."""

from __future__ import annotations

import sys
from pathlib import Path
from random import Random
from typing import Any

ROOT = Path(__file__).resolve().parents[1]
if str(ROOT) not in sys.path:
    sys.path.insert(0, str(ROOT))

from bot_examples.runner import run_cli

ALPHABET = "abcdefghijklmnopqrstuvwxyz"


class RandomBot:
    """Choose the next unused letter at random."""

    def __init__(self, rng: Random | None = None) -> None:
        self._rng = rng if rng is not None else Random()

    def choose_letter(self, state: dict[str, Any]) -> str:
        guessed = set(state.get("guessed_letters") or [])
        remaining = [letter for letter in ALPHABET if letter not in guessed]
        if not remaining:
            raise RuntimeError("no unused letters remain")
        return self._rng.choice(remaining)


if __name__ == "__main__":
    sys.exit(run_cli(RandomBot(), "Random bot"))
