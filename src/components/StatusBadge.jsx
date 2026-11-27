// A small coloured label for a status such as "Delivered" or "Frozen".
import { STATUS, DELIVERY, ESCROW } from '../data/constants.js'

// Which colour family each status uses.
const GOOD = ['Accepted', STATUS.FOUND, STATUS.MATCHED, STATUS.DELIVERED, DELIVERY.IN_TRANSIT, ESCROW.RELEASED]
const BAD = ['Not eligible', STATUS.DISPUTED, STATUS.CANCELLED, STATUS.FLAGGED, DELIVERY.DECLINED, ESCROW.FROZEN]

// Things that need attention now, in the accent red (DESIGN.md: money held
// and items waiting for a person): money held or frozen, and admin to-dos.
const ATTENTION = [ESCROW.HELD, 'Needs review']

// Four families:
//   "good"      done or on track: tan with a black outline
//   "bad"       a problem: oxblood
//   "attention" money held, or a person must act: the accent red
//   "waiting"   nothing wrong, just not done yet: plain paper with a dashed
//               outline (like a button that is not ready), so a normal wait
//               never looks like an error
// The Dashboard bars use the same families, so a status has one colour everywhere.
export function statusTone(status) {
  if (GOOD.includes(status)) return 'good'
  if (BAD.includes(status)) return 'bad'
  if (ATTENTION.includes(status) || / frozen$/.test(status)) return 'attention'
  return 'waiting'
}

const COLOURS = {
  good: 'bg-brand-tint text-brand-ink border-brand-ink',
  bad: 'bg-fail-tint text-fail border-fail',
  attention: 'bg-hold-tint text-hold-ink border-hold',
  waiting: 'border-dashed border-muted bg-surface text-ink',
}

// Printed flat, like a stamp on the label: no shadow and no press effect, so it
// is never mistaken for a button. Small bold type gets a touch of extra letter
// spacing and a tight line height, so every badge is the same height and stays
// on one line; numbers (e.g. "PKR 500 frozen") use equal-width digits.
// shrink-0 keeps it on one line in a row; max-w-full lets it wrap only when it
// is wider than the whole space it has (very large text), instead of pushing
// the page sideways.
// Words shown for a stored status, where plainer words read better. The
// stored value stays the same (it is saved in the database and the Sheet).
const LABELS = {
  [ESCROW.HELD]: 'Held safely by RaastaShare',
}

export default function StatusBadge({ status }) {
  const colours = COLOURS[statusTone(status)]

  return (
    <span data-testid="status" className={`inline-flex max-w-full shrink-0 items-center rounded-full border px-3 py-1 text-sm font-bold leading-tight tracking-[0.01em] tabular-nums transition-colors duration-200 ${colours}`}>
      {LABELS[status] ?? status}
    </span>
  )
}
