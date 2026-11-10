// Admin page: human oversight. Flagged, unmatched and disputed requests
// are listed here for a person to decide, rather than decided automatically.
import { STATUS, DELIVERY, ESCROW, FLAG_AFTER_HOURS } from '../data/constants.js'
import { readSyncLog, isWebhookConfigured } from '../lib/webhook.js'
import { formatPKR, formatDateTime } from '../lib/format.js'
import PageHeader from '../components/PageHeader.jsx'
import StatusBadge from '../components/StatusBadge.jsx'

// How long ago a shipment was posted, in plain words.
function waitingTime(createdAt) {
  const minutes = Math.round((Date.now() - new Date(createdAt)) / 60000)
  return minutes < 60 ? `${minutes} min` : `${Math.round(minutes / 6) / 10} hours`
}

// One section with a heading, a count and a list (or an empty message).
function Section({ title, count, emptyText, testId, children }) {
  return (
    <section className="mb-8" data-testid={testId}>
      <h2 className="mb-3 text-2xl font-bold">{title} ({count})</h2>
      {count === 0 ? <p className="card text-muted">{emptyText}</p> : <ul className="space-y-3">{children}</ul>}
    </section>
  )
}

export default function Admin({ state, save }) {
  const flagged = state.shipments.filter((s) => s.status === STATUS.FLAGGED)
  const unmatched = state.shipments.filter((s) => s.status === STATUS.RETRYING)
  const disputed = state.deliveries.filter((d) => d.status === DELIVERY.DISPUTED)
  const syncLog = readSyncLog()

  // Admin cancels a request that could not be matched.
  function cancelShipment(shipmentId) {
    save({
      ...state,
      shipments: state.shipments.map((s) =>
        s.id === shipmentId ? { ...s, status: STATUS.CANCELLED } : s),
    })
  }

  // Admin settles a dispute: pay the carrier, or refund the sender.
  function resolveDispute(delivery, payCarrier) {
    save({
      ...state,
      deliveries: state.deliveries.map((d) => (d.id !== delivery.id ? d : {
        ...d,
        status: payCarrier ? DELIVERY.DELIVERED : DELIVERY.REFUNDED,
        escrow: payCarrier ? ESCROW.RELEASED : ESCROW.REFUNDED,
        deliveredAt: payCarrier ? new Date().toISOString() : null,
      })),
      shipments: state.shipments.map((s) => (s.id !== delivery.shipmentId ? s : {
        ...s, status: payCarrier ? STATUS.DELIVERED : STATUS.CANCELLED,
      })),
    })
  }

  // A shipment row, shared by the flagged and unmatched lists.
  const shipmentRow = (s) => (
    <li key={s.id} className="card">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div>
          <h3 className="text-lg font-bold">{s.origin} to {s.destination}</h3>
          <p className="text-muted">
            {s.weightKg} kg {s.itemType.toLowerCase()} from {s.senderName}. Waiting {waitingTime(s.createdAt)}.
          </p>
        </div>
        <StatusBadge status={s.status} />
      </div>
      <div className="mt-3 flex flex-wrap gap-3">
        <a href={`#/matches/${s.id}`} className="btn btn-secondary">Check carriers again</a>
        <button type="button" className="btn btn-danger" onClick={() => cancelShipment(s.id)}>
          Cancel request
        </button>
      </div>
    </li>
  )

  return (
    <div>
      <PageHeader title="Admin review">
        Requests the system could not settle on its own. A person makes the final call.
      </PageHeader>

      <Section title="Flagged" count={flagged.length} testId="admin-flagged"
        emptyText={`Nothing flagged. Requests land here after ${FLAG_AFTER_HOURS} hours without a match.`}>
        {flagged.map(shipmentRow)}
      </Section>

      <Section title="Unmatched, still retrying" count={unmatched.length} testId="admin-unmatched"
        emptyText="Every open request currently has a carrier.">
        {unmatched.map(shipmentRow)}
      </Section>

      <Section title="Disputed" count={disputed.length} testId="admin-disputed"
        emptyText="No disputes. Reported problems freeze the escrow and appear here.">
        {disputed.map((d) => {
          const s = state.shipments.find((x) => x.id === d.shipmentId)
          const j = state.journeys.find((x) => x.id === d.journeyId)
          return (
            <li key={d.id} className="card">
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div>
                  <h3 className="text-lg font-bold">{s.origin} to {s.destination}</h3>
                  <p className="text-muted">
                    {s.weightKg} kg {s.itemType.toLowerCase()}. Sender {s.senderName}, carrier {j.carrierName}.
                  </p>
                  <p className="mt-1">{d.disputeReason}.</p>
                </div>
                <StatusBadge status={`${formatPKR(d.price)} frozen`} />
              </div>
              <div className="mt-3 flex flex-wrap gap-3">
                <button type="button" className="btn btn-primary" onClick={() => resolveDispute(d, true)}>
                  Release to carrier
                </button>
                <button type="button" className="btn btn-secondary" onClick={() => resolveDispute(d, false)}>
                  Refund sender
                </button>
              </div>
            </li>
          )
        })}
      </Section>

      {/* What the app has sent (or would send) to Make.com / Google Sheets */}
      <section data-testid="sync-log">
        <h2 className="mb-1 text-2xl font-bold">Sync log</h2>
        <p className="mb-3 text-muted">
          {isWebhookConfigured()
            ? 'Records are sent to the Make.com webhook, which adds them to Google Sheets.'
            : 'No webhook URL is set, so records stay on this device. The app works the same.'}
        </p>
        {syncLog.length === 0 ? (
          <p className="card text-muted">Nothing yet. Post a shipment or complete a delivery.</p>
        ) : (
          <ul className="card divide-y divide-line !py-1">
            {syncLog.map((entry) => (
              <li key={entry.time + entry.summary} className="py-3" data-event={entry.event}>
                <p className="font-bold">{entry.summary}</p>
                <p className="text-sm text-muted">{formatDateTime(entry.time)}. {entry.result}.</p>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  )
}
