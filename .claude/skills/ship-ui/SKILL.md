---
name: ship-ui
description: Make a RaastaShare UI change the way Ahmad wants it - read DESIGN.md, before/after screenshots on phone and desktop, show him, wait for his OK, then open the pull request.
disable-model-invocation: true
---

# Ship a UI change

Use this for any change people can see in the app. Ahmad is new to coding, so
explain each step in plain words. Plain JavaScript only, no keys in code, and
no extra "future" features beyond what he asked for.

## 1. Read the rules
- Read `DESIGN.md` before touching any UI.
- Work on the session's `claude/...` branch, never on `main`.

## 2. "Before" screenshots
- `npm install` (if `node_modules` is missing), then `npm run build:e2e` and
  `npm run preview` in the background.
- Take screenshots of every screen the change touches, at phone width (390px)
  and desktop width (1440px), at deviceScaleFactor 2.
  `node tests/design-shots.cjs before` covers the main pages; write a small
  Playwright snippet for any other screen.

## 3. Make the change
- Keep it to what was asked.
- The hooks run `npm run test:unit` and `npm run check:design` after each edit
  in `src/`. Fix anything they report before moving on.

## 4. "After" screenshots
- Rebuild (`npm run build:e2e`), restart the preview, and take the same shots
  with `after`.
- For a change that is hard to see, put before and after side by side in one
  image.

## 5. Show Ahmad and wait
- Save the shots and the diff in a new folder under `/mnt/project-files/`
  named after the change (for example `/mnt/project-files/price-label/`).
- Attach them to your reply with a short plain-words note: what changed, and
  what he should look at.
- **Stop here and wait for his go-ahead.** Do not open a pull request or push
  to `main` before he says yes.

## 6. Open the pull request
- After his OK: commit, push the branch, open the PR, and tell him the link.
- If the change needs a SQL step in Supabase, say exactly which file to run and
  where (Supabase > SQL Editor, a new query tab).
- The work is finished when Ahmad says "merger done".
