# RaastaShare design rules

Rules the team has set or confirmed for how RaastaShare looks, reads and
moves. Each has its reason, and a comment with the date and what was said.
Read this before building or changing any UI. `npm run check:design` enforces
the rules marked **(checked)**.

The current look is **"Cargo label"**: kraft paper, label-black print and one
fragile-tape red, with plain industrial type. It replaced the earlier green
style and the old instruction not to change the design style.
<!-- 2026-11-23: redesign brief; team picked option B, "Cargo label" -->

## Color

- **Colour is split 60 / 30 / 10, always with the tokens in `src/index.css`:**
  - 60%: `--color-paper` for the page;
  - 30%: `--color-brand` for the header, buttons and bands;
  - 10%: `--color-hold` red, only for the few things that need attention:
    savings, money held, the current page and focus rings.
  Errors and disputes use `--color-fail` (oxblood), never the accent red.
  Never write a raw hex colour in a component; use a token class or
  `var(--color-…)`. **(checked)**
  Why: the brief asks for "60% main colour, 30% secondary and 10% a colour that
  completely contrasts". The accent only works if it stays rare.
  <!-- 2026-11-23: "For coloring, use a 60-30-10 scheme…" -->

## Surfaces and layout

- **No decorative gradients, no glow shadows, no emoji as icons.** Icons come
  from `src/components/Icons.jsx`. **(checked)**
  Why: these are the clearest signs of an AI-made site.
  <!-- 2026-11-23: "Avoid: purple/blue gradients, glowing cards, emoji icons" -->
- **Layouts are left-aligned.** Do not centre whole sections or pages of text.
  Why: the brief named "everything centred" as an AI tell, and labels and
  signs are read from the left.
  <!-- 2026-11-23: "left-aligned layouts" -->

## Typography

- **Headings use IBM Plex Sans Condensed (`font-display`); everything else uses
  IBM Plex Sans.** Never Inter or a generic system font.
  Why: strong, plain, industrial type, like printing on a shipping label.
  <!-- 2026-11-23: "avoid generic fonts like Inter… strong, plain typography" -->
- **No small ALL-CAPS labels.** Labels and eyebrows are in sentence case.
  **(checked)**
  Why: tiny tracked-out capitals are a well-known sign of an AI-made site.
  <!-- 2026-11-22: "fix A" (the reel's AI-slop list) -->

## Copy

- **No marketing phrases** such as "seamless", "revolutionize", "supercharge",
  "effortless" or "unlock". Say plainly what something does. **(checked)**
  Why: from the brief; marketing phrases make the site read as templated.
  <!-- 2026-11-23: "Avoid… marketing phrases like 'seamless' or 'revolutionize'" -->
- **Any figure we have not measured is labelled "our estimate"** wherever it
  appears: the PKR 1,000 courier price and the "about eight steps" with phone
  calls. This includes slides and the README.
  Why: the site is public, and an unmeasured number shown as a fact could
  mislead.
  <!-- 2026-11-22: "do A, B and C" (legal reel); 2026-11-24: keep "estimate" next to the pain line -->
- **The About page says exactly what the code sends elsewhere** (Make.com and
  the Google Sheet, Gemini, PostHog). A change that adds a tracker, cookie or
  endpoint updates the About page and the README in the same change.
  Why: a false privacy claim on a public site is a real problem, not a detail.
  <!-- 2026-11-24: kept PostHog, asked for the PR that made About accurate -->

## Motion

- **No animation when changing pages, and no scroll-reveal entrances.** Animate
  only what changed while the page is open: a step card when the step changes,
  a badge just after an action. Opening or revisiting a page shows its
  finished state.
  Why: people change pages all the time, so any animation there reads as delay,
  and scroll reveals hold content back.
  <!-- 2026-11-24: "do all removals" (removed the page fade and Home scroll reveals, both added earlier on request) -->
- **UI motion lasts 300ms or less and uses only the `--ease-out` and
  `--ease-in-out` tokens.** Never `ease-in` and never `transition: all`.
  **(checked)** The success tick (`SuccessTick`: journey posted, parcel booked,
  delivery paid) is the one celebration and may run to about 0.6s.
  Why: motion that is short and consistent makes the app feel fast; one
  celebration keeps it special.
  <!-- 2026-11-24: approved the timing findings from the animation audit -->

## Interaction

- **Design and check every change at phone width (390px) first.**
  Why: most users are on phones.
  <!-- 2026-11-24: "as most users are on mobiles" -->
- **Senders and carriers each see only their own pages.** A new page declares
  who it is for in `NAV_ITEMS` (`src/components/Layout.jsx`): `for: 'sender'`,
  `'carrier'`, `'both'` or `'team'`.
  Why: the two roles have different jobs, and mixing their pages confused both.
  <!-- 2026-11-22: "why not make it separate?" then "Let's go with your suggestion" -->
