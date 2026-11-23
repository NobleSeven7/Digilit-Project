// A route written the way a luggage tag or boarding pass writes it: the two
// city codes large ("ISB → LHE") with the full city names small underneath.
// Screen readers hear the full names ("Islamabad to Lahore").
import { CITY_CODES } from '../data/constants.js'

export const codeOf = (city) => CITY_CODES[city] ?? city.slice(0, 3).toUpperCase()

// size: "sm" (lists), "md" (cards, default), "lg" (hero and passes)
const SIZES = { sm: 'text-2xl', md: 'text-4xl', lg: 'text-6xl sm:text-7xl' }

export default function RouteCodes({ origin, destination, size = 'md', className = '', tone = '' }) {
  return (
    <div className={`flex items-end justify-between gap-4 ${className}`} aria-label={`${origin} to ${destination}`} role="img">
      <div>
        <p className={`font-display font-bold leading-none tracking-tight ${SIZES[size]}`}>{codeOf(origin)}</p>
        <p className={`mt-1 text-sm ${tone || 'text-muted'}`}>{origin}</p>
      </div>
      <span aria-hidden="true" className={`pb-6 font-display font-bold ${size === 'lg' ? 'text-4xl' : 'text-2xl'}`}>→</span>
      <div className="text-right">
        <p className={`font-display font-bold leading-none tracking-tight ${SIZES[size]}`}>{codeOf(destination)}</p>
        <p className={`mt-1 text-sm ${tone || 'text-muted'}`}>{destination}</p>
      </div>
    </div>
  )
}
