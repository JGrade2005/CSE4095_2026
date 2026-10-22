"""In-memory Hangman evaluation leaderboard.

Completed evaluations are ranked consistently. Entries are not written to
disk; they disappear when the server process exits.
"""

from __future__ import annotations

from typing import Any

ANONYMOUS_NAME = "anonymous"

# Ranking (all else equal, earlier keys win):
# 1. more wins
# 2. higher total score
# 3. more remaining lives on wins
# 4. fewer average guesses
# 5. name / evaluation id for a stable order
RANKING = (
    "wins descending, then total score descending, "
    "then remaining lives on wins descending, then average guesses ascending"
)


def record_from_summary(summary: dict[str, Any], name: str | None = None) -> dict[str, Any]:
    """Build a leaderboard row from an official evaluation summary."""
    total_games = int(summary["total_games"])
    wins = int(summary["wins"])
    total_guesses = int(summary["total_guesses"])
    display_name = name if name and str(name).strip() else summary.get("name")
    if not display_name or not str(display_name).strip():
        display_name = ANONYMOUS_NAME
    else:
        display_name = str(display_name).strip()
    return {
        "evaluation_id": summary["evaluation_id"],
        "name": display_name,
        "total_games": total_games,
        "wins": wins,
        "win_rate": (wins / total_games) if total_games else 0.0,
        "average_guesses": (total_guesses / total_games) if total_games else 0.0,
        "average_remaining_guesses_on_wins": float(
            summary.get("average_remaining_guesses_on_wins") or 0.0
        ),
        "total_score": int(summary["total_score"]),
    }


def rank_records(records: list[dict[str, Any]]) -> list[dict[str, Any]]:
    """Return a new list of records with 1-based rank assigned."""
    ordered = sorted(records, key=_sort_key)
    ranked: list[dict[str, Any]] = []
    for index, record in enumerate(ordered, start=1):
        ranked.append({**record, "rank": index})
    return ranked


def format_leaderboard(payload: dict[str, Any]) -> str:
    """Render leaderboard JSON for a terminal."""
    lines = ["Leaderboard (in-memory; resets when the server restarts)"]
    entries = payload.get("entries") or []
    if not entries:
        lines.append("  (no completed evaluations yet)")
        return "\n".join(lines)
    for entry in entries:
        lines.append(
            f"  {entry['rank']:2}. {entry['name']:<22}  "
            f"wins={entry['wins']}/{entry['total_games']}  "
            f"win_rate={entry['win_rate']:.1%}  "
            f"avg_guesses={entry['average_guesses']:.2f}  "
            f"avg_lives={entry['average_remaining_guesses_on_wins']:.2f}  "
            f"score={entry['total_score']}"
        )
    return "\n".join(lines)


def _sort_key(record: dict[str, Any]) -> tuple:
    return (
        -int(record["wins"]),
        -int(record["total_score"]),
        -float(record["average_remaining_guesses_on_wins"]),
        float(record["average_guesses"]),
        str(record.get("name") or ANONYMOUS_NAME).lower(),
        str(record.get("evaluation_id") or ""),
    )


class Leaderboard:
    """Store completed evaluation rows until the process exits."""

    persistent = False

    def __init__(self) -> None:
        self._records: dict[str, dict[str, Any]] = {}

    def add_record(self, record: dict[str, Any]) -> None:
        evaluation_id = record["evaluation_id"]
        self._records[evaluation_id] = dict(record)

    def add_session(self, session: Any) -> None:
        if getattr(session, "status", None) != "completed":
            return
        self.add_record(record_from_summary(session.summary(), session.name))

    def to_payload(self) -> dict[str, Any]:
        return {
            "persistent": self.persistent,
            "ranking": RANKING,
            "entries": rank_records(list(self._records.values())),
        }
