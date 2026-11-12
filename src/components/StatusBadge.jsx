// A small coloured label for a status such as "Delivered" or "Held in escrow".
import { STATUS, DELIVERY, ESCROW } from '../data/constants.js'

// Which colour family each status uses.
const GOOD = [STATUS.FOUND, STATUS.MATCHED, STATUS.DELIVERED, DELIVERY.IN_TRANSIT, ESCROW.RELEASED]
const BAD = ['Not eligible', STATUS.DISPUTED, STATUS.CANCELLED, STATUS.FLAGGED, DELIVERY.DECLINED, ESCROW.FROZEN]

export default function StatusBadge({ status }) {
  let colours = 'bg-hold-tint text-hold-ink border-hold' // default: amber = waiting
  if (GOOD.includes(status)) colours = 'bg-brand-tint text-brand-ink border-brand-ink'
  if (BAD.includes(status)) colours = 'bg-fail-tint text-fail border-fail'

  return (
    <span data-testid="status" className={`inline-block rounded-full border px-3 py-0.5 text-sm font-bold ${colours}`}>
      {status}
    </span>
  )
}
