// Delivery page: both sides accept -> pickup code -> delivery code -> escrow release.
// The payment is simulated: it is only a status tracked inside this app.
import { useRef, useState } from 'react'
import { STATUS, DELIVERY, ESCROW, MAX_CODE_TRIES } from '../data/constants.js'
import { generateOtp, generateDifferentOtp } from '../lib/otp.js'
import { sendToWebhook, noteInSyncLog } from '../lib/webhook.js'
import { goTo } from '../lib/navigation.js'
import { formatPKR, formatDateTime, formatShort, isolate } from '../lib/format.js'
import { findMatches, isAvailable } from '../lib/matching.js'
import { calculateSaving } from '../lib/pricing.js'
import { shake } from '../lib/motion.js'
import PageHeader from '../components/PageHeader.jsx'
import RouteLine from '../components/RouteLine.jsx'
import StatusBadge from '../components/StatusBadge.jsx'
import SuccessTick from '../components/SuccessTick.jsx'
import posthog, { posthogEnabled } from '../lib/posthog.js'
import ParcelPass from '../components/ParcelPass.jsx'

// Reasons a sender or carrier can give when reporting a problem.
const PROBLEMS = [
  'The parcel arrived damaged',
  'The parcel was not delivered',
  'Something else went wrong',
]

// How many progress stops are complete for each delivery status.
const STOPS = ['Accepted', 'Picked up', 'Delivered', 'Paid']
// The same steps before they happen, so the current one reads as "to do".
const TODO = ['Accept', 'Pick up', 'Deliver', 'Pay']
const REACHED = {
  [DELIVERY.AWAITING_ACCEPT]: 0,
  [DELIVERY.AWAITING_PICKUP]: 1,
  [DELIVERY.IN_TRANSIT]: 2,
  [DELIVERY.DELIVERED]: 4,
  [DELIVERY.DISPUTED]: 2,
}
// Statuses where one step is "in progress" (highlighted on the tracker).
const STILL_MOVING = [
  DELIVERY.AWAITING_ACCEPT, DELIVERY.AWAITING_PICKUP, DELIVERY.IN_TRANSIT, DELIVERY.DISPUTED,
]

// "Accepted" where the Accept button was. When it has just been pressed, the
// badge settles in from the right (the button's side) instead of replacing
// the button in one frame (.settle-in in src/index.css).
function AcceptedBadge({ animate }) {
  return (
    <span className={`inline-block ${animate ? 'settle-in origin-right' : ''}`}>
      <StatusBadge status="Accepted" />
    </span>
  )
}

// A 4-digit code input with its confirm button. onSubmit returns false for a
// wrong code, and the box then shakes.
function CodeForm({ id, label, buttonText, onSubmit }) {
  const [code, setCode] = useState('')
  const input = useRef(null)
  function handleSubmit(e) {
    e.preventDefault()
    if (onSubmit(code) === false) shake(input.current)
    setCode('')
  }
  return (
    <form className="mt-4" onSubmit={handleSubmit}>
      <label className="label" htmlFor={id}>{label}</label>
      <div className="flex flex-wrap gap-3">
        <input id={id} ref={input} className="field w-36 text-center text-2xl tracking-[0.3em]"
          inputMode="numeric" enterKeyHint="go" maxLength={4} autoComplete="one-time-code" value={code}
          onChange={(e) => setCode(e.target.value.replace(/\D/g, ''))} />
        <button type="submit" className="btn btn-primary" data-testid={`${id}-submit`}>
          {buttonText}
        </button>
      </div>
    </form>
  )
}

// Only the carrier enters the codes (entering the delivery code releases the
// money). Anyone else signed in sees a one-tap switch to the carrier instead.
function CarrierOnly({ carrierName, setProfile }) {
  return (
    <div className="mt-4 rounded-lg bg-sunk px-3 py-3">
      <p>Only <strong>{carrierName}</strong> (the carrier) enters this code.</p>
      <button type="button" className="btn btn-secondary mt-3" data-testid="switch-to-carrier"
        onClick={() => setProfile({ role: 'carrier', name: carrierName })}>
        Switch to {carrierName}
      </button>
    </div>
  )
}

export default function Delivery({ state, save, id, profile, setProfile }) {
  // Message shown after an action, e.g. "Wrong code".
  const [message, setMessage] = useState(null) // { ok: true/false, text }
  // "Report a problem" opens a short form first: nothing is frozen until the
  // reason is chosen and confirmed.
  // The form belongs to one delivery (its id), so it never carries over when
  // another delivery is picked: the page itself stays open in between.
  const [reportingFor, setReportingFor] = useState(null)
  const [problem, setProblem] = useState('')

  const deliveries = [...state.deliveries].reverse() // newest first
  const delivery = deliveries.find((d) => d.id === id) || deliveries[0]

  // Motion is only for what changes while this page is open: a step card
  // rises in when the step changes, and an "Accepted" badge settles in when
  // someone accepts. Opening the page (or another delivery) shows everything
  // in place. So remember how the delivery looked when it was opened.
  const snapshot = (d) => ({ id: d?.id, status: d?.status, senderAccepted: d?.senderAccepted, carrierAccepted: d?.carrierAccepted })
  const [opened, setOpened] = useState(() => snapshot(delivery))
  if (delivery && opened.id !== delivery.id) setOpened(snapshot(delivery))
  const sameDelivery = delivery && opened.id === delivery.id
  const rise = sameDelivery && delivery.status !== opened.status ? 'enter-rise' : ''
  const justAccepted = (who) => sameDelivery && delivery[`${who}Accepted`] && !opened[`${who}Accepted`]

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

  // Is the signed-in demo person one of the two people in this delivery?
  const isSender = profile.role === 'sender' && profile.name === shipment.senderName
  const isCarrier = profile.role === 'carrier' && profile.name === journey.carrierName

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
    // The carrier has already left: this request can no longer go ahead.
    if (!isAvailable(journey)) {
      setMessage({ ok: false, text: `${isolate(journey.carrierName)}'s departure time has passed, so this request can no longer be accepted. Choose another carrier on the Matches page.` })
      return
    }
    const senderAccepted = who === 'sender' ? true : delivery.senderAccepted
    const carrierAccepted = who === 'carrier' ? true : delivery.carrierAccepted

    if (posthogEnabled) {
      posthog.capture('delivery_acceptance_recorded', {
        shipment_ref: shipment.id,
        accepted_by: who,
        match_confirmed: senderAccepted && carrierAccepted,
      })
    }

    if (senderAccepted && carrierAccepted) {
      // Both accepted: create the two one-time codes and hold the payment.
      const pickupOtp = generateOtp()
      const deliveryOtp = generateDifferentOtp(pickupOtp)
      update({
        senderAccepted, carrierAccepted, pickupOtp, deliveryOtp,
        status: DELIVERY.AWAITING_PICKUP, escrow: ESCROW.HELD,
      })
      // Booked: the one moment both sides have said yes. The message carries
      // the success tick (see below).
      setMessage({ ok: true, booked: true, text: `Match confirmed. ${amount} is now held in escrow.` })
      sendToWebhook('match', { ...record, escrow: ESCROW.HELD },
        `Match accepted: ${shipment.senderName} and ${journey.carrierName}`)
    } else {
      update({ senderAccepted, carrierAccepted })
      setMessage(null)
    }
  }

  // Carrier declines: this carrier is not offered the parcel again, and the
  // next-ranked carrier is offered on the Matches page. The parcel goes back
  // to "Carriers found" if another carrier still fits, and to "Unmatched –
  // Retrying" only if none does (the same check as "Withdraw request").
  function handleDecline() {
    const rejectedJourneyIds = [...shipment.rejectedJourneyIds, journey.id]
    const { eligible } = findMatches(shipment, state.journeys)
    const stillOpen = eligible.some((r) => !rejectedJourneyIds.includes(r.journey.id))
    update(
      { status: DELIVERY.DECLINED },
      { status: stillOpen ? STATUS.FOUND : STATUS.RETRYING, rejectedJourneyIds },
    )
    if (posthogEnabled) posthog.capture('delivery_request_declined', { shipment_ref: shipment.id })
    goTo(`matches/${shipment.id}`)
  }

  // The sender changes their mind before both have accepted: the request is
  // removed (no money has moved) and the parcel goes back to its carriers.
  // If the carrier had already accepted (they offered to carry it), they are
  // not offered this parcel again. The withdrawal is noted in the sync log.
  function handleWithdraw() {
    const rejectedJourneyIds = delivery.carrierAccepted
      ? [...shipment.rejectedJourneyIds, journey.id] : shipment.rejectedJourneyIds
    const { eligible } = findMatches(shipment, state.journeys)
    const stillOpen = eligible.some((r) => !rejectedJourneyIds.includes(r.journey.id))
    save({
      ...state,
      deliveries: state.deliveries.filter((d) => d.id !== delivery.id),
      shipments: state.shipments.map((s) => (s.id !== shipment.id ? s
        : { ...s, rejectedJourneyIds, status: stillOpen ? STATUS.FOUND : STATUS.RETRYING })),
    })
    noteInSyncLog('request_withdrawn',
      `Request withdrawn by ${shipment.senderName}: ${shipment.origin} to ${shipment.destination}, carrier ${journey.carrierName}`)
    if (posthogEnabled) {
      posthog.capture('delivery_request_withdrawn', {
        shipment_ref: shipment.id,
        carrier_had_accepted: delivery.carrierAccepted,
      })
    }
    goTo(`matches/${shipment.id}`)
  }

  // One line saying who acts next, so it is clear whose turn it is.
  function nextStep() {
    const sender = isolate(shipment.senderName)
    const carrier = isolate(journey.carrierName)
    switch (delivery.status) {
      case DELIVERY.AWAITING_ACCEPT: {
        const waiting = [!delivery.senderAccepted && sender, !delivery.carrierAccepted && carrier].filter(Boolean)
        return waiting.length === 2
          ? `Next: ${sender} and ${carrier} both accept. Nothing is paid until both have.`
          : `Next: ${waiting[0]} accepts. Nothing is paid until both have.`
      }
      case DELIVERY.AWAITING_PICKUP:
        return `Next: at pickup, ${sender} reads the pickup code to ${carrier}, who enters it.`
      case DELIVERY.IN_TRANSIT:
        return `Next: when the parcel arrives, the receiver reads the delivery code to ${carrier}, who enters it to release ${amount}.`
      case DELIVERY.DISPUTED:
        return `Next: a person on the Admin page decides who gets ${amount}.`
      default:
        return null
    }
  }
  const next = nextStep()
  const saving = calculateSaving(shipment.weightKg)

  // ---- Step 2: pickup code ---------------------------------------------
  function handlePickup(code) {
    if (code === delivery.pickupOtp) {
      update({ status: DELIVERY.IN_TRANSIT })
      if (posthogEnabled) posthog.capture('pickup_confirmed', { shipment_ref: shipment.id })
      setMessage({ ok: true, text: 'Pickup confirmed. The parcel is on its way.' })
    } else {
      setMessage({ ok: false, text: `Wrong pickup code. The parcel has not been handed over. Ask ${isolate(shipment.senderName)} to read the code again.` })
      return false
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
      setMessage({ ok: true, text: `Delivery confirmed. ${amount} released to ${isolate(journey.carrierName)}.` })
      if (posthogEnabled) posthog.capture('delivery_confirmed', { shipment_ref: shipment.id })
      sendToWebhook('delivery', { ...record, escrow: ESCROW.RELEASED, deliveredAt },
        `Delivery completed: ${amount} released to ${journey.carrierName}`)
    } else {
      // Wrong code: the money stays in escrow. After MAX_CODE_TRIES wrong
      // codes the delivery goes to an admin (escrow frozen), so the 4-digit
      // code cannot simply be guessed.
      const tries = delivery.wrongAttempts + 1
      if (tries >= MAX_CODE_TRIES) {
        const reason = `${MAX_CODE_TRIES} wrong delivery codes were entered`
        update(
          { wrongAttempts: tries, status: DELIVERY.DISPUTED, escrow: ESCROW.FROZEN, disputeReason: reason },
          { status: STATUS.DISPUTED },
        )
        setMessage({ ok: false, text: `Wrong delivery code again. After ${MAX_CODE_TRIES} wrong codes, ${amount} is frozen and an admin will check this delivery.` })
        if (posthogEnabled) posthog.capture('delivery_disputed', { shipment_ref: shipment.id, dispute_source: 'maximum_delivery_code_attempts' })
        sendToWebhook('dispute', { ...record, escrow: ESCROW.FROZEN },
          `Dispute raised: ${reason}, ${shipment.origin} to ${shipment.destination}`)
      } else {
        const left = MAX_CODE_TRIES - tries
        update({ wrongAttempts: tries })
        setMessage({ ok: false, text: `Wrong delivery code. ${amount} stays in escrow. ${left} ${left === 1 ? 'try' : 'tries'} left. Ask the receiver to read the code again.` })
      }
      return false
    }
  }

  // ---- Dispute: freeze the escrow and hand over to a human admin --------
  function handleDispute() {
    setReportingFor(null)
    update(
      { status: DELIVERY.DISPUTED, escrow: ESCROW.FROZEN, disputeReason: problem },
      { status: STATUS.DISPUTED },
    )
    setMessage({ ok: false, text: `Problem reported. ${amount} is frozen until an admin reviews it.` })
    if (posthogEnabled) posthog.capture('delivery_disputed', { shipment_ref: shipment.id, dispute_source: 'reported_problem', problem_category: problem })
    sendToWebhook('dispute', { ...record, escrow: ESCROW.FROZEN },
      `Dispute raised: ${shipment.origin} to ${shipment.destination}`)
  }

  const active = [DELIVERY.AWAITING_PICKUP, DELIVERY.IN_TRANSIT].includes(delivery.status)
  const reporting = reportingFor === delivery.id

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
                {s.origin} to {s.destination}, {s.weightKg} kg, {s.senderName}, {formatShort(d.createdAt)} ({d.status})
              </option>
            )
          })}
        </select>
      </div>

      <div className="grid gap-6 lg:grid-cols-[1fr_20rem]">
        <div className="space-y-6">
          {/* Progress along the route */}
          <section className="card">
            {/* Keyed by delivery, so switching deliveries redraws the tracker
                instead of sliding from one delivery's progress to another's */}
            <RouteLine key={delivery.id} origin={shipment.origin} destination={shipment.destination}
              stops={STOPS} todo={TODO} reached={REACHED[delivery.status] ?? 0}
              showCurrent={STILL_MOVING.includes(delivery.status)}
              problem={delivery.status === DELIVERY.DISPUTED} />
            <p className="mt-4 text-muted">
              {shipment.weightKg} kg {shipment.itemType.toLowerCase()} from {isolate(shipment.senderName)},
              carried by {isolate(journey.carrierName)} ({journey.vehicleType}), departing {formatDateTime(journey.departure)}.
            </p>
          </section>

          {/* Whose turn it is */}
          {next && (
            <p data-testid="next-step" className="rounded-lg border-l-4 border-hold bg-surface px-4 py-3 font-bold">
              {next}
            </p>
          )}

          {/* Result of the last action */}
          {message && (
            <p role="alert" data-testid="delivery-message" key={message.text}
              className={`rounded-lg px-4 py-3 font-bold fade-in-quick ${message.booked ? 'flex items-center gap-3' : ''} ${
                message.ok ? 'bg-brand-tint text-brand-ink' : 'bg-fail-tint text-fail'}`}>
              {/* Booked: the message appears quickly (150ms) so it does not hold
                  the tick back; the tick grows in, its check draws, and phones
                  that can vibrate tap twice as the check completes. The pickup
                  card and the tracker's road move at the same moment, so the
                  whole page answers the second "Accept" as one change. */}
              {message.booked && <SuccessTick animate />}
              {message.booked ? <span>{message.text}</span> : message.text}
            </p>
          )}

          {/* Step 1: both sides accept */}
          {delivery.status === DELIVERY.AWAITING_ACCEPT && (
            <section className={`card ${rise}`} data-testid="step-accept">
              <h2 className="text-xl font-bold">Accept the match</h2>
              <p className="mt-1 text-muted">
                Both people must accept before any money moves. You can only answer for the
                person you are signed in as.
              </p>
              <div className="mt-4 space-y-3">
                {/* The sender's row: only the sender can accept here */}
                <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg bg-sunk px-3 py-3">
                  <p><strong>{shipment.senderName}</strong> (sender)</p>
                  {delivery.senderAccepted ? <AcceptedBadge animate={justAccepted('sender')} />
                    : isSender ? (
                      <button type="button" className="btn btn-primary" data-testid="accept-sender"
                        onClick={() => handleAccept('sender')}>Accept</button>
                    ) : (
                      <button type="button" className="btn btn-secondary" data-testid="switch-to-sender"
                        onClick={() => setProfile({ role: 'sender', name: shipment.senderName })}>
                        Switch to {shipment.senderName}
                      </button>
                    )}
                </div>
                {/* The carrier's row: only the carrier can accept or decline here */}
                <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg bg-sunk px-3 py-3">
                  <p><strong>{journey.carrierName}</strong> (carrier)</p>
                  {delivery.carrierAccepted ? <AcceptedBadge animate={justAccepted('carrier')} />
                    : isCarrier ? (
                      <div className="flex flex-wrap gap-3">
                        <button type="button" className="btn btn-primary" data-testid="accept-carrier"
                          onClick={() => handleAccept('carrier')}>Accept</button>
                        <button type="button" className="btn btn-danger" data-testid="decline-carrier"
                          onClick={handleDecline}>Decline</button>
                      </div>
                    ) : (
                      <button type="button" className="btn btn-secondary" data-testid="switch-to-carrier"
                        onClick={() => setProfile({ role: 'carrier', name: journey.carrierName })}>
                        Switch to {journey.carrierName}
                      </button>
                    )}
                </div>
              </div>
              {/* The sender may take the request back while nothing is agreed */}
              {isSender && (
                <button type="button" className="btn btn-secondary mt-4" data-testid="withdraw-request"
                  onClick={handleWithdraw}>
                  Withdraw request
                </button>
              )}
            </section>
          )}

          {/* Step 2: pickup code */}
          {delivery.status === DELIVERY.AWAITING_PICKUP && (
            <section className={`card ${rise}`} data-testid="step-pickup">
              <h2 className="text-xl font-bold">Pickup</h2>
              <p className="mt-1 text-muted">
                {isolate(shipment.senderName)} reads this code to {isolate(journey.carrierName)} when handing over the parcel.
              </p>
              <div className="mt-4">
                <ParcelPass kind="Pickup" code={delivery.pickupOtp} codeTestId="pickup-otp"
                  shipment={shipment} journey={journey} />
              </div>
              {isCarrier ? (
                <CodeForm id="pickup-code" label="Carrier enters the pickup code"
                  buttonText="Confirm pickup" onSubmit={handlePickup} />
              ) : (
                <CarrierOnly carrierName={journey.carrierName} setProfile={setProfile} />
              )}
            </section>
          )}

          {/* Step 3: delivery code */}
          {delivery.status === DELIVERY.IN_TRANSIT && (
            <section className={`card ${rise}`} data-testid="step-delivery">
              <h2 className="text-xl font-bold">Delivery</h2>
              <p className="mt-1 text-muted">
                The receiver reads this code to {isolate(journey.carrierName)} once the parcel arrives safely.
              </p>
              <div className="mt-4">
                <ParcelPass kind="Delivery" code={delivery.deliveryOtp} codeTestId="delivery-otp"
                  shipment={shipment} journey={journey} />
              </div>
              {isCarrier ? (
                <CodeForm id="delivery-code" label="Carrier enters the delivery code"
                  buttonText="Confirm delivery" onSubmit={handleDelivery} />
              ) : (
                <CarrierOnly carrierName={journey.carrierName} setProfile={setProfile} />
              )}
            </section>
          )}

          {/* Finished states */}
          {delivery.status === DELIVERY.DELIVERED && (
            <section className={`card ${rise} border-brand-ink bg-brand-tint`} data-testid="step-done">
              {/* The tick draws itself only right after the delivery code is
                  confirmed, not every time a finished delivery is opened. */}
              <h2 className="flex items-center gap-3 text-xl font-bold text-brand-ink">
                <SuccessTick animate={message?.ok === true} />
                Delivered and paid
              </h2>
              <p className="mt-1">
                {amount} was released to {isolate(journey.carrierName)}
                {delivery.deliveredAt ? ` on ${formatDateTime(delivery.deliveredAt)}` : ''}.
              </p>
              <p className="mt-2" data-testid="outcome">
                {saving > 0
                  ? `${isolate(shipment.senderName)} paid about ${formatPKR(saving)} less than our PKR 1,000 courier estimate, and ${isolate(journey.carrierName)} earned ${amount} on a trip that was happening anyway.`
                  : `${isolate(journey.carrierName)} earned ${amount} on a trip that was happening anyway.`}
              </p>
              <a href="#/dashboard" className="btn btn-secondary mt-4">See the dashboard</a>
            </section>
          )}
          {delivery.status === DELIVERY.DISPUTED && (
            <section className={`card ${rise} border-fail bg-fail-tint`}>
              <h2 className="text-xl font-bold text-fail">Under admin review</h2>
              <p className="mt-1">{delivery.disputeReason}. The payment is frozen until a person decides.</p>
              <a href="#/admin" className="btn btn-secondary mt-4">Open admin</a>
            </section>
          )}
          {delivery.status === DELIVERY.DECLINED && (
            <section className={`card ${rise}`}>
              <h2 className="text-xl font-bold">{delivery.expired ? 'Request expired' : 'Carrier declined'}</h2>
              <p className="mt-1">
                {delivery.expired
                  ? `${isolate(journey.carrierName)}'s departure time passed before both had accepted. `
                  : ''}
                No money moved. The next-ranked carrier is offered on the Matches page.
              </p>
              <a href={`#/matches/${shipment.id}`} className="btn btn-primary mt-4">See next carrier</a>
            </section>
          )}
          {delivery.status === DELIVERY.REFUNDED && (
            <section className={`card ${rise}`}>
              <h2 className="text-xl font-bold">Refunded</h2>
              <p className="mt-1">An admin reviewed the dispute and returned {amount} to {isolate(shipment.senderName)}.</p>
            </section>
          )}

          {/* Report a problem (only while the delivery is under way) */}
          {active && !reporting && (
            <button type="button" className="btn btn-danger" data-testid="report-problem"
              onClick={() => { setProblem(''); setReportingFor(delivery.id) }}>
              Report a problem
            </button>
          )}
          {active && reporting && (
            <section className="card enter-rise border-fail" data-testid="report-form">
              {/* Opened by pressing "Report a problem", so it always rises in. */}
              <h2 className="text-xl font-bold">Report a problem</h2>
              <p className="mt-1">
                {amount} will be frozen until a person on the Admin page decides who gets it.
              </p>
              <fieldset className="mt-3 space-y-1">
                <legend className="label">What went wrong?</legend>
                {PROBLEMS.map((text) => (
                  <label key={text} className="flex min-h-12 cursor-pointer items-center gap-3 rounded-lg px-2 active:bg-fail-tint hover:bg-fail-tint">
                    <input type="radio" name="problem" className="size-5 shrink-0 accent-fail"
                      checked={problem === text} onChange={() => setProblem(text)} />
                    <span>{text}</span>
                  </label>
                ))}
              </fieldset>
              <div className="mt-4 flex flex-wrap gap-3">
                <button type="button" className="btn btn-danger" disabled={!problem}
                  onClick={handleDispute} data-testid="confirm-problem">
                  Freeze payment and report
                </button>
                <button type="button" className="btn btn-secondary" onClick={() => setReportingFor(null)}>
                  Cancel
                </button>
              </div>
            </section>
          )}
        </div>

        {/* Escrow panel */}
        <aside className="card h-fit" data-testid="escrow-panel">
          <h2 className="text-xl font-bold">Escrow</h2>
          <p className="mt-2 font-display text-4xl font-bold tabular-nums text-brand-ink">{amount}</p>
          <p className="mt-2" data-testid="escrow-status"><StatusBadge status={delivery.escrow} /></p>
          <p className="mt-3 text-sm text-muted">
            Escrow means RaastaShare holds the money safely: it is held when both sides
            accept and paid to the carrier only when the correct delivery code is entered.
            The payment is simulated in this demo.
          </p>
          {delivery.wrongAttempts > 0 && delivery.escrow === ESCROW.HELD && (
            <p className="mt-2 text-sm text-fail">
              Wrong delivery codes entered: {delivery.wrongAttempts} of {MAX_CODE_TRIES}
            </p>
          )}
        </aside>
      </div>
    </div>
  )
}
