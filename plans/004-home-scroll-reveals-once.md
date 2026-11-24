# 004 — Play Home's scroll animations once per visit, like the intro

- **Status**: PARTLY SUPERSEDED (.reveal-up deleted; drop its rule)
- **Commit**: ecf4645
- **Severity**: LOW
- **Category**: Purpose & frequency
- **Estimated scope**: 1 file (`src/index.css`), about 8 lines

## Problem

The Home intro already plays only on the first visit in a tab:
`src/pages/Home.jsx:168–189` puts `intro-done` on the page wrapper, and
`src/index.css:351` turns the intro off:

```css
/* src/index.css:351 — current */
.intro-done :is(.hero-enter, .route-draw, .stop-enter, .map-parcel) { animation: none; }
```

The scroll animations further down still replay on every return:
- `.reveal-up` (steps rise, 600ms + 150ms);
- `.bar-grow` (price bars fill, 900ms);
- `.code-roll` (code digits roll, about 1.5s).

## Target

After the first visit, those three show their finished state at once. Use
exactly the same values the reduced-motion block already uses
(`src/index.css:530–532`):

```css
/* target: add right after the .intro-done rule at :351 */
.intro-done .reveal-up > * { opacity: 1; translate: none; transition: none; }
.intro-done .bar-grow { clip-path: none; transition: none; }
.intro-done .code-roll > span { translate: 0 var(--end); transition: none; }
```

## Repo conventions to follow

- Mirror the reduced-motion rules at `src/index.css:530–532`. They already
  define "finished state, no motion" for these exact classes.

## Steps

1. In `src/index.css`, after the `.intro-done :is(...)` rule (line 351), add
   the three rules above.
2. Extend the comment above that block: "The scroll animations further down
   (steps, price bars, code) also show finished after the first visit."

## Boundaries

- CSS only. Do NOT change `Home.jsx` or `useSeenOnce`.

## Verification

- **Mechanical:** build and 12 tests as in plan 001.
- **Feel check:** open Home and scroll down: the steps rise, the bars fill and
  the code rolls. Go to Send, come back to Home and scroll: everything is
  already in place. Open a new tab: it animates again.
- **Done when:** on a second visit, scrolling Home starts no animations or
  transitions (watch the DevTools > Animations panel).
