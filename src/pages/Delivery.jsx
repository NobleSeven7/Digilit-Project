// Delivery page: both sides accept -> pickup code -> delivery code -> escrow release.
// The payment is simulated: it is only a status tracked inside this app.
import { useState } from 'react'
import { STATUS, DELIVERY, ESCROW } from '../data/constants.js'
import { generateOtp, generateDifferentOtp } from '../lib/otp.js'
import { sendToWebhook } from '../lib/webhook.js'
import { goTo } from '../lib/navigation.js'
import { formatPKR, formatDateTime } from '../lib/format.js'
import PageHeader from '../components/PageHeader.jsx'
import RouteLine from '../components/RouteLine.jsx'
import StatusBadge from '../components/StatusBadge.jsx'

// How many progress stops are complete for each delivery status.
const STOPS = ['Accepted', 'Picked up', 'Delivered', 'Paid']
const REACHED = {
  [DELIVERY.AWAITING_ACCEPT]: 0,
  [DELIVERY.AWAITING_PICKUP]: 1,
  [DELIVERY.IN_TRANSIT]: 2,
  [DELIVERY.DELIVERED]: 4,
  [DELIVERY.DISPUTED]: 2,
}

// A box that shows a code on screen, standing in for an SMS.
function CodeBox({ label, code, testId }) {
  return (
    <div className="rounded-lg border-2 border-dashed border-hold bg-hold-tint px-4 py-3">
      <p className="text-sm text-hold-ink">{label}</p>
      <p className="font-display text-3xl font-bold tracking-[0.3em]" data-testid={testId}>{code}</p>
    </div>
  )
}

// A 4-digit code input with its confirm button.
function CodeForm({ id, label, buttonText, onSubmit }) {
  const [code, setCode] = useState('')
  return (
    <form className="mt-4" onSubmit={(e) => { e.preventDefault(); onSubmit(code); setCode('') }}>
      <label className="label" htmlFor={id}>{label}</label>
      <div className="flex flex-wrap gap-3">
        <input id={id} className="field w-36 text-center text-2xl tracking-[0.3em]"
          inputMode="numeric" maxLength={4} autoComplete="one-time-code" value={code}
          onChange={(e) => setCode(e.target.value.replace(/\D/g, ''))} />
        <button type="submit" className="btn btn-primary" data-testid={`${id}-submit`}>
          {buttonText}
        </button>
      </div>
    </form>
  )
}

export default function Delivery({ state, save, id }) {
  // Message shown after an action, e.g. "Wrong code".
  const [message, setMessage] = useState(null) // { ok: true/false, text }

  const deliveries = [...state.deliveries].reverse() // newest first
  const delivery = deliveries.find((d) => d.id === id) || deliveries[0]

  if (!delivery) {
    return (
      <div>
        <PageHeader title="Delivery" />
        <div className="card">
          <p>No deliveries yet. Request a carrier on the Matches page to start one.</p>
          <a href="#/matches" className="btn btn-primary mt-4">Go to matches</a>
        </div>
      </div>
    )
  }

  const shipment = state.shipments.find((s) => s.id === delivery.shipmentId)
  const journey = state.journeys.find((j) => j.id === delivery.journeyId)
  const amount = formatPKR(delivery.price)

  // Save a changed copy of this delivery (and optionally a new shipment status).
  function update(changes, shipmentChanges) {
    save({
      ...state,
      deliveries: state.deliveries.map((d) => (d.id === delivery.id ? { ...d, ...changes } : d)),
      shipments: state.shipments.map((s) =>
        s.id === shipment.id && shipmentChanges ? { ...s, ...shipmentChanges } : s),
    })
  }

  // Common fields sent to Make.com / Google Sheets.
  const record = {
    deliveryId: delivery.id, shipmentId: shipment.id,
    senderName: shipment.senderName, carrierName: journey.carrierName,
    origin: shipment.origin, destination: shipment.destination,
    weightKg: shipment.weightKg, price: delivery.price,
  }

  // ---- Step 1: acceptance ----------------------------------------------
  function handleAccept(who) {
    const senderAccepted = who === 'sender' ? true : delivery.senderAccepted
    const carrierAccepted = who === 'carrier' ? true : delivery.carrierAccepted

    if (senderAccepted && carrierAccepted) {
      // Both accepted: create the two one-time codes and hold the payment.
      const pickupOtp = generateOtp()
      const deliveryOtp = generateDifferentOtp(pickupOtp)
      update({
        senderAccepted, carrierAccepted, pickupOtp, deliveryOtp,
        status: DELIVERY.AWAITING_PICKUP, escrow: ESCROW.HELD,
      })
      setMessage({ ok: true, text: `Match confirmed. ${amount} is now held in escrow.` })
      sendToWebhook('match', { ...record, escrow: ESCROW.HELD },
        `Match accepted: ${shipment.senderName} and ${journey.carrierName}`)
    } else {
      update({ senderAccepted, carrierAccepted })
      setMessage(null)
    }
  }

  // Carrier declines: the shipment goes back to "Unmatched – Retrying"
  // and the next-ranked carrier is offered on the Matches page.
  function handleDecline() {
    update(
      { status: DELIVERY.DECLINED },
      { status: STATUS.RETRYING, rejectedJourneyIds: [...shipment.rejectedJourneyIds, journey.id] },
    )
    goTo(`matches/${shipment.id}`)
  }

  // ---- Step 2: pickup code ---------------------------------------------
  function handlePickup(code) {
    if (code === delivery.pickupOtp) {
      update({ status: DELIVERY.IN_TRANSIT })
      setMessage({ ok: true, text: 'Pickup confirmed. The parcel is on its way.' })
    } else {
      setMessage({ ok: false, text: 'Wrong pickup code. The parcel has not been handed over.' })
    }
  }

  // ---- Step 3: delivery code -> escrow release --------------------------
  function handleDelivery(code) {
    if (code === delivery.deliveryOtp) {
      const deliveredAt = new Date().toISOString()
      update(
        { status: DELIVERY.DELIVERED, escrow: ESCROW.RELEASED, deliveredAt },
        { status: STATUS.DELIVERED },
      )
      setMessage({ ok: true, text: `Delivery confirmed. ${amount} released to ${journey.carrierName}.` })
      sendToWebhook('delivery', { ...record, escrow: ESCROW.RELEASED, deliveredAt },
        `Delivery completed: ${amount} released to ${journey.carrierName}`)
    } else {
      // Wrong code: nothing changes, the money stays in escrow.
      update({ wrongAttempts: delivery.wrongAttempts + 1 })
      setMessage({ ok: false, text: `Wrong delivery code. ${amount} stays in escrow.` })
    }
  }

  // ---- Dispute: freeze the escrow and hand over to a human admin --------
  function handleDispute() {
    update(
      { status: DELIVERY.DISPUTED, escrow: ESCROW.FROZEN, disputeReason: 'Problem reported during delivery' },
      { status: STATUS.DISPUTED },
    )
    setMessage({ ok: false, text: `Problem reported. ${amount} is frozen until an admin reviews it.` })
    sendToWebhook('dispute', { ...record, escrow: ESCROW.FROZEN },
      `Dispute raised: ${shipment.origin} to ${shipment.destination}`)
  }

  const active = [DELIVERY.AWAITING_PICKUP, DELIVERY.IN_TRANSIT].includes(delivery.status)

  return (
    <div>
      <PageHeader title="Delivery">
        Codes appear on this screen for the demo. A live service would send them by SMS.
      </PageHeader>

      {/* Pick which delivery to look at */}
      <div className="mb-6 max-w-xl">
        <label className="label" htmlFor="deliveryPicker">Delivery</label>
        <select id="deliveryPicker" className="field" value={delivery.id}
          onChange={(e) => { setMessage(null); goTo(`delivery/${e.target.value}`) }}>
          {deliveries.map((d) => {
            const s = state.shipments.find((x) => x.id === d.shipmentId)
            return (
              <option key={d.id} value={d.id}>
                {s.origin} to {s.destination}, {s.weightKg} kg ({d.status})
              </option>
            )
          })}
        </select>
      </div>

      <div className="grid gap-6 lg:grid-cols-[1fr_20rem]">
        <div className="space-y-6">
          {/* Progress along the route */}
          <section className="card">
            <RouteLine origin={shipment.origin} destination={shipment.destination}
              stops={STOPS} reached={REACHED[delivery.status] ?? 0} />
            <p className="mt-4 text-muted">
              {shipment.weightKg} kg {shipment.itemType.toLowerCase()} from {shipment.senderName},
              carried by {journey.carrierName} ({journey.vehicleType}), departing {formatDateTime(journey.departure)}.
            </p>
          </section>

          {/* Result of the last action */}
          {message && (
            <p role="alert" data-testid="delivery-message"
              className={`rounded-lg px-4 py-3 font-bold ${message.ok ? 'bg-brand-tint text-brand' : 'bg-fail-tint text-fail'}`}>
              {message.text}
            </p>
          )}

          {/* Step 1: both sides accept */}
          {delivery.status === DELIVERY.AWAITING_ACCEPT && (
            <section className="card" data-testid="step-accept">
              <h2 className="text-xl font-bold">Accept the match</h2>
              <p className="mt-1 text-muted">Both people must accept before any money moves.</p>
              <div className="mt-4 space-y-3">
                <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg bg-paper px-3 py-3">
                  <p><strong>{shipment.senderName}</strong> (sender)</p>
                  {delivery.senderAccepted
                    ? <StatusBadge status="Accepted" />
                    : <button type="button" className="btn btn-primary" data-testid="accept-sender"
                        onClick={() => handleAccept('sender')}>Accept as sender</button>}
                </div>
                <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg bg-paper px-3 py-3">
                  <p><strong>{journey.carrierName}</strong> (carrier)</p>
                  {delivery.carrierAccepted
                    ? <StatusBadge status="Accepted" />
                    : (
                      <div className="flex flex-wrap gap-3">
                        <button type="button" className="btn btn-primary" data-testid="accept-carrier"
                          onClick={() => handleAccept('carrier')}>Accept as carrier</button>
                        <button type="button" className="btn btn-danger" data-testid="decline-carrier"
                          onClick={handleDecline}>Decline</button>
                      </div>
                    )}
                </div>
              </div>
            </section>
          )}

          {/* Step 2: pickup code */}
          {delivery.status === DELIVERY.AWAITING_PICKUP && (
            <section className="card" data-testid="step-pickup">
              <h2 className="text-xl font-bold">Pickup</h2>
              <p className="mt-1 text-muted">
                {shipment.senderName} reads this code to {journey.carrierName} when handing over the parcel.
              </p>
              <div className="mt-4 max-w-xs">
                <CodeBox label="Pickup code (would arrive by SMS)" code={delivery.pickupOtp} testId="pickup-otp" />
              </div>
              <CodeForm id="pickup-code" label="Carrier enters the pickup code"
                buttonText="Confirm pickup" onSubmit={handlePickup} />
            </section>
          )}

          {/* Step 3: delivery code */}
          {delivery.status === DELIVERY.IN_TRANSIT && (
            <section className="card" data-testid="step-delivery">
              <h2 className="text-xl font-bold">Delivery</h2>
              <p className="mt-1 text-muted">
                The receiver reads this code to {journey.carrierName} once the parcel arrives safely.
              </p>
              <div className="mt-4 max-w-xs">
                <CodeBox label="Delivery code (would arrive by SMS)" code={delivery.deliveryOtp} testId="delivery-otp" />
              </div>
              <CodeForm id="delivery-code" label="Carrier enters the delivery code"
                buttonText="Confirm delivery" onSubmit={handleDelivery} />
            </section>
          )}

          {/* Finished states */}
          {delivery.status === DELIVERY.DELIVERED && (
            <section className="card border-brand bg-brand-tint" data-testid="step-done">
              <h2 className="text-xl font-bold text-brand">Delivered and paid</h2>
              <p className="mt-1">
                {amount} was released to {journey.carrierName}
                {delivery.deliveredAt ? ` on ${formatDateTime(delivery.deliveredAt)}` : ''}.
              </p>
              <a href="#/dashboard" className="btn btn-primary mt-4">See the dashboard</a>
            </section>
          )}
          {delivery.status === DELIVERY.DISPUTED && (
            <section className="card border-fail bg-fail-tint">
              <h2 className="text-xl font-bold text-fail">Under admin review</h2>
              <p className="mt-1">{delivery.disputeReason}. The payment is frozen until a person decides.</p>
              <a href="#/admin" className="btn btn-secondary mt-4">Open admin</a>
            </section>
          )}
          {delivery.status === DELIVERY.DECLINED && (
            <section className="card">
              <h2 className="text-xl font-bold">Carrier declined</h2>
              <p className="mt-1">No money moved. The next-ranked carrier is offered on the Matches page.</p>
              <a href={`#/matches/${shipment.id}`} className="btn btn-primary mt-4">See next carrier</a>
            </section>
          )}
          {delivery.status === DELIVERY.REFUNDED && (
            <section className="card">
              <h2 className="text-xl font-bold">Refunded</h2>
              <p className="mt-1">An admin reviewed the dispute and returned {amount} to {shipment.senderName}.</p>
            </section>
          )}

          {/* Report a problem (only while the delivery is under way) */}
          {active && (
            <button type="button" className="btn btn-danger" onClick={handleDispute} data-testid="report-problem">
              Report a problem
            </button>
          )}
        </div>

        {/* Escrow panel */}
        <aside className="card h-fit" data-testid="escrow-panel">
          <h2 className="text-xl font-bold">Escrow</h2>
          <p className="mt-2 font-display text-4xl font-bold text-brand">{amount}</p>
          <p className="mt-2" data-testid="escrow-status"><StatusBadge status={delivery.escrow} /></p>
          <p className="mt-3 text-sm text-muted">
            Simulated payment. The fee is held when both sides accept and released only
            when the correct delivery code is entered.
          </p>
          {delivery.wrongAttempts > 0 && delivery.escrow === ESCROW.HELD && (
            <p className="mt-2 text-sm text-fail">
              Wrong delivery codes entered: {delivery.wrongAttempts}
            </p>
          )}
        </aside>
      </div>
    </div>
  )
}
