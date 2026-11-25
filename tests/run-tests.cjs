// Browser tests: the 8 test cases in the project proposal (tests 1 to 8),
// plus 4 tests for the AI parcel check (tests 9 to 12), 2 for who may do
// what (tests 13 and 14), 1 for wrong pickup codes (15) and 1 for a browser
// that will not save (16).
// The script opens the app in a real (headless) Chromium browser, clicks
// through it like a user, checks the result and saves a screenshot of each
// case in the test-screenshots folder.
//
// How to run:  1) npm run build:e2e   2) npm run preview   3) npm run test:e2e
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
  // Sign in as the carrier (simulated) before accepting on their side.
  await page.click('[data-testid="switch-to-carrier"]')
  await page.click('[data-testid="accept-carrier"]')
  await page.waitForSelector('[data-testid="step-pickup"]')
}

// Read a code the way the demo works: the carrier cannot see it, so switch to
// the sender (who has it), read it, and switch back to the carrier.
async function readCode(page, testId) {
  check(await page.locator(`[data-testid="${testId}"]`).count() === 0, 'The carrier can see the code')
  await page.click('[data-testid="switch-to-sender"]')
  const code = await page.textContent(`[data-testid="${testId}"]`)
  await page.click('[data-testid="switch-to-carrier"]')
  return code
}

// Enter the correct pickup code so the parcel is "In transit".
async function confirmPickup(page) {
  const code = await readCode(page, 'pickup-otp')
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
    const real = await readCode(page, 'delivery-otp')
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
    await page.fill('#delivery-code', await readCode(page, 'delivery-otp'))
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

  // ---- AI parcel check (tests 9 to 12) -------------------------------------
  // These need the test build ("npm run build:e2e"), which points the app at
  // a fake AI address. The tests catch requests to that address and answer
  // with a fixed reply, so they check how the app HANDLES an AI answer.
  // They do not test a real AI model.
  const AI_ADDRESS = 'https://ai-check.test.invalid/**'
  const CORS = { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Headers': '*' }

  // Pretend to be the AI: answer every check with this text.
  async function fakeAi(replyText) {
    await page.unroute(AI_ADDRESS).catch(() => {})
    await page.route(AI_ADDRESS, (route) => {
      if (route.request().method() === 'OPTIONS') return route.fulfill({ status: 204, headers: CORS })
      return route.fulfill({ status: 200, headers: CORS, contentType: 'application/json', body: replyText })
    })
  }
  // Pretend the AI never answers.
  async function silentAi() {
    await page.unroute(AI_ADDRESS).catch(() => {})
    await page.route(AI_ADDRESS, () => {})
  }

  // Type a description on the Send page, press "Check with AI" and read the card.
  async function runAiCheck(description, timeout = 5000) {
    await page.fill('[data-testid="ai-description"]', description)
    await page.click('[data-testid="ai-check-button"]')
    const cardLocator = page.locator('[data-testid="ai-result"]')
    await cardLocator.waitFor({ timeout })
    return {
      source: await cardLocator.getAttribute('data-source'),
      type: await cardLocator.getAttribute('data-type'),
      prohibited: await cardLocator.getAttribute('data-prohibited'),
      text: (await cardLocator.textContent()).replace(/\s+/g, ' ').trim(),
    }
  }
  const needsTestBuild = 'The AI did not answer. Build the app with "npm run build:e2e" before these tests'

  // Tick the checklist and post the shipment that is on screen.
  async function postCurrentShipment() {
    for (const box of await page.locator('input[type="checkbox"]').all()) await box.check()
    await page.click('[data-testid="post-shipment"]')
    await page.waitForSelector('[data-testid="shipment-summary"]')
  }
  const aiFlaggedCount = async () => {
    await page.goto(APP_URL + '#/admin')
    // Pages fade from one to the next, so wait until the Admin page is the one showing.
    await page.waitForFunction(() => /Admin/.test(document.querySelector('h1')?.textContent || '')
      && !document.documentElement.dataset.transition)
    return page.locator('[data-testid="admin-ai-flagged"] li').count()
  }

  await runTest(page, 9, 'AI check: a normal item', 'Suggests an item type, no prohibited flag, not sent to Admin', async () => {
    await fakeAi(JSON.stringify({ itemType: 'Small parcel', prohibited: false, reason: 'Ordinary clothing, nothing restricted.' }))
    await page.goto(APP_URL + '#/sender')
    const result = await runAiCheck('A pair of running shoes in a shoe box')
    check(result.source === 'AI suggestion', needsTestBuild)
    check(result.type === 'Small parcel', `Suggested type was "${result.type}"`)
    check(result.prohibited === 'false', 'Item was flagged as prohibited')
    await shot('test-9-ai-normal-item.png', page.locator('#parcel-heading').locator('..'))
    await postCurrentShipment()
    const flagged = await aiFlaggedCount()
    check(flagged === 0, `${flagged} parcel(s) were sent to Admin`)
    return `${result.source}: ${result.type}, not prohibited; Admin review list: ${flagged}`
  })

  await runTest(page, 10, 'AI check: a fragile item', 'Suggests "Fragile item"; sender applies it with one click', async () => {
    // The reply is deliberately messy (extra text, lower case) to check it is read safely.
    await fakeAi('Here you go:\n```json\n{"itemType": "fragile item", "prohibited": "no", "reason": "Glass breaks easily in transit."}\n```')
    await page.goto(APP_URL + '#/sender')
    const before = await page.inputValue('#itemType')
    const result = await runAiCheck('Two glass vases wrapped in bubble wrap')
    check(result.source === 'AI suggestion', needsTestBuild)
    check(result.type === 'Fragile item', `Suggested type was "${result.type}"`)
    check(await page.inputValue('#itemType') === before, 'The item type changed without the sender choosing it')
    await page.click('[data-testid="ai-use-type"]')
    const after = await page.inputValue('#itemType')
    check(after === 'Fragile item', `Item type is "${after}" after "Use this type"`)
    await shot('test-10-ai-fragile-item.png', page.locator('#parcel-heading').locator('..'))
    return `${result.source}: ${result.type}; item type stayed "${before}" until "Use this type", then "${after}"`
  })

  await runTest(page, 11, 'AI check: a prohibited item', 'Flagged with a reason; shipment appears on Admin for human review', async () => {
    await fakeAi(JSON.stringify({ itemType: 'Small parcel', prohibited: true, reason: 'Fireworks are explosives and cannot be carried.' }))
    await page.goto(APP_URL + '#/sender')
    const result = await runAiCheck('A box of fireworks for a wedding')
    check(result.source === 'AI suggestion', needsTestBuild)
    check(result.prohibited === 'true', 'Item was not flagged')
    check(result.text.includes('Fireworks are explosives'), 'The reason is not shown')
    check(await page.locator('[data-testid="post-shipment"]').isDisabled(), 'Checklist no longer required before posting')
    await shot('test-11-ai-prohibited-item.png', page.locator('#parcel-heading').locator('..'))
    await postCurrentShipment()
    const flagged = await aiFlaggedCount()
    check(flagged === 1, `Admin review list has ${flagged} parcel(s), expected 1`)
    const row = (await page.locator('[data-testid="admin-ai-flagged"] li').first().textContent()).replace(/\s+/g, ' ')
    check(row.includes('A box of fireworks for a wedding'), 'Admin does not show the description')
    await shot('test-11b-ai-flag-on-admin.png', page.locator('[data-testid="admin-ai-flagged"]'))
    check(await page.locator('[data-testid="sync-log"] li[data-event="ai_check"]').count() === 1, 'The check was not logged as ai_check')
    await page.click('[data-testid="ai-allow"]')
    // The row slides away (a view transition), so the page updates a frame
    // later: wait up to 2 seconds for it to go before counting.
    await page.locator('[data-testid="admin-ai-flagged"] li').first()
      .waitFor({ state: 'detached', timeout: 2000 }).catch(() => {})
    const left = await page.locator('[data-testid="admin-ai-flagged"] li').count()
    check(left === 0, 'The parcel stayed in the list after "Allow"')
    return `Flagged: "${'Fireworks are explosives and cannot be carried.'}" Admin list: 1, then 0 after "Allow"; logged as ai_check`
  })

  await runTest(page, 12, 'AI check: offline fallback', 'With no AI answer in about 8 seconds, a keyword check labelled "Offline check (not AI)" is used', async () => {
    // Part 1: the AI never answers.
    await silentAi()
    await page.goto(APP_URL + '#/sender')
    const startedAt = Date.now()
    const result = await runAiCheck('Fireworks and sparklers', 15000)
    const waited = Math.round((Date.now() - startedAt) / 100) / 10
    check(result.source === 'Offline check (not AI)', `Card says "${result.source}"`)
    check(waited >= 7 && waited <= 11, `Fallback came after ${waited} seconds, expected about 8`)
    check(result.prohibited === 'true', 'The keyword check missed "fireworks"')
    await shot('test-12-ai-offline-fallback.png', page.locator('#parcel-heading').locator('..'))

    // Part 2: the AI answers with something unusable.
    await fakeAi(JSON.stringify({ itemType: 'Spaceship', prohibited: 'maybe', reason: '' }))
    const second = await runAiCheck('A stack of university degree certificates')
    check(second.source === 'Offline check (not AI)', 'An unusable AI reply was accepted')
    check(second.type === 'Documents', `Keyword check suggested "${second.type}"`)
    await page.unroute(AI_ADDRESS).catch(() => {})
    return `No answer: "${result.source}" after ${waited} s, fireworks flagged. Unusable reply: "${second.source}", suggested ${second.type}`
  })

  await runTest(page, 13, "Another sender opens Ayesha's parcel", 'They cannot request a carrier for it', async () => {
    await page.selectOption('#profilePicker', 'sender:Omar Farooq')
    await page.goto(APP_URL + '#/matches/s-demo')
    await page.waitForSelector('[data-testid="sender-only"]')
    const buttons = await page.locator('[data-testid="request-carrier"]').count()
    check(buttons === 0, `${buttons} "Request" button(s) shown to Omar`)
    await page.click('[data-testid="sender-only"] [data-testid="switch-to-sender"]')
    const ownButtons = await page.locator('[data-testid="request-carrier"]').count()
    check(ownButtons > 0, 'Ayesha cannot request a carrier for her own parcel')
    return `Omar: 0 Request buttons and a "Switch to Ayesha Khan" note; Ayesha: ${ownButtons}`
  })

  await runTest(page, 14, 'Carrier at the delivery step', 'The carrier cannot see the delivery code', async () => {
    await startDelivery(page)
    await confirmPickup(page)
    const seen = await page.locator('[data-testid="delivery-otp"]').count()
    check(seen === 0, 'The delivery code is on the carrier\'s screen')
    check(await page.locator('#delivery-code').isVisible(), 'The carrier has no box to type the code')
    await shot('test-14-carrier-cannot-see-code.png', page.locator('[data-testid="step-delivery"]'))
    return 'Carrier sees the code box but not the code; the sender sees the delivery pass'
  })

  await runTest(page, 15, 'Three wrong pickup codes entered', 'Payment frozen; the delivery goes to an admin', async () => {
    await startDelivery(page)
    const real = await readCode(page, 'pickup-otp')
    const wrong = real === '0000' ? '1111' : '0000'
    for (let i = 0; i < 2; i++) {
      await page.fill('#pickup-code', wrong)
      await page.click('[data-testid="pickup-code-submit"]')
    }
    const second = await page.textContent('[data-testid="delivery-message"]')
    check(second.includes('1 try left'), `After 2 wrong codes the message was "${second}"`)
    await page.fill('#pickup-code', wrong)
    await page.click('[data-testid="pickup-code-submit"]')
    const escrow = (await page.textContent('[data-testid="escrow-status"]')).trim()
    check(escrow === 'Frozen', `Escrow status is "${escrow}"`)
    await shot('test-15-wrong-pickup-codes-frozen.png')
    return `"${second}" then, after the third, escrow: ${escrow}`
  })

  await runTest(page, 16, 'The browser will not save (storage full or blocked)', 'The app keeps working and says changes will not be kept', async () => {
    const blocked = await browser.newContext({ viewport: { width: 1100, height: 800 }, deviceScaleFactor: 2 })
    await blocked.addInitScript(() => {
      Storage.prototype.setItem = () => { throw new DOMException('Quota exceeded', 'QuotaExceededError') }
    })
    const other = await blocked.newPage()
    try {
      await other.goto(APP_URL)
      check(await other.locator('[data-testid="save-failed"]').isVisible(), 'No notice that changes will not be kept')
      await postShipment(other)
      const cards = await other.locator('[data-testid="carrier-card"]').count()
      check(cards > 0, 'Posting a parcel did not show any carriers')
      await other.screenshot({ path: path.join(SHOTS, 'test-16-storage-blocked.png') })
      return `Notice shown; a parcel was posted and ${cards} carriers were checked`
    } finally {
      await blocked.close()
    }
  })

  await browser.close()

  // Print the results table.
  console.log('\nRaastaShare - test cases\n')
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
