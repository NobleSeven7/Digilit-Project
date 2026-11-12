# RaastaShare – Digital Crowdshipping Platform

Semester project for the Digital Literacy course (Digital Transformation Sandbox).

RaastaShare matches people who need to send a small parcel between cities with
travellers who are already driving that route and have spare space. A sender
posts a parcel, a transparent rule-based engine ranks the carriers that fit,
one-time codes confirm pickup and delivery, and a simulated escrow payment is
released to the carrier only after delivery is confirmed.

Example from our proposal: a 5 kg parcel from Islamabad to Lahore costs
PKR 500 (PKR 200 base + PKR 60 per kg), about half of a PKR 1,000 courier.

## Live links

- **App:** https://nobleseven7.github.io/Digilit-Project/
- **Looker Studio dashboard:** https://datastudio.google.com/reporting/416cf872-9063-463b-a6c6-ff4e7b29649d

The live app sends its records to Make.com, which writes them to Google
Sheets; the dashboard reads that Sheet. The dashboard refreshes about every
15 minutes.

## Team

| Member | Role |
|---|---|
| Erhan Javed Khan | Project & Coordination Lead |
| Muhammed Hisham Ahmed | Business Process & Requirements Analyst |
| Ahmad Abdur Rahman Zahid Bhatti | Digital Tools & Prototype Lead |
| Mohid Zafar Khan | Data, Ethics & Presentation Lead |

## How to run it

You need [Node.js](https://nodejs.org) installed (version 20 or newer).

1. Open a terminal in this folder.
2. Download the packages the app needs (only the first time):
   ```bash
   npm install
   ```
3. Start the app:
   ```bash
   npm run dev
   ```
4. Open the address it prints (usually http://localhost:5173) in your browser.
5. To stop the app, press `Ctrl + C` in the terminal.

### Optional: connect Make.com

The app works fully offline. To also send records to Make.com (which writes
them to Google Sheets and sends the email alerts):

1. Copy `.env.example` and rename the copy to `.env.local`.
2. Paste your webhook URL after `VITE_WEBHOOK_URL=`.
3. Stop and restart `npm run dev`.

`.env.local` is listed in `.gitignore`, so the webhook URL is never uploaded.

### Optional: connect the live site to Make.com

The live GitHub Pages site gets the webhook URL from a repository secret:

1. On GitHub, open the repository's **Settings → Secrets and variables → Actions**.
2. Click **New repository secret**, name it `VITE_WEBHOOK_URL`, paste the
   webhook URL as the value, and click **Add secret**.
3. Open the **Actions** tab, choose **Deploy to GitHub Pages**, and click
   **Run workflow** (or push any change to `main`).

The URL is never stored in the code, but it is built into the public website,
so anyone who inspects the site could find it and send rows to the Sheet. If
that happens, create a new webhook in Make.com and update the secret.
The app sends one JSON record per event, with an `event` field of `shipment`,
`journey`, `match`, `delivery` or `dispute`. The Admin page has a sync log that
shows what was sent.

## Pages

| Page | What it does |
|---|---|
| Home | Choose a Sender or Carrier profile |
| Send | Post a shipment, including the prohibited-items checklist |
| Carry | Post a journey with vehicle type and spare capacity |
| Matches | Ranked carriers, with a pass or fail for each of the four rules |
| Delivery | Accept the match, pickup code, delivery code, escrow release |
| Admin | Flagged, unmatched and disputed requests for human review |
| Dashboard | Total shipments, matches, average matching time, cost saved |

The app has a light and a dark theme. It follows your device's setting, and
the sun / moon button in the header switches between them.

## Matching rules

A carrier must pass all four rules: **route** (same origin and destination),
**timing** (departs before the deadline), **capacity** (spare kg ≥ parcel kg)
and **compatibility** (the item type is allowed on the vehicle type).

Carriers that pass are ranked by a score out of 100:

- Time buffer: 50 points if departure is at least 6 hours before the deadline, otherwise 25.
- Capacity fit: 50 × (parcel kg ÷ carrier spare kg).

## Real vs. simulated

| Element | Status | Details |
|---|---|---|
| User interface and forms | Real | Working React web app |
| Matching engine | Real | Rule filter and score in `src/lib/matching.js` |
| Data storage | Real, local | Saved in the browser's localStorage so the demo works offline |
| Make.com / Google Sheets / email | Real when connected | The app posts to the webhook URL in `.env.local`; the Make.com scenario and Sheet are set up separately |
| Looker Studio dashboard | Real | Reads the Google Sheet (link above); the in-app Dashboard shows the same metrics from this device's data |
| User accounts | Simulated | Pre-loaded demo profiles instead of a login |
| OTP codes | Simulated | Random 4-digit codes shown on screen instead of SMS |
| Payment | Simulated | Escrow is a status tracked in the app; no real money or wallet |
| Test data | Simulated | Fictional senders and carriers; no real personal data |

Not built (listed as future work in the proposal): maps, real login and ID
checks, real SMS, real payments, live tracking, Urdu interface.

## Testing

The 8 test cases from the proposal are automated in `tests/run-tests.cjs`.
The script opens the app in a real browser, clicks through it and saves a
screenshot of each result in `test-screenshots/`.

To run them yourself, install the browser tool once:

```bash
npm install --save-dev playwright
```

```bash
npx playwright install chromium
```

Then, in one terminal, build and serve the app:

```bash
npm run build
```

```bash
npm run preview
```

and in a second terminal:

```bash
npm run test:e2e
```

## Project structure

```
src/
  main.jsx         starts React
  App.jsx          holds the data and switches pages
  index.css        Tailwind and the brand colours
  data/            constants (cities, vehicles, prices) and sample data
  lib/             matching, pricing, storage, webhook, OTP, helpers
  components/      Layout, RouteLine, RuleCheck, StatusBadge, PageHeader
  pages/           Home, Sender, Carrier, Matches, Delivery, Admin, Dashboard
tests/             browser tests for the 8 proposal test cases
test-screenshots/  screenshot of each test result
BUILD_LOG.md       what was built, which decisions came from the proposal, errors fixed
```

## AI-use note

The code for this prototype was generated with Claude (Anthropic), using
Claude Code, from the team's own design: the problem choice, matching rules,
score formula, compatibility table, pricing model and test plan all come from
our proposal. The team runs and checks the app against the proposal's test
plan. See `BUILD_LOG.md` for the record of what was built and which
assumptions were added.
