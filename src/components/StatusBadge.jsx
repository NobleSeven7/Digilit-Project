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

export default function StatusBadge({ status }) {
  const colours = COLOURS[statusTone(status)]

  return (
    <span data-testid="status" className={`inline-block rounded-full border px-3 py-0.5 text-sm font-bold transition-colors duration-200 ${colours}`}>
      {status}
    </span>
  )
}
