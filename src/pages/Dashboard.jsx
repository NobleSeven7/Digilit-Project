// Dashboard page: the impact numbers from the proposal, calculated live
// from the data saved in this browser.
import { STATUS, DELIVERY, COURIER_FEE } from '../data/constants.js'
import { formatPKR } from '../lib/format.js'
import PageHeader from '../components/PageHeader.jsx'

// One big number with a label and a short explanation.
function Metric({ label, value, note, testId }) {
  return (
    <div className="card">
      <p className="font-bold text-muted">{label}</p>
      <p className="mt-1 font-display text-4xl font-bold text-brand-ink" data-testid={testId}>{value}</p>
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
  const costSaved = completed.reduce((sum, d) => sum + (COURIER_FEE - d.price), 0)
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

  // How many shipments are in each status, for the bar list.
  const byStatus = Object.values(STATUS)
    .map((status) => ({ status, count: shipments.filter((s) => s.status === status).length }))
    .filter((row) => row.count > 0)
  const largest = Math.max(1, ...byStatus.map((row) => row.count))

  return (
    <div>
      <PageHeader title="Dashboard">
        Live numbers from this device. The full project also charts the same records in
        Looker Studio from Google Sheets.
      </PageHeader>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Metric label="Total shipments" value={shipments.length} testId="metric-shipments"
          note="Every request posted by a sender." />
        <Metric label="Matches" value={matches.length} testId="metric-matches"
          note={`${completed.length} delivered and paid so far.`} />
        <Metric label="Average matching time" testId="metric-time"
          value={averageMs < 1000 ? `${Math.round(averageMs * 10) / 10} ms` : `${Math.round(averageMs / 100) / 10} s`}
          note="From posting to ranked results. Target: under 1 minute." />
        <Metric label="Cost saved" value={formatPKR(costSaved)} testId="metric-saved"
          note={`${savedPercent}% less than a ${formatPKR(COURIER_FEE)} courier, over ${completed.length} completed deliveries.`} />
      </div>

      <div className="mt-6 grid gap-4 lg:grid-cols-2">
        {/* Shipments by status: a simple bar list, no chart library needed */}
        <section className="card">
          <h2 className="text-xl font-bold">Shipments by status</h2>
          <ul className="mt-4 space-y-3">
            {byStatus.map((row) => (
              <li key={row.status}>
                <div className="flex justify-between gap-3">
                  <span>{row.status}</span>
                  <span className="font-bold">{row.count}</span>
                </div>
                <div className="mt-1 h-3 rounded-full bg-brand-tint" aria-hidden="true">
                  <div className="h-3 rounded-full bg-brand" style={{ width: `${(row.count / largest) * 100}%` }} />
                </div>
              </li>
            ))}
          </ul>
        </section>

        <section className="card">
          <h2 className="text-xl font-bold">Spare capacity used</h2>
          <p className="mt-2 font-display text-4xl font-bold text-brand-ink">{averageUtilisation}%</p>
          <p className="mt-2 text-muted">
            Average share of a matched carrier's spare space that the parcel fills
            (parcel kg ÷ spare kg). The proposal's target is 40 to 60%.
          </p>
          <h2 className="mt-6 text-xl font-bold">Coordination steps</h2>
          <p className="mt-2 text-muted">
            3 steps here (submit, accept, verify) against about 8 with phone calls,
            messages and bargaining.
          </p>
        </section>
      </div>
    </div>
  )
}
