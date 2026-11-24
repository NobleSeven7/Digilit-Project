# 001 — Animate Matches and Delivery cards only when something is new

- **Status**: DONE
- **Commit**: ecf4645
- **Severity**: MEDIUM
- **Category**: Purpose & frequency
- **Estimated scope**: 2 files (`src/pages/Delivery.jsx`, `src/pages/Matches.jsx`), ~30 lines

## Problem

Entrance animations that mean "this just arrived" replay every time the page
is opened, including with the browser's Back button. Opening a page already
runs the page fade (`html[data-transition="page"]` in `src/index.css`), so a
revisit shows two motions and no new information. People move between these
pages tens of times in a demo.

Delivery: every step card has the class `enter-rise`, so it rises on every
visit, not only when the step changes.

```jsx
/* src/pages/Delivery.jsx:346–347 — current (same pattern at :398, :418, :438, :458, :465, :477, :491) */
{delivery.status === DELIVERY.AWAITING_ACCEPT && (
  <section className="card enter-rise" data-testid="step-accept">
```

Matches: every eligible carrier card gets `arrival(rank)`, so the ranked cards
replay their wave on every visit.

```jsx
/* src/pages/Matches.jsx:45–56 — current */
const ARRIVE_DELAY = [0, 80, 140, 190]
function arrival(rank) {
  if (!rank) return {}
  return {
    className: 'enter-rise',
    style: { '--delay': `${ARRIVE_DELAY[Math.min(rank, ARRIVE_DELAY.length) - 1]}ms`, '--rise': rank === 1 ? '10px' : '6px' },
  }
}
```

## Target

- **Delivery:** a step card rises only when the delivery's status changes
  while the page is open (for example, after the correct pickup code moves it
  to "In transit"). Opening the page, or switching to another delivery, shows
  the card in place.
- **Matches:** the ranked wave plays the first time a parcel's results are
  shown in this browser tab. After that, opening that parcel's results again
  shows them in place.
- **Reduced motion:** the existing rule at `src/index.css`
  (`.enter-rise, .enter-pop { animation-name: enter-fade; animation-delay: 0ms; }`)
  keeps working, because the same class is still used when something is new.

## Repo conventions to follow

- Per-tab "already seen" memory uses `sessionStorage`, wrapped in try/catch
  so it fails safe (it just plays). Exemplar: `src/pages/Home.jsx:168–177`
  (`INTRO_KEY = 'raastashare:intro-seen'`).
- Comments in plain English above each block (see any file in `src/pages`).

## Steps

1. **`src/pages/Delivery.jsx`:** directly after
   `const delivery = deliveries.find((d) => d.id === id) || deliveries[0]`
   (line 92) and before the `if (!delivery)` early return, add:
   ```jsx
   // A step card rises in only when the step changes while this page is open,
   // not every time the page is opened. Remember the status the delivery had
   // when it was opened (and again whenever another delivery is picked).
   const [opened, setOpened] = useState({ id: delivery?.id, status: delivery?.status })
   if (delivery && opened.id !== delivery.id) setOpened({ id: delivery.id, status: delivery.status })
   const rise = delivery && opened.id === delivery.id && delivery.status !== opened.status ? 'enter-rise' : ''
   ```
2. In the same file, in each of the 8 step `<section>` elements (lines 347,
   399, 419, 439, 459, 466, 478, 492), replace the literal `enter-rise` in
   `className` with `${rise}`, turning the `className` into a template
   literal. Example:
   `<section className={`card ${rise}`} data-testid="step-accept">`.
   Keep every other class exactly as it is.
3. **`src/pages/Matches.jsx`:** above `const ARRIVE_DELAY`, add:
   ```jsx
   // The ranked cards arrive as a wave the first time a parcel's results are
   // shown in this tab; opening them again shows them in place.
   const SEEN_KEY = 'raastashare:results-seen'
   function resultsSeen(id) {
     try { return JSON.parse(sessionStorage.getItem(SEEN_KEY) || '[]').includes(id) } catch { return false }
   }
   function markResultsSeen(id) {
     try {
       const seen = JSON.parse(sessionStorage.getItem(SEEN_KEY) || '[]')
       if (!seen.includes(id)) sessionStorage.setItem(SEEN_KEY, JSON.stringify([...seen, id]))
     } catch { /* storage blocked: the wave simply plays again */ }
   }
   ```
4. In the Matches page component, where the current shipment is known, add
   `const [wave] = useState(() => !resultsSeen(shipment.id))` and
   `useEffect(() => { markResultsSeen(shipment.id) }, [shipment.id])`. Then
   pass `wave ? rank : undefined` instead of `rank` wherever `arrival(rank)`
   is spread, so cards without a wave get `{}`. Import `useEffect`/`useState`
   if they are not already imported.

## Boundaries

- Do NOT change `.enter-rise` itself in `src/index.css` (plan 003 retunes its timing).
- Do NOT change any `data-testid`, text, or the order of sections.
- Do NOT touch the RouteLine road animation (`src/components/RouteLine.jsx`).
- If a line referenced above has moved or changed since commit `ecf4645`,
  STOP and report instead of improvising.

## Verification

- **Mechanical:** `npm run build` succeeds. Then `npm run build:e2e`, start
  `npx vite preview --port 4173`, and `npm run test:e2e` reports `12 of 12 passed`.
- **Feel check:**
  - Post a parcel: the ranked cards arrive as a wave. Press Back, then
    Forward: the cards are already in place, with no wave.
  - Open a delivery: the step card is simply there, no rise. Enter the
    correct pickup code: the "In transit" card rises in.
  - Turn on `prefers-reduced-motion` (DevTools > Rendering): the new card
    fades in without moving.
- **Done when:** on a revisit, no element on Matches or Delivery runs an
  animation (`document.getAnimations().length === 0` 500ms after the page
  opens, apart from the page fade).
