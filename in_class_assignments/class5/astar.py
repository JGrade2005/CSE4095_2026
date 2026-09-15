#!/usr/bin/env python3
"""8-puzzle solver using A* search with the Manhattan distance heuristic.

Board states are 9-tuples read row by row, with 0 as the empty tile:

    (8, 7, 6, 5, 4, 3, 2, 1, 0)   ->   8 7 6
                                       5 4 3
                                       2 1 _

A* always expands the state with the lowest f = g + h, where
  g = moves made so far
  h = Manhattan distance: sum of each tile's row + column distance to its goal cell

Design notes:
  * Manhattan distance is admissible (never overestimates) and consistent: one
    move shifts one tile by one cell, so h changes by exactly 1. That means A*
    returns a shortest path, and a state popped off the heap never needs
    to be revisited.
  * The goal is checked when a state is *popped*, not when it is generated.
    Unlike BFS, a state generated early may still have a cheaper route queued.
  * heapq has no decrease-key, so a cheaper route pushes a new entry and the
    old one is skipped when popped (lazy deletion).
  * Heap entries are (f, -g, state): ties on f go to the deeper state, which
    is closer to the goal. The state makes every entry unique, so pop order is
    deterministic and astar.html reports the same counts.

Complexity: bounded by the 9!/2 = 181,440 reachable states, so worst case is
O(n log n) time and O(n) space for n = 9!/2. Manhattan distance prunes most of
that in practice.
"""

from __future__ import annotations

import argparse
import heapq
import sys
import time

State = tuple[int, ...]

SIZE = 3
GOAL: State = (1, 2, 3, 4, 5, 6, 7, 8, 0)
DEFAULT_START = "876543210"

# Direction a tile slides, keyed by (old blank index - new blank index).
DIRECTIONS = {1: "right", -1: "left", SIZE: "down", -SIZE: "up"}

# Goal (row, col) of each tile, used by the heuristic.
GOAL_POSITIONS = {tile: divmod(i, SIZE) for i, tile in enumerate(GOAL)}


def _build_neighbors() -> list[list[int]]:
    """For each board index, the indices the blank can swap with (up, down, left, right)."""
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
# A*
# --------------------------------------------------------------------------- #
def manhattan(state: State) -> int:
    """Sum of each tile's row + column distance from its goal cell (blank excluded)."""
    total = 0
    for i, tile in enumerate(state):
        if tile != 0:
            row, col = divmod(i, SIZE)
            goal_row, goal_col = GOAL_POSITIONS[tile]
            total += abs(row - goal_row) + abs(col - goal_col)
    return total


def astar(start: State) -> tuple[list[State] | None, int, int]:
    """Return (shortest path to GOAL, states discovered, states expanded).

    The path includes both start and goal. It is None if GOAL is unreachable.
    "Discovered" counts unique states ever pushed on the heap. "Expanded"
    counts states popped whose neighbors were generated.
    """
    g_cost: dict[State, int] = {start: 0}
    parent: dict[State, State | None] = {start: None}
    open_heap = [(manhattan(start), 0, start)]
    expanded = 0

    while open_heap:
        _, neg_g, state = heapq.heappop(open_heap)
        g = -neg_g
        if g > g_cost[state]:
            continue  # stale entry: a cheaper route to this state was queued later
        if state == GOAL:
            return _reconstruct_path(parent, GOAL), len(g_cost), expanded

        expanded += 1
        new_g = g + 1
        for nxt in successors(state):
            if new_g < g_cost.get(nxt, sys.maxsize):
                g_cost[nxt] = new_g
                parent[nxt] = state
                heapq.heappush(open_heap, (new_g + manhattan(nxt), -new_g, nxt))

    return None, len(g_cost), expanded


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
    parser = argparse.ArgumentParser(
        description="Solve the 8-puzzle with A* (Manhattan distance)."
    )
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

    print(f"Start:\n{format_board(start)}")
    print(f"Manhattan distance (h): {manhattan(start)}\n")

    if not is_solvable(start):
        print(
            f"Unsolvable: {count_inversions(start)} inversions "
            "(must be even to reach the goal)."
        )
        return 1

    began = time.perf_counter()
    path, discovered, expanded = astar(start)
    elapsed = time.perf_counter() - began

    assert path is not None  # guaranteed by the solvability check

    for step in range(1, len(path)):
        print(f"Step {step}: {describe_move(path[step - 1], path[step])}")
        if not args.quiet:
            print(format_board(path[step]) + "\n")

    print(f"\nSolved in {len(path) - 1} moves.")
    print(f"States discovered: {discovered:,}")
    print(f"States expanded: {expanded:,}")
    print(f"Time: {elapsed:.3f}s")
    return 0


if __name__ == "__main__":
    sys.exit(main())
