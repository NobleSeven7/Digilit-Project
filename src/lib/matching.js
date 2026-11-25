// The matching engine: a transparent, rule-based system (no "AI").
// Step 1: check each carrier against four eligibility rules.
// Step 2: give every carrier that passed all four a score out of 100, and rank them.
import {
  VEHICLES, PERISHABLE_MAX_TRIP_HOURS, TIME_BUFFER_HOURS, DELIVERY, tripHours,
} from '../data/constants.js'

const HOUR_MS = 60 * 60 * 1000 // milliseconds in one hour

// ---- Step 1: the four rules. Each returns { pass, detail } -------------

// Rule 1 - Route: carrier's origin and destination are the same as the sender's.
function checkRoute(shipment, journey) {
  const pass = journey.origin === shipment.origin && journey.destination === shipment.destination
  return {
    pass,
    detail: pass
      ? `Travelling ${journey.origin} to ${journey.destination}, same as the parcel`
      : `Travelling ${journey.origin} to ${journey.destination}, but the parcel goes ${shipment.origin} to ${shipment.destination}`,
  }
}

// Rule 2 - Timing: carrier departs before the sender's deadline.
function checkTiming(shipment, journey) {
  const hoursBefore = (new Date(shipment.deadline) - new Date(journey.departure)) / HOUR_MS
  const pass = hoursBefore > 0
  const rounded = Math.abs(Math.round(hoursBefore * 10) / 10)
  return {
    pass,
    detail: pass
      ? `Departs ${rounded} hours before the deadline`
      : `Departs ${rounded} hours after the deadline`,
  }
}

// Rule 3 - Capacity: carrier spare capacity (kg) >= package weight (kg).
// Once a carrier has booked parcels, spareKg is the space LEFT (see withSpaceLeft).
function checkCapacity(shipment, journey) {
  const pass = journey.spareKg >= shipment.weightKg
  const left = journey.postedSpareKg !== undefined ? ' left' : ''
  return {
    pass,
    detail: pass
      ? `${journey.spareKg} kg spare${left} is enough for ${shipment.weightKg} kg`
      : `Only ${journey.spareKg} kg spare${left}, but the parcel is ${shipment.weightKg} kg`,
  }
}

// Rule 4 - Compatibility: the item type is allowed for the vehicle type.
function checkCompatibility(shipment, journey) {
  const vehicle = VEHICLES[journey.vehicleType]
  const item = shipment.itemType

  if (!vehicle.allowed.includes(item)) {
    return { pass: false, detail: `${item} is not allowed on a ${journey.vehicleType}` }
  }
  // Motorbike (10 kg) and bus traveller (15 kg) have fixed weight limits.
  if (vehicle.maxKg !== null && shipment.weightKg > vehicle.maxKg) {
    return {
      pass: false,
      detail: `A ${journey.vehicleType} carries up to ${vehicle.maxKg} kg, but the parcel is ${shipment.weightKg} kg`,
    }
  }
  // A car may carry perishables only on trips under 6 hours.
  if (item === 'Perishables' && journey.vehicleType === 'Car') {
    const hours = tripHours(shipment.origin, shipment.destination)
    if (hours >= PERISHABLE_MAX_TRIP_HOURS) {
      return {
        pass: false,
        detail: `A car carries perishables only on trips under ${PERISHABLE_MAX_TRIP_HOURS} hours; this trip is about ${hours} hours`,
      }
    }
  }
  return { pass: true, detail: `${item} is allowed on a ${journey.vehicleType}` }
}

// ---- Step 2: the match score (out of 100) ------------------------------
export function calculateScore(shipment, journey) {
  // Time buffer: departs at least 6 hours before the deadline = 50, otherwise 25.
  const hoursBefore = (new Date(shipment.deadline) - new Date(journey.departure)) / HOUR_MS
  const timeBuffer = hoursBefore >= TIME_BUFFER_HOURS ? 50 : 25

  // Capacity fit: 50 x (package kg / carrier spare kg). A fuller fit scores higher.
  const capacityFit = 50 * (shipment.weightKg / journey.spareKg)

  return { timeBuffer, capacityFit, total: timeBuffer + capacityFit }
}

// ---- Putting it together -----------------------------------------------

// Check ONE carrier journey against a shipment.
export function evaluateCarrier(shipment, journey) {
  const rules = [
    { key: 'route', label: 'Route', ...checkRoute(shipment, journey) },
    { key: 'timing', label: 'Timing', ...checkTiming(shipment, journey) },
    { key: 'capacity', label: 'Capacity', ...checkCapacity(shipment, journey) },
    { key: 'compatibility', label: 'Compatibility', ...checkCompatibility(shipment, journey) },
  ]
  const eligible = rules.every((rule) => rule.pass) // all four must pass
  return {
    journey,
    rules,
    eligible,
    score: eligible ? calculateScore(shipment, journey) : null,
  }
}

// A journey can take parcels only while it is open AND has not left yet.
// Without the time check, a journey posted for "tomorrow 8 am" would still be
// offered the day after. (This decides which journeys are checked at all;
// the four rules themselves are unchanged.)
export function isAvailable(journey, now = Date.now()) {
  return journey.status === 'Open' && new Date(journey.departure).getTime() > now
}

// ---- Space already booked ----------------------------------------------
// A parcel takes up room in the carrier's vehicle once BOTH people have
// accepted, and keeps it until it is delivered. A request still waiting for
// an answer holds no room (nothing is agreed yet), and a refunded parcel
// gives its room back.
const HOLDS_SPACE = [DELIVERY.AWAITING_PICKUP, DELIVERY.IN_TRANSIT, DELIVERY.DELIVERED, DELIVERY.DISPUTED]

// Kilograms already booked on one journey. "exceptShipmentId" leaves out one
// parcel's own booking, so a booked parcel does not count against itself.
export function bookedKg(journey, state, exceptShipmentId = null) {
  return state.deliveries
    .filter((d) => d.journeyId === journey.id && HOLDS_SPACE.includes(d.status)
      && d.shipmentId !== exceptShipmentId)
    .reduce((total, d) => {
      const shipment = state.shipments.find((s) => s.id === d.shipmentId)
      return total + (shipment ? shipment.weightKg : 0)
    }, 0)
}

// Every journey with spareKg changed to the space still free. A journey with
// bookings also keeps the number the carrier posted, as postedSpareKg.
// Example: 10 kg posted, an 8 kg parcel booked -> spareKg 2, postedSpareKg 10.
export function withSpaceLeft(state, exceptShipmentId = null) {
  return state.journeys.map((journey) => {
    const booked = bookedKg(journey, state, exceptShipmentId)
    if (booked === 0) return journey
    const left = Math.max(0, Math.round((journey.spareKg - booked) * 10) / 10)
    return { ...journey, spareKg: left, postedSpareKg: journey.spareKg }
  })
}

// Check ALL available journeys. Returns two lists:
//   eligible   - passed all four rules, highest score first
//   ineligible - failed at least one rule (kept so the app can explain why)
export function findMatches(shipment, journeys) {
  const results = journeys
    .filter((journey) => isAvailable(journey))
    .map((journey) => evaluateCarrier(shipment, journey))

  const eligible = results
    .filter((result) => result.eligible)
    // Highest score first. If two scores tie, the earlier departure wins.
    .sort((a, b) =>
      b.score.total - a.score.total ||
      new Date(a.journey.departure) - new Date(b.journey.departure))

  const ineligible = results.filter((result) => !result.eligible)
  return { eligible, ineligible }
}

// Is any carrier still free for this parcel, leaving out the journeys in
// rejectedJourneyIds (carriers who declined, or whose request expired)?
// Decline, Withdraw and the expiry tidy-up all ask this one question, so it
// lives in one place and the three can never drift apart.
export function anotherCarrierFits(shipment, state, rejectedJourneyIds = shipment.rejectedJourneyIds) {
  return findMatches(shipment, withSpaceLeft(state)).eligible
    .some((r) => !rejectedJourneyIds.includes(r.journey.id))
}
