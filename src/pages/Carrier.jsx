// Carrier page: post a journey with spare capacity.
import { useEffect, useRef, useState } from 'react'
import { CITIES, VEHICLES, VEHICLE_TYPES, DEMO_CARRIERS, STATUS } from '../data/constants.js'
import { findMatches } from '../lib/matching.js'
import { sendToWebhook } from '../lib/webhook.js'
import { dayAt, makeId, formatDateTime } from '../lib/format.js'
import PageHeader from '../components/PageHeader.jsx'
import RouteLine from '../components/RouteLine.jsx'

export default function Carrier({ state, save }) {
  const [carrierName, setCarrierName] = useState(DEMO_CARRIERS[0])
  const [origin, setOrigin] = useState('Islamabad')
  const [destination, setDestination] = useState('Lahore')
  const [departure, setDeparture] = useState(dayAt(1, 8)) // default: tomorrow 8 am
  const [vehicleType, setVehicleType] = useState('Car')
  const [spareKg, setSpareKg] = useState('10')
  const [error, setError] = useState('')
  const [posted, setPosted] = useState(null) // the journey just posted, for the confirmation
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
    if (!(spare > 0)) return setError('Enter your spare capacity in kg (more than 0).')
    if (vehicle.maxKg !== null && spare > vehicle.maxKg) {
      return setError(`A ${vehicleType} can carry up to ${vehicle.maxKg} kg.`)
    }
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
    sendToWebhook('journey', {
      journeyId: journey.id, carrierName, origin, destination, departure, vehicleType, spareKg: spare,
    }, `Journey posted: ${origin} to ${destination}, ${spare} kg spare`)

    setPosted({ journey, helped })
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
          <h2 className="text-xl font-bold text-brand-ink">Journey posted</h2>
          <div className="mt-3 max-w-md">
            <RouteLine origin={posted.journey.origin} destination={posted.journey.destination} />
          </div>
          <p className="mt-3">
            Departing {formatDateTime(posted.journey.departure)} with {posted.journey.spareKg} kg spare.{' '}
            {posted.helped > 0
              ? `Good news: ${posted.helped} waiting ${posted.helped === 1 ? 'request now has' : 'requests now have'} a carrier.`
              : 'Senders on this route will now see you in their results.'}
          </p>
          <a href="#/matches" className="btn btn-primary mt-4">See matches</a>
        </div>
      )}

      <form onSubmit={handleSubmit} noValidate className="card max-w-2xl space-y-4">
        <div>
          <label className="label" htmlFor="carrierName">Posting as</label>
          <select id="carrierName" className="field" value={carrierName}
            onChange={(e) => setCarrierName(e.target.value)}>
            {DEMO_CARRIERS.map((name) => <option key={name}>{name}</option>)}
          </select>
          <p className="hint">Demo profiles stand in for a real login.</p>
        </div>

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
              min="0.5" max={vehicle.maxKg ?? 500} step="0.5" value={spareKg}
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
    </div>
  )
}
