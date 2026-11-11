// Takes screenshots of the main pages for the design pass.
// Usage: node tests/design-shots.cjs before   (or: after)
// Needs the app running with "npm run preview".
const { chromium } = require('playwright')
const path = require('path')

const APP_URL = process.env.APP_URL || 'http://localhost:4173/'
const label = process.argv[2] || 'after'
const OUT = path.join(__dirname, '..', 'test-screenshots', 'design-pass')

async function main() {
  const browser = await chromium.launch()
  for (const [device, viewport] of [['desktop', { width: 1280, height: 800 }], ['mobile', { width: 390, height: 844 }]]) {
    const page = await (await browser.newContext({ viewport, deviceScaleFactor: 2 })).newPage()
    const shot = (name, fullPage = true) =>
      page.screenshot({ path: path.join(OUT, `${label}-${device}-${name}.png`), fullPage })

    // Fresh sample data for every run.
    await page.goto(APP_URL)
    await page.evaluate(() => localStorage.clear())
    await page.reload()
    await shot('home')

    // Sender page with 2 of 5 checklist lines ticked (shows the counter and disabled button).
    await page.goto(APP_URL + '#/sender')
    const boxes = await page.locator('input[type="checkbox"]').all()
    await boxes[0].check(); await boxes[1].check()
    await shot('sender')

    await page.goto(APP_URL + '#/matches/s-demo')
    await shot('matches')

    // Delivery waiting for pickup (tracker: one step done, one current).
    await page.locator('[data-testid="request-carrier"]').first().click()
    await page.click('[data-testid="accept-sender"]')
    await page.click('[data-testid="accept-carrier"]')
    await shot('delivery')
  }
  await browser.close()
}

main()
