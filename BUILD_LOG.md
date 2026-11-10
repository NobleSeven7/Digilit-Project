# Build log

A record of what was built, where each decision came from, and errors fixed.

## Plan

1. Project setup, rule engine, pricing, storage, sample data
2. The seven pages
3. Browser tests for the 8 proposal test cases, with screenshots
4. README, this log, GitHub Pages deploy workflow

## Stage 1: setup and logic

- Created a Vite + React project by hand (plain JavaScript), with Tailwind CSS.
- Extra libraries: only Tailwind and two font packages (Bricolage Grotesque,
  Atkinson Hyperlegible), bundled so they work offline. No router library:
  `src/lib/navigation.js` switches pages using the `#/page` part of the address.
- `src/lib/matching.js`: the four rules and the score.
- `src/lib/pricing.js`: PKR 200 + PKR 60 per kg.
- `src/lib/storage.js`: saves everything in localStorage.
- `src/lib/webhook.js`: posts to `VITE_WEBHOOK_URL`; if it is empty the record
  is kept locally and noted in the sync log.
- `src/data/sampleData.js`: fictional data, including the Islamabad → Lahore
  5 kg demo case. Dates are calculated from today so the demo does not expire.
- Checked the engine on the demo case before building pages: Bilal 75,
  Sana 60, Usman 56; Hamza rejected on route, Nida on timing, Imran on capacity.

## Stage 2: pages

Home, Send, Carry, Matches, Delivery, Admin, Dashboard, plus a "Reset demo
data" button in the footer of every page.

Design direction (approved before building): motorway-sign green `#0B6B43`,
cool off-white background, amber for "held in escrow", red for failed rules;
a "route line" (two stops joined by a road) on every shipment, which becomes
the progress tracker on the Delivery page. Pass and fail always show an icon
and a word, not colour alone.

## Stage 3: tests

`tests/run-tests.cjs` runs the 8 proposal test cases in a real Chromium
browser. Result of the run on the built app: 8 of 8 passed. Screenshots are in
`test-screenshots/`.

| # | Test case | Expected | Actual | Result |
|---|---|---|---|---|
| 1 | 5 kg small parcel, Islamabad → Lahore | Match found and ranked | 3 carriers matched; best match Bilal Ahmed, 75 / 100 | Pass |
| 2 | Carrier travelling Islamabad → Karachi | Rejected (route) | Hamza Sheikh rejected, route failed | Pass |
| 3 | Carrier departs after deadline | Rejected (timing) | Nida Raza rejected, timing failed | Pass |
| 4 | 20 kg package, carrier has 10 kg spare | Rejected (capacity) | Bilal Ahmed rejected, capacity failed | Pass |
| 5 | Fragile item, motorbike carrier | Rejected (compatibility) | Usman Tariq rejected, compatibility failed | Pass |
| 6 | Two carriers pass all rules | Higher score first | Bilal (75), Sana (60), Usman (56) | Pass |
| 7 | Wrong delivery OTP | Payment stays in escrow | "PKR 500 stays in escrow", status Held in escrow | Pass |
| 8 | Correct delivery OTP | PKR 500 released; row added to Google Sheets | PKR 500 released to carrier; delivery record handed to the webhook sender | Pass (app side) |

Note on test 8: with no webhook URL set, the test confirms the app releases
the payment and hands the delivery record to the webhook sender (visible in
the Admin sync log). The row in Google Sheets itself can only be confirmed
once the team's Make.com scenario is connected.

## Decisions taken from the proposal

- Four eligibility rules, all must pass (section 2, step 1).
- Score: time buffer 50 or 25, plus capacity fit 50 × (package kg ÷ spare kg) (step 2).
- Vehicle–item compatibility table and the 10 kg / 15 kg limits.
- Pricing: PKR 200 base + PKR 60 per kg; PKR 1,000 courier baseline.
- Two random 4-digit OTPs, shown in the app instead of SMS.
- Escrow held on acceptance, released on the correct delivery OTP.
- "Unmatched – Retrying" when no carrier passes or the carrier declines, with
  the next-ranked carrier offered; flagged for admin after 2 hours.
- Disputes freeze the escrow and go to a human admin.
- Demo profiles instead of login; fictional data only.
- Nothing from the future-work list was built.

## Assumptions added (not stated in the proposal)

1. **Trip durations.** "Perishables in a car on trips under 6 hours" needs a
   trip length, so `constants.js` has a table of approximate road hours.
2. **Weight limits belong to the Compatibility rule.** A parcel over 10 kg on
   a motorbike (or 15 kg with a bus traveller) fails Compatibility.
3. **Timing is strict.** The carrier must depart before the deadline, not at it.
4. **Ties.** Equal scores are ordered by earlier departure.
5. **Both users accept on one device.** The Delivery page has separate
   "Accept as sender" and "Accept as carrier" buttons, plus "Decline".
6. **Matching time** is measured in the browser from pressing "Post shipment"
   to the ranked result, so it is a few milliseconds.
7. **Cost saved** uses the flat PKR 1,000 baseline for every completed
   delivery. That baseline is a 5 kg quote, so heavier parcels are understated.
8. **Admin actions.** The admin can cancel an unmatched request, and settle a
   dispute by releasing to the carrier or refunding the sender.
9. **A carrier's spare capacity is not reduced** after a match; each journey
   is treated as carrying one parcel for the demo.

## Errors and fixes

- **"Not eligible" badge was amber** (the "waiting" colour) on the Matches
  page. Cause: the label was missing from the red list in `StatusBadge.jsx`.
  Fixed by adding it; rebuilt and re-ran all 8 tests.
- **First push to GitHub refused (HTTP 403).** Cause: the Claude GitHub App
  did not have access to the repository at that moment. Work continued in
  local commits, and a later push of all commits succeeded.
