// Dashboard page: the impact numbers from the proposal, calculated live
// from the data saved in this browser.
import { STATUS, DELIVERY, COURIER_FEE } from '../data/constants.js'
import { formatPKR, formatDateTime, isolate } from '../lib/format.js'
import PageHeader from '../components/PageHeader.jsx'
import StatusBadge, { statusTone } from '../components/StatusBadge.jsx'
import RouteCodes from '../components/RouteCodes.jsx'

// The order a parcel moves through, then the ones that need a person.
const STATUS_ORDER = [STATUS.FOUND, STATUS.MATCHED, STATUS.DELIVERED,
  STATUS.RETRYING, STATUS.FLAGGED, STATUS.DISPUTED, STATUS.CANCELLED]
// Bar colour per status family (same families as the status badges).
const BAR = { good: 'bg-brand-ink', waiting: 'bg-muted', attention: 'bg-hold', bad: 'bg-fail' }
// The road on a delivery card: its colour matches the status badge beside
// it, and it fills as far as the parcel has got. A delivery that went wrong
// (disputed, refunded, declined) shows the whole road in red.
const ROAD_FILL = {
  [DELIVERY.AWAITING_ACCEPT]: 8,
  [DELIVERY.AWAITING_PICKUP]: 33,
  [DELIVERY.IN_TRANSIT]: 66,
}
function road(status) {
  return { colour: BAR[statusTone(status)] ?? 'bg-muted', fill: ROAD_FILL[status] ?? 100 }
}

// The proposal's target band for spare capacity used.
const TARGET_LOW = 40
const TARGET_HIGH = 60

// Spare capacity used, drawn as one bar on a 0-100% track with the target
// band (40-60%) marked, so the number can be read against its goal.
function CapacityMeter({ value }) {
  const verdict = value < TARGET_LOW ? 'Below the target'
    : value > 100 ? 'Over 100%: parcels weigh more than the spare space carriers gave'
      : value > TARGET_HIGH ? 'Above the target' : 'Within the target'
  return (
    <div className="mt-3">
      <div className="relative h-4 rounded-full bg-line" role="img"
        aria-label={`${value}% used. Target ${TARGET_LOW} to ${TARGET_HIGH}%. ${verdict}.`}>
        {/* Value (the bar stops at 100%, even if more was used) */}
        <div className="h-4 rounded-full bg-brand-ink" style={{ width: `${Math.min(100, value)}%` }} />
        {/* Target band, drawn on top so a full bar never hides it */}
        <div className="absolute inset-y-[-4px] rounded-md border-2 border-dashed border-brand-ink/70"
          style={{ left: `${TARGET_LOW}%`, width: `${TARGET_HIGH - TARGET_LOW}%` }} />
      </div>
      {/* gap-x-3 is only a minimum (justify-between spreads them anyway): with
          very large text the labels wrap instead of running into each other. */}
      <div className="mt-1 flex justify-between gap-x-3 text-sm text-muted" aria-hidden="true">
        <span>0%</span>
        <span className="text-center">Target {TARGET_LOW}–{TARGET_HIGH}%</span>
        <span>100%</span>
      </div>
      <p className="mt-2 font-bold">{verdict}.</p>
    </div>
  )
}

// One big number with a label and a short explanation.
// The four metrics sit in one strip divided by thin lines, not in boxes.
function Metric({ label, value, note, testId }) {
  return (
    <div className="border-b border-line py-5 sm:pr-5 sm:even:border-l sm:even:pl-5 lg:border-b-0 lg:[&:not(:first-child)]:border-l lg:[&:not(:first-child)]:pl-5">
      <p className="font-bold text-muted">{label}</p>
      <p className="mt-1 font-display text-5xl font-bold tracking-tight tabular-nums" data-testid={testId}>{value}</p>
      <p className="mt-2 text-sm text-muted">{note}</p>
    </div>
  )
}

export default function Dashboard({ state }) {
  const { shipments, journeys, deliveries } = state

  // Matches = carrier requests that were not declined.
  const matches = deliveries.filter((d) => d.status !== DELIVERY.DECLINED)
  const completed = deliveries.filter((d) => d.status === DELIVERY.DELIVERED)

  // Average matching time: time from posting to match output, where a match was found.
  const timed = shipments.filter((s) => s.matchingMs != null)
  const averageMs = timed.length
    ? timed.reduce((sum, s) => sum + s.matchingMs, 0) / timed.length
    : 0

  // Cost saved = (PKR 1,000 courier - platform fee), added up over completed deliveries.
  // A heavy parcel can cost more than the PKR 1,000 baseline; that counts as
  // no saving rather than taking money off the total.
  const costSaved = completed.reduce((sum, d) => sum + Math.max(0, COURIER_FEE - d.price), 0)
  const courierTotal = completed.length * COURIER_FEE
  const savedPercent = courierTotal ? Math.round((costSaved / courierTotal) * 100) : 0

  // Capacity utilisation = (package kg / carrier spare kg) x 100, averaged over matches.
  const utilisation = matches.map((d) => {
    const s = shipments.find((x) => x.id === d.shipmentId)
    const j = journeys.find((x) => x.id === d.journeyId)
    return (s.weightKg / j.spareKg) * 100
  })
  const averageUtilisation = utilisation.length
    ? Math.round(utilisation.reduce((a, b) => a + b, 0) / utilisation.length)
    : 0

  // How many shipments are in each status, for the bar list (journey order).
  const byStatus = STATUS_ORDER
    .map((status) => ({ status, count: shipments.filter((s) => s.status === status).length }))
    .filter((row) => row.count > 0)
  const largest = Math.max(1, ...byStatus.map((row) => row.count))

  // The four newest deliveries, as small route cards.
  const recent = [...deliveries].reverse().slice(0, 4).map((d) => ({
    d,
    s: shipments.find((x) => x.id === d.shipmentId),
    j: journeys.find((x) => x.id === d.journeyId),
  }))

  return (
    <div>
      <PageHeader title="Dashboard">
        Live numbers from this device. The full project also charts the same records in
        Looker Studio from Google Sheets.
      </PageHeader>

      <div className="grid border-y border-line sm:grid-cols-2 lg:grid-cols-4">
        <Metric label="Total shipments" value={shipments.length} testId="metric-shipments"
          note="Every request posted by a sender." />
        <Metric label="Matches" value={matches.length} testId="metric-matches"
          note={`${completed.length} delivered and paid so far.`} />
        <Metric label="Average matching time" testId="metric-time"
          value={timed.length === 0 ? '—'
            : averageMs < 1000 ? `${Math.round(averageMs * 10) / 10} ms` : `${Math.round(averageMs / 100) / 10} s`}
          note={timed.length === 0 ? 'No matches yet, so nothing to measure.'
            : averageMs < 60000 ? 'From posting to ranked results, well inside the 1\u2011minute target.'
              : 'From posting to ranked results. The target is under 1 minute.'} />
        <Metric label="Cost saved" value={formatPKR(costSaved)} testId="metric-saved"
          note={`${savedPercent}% less than our ${formatPKR(COURIER_FEE)} courier estimate, over ${completed.length} completed deliveries.`} />
      </div>

      {/* minmax(0, 1fr): columns never grow past the screen because of their contents */}
      <div className="mt-10 grid grid-cols-[minmax(0,1fr)] gap-10 lg:grid-cols-[repeat(2,minmax(0,1fr))]">
        {/* Shipments by status: a simple bar list, no chart library needed */}
        <section>
          <h2 className="text-xl font-bold">Parcels by status</h2>
          <p className="mt-1 text-sm text-muted">In the order a parcel moves, then the ones that need a person.</p>
          {byStatus.length === 0 && <p className="mt-2 text-muted">No parcels yet.</p>}
          <ul className="mt-4 space-y-3" data-testid="status-bars">
            {byStatus.map((row) => (
              <li key={row.status}>
                {/* flex-wrap: the count drops under the badge only when both
                    cannot fit side by side (very large text) */}
                <div className="flex flex-wrap items-center justify-between gap-x-3 gap-y-1">
                  <StatusBadge status={row.status} />
                  <span className="font-bold tabular-nums">{row.count}</span>
                </div>
                <div className="mt-1.5 h-3 rounded-full bg-line" aria-hidden="true">
                  <div className={`h-3 rounded-full ${BAR[statusTone(row.status)]}`}
                    style={{ width: `${(row.count / largest) * 100}%` }} />
                </div>
              </li>
            ))}
          </ul>
        </section>

        <section>
          <h2 className="text-xl font-bold">Spare capacity used</h2>
          <p className="mt-2 font-display text-5xl font-bold tracking-tight tabular-nums">
            {utilisation.length ? `${averageUtilisation}%` : '—'}
          </p>
          {utilisation.length > 0 && <CapacityMeter value={averageUtilisation} />}
          <p className="mt-2 text-muted">
            Average share of a matched carrier's spare space that the parcel fills
            (parcel kg ÷ spare kg).
          </p>
          <h2 className="mt-6 text-xl font-bold">Coordination steps</h2>
          <p className="mt-2 text-muted">
            3 steps here (submit, accept, verify) against about 8 (our estimate) with phone calls,
            messages and bargaining.
          </p>
        </section>
      </div>

      {/* The newest deliveries, each drawn as its own small road */}
      <section className="mt-12" data-testid="recent-deliveries">
        <h2 className="text-2xl font-bold">Recent deliveries</h2>
        {recent.length === 0 ? (
          <p className="mt-3 text-muted">No deliveries yet. Request a carrier on the Matches page to start one.</p>
        ) : (
          <ul className="mt-3 grid gap-3 sm:grid-cols-2">
            {recent.map(({ d, s, j }) => (
              <li key={d.id}>
                <a href={`#/delivery/${d.id}`}
                  className="card card-link block h-full text-ink no-underline">
                  <RouteCodes origin={s.origin} destination={s.destination} size="sm" />
                  {/* A short road between the two cities */}
                  <div className="relative mt-1 h-2 rounded-full bg-line" aria-hidden="true">
                    <div className={`h-2 rounded-full ${road(d.status).colour}`} style={{ width: `${road(d.status).fill}%` }} />
                    <span className="absolute -top-0.5 left-0 size-3 rounded-full border-2 border-ink/60 bg-surface" />
                    <span className="absolute -top-0.5 right-0 size-3 rounded-full border-2 border-ink/60 bg-surface" />
                  </div>
                  <p className="mt-3 text-sm text-muted">
                    {s.weightKg} kg from {isolate(s.senderName)}, carried by {isolate(j.carrierName)}.{' '}
                    {d.deliveredAt ? `Delivered ${formatDateTime(d.deliveredAt)}.` : ''}
                  </p>
                  <div className="mt-2 flex flex-wrap items-center justify-between gap-2">
                    <span className="font-display text-2xl font-bold tabular-nums">{formatPKR(d.price)}</span>
                    <StatusBadge status={d.status} />
                  </div>
                </a>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  )
}
