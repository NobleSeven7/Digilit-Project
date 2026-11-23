// Admin page: human oversight. Flagged, unmatched and disputed requests
// are listed here for a person to decide, rather than decided automatically.
import { STATUS, DELIVERY, ESCROW, FLAG_AFTER_HOURS } from '../data/constants.js'
import { readSyncLog, isWebhookConfigured } from '../lib/webhook.js'
import { formatPKR, formatDateTime, isolate } from '../lib/format.js'
import PageHeader from '../components/PageHeader.jsx'
import StatusBadge from '../components/StatusBadge.jsx'
import { withViewTransition } from '../lib/motion.js'
import posthog, { posthogEnabled } from '../lib/posthog.js'

// How long ago a shipment was posted, in plain words.
function waitingTime(createdAt) {
  const minutes = Math.round((Date.now() - new Date(createdAt)) / 60000)
  return minutes < 60 ? `${minutes} min` : `${Math.round(minutes / 6) / 10} hours`
}

// One section with a heading, a count and a list (or an empty message).
function Section({ title, count, emptyText, testId, children }) {
  return (
    <section className="mb-8" data-testid={testId} style={{ viewTransitionName: `admin-${testId}` }}>
      <h2 className="mb-3 text-2xl font-bold">{title} ({count})</h2>
      {count === 0 ? <p className="card text-muted">{emptyText}</p> : <ul className="space-y-3">{children}</ul>}
    </section>
  )
}

export default function Admin({ state, save }) {
  const flagged = state.shipments.filter((s) => s.status === STATUS.FLAGGED)
  const unmatched = state.shipments.filter((s) => s.status === STATUS.RETRYING)
  const disputed = state.deliveries.filter((d) => d.status === DELIVERY.DISPUTED)
  // Parcels the AI parcel check marked "possibly prohibited" that no one has reviewed yet.
  const aiFlagged = state.shipments.filter(
    (s) => s.aiFlag === 'pending' && s.status !== STATUS.CANCELLED)
  const syncLog = readSyncLog()

  // Admin cancels a request that could not be matched.
  function cancelShipment(shipmentId, source = 'unmatched_shipment') {
    withViewTransition(() => save({
      ...state,
      shipments: state.shipments.map((s) =>
        s.id === shipmentId ? { ...s, status: STATUS.CANCELLED } : s),
    }))
    if (!posthogEnabled) return
    if (source === 'ai_flag') {
      posthog.capture('ai_flag_reviewed', { review_outcome: 'cancelled' })
    } else {
      posthog.capture('shipment_cancelled_by_admin', { cancellation_source: source })
    }
  }

  // Admin has looked at an AI-flagged parcel and decided it is fine.
  function allowFlagged(shipmentId) {
    withViewTransition(() => save({
      ...state,
      shipments: state.shipments.map((s) =>
        s.id === shipmentId ? { ...s, aiFlag: 'allowed' } : s),
    }))
    if (posthogEnabled) posthog.capture('ai_flag_reviewed', { review_outcome: 'allowed' })
  }

  // Admin settles a dispute: pay the carrier, or refund the sender.
  function resolveDispute(delivery, payCarrier) {
    withViewTransition(() => save({
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
    }))
    if (posthogEnabled) {
      posthog.capture('dispute_resolved', {
        resolution: payCarrier ? 'release_to_carrier' : 'refund_sender',
      })
    }
  }

  // A shipment row, shared by the flagged and unmatched lists.
  const shipmentRow = (s) => (
    <li key={s.id} className="card" style={{ viewTransitionName: `admin-row-${s.id}` }}>
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div>
          <h3 className="text-lg font-bold">{s.origin} to {s.destination}</h3>
          <p className="text-muted">
            {s.weightKg} kg {s.itemType.toLowerCase()} from {isolate(s.senderName)}. Waiting {waitingTime(s.createdAt)}.
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

      {/* The AI can be wrong, so a person makes the decision here */}
      <Section title="Possibly prohibited items" count={aiFlagged.length} testId="admin-ai-flagged"
        emptyText="Nothing to review. Parcels the item check marks as possibly prohibited appear here.">
        {aiFlagged.map((s) => (
          <li key={s.id} className="card" style={{ viewTransitionName: `admin-row-${s.id}` }}>
            <div className="flex flex-wrap items-start justify-between gap-2">
              <div>
                <h3 className="text-lg font-bold">{s.origin} to {s.destination}</h3>
                <p className="text-muted">
                  {s.weightKg} kg {s.itemType.toLowerCase()} from {isolate(s.senderName)}.
                </p>
                <p className="mt-1">Described as: “{s.aiCheck.description}”</p>
                <p className="mt-1"><strong>{s.aiCheck.source}:</strong> {s.aiCheck.reason}</p>
              </div>
              <StatusBadge status="Needs review" />
            </div>
            <div className="mt-3 flex flex-wrap gap-3">
              <button type="button" className="btn btn-primary" data-testid="ai-allow"
                onClick={() => allowFlagged(s.id)}>
                Allow
              </button>
              <button type="button" className="btn btn-danger" data-testid="ai-cancel"
                onClick={() => cancelShipment(s.id, 'ai_flag')}>
                Cancel request
              </button>
            </div>
          </li>
        ))}
      </Section>

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
            <li key={d.id} className="card" style={{ viewTransitionName: `admin-dispute-${d.id}` }}>
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div>
                  <h3 className="text-lg font-bold">{s.origin} to {s.destination}</h3>
                  <p className="text-muted">
                    {s.weightKg} kg {s.itemType.toLowerCase()}. Sender {isolate(s.senderName)}, carrier {isolate(j.carrierName)}.
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
          <p className="card text-muted">Nothing yet. Post a parcel or complete a delivery.</p>
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
