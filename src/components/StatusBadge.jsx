// A small coloured label for a status such as "Delivered" or "Held in escrow".
import { STATUS, DELIVERY, ESCROW } from '../data/constants.js'

// Which colour family each status uses.
const GOOD = ['Accepted', STATUS.FOUND, STATUS.MATCHED, STATUS.DELIVERED, DELIVERY.IN_TRANSIT, ESCROW.RELEASED]
const BAD = ['Not eligible', STATUS.DISPUTED, STATUS.CANCELLED, STATUS.FLAGGED, DELIVERY.DECLINED, ESCROW.FROZEN]

// "good" (green), "bad" (red) or "waiting" (amber). The Dashboard bars use
// the same families, so a status has one colour everywhere.
export function statusTone(status) {
  if (GOOD.includes(status)) return 'good'
  if (BAD.includes(status)) return 'bad'
  return 'waiting'
}

const COLOURS = {
  good: 'bg-brand-tint text-brand-ink border-brand-ink',
  bad: 'bg-fail-tint text-fail border-fail',
  waiting: 'bg-hold-tint text-hold-ink border-hold',
}

// Printed flat, like a stamp on the label: no shadow and no press effect, so it
// is never mistaken for a button. Small bold type gets a touch of extra letter
// spacing and a tight line height, so every badge is the same height and stays
// on one line; numbers (e.g. "PKR 500 frozen") use equal-width digits.
export default function StatusBadge({ status }) {
  const colours = COLOURS[statusTone(status)]

  return (
    <span data-testid="status" className={`inline-flex items-center whitespace-nowrap rounded-full border px-3 py-1 text-sm font-bold leading-tight tracking-[0.01em] tabular-nums transition-colors duration-200 ${colours}`}>
      {status}
    </span>
  )
}
