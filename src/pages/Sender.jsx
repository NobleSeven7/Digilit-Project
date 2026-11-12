// Sender page: post a shipment. The sender must tick every line of the
// prohibited-items checklist before the parcel can be posted.
import { useState } from 'react'
import { CITIES, ITEM_TYPES, DEMO_SENDERS, STATUS } from '../data/constants.js'
import { findMatches } from '../lib/matching.js'
import { calculatePrice } from '../lib/pricing.js'
import { sendToWebhook } from '../lib/webhook.js'
import { goTo } from '../lib/navigation.js'
import { formatPKR, dayAt, makeId } from '../lib/format.js'
import PageHeader from '../components/PageHeader.jsx'
import CityMap from '../components/CityMap.jsx'

// The sender confirms the parcel contains none of these.
// Shows how many checklist lines are ticked. Amber while incomplete, green when done.
function CheckCounter({ count, total }) {
  const done = count === total
  return (
    <p data-testid="checklist-count"
      className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-sm font-bold ${
        done ? 'bg-brand text-white' : 'bg-hold-tint text-hold-ink'
      }`}>
      {done && <span aria-hidden="true">✓</span>}
      {count} of {total} checks ticked
    </p>
  )
}

const PROHIBITED = [
  'No weapons, ammunition or explosives',
  'No illegal drugs, alcohol or tobacco in bulk',
  'No cash, jewellery, passports or other high-value documents',
  'No flammable, toxic or otherwise hazardous materials',
  'No live animals',
]

export default function Sender({ state, save }) {
  // One piece of state per form field.
  const [senderName, setSenderName] = useState(DEMO_SENDERS[0])
  const [origin, setOrigin] = useState('Islamabad')
  const [destination, setDestination] = useState('Lahore')
  const [weightKg, setWeightKg] = useState('5')
  const [itemType, setItemType] = useState('Small parcel')
  const [deadline, setDeadline] = useState(dayAt(1, 18)) // default: tomorrow 6 pm
  const [ticked, setTicked] = useState(PROHIBITED.map(() => false))
  const [error, setError] = useState('')

  const weight = Number(weightKg)
  const allTicked = ticked.every(Boolean)
  const tickedCount = ticked.filter(Boolean).length

  // Tick or untick one checklist line.
  function toggle(index) {
    setTicked(ticked.map((value, i) => (i === index ? !value : value)))
  }

  function handleSubmit(event) {
    event.preventDefault() // stop the browser from reloading the page

    // Check the inputs and explain any problem in plain words.
    if (origin === destination) return setError('Choose two different cities.')
    if (!(weight > 0)) return setError('Enter the parcel weight in kg (more than 0).')
    if (new Date(deadline) <= new Date()) return setError('The deadline must be in the future.')
    if (!allTicked) return setError('Tick every line of the prohibited-items checklist.')

    // Start a timer so we can measure how long matching takes.
    const startedAt = performance.now()

    const shipment = {
      id: makeId('s'),
      senderName, origin, destination, itemType, deadline,
      weightKg: weight,
      createdAt: new Date().toISOString(),
      rejectedJourneyIds: [],
    }

    // Run the matching engine immediately.
    const { eligible } = findMatches(shipment, state.journeys)
    const matchingMs = Math.max(0.1, Math.round((performance.now() - startedAt) * 10) / 10)

    // No eligible carrier -> "Unmatched – Retrying" (proposal: failure scenario).
    shipment.status = eligible.length > 0 ? STATUS.FOUND : STATUS.RETRYING
    shipment.matchingMs = eligible.length > 0 ? matchingMs : null

    save({ ...state, shipments: [...state.shipments, shipment] })

    // Log the shipment to Make.com / Google Sheets (skipped if no webhook URL).
    sendToWebhook('shipment', {
      shipmentId: shipment.id, senderName, origin, destination, weightKg: weight,
      itemType, deadline, status: shipment.status, price: calculatePrice(weight),
      eligibleCarriers: eligible.length, matchingMs,
    }, `Shipment posted: ${origin} to ${destination}, ${weight} kg`)

    goTo(`matches/${shipment.id}`) // show the ranked results
  }

  return (
    <div>
      <PageHeader title="Post a shipment">
        Tell us what you are sending and when it must leave. We check every carrier
        on that route and rank the ones that fit.
      </PageHeader>

      <form onSubmit={handleSubmit} className="grid gap-6 lg:grid-cols-[1fr_20rem]" noValidate>
        <div className="space-y-6">
          <div role="group" aria-labelledby="parcel-heading" className="card space-y-4">
            <h2 id="parcel-heading" className="text-xl font-bold">Parcel details</h2>

            <div>
              <label className="label" htmlFor="senderName">Posting as</label>
              <select id="senderName" className="field" value={senderName}
                onChange={(e) => setSenderName(e.target.value)}>
                {DEMO_SENDERS.map((name) => <option key={name}>{name}</option>)}
              </select>
              <p className="hint">Demo profiles stand in for a real login.</p>
            </div>

            {/* Route: the two city pickers, with a map that draws the chosen route */}
            <div className="grid gap-4 sm:grid-cols-2 sm:items-center">
              <div className="space-y-4">
                <div>
                  <label className="label" htmlFor="origin">From</label>
                  <select id="origin" className="field" value={origin}
                    onChange={(e) => setOrigin(e.target.value)}>
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
              <CityMap origin={origin} destination={destination} />
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label className="label" htmlFor="weightKg">Weight (kg)</label>
                <input id="weightKg" className="field" type="number" inputMode="decimal"
                  min="0.5" max="200" step="0.5" value={weightKg}
                  onChange={(e) => setWeightKg(e.target.value)} />
              </div>
              <div>
                <label className="label" htmlFor="itemType">Item type</label>
                <select id="itemType" className="field" value={itemType}
                  onChange={(e) => setItemType(e.target.value)}>
                  {ITEM_TYPES.map((type) => <option key={type}>{type}</option>)}
                </select>
              </div>
            </div>

            <div>
              <label className="label" htmlFor="deadline">Deadline</label>
              <input id="deadline" className="field" type="datetime-local" value={deadline}
                onChange={(e) => setDeadline(e.target.value)} />
              <p className="hint">The carrier must depart before this time.</p>
            </div>
          </div>

          <div role="group" aria-labelledby="checklist-heading" className="card">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <h2 id="checklist-heading" className="text-xl font-bold">Prohibited-items checklist</h2>
              <CheckCounter count={tickedCount} total={PROHIBITED.length} />
            </div>
            <p className="mt-1 text-muted">Tick each line to confirm what is not in your parcel.</p>
            <div className="mt-3 space-y-1">
              {PROHIBITED.map((text, index) => (
                <label key={text} className="flex min-h-12 cursor-pointer items-center gap-3 rounded-lg px-2 hover:bg-brand-tint">
                  <input type="checkbox" className="size-6 shrink-0 accent-brand"
                    checked={ticked[index]} onChange={() => toggle(index)} />
                  <span>{text}</span>
                </label>
              ))}
            </div>
          </div>
        </div>

        {/* Price summary + submit button */}
        <aside className="card h-fit space-y-3 self-start lg:sticky lg:top-4">
          <h2 className="text-xl font-bold">Your price</h2>
          <p className="font-display text-4xl font-bold text-brand" data-testid="price">
            {formatPKR(weight > 0 ? calculatePrice(weight) : 0)}
          </p>
          <p className="text-sm text-muted">
            PKR 200 base fee + PKR 60 × {weight > 0 ? weight : 0} kg. You pay into escrow only
            after a carrier accepts.
          </p>

          {error && (
            <p role="alert" className="rounded-lg bg-fail-tint px-3 py-2 font-bold text-fail">{error}</p>
          )}
          <div aria-live="polite">
            <CheckCounter count={tickedCount} total={PROHIBITED.length} />
          </div>

          <button type="submit" className="btn btn-primary w-full" disabled={!allTicked}
            data-testid="post-shipment">
            Post shipment
          </button>
        </aside>
      </form>
    </div>
  )
}
