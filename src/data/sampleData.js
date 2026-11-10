// Fictional sample data that is pre-loaded the first time the app opens
// (and again whenever "Reset demo data" is pressed).
// Every name and trip here is made up - no real personal data.
import { STATUS, DELIVERY, ESCROW } from './constants.js'
import { dayAt } from '../lib/format.js'
import { calculatePrice } from '../lib/pricing.js'

// A timestamp some hours in the past, e.g. hoursAgo(3).
function hoursAgo(hours) {
  return new Date(Date.now() - hours * 60 * 60 * 1000).toISOString()
}

// Dates are calculated from "today" so the demo never goes out of date.
export function createSampleData() {
  // ---- Carrier journeys ------------------------------------------------
  const journeys = [
    // Six carriers built around the Islamabad -> Lahore demo case.
    // For a 5 kg small parcel due tomorrow 6 pm they give these results:
    { id: 'j-bilal', carrierName: 'Bilal Ahmed', origin: 'Islamabad', destination: 'Lahore',
      departure: dayAt(1, 8), vehicleType: 'Car', spareKg: 10, status: 'Open' },             // passes: score 75
    { id: 'j-sana', carrierName: 'Sana Malik', origin: 'Islamabad', destination: 'Lahore',
      departure: dayAt(1, 9), vehicleType: 'Van / Pickup', spareKg: 25, status: 'Open' },    // passes: score 60
    { id: 'j-usman', carrierName: 'Usman Tariq', origin: 'Islamabad', destination: 'Lahore',
      departure: dayAt(1, 15), vehicleType: 'Motorbike', spareKg: 8, status: 'Open' },       // passes: score 56
    { id: 'j-hamza', carrierName: 'Hamza Sheikh', origin: 'Islamabad', destination: 'Karachi',
      departure: dayAt(1, 7), vehicleType: 'Car', spareKg: 20, status: 'Open' },             // fails Route
    { id: 'j-nida', carrierName: 'Nida Raza', origin: 'Islamabad', destination: 'Lahore',
      departure: dayAt(1, 21), vehicleType: 'Bus traveller (luggage)', spareKg: 12, status: 'Open' }, // fails Timing
    { id: 'j-imran', carrierName: 'Imran Qureshi', origin: 'Islamabad', destination: 'Lahore',
      departure: dayAt(1, 10), vehicleType: 'Car', spareKg: 3, status: 'Open' },             // fails Capacity

    // Journeys that already happened (used by the finished deliveries below).
    { id: 'j-old1', carrierName: 'Kamran Akhtar', origin: 'Lahore', destination: 'Islamabad',
      departure: dayAt(-2, 9), vehicleType: 'Car', spareKg: 6, status: 'Completed' },
    { id: 'j-old2', carrierName: 'Rabia Anwar', origin: 'Lahore', destination: 'Faisalabad',
      departure: dayAt(-1, 14), vehicleType: 'Motorbike', spareKg: 8, status: 'Completed' },
    { id: 'j-old3', carrierName: 'Tariq Jameel', origin: 'Islamabad', destination: 'Peshawar',
      departure: dayAt(-1, 8), vehicleType: 'Van / Pickup', spareKg: 15, status: 'Completed' },
    { id: 'j-old4', carrierName: 'Shahid Nawaz', origin: 'Multan', destination: 'Lahore',
      departure: dayAt(-1, 11), vehicleType: 'Car', spareKg: 12, status: 'Completed' },
  ]

  // ---- Shipments -------------------------------------------------------
  const shipments = [
    // Three finished deliveries (they feed the dashboard numbers).
    { id: 's-old1', senderName: 'Omar Farooq', origin: 'Lahore', destination: 'Islamabad',
      weightKg: 3, itemType: 'Documents', deadline: dayAt(-2, 20), createdAt: hoursAgo(54),
      matchingMs: 3, status: STATUS.DELIVERED, rejectedJourneyIds: [] },
    { id: 's-old2', senderName: 'Zainab Hussain', origin: 'Lahore', destination: 'Faisalabad',
      weightKg: 4, itemType: 'Small parcel', deadline: dayAt(-1, 20), createdAt: hoursAgo(30),
      matchingMs: 2, status: STATUS.DELIVERED, rejectedJourneyIds: [] },
    { id: 's-old3', senderName: 'Faisal Mehmood', origin: 'Islamabad', destination: 'Peshawar',
      weightKg: 8, itemType: 'Fragile item', deadline: dayAt(-1, 18), createdAt: hoursAgo(34),
      matchingMs: 4, status: STATUS.DELIVERED, rejectedJourneyIds: [] },

    // A dispute: the sender reported damage, so the escrow is frozen for the admin.
    { id: 's-dispute', senderName: 'Zainab Hussain', origin: 'Multan', destination: 'Lahore',
      weightKg: 6, itemType: 'Fragile item', deadline: dayAt(-1, 22), createdAt: hoursAgo(28),
      matchingMs: 3, status: STATUS.DISPUTED, rejectedJourneyIds: [] },

    // No carrier on this route, posted 3 hours ago -> flagged for admin (over 2 hours).
    { id: 's-flagged', senderName: 'Omar Farooq', origin: 'Peshawar', destination: 'Multan',
      weightKg: 2, itemType: 'Perishables', deadline: dayAt(1, 12), createdAt: hoursAgo(3),
      matchingMs: null, status: STATUS.RETRYING, rejectedJourneyIds: [] },

    // No carrier on this route, posted 20 minutes ago -> still retrying.
    { id: 's-retrying', senderName: 'Faisal Mehmood', origin: 'Quetta', destination: 'Karachi',
      weightKg: 12, itemType: 'Bulky item', deadline: dayAt(2, 18), createdAt: hoursAgo(0.33),
      matchingMs: null, status: STATUS.RETRYING, rejectedJourneyIds: [] },

    // THE DEMO CASE from the proposal: Islamabad -> Lahore, 5 kg small parcel.
    { id: 's-demo', senderName: 'Ayesha Khan', origin: 'Islamabad', destination: 'Lahore',
      weightKg: 5, itemType: 'Small parcel', deadline: dayAt(1, 18), createdAt: hoursAgo(0.05),
      matchingMs: 2, status: STATUS.FOUND, rejectedJourneyIds: [] },
  ]

  // ---- Deliveries (a delivery links one shipment to one journey) --------
  const finished = (id, shipmentId, journeyId, weightKg, deliveredHoursAgo) => ({
    id, shipmentId, journeyId, price: calculatePrice(weightKg),
    senderAccepted: true, carrierAccepted: true,
    pickupOtp: '4827', deliveryOtp: '9031', wrongAttempts: 0,
    status: DELIVERY.DELIVERED, escrow: ESCROW.RELEASED,
    createdAt: hoursAgo(deliveredHoursAgo + 8), deliveredAt: hoursAgo(deliveredHoursAgo),
  })

  const deliveries = [
    finished('d-old1', 's-old1', 'j-old1', 3, 40),
    finished('d-old2', 's-old2', 'j-old2', 4, 20),
    finished('d-old3', 's-old3', 'j-old3', 8, 24),
    { id: 'd-dispute', shipmentId: 's-dispute', journeyId: 'j-old4', price: calculatePrice(6),
      senderAccepted: true, carrierAccepted: true,
      pickupOtp: '6614', deliveryOtp: '2258', wrongAttempts: 0,
      status: DELIVERY.DISPUTED, escrow: ESCROW.FROZEN,
      disputeReason: 'Sender reported the item arrived damaged',
      createdAt: hoursAgo(27), deliveredAt: null },
  ]

  return { shipments, journeys, deliveries }
}
