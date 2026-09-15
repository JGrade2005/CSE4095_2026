#!/usr/bin/env python3
"""8-puzzle solver using breadth-first search (BFS).

Board states are 9-tuples read row by row, with 0 as the empty tile:

    (8, 7, 6, 5, 4, 3, 2, 1, 0)   ->   8 7 6
                                       5 4 3
                                       2 1 _

Design notes:
  * States are tuples so they are hashable and can be used as dict keys.
  * `parent` doubles as the visited set and lets us rebuild the path at the end.
  * The goal is checked when a state is *generated* rather than when it is
    dequeued. BFS still returns a shortest path, and it skips expanding the
    rest of the final layer.
  * Solvability is checked up front with the inversion count. Without it, an
    unsolvable board makes BFS exhaust every reachable state before failing.

Complexity: a 3x3 board has 9!/2 = 181,440 reachable states, so BFS is
O(9!/2) time and space in the worst case (branching factor <= 4).
"""

from __future__ import annotations

import argparse
import sys
import time
from collections import deque

State = tuple[int, ...]

SIZE = 3
GOAL: State = (1, 2, 3, 4, 5, 6, 7, 8, 0)
DEFAULT_START = "876543210"

# Direction a tile slides, keyed by (old blank index - new blank index).
DIRECTIONS = {1: "right", -1: "left", SIZE: "down", -SIZE: "up"}


def _build_neighbors() -> list[list[int]]:
    """For each board index, the indices the blank can swap with.

    Order is up, down, left, right. bfs.html uses the same order,
    so both produce the identical path and state count.
    """
    neighbors = []
    for i in range(SIZE * SIZE):
        row, col = divmod(i, SIZE)
        adjacent = []
        if row > 0:
            adjacent.append(i - SIZE)
        if row < SIZE - 1:
            adjacent.append(i + SIZE)
        if col > 0:
            adjacent.append(i - 1)
        if col < SIZE - 1:
            adjacent.append(i + 1)
        neighbors.append(adjacent)
    return neighbors


NEIGHBORS = _build_neighbors()


# --------------------------------------------------------------------------- #
# Board helpers
# --------------------------------------------------------------------------- #
def parse_state(text: str) -> State:
    """Parse '876543210', '8 7 6 5 4 3 2 1 0' or '8,7,6,...' into a state."""
    digits = [ch for ch in text if not ch.isspace() and ch != ","]
    if sorted(digits) != list("012345678"):
        raise ValueError("board must contain each digit 0-8 exactly once")
    return tuple(int(d) for d in digits)


def count_inversions(state: State) -> int:
    """Pairs of tiles (ignoring the blank) that appear in the wrong order."""
    tiles = [t for t in state if t != 0]
    return sum(
        1
        for i in range(len(tiles))
        for j in range(i + 1, len(tiles))
        if tiles[i] > tiles[j]
    )


def is_solvable(state: State) -> bool:
    """On an odd-width board, a move never changes inversion parity, and the
    goal has 0 inversions, so only even-parity boards can reach it."""
    return count_inversions(state) % 2 == 0


def successors(state: State):
    """Yield every state reachable by sliding one tile into the blank."""
    blank = state.index(0)
    for n in NEIGHBORS[blank]:
        board = list(state)
        board[blank], board[n] = board[n], board[blank]
        yield tuple(board)


def describe_move(before: State, after: State) -> str:
    """Name the move between two adjacent states, e.g. 'Move 1 right'."""
    old_blank, new_blank = before.index(0), after.index(0)
    tile = before[new_blank]  # the tile that slid into the old blank
    return f"Move {tile} {DIRECTIONS[old_blank - new_blank]}"


def format_board(state: State) -> str:
    cells = ["_" if t == 0 else str(t) for t in state]
    return "\n".join(" ".join(cells[r * SIZE:(r + 1) * SIZE]) for r in range(SIZE))


# --------------------------------------------------------------------------- #
# BFS
# --------------------------------------------------------------------------- #
def bfs(start: State, goal: State = GOAL) -> tuple[list[State] | None, int]:
    """Return (shortest path from start to goal, number of states discovered).

    The path includes both start and goal. It is None if goal is unreachable.
    "Discovered" counts every unique state added to the visited set.
    """
    if start == goal:
        return [start], 1

    parent: dict[State, State | None] = {start: None}
    queue = deque([start])

    while queue:
        state = queue.popleft()
        for nxt in successors(state):
            if nxt in parent:
                continue
            parent[nxt] = state
            if nxt == goal:
                return _reconstruct_path(parent, goal), len(parent)
            queue.append(nxt)

    return None, len(parent)


def _reconstruct_path(parent: dict[State, State | None], goal: State) -> list[State]:
    path = []
    state: State | None = goal
    while state is not None:
        path.append(state)
        state = parent[state]
    path.reverse()
    return path


# --------------------------------------------------------------------------- #
# CLI
# --------------------------------------------------------------------------- #
def main(argv: list[str] | None = None) -> int:
    parser = argparse.ArgumentParser(description="Solve the 8-puzzle with BFS.")
    parser.add_argument(
        "board",
        nargs="?",
        default=DEFAULT_START,
        help="start board read row by row, 0 = blank (default: %(default)s)",
    )
    parser.add_argument(
        "-q", "--quiet", action="store_true", help="print move names only, no boards"
    )
    args = parser.parse_args(argv)

    try:
        start = parse_state(args.board)
    except ValueError as err:
        parser.error(str(err))

    print(f"Start:\n{format_board(start)}\n")

    if not is_solvable(start):
        print(
            f"Unsolvable: {count_inversions(start)} inversions "
            "(must be even to reach the goal)."
        )
        return 1

    began = time.perf_counter()
    path, discovered = bfs(start)
    elapsed = time.perf_counter() - began

    assert path is not None  # guaranteed by the solvability check

    for step in range(1, len(path)):
        print(f"Step {step}: {describe_move(path[step - 1], path[step])}")
        if not args.quiet:
            print(format_board(path[step]) + "\n")

    print(f"\nSolved in {len(path) - 1} moves.")
    print(f"States discovered: {discovered:,}")
    print(f"Time: {elapsed:.2f}s")
    return 0


if __name__ == "__main__":
    sys.exit(main())
