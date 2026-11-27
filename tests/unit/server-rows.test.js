// Tests for turning app records into database rows and back (shared backend).
//   npm run test:unit
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { toRow, fromRow, stateFromRows, changesBetween, hasChanges } from '../../src/lib/serverRows.js'

const shipment = {
  id: 's-1', senderName: 'Ayesha Khan', origin: 'Islamabad', destination: 'Lahore',
  weightKg: 5, itemType: 'Small parcel', deadline: '2026-11-28T18:00',
  createdAt: '2026-11-27T10:00:00.000Z', matchingMs: 2, status: 'Carriers found',
  rejectedJourneyIds: [], cancelledBy: 'admin',
}
const delivery = {
  id: 'd-1', shipmentId: 's-1', journeyId: 'j-1', price: 500,
  senderAccepted: true, carrierAccepted: false, pickupOtp: '1234', deliveryOtp: '5678',
  wrongAttempts: 0, wrongPickupAttempts: 0, status: 'Awaiting acceptance', escrow: 'None',
  createdAt: '2026-11-27T10:05:00.000Z', deliveredAt: null,
}
const journey = {
  id: 'j-1', carrierName: 'Bilal Ahmed', origin: 'Islamabad', destination: 'Lahore',
  departure: '2026-11-28T08:00', vehicleType: 'Car', spareKg: 10, status: 'Open',
}
const EMPTY = { journeys: [], shipments: [], deliveries: [] }

test('a shipment keeps every field through a round trip, extra fields included', () => {
  const row = toRow('shipments', shipment)
  assert.equal(row.weight_kg, 5)
  assert.deepEqual(row.extra, { cancelledBy: 'admin' })
  assert.equal('sender_id' in row, false, 'the server fills in the owner')
  assert.deepEqual(fromRow('shipments', row), shipment)
})

test('codes never go in the deliveries row', () => {
  const row = toRow('deliveries', delivery)
  assert.equal(JSON.stringify(row).includes('1234'), false)
  assert.equal(JSON.stringify(row).includes('5678'), false)
})

test('codes join their delivery when loading; without them they are null', () => {
  const rows = {
    journeys: [toRow('journeys', journey)],
    shipments: [toRow('shipments', shipment)],
    deliveries: [{ ...toRow('deliveries', delivery), price: '500' }],
    codes: [{ delivery_id: 'd-1', pickup_otp: '1234', delivery_otp: '5678' }],
  }
  const state = stateFromRows(rows)
  assert.equal(state.deliveries[0].pickupOtp, '1234')
  assert.equal(state.deliveries[0].price, 500, 'numeric text becomes a number')
  const hidden = stateFromRows({ ...rows, codes: [] })
  assert.equal(hidden.deliveries[0].pickupOtp, null)
})

test('only changed records are sent', () => {
  const before = { journeys: [journey], shipments: [shipment], deliveries: [delivery] }
  const after = { ...before, shipments: [{ ...shipment, status: 'Matched' }] }
  const changes = changesBetween(before, after)
  assert.equal(changes.update.shipments.length, 1)
  assert.equal(changes.insert.shipments.length, 0)
  assert.equal(changes.update.journeys.length, 0)
  assert.equal(changes.update.deliveries.length, 0)
  assert.equal(changes.codes.length, 0)
  assert.equal(hasChanges(changesBetween(before, before)), false)
})

test('a new delivery sends its codes; a removed one is listed for removal', () => {
  const base = { journeys: [journey], shipments: [shipment], deliveries: [] }
  const added = changesBetween(base, { ...base, deliveries: [delivery] })
  assert.equal(added.insert.deliveries.length, 1)
  assert.deepEqual(added.codes, [{ delivery_id: 'd-1', pickup_otp: '1234', delivery_otp: '5678' }])
  const removed = changesBetween({ ...base, deliveries: [delivery] }, base)
  assert.deepEqual(removed.remove.deliveries, ['d-1'])
  assert.equal(hasChanges(changesBetween(EMPTY, EMPTY)), false)
})
