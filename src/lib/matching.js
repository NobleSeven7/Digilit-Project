// The matching engine: a transparent, rule-based system (no "AI").
// Step 1: check each carrier against four eligibility rules.
// Step 2: give every carrier that passed all four a score out of 100, and rank them.
import {
  VEHICLES, PERISHABLE_MAX_TRIP_HOURS, TIME_BUFFER_HOURS, tripHours,
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
function checkCapacity(shipment, journey) {
  const pass = journey.spareKg >= shipment.weightKg
  return {
    pass,
    detail: pass
      ? `${journey.spareKg} kg spare is enough for ${shipment.weightKg} kg`
      : `Only ${journey.spareKg} kg spare, but the parcel is ${shipment.weightKg} kg`,
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

// Check ALL open journeys. Returns two lists:
//   eligible   - passed all four rules, highest score first
//   ineligible - failed at least one rule (kept so the app can explain why)
export function findMatches(shipment, journeys) {
  const results = journeys
    .filter((journey) => journey.status === 'Open')
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
