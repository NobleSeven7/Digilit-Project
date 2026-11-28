// Star ratings left after a delivery. The sender rates the carrier and the
// carrier rates the sender, once each, 1 to 5 stars.
// No network here, so the unit tests can check it.

// A person's average and how many ratings it is based on, e.g.
// { average: 4.5, count: 2 }, or { average: null, count: 0 } for nobody yet.
export function ratingOf(name, ratings) {
  const theirs = (ratings || []).filter((r) => r.ratedName === name)
  if (theirs.length === 0) return { average: null, count: 0 }
  const total = theirs.reduce((sum, r) => sum + r.stars, 0)
  // One decimal place, like most rating sites ("4.7").
  return { average: Math.round((total / theirs.length) * 10) / 10, count: theirs.length }
}

// The rating one person left on one delivery, or undefined.
export const ratingBy = (ratings, deliveryId, raterRole) =>
  (ratings || []).find((r) => r.deliveryId === deliveryId && r.raterRole === raterRole)

// "4.5 from 2 ratings" / "5 from 1 rating"
export function ratingText({ average, count }) {
  if (count === 0) return 'No ratings yet'
  return `${average} from ${count} ${count === 1 ? 'rating' : 'ratings'}`
}
