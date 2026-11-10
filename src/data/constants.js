// All the fixed values from the project proposal live in this one file,
// so the rules are easy to find and easy to change.

// Fixed city list. The Route rule compares these exact names.
export const CITIES = [
  'Islamabad', 'Rawalpindi', 'Lahore', 'Karachi',
  'Peshawar', 'Faisalabad', 'Multan', 'Quetta',
]

// Item types a sender can choose.
export const ITEM_TYPES = [
  'Documents', 'Small parcel', 'Fragile item', 'Perishables', 'Bulky item',
]

// Vehicle-item compatibility table (proposal section 2).
//   allowed = item types this vehicle may carry
//   maxKg   = fixed weight limit, or null when it is "as declared by carrier"
export const VEHICLES = {
  'Motorbike': {
    allowed: ['Documents', 'Small parcel'],
    maxKg: 10,
  },
  'Car': {
    allowed: ['Documents', 'Small parcel', 'Fragile item', 'Perishables'],
    maxKg: null,
  },
  'Bus traveller (luggage)': {
    allowed: ['Documents', 'Small parcel'],
    maxKg: 15,
  },
  'Van / Pickup': {
    allowed: ['Documents', 'Small parcel', 'Fragile item', 'Perishables', 'Bulky item'],
    maxKg: null,
  },
}
export const VEHICLE_TYPES = Object.keys(VEHICLES)

// A car may carry perishables only on trips under this many hours.
export const PERISHABLE_MAX_TRIP_HOURS = 6

// Match score: departing at least this many hours before the deadline earns full points.
export const TIME_BUFFER_HOURS = 6

// Pricing model: PKR 200 base fee + PKR 60 per kg.
export const BASE_FEE = 200
export const FEE_PER_KG = 60
// Baseline for "cost saved": a typical courier quote for a 5 kg intercity parcel.
export const COURIER_FEE = 1000

// A request still unmatched after this many hours is flagged for the admin.
export const FLAG_AFTER_HOURS = 2

// Shipment statuses (one place, so the spelling is always identical).
export const STATUS = {
  FOUND: 'Carriers found',
  RETRYING: 'Unmatched – Retrying',
  FLAGGED: 'Flagged for admin review',
  MATCHED: 'Matched',
  DELIVERED: 'Delivered',
  DISPUTED: 'Disputed',
  CANCELLED: 'Cancelled',
}

// Delivery statuses, in the order a delivery moves through them.
export const DELIVERY = {
  AWAITING_ACCEPT: 'Awaiting acceptance',
  AWAITING_PICKUP: 'Awaiting pickup',
  IN_TRANSIT: 'In transit',
  DELIVERED: 'Delivered',
  DISPUTED: 'Disputed',
  DECLINED: 'Declined by carrier',
  REFUNDED: 'Refunded',
}

// Escrow (simulated payment) states.
export const ESCROW = {
  NONE: 'Not paid yet',
  HELD: 'Held in escrow',
  RELEASED: 'Released to carrier',
  FROZEN: 'Frozen',
  REFUNDED: 'Refunded to sender',
}

// Fictional demo users (the proposal simulates accounts instead of a real login).
export const DEMO_SENDERS = ['Ayesha Khan', 'Omar Farooq', 'Zainab Hussain', 'Faisal Mehmood']
export const DEMO_CARRIERS = ['Bilal Ahmed', 'Sana Malik', 'Usman Tariq', 'Hamza Sheikh', 'Nida Raza']

// Approximate road-trip durations in hours. ASSUMPTION (not in the proposal):
// needed only for the "perishables in a car on trips under 6 hours" rule.
const TRIP_HOURS = {
  'Islamabad|Rawalpindi': 0.5, 'Islamabad|Lahore': 4.5, 'Islamabad|Karachi': 16,
  'Islamabad|Peshawar': 2.5, 'Islamabad|Faisalabad': 4, 'Islamabad|Multan': 6.5,
  'Islamabad|Quetta': 14, 'Rawalpindi|Lahore': 4.5, 'Rawalpindi|Karachi': 16,
  'Rawalpindi|Peshawar': 2.5, 'Rawalpindi|Faisalabad': 4, 'Rawalpindi|Multan': 6.5,
  'Rawalpindi|Quetta': 14, 'Lahore|Karachi': 14, 'Lahore|Peshawar': 6.5,
  'Lahore|Faisalabad': 2.5, 'Lahore|Multan': 4.5, 'Lahore|Quetta': 13,
  'Karachi|Peshawar': 18, 'Karachi|Faisalabad': 13, 'Karachi|Multan': 10.5,
  'Karachi|Quetta': 9.5, 'Peshawar|Faisalabad': 6, 'Peshawar|Multan': 8,
  'Peshawar|Quetta': 13, 'Faisalabad|Multan': 3.5, 'Faisalabad|Quetta': 11,
  'Multan|Quetta': 9,
}

// Look up the trip time between two cities (works in either direction).
export function tripHours(cityA, cityB) {
  return TRIP_HOURS[`${cityA}|${cityB}`] ?? TRIP_HOURS[`${cityB}|${cityA}`] ?? 0
}
