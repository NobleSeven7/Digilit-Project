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
| 8 | Correct delivery OTP | PKR 500 released; row added to Google Sheets | PKR 500 released to carrier; `delivery` row with "Released to carrier" added to Google Sheets | Pass |

Note on test 8: the automated run has no webhook URL, so it confirms the
payment release and that the delivery record is handed to the webhook sender.
The Google Sheets half was confirmed by hand on 10 Nov 2026 with the team's
live Make.com scenario: one Islamabad → Lahore 5 kg delivery produced a
`shipment` row, a `match` row (PKR 500, "Held in escrow") and a `delivery`
row (PKR 500, "Released to carrier", with the delivery time).

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
- **Make.com only learned 13 of the 21 Sheet columns.** Cause: each event
  sent only its own fields, and Make learned the field list from the first
  sample (a shipment), so journey, match and delivery fields such as
  `carrierName` and `escrow` could not be mapped to Google Sheets. Fixed in
  `src/lib/webhook.js`: every record now sends all 21 columns in a fixed
  order, blank where they do not apply. Checked by capturing what the browser
  sends for a shipment, a match and a delivery (21 columns each), then re-ran
  all 8 tests (8 of 8 passed).
- **Match and delivery rows did not reach Google Sheets** during the first
  live test, although the app's sync log showed them as sent. Cause: the
  Make.com scenario was switched off, so Make queued the records instead of
  running them. No code change: switching the scenario on processed the queue
  and both rows appeared. (They landed in the Sheet out of order; the SentAt
  column shows the real order.)

## Stage 4: design polish pass

Visual changes only. No matching rules, scores, prices, statuses or test
steps were changed (`src/lib`, `src/data` and `tests/run-tests.cjs` are
untouched). All 8 tests re-run afterwards: 8 of 8 passed. Before and after
screenshots are in `test-screenshots/design-pass/` (made by
`tests/design-shots.cjs`).

- **Body font:** Atkinson Hyperlegible draws a slashed zero, so "1,000"
  looked like "1,θθθ". Switched the body font to Lexend (plain zeros, also
  designed for easy reading). Headings stay in Bricolage Grotesque.
- **Send page:** "Parcel details" and "Prohibited-items checklist" are now
  normal headings inside their cards instead of sitting on the border.
  A "0 of 5 checks ticked" counter (amber, turning green with a ✓ when all
  five are ticked) replaces the old hint. The disabled Post button is grey
  with a dashed outline instead of faded green. The price card now sits at
  the top of its column.
- **Delivery tracker:** completed steps and road are green, the current step
  is amber (red during a dispute), and upcoming steps are grey.
- **Home:** inner hero border removed; three fact tiles on the right
  (PKR 500 vs PKR 1,000, under 1 minute to match, 3 steps instead of 8).
  The sender and carrier choices have an icon, an arrow and a hover lift.
  "What it costs" is a side-by-side comparison with bars drawn to scale and
  a "Save 50%" badge. The steps section is renamed "How it works" so it no
  longer repeats the tile.
- **Matches:** eligible carriers show a row of ✓ chips with a "See details"
  toggle for the full rule results and score breakdown. Not-eligible
  carriers keep the full rule boxes. Every carrier has a vehicle icon, and
  scores have a small bar.
- **Navigation:** the current page is a white tab with an amber underline;
  on phones, the header shows the current page name.
- **Fixed during the pass:** "Under 1 minute" wrapped in its tile (widened
  the tile column), and tracker labels nearly touched at phone width
  (smaller labels on phones only).

## Stage 5: connect the live site to Make.com

- **Checked:** the live site was not connected. The deploy workflow built the
  app without `VITE_WEBHOOK_URL`, and `.env.local` is never uploaded, so the
  live site kept every record on the visitor's device.
- **Changed:** `.github/workflows/deploy.yml` now passes a repository secret
  named `VITE_WEBHOOK_URL` to the build. The URL is never in the code; if the
  secret is not set, the site works offline as before. Checked locally that a
  build with the variable contains the URL and a build without it does not.
- **Trade-off (team decision):** the URL is built into the public website
  code, so anyone inspecting the site could find it and send rows to the
  Sheet. Accepted for a class demo; the fix if it is misused is a new webhook
  URL in Make.com and an updated secret.
- **Confirmed on the live site (11 Nov 2026):** after the team added the
  `VITE_WEBHOOK_URL` secret and the site redeployed, a delivery completed on
  the live GitHub Pages link (carrier Usman Tariq) showed "Sent to Make.com"
  in the Admin sync log, and its row appeared in the Google Sheet.

## Stage 6: Looker Studio dashboard

Built by the team in Looker Studio, connected to the same Google Sheet that
Make.com fills. Link: https://datastudio.google.com/reporting/416cf872-9063-463b-a6c6-ff4e7b29649d

- **Metrics** (calculated fields, matching the proposal's impact metrics):
  - Total shipments: `SUM(CASE WHEN Event = "shipment" THEN 1 ELSE 0 END)`
  - Matches: `SUM(CASE WHEN Event = "match" THEN 1 ELSE 0 END)`
  - Average matching time: `AVG(MatchingMs)` (only shipment rows have a value)
  - Cost saved: `SUM(CASE WHEN Event = "delivery" THEN 1000 - Price ELSE 0 END)`
- **Charts:** four scorecards, records by event type (bar chart), and a
  completed-deliveries table filtered to `Event = delivery`.
- **First check:** 11 rows in the Sheet (4 shipments, 4 matches,
  3 deliveries) gave cost saved PKR 1,500 = 3 × (1,000 − 500), as expected.
- **Fixed during setup:** the deliveries table merged two deliveries with the
  same sender, carrier and route into one row and showed their prices added
  together (PKR 1,000). Adding `DeliveredAt` as a dimension gives each
  delivery its own row.
- The dashboard numbers differ from the in-app Dashboard on purpose: the
  app's sample data lives only in the browser, while the Sheet only holds
  records sent after Make.com was connected.

## Stage 7: tester feedback

- **Report: "the Looker Studio dashboard stopped updating".** Not an app
  fault. The tester's rows were all in the Google Sheet; Looker Studio was
  showing its saved copy of the data, which a browser reload does not
  replace. Fix: the report owner clicks "Refresh data", and the data source's
  "Data freshness" is set to the shortest time offered. The in-app Dashboard
  and the Looker Studio dashboard also count different things (the app
  includes its sample data), so their numbers are not expected to match.
- **Found in the tester's Sheet rows: the same journey posted six times in
  five seconds.** Cause: after "Post journey" the form stayed on screen and
  the confirmation appeared at the top of the page, out of view on a phone,
  so the button was tapped again. Fixed in `src/pages/Carrier.jsx`: the page
  scrolls to the confirmation, and an identical open journey (same carrier,
  route, departure, vehicle and spare kg) is refused with a message.
  Checked on a phone-sized screen: six taps add one journey, changing a
  detail allows a new one. All 8 tests re-run: 8 of 8 passed.
- **Sheet times looked 5 hours early.** The `SentAt` and `DeliveredAt`
  columns were sent in UTC (ending in `Z`), while the team and tester read
  them as Pakistan time. Changed `src/lib/webhook.js` to send both in
  Pakistan time (Asia/Karachi), written like `2026-11-11 14:42:31`, whatever
  time zone the visitor's device uses. Checked by capturing the records for a
  full delivery: at 09:42 UTC the app sent 14:42. Rows sent before this
  change stay in UTC. All 8 tests re-run: 8 of 8 passed.
