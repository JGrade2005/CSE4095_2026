# Vibe log

A record of how this was built with Claude (Opus 5) in Claude Code, including the
decisions that mattered and the places the first answer was wrong.

Session date: 2026-09-17

---

## 1. Understanding the problem before writing anything

Started by asking for an explanation of chopsticks and a demo, specifically to
check that the dynamic programming angle was understood before committing to an
approach.

The useful thing that came out of this: **the position graph is cyclic.** Two
players can shuffle fingers back and forth forever, so the game is not a DAG and
the textbook "wrap the recursion in a memo" pattern silently breaks — `memo[s]`
is assigned *after* the recursive call, so a cycle re-enters `s` before it is
ever cached and the stack dies. This was demonstrated concretely with a
`RecursionError`, not just asserted.

Two valid fixes exist:

| Approach | How it handles the cycle |
| --- | --- |
| Retrograde analysis | Walk backward from terminal positions over reverse edges, counting unresolved children. Yields WIN/LOSS/**DRAW** and needs no depth limit. |
| Depth-limited table | Make the level part of the key. Level `h` only points at `h + 1`, so the graph is acyclic by construction. |

A throwaway solver was written using the first approach (sorted hands, backward
induction) purely as an independent oracle. It found **191 reachable positions**
and reported that the first player loses in exactly **26 plies**. That number
became the yardstick for everything after.

## 2. Rules ambiguity, caught early

Before writing real code, the rule variants were swept to see whether the answer
was even stable. It is not:

| Split rule (cutoff at 5) | Value for player 1 |
| --- | --- |
| A split may kill your own live hand, e.g. `(1,1) → (0,2)` | **LOSS in 26** |
| Self-killing splits banned | **DRAW** |

One rule flips the game from solved-loss to drawn. Worth knowing before building
on top of it. Chose "any redistribution", which is what the provided starter code
implements.

## 3. Filling in `best_move_dp`

The provided `chopsticks.py` already made the depth-limited choice by putting the
level in the key, so the missing loop was a plain bottom-up sweep. The whole of
minimax in that loop is one line:

```python
pick = max if h % 2 == 0 else min
d[w] = pick(options, key=lambda option: option[0])
```

Two details that were easy to get wrong:

- The **terminal check has to repeat at every level**, not just the base. A game
  can end before the horizon, and those positions are still looked up as children
  by the level above.
- `key=lambda option: option[0]` compares **only the result**. Without the key, a
  tie falls through to comparing the state tuples, which does not crash but picks
  moves by the numeric order of finger counts — meaningless.

Verified: 13,125 entries at depth 20, zero malformed, and the root value flips
tie → loss between depth 24 and 26, matching the independent solver's 26 exactly.
Two unrelated implementations landing on the same threshold is the real evidence.

### A false alarm worth recording

While watching a scripted game, it looked like both players were moving Player
A's hands on consecutive plies, which would have been a turn-parity bug. It was
not. At odd levels B *attacks*, which changes A's hands, and at even levels A can
*split*, which also changes A's hands. Instrumenting the level counter showed the
parity was correct all along. Lesson: instrument before believing a read of the
output.

## 4. Choosing a look

The web version started from a hand sketch: first person across a table, own
fists in the foreground, opponent's hands mid-distance, head on the horizon.

Rejected **three.js** for this. The camera is fixed, so real 3D buys nothing that
scale, stroke weight and arc'd motion paths do not, and procedural hand meshes
look worse than clean line art. Everything is one SVG in a single `1000×720`
viewBox, which is also why the arms always meet the wrists exactly as the hands
drift — no CSS/SVG coordinate mismatch to reconcile.

Three treatments were built and previewed live before picking: Ink (the sketch,
faithfully), Plate (vintage anatomical engraving), Blueprint (cyanotype technical
linework). **Plate** was chosen.

## 5. Interaction decisions

- **Attack** is drag-driven, as specified: pick a hand with the arrow keys, press
  Enter, then drag onto an opponent hand.
- **Redistribute** is an arrow-key scrub. Enter puts the hand "up", then ← and →
  slide through every legal arrangement — `3–1`, `2–2`, `1–3` — previewed live on
  the sprites themselves, with Enter to commit. Chosen over drag because every legal
  option is reachable in one gesture and it stays consistent with the keyboard
  selection already in use.
- **Split animation** was revised mid-build. The first version had fingers
  detaching and tumbling across the gap, which was fun but not what was wanted.
  Replaced with the hands clapping together and the fingers going up or down at
  the point of contact.
- **AI delay** of 700–1400 ms with a "thinking" indicator. The table is already
  built, so the pause is pure theatre — but without it the computer snaps and
  reads as scripted rather than deliberating.

## 6. Porting the rules to JavaScript

The port was **not** assumed correct. All 1,250 `(hands, level)` combinations
were run through both the Python `next_moves` and the JavaScript `legalMoves`,
and the resulting position sets compared:

```
positions compared: 1250
mismatches: 0
```

Table values were checked the same way, against both the Python and the original
independent solver: tie at depth 20 and 24, loss at depth 26, in all three.

One near-miss during this: the first test run "failed" three move-count
assertions. The assertions were wrong, not the code — the expected numbers had
been taken from the *canonical* solver, which sorts hands and therefore collapses
`(1,2)` and `(2,1)` into one position, while the starter keeps left and right
distinct. Comparing against the right baseline is the whole job.

## 7. Performance note

Building the table allocates a move descriptor object per edge, roughly 100k
objects at depth 26. Move labels are therefore generated **on demand** via
`Game.describe(move)` rather than stored on every descriptor — that one change
avoids ~100k string allocations during table construction and keeps the build
around 35 ms.

## 8. The art pass

The procedurally wobbled line-art hands were replaced with pixel sprites built
from a reference image, and the stage was turned into a dark room lit by a single
torch that follows whatever is in play.

Two things came out of actually rendering the sprites and looking at them, rather
than assuming they were fine:

- **The fingers were too thin.** The outline band is the darkest colour in the
  ramp, which against a near-black room is invisible — so every finger silently
  lost a pixel off each edge and read as a spike. Fixed by fattening the finger
  radii from ~2.0 to ~2.5 and narrowing the outline band from 0.9 to 0.65.
- **Curled fingers read as short raised ones.** The knuckle bumps stood too proud
  of the fist. Dropped them from 2.6 to 1.6 pixels.

Lighting is a palette swap, not a filter: each pose is baked in `lit`, `dim` and
`dead` ramps, so switching which hand is lit costs one `href` change rather than a
per-frame SVG filter. Sprites are only swapped when the pose or the lighting
actually changes, tracked by a short signature string.

Scale was chosen so both depths are whole-number multiples of the sprite grid —
4x near, 2x far. Any other ratio gives uneven pixel sizes and the art stops
reading as pixel art.

---

## What I would revisit

- **No distance tie-breaking.** When every move loses, the computer picks an
  arbitrary one, so it can walk into the fastest loss instead of stalling. Not a
  correctness bug — a win inside the horizon is still guaranteed — but preferring
  the fastest win and the slowest loss would make it look sharper.
- The interaction and animation code lives inline in `index.html` to match the
  required file structure. If a `ui.js` were permitted, splitting it out would be
  cleaner than a single large `<script>` block.
