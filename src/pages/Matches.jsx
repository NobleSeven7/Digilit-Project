// Matches page: ranked carriers for one shipment, and for every carrier
// the result of each of the four rules, so the decision is transparent.
import { useEffect, useState } from 'react'
import { STATUS, DELIVERY, FLAG_AFTER_HOURS, TIME_BUFFER_HOURS, COURIER_FEE } from '../data/constants.js'
import { findMatches, withSpaceLeft } from '../lib/matching.js'
import { calculatePrice, calculateSaving } from '../lib/pricing.js'
import { goTo } from '../lib/navigation.js'
import { wasJustPosted, clearJustPosted } from '../lib/motion.js'
import { startDelivery } from '../lib/delivery.js'
import { formatPKR, formatDateTime, formatShort, pickerLabels, buttonName, vehicleLabel } from '../lib/format.js'
import PageHeader from '../components/PageHeader.jsx'
import RouteLine from '../components/RouteLine.jsx'
import { codeOf } from '../components/RouteCodes.jsx'
import RuleCheck from '../components/RuleCheck.jsx'
import StatusBadge from '../components/StatusBadge.jsx'
import { VehicleIcon, CheckIcon, ChevronDownIcon } from '../components/Icons.jsx'
import posthog, { posthogEnabled } from '../lib/posthog.js'
import { ratingOf } from '../lib/ratings.js'
import Stars from '../components/Stars.jsx'

// The score out of 100, with a small bar that fills to the same amount.
function ScoreBadge({ total }) {
  const rounded = Math.round(total)
  return (
    // Phones: the score wraps under the name, so it lines up on the left with
    // its bar; wider screens put it on the right of the card.
    <div className="sm:text-right">
      <p className="font-display text-4xl font-bold leading-none tabular-nums text-brand-ink" data-testid="score">
        {rounded}
        <span className="text-lg text-muted"> / 100</span>
      </p>
      <div className="mt-2 h-2 w-28 sm:ml-auto rounded-full bg-brand-tint" role="img"
        aria-label={`Score ${rounded} out of 100`}>
        <div className="h-2 rounded-full bg-brand-ink" style={{ width: `${Math.min(100, total)}%` }} />
      </div>
    </div>
  )
}

// A compact "passed" chip for one rule (used on eligible carriers).
function PassChip({ rule }) {
  return (
    <li data-rule={rule.key} data-pass={rule.pass}
      className="inline-flex items-center gap-1.5 rounded-full bg-brand-tint px-3 py-1 stamp text-sm text-brand-ink">
      <CheckIcon size={14} />
      {rule.label}
      <span className="sr-only">: Pass</span>
    </li>
  )
}

// How the ranked carriers arrive: one wave, played once.
// - The best match leads: it starts first, rises furthest and takes longest.
// - Options 2 and 3 follow with shrinking gaps and less travel, so the three
//   read as one movement settling, not separate entrances. Options 4 and 5
//   (when there are that many) arrive with option 3 and only fade. The wave
//   is over in 300ms, and every card can be pressed as soon as it shows.
// - Everything else on the page stays still: the heading, the parcel summary,
//   "Show all" and the not-available list.
// It plays only right after the parcel is posted (src/lib/motion.js,
// markJustPosted); opening Matches any other way shows them in place.
const WAVE = [
  { delay: 0, rise: 12, duration: 280 },   // best match
  { delay: 60, rise: 6, duration: 220 },   // option 2
  { delay: 100, rise: 4, duration: 200 },  // option 3
]
const WAVE_REST = { delay: 100, rise: 0, duration: 200 } // options 4 and 5
// Cards revealed by pressing "Show all" answer that press: they fade in
// together, with no wave.
const REVEALED = { className: 'fade-in-quick' }

function arrival(rank, wave) {
  if (!rank) return {}
  if (rank > FIRST_SHOWN) return REVEALED
  if (!wave) return {}
  const { delay, rise, duration } = WAVE[rank - 1] || WAVE_REST
  return {
    className: 'enter-rise',
    style: { '--delay': `${delay}ms`, '--rise': `${rise}px`, '--duration': `${duration}ms` },
  }
}

function CarrierCard({ result, rank, wave, shipment, declined, canRequest, onRequest, rating }) {
  const { journey, rules, eligible, score } = result
  const usedPercent = Math.round((shipment.weightKg / journey.spareKg) * 100)
  const showChips = eligible && !declined // passed everything: keep it compact
  const passedCount = rules.filter((rule) => rule.pass).length

  return (
    <li
      data-testid="carrier-card"
      data-carrier={journey.carrierName}
      data-eligible={eligible && !declined}
      className={`card ${arrival(rank, wave).className ?? ''} ${rank === 1 ? 'border-2 border-brand-ink' : ''}`}
      style={arrival(rank, wave).style}
    >
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="flex min-w-0 items-start gap-3">
          {/* Vehicle icon */}
          <span className="flex size-11 shrink-0 items-center justify-center rounded-full bg-brand-tint text-brand-ink"
            title={vehicleLabel(journey.vehicleType)}>
            <VehicleIcon type={journey.vehicleType} />
          </span>
          <div className="min-w-0">
            {rank && (
              <p className="stamp text-sm text-brand-ink">
                {rank === 1 ? 'Best match' : `Option ${rank}`}
              </p>
            )}
            <h3 className="text-xl font-bold">{journey.carrierName}</h3>
            {/* Shown, not scored: the ranking stays the four published rules */}
            {rating && <p className="mt-0.5"><Stars rating={rating} testId="carrier-rating" /></p>}
            <p className="text-sm text-muted">
              {vehicleLabel(journey.vehicleType)}, {journey.spareKg} kg spare{journey.postedSpareKg !== undefined ? ' left' : ''}, departs {formatDateTime(journey.departure)}
            </p>
          </div>
        </div>

        {/* Score out of 100 (eligible carriers only) */}
        {score && <ScoreBadge total={score.total} />}
        {!eligible && <StatusBadge status="Not eligible" />}
        {declined && <StatusBadge status={declined === 'cancelled' ? DELIVERY.CANCELLED : DELIVERY.DECLINED} />}
      </div>

      {showChips ? (
        <>
          {/* Passed all four rules: one row of chips, details on request */}
          <ul aria-label="Rule checks" className="mt-4 flex flex-wrap gap-2">
            {rules.map((rule) => <PassChip key={rule.key} rule={rule} />)}
          </ul>
          <details className="rule-details group mt-3">
            <summary className="inline-flex min-h-11 cursor-pointer list-none items-center gap-1.5 rounded-lg font-bold text-brand-ink active:opacity-70
                                [&::-webkit-details-marker]:hidden">
              <span className="group-open:hidden">See details</span>
              <span className="hidden group-open:inline">Hide details</span>
              <ChevronDownIcon size={18} className="transition-transform duration-(--dur-base) ease-[var(--ease-out)] group-open:rotate-180 motion-reduce:transition-none" />
            </summary>
            <ul className="mt-2 grid gap-2 sm:grid-cols-2">
              {rules.map((rule) => <RuleCheck key={rule.key} rule={rule} />)}
            </ul>
            <p className="mt-3 text-sm text-muted">
              Score: time buffer {score.timeBuffer} + capacity fit {Math.round(score.capacityFit * 10) / 10}{' '}
              (50 × {shipment.weightKg} kg ÷ {journey.spareKg} kg). Uses {usedPercent}% of this carrier's spare space.
            </p>
          </details>
        </>
      ) : (
        /* Not eligible (or declined): only the rule that failed, so the reason
           is clear without a long list; the other checks open on request.
           (A carrier who declined passed every rule: the badge says why.) */
        <>
          {rules.some((rule) => !rule.pass) && (
            <ul className="mt-4 grid gap-2 sm:grid-cols-2">
              {rules.filter((rule) => !rule.pass).map((rule) => <RuleCheck key={rule.key} rule={rule} />)}
            </ul>
          )}
          <details className="rule-details group mt-2">
            <summary className="inline-flex min-h-11 cursor-pointer list-none items-center gap-1.5 rounded-lg font-bold text-brand-ink active:opacity-70
                                [&::-webkit-details-marker]:hidden">
              <span className="group-open:hidden">See the {passedCount} {passedCount === 1 ? 'check' : 'checks'} passed</span>
              <span className="hidden group-open:inline">Hide passed checks</span>
              <ChevronDownIcon size={18} className="transition-transform duration-(--dur-base) ease-[var(--ease-out)] group-open:rotate-180 motion-reduce:transition-none" />
            </summary>
            <ul className="mt-2 grid gap-2 sm:grid-cols-2">
              {rules.filter((rule) => rule.pass).map((rule) => <RuleCheck key={rule.key} rule={rule} />)}
            </ul>
          </details>
        </>
      )}

      {eligible && !declined && canRequest && (
        <button type="button" className={`btn mt-4 w-full sm:w-auto ${rank === 1 ? 'btn-primary' : 'btn-secondary'}`}
          onClick={() => onRequest(journey)} data-testid="request-carrier">
          Request {buttonName(journey.carrierName, 'this carrier')}
        </button>
      )}
    </li>
  )
}

// One parcel in the picker: short, so it is not cut off on a phone. The
// sender, time and status are shown under the picker instead.
function ShipmentOption({ shipment: s, labels }) {
  return <option value={s.id}>{labels.get(s.id)}</option>
}

// Someone else's parcel: say who can request a carrier, with a one-tap switch
// (the same idea as "Only the carrier enters this code" on the Delivery page).
function SenderOnly({ senderName, setProfile }) {
  return (
    <div className="mb-6 rounded-lg bg-sunk px-3 py-3" data-testid="sender-only">
      <p>Only <strong>{senderName}</strong> (the sender) can request a carrier for this parcel.</p>
      {setProfile && (
        <button type="button" className="btn btn-secondary mt-3" data-testid="switch-to-sender"
          onClick={() => setProfile({ role: 'sender', name: senderName })}>
          Switch to {buttonName(senderName, 'the sender')}
        </button>
      )}
    </div>
  )
}

// On a busy route the lists can be long, so each starts with this many cards.
const FIRST_SHOWN = 5

// "Show all 30 carriers": a plain button under a shortened list.
function ShowAll({ total, onClick }) {
  return (
    <button type="button" className="btn btn-secondary mt-4 w-full sm:w-auto" onClick={onClick}>
      Show all {total}
    </button>
  )
}

export default function Matches({ state, save, id, profile, setProfile }) {
  // Which lists are opened in full: "shipmentId:eligible" / "shipmentId:other".
  const [opened, setOpened] = useState([])

  // Newest shipments first in the picker, the signed-in sender's own first.
  const isMine = (s) => profile.role === 'sender' && s.senderName === profile.name
  const shipments = [...state.shipments].reverse()
  const mine = shipments.filter(isMine)
  const others = shipments.filter((s) => !isMine(s))
  const labels = pickerLabels(shipments.map((s) => ({
    id: s.id, base: `${codeOf(s.origin)} to ${codeOf(s.destination)}, ${s.weightKg} kg`, at: s.createdAt })))
  // Show the shipment named in the address bar, or the sender's newest one
  // (or the newest of all, when they have none).
  const shipment = shipments.find((s) => s.id === id) || mine[0] || shipments[0]

  // Does this parcel's wave play? Only when it was posted a moment ago; any
  // other parcel picked here shows its results in place.
  const [wave, setWave] = useState(() => ({ id: shipment?.id, on: Boolean(shipment) && wasJustPosted(shipment.id) }))
  if (shipment && wave.id !== shipment.id) setWave({ id: shipment.id, on: false })
  useEffect(() => { clearJustPosted() }, [])

  if (!shipment) {
    return (
      <div>
        <PageHeader title="Matches" />
        <div className="card">
          <p>No parcels yet. Post one to see ranked carriers.</p>
          <a href="#/sender" className="btn btn-primary mt-4">Post a parcel</a>
        </div>
      </div>
    )
  }

  // Run the matching engine (it is fast, so we simply run it on every render).
  // Carriers' space is what is still free, not counting this parcel's own booking.
  const { eligible, ineligible } = findMatches(shipment, withSpaceLeft(state, shipment.id))
  // Carriers who declined this request drop out of the ranking.
  const offered = eligible.filter((r) => !shipment.rejectedJourneyIds.includes(r.journey.id))
  const declined = eligible.filter((r) => shipment.rejectedJourneyIds.includes(r.journey.id))

  const delivery = state.deliveries.find(
    (d) => d.shipmentId === shipment.id && d.status !== DELIVERY.DECLINED && d.status !== DELIVERY.CANCELLED)
  // A carrier dropped because the delivery with them was cancelled before
  // pickup (not because they declined) is labelled "Cancelled".
  const cancelledWith = new Set(state.deliveries
    .filter((d) => d.shipmentId === shipment.id && d.status === DELIVERY.CANCELLED).map((d) => d.journeyId))
  // Only this parcel's own sender can request a carrier, and only while the
  // shipment is still open.
  const ownParcel = isMine(shipment)
  const isOpenRequest = [STATUS.FOUND, STATUS.RETRYING, STATUS.FLAGGED].includes(shipment.status)
  // A parcel the item check marked "possibly prohibited" waits for an admin first.
  const awaitingReview = shipment.aiFlag === 'pending'
  const canRequest = ownParcel && isOpenRequest && !awaitingReview
  const price = calculatePrice(shipment.weightKg)

  // Long lists show the first few cards until "Show all" is pressed.
  const isOpen = (list) => opened.includes(`${shipment.id}:${list}`)
  const open = (list) => setOpened([...opened, `${shipment.id}:${list}`])
  const shownOffered = isOpen('eligible') ? offered : offered.slice(0, FIRST_SHOWN)
  const notAvailable = [...declined.map((r) => ({ ...r, declined: cancelledWith.has(r.journey.id) ? 'cancelled' : true })), ...ineligible]
  const shownOthers = isOpen('other') ? notAvailable : notAvailable.slice(0, FIRST_SHOWN)

  // Sender picks a carrier: create a delivery that both sides must accept.
  function handleRequest(journey) {
    const { newState, delivery: newDelivery } = startDelivery(state, shipment, journey)
    save(newState)
    if (posthogEnabled) {
      posthog.capture('delivery_request_created', {
        shipment_ref: shipment.id,
        initiated_by: 'sender',
        item_type: shipment.itemType,
        weight_kg: shipment.weightKg,
        vehicle_type: journey.vehicleType,
        carrier_rank: eligible.findIndex((result) => result.journey.id === journey.id) + 1,
      })
    }
    goTo(`delivery/${newDelivery.id}`)
  }

  return (
    <div>
      <PageHeader title="Matches">
        Every carrier is checked against four rules. Those that pass all four are
        ranked by a score out of 100.
      </PageHeader>

      {/* Pick which shipment to look at */}
      <div className="mb-6 max-w-xl">
        <label className="label" htmlFor="shipmentPicker">Parcel</label>
        <select id="shipmentPicker" className="field" value={shipment.id}
          onChange={(e) => goTo(`matches/${e.target.value}`)}>
          {mine.length > 0 && (
            <optgroup label="Your parcels">
              {mine.map((s) => <ShipmentOption key={s.id} shipment={s} labels={labels} />)}
            </optgroup>
          )}
          {others.length > 0 && (
            <optgroup label={mine.length > 0 ? 'Other senders' : 'All parcels'}>
              {others.map((s) => <ShipmentOption key={s.id} shipment={s} labels={labels} />)}
            </optgroup>
          )}
        </select>
        <p className="hint" data-testid="parcel-details">
          {shipment.weightKg} kg {shipment.itemType.toLowerCase()} from {shipment.senderName}, posted {formatShort(shipment.createdAt)}.
        </p>
      </div>

      {/* Shipment summary */}
      <section className="card mb-6" data-testid="shipment-summary">
        {/* Phones: the route on one line, so the ranked carriers start on the
            first screen. Wider screens keep the full route line. */}
        <p className="font-display text-2xl font-bold sm:hidden">
          {codeOf(shipment.origin)} → {codeOf(shipment.destination)}{' '}
          <span className="font-sans text-base font-normal text-muted">{shipment.origin} to {shipment.destination}</span>
        </p>
        <div className="hidden sm:block">
          <RouteLine origin={shipment.origin} destination={shipment.destination} />
        </div>
        <div className="mt-3 flex flex-wrap items-center gap-x-6 gap-y-2 sm:mt-4">
          <p><strong>{shipment.weightKg} kg</strong> {shipment.itemType.toLowerCase()}</p>
          <p>Deadline <strong>{formatDateTime(shipment.deadline)}</strong></p>
          <p>Price <strong>{formatPKR(price)}</strong></p>
          <StatusBadge status={shipment.status} />
        </div>
        {calculateSaving(shipment.weightKg) > 0 && (
          <p className="mt-2 text-sm text-muted">
            About {formatPKR(calculateSaving(shipment.weightKg))} less than our {formatPKR(COURIER_FEE)} courier estimate.
          </p>
        )}
        {delivery && (
          <a href={`#/delivery/${delivery.id}`} className="btn btn-primary mt-4">Open delivery</a>
        )}
      </section>

      {/* Possibly prohibited: no carrier can be asked until an admin allows it */}
      {awaitingReview && isOpenRequest && (
        <div className="card mb-6 border-hold bg-hold-tint" data-testid="awaiting-review">
          <p className="font-bold">An admin checks this item before any carrier is asked.</p>
          <p className="mt-1">The item check said it may be prohibited. Until a person allows it on the Admin page, carriers do not see this parcel.</p>
        </div>
      )}

      {/* Someone else's open parcel: only its sender can request a carrier */}
      {!ownParcel && isOpenRequest && !awaitingReview && (
        <SenderOnly senderName={shipment.senderName} setProfile={setProfile} />
      )}

      {/* Eligible carriers, ranked */}
      <section className="mb-8">
        <h2 className="mb-3 text-2xl font-bold" data-testid="eligible-heading">
          {offered.length === 0 ? 'No carriers yet'
            : `${offered.length} eligible ${offered.length === 1 ? 'carrier' : 'carriers'}, ranked`}
        </h2>
        {offered.length === 0 ? (
          <div className="card border-hold bg-hold-tint" data-testid="no-match">
            <p className="font-bold">None of the carriers posted so far pass all four rules for this parcel.</p>
            <p className="mt-1">
              You don’t need to do anything. We check again every time a new journey is
              posted. If no carrier fits within {FLAG_AFTER_HOURS} hours, a person on our team
              looks at your request.
            </p>
          </div>
        ) : (
          <>
            <ol className="space-y-4" key={shipment.id}>
              {shownOffered.map((result, index) => (
                <CarrierCard key={result.journey.id} result={result} rank={index + 1} wave={wave.on}
                  shipment={shipment} canRequest={canRequest} onRequest={handleRequest}
                  rating={ratingOf(result.journey.carrierName, state.ratings)} />
              ))}
            </ol>
            {shownOffered.length < offered.length && (
              <ShowAll total={`${offered.length} eligible carriers`} onClick={() => open('eligible')} />
            )}
          </>
        )}
      </section>

      {/* The published score formula (transparency) */}
      {/* Opens smoothly, like "See details" on each card (.rule-details) */}
      <details className="rule-details group card mb-8">
        {/* The same turning arrow as "See details", so it reads as something that opens */}
        <summary className="flex min-h-11 cursor-pointer list-none items-center gap-1.5 font-bold active:opacity-70 [&::-webkit-details-marker]:hidden">
          How the score is calculated
          <ChevronDownIcon size={18} className="transition-transform duration-(--dur-base) ease-[var(--ease-out)] group-open:rotate-180 motion-reduce:transition-none" />
        </summary>
        <ul className="mt-3 list-disc space-y-1 pl-5">
          <li>Time buffer: 50 points if the carrier departs at least {TIME_BUFFER_HOURS} hours before your deadline, otherwise 25.</li>
          <li>Capacity fit: 50 × (parcel kg ÷ carrier spare kg). A fuller fit scores higher.</li>
          <li>The two are added for a total out of 100. The highest total is suggested first.</li>
        </ul>
      </details>

      {/* Carriers that were rejected, with the reason */}
      {(ineligible.length > 0 || declined.length > 0) && (
        <section>
          <h2 className="mb-3 text-2xl font-bold">
            {ineligible.length + declined.length} not available, and why
          </h2>
          <ul className="space-y-4">
            {shownOthers.map((result) => (
              <CarrierCard key={result.journey.id} result={result} shipment={shipment} declined={result.declined}
                rating={ratingOf(result.journey.carrierName, state.ratings)} />
            ))}
          </ul>
          {shownOthers.length < notAvailable.length && (
            <ShowAll total={`${notAvailable.length} not available`} onClick={() => open('other')} />
          )}
        </section>
      )}
    </div>
  )
}
