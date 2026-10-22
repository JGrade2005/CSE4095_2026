# Math Practice App: Kid-Friendly Visual Design

This is the visual design for the app, the target users are kids ages 7 to 12. Bright, high-contrast, playful and calm. Every rule from spec sections 13 to 15 still applies: big targets, text labels on every button, nothing shown by color alone, WCAG AA contrast, and no motion for anyone who asks for less.

## Personality

- Bright sky background with soft floating math shapes (+ − × ÷ =, circles, triangles, stars).
- White cards with thick colored borders and big rounded corners.
- Chunky "3D" buttons that press down when tapped.
- Each operation has its own color and symbol, used everywhere it appears.
- Rounded, heavy type (Nunito, bundled with the app, no outside requests).

## Color tokens (all in `src/index.css`)

| Token | Value | Use |
|---|---|---|
| `--color-bg` / `--color-bg-2` | `#eef6ff` / `#fff6e3` | Page background gradient (sky to sunshine) |
| `--color-surface` | `#ffffff` | Cards, dialogs, header |
| `--color-text` | `#1a1446` | Body text (17.0:1 on white) |
| `--color-text-soft` | `#4a4470` | Secondary text (8.9:1 on white) |
| `--color-primary` / `-strong` / `-tint` | `#5b2ee8` / `#3d1bb0` / `#ede7ff` | Main buttons, links, focus accents |
| `--color-sun` | `#ffc21a` | Decorative stars and highlights; text on it is `--color-text` (10.5:1) |
| `--op-add` / `-strong` / `-tint` | `#0b7f57` / `#075c3f` / `#dcf6ea` | Addition (green) |
| `--op-sub` / `-strong` / `-tint` | `#c2410c` / `#8f300a` / `#ffe9dc` | Subtraction (orange) |
| `--op-mul` / `-strong` / `-tint` | `#1d63d8` / `#14469c` / `#dfeaff` | Multiplication (blue) |
| `--op-div` / `-strong` / `-tint` | `#b4236f` / `#831a51` / `#fde2f0` | Division (pink) |

Contrast rules (checked):
- White text on any base color: 5.0:1 or higher.
- Colored text on a tint must use the `-strong` shade (8:1 or higher). The base shade on its own tint is only about 4.4:1 for green and orange.
- Dark text (`--color-text`) works on every tint (14:1 or higher).
- The 3D bottom edge of a button uses the `-strong` shade.

## Shape and depth

- Radius: cards `1.5rem`, buttons and tiles `1rem`, badges fully round.
- Borders: `3px` on controls, `4px` on cards.
- 3D press: `box-shadow: 0 0.35rem 0 var(--shade)`. On `:active`, move down `0.25rem` and shrink the shadow. Wrap transitions in `prefers-reduced-motion: no-preference`.
- Focus: 4px `--color-text` outline with a 3px offset, on every control.

## Motion

- `PlayfulBackground` (fixed, behind everything, `aria-hidden`, `pointer-events: none`): about 14 shapes in pastel tints that drift and rotate slowly (18 to 32 s loops, ease-in-out, alternate).
- Motion runs only when the OS allows it (`prefers-reduced-motion: no-preference`) and the app's animation setting is on. Otherwise the shapes stay still. The Settings toggle becomes "Animations (card flip and moving background)", which lets anyone stop the movement (WCAG 2.2.2).
- Small moments: buttons press, the feedback bubble pops in, the progress bar fill slides, and the summary shows a short burst of shapes. Each runs once, is short, and is off under reduced motion.

## Operation identity

`OperationBadge` (shared component): a round badge in the operation color with its white symbol (+ − × ÷), size `sm`, `md` or `lg`, `aria-hidden` (the text label always sits next to it). Used on setup tiles, the card header band, statistics cards, mistake lists and the summary.

## Screens

- **Header:** white bar, a logo made of four small operation badges plus "Math Practice" in heavy type, and a four-color stripe along the bottom.
- **Home:** a big hero card with the heading, the welcome line, a cluster of bouncing operation bubbles (decorative), and chunky buttons with simple icons (play, chart, gear) next to the same text labels. A small note at the bottom: "Your progress stays on this device."
- **Practice setup:** operation tiles with a large badge in the operation's color, a tinted background and a ✓ when selected. Level tiles show 1 to 4 stars. Length tiles show a big number. Each section is a white card.
- **Practice card:** a band across the top in the operation's color with its badge and "Question 3 of 10". A giant question. Answer choices are chunky white tiles, which turn violet with a ✓ when selected. The number-key badge is round. The back of the card has a green "I Got It Right" button and a violet "I Got It Wrong" button, both with icons and both kind.
- **Progress bar:** a thick rounded track, a striped violet fill, and a star at the end.
- **Feedback:** a speech-bubble shape that pops in. Right answers are green with ★, other answers are violet with ♥.
- **Summary:** a big star badge, a short burst of shapes, and colorful stat tiles.
- **Statistics:** stat cards with colored top edges. Operation cards use their badge and color.
- **Settings and dialogs:** white rounded cards, and the same tiles and buttons as everywhere else.
