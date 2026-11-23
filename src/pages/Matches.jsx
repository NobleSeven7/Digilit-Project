// Matches page: ranked carriers for one shipment, and for every carrier
// the result of each of the four rules, so the decision is transparent.
import { useState } from 'react'
import { STATUS, DELIVERY, FLAG_AFTER_HOURS } from '../data/constants.js'
import { findMatches } from '../lib/matching.js'
import { calculatePrice, calculateSaving } from '../lib/pricing.js'
import { goTo } from '../lib/navigation.js'
import { track } from '../lib/analytics.js'
import { startDelivery } from '../lib/delivery.js'
import { formatPKR, formatDateTime, formatShort } from '../lib/format.js'
import PageHeader from '../components/PageHeader.jsx'
import RouteLine from '../components/RouteLine.jsx'
import RuleCheck from '../components/RuleCheck.jsx'
import StatusBadge from '../components/StatusBadge.jsx'
import { VehicleIcon, CheckIcon, ChevronDownIcon } from '../components/Icons.jsx'

// The score out of 100, with a small bar that fills to the same amount.
function ScoreBadge({ total }) {
  const rounded = Math.round(total)
  return (
    <div className="text-right">
      <p className="font-display text-4xl font-bold leading-none text-brand-ink" data-testid="score">
        {rounded}
        <span className="text-lg text-muted"> / 100</span>
      </p>
      <div className="ml-auto mt-2 h-2 w-28 rounded-full bg-brand-tint" role="img"
        aria-label={`Score ${rounded} out of 100`}>
        <div className="h-2 rounded-full bg-brand" style={{ width: `${Math.min(100, total)}%` }} />
      </div>
    </div>
  )
}

// A compact "passed" chip for one rule (used on eligible carriers).
function PassChip({ rule }) {
  return (
    <li data-rule={rule.key} data-pass={rule.pass}
      className="inline-flex items-center gap-1.5 rounded-full bg-brand-tint px-3 py-1 text-sm font-bold text-brand-ink">
      <CheckIcon size={14} />
      {rule.label}
      <span className="sr-only">: Pass</span>
    </li>
  )
}

// One carrier card. "rank" is set only for eligible carriers.
// Ranked carriers arrive one after another, best first, with shrinking gaps
// (0, 80, 140, 190 ms, then the rest together) so the group reads as one wave.
// The best match rises the furthest. Not-eligible carriers do not move.
const ARRIVE_DELAY = [0, 80, 140, 190]
function arrival(rank) {
  if (!rank) return {}
  return {
    className: 'enter-rise',
    style: { '--delay': `${ARRIVE_DELAY[Math.min(rank, ARRIVE_DELAY.length) - 1]}ms`, '--rise': rank === 1 ? '10px' : '6px' },
  }
}

function CarrierCard({ result, rank, shipment, declined, canRequest, onRequest }) {
  const { journey, rules, eligible, score } = result
  const usedPercent = Math.round((shipment.weightKg / journey.spareKg) * 100)
  const showChips = eligible && !declined // passed everything: keep it compact

  return (
    <li
      data-testid="carrier-card"
      data-carrier={journey.carrierName}
      data-eligible={eligible && !declined}
      className={`card ${arrival(rank).className ?? ''} ${rank === 1 ? 'border-2 border-brand-ink' : ''}`}
      style={arrival(rank).style}
    >
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="flex min-w-0 items-start gap-3">
          {/* Vehicle icon */}
          <span className="flex size-11 shrink-0 items-center justify-center rounded-full bg-brand-tint text-brand-ink"
            title={journey.vehicleType}>
            <VehicleIcon type={journey.vehicleType} />
          </span>
          <div className="min-w-0">
            {rank && (
              <p className="text-sm font-bold text-brand-ink">
                {rank === 1 ? 'Best match' : `Option ${rank}`}
              </p>
            )}
            <h3 className="text-xl font-bold">{journey.carrierName}</h3>
            <p className="text-sm text-muted">
              {journey.vehicleType}, {journey.spareKg} kg spare, departs {formatDateTime(journey.departure)}
            </p>
          </div>
        </div>

        {/* Score out of 100 (eligible carriers only) */}
        {score && <ScoreBadge total={score.total} />}
        {!eligible && <StatusBadge status="Not eligible" />}
        {declined && <StatusBadge status={DELIVERY.DECLINED} />}
      </div>

      {showChips ? (
        <>
          {/* Passed all four rules: one row of chips, details on request */}
          <ul aria-label="Rule checks" className="mt-4 flex flex-wrap gap-2">
            {rules.map((rule) => <PassChip key={rule.key} rule={rule} />)}
          </ul>
          <details className="rule-details group mt-3">
            <summary className="inline-flex min-h-11 cursor-pointer list-none items-center gap-1.5 rounded-lg font-bold text-brand-ink
                                [&::-webkit-details-marker]:hidden">
              <span className="group-open:hidden">See details</span>
              <span className="hidden group-open:inline">Hide details</span>
              <ChevronDownIcon size={18} className="transition-transform duration-200 group-open:rotate-180 motion-reduce:transition-none" />
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
        /* Not eligible (or declined): show every rule in full so the reason is clear */
        <ul className="mt-4 grid gap-2 sm:grid-cols-2">
          {rules.map((rule) => <RuleCheck key={rule.key} rule={rule} />)}
        </ul>
      )}

      {eligible && !declined && canRequest && (
        <button type="button" className={`btn mt-4 w-full sm:w-auto ${rank === 1 ? 'btn-primary' : 'btn-secondary'}`}
          onClick={() => onRequest(journey)} data-testid="request-carrier">
          Request {journey.carrierName}
        </button>
      )}
    </li>
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

export default function Matches({ state, save, id }) {
  // Which lists are opened in full: "shipmentId:eligible" / "shipmentId:other".
  const [opened, setOpened] = useState([])

  // Newest shipments first in the picker.
  const shipments = [...state.shipments].reverse()
  // Show the shipment named in the address bar, or the newest one.
  const shipment = shipments.find((s) => s.id === id) || shipments[0]

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
  const { eligible, ineligible } = findMatches(shipment, state.journeys)
  // Carriers who declined this request drop out of the ranking.
  const offered = eligible.filter((r) => !shipment.rejectedJourneyIds.includes(r.journey.id))
  const declined = eligible.filter((r) => shipment.rejectedJourneyIds.includes(r.journey.id))

  const delivery = state.deliveries.find(
    (d) => d.shipmentId === shipment.id && d.status !== DELIVERY.DECLINED)
  // The sender can request a carrier only while the shipment is still open.
  const canRequest = [STATUS.FOUND, STATUS.RETRYING, STATUS.FLAGGED].includes(shipment.status)
  const price = calculatePrice(shipment.weightKg)

  // Long lists show the first few cards until "Show all" is pressed.
  const isOpen = (list) => opened.includes(`${shipment.id}:${list}`)
  const open = (list) => setOpened([...opened, `${shipment.id}:${list}`])
  const shownOffered = isOpen('eligible') ? offered : offered.slice(0, FIRST_SHOWN)
  const others = [...declined.map((r) => ({ ...r, declined: true })), ...ineligible]
  const shownOthers = isOpen('other') ? others : others.slice(0, FIRST_SHOWN)

  // Sender picks a carrier: create a delivery that both sides must accept.
  function handleRequest(journey) {
    const { newState, delivery: newDelivery } = startDelivery(state, shipment, journey)
    save(newState)
    track('carrier_requested', {
      origin: shipment.origin, destination: shipment.destination,
      item_type: shipment.itemType, weight_kg: shipment.weightKg,
      price_pkr: newDelivery.price,
    })
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
          {shipments.map((s) => (
            <option key={s.id} value={s.id}>
              {s.origin} to {s.destination}, {s.weightKg} kg {s.itemType.toLowerCase()}, {s.senderName}, {formatShort(s.createdAt)} ({s.status})
            </option>
          ))}
        </select>
      </div>

      {/* Shipment summary */}
      <section className="card mb-6" data-testid="shipment-summary">
        <RouteLine origin={shipment.origin} destination={shipment.destination} />
        <div className="mt-4 flex flex-wrap items-center gap-x-6 gap-y-2">
          <p><strong>{shipment.weightKg} kg</strong> {shipment.itemType.toLowerCase()}</p>
          <p>Deadline <strong>{formatDateTime(shipment.deadline)}</strong></p>
          <p>Price <strong>{formatPKR(price)}</strong></p>
          <StatusBadge status={shipment.status} />
        </div>
        {calculateSaving(shipment.weightKg) > 0 && (
          <p className="mt-2 text-sm text-muted">
            About {formatPKR(calculateSaving(shipment.weightKg))} less than a PKR 1,000 courier.
          </p>
        )}
        {delivery && (
          <a href={`#/delivery/${delivery.id}`} className="btn btn-primary mt-4">Open delivery</a>
        )}
      </section>

      {/* The published score formula (transparency) */}
      <details className="card mb-6">
        <summary className="flex min-h-11 cursor-pointer items-center font-bold">How the score is calculated</summary>
        <ul className="mt-3 list-disc space-y-1 pl-5">
          <li>Time buffer: 50 points if the carrier departs at least 6 hours before your deadline, otherwise 25.</li>
          <li>Capacity fit: 50 × (parcel kg ÷ carrier spare kg). A fuller fit scores higher.</li>
          <li>The two are added for a total out of 100. The highest total is suggested first.</li>
        </ul>
      </details>

      {/* Eligible carriers, ranked */}
      <section className="mb-8">
        <h2 className="mb-3 text-2xl font-bold" data-testid="eligible-heading">
          {offered.length} eligible {offered.length === 1 ? 'carrier' : 'carriers'}, ranked
        </h2>
        {offered.length === 0 ? (
          <div className="card border-hold bg-hold-tint" data-testid="no-match">
            <p className="font-bold">No carrier passes all four rules yet.</p>
            <p className="mt-1">
              This request stays on “{STATUS.RETRYING}” and is checked again whenever a new
              journey is posted. After {FLAG_AFTER_HOURS} hours without a match it is flagged
              for a human admin to review.
            </p>
          </div>
        ) : (
          <>
            <ol className="space-y-4" key={shipment.id}>
              {shownOffered.map((result, index) => (
                <CarrierCard key={result.journey.id} result={result} rank={index + 1}
                  shipment={shipment} canRequest={canRequest} onRequest={handleRequest} />
              ))}
            </ol>
            {shownOffered.length < offered.length && (
              <ShowAll total={`${offered.length} eligible carriers`} onClick={() => open('eligible')} />
            )}
          </>
        )}
      </section>

      {/* Carriers that were rejected, with the reason */}
      {(ineligible.length > 0 || declined.length > 0) && (
        <section>
          <h2 className="mb-3 text-2xl font-bold">
            {ineligible.length + declined.length} not available, and why
          </h2>
          <ul className="space-y-4">
            {shownOthers.map((result) => (
              <CarrierCard key={result.journey.id} result={result} shipment={shipment} declined={result.declined} />
            ))}
          </ul>
          {shownOthers.length < others.length && (
            <ShowAll total={`${others.length} not available`} onClick={() => open('other')} />
          )}
        </section>
      )}
    </div>
  )
}
