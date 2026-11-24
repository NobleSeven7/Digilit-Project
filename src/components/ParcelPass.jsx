// The parcel pass: the pickup or delivery code laid out like a boarding pass
// or luggage tag. The green top half says which parcel and trip it is; the
// bottom half, below a tear line, holds the 4-digit code.
// In this demo the pass is shown on screen; a live service would send it by SMS.
import { formatDateTime } from '../lib/format.js'
import RouteCodes from './RouteCodes.jsx'

function Field({ label, value }) {
  return (
    <div className="min-w-0">
      <p className="text-sm leading-tight tracking-[0.01em] text-on-brand-soft [overflow-wrap:anywhere]">{label}</p>
      {/* A word wider than its column (very large text) breaks onto the next
          line instead of being cut short with "…" (value) or spilling into the
          next column (label), so it can still be read. */}
      <p className="mt-0.5 font-bold leading-snug [overflow-wrap:anywhere]">{value}</p>
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

// Like a real paper ticket, the pass is one object: the two notches are holes
// cut through it (see .pass-top and .pass-bottom in src/index.css), so the page
// shows through them on any background, and its shadow follows that shape.
// It cannot be pressed, so it has no press effect: only things that do
// something when pressed should answer a press.
//
// kind: "Pickup" or "Delivery". codeTestId keeps the tests' hook on the code.
// rollCode: show the code as rolling digits (the Home page example only).
export default function ParcelPass({ kind, code, shipment, journey, codeTestId, note = 'Would arrive by SMS', rollCode = false }) {
  return (
    <div className="pass w-full max-w-sm text-ink" data-testid="parcel-pass">
      {/* Top: the trip */}
      <div className="pass-top rounded-t-2xl bg-brand p-5 text-white">
        <div className="flex flex-wrap items-center justify-between gap-x-3 gap-y-2 text-sm">
          <span className="font-display text-lg font-bold leading-tight">RaastaShare</span>
          <span className="whitespace-nowrap rounded-full border border-white px-3 py-1 text-sm font-bold leading-tight tracking-[0.01em]">{kind} pass</span>
        </div>
        <RouteCodes origin={shipment.origin} destination={shipment.destination} size="pass" className="mt-4" tone="text-on-brand-soft" />
        {/* Two columns while each has at least 5rem; with very large text (5rem
            grows with it) the details go into one column instead of squeezing. */}
        <div className="mt-4 grid grid-cols-[repeat(auto-fit,minmax(min(100%,5rem),1fr))] gap-x-4 gap-y-2 text-sm">
          <Field label="Sender" value={shipment.senderName} />
          <Field label="Carrier" value={journey.carrierName} />
          <Field label="Parcel" value={`${shipment.weightKg} kg ${shipment.itemType.toLowerCase()}`} />
          <Field label="Departs" value={formatDateTime(journey.departure)} />
        </div>
      </div>
      {/* Bottom: the code, below a tear line between the two notches */}
      {/* flex-wrap: with very large text the note moves under the code */}
      <div className="pass-bottom relative flex flex-wrap items-end justify-between gap-4 rounded-b-2xl border border-t-0 border-line bg-surface p-5">
        <span aria-hidden="true" className="absolute inset-x-5 top-0 border-t-2 border-dashed border-line" />
        <div>
          <p className="text-sm leading-tight tracking-[0.01em] text-muted">{kind} code</p>
          {/* Digits are spaced so the code can be read out one by one, and
              all the same width, so codes line up and do not shift. */}
          <p className="mt-1 font-display text-[min(3rem,22cqi)] font-bold leading-none tracking-[0.12em] tabular-nums" data-testid={codeTestId}>
            {rollCode ? <RollingCode code={code} /> : code}
          </p>
        </div>
        {/* Starts at zero width (flex-basis 0, min-w-0) and grows into the room
            beside the code, so it only moves under the code when the code
            itself fills the row (very large text). */}
        <p className="min-w-0 max-w-[8rem] flex-[1_1_0%] text-right text-xs leading-snug tracking-[0.01em] text-muted">{note}</p>
      </div>
    </div>
  )
}
