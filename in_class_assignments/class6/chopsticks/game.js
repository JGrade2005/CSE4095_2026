/**
 * game.js - Chopsticks rules and mechanics.
 *
 * This file knows what a position is and which moves are legal from it.
 * It does not search, and it never touches the DOM.
 *
 * State shape:
 *     { a: [left, right], b: [left, right], level }
 *
 * Finger counts run 0..4 and a hand at 0 is out of play. `level` counts plies
 * from 0 and is deliberately part of the state: the AI table is depth limited,
 * and carrying the level is exactly what turns a cyclic game graph into a DAG.
 * Even levels are Player A's turn, odd levels are Player B's.
 */
const Game = (() => {
  "use strict";

  const DEAD = 5;          // a hand reaching this many fingers is knocked out
  const HAND_NAME = ["left", "right"];

  /* ------------------------------------------------------------------ *
   * Core rules
   * ------------------------------------------------------------------ */

  /** Add two hands together. Anything reaching DEAD is knocked out to 0. */
  function overflowSum(a, b) {
    const total = a + b;
    return total >= DEAD ? 0 : total;
  }

  function start() {
    return { a: [1, 1], b: [1, 1], level: 0 };
  }

  /** Whose turn it is. Even levels belong to A, odd levels to B. */
  function turn(state) {
    return state.level % 2 === 0 ? "A" : "B";
  }

  function opponentOf(player) {
    return player === "A" ? "B" : "A";
  }

  /** Compact string key, used for the AI table and for de-duplicating moves. */
  function key(state) {
    return `${state.a[0]}${state.a[1]}${state.b[0]}${state.b[1]}:${state.level}`;
  }

  function isOut(hand) {
    return hand[0] === 0 && hand[1] === 0;
  }

  function isTerminal(state) {
    return isOut(state.a) || isOut(state.b);
  }

  /**
   * How the game stands, from Player A's point of view.
   * A position that is still running past the horizon counts as a tie,
   * because neither side can force a result inside the table we built.
   */
  function outcome(state, depth) {
    if (isOut(state.a) && isOut(state.b)) return { over: true, value: 0, winner: null };
    if (isOut(state.a)) return { over: true, value: -1, winner: "B" };
    if (isOut(state.b)) return { over: true, value: 1, winner: "A" };
    if (state.level >= depth) return { over: true, value: 0, winner: null };
    return { over: false, value: null, winner: null };
  }

  /* ------------------------------------------------------------------ *
   * Move generation
   * ------------------------------------------------------------------ */

  /**
   * Every legal move from `state` - the JavaScript counterpart of the
   * Python `next_moves()` - as descriptors the UI can animate:
   *
   *   { type: "attack", actor, from, to, state }
   *   { type: "split",  actor, from, to, amount, state }
   *
   * `from` and `to` are hand indices (0 = left, 1 = right). For an attack,
   * `from` indexes the mover's hands and `to` the opponent's. Two different
   * moves that land on the same position are collapsed into one, so the move
   * count always matches the number of distinct positions reachable.
   */
  function nextMoves(state) {
    if (isTerminal(state)) return [];

    const mover = turn(state);
    const mine = mover === "A" ? state.a : state.b;
    const theirs = mover === "A" ? state.b : state.a;

    const moves = [];
    const seen = new Set();

    const build = (nextMine, nextTheirs) => ({
      a: mover === "A" ? nextMine : nextTheirs,
      b: mover === "A" ? nextTheirs : nextMine,
      level: state.level + 1,
    });

    const push = (move) => {
      const k = key(move.state);
      if (seen.has(k)) return;
      seen.add(k);
      moves.push(move);
    };

    // Attacks: one live hand of mine taps one live hand of theirs.
    for (let from = 0; from < 2; from++) {
      if (mine[from] === 0) continue;
      for (let to = 0; to < 2; to++) {
        if (theirs[to] === 0) continue;
        const nextTheirs = theirs.slice();
        nextTheirs[to] = overflowSum(mine[from], theirs[to]);
        push({ type: "attack", actor: mover, from, to, state: build(mine.slice(), nextTheirs) });
      }
    }

    // Splits: shift fingers between my own two hands. The receiving hand may
    // not overflow, and simply swapping the two hands over is not a move.
    for (let src = 0; src < 2; src++) {
      const dst = 1 - src;
      for (let n = 1; n <= mine[src]; n++) {
        if (mine[dst] + n >= DEAD) continue;
        const nextMine = mine.slice();
        nextMine[src] -= n;
        nextMine[dst] += n;
        if (nextMine[0] === mine[1] && nextMine[1] === mine[0]) continue;
        push({ type: "split", actor: mover, from: src, to: dst, amount: n, state: build(nextMine, theirs.slice()) });
      }
    }

    return moves;
  }

  /** Apply a move. Move descriptors already carry their resulting position. */
  function applyMove(state, move) {
    return move.state;
  }

  /** Find the legal move that attacks opponent hand `to` using own hand `from`. */
  function findAttack(state, from, to) {
    return nextMoves(state).find((m) => m.type === "attack" && m.from === from && m.to === to) || null;
  }

  /**
   * Every distinct finger arrangement the mover can scrub to, sorted by the
   * left hand count, with the current arrangement included and marked. This is
   * what the arrow keys slide through during a split.
   */
  function splitOptions(state) {
    const mover = turn(state);
    const mine = mover === "A" ? state.a : state.b;

    const options = nextMoves(state)
      .filter((m) => m.type === "split")
      .map((m) => {
        const next = mover === "A" ? m.state.a : m.state.b;
        return { counts: next, move: m, isCurrent: false };
      });

    options.push({ counts: mine.slice(), move: null, isCurrent: true });
    options.sort((x, y) => x.counts[0] - y.counts[0] || x.counts[1] - y.counts[1]);
    return options;
  }

  /* ------------------------------------------------------------------ *
   * Description helpers (built on demand, never stored on the move)
   * ------------------------------------------------------------------ */

  function describe(move) {
    if (move.type === "attack") {
      return `${move.actor} ${HAND_NAME[move.from]} → ${opponentOf(move.actor)} ${HAND_NAME[move.to]}`;
    }
    const next = move.actor === "A" ? move.state.a : move.state.b;
    return `${move.actor} split to ${next[0]}–${next[1]}`;
  }

  function describeState(state) {
    return `A (${state.a[0]},${state.a[1]})  B (${state.b[0]},${state.b[1]})`;
  }

  return {
    DEAD,
    HAND_NAME,
    overflowSum,
    start,
    turn,
    opponentOf,
    key,
    isOut,
    isTerminal,
    outcome,
    nextMoves,
    legalMoves: nextMoves,   // alias, kept so older call sites still read
    applyMove,
    findAttack,
    splitOptions,
    describe,
    describeState,
  };
})();
