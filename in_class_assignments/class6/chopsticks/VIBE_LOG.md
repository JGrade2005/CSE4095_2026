# Vibe log

Five interactions with Claude (Opus 5, in Claude Code) that shaped this project.
Two of them are debugging and verification rather than code generation.

---

## Interaction 1 — Understanding minimax on a cyclic game

**Prompt:**
Before asking for any code, I asked for the chopsticks problem to be explained
back to me along with a small working demo, specifically to check the dynamic
programming angle was understood. I said the challenge was "keeping track of the
states, and also to lessen the work load through caching."

**AI suggestion:**
It said the caching framing was hiding the real problem: **the position graph of
chopsticks is cyclic.** Two players can shuffle fingers back and forth forever,
so it is not a DAG, and the textbook "wrap the recursion in a memo" pattern
silently breaks — `memo[state]` is assigned *after* the recursive call, so a cycle
re-enters a position before it has ever been cached and the stack dies. It
demonstrated this with an actual `RecursionError` rather than just asserting it,
and offered two fixes:

| Approach | How it handles the cycle |
| --- | --- |
| Retrograde analysis | Walk backward from terminal positions over reverse edges, counting unresolved children. Yields WIN / LOSS / **DRAW**, no depth limit needed. |
| Depth-limited table | Put the level in the key. Level `h` only points at `h + 1`, so the graph is acyclic by construction. |

**What I accepted or changed:**
I accepted the diagnosis and took the depth-limited table, because that is what
the supplied `chopsticks.py` already does by keying on `((i,j),(k,l),level)`. I
also had it write the retrograde solver as a throwaway — not to use, but as an
independent oracle to check the real implementation against later.

**What I learned / how I verified it:**
That "add a cache" and "make the recursion terminate" are different problems, and
that the level in the Python's key is not bookkeeping — it is the thing that
makes the whole approach valid. The throwaway solver found 191 reachable
positions and reported the first player loses in exactly **26 plies**. That
number became the yardstick for everything afterwards.

---

## Interaction 2 — Filling in `best_move_dp`

**Prompt:**
I gave it the starter `chopsticks.py` with the empty loop body and said to
implement `best_move_dp` and not change any other code.

**AI suggestion:**
A bottom-up sweep over all 625 hand combinations at each level, with the whole of
minimax expressed as the parity of the level:

```python
pick = max if h % 2 == 0 else min
d[w] = pick(options, key=lambda option: option[0])
```

It flagged two details I would have got wrong. First, the **terminal check has to
repeat at every level**, not just the base — a game can end before the horizon,
and those positions are still looked up as children by the level above. Second,
`key=lambda option: option[0]` compares **only the result**; without the key a tie
falls through to comparing the state tuples, which does not crash but silently
picks moves by the numeric order of finger counts.

**What I accepted or changed:**
Accepted as written. I kept it to the loop body only, as the assignment requires.

**What I learned / how I verified it:**
The tie-breaking point is the kind of bug that never announces itself — the code
runs, the AI plays, and the moves are just subtly arbitrary. Verified by checking
the table had 13,125 entries at depth 20 with zero malformed entries, and that
the root value flips tie → loss between depth 24 and 26 — matching the
independent solver's 26 exactly. Two unrelated implementations landing on the
same threshold is the real evidence, not the fact that it ran.

---

## Interaction 3 — Verifying the JavaScript port against the Python *(verification)*

**Prompt:**
After porting the rules to `game.js` and `ai.js`, I asked it to check the port
rather than assume it was right.

**AI suggestion:**
Rather than spot-checking a few positions, it proposed exhausting the space: run
all 1,250 reachable `(hands, level)` combinations through both the Python
`next_moves()` and the JavaScript `nextMoves()` and compare the resulting position
sets.

```
positions compared: 1250
mismatches: 0
```

**What I accepted or changed:**
Accepted. I also had it check table *values* rather than chosen moves, because
two correct minimax implementations can legitimately select different moves among
equally-valued options — values are the canonical thing to compare.

**What I learned / how I verified it:**
The most useful moment was a **failure that was wrong**. The first run reported
three failed assertions on move counts. The code was fine; my expected numbers
had been taken from the earlier *canonical* solver, which sorts each player's
hands and so treats `(1,2)` and `(2,1)` as the same position, while the supplied
Python keeps left and right distinct. The assertions were measured against the
wrong baseline.

That is the lesson I took from the whole project: a failing test is a claim about
two things, and the baseline deserves as much suspicion as the code. I would have
"fixed" working code if I had trusted the red output.

---

## Interaction 4 — Debugging a freeze that forced a tab reload *(debugging)*

**Prompt:**
"The player can sometimes have issues clicking the opponent and has to reload
tab. Can you make all of the interactions work smoother?" — a vague symptom, with
no reproduction steps.

**AI suggestion:**
It refused to guess and read the actual code paths, then found **four** separate
causes rather than one:

1. **The freeze.** `playMove` was `async` with no error handling, so any throw
   inside an animation left `ui.phase` on `"animating"` forever. Every handler
   early-returns on the phase, so the game went permanently dead.
2. **Missed clicks.** The hit test required the cursor within 130 units of a hand
   centre that was itself drifting, so a near miss was a dead click with no
   feedback at all.
3. **Stutter.** The frame loop did eight `querySelector` calls *and* a full
   `innerHTML` re-parse of the arms, sixty times a second. Stutter reads as a
   dropped click.
4. **A misleading HUD.** `syncHud` derived whose turn it was from the game state,
   but the state is committed at the moment of *impact*, with half a second of
   animation still to run — so the HUD flipped to "Turn: You" mid-swing and
   anything pressed then went into a phase that ignores input.

**What I accepted or changed:**
Accepted all four fixes. I pushed back on the first one being enough on its own —
a `try/catch` cannot catch a promise that simply never settles — so it added a
global error handler *and* an eight-second watchdog, rate-limited so recovery
cannot loop, plus a sequence number so a late-resolving animation cannot advance
the turn twice.

**What I learned / how I verified it:**
Cause 4 was only found by **driving the real page**, not by reading it. It
installed jsdom, loaded the actual `index.html`, and played whole games through
all three input paths. Then it wrote a second test that deliberately sabotages an
animation frame so its promise never settles — reproducing my exact freeze — and
asserted recovery:

```
sabotaged the attack animation; watching for recovery...
RECOVERED after ~1s — the game is playable again, no reload needed.
```

Writing those tests also caught a bug reading had missed: `hidden` is an
`HTMLElement` property, so setting it on an SVG `<text>` node silently does
nothing and the "thinking" indicator would never have appeared.

---

## Interaction 5 — Making the horizon configurable

**Prompt:**
"Add configurable number of moves. Right now it's at 26, can you make it ~40 by
default, and have it be adjustable."

**AI suggestion:**
Before writing the control, it built the table at every depth in the range and
read the root value, instead of assuming the earlier 26-ply result still held:

```
depth 10–24 : root  0  (tie)
depth 26–60 : root -1  (A loses)
```

It then argued the setting was worth *explaining* rather than just exposing,
because the horizon does not merely limit the game — it decides it. The slider
note now tells you which side of the line you picked.

**What I accepted or changed:**
Accepted, and kept its two catches. The table had been cached with
`if (!ui.table)`, so it would have been built once at the first depth and reused
at every other one, silently wrong values for the rest of the session. And the
depth has to stay even or the two players get a different number of turns, so the
slider steps by two *and* the handler rounds, since a programmatic odd value
would otherwise slip through.

**What I learned / how I verified it:**
That the horizon effect is a real, demonstrable thing rather than a textbook
aside. The same opening position is a draw or a forced loss depending only on how
far ahead you are allowed to look, and the changeover is exactly 26 because B's
forced win takes exactly 26 plies. 
