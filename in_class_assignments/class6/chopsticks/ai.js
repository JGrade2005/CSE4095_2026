/**
 * ai.js - Depth limited minimax, tabulated bottom up.
 *
 * Values are always read from Player A's point of view:
 *      1  A wins        0  tie, or the horizon was reached        -1  A loses
 *
 * Even levels are A's turn, so A maximises; odd levels are B's, so B minimises.
 *
 * The table holds 5^4 = 625 hand combinations at each of depth + 1 levels.
 * Level h only ever reads level h + 1, which is already filled, so a plain
 * bottom up sweep needs no recursion and no cycle guard - bounding the depth
 * is what makes the position graph acyclic.
 *
 * Building the table is O(625 * depth) in both time and space, which is a few
 * tens of thousands of entries: well under a tenth of a second in practice.
 */
const AI = (() => {
  "use strict";

  const DIFFICULTY = {
    easy: {
      label: "Easy",
      optimal: 0,
      blurb: "Plays at random. Good for learning the rules.",
    },
    normal: {
      label: "Normal",
      optimal: 0.6,
      blurb: "Usually optimal, and avoids outright blunders the rest of the time.",
    },
    perfect: {
      label: "Perfect",
      optimal: 1,
      blurb: "Always plays the table's best move. Unbeatable from a won position.",
    },
  };

  /** Result of a finished position, from A's perspective. */
  function baseValue(i, j, k, l) {
    const aOut = i === 0 && j === 0;
    const bOut = k === 0 && l === 0;
    if (aOut && bOut) return 0;
    if (aOut) return -1;
    if (bOut) return 1;
    return 0;                    // still running at the horizon: a tie
  }

  /**
   * Build the whole table for a game of `depth` plies.
   * Returns a Map from Game.key(state) to { value, move }, where `move` is the
   * descriptor the mover should play (null in a finished position).
   */
  function buildTable(depth) {
    const table = new Map();

    // Base level: the horizon.
    for (let i = 0; i < 5; i++) {
      for (let j = 0; j < 5; j++) {
        for (let k = 0; k < 5; k++) {
          for (let l = 0; l < 5; l++) {
            const state = { a: [i, j], b: [k, l], level: depth };
            table.set(Game.key(state), { value: baseValue(i, j, k, l), move: null });
          }
        }
      }
    }

    // Sweep upward. Each level reads only the one below it.
    for (let h = depth - 1; h >= 0; h--) {
      const maximizing = h % 2 === 0;
      for (let i = 0; i < 5; i++) {
        for (let j = 0; j < 5; j++) {
          for (let k = 0; k < 5; k++) {
            for (let l = 0; l < 5; l++) {
              const state = { a: [i, j], b: [k, l], level: h };

              // A finished game keeps its result and has no move to make.
              if (Game.isTerminal(state)) {
                table.set(Game.key(state), { value: baseValue(i, j, k, l), move: null });
                continue;
              }

              let best = null;
              for (const move of Game.nextMoves(state)) {
                const value = table.get(Game.key(move.state)).value;
                const better = best === null ||
                  (maximizing ? value > best.value : value < best.value);
                if (better) best = { value, move };
              }
              table.set(Game.key(state), best);
            }
          }
        }
      }
    }

    return table;
  }

  function valueOf(table, state) {
    const entry = table.get(Game.key(state));
    return entry ? entry.value : 0;
  }

  /** "WIN" / "TIE" / "LOSS", always from Player A's perspective. */
  function outcomeLabel(value) {
    if (value > 0) return "WIN";
    if (value < 0) return "LOSS";
    return "TIE";
  }

  /**
   * Everything the analysis panel needs for one position: who is to move,
   * which way they are optimising, and what every legal move is worth.
   */
  function analyze(table, state) {
    const mover = Game.turn(state);
    const maximizing = mover === "A";
    const entry = table.get(Game.key(state));

    const moves = Game.nextMoves(state).map((move) => ({
      move,
      value: valueOf(table, move.state),
      label: Game.describe(move),
      result: Game.describeState(move.state),
    }));

    // Best first, so the panel reads top down.
    moves.sort((x, y) => (maximizing ? y.value - x.value : x.value - y.value));

    const selected = entry ? entry.move : null;
    return {
      state,
      mover,
      maximizing,
      moves,
      selected,
      selectedLabel: selected ? Game.describe(selected) : "—",
      value: entry ? entry.value : 0,
      outcome: outcomeLabel(entry ? entry.value : 0),
    };
  }

  /**
   * Pick the computer's move at the given difficulty.
   *
   * Easy plays at random. Normal plays the table move most of the time and
   * otherwise picks randomly among moves that do not hand the game away, so it
   * misses wins without throwing the game. Perfect always follows the table.
   */
  function chooseMove(table, state, difficulty) {
    const moves = Game.nextMoves(state);
    if (moves.length === 0) return null;

    const entry = table.get(Game.key(state));
    const best = entry ? entry.move : null;
    const setting = DIFFICULTY[difficulty] || DIFFICULTY.perfect;

    if (best && Math.random() < setting.optimal) return best;

    if (difficulty === "normal") {
      const maximizing = Game.turn(state) === "A";
      const safe = moves.filter((m) => {
        const v = valueOf(table, m.state);
        return maximizing ? v >= 0 : v <= 0;
      });
      if (safe.length > 0) return safe[Math.floor(Math.random() * safe.length)];
    }

    return moves[Math.floor(Math.random() * moves.length)];
  }

  return { DIFFICULTY, buildTable, valueOf, outcomeLabel, analyze, chooseMove };
})();
