// History page: everything the signed-in person has sent or carried, with
// their totals and their star rating.
import { STATUS, DELIVERY, COURIER_FEE } from '../data/constants.js'
import { formatCount, formatPKR, formatShort, isolate } from '../lib/format.js'
import { ratingOf, ratingBy } from '../lib/ratings.js'
import PageHeader from '../components/PageHeader.jsx'
import RouteCodes from '../components/RouteCodes.jsx'
import StatusBadge from '../components/StatusBadge.jsx'
import { StarRow } from '../components/Stars.jsx'

// One total at the top, like the Dashboard's numbers but smaller.
function Total({ label, value, note, testId }) {
  return (
    <div className="border-b border-line py-4 sm:pr-5 sm:even:border-l sm:even:pl-5 lg:border-b-0 lg:[&:not(:first-child)]:border-l lg:[&:not(:first-child)]:pl-5">
      <p className="font-bold text-muted">{label}</p>
      <p className="mt-1 font-display text-4xl font-bold tracking-tight tabular-nums" data-testid={testId}>{value}</p>
      {note && <p className="mt-1 text-sm text-muted">{note}</p>}
    </div>
  )
}

export default function History({ state, profile }) {
  const isSender = profile.role === 'sender'
  const { shipments, journeys, deliveries, ratings } = state

  // The person's own parcels (sender) or trips (carrier), and their deliveries.
  const mineShipments = shipments.filter((s) => s.senderName === profile.name)
  const mineJourneys = journeys.filter((j) => j.carrierName === profile.name)
  const mineIds = new Set((isSender ? mineShipments : mineJourneys).map((x) => x.id))
  const mine = [...deliveries].reverse() // newest first
    .filter((d) => mineIds.has(isSender ? d.shipmentId : d.journeyId))
    .map((d) => ({
      d,
      s: shipments.find((x) => x.id === d.shipmentId),
      j: journeys.find((x) => x.id === d.journeyId),
    }))
    .filter(({ s, j }) => s && j)
  const delivered = mine.filter(({ d }) => d.status === DELIVERY.DELIVERED)
  const money = delivered.reduce((sum, { d }) => sum + d.price, 0)
  const saved = delivered.reduce((sum, { d }) => sum + Math.max(0, COURIER_FEE - d.price), 0)
  const kg = delivered.reduce((sum, { s }) => sum + s.weightKg, 0)
  const myRating = ratingOf(profile.name, ratings)
  // Parcels that have no delivery under way or done yet.
  const busy = new Set(deliveries
    .filter((d) => ![DELIVERY.DECLINED, DELIVERY.CANCELLED].includes(d.status))
    .map((d) => d.shipmentId))
  const waiting = mineShipments.filter((s) => !busy.has(s.id) && [STATUS.FOUND, STATUS.RETRYING, STATUS.FLAGGED].includes(s.status))

  return (
    <div>
      <PageHeader title="History">
        {isSender
          ? `Every parcel ${profile.name} has sent, what it cost and how carriers rated the handover.`
          : `Every parcel ${profile.name} has carried, what it earned and how senders rated the trip.`}
      </PageHeader>

      <div className="grid border-y border-line sm:grid-cols-2 lg:grid-cols-4" data-testid="history-totals">
        {isSender ? (
          <>
            <Total label="Parcels sent" value={formatCount(mineShipments.length)} testId="total-count"
              note={`${formatCount(delivered.length)} delivered so far.`} />
            <Total label="Paid to carriers" value={formatPKR(money)} testId="total-money"
              note="Only for delivered parcels." />
            <Total label="Saved" value={delivered.length ? formatPKR(saved) : '—'} testId="total-saved"
              note={`Against our ${formatPKR(COURIER_FEE)} courier estimate per parcel.`} />
          </>
        ) : (
          <>
            <Total label="Trips posted" value={formatCount(mineJourneys.length)} testId="total-count"
              note={`${formatCount(delivered.length)} ${delivered.length === 1 ? 'parcel' : 'parcels'} delivered.`} />
            <Total label="Earned" value={formatPKR(money)} testId="total-money"
              note="Released after each delivery code." />
            <Total label="Carried" value={`${formatCount(kg)} kg`} testId="total-kg"
              note="On trips that were happening anyway." />
          </>
        )}
        <div className="py-4 sm:even:border-l sm:even:pl-5 lg:border-l lg:pl-5">
          <p className="font-bold text-muted">Your rating</p>
          <p className="mt-1 font-display text-4xl font-bold tracking-tight tabular-nums" data-testid="total-rating">
            {myRating.count ? myRating.average : '—'}
          </p>
          <p className="mt-1 text-sm text-muted">
            {myRating.count
              ? `From ${formatCount(myRating.count)} ${isSender ? (myRating.count === 1 ? 'carrier' : 'carriers') : (myRating.count === 1 ? 'sender' : 'senders')}.`
              : `No ratings yet. ${isSender ? 'Carriers' : 'Senders'} rate you after a delivery.`}
          </p>
        </div>
      </div>

      {waiting.length > 0 && (
        <p className="mt-6 rounded-lg bg-sunk px-4 py-3">
          {waiting.length === 1 ? 'One parcel is' : `${formatCount(waiting.length)} parcels are`} still
          waiting for a carrier.{' '}
          <a href={`#/matches/${waiting[waiting.length - 1].id}`} className="font-bold text-brand-ink underline underline-offset-2">
            See matches
          </a>
        </p>
      )}

      <section className="mt-8" data-testid="history-list">
        <h2 className="text-2xl font-bold">{isSender ? 'Your deliveries' : 'Parcels you carried'}</h2>
        {mine.length === 0 ? (
          <div className="mt-3">
            <p className="text-muted">
              {isSender ? 'No deliveries yet. Post a parcel and request a carrier to start one.'
                : 'No deliveries yet. Post a trip, and senders on your route can request you.'}
            </p>
            <a href={isSender ? '#/sender' : '#/carrier'} className="btn btn-primary mt-4">
              {isSender ? 'Send a parcel' : 'Post a trip'}
            </a>
          </div>
        ) : (
          <ul className="mt-3 grid gap-3 sm:grid-cols-2">
            {mine.map(({ d, s, j }) => {
              const other = isSender ? j.carrierName : s.senderName
              const given = ratingBy(ratings, d.id, profile.role)
              const canRate = d.status === DELIVERY.DELIVERED && !given
              return (
                <li key={d.id}>
                  <a href={`#/delivery/${d.id}`} className="card card-link block h-full text-ink no-underline"
                    data-testid="history-item">
                    <RouteCodes origin={s.origin} destination={s.destination} size="sm" />
                    <p className="mt-3 text-sm text-muted">
                      {s.weightKg} kg, {isSender ? 'carried by' : 'from'} {isolate(other)}, {formatShort(d.deliveredAt || d.createdAt)}.
                    </p>
                    <div className="mt-2 flex flex-wrap items-center justify-between gap-2">
                      <span className="font-display text-2xl font-bold tabular-nums">{formatPKR(d.price)}</span>
                      <StatusBadge status={d.status} />
                    </div>
                    {given && (
                      <p className="mt-3 flex flex-wrap items-center gap-2 text-sm">
                        <span className="text-muted">You rated {isolate(other)}</span>
                        <StarRow stars={given.stars} />
                      </p>
                    )}
                    {canRate && (
                      <p className="mt-3 text-sm font-bold text-brand-ink underline underline-offset-2" data-testid="rate-now">
                        Rate {isolate(other)}
                      </p>
                    )}
                  </a>
                </li>
              )
            })}
          </ul>
        )}
      </section>
    </div>
  )
}
