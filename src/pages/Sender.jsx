// Sender page: post a shipment. The sender must tick every line of the
// prohibited-items checklist before the parcel can be posted.
import { useState } from 'react'
import { CITIES, ITEM_TYPES, STATUS } from '../data/constants.js'
import { findMatches } from '../lib/matching.js'
import { calculatePrice } from '../lib/pricing.js'
import { sendToWebhook } from '../lib/webhook.js'
import { checkParcel, MAX_DESCRIPTION, SOURCE } from '../lib/aiCheck.js'
import { goTo } from '../lib/navigation.js'
import { formatPKR, dayAt, makeId } from '../lib/format.js'
import PageHeader from '../components/PageHeader.jsx'
import RoleNotice from '../components/RoleNotice.jsx'
import CityMap from '../components/CityMap.jsx'
import { CheckIcon } from '../components/Icons.jsx'

// The sender confirms the parcel contains none of these.
// Shows how many checklist lines are ticked. Amber while incomplete, green when done.
function CheckCounter({ count, total }) {
  const done = count === total
  return (
    <p data-testid="checklist-count"
      className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-sm font-bold ${
        done ? 'bg-brand text-white' : 'bg-hold-tint text-hold-ink'
      }`}>
      {done && <CheckIcon size={14} />}
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

export default function Sender({ state, save, profile, setProfile }) {
  // One piece of state per form field.
  const senderName = profile.name // the signed-in demo sender
  const [origin, setOrigin] = useState('Islamabad')
  const [destination, setDestination] = useState('Lahore')
  const [weightKg, setWeightKg] = useState('5')
  const [itemType, setItemType] = useState('Small parcel')
  const [deadline, setDeadline] = useState(dayAt(1, 18)) // default: tomorrow 6 pm
  const [ticked, setTicked] = useState(PROHIBITED.map(() => false))
  const [error, setError] = useState('')

  // The AI parcel check: what the sender typed, whether we are waiting for
  // an answer, and the answer itself (null until a check has been run).
  const [description, setDescription] = useState('')
  const [checking, setChecking] = useState(false)
  const [aiResult, setAiResult] = useState(null)

  const weight = Number(weightKg)
  const allTicked = ticked.every(Boolean)
  const tickedCount = ticked.filter(Boolean).length

  // Tick or untick one checklist line.
  function toggle(index) {
    setTicked(ticked.map((value, i) => (i === index ? !value : value)))
  }

  // Typing a new description throws away the old answer, so a result can
  // never be attached to a different item.
  function handleDescription(text) {
    setDescription(text)
    setAiResult(null)
  }

  // "Check with AI": ask for a suggestion and log the check.
  async function handleAiCheck() {
    const text = description.trim()
    if (!text || checking) return
    setChecking(true)
    setAiResult(null) // the old card goes, so each answer arrives as a new card
    const result = await checkParcel(text)
    setChecking(false)
    setAiResult({ ...result, description: text })

    // Log the check to Make.com / Google Sheets (skipped if no webhook URL).
    sendToWebhook('ai_check', {
      senderName,
      itemType: result.suggestedType,
      status: result.prohibited ? 'Possibly prohibited' : 'No issue found',
      aiDescription: text, aiReason: result.reason, aiSource: result.source,
    }, `Parcel check (${result.source}): ${result.prohibited ? 'possibly prohibited' : 'no issue found'}`)
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

    // Keep the parcel check with the shipment. If it said "possibly
    // prohibited", the shipment also appears on the Admin page for a person
    // to review. The shipment's status and matching are not affected.
    if (aiResult) {
      shipment.aiCheck = aiResult
      if (aiResult.prohibited) shipment.aiFlag = 'pending'
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

  // A carrier cannot post a parcel: offer to switch to a sender profile.
  if (profile.role !== 'sender') {
    return (
      <div>
        <PageHeader title="Post a shipment" />
        <RoleNotice profile={profile} setProfile={setProfile} needs="sender" action="post a parcel" />
      </div>
    )
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

            <p data-testid="posting-as">
              Posting as <strong>{senderName}</strong>
            </p>

            {/* AI parcel check: describe the item, get a suggestion */}
            <div>
              <label className="label" htmlFor="aiDescription">Describe your item</label>
              <div className="flex flex-col gap-3 sm:flex-row">
                <input id="aiDescription" data-testid="ai-description" className="field" type="text"
                  maxLength={MAX_DESCRIPTION} value={description} autoComplete="off"
                  placeholder="For example: two glass vases wrapped in bubble wrap"
                  onChange={(e) => handleDescription(e.target.value)} />
                <button type="button" className="btn btn-secondary shrink-0" data-testid="ai-check-button"
                  disabled={!description.trim() || checking} onClick={handleAiCheck}>
                  {checking ? 'Checking…' : 'Check with AI'}
                </button>
              </div>
              <p className="hint">
                Optional. Describe the item only: no names, addresses or phone numbers. The text is
                sent to an AI service to suggest an item type and spot prohibited items.
              </p>

              {/* The suggestion card */}
              {aiResult && (
                <div role="status" data-testid="ai-result" data-source={aiResult.source} key={aiResult.reason}
                  data-prohibited={aiResult.prohibited} data-type={aiResult.suggestedType}
                  className={`enter-pop mt-3 rounded-lg border p-4 ${
                    aiResult.prohibited ? 'border-fail bg-fail-tint' : 'border-brand-ink bg-brand-tint'}`}>
                  <p className="text-sm font-bold">
                    {aiResult.source}
                  </p>
                  <div className="mt-2 flex flex-wrap items-center gap-3">
                    <p>Suggested item type: <strong>{aiResult.suggestedType}</strong></p>
                    {itemType === aiResult.suggestedType ? (
                      <span className="text-sm text-muted">Already selected.</span>
                    ) : (
                      <button type="button" className="btn btn-secondary !min-h-11 !py-1" data-testid="ai-use-type"
                        onClick={() => setItemType(aiResult.suggestedType)}>
                        Use this type
                      </button>
                    )}
                  </div>
                  <p className={`mt-2 font-bold ${aiResult.prohibited ? 'text-fail' : 'text-brand-ink'}`}>
                    {aiResult.prohibited ? 'This may be a prohibited item.' : 'No prohibited item spotted.'}
                  </p>
                  <p>{aiResult.reason}</p>
                  <p className="mt-2 text-sm text-muted">
                    {aiResult.prohibited
                      ? 'If you post this parcel, a person will review it on the Admin page. '
                      : ''}
                    This is a suggestion and can be wrong. You choose the item type and confirm the checklist.
                  </p>
                </div>
              )}
            </div>

            {/* The route and parcel fields on the left, with a map of the chosen route
                beside them (below them on phones) */}
            <div className="grid gap-4 sm:grid-cols-2">
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
              <CityMap origin={origin} destination={destination} />
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
          <p className="font-display text-4xl font-bold text-brand-ink" data-testid="price">
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
