// The parcel pass: the pickup or delivery code laid out like a boarding pass
// or luggage tag. The green top half says which parcel and trip it is; the
// bottom half, below a tear line, holds the 4-digit code.
// In this demo the pass is shown on screen; a live service would send it by SMS.
import { formatDateTime } from '../lib/format.js'
import RouteCodes from './RouteCodes.jsx'

function Field({ label, value }) {
  return (
    <div className="min-w-0">
      <p className="text-xs uppercase tracking-wide text-on-brand-soft">{label}</p>
      <p className="truncate font-bold">{value}</p>
    </div>
  )
}

// kind: "Pickup" or "Delivery". codeTestId keeps the tests' hook on the code.
export default function ParcelPass({ kind, code, shipment, journey, codeTestId, note = 'Would arrive by SMS' }) {
  return (
    <div className="w-full max-w-sm overflow-hidden rounded-2xl border border-line bg-surface text-ink shadow-[var(--shadow-rest)]"
      data-testid="parcel-pass">
      {/* Top: the trip */}
      <div className="bg-brand p-5 text-white">
        <div className="flex flex-wrap items-center justify-between gap-x-3 gap-y-2 text-sm">
          <span className="font-display text-lg font-bold">RaastaShare</span>
          <span className="whitespace-nowrap rounded-full border border-white px-3 py-0.5 text-sm font-bold">{kind} pass</span>
        </div>
        <RouteCodes origin={shipment.origin} destination={shipment.destination} className="mt-4" tone="text-on-brand-soft" />
        <div className="mt-4 grid grid-cols-2 gap-x-4 gap-y-2 text-sm">
          <Field label="Sender" value={shipment.senderName} />
          <Field label="Carrier" value={journey.carrierName} />
          <Field label="Parcel" value={`${shipment.weightKg} kg ${shipment.itemType.toLowerCase()}`} />
          <Field label="Departs" value={formatDateTime(journey.departure)} />
        </div>
      </div>
      {/* Tear line with a notch on each side */}
      <div className="relative h-0" aria-hidden="true">
        <span className="absolute -left-3 -top-3 size-6 rounded-full border border-line bg-surface" />
        <span className="absolute -right-3 -top-3 size-6 rounded-full border border-line bg-surface" />
        <span className="absolute inset-x-5 top-0 border-t-2 border-dashed border-line" />
      </div>
      {/* Bottom: the code */}
      <div className="flex items-end justify-between gap-4 p-5">
        <div>
          <p className="text-sm text-muted">{kind} code</p>
          <p className="font-display text-5xl font-bold leading-none tracking-[0.2em]" data-testid={codeTestId}>{code}</p>
        </div>
        <p className="max-w-[8rem] text-right text-xs text-muted">{note}</p>
      </div>
    </div>
  )
}
