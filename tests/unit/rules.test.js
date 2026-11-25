// Quick tests of the rules and money logic, without a browser.
// They run in about a second with Node's built-in test runner (no library):
//   npm run test:unit
// The browser tests (npm run test:e2e) still check the pages themselves.
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { evaluateCarrier, findMatches, withSpaceLeft, anotherCarrierFits, calculateScore } from '../../src/lib/matching.js'
import { calculatePrice, calculateSaving } from '../../src/lib/pricing.js'
import { DELIVERY, STATUS } from '../../src/data/constants.js'

// storage.js writes notes to localStorage; Node has none, so give it a tiny one.
globalThis.localStorage = {
  data: {},
  getItem(key) { return this.data[key] ?? null },
  setItem(key, value) { this.data[key] = String(value) },
  removeItem(key) { delete this.data[key] },
}
const { settleExpired } = await import('../../src/lib/storage.js')

const HOUR = 60 * 60 * 1000
const inHours = (h) => new Date(Date.now() + h * HOUR).toISOString().slice(0, 16)

// A 5 kg small parcel, Islamabad to Lahore, due in 30 hours.
const parcel = (changes = {}) => ({
  id: 's1', senderName: 'Ayesha Khan', origin: 'Islamabad', destination: 'Lahore',
  weightKg: 5, itemType: 'Small parcel', deadline: inHours(30), rejectedJourneyIds: [],
  status: STATUS.FOUND, ...changes,
})
// A car leaving in 16 hours with 10 kg spare.
const journey = (changes = {}) => ({
  id: 'j1', carrierName: 'Bilal Ahmed', origin: 'Islamabad', destination: 'Lahore',
  departure: inHours(16), vehicleType: 'Car', spareKg: 10, status: 'Open', ...changes,
})
const failed = (result) => result.rules.filter((r) => !r.pass).map((r) => r.key)

test('a carrier that fits passes all four rules', () => {
  assert.deepEqual(failed(evaluateCarrier(parcel(), journey())), [])
})

test('each rule fails on its own', () => {
  assert.deepEqual(failed(evaluateCarrier(parcel(), journey({ destination: 'Karachi' }))), ['route'])
  assert.deepEqual(failed(evaluateCarrier(parcel(), journey({ departure: inHours(40) }))), ['timing'])
  assert.deepEqual(failed(evaluateCarrier(parcel(), journey({ spareKg: 3 }))), ['capacity'])
  assert.deepEqual(failed(evaluateCarrier(parcel({ itemType: 'Bulky item' }), journey())), ['compatibility'])
})

test('a motorbike carries at most 10 kg', () => {
  const result = evaluateCarrier(parcel({ weightKg: 12 }), journey({ vehicleType: 'Motorbike', spareKg: 20 }))
  assert.deepEqual(failed(result), ['compatibility'])
})

test('a car carries perishables only on trips under 6 hours', () => {
  assert.deepEqual(failed(evaluateCarrier(parcel({ itemType: 'Perishables' }), journey())), [])
  const long = { origin: 'Islamabad', destination: 'Karachi' }
  assert.deepEqual(failed(evaluateCarrier(parcel({ itemType: 'Perishables', ...long }), journey(long))), ['compatibility'])
})

test('the score is time buffer plus capacity fit (the 75 / 100 demo case)', () => {
  assert.deepEqual(calculateScore(parcel(), journey()), { timeBuffer: 50, capacityFit: 25, total: 75 })
})

test('results are ranked highest score first', () => {
  const journeys = [journey({ id: 'van', spareKg: 25 }), journey({ id: 'car', spareKg: 10 })]
  assert.deepEqual(findMatches(parcel(), journeys).eligible.map((r) => r.journey.id), ['car', 'van'])
})

test('a journey that has already left is not offered', () => {
  assert.equal(findMatches(parcel(), [journey({ departure: inHours(-1) })]).eligible.length, 0)
})

test('price is PKR 200 + PKR 60 per kg, and the saving is against PKR 1,000', () => {
  assert.equal(calculatePrice(5), 500)
  assert.equal(calculateSaving(5), 500)
})

test('a booked parcel uses up spare space; a waiting request does not', () => {
  const state = {
    journeys: [journey()],
    shipments: [parcel({ id: 'booked', weightKg: 8 })],
    deliveries: [{ id: 'd1', shipmentId: 'booked', journeyId: 'j1', status: DELIVERY.AWAITING_PICKUP }],
  }
  assert.equal(withSpaceLeft(state)[0].spareKg, 2)
  state.deliveries[0].status = DELIVERY.AWAITING_ACCEPT
  assert.equal(withSpaceLeft(state)[0].spareKg, 10)
})

test('anotherCarrierFits leaves out carriers who said no', () => {
  const state = { journeys: [journey({ id: 'a' }), journey({ id: 'b' })], shipments: [parcel()], deliveries: [] }
  assert.equal(anotherCarrierFits(parcel(), state, ['a']), true)
  assert.equal(anotherCarrierFits(parcel(), state, ['a', 'b']), false)
})

test('an unanswered request expires when the carrier leaves, and the parcel goes back to matching', () => {
  const state = {
    journeys: [journey({ id: 'gone', departure: inHours(-1) }), journey({ id: 'other' })],
    shipments: [parcel({ status: STATUS.MATCHED })],
    deliveries: [{ id: 'd1', shipmentId: 's1', journeyId: 'gone', status: DELIVERY.AWAITING_ACCEPT }],
  }
  const after = settleExpired(state)
  assert.equal(after.deliveries[0].status, DELIVERY.DECLINED)
  assert.deepEqual(after.shipments[0].rejectedJourneyIds, ['gone'])
  assert.equal(after.shipments[0].status, STATUS.FOUND) // "other" still fits
})
