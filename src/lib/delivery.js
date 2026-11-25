// Creating a delivery: the record that links one shipment to one journey.
// Used when a sender requests a carrier (Matches page) and when a carrier
// offers to carry a parcel (Carry page). Either way, BOTH people must accept
// before any money moves; "acceptedBy" records who has already said yes.
import { DELIVERY, ESCROW, STATUS } from '../data/constants.js'
import { calculatePrice } from './pricing.js'
import { makeId } from './format.js'

// Returns the new app data with the delivery added, plus the delivery itself.
export function startDelivery(state, shipment, journey, acceptedBy = null) {
  const delivery = {
    id: makeId('d'),
    shipmentId: shipment.id,
    journeyId: journey.id,
    price: calculatePrice(shipment.weightKg),
    senderAccepted: acceptedBy === 'sender',
    carrierAccepted: acceptedBy === 'carrier',
    pickupOtp: null,
    deliveryOtp: null,
    wrongAttempts: 0, // wrong delivery codes
    wrongPickupAttempts: 0,
    status: DELIVERY.AWAITING_ACCEPT,
    escrow: ESCROW.NONE,
    createdAt: new Date().toISOString(),
    deliveredAt: null,
  }
  const newState = {
    ...state,
    deliveries: [...state.deliveries, delivery],
    shipments: state.shipments.map((s) =>
      (s.id === shipment.id ? { ...s, status: STATUS.MATCHED } : s)),
  }
  return { newState, delivery }
}
