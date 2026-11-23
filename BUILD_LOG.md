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

## Stage 8: Home page route map

A team member liked a reference site that used a transit map as its hero.
We kept RaastaShare's own design and added the idea in our own style.

- New `src/components/RouteMap.jsx`: the Islamabad to Lahore motorway drawn
  as a route map (green road, dashed centre line, seven stops), in a white
  card on the right of the Home hero. An amber "parcel" dot rides the route
  once when the page opens and rests at Lahore; it does not move for people
  who have asked their device for reduced motion.
- The headline is larger on wide screens, and the three fact tiles moved
  from the right of the hero to a row across its bottom.
- Fixed during the change: the "I am a sender / I am a carrier" titles
  wrapped onto two lines in the narrower column; they now stay on one line.
- Visual change to the Home page only; no logic changed. All 8 tests re-run:
  8 of 8 passed. Screenshots: `test-screenshots/design-pass/route-hero-*.png`.

## Stage 9: route map on the Send page

A team suggestion: show a map while the sender picks a route, for every
route we support.

- New `src/components/CityMap.jsx`: the eight cities placed roughly where
  they are in Pakistan. The chosen From and To cities are highlighted and
  joined by a green road, and the caption gives the approximate trip time
  from the existing route table. It sits beside the From and To pickers on
  the Send page (below them on phones).
- It is a picture, not a maps service: positions are approximate, lines are
  straight, and Rawalpindi is nudged away from Islamabad so they do not
  overlap. Matching still uses exact city names, as in the proposal.
- The hand-drawn Islamabad to Lahore motorway map stays on the Home page.
- Checked all 64 From/To combinations in the browser (56 routes draw one
  road with a trip time; the 8 same-city picks show no road and a prompt).
  Fixed during the change: a clipped "Lahore" label and the demo route
  running through the "Rawalpindi" label. All 8 tests re-run: 8 of 8 passed.

## Stage 10: web of routes on the Home page

Team decision: the hand-drawn Islamabad to Lahore motorway map from Stage 8
is removed from the Home page (the Send page's city map now covers routes).
In its place the hero has a faint background web of routes.

- New `src/components/RouteWeb.jsx`: seven transit-map style lines with
  stops, drawn in a green slightly lighter than the hero and faded towards
  the headline so the text stays readable. Decoration only: it does not show
  real roads and is hidden from screen readers.
- Removed `src/components/RouteMap.jsx` and its moving-dot animation.
- The three fact tiles are back on the right of the hero.
- Home page only; no logic changed. All 8 tests re-run: 8 of 8 passed.
  Screenshots: `test-screenshots/design-pass/route-web-hero-*.png`.

## Stage 11: "How it works" as a road

The three "How it works" cards on the Home page became one road with three
numbered stops (Submit, Accept, Verify), in the same style as the route line
used across the app. The road runs left to right on wide screens and top to
bottom on phones. The idea of putting steps on a single line came from a
reference design the team looked at; the drawing and colours are our own.
Home page only; no logic changed. All 8 tests re-run: 8 of 8 passed.
Screenshots: `test-screenshots/design-pass/how-it-works-road-*.png`.

## Stage 12: phone dark mode

- **Report from a team phone:** the Home page looked near-black with bright
  green route lines and dark cards. Cause: the app has one (light) colour
  theme and did not say so, so the phone's browser, in dark mode, recoloured
  the page automatically.
- **Change:** `index.html` and `src/index.css` now declare
  `color-scheme: only light`, the standard way to ask browsers not to apply
  an automatic dark theme.
- **Not verified here:** the forced dark theme could not be reproduced in the
  test browser, so this needs checking on the phone that showed it. Some
  browsers' "force dark" settings ignore the request; if so, the fix would be
  a real dark theme. All 8 tests re-run: 8 of 8 passed.

## Stage 13: dark theme

The phone from Stage 12 uses Samsung Internet, which kept forcing its own
dark colours. Team decision: give the app a real dark theme instead of
opting out. This replaces the "light only" declaration from Stage 12.

- **How it works:** every colour in the app is a named token in
  `src/index.css`. The dark theme gives the same names dark values under
  `<html data-theme="dark">`, so no page needed its own dark styles.
- **Two new tokens** made that possible: `surface` (cards, fields, menus;
  was plain white) and `brand-ink` (green used for text and outlines, which
  must be lighter on a dark background than the green used for fills).
- **Choosing the theme** (`src/lib/theme.js`): the app follows the device's
  light or dark setting. A sun / moon button in the header switches theme,
  and the choice is remembered in the browser. A small script in
  `index.html` applies the theme before the page is drawn.
- **Checked in the browser:** a device in dark mode opens the app dark, a
  device in light mode opens it light, the switch changes theme, and the
  choice survives a reload. All seven pages were reviewed in the dark theme
  on phone and desktop sizes. The light theme's colours are unchanged.
  All 8 tests re-run: 8 of 8 passed.
- **Not verified here:** Samsung Internet itself. The dark theme should stop
  it applying its own colours, but that needs confirming on the phone.
  Screenshots: `test-screenshots/design-pass/dark-*.png`.

## Stage 14: Home page redesign

The team asked for a bolder Home page, built with three design skills as
guidance (Emil Kowalski's design skills, Impeccable and the Taste skill),
keeping the green brand colour and using diagrams instead of photos. A first,
subtler version was shown and rejected as too close to the old page.

**Home page**
- The hero is now a route map of the eight cities (`src/components/HeroMap.jsx`),
  drawn like a transit map in three greens. The Islamabad to Lahore demo
  route is drawn as a road with a "5 kg, PKR 500" tag. When the page opens,
  the routes draw themselves and an amber parcel rides that road once.
- "What it costs" is a band of motorway green with large prices, bars to
  scale and an amber "Save 50%" badge.
- New closing section with two buttons (Post a parcel, Post a journey).
- Removed: the green hero panel, the three fact tiles (their facts moved
  into the map tag and the "How it works" sentence) and the background web
  of routes (`RouteWeb.jsx`).

**Every page**
- New typeface: Barlow Condensed for headings and Barlow for text, a family
  modelled on road-sign lettering. Replaces Bricolage Grotesque and Lexend.
- Buttons shrink slightly when pressed; drawn icons replace the text symbols
  for ticks, crosses and arrows; selected text, the typing cursor, checkboxes
  and scrollbars use the brand colours.
- Layouts, matching rules and logic are unchanged.

**What was not used from the skills:** photos, shader effects and real
product logos (the team chose diagrams); the skills' checker programs and
hooks (their written rules were followed by hand). The skills are installed
in `.claude/skills`, which is not uploaded to GitHub.

**Checked:** all seven pages viewed at phone width in both themes; Home also
at desktop width; no sideways scrolling or browser errors; the phone bottom
menu no longer clips "Dashboard". All 8 tests re-run: 8 of 8 passed, and
their screenshots were re-taken. The map is a diagram: cities are roughly
placed and the lines do not follow real roads.
Screenshots: `test-screenshots/design-pass/redesign-*.png`.

## Stage 15: easier-to-read small text

- **Report from the team:** grey help text (page introductions and the hints
  under form fields) looked faint after the redesign.
- **Cause:** the grey did not change, but the new Barlow font has thinner
  strokes than the old one, so small grey text reads lighter.
- **Decision:** make the text clearer for everyone instead of adding an
  accessibility mode, which only helps people who find the switch.
- **Change** (`src/index.css`): secondary text is a darker grey in the light
  theme (#3D4C44) and a lighter one in the dark theme (#B4C4BB), and small
  print is slightly larger (15px and 13px, up from 14px and 12px).
- **Found while checking:** on narrow phones the header (logo, page name and
  theme switch) could be wider than the screen when the web fonts had not
  loaded, making the page scroll sideways. The header is now tighter on
  narrow screens, and the bottom menu sizes each label to its text.
- **Checked:** all seven pages at 320px, 360px and 390px wide, with the web
  fonts and with them blocked: no sideways scrolling and no clipped menu
  labels. All 8 tests re-run: 8 of 8 passed.
  Screenshots: `test-screenshots/design-pass/help-text-*.png`.

## Stage 16: the carrier's side of matching

- **Report from the team:** after posting a journey, "See matches" took the
  carrier to the Matches page, which lists carriers for a sender's parcel. A
  carrier has no use for a list of other carriers.
- **Cause:** a gap in the design, not a bug. The Matches page was built as
  the sender's view (as the proposal describes it), and nothing showed the
  same matching from the carrier's side.
- **Change:** the Carry page has a new "Parcels for your journey" section
  (in `src/pages/Carrier.jsx`). For a chosen journey it shows requests
  senders have already sent, the waiting parcels that pass all four rules
  (with the fee and how much spare space each uses), and the parcels that do
  not fit, with the rule that failed. After posting a journey, the button now
  reads "See parcels for this journey".
- **New action, "Offer to carry":** the carrier can start a delivery from
  their side. It creates the same delivery record as a sender's request, with
  the carrier already marked as accepted; the sender must still accept before
  the fee moves into escrow. This is an addition to the proposal, which only
  describes the sender starting a match. The shared code is in
  `src/lib/delivery.js`.
- **Unchanged:** the four rules and the score. The carrier view uses the same
  rule checks as the Matches page.
- **Checked in the browser:** the offer path (sender still has to accept,
  then PKR 500 is held), a sender's request appearing under "waiting for your
  answer", and a newly posted Quetta to Karachi journey showing the waiting
  parcel on that route. No sideways scrolling at phone width. All 8 tests
  re-run: 8 of 8 passed.
- **Follow-up:** the journey list showed every carrier's open journeys.
  It now shows only the journeys of the carrier chosen under "Posting as",
  which is how it would work with real accounts. Imran Qureshi, a sample
  carrier, was added to the "Posting as" list so his journey can be viewed.
  Checked for four carriers, after posting a second journey, and through the
  "Offer to carry" path. All 8 tests re-run: 8 of 8 passed.

## Stage 17: simulated sign-in

A team idea, kept inside the proposal's limits: the proposal says users
"choose a Sender or Carrier profile instead of a full login", and lists real
login as future work. So this is a profile picker, not a login.

- **"Signed in as" picker** (`src/lib/profile.js`, shown under the header on
  every page): choose one of the fictional senders or carriers. No passwords,
  no real accounts; the choice is remembered in the browser.
- **Send and Carry** use the signed-in person, so their "Posting as" fields
  are gone. Opening a page with the wrong role shows a notice with a button
  to switch (`src/components/RoleNotice.jsx`).
- **Delivery:** each person can only accept (or decline) as themselves. The
  other person's row offers a "Switch to ..." button. Someone not involved in
  the delivery sees no accept buttons.
- **Home:** "I am a sender / carrier" also signs you in with that role.
- **Not restricted:** entering the pickup and delivery codes, the Matches
  page, and the Admin page work for any profile.
- **Tests:** `tests/run-tests.cjs` now switches to the carrier before
  accepting on their side. All 8 tests pass.
- **Also in this change:** the blank space beside the route map on the Send
  page is gone (the four route and parcel fields now stack beside the map).

**How to undo the sign-in.** It is one commit, `d633586` ("Preview: simulated
sign-in with demo profiles"). Reverting that commit brings back the "Posting
as" fields and the two accept buttons, and keeps the Send page layout fix.
This was tried before release: with the commit reverted, the app built and
all 8 tests passed. On GitHub, the pull request's own "Revert" button would
undo the layout fix as well, so revert the single commit instead.

## Stage 18: AI parcel check

**Why:** the marking criteria include emerging technology, and the app had no
AI anywhere. The matching engine stays rule-based on purpose and was not
touched.

**What was built**
- `src/lib/aiCheck.js`: sends the sender's item description to a new Make.com
  webhook (which asks an AI model) and reads the answer: a suggested item
  type and a "possibly prohibited" flag with a one-line reason. The reply is
  checked before it is trusted: the type must be one of our item types, the
  flag must be a clear yes or no, and the reason is cut to one line.
- **Fallback:** with no AI address, no answer within 8 seconds, or an
  unusable reply, a keyword check runs instead and is labelled
  "Offline check (not AI)".
- **Send page:** a "Describe your item" field, a "Check with AI" button and a
  suggestion card. The sender still chooses the item type (a "Use this type"
  button applies the suggestion) and still ticks the checklist. Editing the
  description clears the old answer.
- **Admin page:** a "Possibly prohibited items" section. A flagged shipment
  that is posted appears there with its description, the reason and the
  source, and a person chooses Allow or Cancel request.
- **Settings:** `VITE_AI_WEBHOOK_URL` in `.env.example` and the deploy
  workflow (from a repository secret), the same way as `VITE_WEBHOOK_URL`.
  No API key is in the app.
- **Logging:** each check goes through `src/lib/webhook.js` as
  `event = "ai_check"`. Three columns were added at the END of the fixed
  column list (`aiDescription`, `aiReason`, `aiSource`), so the first 21 keep
  their order.

**Decisions (approved by the team before coding)**
- A flag does not block the shipment. It still posts and matches, because the
  AI can be wrong and no new status was to be added; a person decides on the
  Admin page.
- Provider: Google Gemini through Google AI Studio's free tier, called from
  Make.com.
- Not changed: the four rules, scores, pricing, statuses, the design style,
  the simulated sign-in and tests 1 to 8.

**Tests:** four added to `tests/run-tests.cjs` (9 normal item, 10 fragile
item, 11 prohibited item, 12 offline fallback). All 12 pass. Tests 9 to 11
use a stand-in that returns fixed replies, so they prove the app handles an
AI answer correctly; they do not test the real model. A test build
(`npm run build:e2e`, settings in `.env.e2e`) points the app at the stand-in
address and keeps test runs from writing to the real Google Sheet.

**Errors hit and fixes**
- **"Fresh mangoes" was suggested as a small parcel** by the offline check.
  Cause: the keyword match allowed a plural ending in "s" but not "es", so
  "mango" did not match "mangoes". Fixed the pattern and re-checked eleven
  descriptions.
- **The Admin section was first titled "Possibly prohibited (AI check)"**,
  which was wrong when the flag came from the offline keyword check. Renamed
  to "Possibly prohibited items"; each row shows its source.
- **Request format changed before release.** The first version sent JSON,
  which makes browsers ask the server for permission first. It now sends a
  plain form field, which browsers send directly, so there is less to get
  right on the Make.com side.

**Not verified at release**
- The free AI allowance: it is small and changes, and current limits were not
  available from an official source when this was written.
- Whether Make.com's webhook response is readable by the browser without the
  `Access-Control-Allow-Origin` header; the setup adds it, so this was never
  tried without it.

**Confirmed with the real AI (17 Nov 2026).** The team built the Make.com
scenario (Custom webhook → Google Gemini AI "Generate a response" → Webhook
response) and ran a check on the Send page with the app on a PC. For
"2 glass vases" the card showed "AI suggestion", suggested Fragile item, no
prohibited item, with Gemini's own reason ("Glass items are fragile and
permitted for delivery.").

**Confirmed on the live site (17 Nov 2026)**, after adding the
`VITE_AI_WEBHOOK_URL` repository secret and redeploying:

| Description | AI suggestion | Flag | Right? |
|---|---|---|---|
| 2 glass vases | Fragile item | Not prohibited | Yes |
| a box of fireworks | Bulky item | Possibly prohibited: "classified as explosives and hazardous materials" | Flag yes, type no |
| pair of shoes | Small parcel | Not prohibited | Yes |

The fireworks shipment, once posted, appeared on the Admin page under
"Possibly prohibited items" with its description and Gemini's reason. The
"Bulky item" suggestion for a small box of fireworks is a real example of the
AI being wrong; the sender still chooses the item type, and a person reviews
the flag. The first live attempt showed "Offline check (not AI)" because the
browser was still showing the version from before the redeploy; a hard
refresh fixed it.

**Problems hit while setting up Make.com, and fixes**
- **Locked out of the original Make account.** Signing in only showed a new,
  empty organisation in the EU1 region ("You do not have access to this
  zone"), while the existing logging scenario lives in the US2 region. That
  scenario kept running and writing to the Google Sheet, so it was left as
  it was. The AI scenario was built in the EU1 organisation instead; the app
  does not mind the two webhooks being in different regions. Until access to
  US2 is restored, the three new Sheet columns cannot be mapped, so
  `ai_check` rows are logged without the description, reason and source.
- **The Gemini module needs the description as a Message.** With the prompt
  only in "System Instructions", Make reported "Messages: Field must not be
  empty". Fix: rules in System Instructions, the item description alone as
  the user Message. Keeping the two apart also makes it harder to trick the
  AI with instructions typed into the description box.
- **Body mapped to the whole result.** The Webhook response first sent
  Gemini's full result bundle, which the app cannot read. Fix: map only
  **Result** (the text answer).
- **Gemini was too slow.** With Gemini 3.8 Flash, a run was still working
  after 17 seconds, well past the app's 8-second wait, so the app always
  used the offline check, and the run was later stopped
  (ExecutionInterruptedError). Testing with "Run once" added to the
  confusion; the scenario has to be switched ON.
- **Wrong model picked.** `gemini-3.8-flash-lite-tts` is a text-to-speech
  model and rejected the request ("[400] Thinking level is not supported for
  this model"). Fix: the plain Gemini 3.8 Flash-Lite model, with the
  thinking settings left empty. It answers within the 8-second limit.

**Known limits:** the AI can be wrong; the offline check is a crude keyword
search (for example it flags "wine glasses"); descriptions are sent to
Make.com, the AI provider and the Google Sheet; the AI webhook address is
public.

## Stage 19: motion on state changes

Built with the `animate` and `choreograph` skills (Emil Kowalski's design
skills). Only things that change move; pages, typing and data the user is
reading stay still. Curves come from the existing `--ease-out` and
`--ease-in-out` tokens, and every animation is under 300 ms.

| Where | What moves | Why |
|---|---|---|
| Delivery | The amber and green road slides to its new stop (clip-path, 300 ms); the new step card rises in (240 ms); the message fades in; the escrow badge colour fades | Shows which step just happened |
| Delivery, when paid | The last stop settles in as the road arrives (the one small celebration) | Marks the end of the delivery |
| Matches | Ranked carriers arrive best first with shrinking gaps (0, 50, 90, 120 ms); the best match rises furthest; not-eligible carriers stay still | The order reinforces the ranking |
| Matches | "See details" opens smoothly (browsers that support it) | Avoids a jump |
| Send | Each AI answer arrives as a new card from just under the button | Shows a new answer arrived |
| Admin | After Allow or Cancel, the row fades while the rows below slide up (view transitions, recent Chrome-based browsers) | Shows where the row went |

- **Reduced motion:** nothing moves or slides; things only fade.
- **New file:** `src/lib/motion.js` (view-transition helper); the rest is in
  `src/index.css` and small class changes on the pages.
- **Error and fix:** test 11 failed after the change because the Admin row now
  leaves a frame later (the view transition applies the change on the next
  frame). Checked in the browser that the row is gone within 50 ms and the
  decision is saved at once, then made the test wait up to 2 seconds for the
  row to leave. All 12 tests pass.
- **Not checked:** how it feels on a real phone; the Admin sliding and smooth
  "See details" fall back to an instant change in browsers without support.

## Stage 20: Impeccable audit fixes

The Impeccable audit scored the live site 16/20. Its five follow-up commands
were run in order:

- **colorize (contrast):** the red text on the red "failed rule" card went from
  4.46:1 to 4.97:1 (`--color-fail` now `#B83228`). The faint white notes on the
  green band (4.45:1 light, 3.75:1 dark) now use a new solid token,
  `--color-on-brand-soft`, at 4.5:1 or better in both themes. Placeholders use
  the muted colour.
- **harden (markup):** the price comparison was a `<dl>` with invalid children;
  it is now a list. The "Signed in as" bar is now a labelled `<aside>` so it
  sits inside a landmark.
- **adapt (tap targets):** the theme switch, profile picker, logo, the "See
  details" and "How the score is calculated" toggles and "Use this type" are
  now at least 44px tall.
- **typeset:** headings use balanced line breaks, paragraphs avoid one-word
  last lines, and page intros are capped at 65 characters a line.
- **polish:** the desktop nav tab had a thick bottom border on a rounded box;
  the current page now shows a short amber bar under its name instead.

Checks: axe-core finds no issues on all 7 pages in both themes; keyboard focus
is still visible; the Impeccable detector reports one finding (the big Home
headline, kept on purpose). The only control under 44px is the 24px checkbox,
whose whole 48px label row is clickable. All 12 tests pass.

## Stage 21: slower animations

- **Feedback:** after turning Windows animation effects back on, the motion
  felt a little fast.
- **Change:** every entrance and state-change animation now takes about 1.5
  times as long (for example a card rising in: 240 to 360 ms; the delivery
  road filling: 300 to 450 ms; the Home routes drawing: 1.1 to 1.5 s), and
  the gaps between staggered pieces grew by the same amount. Hover and press
  reactions on buttons and cards were left quick on purpose.
- **Checked:** all 12 tests pass. Reduced-motion users still get fades only.

## Stage 22: five more animations

Picked from a list of places where motion helps someone understand what just
happened (and a list of places left still on purpose: typing the weight, the
menus, the profile picker, Dashboard data). Shown as a preview video first.

- **Wrong code shakes (Delivery):** the code box shakes side to side for
  0.4 s after a wrong pickup or delivery code (`shake` in `src/lib/motion.js`,
  played with `element.animate()` so it runs again on every wrong try).
- **Price bars fill (Home):** the bars in "What it costs" fill from the left
  when the band scrolls into view; the courier bar first, then RaastaShare
  stopping at half (`useSeenOnce` hook, `clip-path`).
- **Success tick:** a green circle pops in and a check mark draws itself next
  to "Delivered and paid" (only right after the correct code) and "Journey
  posted" (`src/components/SuccessTick.jsx`).
- **"How it works" lights up (Home):** the road starts grey and turns green
  stop by stop, each stop lighting up as the road reaches it; downwards on
  phones.
- **Page fade:** moving between pages, the old page fades out (180 ms, with a
  slight blur) as the new one fades in (260 ms), using a view transition.
- **Design review (emil-design-eng):** the tick and the unlit stops start at
  90% size instead of 60% / 80% ("nothing appears from nothing"); the old page
  leaves faster than the new one arrives and blurs a little so two pages never
  show at once; the shake uses even timing because its shrinking steps already
  slow it down.
- **Less motion:** finished pictures straight away, no shake, the tick fades in,
  pages change at once.
- **Test change:** test 11 counted the Admin list before the page fade ended;
  it now waits until the Admin page is showing. All 12 tests pass.

## Stage 23: records scenario moves to Make.com EU1

- **Problem:** the match email read "Islamabad toLahore, will be carried
  byUsman Tariq. PKR 500 held in Held in escrow." The text lives in the US2
  Make.com scenario, and Make support confirmed the US2 organization belongs
  to another email we can no longer reach.
- **Decision:** rebuild the records scenario (webhook → router → Google Sheets
  row + match email) in the EU1 account, which also holds the AI check, and
  point `VITE_WEBHOOK_URL` at it. The US2 scenario simply stops receiving data.
  The Sheet and the Looker Studio dashboard stay the same.
- **App change:** every record now also carries `emailText`, the finished
  sentence for a match ("Ayesha Khan's 5 kg parcel from Islamabad to Lahore
  will be carried by Bilal Ahmed. PKR 500 is now held in escrow until delivery
  is confirmed."), empty for other events. The Gmail module inserts only this
  one field, so no spaces can go missing between pieces. It is not a Sheet
  column; the 24 Sheet columns are unchanged.
- **Checked:** the sentence is built correctly and is empty for other events;
  all 12 tests pass.

## Stage 24: assumptions in the README

- The nine assumptions listed near the top of this log are now also in the
  README under "Matching rules → Assumptions", and in the proposal updates.
- Two were reworded to match the app as it is now: #5 (both sides accept by
  switching profile with the "Signed in as" picker, added in Stage 17) and #8
  (the admin can also allow or cancel AI-flagged items, added in Stage 18).

## Stage 25: fixes from the stress test, phone, UX and code reviews

Four reviews ran first and changed nothing: a worst-case data stress test
(break-ui: long Pakistani names, an Urdu name, 30 carriers on one route,
0.5 to 199.5 kg parcels, empty / one / 1,000-record states), a phone review
(mobile-native), an Impeccable UX critique (two separate reviewers: 25/40, and
the detector found only the deliberate large Home headline) and a code and
security review. The team chose all four groups of fixes below.

- **Bugs**
  - Journeys that have already departed are no longer offered
    (`isAvailable` in `src/lib/matching.js`); the four rules are unchanged.
  - Only the carrier can enter the pickup and delivery codes; others see
    "Switch to <carrier>".
  - Limits: parcels 0.5 to 200 kg, car or van spare up to 500 kg.
  - A double tap on "Post shipment" posts once.
  - The Request button shows the carrier's full name ("Request Ch." before).
  - Dashboard: "—" instead of "0 ms" / "0%" with no data; parcels above the
    courier price count as no saving, not a negative one.
- **Money and clarity**
  - "Report a problem" opens a short form: choose what went wrong, then
    "Freeze payment and report" (one tap froze the money before). The chosen
    reason is saved.
  - The Delivery tracker names unfinished steps as things to do ("Accept",
    "Pick up", "Deliver", "Pay"); done steps keep "Accepted", "Picked up"...
  - If the parcel check suggested another item type, "Post shipment" asks
    which to use. A note explains the 8-second wait and the keyword fallback.
- **Phone**
  - Link-style buttons get the same hover and press effects as buttons
    (`enabled:` never matched links).
  - Hover colours only with a mouse; no grey tap flash; long-press does not
    select button text; taps answer at once (`touch-action: manipulation`).
  - Safe-area padding (`viewport-fit=cover`) for the tab bar and edges;
    `min-h-dvh`; the status-bar colour follows the light/dark theme.
- **Guidance and ending**
  - A "Next: ..." line on Delivery says who acts next.
  - The sender can withdraw a request before both have accepted (the request
    is removed; no money has moved).
  - The "Delivered and paid" card ends with what each person got.
  - Matches shows the first 5 carriers, then "Show all N".
- **Checked**
  - All 12 tests pass.
  - 19 browser checks of the new behaviour pass.
  - The stress test re-run flags nothing.
  - axe is clean on all pages in both themes.
- **Not changed**
  - Rules, scores, pricing, statuses, design style and sign-in.
- **Left for later**
  - Urdu names inside English sentences (`<bdi>`).
  - Identical-looking picker options.
  - A limit on wrong-code attempts.
  - Rounding prices for odd weights.
- **Make.com: tried and reverted**
  - The security review suggested Value input option = Raw on the Google
    Sheets module, so text starting with "=" could never run as a formula.
  - In testing, Raw stored every value as text ("500" as a word, not a
    number). Looker showed Price as null and left that delivery out of
    Cost saved.
  - Switched back to "User entered", and the team cleared the Sheet; the
    dashboard reads numbers again (1 shipment, 1 match, PKR 500 saved).
  - The formula risk is accepted for the prototype: the Sheet holds only
    fictional demo data. Create a new webhook address after the
    presentation.

## Stage 26: design review with every design skill

Reviews first, no changes: frontend-design, taste-skill, apple-design,
dataviz, design-system, ux-copy and emil-design-eng; the Impeccable critique
and the accessibility checks from Stage 25 were reused. The team chose all of
the following.

- **Dashboard** (dataviz, frontend-design)
  - "Parcels by status" uses each status's badge as its label and colours
    its bar by family: green done, amber waiting, red needs a person.
    Ordered as a parcel moves, then the problem states (all green before).
  - Spare capacity has a bar with the 40–60% target band marked and a
    verdict ("Within the target").
  - Matching time is put in context ("well inside the 1-minute target").
  - New "Recent deliveries": the four newest, each a small road card linking
    to the delivery.
- **One vocabulary** (ux-copy, design-system)
  - "Parcel" on screen ("Post a parcel", "Post parcel", the "Parcel"
    picker). Dashboard metric names stay as in the proposal and Looker.
  - Escrow is explained in plain words on Send and Delivery.
  - Wrong-code messages say what to do next.
  - The Matches intro is shorter.
- **Send page** (apple-design: grouping and inline validation)
  - Each error appears under its own field, with a red border
    (`aria-invalid`, `aria-describedby`); the price box only says "Check
    the field marked in red".
  - The route map uses its full column, with larger city names.
  - The check's suggestion also appears under Item type, with "Use
    Fragile item".
- **Home** (taste-skill: one hard fact)
  - One fact under the intro: "Islamabad to Lahore, 5 kg: PKR 500 instead
    of about PKR 1,000 by courier."
  - A "Best match" card over the map was previewed and removed at the
    team's request; the map stays the only picture.
- **System** (design-system, apple-design, emil-design-eng)
  - Shadow tokens (`--shadow-rest`, `--shadow-lift`) and one `.card-link`
    style: only clickable cards rest on a shadow and lift on hover.
  - `--color-on-hold` replaces a hard-coded colour; the inline easing uses
    `var(--ease-out)`.
  - h1 tracking is -0.01em.
  - Light/dark cross-fades for 300 ms (instant with reduced motion).
- **Checked**
  - All 12 tests pass; 19 browser checks of the Stage 25 fixes pass.
  - axe is clean on all pages in both themes; no page errors.
- **Not changed**
  - Rules, scores, pricing, statuses, sign-in and the brand style.

## Stage 27: the remaining review items

- **Urdu names in sentences.** `isolate()` in `src/lib/format.js` wraps a name
  in invisible Unicode isolate marks (the text form of `<bdi>`), so a
  right-to-left name no longer pulls the full stop or nearby words to the
  wrong side. Used wherever a name sits inside a sentence (Admin, Delivery,
  Carry, Dashboard). Not used inside picker options, which the phone draws
  itself.
- **Pickers that looked alike.** The Matches and Delivery pickers add the
  sender and the date and time, e.g. "Islamabad to Lahore, 1.5 kg, Ayesha
  Khan, 18 Nov, 10:16 am (Disputed)" (`formatShort`).
- **Wrong delivery codes are limited to 3** (`MAX_CODE_TRIES`). The message
  counts down ("1 try left") and the Escrow panel shows "2 of 3". On the third
  wrong code the delivery becomes Disputed with the payment frozen, the reason
  "3 wrong delivery codes were entered" goes to Admin, and a `dispute` record
  is logged. No new statuses.
- **Weights in 0.5 kg steps.** 1.27 kg shows "Use steps of 0.5 kg, for example
  1 or 1.5." under the field, so every price is whole rupees. The pricing
  formula is unchanged.
- **Checked**
  - All 12 tests pass (test 7 now reads "2 tries left").
  - 9 new browser checks pass, and the 19 earlier checks still pass.
  - axe is clean; no page errors.
- README assumptions #11 and #13 updated.

## Stage 28: Dashboard delivery cards

- Each road on "Recent deliveries" matches its status badge and fills as far
  as the parcel has got: about a third awaiting pickup, two thirds in transit,
  full when delivered. A disputed delivery is fully red, so it no longer looks
  like a finished trip.
- The two cards in a row are the same height.
- "1-minute" uses a non-breaking hyphen, so it no longer splits across lines.
- "Total shipments" stays as it is, matching the proposal and Looker.

## Stage 29: package updates

- `npm install` reports 5 "high" warnings. They are all one advisory in
  `picomatch` (slow pattern matching on crafted file patterns), reached only
  through the build tool Vite. None of these packages are in the published
  site, and Vite only reads the project's own files.
- `npm audit fix --force` was not used: it would downgrade Vite 8 to 6.2.7,
  which the Tailwind and React build setup does not support.
- `npm update` applied small patch releases (Vite 8.3.7 to 8.3.8 and others).
  The build works and all 12 tests pass. The warning stays until Vite ships a
  fixed release; run `npm update` again then.

## Stage 30: sample data stays current

- **Problem:** the sample journeys are dated from the day the data was created
  ("tomorrow 8 am"). A day later they had departed, so without pressing
  "Reset demo data" the demo parcel found no carriers.
- **Fix:** `refreshSampleDates` in `src/lib/storage.js` runs when the app
  opens. If the sample was made on an earlier day, sample departures and
  deadlines move forward by whole days, and sample timestamps ("posted 3
  hours ago", "delivered 20 hours ago") move by the exact time that has
  passed. Records the user created keep their real dates. Opening the app
  again the same day changes nothing.
- **Checked**
  - A simulated visit two days later: the demo parcel finds its 3 carriers,
    the flagged parcel is still about 3 hours old, the user's own parcel is
    unchanged.
  - All 12 tests and 19 browser checks pass.
- **Live site check (same day):**
  - The full journey works on desktop and phone with Make blocked.
  - Lighthouse scores 99–100 on performance, accessibility, best practices
    and SEO.

## Stage 31: fixes from the second code review

A review of all code changed since Stage 22 found six issues. All are fixed:

- **The problem form no longer carries over.** It belongs to one delivery
  (`reportingFor` holds that delivery's id). Before, opening it on one
  delivery and switching the picker left it open on the other delivery,
  with the reason still chosen.
- **"Carriers found" stays true.** When the app opens, `settleExpired` in
  `src/lib/storage.js` moves a parcel whose carriers have all left back to
  "Unmatched – Retrying", so the 2-hour admin flag applies to it.
- **Requests on departed journeys expire.** A request still waiting for both
  to accept when the carrier's departure time passes is closed as declined
  (`expired: true`, no money moved). That carrier is not offered again, and
  the parcel goes back to matching. The page says "Request expired", and the
  sync log notes it on this device only (no new Sheet event). Accepting a
  departed journey is also blocked on the Delivery page.
- **Quick navigation no longer cuts a page fade short.** Only the newest view
  transition clears the fade marker.
- **The same-city error marks From as well as To.**
- **Withdrawing a request is recorded in the sync log.** If the carrier had
  already accepted, that carrier is not offered the parcel again.
- **Checked**
  - 9 browser checks of these fixes pass.
  - All 12 tests, 19 earlier checks and the stale-data simulation pass.
  - axe is clean.

## Stage 32: less "generated", more travel (after Hyer)

The team felt the site looked AI-made. Award-winning sites from Adobe's list
were reviewed; Hyer (private aviation, flyhyer.com) was the team's favourite.
From it we took four ideas:

- **City codes.** The luggage-tag codes ISB, RWP, LHE, KHI, PEW, LYP, MUX and
  UET are the short route labels (`CITY_CODES`, `RouteCodes`), large, with the
  full city name small underneath. They are used on Matches, Carry and
  Delivery, the Dashboard delivery cards, the Admin rows and the Home fact
  line. Display only: the matching rules still compare the city names.
- **Parcel pass.** The pickup and delivery codes are shown as a boarding-pass
  style ticket (`ParcelPass`): the trip on green above a tear line, the code
  below. The Home page shows the pass on a phone ("Codes, not phone calls"),
  using the demo parcel and an example code.
- **Fewer cards.** Home's two choices are plain rows between thin lines (no
  icon circles or boxes). The Dashboard metrics sit in one strip divided by
  lines, and its sections are open. Admin lists are divided rows. Clickable
  cards, forms and the Matches carrier cards stay as cards.
- **A smaller palette.** White page, near-black text (#0B1A13), motorway green
  for big blocks and actions, amber only for money held or waiting. The dark
  theme follows the same idea.
- **Checked**
  - All 12 tests, 19 earlier checks and 9 code-review checks pass.
  - axe is clean in both themes; the pass's white-on-green text is 6.6:1
    (light) and 5.3:1 (dark).
- **Not changed:** rules, scores, pricing, statuses and sign-in.

## Stage 33: review of the redesign

A code review and a Playwright CLI walkthrough checked Stage 32. The full
flow (pass at pickup and delivery, Dashboard, Admin, dark mode) worked with
no console errors. The review found five issues, all fixed:

- **Grey panels returned.** With the page now white, panels that used the
  page colour vanished (the accept rows, the "only the carrier" box, the Send
  map backdrop, disabled buttons). They now use `--color-sunk`, a light grey
  in light mode and a deeper shade in dark mode.
- **Tablet Dashboard.** The two metric columns get a dividing line at tablet
  width too.
- **Admin's import** is back with the other imports.
- **Screen readers.** The Home fact line reads "Islamabad to Lahore" instead
  of "ISB right arrow LHE".
- **Home phone pass.** The sample data for it is worked out once, not on
  every redraw.
- **Checked:** all 12 tests, 19 + 9 earlier checks, axe clean, no console
  errors.
