# Chopsticks Table

A browser version of the chopsticks hand game, played from the first person
across a table, against a computer that solves the game with dynamic
programming before it makes its first move.

Open `index.html` in a browser. There is no build step and no server needed.

## The game

Both players start with one finger on each hand. On your turn you either:

- **Attack** — tap one of your live hands against one of your opponent's live
  hands. Your count is added onto theirs. A hand reaching **5 or more is knocked
  out** and resets to 0.
- **Redistribute** — clap your own hands together and move fingers between them.
  The receiving hand may not overflow, and simply swapping your two hands over
  does not count as a move.

Lose both hands and you are out. If neither player is knocked out before the
horizon, the game is a tie.

## Controls

Picking a hand:

| Input | What it does |
| --- | --- |
| <kbd>←</kbd> <kbd>→</kbd> | Light up one of your two hands |
| <kbd>Enter</kbd> | Pick that hand up |

Once a hand is up, it is in your control and there are two ways to use it.

**With the mouse** — the hand follows your cursor; the cursor *is* the hand, and
your arm stretches out behind it. Click a computer hand to strike it.

**With the keyboard** — <kbd>↑</kbd> reaches across the table and <kbd>↓</kbd>
comes back, so <kbd>←</kbd> <kbd>→</kbd> means "pick a target" or "slide fingers"
depending on which side of the table you are working on:

| Input | Reaching across (after <kbd>↑</kbd>) | On your own hands |
| --- | --- | --- |
| <kbd>←</kbd> <kbd>→</kbd> | Switch which computer hand you are aiming at | Scrub through every legal redistribution |
| <kbd>Enter</kbd> | Strike | Commit the split |
| <kbd>Esc</kbd> | Back off | Put the hand down |

Whichever input you used last is the one in charge, so the two never fight. While
aiming, the status line does the arithmetic for you — `3 + 2 = knocked out` — so
you can see what a strike does before committing to it. Scrubbing previews the
split on your hands the same way.

The stage is a dark room. Only the hand in play sits in the torchlight, framed by
corner brackets — everything else falls away into shadow, so what you are about to
act with is never ambiguous.

## Files

```
chopsticks/
├── index.html    markup, scene rendering, animation, input
├── style.css     the "Plate" visual treatment
├── game.js       rules and mechanics
├── ai.js         dynamic programming and move selection
├── README.md
└── VIBE_LOG.md
```

### Hands

The hands are pixel sprites, rasterised at 32x40 from a handful of capsules and a
rounded box, then cached as data URIs and blown up by a whole number — 4x for your
hands, 2x for the computer's, so the near pair is exactly twice the far pair and
the pixel grid never breaks.

Shading is a cylinder model rather than a flat fill: the signed distance field
gives the silhouette, and its gradient gives a surface normal to light, which is
what makes the fingers read as rounded. Each pose is baked in three palettes —
`lit`, `dim` and `dead` — so lighting a hand is a palette swap rather than a
filter.

`game.js` owns the state representation, the overflow rule, legal move
generation, and terminal detection. `ai.js` owns the table, the minimax values,
and move selection. Neither touches the DOM, and no rule lives in the HTML.

## State representation

```js
{ a: [left, right], b: [left, right], level }
```

Finger counts run 0–4. `level` counts plies from 0; **even levels are Player A's
turn, odd levels are Player B's**.

The level is part of the state on purpose. The position graph of chopsticks is
**cyclic** — two players can shuffle fingers back and forth forever — so a plain
memoised minimax recurses until the stack dies, because a cycle revisits a
position before it has ever been cached. Bounding the depth and carrying the
level makes the graph a DAG: level `h` only ever points at level `h + 1`. That
is what lets `buildTable` fill the whole thing bottom up with no recursion and no
cycle guard.

## The AI

`AI.buildTable(depth)` fills a table of `5^4 = 625` hand combinations at each of
`depth + 1` levels, sweeping from the horizon upward. Values are always read from
**Player A's** perspective:

| Value | Meaning |
| --- | --- |
| `1` | A wins with best play |
| `0` | tie, or the horizon was reached |
| `-1` | A loses with best play |

Even levels maximise, odd levels minimise. A position still running at the
horizon scores 0, because nothing past it is visible.

Building the table is **O(625 × depth)** in time and space — about 17,000
entries at the default depth of 26, which takes roughly 35 ms.

### Difficulty

| Setting | Behaviour |
| --- | --- |
| Easy | Moves at random |
| Normal | Plays the table move 60% of the time, otherwise picks randomly among moves that do not hand the game away |
| Perfect | Always follows the table |

### A note on who wins

At the default depth of 26 plies, **Player A is theoretically lost**. A perfect
opponent playing B will beat you every time; playing as B yourself is the winnable
side. Shorten the horizon to 24 plies or fewer and the game becomes a forced tie,
because A can stall past the edge of the table. The AI analysis panel shows this
directly — its predicted outcome reads `LOSS` from move one when you are A.

## AI analysis panel

Toggled from the header. On the computer's turn it shows the current state, which
way the computer is optimising, every legal move it considered with that move's
minimax value, the move it selected, and the predicted outcome from Player A's
perspective.

## Verification

The rules and table in `game.js` / `ai.js` are a port of `../chopsticks.py`, and
were checked against it rather than assumed correct:

- **Move generation** — all 1,250 reachable `(hands, level)` combinations were
  compared against the Python `next_moves`. Identical move sets, zero mismatches.
- **Table values** — the root value flips from tie to loss between depth 24 and
  depth 26 in both implementations, matching an independent solver written with
  sorted hands and backward induction, which puts the first player's loss at
  exactly 26 plies.
