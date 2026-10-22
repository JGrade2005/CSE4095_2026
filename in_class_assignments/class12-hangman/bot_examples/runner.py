"""Shared play loop and CLI for Hangman bots.

A bot is any object with:

    choose_letter(state) -> str

`state` is the JSON object returned by the server. Bots must not assume
access to the hidden word while status is "playing".
"""

from __future__ import annotations

import argparse
import os
import sys
from pathlib import Path
from collections.abc import Callable
from typing import Any, Protocol

ROOT = Path(__file__).resolve().parents[1]
if str(ROOT) not in sys.path:
    sys.path.insert(0, str(ROOT))

from api_client import DEFAULT_BASE_URL, HangmanApiClient, HangmanApiError
from leaderboard import format_leaderboard

MAX_GUESSES_PER_GAME = 26


class LetterBot(Protocol):
    """Common Hangman bot interface."""

    def choose_letter(self, state: dict[str, Any]) -> str:
        """Return the next letter to guess from public game state."""


def play_one_game(
    client: HangmanApiClient,
    bot: LetterBot,
    difficulty: str,
) -> dict[str, Any]:
    """Play one game to completion using only the REST API."""
    created = client.create_game(difficulty)
    game_id = created["game_id"]
    state = client.get_game(game_id)
    guesses = 0

    while state.get("status") == "playing":
        if guesses >= MAX_GUESSES_PER_GAME:
            raise HangmanApiError("bot exceeded the maximum number of guesses")
        letter = bot.choose_letter(state)
        state = client.guess(game_id, letter)
        guesses += 1

    return {
        "difficulty": difficulty,
        "status": state["status"],
        "word": state.get("word"),
        "guesses": guesses,
        "guessed_letters": list(state.get("guessed_letters") or []),
        "incorrect_letters": list(state.get("incorrect_letters") or []),
        "remaining_guesses": state["remaining_guesses"],
    }


def play_games(
    client: HangmanApiClient,
    bot: LetterBot,
    difficulty: str,
    count: int,
) -> list[dict[str, Any]]:
    return [play_one_game(client, bot, difficulty) for _ in range(count)]


def play_evaluation(
    client: HangmanApiClient,
    bot: LetterBot,
    name: str | None = None,
    progress: Callable[[str], None] | None = None,
) -> dict[str, Any]:
    """Play every server-assigned evaluation game in order."""
    state = client.start_evaluation(name=name)
    evaluation_id = state["evaluation_id"]
    total = state.get("total_games")
    if progress is not None:
        progress(
            f"Started evaluation {evaluation_id} "
            f"({total} games; this can take several minutes on a remote host)"
        )
    while state.get("evaluation_status") != "completed":
        while state.get("status") == "playing":
            letter = bot.choose_letter(state)
            state = client.evaluation_guess(evaluation_id, letter)
        if progress is not None:
            progress(
                f"Game {state.get('completed_games')}/{total} "
                f"{state.get('difficulty')} {state.get('status')}"
            )
        if state.get("evaluation_status") == "completed":
            break
        state = client.evaluation_next(evaluation_id)
    return client.evaluation_results(evaluation_id)


def summarize(results: list[dict[str, Any]]) -> dict[str, Any]:
    wins = [result for result in results if result["status"] == "won"]
    losses = [result for result in results if result["status"] == "lost"]
    total_guesses = sum(result["guesses"] for result in results)
    win_remaining = [result["remaining_guesses"] for result in wins]
    return {
        "games": len(results),
        "wins": len(wins),
        "losses": len(losses),
        "win_rate": (len(wins) / len(results)) if results else 0.0,
        "average_guesses": (total_guesses / len(results)) if results else 0.0,
        "average_remaining_on_wins": (
            sum(win_remaining) / len(win_remaining) if win_remaining else 0.0
        ),
    }


def format_summary(bot_name: str, difficulty: str, stats: dict[str, Any]) -> str:
    return "\n".join(
        [
            f"{bot_name} — {stats['games']} {difficulty} game(s)",
            f"Wins: {stats['wins']}  Losses: {stats['losses']}  "
            f"Win rate: {stats['win_rate']:.1%}",
            f"Average guesses: {stats['average_guesses']:.2f}",
            f"Average remaining lives on wins: {stats['average_remaining_on_wins']:.2f}",
        ]
    )


def run_cli(bot: LetterBot, bot_name: str, argv: list[str] | None = None) -> int:
    parser = argparse.ArgumentParser(description=f"Play Hangman automatically ({bot_name}).")
    parser.add_argument(
        "--url",
        default=os.environ.get("HANGMAN_API_URL", DEFAULT_BASE_URL),
        help=f"Hangman API base URL (default: {DEFAULT_BASE_URL})",
    )
    parser.add_argument(
        "--difficulty",
        default="medium",
        choices=("easy", "medium", "hard"),
        help="Word list difficulty (default: medium)",
    )
    parser.add_argument(
        "--games",
        type=int,
        default=10,
        help="Number of casual games to play (default: 10)",
    )
    parser.add_argument(
        "--evaluate",
        action="store_true",
        help="Play the official server-controlled evaluation session",
    )
    parser.add_argument(
        "--name",
        default=None,
        help="Name to show on the leaderboard (default: the bot name)",
    )
    args = parser.parse_args(argv)
    if args.games < 1:
        parser.error("--games must be at least 1")

    client = HangmanApiClient(args.url)
    try:
        if args.evaluate:
            results = play_evaluation(
                client,
                bot,
                name=args.name or bot_name,
                progress=lambda message: print(message, file=sys.stderr, flush=True),
            )
        else:
            played = play_games(client, bot, args.difficulty, args.games)
            stats = summarize(played)
            print(format_summary(bot_name, args.difficulty, stats))
            print()
            for index, result in enumerate(played, start=1):
                word = result.get("word") or "?"
                print(
                    f"  {index:3}. {result['status']:4}  word={word:12}  "
                    f"guesses={result['guesses']:2}  remaining={result['remaining_guesses']}"
                )
            return 0
    except HangmanApiError as exc:
        print(str(exc), file=sys.stderr)
        return 1
    except KeyboardInterrupt:
        print("\nInterrupted.", file=sys.stderr)
        return 130
    finally:
        client.close()

    print(
        f"{bot_name} — official evaluation "
        f"{results['wins']}/{results['total_games']} wins  "
        f"score={results['total_score']}"
    )
    print(
        f"Guesses: {results['total_guesses']}  "
        f"Incorrect: {results['total_incorrect_guesses']}  "
        f"Avg remaining on wins: {results['average_remaining_guesses_on_wins']:.2f}"
    )
    print()
    for result in results.get("games") or []:
        print(
            f"  {result['index'] + 1:3}. {result['difficulty']:6}  "
            f"{result['status']:4}  word={result['word']:16}  "
            f"guesses={result['guesses']:2}  remaining={result['remaining_guesses']}  "
            f"score={result['score']}"
        )
    print()
    try:
        print(format_leaderboard(client.get_leaderboard()))
    except HangmanApiError as exc:
        print(f"Could not load leaderboard: {exc}", file=sys.stderr)
    return 0
