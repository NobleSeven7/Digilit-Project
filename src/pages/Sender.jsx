// Sender page: post a shipment. The sender must tick every line of the
// prohibited-items checklist before the parcel can be posted.
import { useRef, useState } from 'react'
import { markJustPosted } from '../lib/motion.js'
import { CITIES, CITY_CODES, ITEM_TYPES, STATUS, BASE_FEE, FEE_PER_KG, PROHIBITED } from '../data/constants.js'
import { findMatches, withSpaceLeft } from '../lib/matching.js'
import { calculatePrice } from '../lib/pricing.js'
import { sendToWebhook } from '../lib/webhook.js'
import { checkParcel, MAX_DESCRIPTION, SOURCE, TIMEOUT_MS } from '../lib/aiCheck.js'
import { goTo } from '../lib/navigation.js'
import { formatPKR, dayAt, makeId } from '../lib/format.js'
import PageHeader from '../components/PageHeader.jsx'
import RoleNotice from '../components/RoleNotice.jsx'
import CityMap from '../components/CityMap.jsx'
import { CheckIcon } from '../components/Icons.jsx'
import posthog, { posthogEnabled } from '../lib/posthog.js'

// Shows how many checklist lines are ticked. Amber while incomplete, green when done.
function CheckCounter({ count, total }) {
  const done = count === total
  return (
    <p data-testid="checklist-count"
      className={`inline-flex items-center gap-1.5 rounded-control border px-3 py-1 text-sm font-bold tabular-nums transition-colors duration-(--dur-quick) ease-[var(--ease-out)] ${
        done ? 'border-brand bg-brand text-white' : 'border-dashed border-muted bg-surface text-ink'
      }`}>
      {/* At 5 of 5 the tick grows in (.tick-in): a small moment, once per parcel */}
      {done && <CheckIcon size={14} className="tick-in" />}
      {count} of {total} checks ticked
    </p>
  )
}

// What each field is called in the summary message beside "Post parcel", so
// the message names the field instead of pointing at a colour.
const FIELD_NAMES = { route: 'From and To', weight: 'the weight', deadline: 'the deadline' }

// The message under a field that needs fixing (nothing when it is fine).
function FieldError({ error, field }) {
  if (error?.field !== field) return null
  // role="alert": read out by screen readers as soon as it appears.
  // It fades in (.fade-in-quick) so the form moving down reads as an answer.
  return <p id={`${field}-error`} role="alert" className="fade-in-quick mt-1 font-bold text-fail">{error.text}</p>
}


// A route picked on the Home page ("Routes we cover") arrives in the address
// as city codes: #/sender/ISB-KHI. Unknown codes, or the same city twice, are
// ignored and the form starts on its usual Islamabad to Lahore.
function routeFromAddress(id) {
  const [fromCode, toCode] = String(id || '').toUpperCase().split('-')
  const cityFor = (code) => CITIES.find((city) => CITY_CODES[city] === code)
  const from = cityFor(fromCode)
  const to = cityFor(toCode)
  return from && to && from !== to ? { from, to } : null
}

export default function Sender({ state, save, id, profile, setProfile }) {
  // One piece of state per form field.
  const senderName = profile.name // the signed-in demo sender
  const chosenRoute = routeFromAddress(id)
  const [origin, setOrigin] = useState(chosenRoute?.from ?? 'Islamabad')
  const [destination, setDestination] = useState(chosenRoute?.to ?? 'Lahore')
  const [weightKg, setWeightKg] = useState('5')
  const [itemType, setItemType] = useState('Small parcel')
  const [deadline, setDeadline] = useState(dayAt(1, 18)) // default: tomorrow 6 pm
  const [ticked, setTicked] = useState(PROHIBITED.map(() => false))
  // The problem to fix, shown under the field it is about: { field, text }.
  const [error, setError] = useState(null)
  // Props for a field: marks it as wrong and links it to its message.
  const errorProps = (field) => (error?.field === field
    ? { 'aria-invalid': true, 'aria-describedby': `${field}-error` } : {})

  // The AI parcel check: what the sender typed, whether we are waiting for
  // an answer, and the answer itself (null until a check has been run).
  const [description, setDescription] = useState('')
  const [checking, setChecking] = useState(false)
  const [aiResult, setAiResult] = useState(null)
  // True while we ask "the check suggested another item type: which one?"
  const [askType, setAskType] = useState(false)
  // Set once the shipment is saved, so a double tap cannot post it twice.
  const posted = useRef(false)

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
    if (posthogEnabled) {
      posthog.capture('ai_parcel_check_completed', {
        result_source: result.source,
        suggested_item_type: result.suggestedType,
        is_possibly_prohibited: result.prohibited,
      })
    }

    // Log the check to Make.com / Google Sheets (skipped if no webhook URL).
    sendToWebhook('ai_check', {
      senderName,
      itemType: result.suggestedType,
      status: result.prohibited ? 'Possibly prohibited' : 'No issue found',
      aiDescription: text, aiReason: result.reason, aiSource: result.source,
    }, `Parcel check (${result.source}): ${result.prohibited ? 'possibly prohibited' : 'no issue found'}`)
  }

  // What is wrong with one field, in plain words (null when it is fine).
  // Values can be passed in, to check a value the moment it changes.
  function problem(field, values = {}) {
    const v = { origin, destination, weight, deadline, ...values }
    if (field === 'route' && v.origin === v.destination) return 'Choose two different cities.'
    if (field === 'weight') {
      // Same limits as the weight box (0.5 to 200 kg), so a typo such as
      // 999999 kg cannot be posted as a "small parcel".
      if (!(v.weight >= 0.5 && v.weight <= 200)) return 'Enter a weight between 0.5 and 200 kg.'
      // Weights go in 0.5 kg steps (like the arrows on the weight box), so every
      // price is a whole number of rupees. The pricing itself is unchanged.
      if (!Number.isInteger(v.weight * 2)) return 'Use steps of 0.5 kg, for example 1 or 1.5.'
    }
    if (field === 'deadline' && new Date(v.deadline) <= new Date()) return 'Choose a deadline in the future.'
    return null
  }

  // Check one field as soon as the sender has filled it in (on leaving the
  // box, or at once for the city lists), instead of waiting for "Post
  // parcel", which stays disabled until the checklist is done. A fixed field
  // clears its message.
  function checkField(field, values) {
    const text = problem(field, values)
    if (text) setError({ field, text })
    else if (error?.field === field) setError(null)
  }

  function handleSubmit(event) {
    event.preventDefault() // stop the browser from reloading the page

    // Check the inputs and explain any problem in plain words.
    for (const field of ['route', 'weight', 'deadline']) {
      const text = problem(field)
      if (text) return setError({ field, text, onPost: true })
    }
    if (!allTicked) return setError({ field: 'checklist', text: 'Tick every line of the prohibited-items checklist.', onPost: true })
    setError(null)

    // The parcel check suggested a different item type: ask before posting,
    // so the suggestion is not lost by accident. The sender still decides.
    if (aiResult && aiResult.suggestedType !== itemType) return setAskType(true)

    post(itemType)
  }

  // Save the shipment, run matching, log it and open the results.
  function post(type) {
    if (posted.current) return // already posted (e.g. a double tap)
    posted.current = true

    // Start a timer so we can measure how long matching takes.
    const startedAt = performance.now()

    const shipment = {
      id: makeId('s'),
      senderName, origin, destination, itemType: type, deadline,
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
    const { eligible } = findMatches(shipment, withSpaceLeft(state))
    const matchingMs = Math.max(0.1, Math.round((performance.now() - startedAt) * 10) / 10)

    // No eligible carrier -> "Unmatched – Retrying" (proposal: failure scenario).
    shipment.status = eligible.length > 0 ? STATUS.FOUND : STATUS.RETRYING
    shipment.matchingMs = eligible.length > 0 ? matchingMs : null

    save({ ...state, shipments: [...state.shipments, shipment] })
    if (posthogEnabled) {
      posthog.capture('shipment_posted', {
        shipment_ref: shipment.id,
        origin_city: origin,
        destination_city: destination,
        item_type: type,
        weight_kg: weight,
        matching_outcome: eligible.length > 0 ? 'eligible_carriers_found' : 'retrying',
        eligible_carrier_count: eligible.length,
        ai_check_completed: Boolean(aiResult),
        ai_flagged_for_review: shipment.aiFlag === 'pending',
      })
    }

    // Log the shipment to Make.com / Google Sheets (skipped if no webhook URL).
    sendToWebhook('shipment', {
      shipmentId: shipment.id, senderName, origin, destination, weightKg: weight,
      itemType: type, deadline, status: shipment.status, price: calculatePrice(weight),
      eligibleCarriers: eligible.length, matchingMs,
    }, `Parcel posted: ${origin} to ${destination}, ${weight} kg`)

    markJustPosted(shipment.id) // the results arrive with their short wave
    goTo(`matches/${shipment.id}`) // show the ranked results
  }

  // A carrier cannot post a parcel: offer to switch to a sender profile.
  if (profile.role !== 'sender') {
    return (
      <div>
        <PageHeader title="Post a parcel" />
        <RoleNotice profile={profile} setProfile={setProfile} needs="sender" action="post a parcel" />
      </div>
    )
  }

  return (
    <div>
      <PageHeader title="Post a parcel">
        Tell us what you are sending and when it must leave. We check every carrier
        on that route and rank the ones that fit.
      </PageHeader>

      {/* minmax(0, 1fr): a column never grows past the screen because of what is
          in it (with very large text, a city list or the map would otherwise
          push the whole form sideways). */}
      <form onSubmit={handleSubmit} className="grid grid-cols-[minmax(0,1fr)] gap-6 lg:grid-cols-[minmax(0,1fr)_20rem]" noValidate>
        <div className="space-y-6">
          <div role="group" aria-labelledby="parcel-heading" className="card space-y-4">
            <h2 id="parcel-heading" className="text-xl font-bold">Parcel details</h2>

            <p data-testid="posting-as">
              Posting as <strong>{senderName}</strong>
            </p>

            {/* The route and parcel fields on the left, with a map of the chosen route
                beside them. On phones the map moves to the end of this card, so the
                fields read as one run without a picture in the middle. */}
            <div className="grid grid-cols-[minmax(0,1fr)] gap-4 sm:grid-cols-[repeat(2,minmax(0,1fr))]">
              <div className="space-y-4">
                <div>
                  <label className="label" htmlFor="origin">From</label>
                  <select id="origin" className="field" value={origin} {...errorProps('route')}
                    onChange={(e) => { setOrigin(e.target.value); checkField('route', { origin: e.target.value }) }}>
                    {CITIES.map((city) => <option key={city}>{city}</option>)}
                  </select>
                </div>
                <div>
                  <label className="label" htmlFor="destination">To</label>
                  <select id="destination" className="field" value={destination} {...errorProps('route')}
                    onChange={(e) => { setDestination(e.target.value); checkField('route', { destination: e.target.value }) }}>
                    {CITIES.map((city) => <option key={city}>{city}</option>)}
                  </select>
                  <FieldError error={error} field="route" />
                </div>
                <div>
                  <label className="label" htmlFor="weightKg">Weight (kg)</label>
                  <input id="weightKg" className="field" type="number" inputMode="decimal"
                    min="0.5" max="200" step="0.5" value={weightKg} {...errorProps('weight')}
                    onChange={(e) => {
                      setWeightKg(e.target.value)
                      // Once it is marked wrong, the message goes as soon as it is right.
                      if (error?.field === 'weight') checkField('weight', { weight: Number(e.target.value) })
                    }}
                    onBlur={() => checkField('weight')} />
                  <FieldError error={error} field="weight" />
                </div>
                <div>
                  <label className="label" htmlFor="itemType">Item type</label>
                  <select id="itemType" className="field" value={itemType}
                    onChange={(e) => { setItemType(e.target.value); setAskType(false) }}>
                    {ITEM_TYPES.map((type) => <option key={type}>{type}</option>)}
                  </select>
                  {/* The parcel check's suggestion, right where the type is chosen */}
                  {aiResult && aiResult.suggestedType !== itemType && (
                    <p className="mt-2 flex flex-wrap items-center gap-2 text-sm" data-testid="ai-type-hint">
                      <span>The check suggests <strong>{aiResult.suggestedType}</strong>.</span>
                      <button type="button" className="btn btn-secondary !min-h-11 !px-3 !py-1"
                        onClick={() => setItemType(aiResult.suggestedType)}>
                        Use {aiResult.suggestedType}
                      </button>
                    </p>
                  )}
                </div>
              </div>
              <div className="hidden sm:block">
                <CityMap origin={origin} destination={destination} />
              </div>
            </div>

            <div>
              <label className="label" htmlFor="deadline">Deadline</label>
              <input id="deadline" className="field" type="datetime-local" value={deadline} {...errorProps('deadline')}
                onChange={(e) => {
                  setDeadline(e.target.value)
                  if (error?.field === 'deadline') checkField('deadline', { deadline: e.target.value })
                }}
                onBlur={() => checkField('deadline')} />
              <FieldError error={error} field="deadline" />
              <p className="hint">The carrier must depart before this time.</p>
            </div>

            {/* Optional, so it comes after the required fields: the AI parcel check.
                Describe the item, get a suggested item type (shown again under
                "Item type" above, where it applies). */}
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
              {checking && (
                /* Something visibly moving while the AI is asked: the bar
                   fills over the same 8 seconds the check waits at most, so
                   it also shows how long is left. Purely visual (the text
                   below says the same); with reduced motion it stays still. */
                <div aria-hidden="true" className="mt-2 h-1 overflow-hidden rounded-full bg-sunk">
                  <div className="ai-wait-bar h-full bg-brand-ink" style={{ '--wait': `${TIMEOUT_MS}ms` }} />
                </div>
              )}
              {checking && (
                <p className="hint" data-testid="ai-waiting">
                  Asking the AI. If it does not answer within about 8 seconds, a simple keyword
                  check is used instead.
                </p>
              )}
              <p className="hint">
                Optional. Describe the item only: no names, addresses or phone numbers. The text is
                sent to an AI service to suggest an item type and spot prohibited items, and saved
                in the project's Google Sheet. <a href="#/about" className="font-bold text-brand-ink underline underline-offset-2">What we keep</a>
              </p>

              {/* The suggestion card */}
              {aiResult && (
                <div role="status" data-testid="ai-result" data-source={aiResult.source} key={aiResult.reason}
                  data-prohibited={aiResult.prohibited} data-type={aiResult.suggestedType}
                  className={`enter-pop mt-3 rounded-control border p-4 ${
                    aiResult.prohibited ? 'border-fail bg-fail-tint' : 'border-brand-ink bg-brand-tint'}`}>
                  <p className="text-sm font-bold">
                    {aiResult.source}
                  </p>
                  {aiResult.source === SOURCE.OFFLINE && (
                    <p className="text-sm text-muted">
                      The AI service did not answer, so this result comes from a simple keyword check.
                    </p>
                  )}
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
                      ? 'If you post this parcel, a person reviews it on the Admin page before carriers can see it. '
                      : ''}
                    This is a suggestion and can be wrong. You choose the item type and confirm the checklist.
                  </p>
                </div>
              )}
            </div>

            {/* Phones: the route map, after the fields */}
            <div className="sm:hidden">
              <CityMap origin={origin} destination={destination} />
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
                <label key={text} className="flex min-h-12 cursor-pointer items-center gap-3 rounded-control px-2 active:bg-brand-tint hover:bg-brand-tint">
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
          <p className="font-display text-4xl font-bold tabular-nums text-brand-ink" data-testid="price">
            {formatPKR(weight > 0 ? calculatePrice(weight) : 0)}
          </p>
          <p className="text-sm text-muted">
            {formatPKR(BASE_FEE)} base fee + {formatPKR(FEE_PER_KG)} × {weight > 0 ? weight : 0} kg. Nothing is paid until a
            carrier accepts; then RaastaShare holds the money safely until delivery is confirmed.
          </p>

          {/* After pressing "Post parcel": say what to fix, naming the field.
              (Problems found while filling in show only under their field.) */}
          {error?.onPost && (
            <p role="alert" className="rounded-control bg-fail-tint px-3 py-2 font-bold text-fail">
              {error.field === 'checklist' ? error.text : `Check ${FIELD_NAMES[error.field]}.`}
            </p>
          )}
          <div aria-live="polite">
            <CheckCounter count={tickedCount} total={PROHIBITED.length} />
          </div>

          {askType && aiResult && aiResult.suggestedType !== itemType ? (
            /* The check suggested another item type: the sender picks one. The
               question unfolds from the spot where "Post parcel" was
               (.grow-from-button), so it reads as that button's answer. */
            <div role="alert" data-testid="type-question" className="grow-from-button space-y-3 rounded-control border border-hold bg-hold-tint p-3">
              <p>
                The check suggested <strong>{aiResult.suggestedType}</strong>, but the item type
                is <strong>{itemType}</strong>. Which one should we post?
              </p>
              <button type="button" className="btn btn-primary w-full" data-testid="type-use-suggested"
                onClick={() => { setItemType(aiResult.suggestedType); post(aiResult.suggestedType) }}>
                Use {aiResult.suggestedType}
              </button>
              <button type="button" className="btn btn-secondary w-full" data-testid="type-keep"
                onClick={() => post(itemType)}>
                Keep {itemType}
              </button>
            </div>
          ) : (
            <button type="submit" className="btn btn-primary w-full" disabled={!allTicked}
              data-testid="post-shipment">
              Post parcel
            </button>
          )}
        </aside>
      </form>
    </div>
  )
}
