#!/usr/bin/env python3
"""Card Game 24 - command line version.

Deal four cards (A=1 ... K=13) and build an arithmetic expression equal to 24
using +, -, *, / and parentheses, with each card value used exactly once.

Design notes:
  * Fractions are used everywhere instead of floats so that expressions like
    8 / (3 - 8 / 3) evaluate exactly, with no rounding error.
  * Player input is parsed by a small recursive-descent parser rather than
    eval(), which keeps arbitrary code out of the program and lets us collect
    the operands that were actually used.
"""

from __future__ import annotations

import argparse
import random
import sys
from dataclasses import dataclass
from fractions import Fraction
from itertools import combinations

TARGET = Fraction(24)

RANKS = ["A", "2", "3", "4", "5", "6", "7", "8", "9", "10", "J", "Q", "K"]
SUITS = ["♠", "♥", "♦", "♣"]  # spades hearts diamonds clubs
RANK_VALUE = {rank: i + 1 for i, rank in enumerate(RANKS)}


# --------------------------------------------------------------------------- #
# Cards
# --------------------------------------------------------------------------- #
@dataclass(frozen=True)
class Card:
    """One physical playing card. A real deck is modeled so that duplicate
    ranks can appear (four suits each) but the same card is never dealt twice."""

    rank: str
    suit: str

    @property
    def value(self) -> int:
        return RANK_VALUE[self.rank]

    def __str__(self) -> str:
        return f"{self.rank}{self.suit}"


def build_deck() -> list[Card]:
    return [Card(rank, suit) for rank in RANKS for suit in SUITS]


def deal(count: int = 4) -> list[Card]:
    """Deal `count` distinct cards off a shuffled deck."""
    return random.sample(build_deck(), count)


def deal_playable(count: int = 4, max_attempts: int = 500) -> list[Card]:
    """Deal a hand that is guaranteed to have a solution.

    About 75% of hands are solvable (1362 of the 1820 distinct value
    combinations), so re-dealing until one is averages ~1.3 deals. Rejection
    sampling like this keeps the natural card distribution intact, which
    precomputing a list of solvable hands would not. The player is never told
    a hand was discarded.
    """
    for _ in range(max_attempts):
        cards = deal(count)
        if solve([card.value for card in cards]):
            return cards
    raise RuntimeError("no solvable hand found")  # unreachable for count == 4


def render_cards(cards: list[Card]) -> str:
    """Return the hand as side-by-side ASCII cards."""
    rows = [[] for _ in range(5)]
    for card in cards:
        top = card.rank.ljust(2)
        bottom = card.rank.rjust(2)
        rows[0].append("┌───────┐")
        rows[1].append(f"│{top}     │")
        rows[2].append(f"│   {card.suit}   │")
        rows[3].append(f"│     {bottom}│")
        rows[4].append("└───────┘")
    return "\n".join("  ".join(row) for row in rows)


# --------------------------------------------------------------------------- #
# Expression parser  (grammar shown beside each function)
# --------------------------------------------------------------------------- #
class ExpressionError(ValueError):
    """Raised for malformed player input."""


class Parser:
    """Recursive-descent parser producing an exact Fraction.

    expr   := term (('+' | '-') term)*
    term   := factor (('*' | '/') factor)*
    factor := '-' factor | '(' expr ')' | operand
    operand:= digits | 'A' | 'J' | 'Q' | 'K'

    Time and space: O(n) in the length of the expression.
    """

    def __init__(self, text: str) -> None:
        self.text = text
        self.pos = 0
        self.operands: list[int] = []  # every leaf value the player used

    # -- token helpers ----------------------------------------------------- #
    def _skip_spaces(self) -> None:
        while self.pos < len(self.text) and self.text[self.pos].isspace():
            self.pos += 1

    def _peek(self) -> str | None:
        self._skip_spaces()
        return self.text[self.pos] if self.pos < len(self.text) else None

    def _eat(self, char: str) -> bool:
        if self._peek() == char:
            self.pos += 1
            return True
        return False

    # -- grammar ----------------------------------------------------------- #
    def parse(self) -> Fraction:
        value = self.expr()
        if self._peek() is not None:
            raise ExpressionError(f"unexpected '{self.text[self.pos]}'")
        return value

    def expr(self) -> Fraction:
        value = self.term()
        while (op := self._peek()) in ("+", "-"):
            self.pos += 1
            rhs = self.term()
            value = value + rhs if op == "+" else value - rhs
        return value

    def term(self) -> Fraction:
        value = self.factor()
        while (op := self._peek()) in ("*", "/", "x", "X"):
            self.pos += 1
            rhs = self.factor()
            if op == "/":
                if rhs == 0:
                    raise ExpressionError("division by zero")
                value /= rhs
            else:
                value *= rhs
        return value

    def factor(self) -> Fraction:
        char = self._peek()
        if char is None:
            raise ExpressionError("expression ended early")
        if char == "-":
            self.pos += 1
            return -self.factor()
        if char == "(":
            self.pos += 1
            value = self.expr()
            if not self._eat(")"):
                raise ExpressionError("missing ')'")
            return value
        return Fraction(self.operand())

    def operand(self) -> int:
        char = self._peek()
        if char is not None and char.isdigit():
            start = self.pos
            while self.pos < len(self.text) and self.text[self.pos].isdigit():
                self.pos += 1
            value = int(self.text[start:self.pos])
        elif char is not None and char.upper() in RANK_VALUE:
            self.pos += 1
            value = RANK_VALUE[char.upper()]
        else:
            raise ExpressionError(f"expected a card value, found '{char}'")
        self.operands.append(value)
        return value


def evaluate(expression: str) -> tuple[Fraction, list[int]]:
    """Evaluate an expression, returning its value and the operands it used."""
    parser = Parser(expression)
    return parser.parse(), parser.operands


# --------------------------------------------------------------------------- #
# Solver
# --------------------------------------------------------------------------- #
def _combine(a: Fraction, ea: str, b: Fraction, eb: str):
    """Every value reachable by applying one operator to two sub-expressions."""
    yield a + b, f"({ea} + {eb})"
    yield a - b, f"({ea} - {eb})"
    yield b - a, f"({eb} - {ea})"
    yield a * b, f"({ea} * {eb})"
    if b != 0:
        yield a / b, f"({ea} / {eb})"
    if a != 0:
        yield b / a, f"({eb} / {ea})"


def _search(items: list[tuple[Fraction, str]], target: Fraction):
    """Repeatedly replace two values with their combination until one is left.

    Collapsing pairs in every order reproduces all five binary-tree shapes and
    all orderings of the four numbers, so the search is exhaustive.
    """
    if len(items) == 1:
        value, expression = items[0]
        return expression if value == target else None

    for i, j in combinations(range(len(items)), 2):
        rest = [items[k] for k in range(len(items)) if k != i and k != j]
        for value, expression in _combine(*items[i], *items[j]):
            found = _search(rest + [(value, expression)], target)
            if found:
                return found
    return None


def solve(values: list[int], target: Fraction = TARGET) -> str | None:
    """Return one solution expression, or None if the hand is unsolvable.

    Four cards means at most 6*6 x 3*6 x 1*6 = 3888 expressions, so the search
    is effectively O(1) here; in general it is O(n!^2 * 6^(n-1)) time and O(n)
    stack depth.
    """
    items = [(Fraction(v), str(v)) for v in values]
    solution = _search(items, target)
    return _strip_outer_parens(solution) if solution else None


def _strip_outer_parens(expression: str) -> str:
    if expression.startswith("(") and expression.endswith(")"):
        return expression[1:-1]
    return expression


# --------------------------------------------------------------------------- #
# Game loop
# --------------------------------------------------------------------------- #
HELP = """
Commands:
  <expression>  check an expression, e.g.  (8 - 5) * (6 + 2)
  new           deal a fresh hand
  solve         reveal a solution for the current hand
  help          show this message
  quit          exit
"""


def check_answer(expression: str, cards: list[Card]) -> tuple[bool, str]:
    """Validate one attempt. Returns (correct, message)."""
    try:
        value, operands = evaluate(expression)
    except ExpressionError as err:
        return False, f"Invalid expression: {err}"

    expected = sorted(card.value for card in cards)
    if sorted(operands) != expected:
        return False, (
            "Each card must be used exactly once. "
            f"You used {sorted(operands)}, the cards are {expected}."
        )

    if value == TARGET:
        return True, "Correct - that makes 24!"
    return False, f"That evaluates to {value}, not 24."


def play(seed: int | None = None) -> None:
    if seed is not None:
        random.seed(seed)

    print("=" * 46)
    print(" Card Game 24 - make 24 from four cards")
    print(" Every hand dealt has at least one solution.")
    print("=" * 46)
    print(HELP)

    cards = deal_playable()
    while True:
        print(f"\nYour cards: {'  '.join(str(c) for c in cards)}")
        print(render_cards(cards))
        print(f"Values: {[c.value for c in cards]}")

        try:
            entry = input("\n24> ").strip()
        except (EOFError, KeyboardInterrupt):
            print("\nGoodbye.")
            return

        if not entry:
            continue

        command = entry.lower()
        if command in ("q", "quit", "exit"):
            print("Goodbye.")
            return
        if command in ("n", "new"):
            cards = deal_playable()
            continue
        if command in ("h", "help", "?"):
            print(HELP)
            continue
        if command in ("s", "solve"):
            solution = solve([c.value for c in cards])
            print(f"  {solution} = 24" if solution else "  This hand has no solution.")
            continue

        correct, message = check_answer(entry, cards)
        print(f"  {message}")
        if correct:
            cards = deal_playable()


# --------------------------------------------------------------------------- #
# Entry point
# --------------------------------------------------------------------------- #
def main(argv: list[str] | None = None) -> int:
    parser = argparse.ArgumentParser(description="Card Game 24")
    parser.add_argument(
        "--cards", nargs=4, type=int, metavar="V",
        help="check a specific hand (values 1-13) instead of playing",
    )
    parser.add_argument("--seed", type=int, help="seed the shuffle for repeatable hands")
    args = parser.parse_args(argv)

    if args.cards:
        if any(not 1 <= v <= 13 for v in args.cards):
            print("Card values must be between 1 and 13.", file=sys.stderr)
            return 2
        solution = solve(args.cards)
        print(f"{args.cards} -> {solution} = 24" if solution else f"{args.cards} -> no solution")
        return 0

    play(args.seed)
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
