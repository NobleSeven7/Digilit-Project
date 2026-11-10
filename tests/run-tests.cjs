// Browser tests for the 8 test cases in the project proposal.
// The script opens the app in a real (headless) Chromium browser, clicks
// through it like a user, checks the result and saves a screenshot of each
// case in the test-screenshots folder.
//
// How to run:  1) npm run build   2) npm run preview   3) npm run test:e2e
const { chromium } = require('playwright')
const path = require('path')

const APP_URL = process.env.APP_URL || 'http://localhost:4173/'
const SHOTS = path.join(__dirname, '..', 'test-screenshots')
const results = []

// Start every test from the fresh sample data.
async function resetApp(page) {
  await page.goto(APP_URL)
  await page.evaluate(() => localStorage.clear())
  await page.reload()
}

// Fill in the Sender form and post a shipment (Islamabad -> Lahore by default).
async function postShipment(page, { weight = '5', itemType = 'Small parcel' } = {}) {
  await page.goto(APP_URL + '#/sender')
  await page.fill('#weightKg', weight)
  await page.selectOption('#itemType', itemType)
  for (const box of await page.locator('input[type="checkbox"]').all()) await box.check()
  await page.click('[data-testid="post-shipment"]')
  await page.waitForSelector('[data-testid="shipment-summary"]')
}

// The result card of one carrier on the Matches page.
const card = (page, name) => page.locator(`[data-testid="carrier-card"][data-carrier="${name}"]`)

// Which rules a carrier failed, e.g. ['route'].
async function failedRules(page, name) {
  return card(page, name).locator('[data-pass="false"]').evaluateAll(
    (rows) => rows.map((row) => row.dataset.rule))
}

// Request the best carrier and get both sides to accept.
async function startDelivery(page) {
  await postShipment(page)
  await page.locator('[data-testid="request-carrier"]').first().click()
  await page.click('[data-testid="accept-sender"]')
  await page.click('[data-testid="accept-carrier"]')
  await page.waitForSelector('[data-testid="step-pickup"]')
}

// Enter the correct pickup code so the parcel is "In transit".
async function confirmPickup(page) {
  const code = await page.textContent('[data-testid="pickup-otp"]')
  await page.fill('#pickup-code', code)
  await page.click('[data-testid="pickup-code-submit"]')
  await page.waitForSelector('[data-testid="step-delivery"]')
}

function check(condition, description) {
  if (!condition) throw new Error(description)
}

// Run one test case and record PASS or FAIL.
async function runTest(page, number, name, expected, body) {
  try {
    await resetApp(page)
    const actual = await body()
    results.push({ number, name, expected, actual, pass: true })
  } catch (error) {
    await page.screenshot({ path: path.join(SHOTS, `test-${number}-FAILED.png`) }).catch(() => {})
    results.push({ number, name, expected, actual: error.message.split('\n')[0], pass: false })
  }
}

async function main() {
  const browser = await chromium.launch()
  const context = await browser.newContext({
    viewport: { width: 1100, height: 800 }, deviceScaleFactor: 2,
  })
  const page = await context.newPage()
  const shot = (file, target = page, options = {}) =>
    target.screenshot({ path: path.join(SHOTS, file), ...options })

  await runTest(page, 1, '5 kg small parcel, Islamabad to Lahore, deadline after carrier departure',
    'Match found and ranked', async () => {
      await postShipment(page)
      const eligible = page.locator('[data-testid="carrier-card"][data-eligible="true"]')
      const count = await eligible.count()
      check(count >= 1, 'No eligible carrier was shown')
      const first = await eligible.first().getAttribute('data-carrier')
      const score = (await eligible.first().locator('[data-testid="score"]').textContent()).trim()
      check((await eligible.first().textContent()).includes('Best match'), 'Top carrier is not marked Best match')
      await shot('test-1-match-found-and-ranked.png', page, { fullPage: true })
      return `${count} carriers matched; best match ${first}, score ${score}`
    })

  await runTest(page, 2, 'Carrier travelling Islamabad to Karachi', 'Rejected (route)', async () => {
    await postShipment(page)
    const failed = await failedRules(page, 'Hamza Sheikh')
    check(await card(page, 'Hamza Sheikh').getAttribute('data-eligible') === 'false', 'Carrier was not rejected')
    check(failed.includes('route'), `Route rule did not fail (failed: ${failed.join(', ') || 'none'})`)
    await shot('test-2-rejected-route.png', card(page, 'Hamza Sheikh'))
    return `Hamza Sheikh rejected; failed rule: ${failed.join(', ')}`
  })

  await runTest(page, 3, "Carrier departs after sender's deadline", 'Rejected (timing)', async () => {
    await postShipment(page)
    const failed = await failedRules(page, 'Nida Raza')
    check(await card(page, 'Nida Raza').getAttribute('data-eligible') === 'false', 'Carrier was not rejected')
    check(failed.includes('timing'), `Timing rule did not fail (failed: ${failed.join(', ') || 'none'})`)
    await shot('test-3-rejected-timing.png', card(page, 'Nida Raza'))
    return `Nida Raza rejected; failed rule: ${failed.join(', ')}`
  })

  await runTest(page, 4, '20 kg package, carrier has 10 kg spare', 'Rejected (capacity)', async () => {
    await postShipment(page, { weight: '20' })
    const failed = await failedRules(page, 'Bilal Ahmed')
    check(await card(page, 'Bilal Ahmed').getAttribute('data-eligible') === 'false', 'Carrier was not rejected')
    check(failed.includes('capacity'), `Capacity rule did not fail (failed: ${failed.join(', ') || 'none'})`)
    await shot('test-4-rejected-capacity.png', card(page, 'Bilal Ahmed'))
    return `Bilal Ahmed (10 kg spare) rejected; failed rule: ${failed.join(', ')}`
  })

  await runTest(page, 5, 'Fragile item offered to a motorbike carrier', 'Rejected (compatibility)', async () => {
    await postShipment(page, { itemType: 'Fragile item' })
    const failed = await failedRules(page, 'Usman Tariq')
    check(await card(page, 'Usman Tariq').getAttribute('data-eligible') === 'false', 'Carrier was not rejected')
    check(failed.includes('compatibility'), `Compatibility rule did not fail (failed: ${failed.join(', ') || 'none'})`)
    await shot('test-5-rejected-compatibility.png', card(page, 'Usman Tariq'))
    return `Usman Tariq (motorbike) rejected; failed rule: ${failed.join(', ')}`
  })

  await runTest(page, 6, 'Two carriers pass all rules', 'Higher score shown first', async () => {
    await postShipment(page)
    const eligible = page.locator('[data-testid="carrier-card"][data-eligible="true"]')
    const names = await eligible.evaluateAll((cards) => cards.map((c) => c.dataset.carrier))
    const scores = await eligible.locator('[data-testid="score"]').evaluateAll(
      (els) => els.map((el) => parseInt(el.textContent, 10)))
    check(scores.length >= 2, 'Fewer than two carriers passed all rules')
    for (let i = 1; i < scores.length; i++) {
      check(scores[i - 1] >= scores[i], `Scores are not in descending order: ${scores.join(', ')}`)
    }
    await page.locator('[data-testid="eligible-heading"]').scrollIntoViewIfNeeded()
    await shot('test-6-higher-score-first.png', page, { fullPage: true })
    return `Order shown: ${names.map((n, i) => `${n} (${scores[i]})`).join(', ')}`
  })

  await runTest(page, 7, 'Wrong delivery OTP entered', 'Payment stays in escrow', async () => {
    await startDelivery(page)
    await confirmPickup(page)
    const real = await page.textContent('[data-testid="delivery-otp"]')
    const wrong = real === '0000' ? '1111' : '0000'
    await page.fill('#delivery-code', wrong)
    await page.click('[data-testid="delivery-code-submit"]')
    const message = await page.textContent('[data-testid="delivery-message"]')
    const escrow = (await page.textContent('[data-testid="escrow-status"]')).trim()
    check(escrow === 'Held in escrow', `Escrow status is "${escrow}"`)
    check(await page.locator('[data-testid="step-delivery"]').isVisible(), 'Delivery step is no longer open')
    await shot('test-7-wrong-otp-stays-in-escrow.png')
    return `"${message}" Escrow: ${escrow}`
  })

  await runTest(page, 8, 'Correct delivery OTP entered', 'PKR 500 released; row added to Google Sheets', async () => {
    await startDelivery(page)
    await confirmPickup(page)
    await page.fill('#delivery-code', await page.textContent('[data-testid="delivery-otp"]'))
    await page.click('[data-testid="delivery-code-submit"]')
    await page.waitForSelector('[data-testid="step-done"]')
    const message = await page.textContent('[data-testid="delivery-message"]')
    const escrow = (await page.textContent('[data-testid="escrow-status"]')).trim()
    check(message.includes('PKR 500 released'), `Message was "${message}"`)
    check(escrow === 'Released to carrier', `Escrow status is "${escrow}"`)
    await shot('test-8-correct-otp-payment-released.png')

    // The delivery record must be handed to the webhook sender (see the sync log).
    await page.goto(APP_URL + '#/admin')
    const row = page.locator('[data-testid="sync-log"] li[data-event="delivery"]').first()
    await row.waitFor()
    const logText = (await row.textContent()).replace(/\s+/g, ' ').trim()
    await page.locator('[data-testid="sync-log"]').scrollIntoViewIfNeeded()
    await shot('test-8b-delivery-record-in-sync-log.png')
    return `"${message}" Escrow: ${escrow}. Sync log: ${logText}`
  })

  await browser.close()

  // Print the results table.
  console.log('\nRaastaShare - proposal test cases\n')
  for (const r of results) {
    console.log(`${r.pass ? 'PASS' : 'FAIL'}  Test ${r.number}: ${r.name}`)
    console.log(`      Expected: ${r.expected}`)
    console.log(`      Actual:   ${r.actual}\n`)
  }
  const failed = results.filter((r) => !r.pass).length
  console.log(`${results.length - failed} of ${results.length} passed`)
  process.exit(failed ? 1 : 0)
}

main()
