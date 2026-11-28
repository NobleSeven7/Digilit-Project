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
  Something that is only waiting (not done yet, nothing wrong) uses plain
  paper with a dashed outline, like a button that is not ready, never pink.
  <!-- 2026-11-27: "Run all the fixes" (UX review fix 2) -->
  Never write a raw hex colour in a component; use a token class or
  `var(--color-…)`. **(checked)**
- **Colour tokens come in three layers** in `src/index.css`: primitive (the
  raw colours, e.g. `--kraft-200`, `--tape-500`), semantic (`--color-paper`,
  `--color-hold`…, the only layer dark mode changes) and component
  (`--btn-primary-bg`, `--card-border`…). Pages use the semantic layer;
  `.btn`, `.card`, `.field` and the focus ring use the component layer.
  Why: one place to change a colour, and dark mode stays one short list.
  <!-- 2026-11-27: redesign brief, phase 2 ("run all the fixes") -->
- **A button never wraps a long person's name.** Names over 20 characters
  become the role on the button ("Request this carrier", "Switch to the
  sender"); the full name is always shown beside it. Names are at most 60
  characters (sign-up form and `database/04-name-limit.sql`).
  Why: the stress test showed 3-line buttons on phones.
  <!-- 2026-11-27: redesign brief, phase 2 ("run all the fixes") -->
  Why: the brief asks for "60% main colour, 30% secondary and 10% a colour that
  completely contrasts". The accent only works if it stays rare.
  <!-- 2026-11-23: "For coloring, use a 60-30-10 scheme…" -->

## Surfaces and layout

- **No decorative gradients, no glow shadows, no emoji as icons.** Icons come
  from `src/components/Icons.jsx`. **(checked)**
  Why: these are the clearest signs of an AI-made site.
  <!-- 2026-11-23: "Avoid: purple/blue gradients, glowing cards, emoji icons" -->
- **Two corner sizes, both nearly square:** `rounded-control` (3px) for
  buttons, fields, chips and badges, and `rounded-surface` (4px) for cards,
  bands and the parcel pass. Badges are square stamps, not round pills.
  `rounded-full` is only for things that really are round: dots, ticks and
  bars. Tailwind's own sizes (`rounded-lg`, `rounded-2xl`…) are switched off.
  **(checked)**
  Why: four names for two sizes, plus pill badges and a 44px phone frame,
  made the corners look random and templated.
  <!-- 2026-11-28: AI-slop audit, "Go ahead with all" -->
- **Screens are shown flat**, on a card with an ink outline and no shadow,
  not inside a rounded phone frame. The only soft shadow is `--shadow-rest`
  on cards you can click (and the parcel pass's own edge shadow).
  Why: device mockups with big soft shadows are a stock template look.
  <!-- 2026-11-28: AI-slop audit, "Go ahead with all" -->
- **On desktop (1024px and up) the Home map takes at least half the hero
  width.** If the headline needs room, make the headline smaller; never shrink
  the map to fit the text.
  Why: the map is the page's main picture.
  <!-- 2026-11-27: "Could you increase the size of the map a little bit?", then confirmed the rule and reason -->
- **Layouts are left-aligned.** Do not centre whole sections or pages of text.
  Why: the brief named "everything centred" as an AI tell, and labels and
  signs are read from the left.
  <!-- 2026-11-23: "left-aligned layouts" -->

## Typography

- **Headings use IBM Plex Sans Condensed (`font-display`); everything else uses
  IBM Plex Sans.** Never Inter or a generic system font.
  `font-sans` is mapped to IBM Plex Sans, so it can never bring back the
  system font.
  Why: strong, plain, industrial type, like printing on a shipping label.
  <!-- 2026-11-23: "avoid generic fonts like Inter… strong, plain typography" -->
- **Small labels are "stamped": the condensed face at 600 (`stamp` in
  `src/index.css`).** Form labels, status badges, rule chips, tab names and
  "Best match" use it. Body text stays in the plain face, and bold is kept for
  names, money and buttons.
  Why: almost everything was bold, so nothing stood out. Of three versions
  (quiet labels, stamped labels, bold for actions only), stamped kept the
  labels strong and reads most like a shipping label, with no new font.
  <!-- 2026-11-27: design pass, finding 2, "do stamped labels" -->
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
- **Motion lengths come from the duration tokens** in `src/index.css`
  (`--dur-press` 100ms, `--dur-quick` 150ms, `--dur-short` 200ms, `--dur-base`
  250ms, `--dur-long` 300ms), and motion played from JavaScript (the
  wrong-code shake) follows the same limits and curves. **(checked)**
  Why: lengths typed by hand had drifted to seven different values, and the
  shake (400ms, `linear`) and the theme fade (plain `ease`) broke the rules
  without the check noticing.
  <!-- 2026-11-27: design pass, "do all the fixes you mentioned" (findings 3, 4, 6) -->
- **The Matches wave plays only right after posting a parcel.** Opening
  Matches any other way shows the ranked carriers in place.
  Why: it played the first time any parcel was opened in a tab, which made it
  a page entrance.
  <!-- 2026-11-27: design pass, finding 13 -->
- **Named exceptions to the 300ms limit.** Only these may run longer. The
  check lists them in `LONG_MOTION_ALLOWED` (`scripts/check-design.cjs`), and
  a new one is added in both places, with its reason:
  - the success tick and the delivery tracker's "Paid" stop settling (the
    one celebration);
  - the Home intro, once per visit: the hero, the route drawing, the city
    stops and the parcel's ride. Below 1024px wide the map sits under the
    first screen, so its parts (route, stops, ride) show finished and only the
    hero rises in;
    <!-- 2026-11-27: design pass, finding 12 (the map intro ended before anyone scrolled to it) -->
  - Home's price bars and departure-board code, once per visit;
  - Home photos fading in once they have loaded;
  - the bar that shows the AI check's 8-second wait (a timer, not an effect).
  Why: the 300ms rule was written without them, so the check could not
  enforce it, and a 350ms delivery road went unnoticed until 25 November.
  <!-- 2026-11-25: "do 1, 2 and 3" (name the exceptions, check durations) -->

## Interaction

- **Design and check every change at phone width (390px) first.**
  Why: most users are on phones.
  <!-- 2026-11-24: "as most users are on mobiles" -->
- **Senders and carriers each see only their own pages.** A new page declares
  who it is for in `NAV_ITEMS` (`src/components/Layout.jsx`): `for: 'sender'`,
  `'carrier'`, `'both'` or `'team'`.
  Why: the two roles have different jobs, and mixing their pages confused both.
  <!-- 2026-11-22: "why not make it separate?" then "Let's go with your suggestion" -->
