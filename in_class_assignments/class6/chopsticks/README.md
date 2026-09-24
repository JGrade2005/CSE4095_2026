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

Building the table is **O(625 × depth)** in time and space — about 26,000
entries at the default depth of 40, which takes roughly 25 ms.

### Difficulty

| Setting | Behaviour |
| --- | --- |
| Easy | Moves at random |
| Normal | Plays the table move 60% of the time, otherwise picks randomly among moves that do not hand the game away |
| Perfect | Always follows the table |

## Game length

The horizon is set on the setup screen, from **10 to 60 plies** in steps of two,
defaulting to **40** (20 moves each). It applies to the next game, not the one in
progress — the table is only valid for the depth it was built at, and the level
counter is measured against it.

The horizon is not just a time limit, it decides the game:

| Horizon | Result with best play |
| --- | --- |
| 10–24 plies | **Draw.** Neither side can force a result; A stalls past the edge of the table. |
| 26–60 plies | **Player B wins.** B's forced win takes exactly 26 plies, so any horizon that long or longer contains it. |

The changeover is at exactly 26, verified by building the table at every depth in
range. This is the horizon effect made visible: the same position is a draw or a
loss depending only on how far ahead you are allowed to look. The setup screen
says which you have chosen, and the AI analysis panel shows it directly — its
predicted outcome reads `LOSS` from move one when you are A on a long horizon.

Cost scales linearly and stays negligible: 6,875 entries at depth 10 up to 38,125
at depth 60, which takes about 50 ms to build.

## Robustness

A turn can never strand the game. `playMove` wraps its animation so the move
still stands and play still advances if anything throws; a global error handler
and an eight-second watchdog catch stalls that throw nothing; recovery is
rate-limited and fences any in-flight move with a sequence number.

The scene is built once and then updated in place — the frame loop sets
attributes on cached nodes and never touches the DOM tree, because stutter reads
as a dropped click.

Aiming is deliberately forgiving: anywhere on the opponent's side of the table
targets the nearest live hand, and the reticle shows which one.

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

## `nextMoves()`

`Game.nextMoves(state)` is the JavaScript counterpart of the supplied Python
`next_moves()`. It returns every legal move from a position, as descriptors the
UI can animate and the AI can score:

```js
{ type: "attack", actor, from, to, state }
{ type: "split",  actor, from, to, amount, state }
```

`from` and `to` are hand indices (0 = left, 1 = right). For an attack, `from`
indexes the mover's own hands and `to` the opponent's. Every descriptor carries
the full resulting `state`, already at `level + 1`, so applying a move is just
reading that field.

It generates moves in two passes:

**Attacks.** For each of my live hands crossed with each of their live hands, the
target becomes `overflowSum(mine, theirs)` — the sum, or 0 if it reached five. A
hand at 0 is skipped on both sides, which is what makes a dead hand unable to
attack or be attacked.

**Redistributions.** For each direction, move `n = 1 … mine[src]` fingers across.
Two rules prune this:

- the receiving hand may not reach five, so `mine[dst] + n >= 5` is skipped;
- the pure swap is not a move, so a result whose two hands are the old pair
  reversed is skipped.

Finally, results are de-duplicated by `Game.key`. This matters: from the opening
position, attacking B's left with either of your hands reaches the *same*
position, so the four attacks collapse to two. The opening therefore has exactly
four distinct follow-ups, not six — and the move count always equals the number
of genuinely different positions reachable.

A terminal position returns `[]`, which is how the table recognises a leaf.

## Minimax

Every value in the table is read from **Player A's** point of view: `1` A wins,
`0` tie, `-1` A loses. Because one scale is used for both players, the two sides
optimise in opposite directions — **A picks the successor with the largest value,
B picks the smallest.** Since even levels are A's turn, the whole of minimax is
the parity of the level:

```js
const maximizing = h % 2 === 0;
// ...
const better = best === null || (maximizing ? value > best.value : value < best.value);
```

A position's value is therefore defined entirely by the level below it: the best
A can reach, or the worst B will allow. `tests/engine-tests.js` asserts exactly
that property across every entry of a depth-8 table.

## The dynamic-programming table

`AI.buildTable(depth)` returns a `Map` from `Game.key(state)` to
`{ value, move }` — the position's minimax value and the move the mover should
play there (`null` in a finished position). `Game.key` flattens a state to a
short string like `"1203:7"`: the four hand counts and the level.

It is filled **bottom up**, from the horizon toward level 0:

1. **Base level (`level === depth`).** Score every one of the 625 hand
   combinations directly: A out → `-1`, B out → `+1`, anything still running →
   `0`, because nothing past the horizon is visible.
2. **Sweep upward, `h = depth - 1 … 0`.** For each position at level `h`: if it
   is terminal, keep its result and record no move. Otherwise take `nextMoves()`
   and pick the max (even `h`) or min (odd `h`) over the children's values —
   which are all at level `h + 1`, and therefore already final.

No recursion, no memo guard, no revisiting. Each entry is written exactly once,
and every lookup it makes is already complete.

Because the whole table exists before the first move, the computer's turn is a
single `Map` lookup. The "thinking" pause on screen is deliberate theatre.

Difficulty only changes *which* move is selected — the table is identical in all
three settings, so the analysis panel always shows true minimax values even when
the computer chooses to ignore them.

## Testing performed

Automated suite: **29 tests, all passing.** Open `tests/tests.html` in a browser,
or run `node tests/run-tests.js` from this folder. No install either way. Each
test name carries the requirement it covers.

| Required case | Covered |
| --- | --- |
| Initial state | ✅ shape, turn, and the exact four distinct follow-ups |
| A state containing a zero hand | ✅ still playable; dead hand cannot attack or be attacked; can be revived |
| Attack causing a hand to become zero | ✅ `3 + 2 → 0`, attacker unchanged, level advances |
| Legal redistribution | ✅ total preserved, opponent untouched, every legal arrangement offered |
| Attempts at illegal moves | ✅ pure swap, overflow, dead-hand attack, moves from a finished game, plus an exhaustive sweep that no successor leaves a hand outside 0–4 |
| Terminal state where A loses | ✅ `outcome()` and the table agree |
| Terminal state where B loses | ✅ `outcome()` and the table agree |
| Maximum-depth tie | ✅ live position at the horizon scores 0; a 24-ply game is a draw at the root |
| AI selection when successors differ | ✅ both a maximizing and a minimizing position, plus every table entry checked against its own successors |

Compared against the supplied Python during development: all **1,250** reachable
`(hands, level)` combinations produced move sets identical to `next_moves()` in
`../chopsticks.py`, with zero mismatches, and the root value flips tie → loss
between depth 24 and 26 in both implementations. A third, independent solver
(sorted hands, backward induction over reverse edges) puts the first player's
loss at exactly 26 plies, agreeing with both. Note that comparing *values* is the
right invariant — two correct minimax implementations may legitimately pick
different moves among equally-valued options.

Full-game behaviour was driven headlessly in jsdom during development: complete
games through all three input paths, a restart at a different horizon on a
rebuilt table, and a deliberately sabotaged animation frame to confirm the game
recovers rather than freezing.

**Not automated** — these were checked by playing the game, not by a test:

- Player A as computer, and Player B as computer
- restart / new game
- browser layout on a wide and a narrow window

The layout check is genuinely manual: there is no headless browser in this
environment and jsdom has no layout engine. To repeat it, open `index.html`,
confirm the HUD, stage and status bar lay out cleanly at full width, then narrow
the window below ~680 px and confirm the HUD wraps, the status line drops to its
own row, the analysis panel goes full width, and the page never scrolls sideways.

## Known limitations

- **The computer never stalls when it is lost.** Every losing move scores `-1`,
  so it picks arbitrarily among them and can walk into the fastest loss instead
  of the slowest. A win inside the horizon is still guaranteed, so this is
  cosmetic, but preferring the fastest win and slowest loss would look sharper.
- **Player A is a lost cause at the default horizon.** Against Perfect, choosing
  A means losing every time. That is the game, not a bug, but it makes A the
  frustrating side to pick.
- **Three of the required test cases are manual**, as listed above.
- **The interaction and animation code lives inline in `index.html`** to match the
  required file list. It is a large `<script>` block; a separate `ui.js` would be
  cleaner if permitted.
- **The horizon cannot be changed mid-game**, only between games, because the
  table is built for one depth.
- **Sprites are generated at load** rather than shipped as image files, so the
  first paint waits on about fifteen small rasterisations. It is imperceptible,
  but it is work repeated on every page load.

## Possible extensions

- Prefer the fastest win and the slowest loss, so the computer plays out a lost
  position with resistance.
- Show the number of DP states evaluated, and compare the table against a naive
  recursive search to make the speed difference concrete.
- A move-history panel, and a visualisation of the immediate game tree with each
  branch's minimax value.
- Human vs. human, and AI vs. AI, the latter useful for watching a solved line
  play itself out.
- Sound effects with an on/off control.
- Deploy the static site to free hosting.

---

# Reflection

### 14. Why does Player A maximize while Player B minimizes?

Because both players are scored on one number line. Every value in the table
is "how good is this for A". `+1` A wins, `0` tie, `-1` A loses. There is no
separate scale for B.

Given that, A wants the number as large as possible and B, who wants A to lose,
wants it as small as possible. B is not playing badly by minimising; minimising
is B playing well, expressed in A's units.

### 15. Why is the DP table built from the deepest level toward level 0?

Because a position's value is defined in terms of positions one level deeper.
You cannot evaluate level `h` until level `h + 1` is finished.

The only level that can be scored without looking anything up is the horizon,
where the rule is direct: A out is `-1`, B out is `+1`, anything still running is
`0`. That gives a complete level to stand on, and every level above it can then
be computed from the one below in a single pass.

Building downward instead would mean every lookup hits an entry that does not
exist yet

### 16. Why can dynamic programming be substantially faster than recursively exploring the complete game tree?

Because the game tree re-derives the same positions over and over, and the table
does not.

The tree branches roughly three to seven ways per play, so a 40-play search is
astronomically large. But there are only **625 distinct hand combinations**, so
at every level the tree is exploring at most 625 genuinely different positions
and everything else is repetition. 

In addition to this, chopsticks has **cycles**. players can
shuffle fingers back and forth forever, so the "complete game tree" is not
finite at all. A plain recursive search does not merely run slowly on it; it does
not terminate. Indexing by level is what bounds it.

### 17. Why should the UI obtain legal moves from the game engine rather than independently implementing the rules?

Because two implementations of the same rules will disagree, and the disagreement
will be silent.

If `index.html` decided for itself what a legal attack was, it could offer a move
the engine rejects, or hide one the AI is counting on — and the AI's advice would
then be computed on a different game from the one on screen. The overflow rule,
the no-swap rule and the no-overflow-on-the-receiving-hand rule would each need
to be correct in two places, and to be *changed* correctly in two places.

Keeping one source of truth also made the Python comparison meaningful: because
every legal move in the app comes from `nextMoves()`, checking `nextMoves()`
against the Python checks the whole game. And it is what allows the UI to be
generous — it can light up any target it likes, then ask `findAttack()` whether
it is real, with no risk of the two views drifting apart.

### 18. What part of the project did your AI assistant help with most?

Two things, in different ways.

The largest was **volume with discipline**, the pixel-art sprite generator, the
animation system and the interaction layer are a lot of code, and having it
written consistently, commented at a uniform density and organised into clear
sections would have taken far longer by hand.

Doing this part was the most valuable, as specifying pixels directly via HTML / jss / css is time consuming. 

### 19. What AI-generated suggestion did you have to verify, modify, or reject?

Three stand out.

**Rejected: the first redistribution animation.** The proposal had fingers
detaching and tumbling across the gap to the other hand. It looked good, but it
was not what the move *is*. 

**Rejected: three.js.** The first instinct for "3D" was real WebGL. The camera
here is fixed, so genuine 3D buys nothing that scale and arc'd motion do not, and
procedural hand meshes look worse than clean sprites. Sticking to one SVG scene
also meant the arms always meet the wrists exactly, with no coordinate systems to
reconcile.

**Verified — and the test was wrong, not the code.** The first cross-check run
reported three failures in move generation. The failing numbers had been taken
from an earlier *canonical* solver that sorts each player's hands and therefore
treats `(1,2)` and `(2,1)` as one position, while the supplied Python keeps left
and right distinct. The code was right; the expectations were measured against
the wrong baseline. 
