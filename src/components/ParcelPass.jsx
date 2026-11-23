// The parcel pass: the pickup or delivery code laid out like a boarding pass
// or luggage tag. The green top half says which parcel and trip it is; the
// bottom half, below a tear line, holds the 4-digit code.
// In this demo the pass is shown on screen; a live service would send it by SMS.
import { formatDateTime } from '../lib/format.js'
import RouteCodes from './RouteCodes.jsx'

function Field({ label, value }) {
  return (
    <div className="min-w-0">
      <p className="text-sm text-on-brand-soft">{label}</p>
      <p className="truncate font-bold">{value}</p>
    </div>
  )
}

// The code as departure-board digits: each digit is a short strip of numbers
// that rolls up to the right one when a parent gets "is-seen" (see .code-roll
// in src/index.css). Later digits roll a little longer, so they stop in turn.
function RollingCode({ code }) {
  return (
    <>
      <span className="sr-only">{code}</span>
      {/* One row that never wraps: each digit is its own little window */}
      <span aria-hidden="true" className="inline-flex">
        {[...code].map((digit, place) => {
          const steps = 6 + place * 2
          // The strip counts up to the real digit: e.g. 3, 4, ... 9, 0, 1, 2, then 2.
          const strip = Array.from({ length: steps }, (_, k) => (Number(digit) + 10 - steps + k) % 10)
          return (
            <span key={place} className="code-roll" style={{ '--n': place, '--end': `-${steps}em` }}>
              <span>
                {strip.map((n, k) => <span key={k}>{n}</span>)}
                <span>{digit}</span>
              </span>
            </span>
          )
        })}
      </span>
    </>
  )
}

// kind: "Pickup" or "Delivery". codeTestId keeps the tests' hook on the code.
// rollCode: show the code as rolling digits (the Home page example only).
export default function ParcelPass({ kind, code, shipment, journey, codeTestId, note = 'Would arrive by SMS', rollCode = false }) {
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
          <p className="font-display text-5xl font-bold leading-none tracking-[0.2em]" data-testid={codeTestId}>
            {rollCode ? <RollingCode code={code} /> : code}
          </p>
        </div>
        <p className="max-w-[8rem] text-right text-xs text-muted">{note}</p>
      </div>
    </div>
  )
}
