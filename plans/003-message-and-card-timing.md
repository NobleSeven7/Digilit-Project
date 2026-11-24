# 003 — Retune message, card and road timings to the UI budget

- **Status**: PARTLY DONE (step 1 left)
- **Commit**: ecf4645
- **Severity**: LOW
- **Category**: Easing & duration
- **Estimated scope**: 1 file (`src/index.css`), 4 lines

Covers audit findings 3 and 4. They share the file and the same kind of fix.

## Problem

```css
/* src/index.css:374 — current: a status message appearing, plain `ease`, 300ms */
.enter-fade { animation: enter-fade 300ms ease both; }

/* src/index.css:365–366 — current: a card arriving, 360ms (over the 300ms UI budget) */
.enter-rise {
  animation: enter-rise 360ms var(--ease-out) both;

/* src/index.css:390 — current: the delivery tracker's road, 450ms */
.road-fill { transition: clip-path 450ms var(--ease-in-out); }

/* src/index.css:394 — current: final stop settles as the road arrives (delay matches 450ms) */
.stop-settle { animation: stop-settle 450ms var(--ease-out) 400ms both; }
```

Entering elements should use ease-out. UI motion should stay under 300ms,
except modals, drawers, sheets and toasts.

## Target

```css
.enter-fade { animation: enter-fade 200ms var(--ease-out) both; }

.enter-rise {
  animation: enter-rise 280ms var(--ease-out) both;

.road-fill { transition: clip-path 350ms var(--ease-in-out); }

.stop-settle { animation: stop-settle 450ms var(--ease-out) 300ms both; }
```

`--ease-out` is `cubic-bezier(0.23, 1, 0.32, 1)` and `--ease-in-out` is
`cubic-bezier(0.77, 0, 0.175, 1)`, both already in `:root`. The road stays
slightly over 300ms on purpose: it travels across the whole card and explains
progress. The stop-settle delay moves from 400ms to 300ms so it still lands
just before the 350ms road arrives.

## Repo conventions to follow

- Keep the existing comments; update any number they mention (for example,
  "the delay matches the road's 450ms" becomes "350ms").

## Steps

1. `.enter-fade`: `300ms ease` → `200ms var(--ease-out)`.
2. `.enter-rise`: `360ms` → `280ms`.
3. `.road-fill`: `450ms` → `350ms`.
4. `.stop-settle`: delay `400ms` → `300ms`. Leave the duration at 450ms.
5. Update the numbers in the comments next to steps 3 and 4.

## Boundaries

- Do NOT change keyframes, `--rise`, `--delay`, or the reduced-motion block.
- Note that `.tick-pop`'s reduced-motion rule uses `enter-fade` with its own
  duration (`animation: enter-fade 200ms ease both`). Leave it alone.

## Verification

- **Mechanical:** build and 12 tests as in plan 001.
- **Feel check:** on Delivery, enter a wrong code: the red message appears
  quickly and settles, rather than drifting in. Enter the right codes: the
  next card rises quickly, the road slides to the new stop, and when the
  parcel is paid the last stop settles just as the road reaches it (check at
  10% playback).
- **Done when:** the four values match the target.
