// Tests for star ratings (src/lib/ratings.js).   npm run test:unit
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { ratingOf, ratingBy, ratingText } from '../../src/lib/ratings.js'

const ratings = [
  { deliveryId: 'd-1', raterRole: 'sender', ratedName: 'Bilal Ahmed', stars: 5 },
  { deliveryId: 'd-2', raterRole: 'sender', ratedName: 'Bilal Ahmed', stars: 4 },
  { deliveryId: 'd-2', raterRole: 'carrier', ratedName: 'Ayesha Khan', stars: 3 },
]

test('a person\'s average is rounded to one decimal place', () => {
  assert.deepEqual(ratingOf('Bilal Ahmed', ratings), { average: 4.5, count: 2 })
  assert.equal(ratingText(ratingOf('Bilal Ahmed', ratings)), '4.5 from 2 ratings')
})

test('nobody rated yet says so', () => {
  assert.deepEqual(ratingOf('Sana Malik', ratings), { average: null, count: 0 })
  assert.equal(ratingText(ratingOf('Sana Malik', ratings)), 'No ratings yet')
  assert.equal(ratingText(ratingOf('Ayesha Khan', ratings)), '3 from 1 rating')
})

test('the rating one side left on one delivery', () => {
  assert.equal(ratingBy(ratings, 'd-2', 'carrier').stars, 3)
  assert.equal(ratingBy(ratings, 'd-1', 'carrier'), undefined)
})
