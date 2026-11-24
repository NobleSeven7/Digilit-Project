// A route written the way a luggage tag or boarding pass writes it: the two
// city codes large ("ISB → LHE") with the full city names small underneath.
// Screen readers hear the full names ("Islamabad to Lahore").
import { CITY_CODES } from '../data/constants.js'

export const codeOf = (city) => CITY_CODES[city] ?? city.slice(0, 3).toUpperCase()

// size: "sm" (lists), "md" (cards, default), "lg" (hero), "pass" (the parcel
// pass: like md, but capped by the pass's own width, in cqi, so the codes
// still fit inside it with very large text; see .pass in src/index.css)
const SIZES = { sm: 'text-2xl', md: 'text-4xl', lg: 'text-6xl sm:text-7xl', pass: 'text-[min(2.25rem,17cqi)]' }
const ARROWS = { lg: 'text-4xl', pass: 'text-[min(1.5rem,11cqi)]' }

export default function RouteCodes({ origin, destination, size = 'md', className = '', tone = '' }) {
  return (
    // flex-wrap: if the two cities cannot fit side by side (very large text in a
    // narrow pass), the arrow and destination move to the next line.
    // (gap-x is only the minimum space: justify-between spreads them anyway.)
    <div className={`flex flex-wrap items-end justify-between gap-x-2 gap-y-2 ${className}`} aria-label={`${origin} to ${destination}`} role="img">
      <div>
        <p className={`font-display font-bold leading-none tracking-tight ${SIZES[size]}`}>{codeOf(origin)}</p>
        <p className={`mt-1 text-sm ${tone || 'text-muted'}`}>{origin}</p>
      </div>
      <span aria-hidden="true" className={`pb-6 font-display font-bold ${ARROWS[size] ?? 'text-2xl'}`}>→</span>
      <div className="text-right">
        <p className={`font-display font-bold leading-none tracking-tight ${SIZES[size]}`}>{codeOf(destination)}</p>
        <p className={`mt-1 text-sm ${tone || 'text-muted'}`}>{destination}</p>
      </div>
    </div>
  )
}
