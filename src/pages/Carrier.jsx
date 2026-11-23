// Carrier page: post a journey with spare capacity, and see which parcels
// fit a journey (the carrier's side of matching).
import { useEffect, useRef, useState } from 'react'
import { CITIES, VEHICLES, VEHICLE_TYPES, STATUS, DELIVERY } from '../data/constants.js'
import { findMatches, evaluateCarrier, isAvailable } from '../lib/matching.js'
import { calculatePrice } from '../lib/pricing.js'
import { startDelivery } from '../lib/delivery.js'
import { goTo } from '../lib/navigation.js'
import { sendToWebhook } from '../lib/webhook.js'
import { dayAt, makeId, formatDateTime, formatPKR, isolate } from '../lib/format.js'
import PageHeader from '../components/PageHeader.jsx'
import RoleNotice from '../components/RoleNotice.jsx'
import RouteLine from '../components/RouteLine.jsx'
import RuleCheck from '../components/RuleCheck.jsx'
import StatusBadge from '../components/StatusBadge.jsx'
import SuccessTick from '../components/SuccessTick.jsx'
import posthog, { posthogEnabled } from '../lib/posthog.js'


// Largest spare capacity accepted for a car or van (kg).
const MAX_SPARE_KG = 500

// The carrier's side of matching. For one journey it shows:
//   1. requests senders have already sent to this carrier
//   2. parcels that pass all four rules (the carrier can offer to carry one)
//   3. parcels that do not fit, with the rule that failed
// It uses the same four rules as the sender's Matches page.
function JourneyParcels({ state, save, carrierName, journeyId, onPick }) {
  // Only the signed-in carrier's journeys that are open and have not left yet, newest first.
  const journeys = state.journeys
    .filter((j) => isAvailable(j) && j.carrierName === carrierName)
    .reverse()
  // Show the picked journey if it is one of them, else the newest.
  const journey = journeys.find((j) => j.id === journeyId) || journeys[0]

  if (!journey) {
    return (
      <section className="mt-10" data-testid="journey-parcels">
        <h2 className="text-2xl font-bold">Parcels for your journey</h2>
        <p className="card mt-3 text-muted" data-testid="no-journeys">
          {carrierName} has no open journeys. Post one above to see the parcels that fit it.
        </p>
      </section>
    )
  }

  // Requests a sender has sent for this journey that still need an answer.
  const requests = state.deliveries.filter(
    (d) => d.journeyId === journey.id && d.status === DELIVERY.AWAITING_ACCEPT)

  // Check every parcel that is still looking for a carrier against this journey.
  const waiting = state.shipments.filter((s) =>
    [STATUS.FOUND, STATUS.RETRYING, STATUS.FLAGGED].includes(s.status))
  const results = waiting.map((shipment) => ({ shipment, ...evaluateCarrier(shipment, journey) }))
  const declined = (r) => r.shipment.rejectedJourneyIds.includes(journey.id)
  const fits = results.filter((r) => r.eligible && !declined(r))
    .sort((a, b) => b.shipment.weightKg - a.shipment.weightKg) // biggest fee first
  const others = results.filter((r) => !r.eligible || declined(r))

  // The carrier offers to carry a parcel. The sender still has to accept.
  function handleOffer(shipment) {
    const { newState, delivery } = startDelivery(state, shipment, journey, 'carrier')
    save(newState)
    if (posthogEnabled) {
      posthog.capture('delivery_request_created', {
        initiated_by: 'carrier',
        item_type: shipment.itemType,
        weight_kg: shipment.weightKg,
        vehicle_type: journey.vehicleType,
      })
    }
    goTo(`delivery/${delivery.id}`)
  }

  const describe = (s) => `${s.weightKg} kg ${s.itemType.toLowerCase()} from ${isolate(s.senderName)}`

  return (
    <section className="mt-10" data-testid="journey-parcels">
      <h2 className="text-2xl font-bold">Parcels for your journey</h2>
      <p className="mt-1 max-w-2xl text-muted">
        Showing <strong>{carrierName}</strong>'s journeys. Every waiting parcel is checked
        against the journey with the same four rules senders see.
      </p>

      {/* Pick which journey to look at */}
      <div className="mt-4 max-w-xl">
        <label className="label" htmlFor="journeyPicker">Journey</label>
        <select id="journeyPicker" className="field" value={journey.id} onChange={(e) => onPick(e.target.value)}>
          {journeys.map((j) => (
            <option key={j.id} value={j.id}>
              {j.origin} to {j.destination}, {formatDateTime(j.departure)}, {j.vehicleType}, {j.spareKg} kg spare
            </option>
          ))}
        </select>
      </div>

      {/* 1. Requests already sent to this carrier */}
      {requests.length > 0 && (
        <div className="mt-6" data-testid="journey-requests">
          <h3 className="text-xl font-bold">{requests.length} waiting for your answer</h3>
          <ul className="mt-3 space-y-3">
            {requests.map((d) => {
              const s = state.shipments.find((x) => x.id === d.shipmentId)
              return (
                <li key={d.id} className="card flex flex-wrap items-center justify-between gap-3 border-hold bg-hold-tint">
                  <p>
                    <strong>{s.senderName}</strong> asked you to carry {s.weightKg} kg {s.itemType.toLowerCase()}.
                    You earn <strong>{formatPKR(d.price)}</strong>.
                  </p>
                  <a href={`#/delivery/${d.id}`} className="btn btn-primary">Open request</a>
                </li>
              )
            })}
          </ul>
        </div>
      )}

      {/* 2. Parcels that fit */}
      <div className="mt-6">
        <h3 className="text-xl font-bold" data-testid="fits-heading">
          {fits.length} {fits.length === 1 ? 'parcel fits' : 'parcels fit'} this journey
        </h3>
        {fits.length === 0 ? (
          <p className="card mt-3 text-muted">
            No waiting parcel passes all four rules for this journey yet. New parcels on your
            route will appear here.
          </p>
        ) : (
          <ul className="mt-3 space-y-3">
            {fits.map(({ shipment }) => (
              <li key={shipment.id} className="card" data-testid="parcel-card" data-fits="true">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <p className="text-lg font-bold">{describe(shipment)}</p>
                    <p className="text-sm text-muted">
                      Needed by {formatDateTime(shipment.deadline)}. Uses{' '}
                      {Math.round((shipment.weightKg / journey.spareKg) * 100)}% of your spare space.
                    </p>
                  </div>
                  <p className="font-display text-3xl font-bold text-brand-ink">
                    {formatPKR(calculatePrice(shipment.weightKg))}
                  </p>
                </div>
                <button type="button" className="btn btn-primary mt-4 w-full sm:w-auto"
                  data-testid="offer-to-carry" onClick={() => handleOffer(shipment)}>
                  Offer to carry
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>

      {/* 3. Parcels that do not fit, and why */}
      {others.length > 0 && (
        <div className="mt-6">
          <h3 className="text-xl font-bold">{others.length} not for this journey, and why</h3>
          <ul className="mt-3 space-y-3">
            {others.map((r) => (
              <li key={r.shipment.id} className="card" data-testid="parcel-card" data-fits="false">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <p className="font-bold">{describe(r.shipment)}</p>
                    <p className="text-sm text-muted">{r.shipment.origin} to {r.shipment.destination}</p>
                  </div>
                  <StatusBadge status={declined(r) ? DELIVERY.DECLINED : 'Not eligible'} />
                </div>
                {/* Only the rules that failed, to keep it short */}
                <ul className="mt-3 grid gap-2 sm:grid-cols-2">
                  {r.rules.filter((rule) => !rule.pass).map((rule) => <RuleCheck key={rule.key} rule={rule} />)}
                </ul>
              </li>
            ))}
          </ul>
        </div>
      )}
    </section>
  )
}

export default function Carrier({ state, save, profile, setProfile }) {
  const carrierName = profile.name // the signed-in demo carrier
  const [origin, setOrigin] = useState('Islamabad')
  const [destination, setDestination] = useState('Lahore')
  const [departure, setDeparture] = useState(dayAt(1, 8)) // default: tomorrow 8 am
  const [vehicleType, setVehicleType] = useState('Car')
  const [spareKg, setSpareKg] = useState('10')
  const [error, setError] = useState('')
  const [posted, setPosted] = useState(null) // the journey just posted, for the confirmation
  const [journeyId, setJourneyId] = useState(null) // which journey the parcel list is showing
  const parcelList = useRef(null) // points at the "Parcels for your journey" section
  const confirmation = useRef(null) // points at the "Journey posted" box

  // After posting, scroll the confirmation into view. On a phone it would
  // otherwise sit above the screen, and people tap "Post journey" again.
  useEffect(() => {
    if (posted && confirmation.current) {
      confirmation.current.scrollIntoView({ block: 'start' })
    }
  }, [posted])

  const vehicle = VEHICLES[vehicleType]
  const spare = Number(spareKg)

  function handleSubmit(event) {
    event.preventDefault()

    if (origin === destination) return setError('Choose two different cities.')
    if (!(spare >= 0.5)) return setError('Enter your spare capacity in kg (at least 0.5).')
    // Motorbike and bus have fixed limits; for a car or van we stop at 500 kg,
    // the same top value the capacity box allows, so typos are caught.
    const limit = vehicle.maxKg ?? MAX_SPARE_KG
    if (spare > limit) return setError(`A ${vehicleType} can carry up to ${limit} kg.`)
    if (new Date(departure) <= new Date()) return setError('The departure time must be in the future.')

    // Stop the same journey being posted twice (e.g. tapping the button again).
    const alreadyPosted = state.journeys.some((j) =>
      j.status === 'Open' && j.carrierName === carrierName && j.origin === origin &&
      j.destination === destination && j.departure === departure &&
      j.vehicleType === vehicleType && j.spareKg === spare)
    if (alreadyPosted) {
      return setError('This journey is already posted. Change a detail to post a different one.')
    }
    setError('')

    const journey = {
      id: makeId('j'),
      carrierName, origin, destination, departure, vehicleType,
      spareKg: spare,
      status: 'Open',
    }
    const journeys = [...state.journeys, journey]

    // Retry: a new journey may solve requests that were unmatched until now.
    let helped = 0
    const shipments = state.shipments.map((shipment) => {
      const waiting = shipment.status === STATUS.RETRYING || shipment.status === STATUS.FLAGGED
      if (!waiting) return shipment
      const { eligible } = findMatches(shipment, journeys)
      const stillOpen = eligible.filter((r) => !shipment.rejectedJourneyIds.includes(r.journey.id))
      if (stillOpen.length === 0) return shipment
      helped += 1
      return { ...shipment, status: STATUS.FOUND }
    })

    save({ ...state, journeys, shipments })
    if (posthogEnabled) {
      posthog.capture('journey_posted', {
        origin_city: origin,
        destination_city: destination,
        vehicle_type: vehicleType,
        spare_capacity_kg: spare,
        shipments_reactivated: helped,
      })
    }
    sendToWebhook('journey', {
      journeyId: journey.id, carrierName, origin, destination, departure, vehicleType, spareKg: spare,
    }, `Journey posted: ${origin} to ${destination}, ${spare} kg spare`)

    setPosted({ journey, helped })
    setJourneyId(journey.id) // show the parcels for the journey just posted
  }

  // A sender cannot post a journey: offer to switch to a carrier profile.
  if (profile.role !== 'carrier') {
    return (
      <div>
        <PageHeader title="Post a journey" />
        <RoleNotice profile={profile} setProfile={setProfile} needs="carrier" action="post a journey" />
      </div>
    )
  }

  return (
    <div>
      <PageHeader title="Post a journey">
        Already driving between cities? Share your spare space and earn the delivery fee.
      </PageHeader>

      {/* Confirmation shown after posting */}
      {posted && (
        <div ref={confirmation} role="status" data-testid="journey-posted"
          className="card mb-6 scroll-mt-4 border-brand-ink bg-brand-tint">
          <h2 className="flex items-center gap-3 text-xl font-bold text-brand-ink">
            <SuccessTick key={posted.journey.id} animate />
            Journey posted
          </h2>
          <div className="mt-3 max-w-md">
            <RouteLine origin={posted.journey.origin} destination={posted.journey.destination} />
          </div>
          <p className="mt-3">
            Departing {formatDateTime(posted.journey.departure)} with {posted.journey.spareKg} kg spare.{' '}
            {posted.helped > 0
              ? `Good news: ${posted.helped} waiting ${posted.helped === 1 ? 'request now has' : 'requests now have'} a carrier.`
              : 'Senders on this route will now see you in their results.'}
          </p>
          <button type="button" className="btn btn-primary mt-4" data-testid="see-parcels"
            onClick={() => parcelList.current.scrollIntoView({ block: 'start' })}>
            See parcels for this journey
          </button>
        </div>
      )}

      <form onSubmit={handleSubmit} noValidate className="card max-w-2xl space-y-4">
        <p data-testid="posting-as">
          Posting as <strong>{carrierName}</strong>
        </p>

        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label className="label" htmlFor="origin">From</label>
            <select id="origin" className="field" value={origin} onChange={(e) => setOrigin(e.target.value)}>
              {CITIES.map((city) => <option key={city}>{city}</option>)}
            </select>
          </div>
          <div>
            <label className="label" htmlFor="destination">To</label>
            <select id="destination" className="field" value={destination}
              onChange={(e) => setDestination(e.target.value)}>
              {CITIES.map((city) => <option key={city}>{city}</option>)}
            </select>
          </div>
        </div>

        <div>
          <label className="label" htmlFor="departure">Departure date and time</label>
          <input id="departure" className="field" type="datetime-local" value={departure}
            onChange={(e) => setDeparture(e.target.value)} />
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label className="label" htmlFor="vehicleType">Vehicle type</label>
            <select id="vehicleType" className="field" value={vehicleType}
              onChange={(e) => setVehicleType(e.target.value)}>
              {VEHICLE_TYPES.map((type) => <option key={type}>{type}</option>)}
            </select>
          </div>
          <div>
            <label className="label" htmlFor="spareKg">Spare capacity (kg)</label>
            <input id="spareKg" className="field" type="number" inputMode="decimal"
              min="0.5" max={vehicle.maxKg ?? MAX_SPARE_KG} step="0.5" value={spareKg}
              onChange={(e) => setSpareKg(e.target.value)} />
          </div>
        </div>

        {/* What this vehicle may carry, straight from the compatibility table */}
        <p className="rounded-lg bg-brand-tint px-3 py-2 text-sm">
          A <strong>{vehicleType}</strong> can carry: {vehicle.allowed.join(', ').toLowerCase()}
          {vehicleType === 'Car' ? ' (perishables only on trips under 6 hours)' : ''}.{' '}
          {vehicle.maxKg !== null ? `Weight limit ${vehicle.maxKg} kg.` : 'Weight limit as you declare.'}
        </p>

        {error && (
          <p role="alert" className="rounded-lg bg-fail-tint px-3 py-2 font-bold text-fail">{error}</p>
        )}

        <button type="submit" className="btn btn-primary w-full sm:w-auto" data-testid="post-journey">
          Post journey
        </button>
      </form>

      {/* The carrier's side of matching: parcels for one of the open journeys */}
      <div ref={parcelList} className="scroll-mt-4">
        <JourneyParcels state={state} save={save} carrierName={carrierName}
          journeyId={journeyId} onPick={setJourneyId} />
      </div>
    </div>
  )
}
