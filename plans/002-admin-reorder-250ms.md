# 002 — Shorten the Admin reorder so quick clicks are not lost

- **Status**: TODO
- **Commit**: ecf4645
- **Severity**: MEDIUM
- **Category**: Interruptibility
- **Estimated scope**: 1 file (`src/index.css`), 1 line

## Problem

Each Admin action (approve, reject, resolve: `src/pages/Admin.jsx:52, 67, 77`)
runs inside `withViewTransition` (`src/lib/motion.js:19`). While a view
transition plays, the page underneath does not receive clicks. The default
duration is 380ms, so an admin clicking down a list can lose a click, and
380ms is over the 300ms limit for UI motion.

```css
/* src/index.css:412–415 — current */
::view-transition-group(*) {
  animation-duration: 380ms;
  animation-timing-function: var(--ease-in-out);
}
```

## Target

```css
/* target */
::view-transition-group(*) {
  animation-duration: 250ms;
  animation-timing-function: var(--ease-in-out);
}
```

`--ease-in-out` is `cubic-bezier(0.77, 0, 0.175, 1)`, already defined in
`src/index.css` `:root`. The page and theme transitions set their own
durations (`html[data-transition="page"]`, `html[data-transition="theme"]`)
and are not affected.

## Repo conventions to follow

- Comments above rules explain the purpose in plain words. Update the comment
  above this rule to say why it is 250ms (clicks are blocked while it runs).

## Steps

1. In `src/index.css`, change `animation-duration: 380ms;` in the
   `::view-transition-group(*)` rule to `animation-duration: 250ms;`.
2. In the comment above it, add: "Kept short (250ms): the page cannot be
   clicked while it runs, and admins click down a list."

## Boundaries

- Only this rule. Do NOT change `src/lib/motion.js` or `src/pages/Admin.jsx`.
- If the rule differs from the excerpt, STOP and report.

## Verification

- **Mechanical:** `npm run build` succeeds, and the 12 tests pass (see plan 001).
- **Feel check:** with sample data, open Admin and approve three flagged rows
  as fast as you can. Every click should register, and the rows below should
  still visibly slide up. At 10% playback (DevTools > Animations), the
  removed row fades while the others slide, with no jump at the end.
- **Done when:** the computed `animation-duration` of a
  `::view-transition-group` during an Admin action is 250ms.
