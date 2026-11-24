# Animation plans

Written by the `improve-animations` audit (deep effort) at commit `ecf4645`.
Each plan stands alone, with exact files, current code, target values and checks.

| # | Plan | Severity | Status |
| --- | --- | --- | --- |
| 001 | [Animate Matches and Delivery cards only when something is new](001-animate-only-what-is-new.md) | MEDIUM | DONE (Matches as part of the wave choreography) |
| 002 | [Shorten the Admin reorder so quick clicks are not lost](002-admin-reorder-250ms.md) | MEDIUM | DONE |
| 003 | [Retune message, card and road timings to the UI budget](003-message-and-card-timing.md) | LOW | PARTLY DONE: steps 2–4 done; step 1 (`.enter-fade` 200ms ease-out) still TODO |
| 004 | [Play Home's scroll animations once per visit, like the intro](004-home-scroll-reveals-once.md) | LOW | PARTLY SUPERSEDED: `.reveal-up` was deleted; the `.bar-grow` and `.code-roll` rules are still TODO |

Plan 003 covers two audit findings (3 and 4); there are four plans for five findings.

## Order and dependencies

1. **002** first: one line, no dependencies.
2. **004**: CSS only, independent.
3. **003**: CSS timings. Do it before 001, so 001's feel check uses the final card timing.
4. **001** last. Its Matches half may be superseded by the Matches
   choreography work (step 4 of the current request). If that work has
   already landed, do only the Delivery half.

Not planned, on purpose:
- audit findings 5, 6, 8 and 9 (low polish; not selected);
- finding 10 (the success tick's starting size), which belongs to the
  booked-parcel tick work.
