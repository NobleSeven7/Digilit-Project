// A person's star rating, e.g. five stars with 4 filled and "4.5 from 2 ratings".
import { StarIcon } from './Icons.jsx'
import { ratingText } from '../lib/ratings.js'

// Five stars for a number of stars (0-5); rounded to the nearest whole star.
export function StarRow({ stars, size = 16 }) {
  const filled = Math.round(stars)
  return (
    <span className="inline-flex shrink-0 text-brand-ink" aria-hidden="true">
      {[1, 2, 3, 4, 5].map((n) => <StarIcon key={n} size={size} filled={n <= filled} />)}
    </span>
  )
}

// The summary shown beside a name (Matches cards, History).
export default function Stars({ rating, testId = 'rating' }) {
  const text = ratingText(rating)
  return (
    <span className="inline-flex flex-wrap items-center gap-x-1.5 text-sm" data-testid={testId}
      aria-label={rating.count ? `Rated ${text}` : text}>
      {rating.count > 0 && <StarRow stars={rating.average} />}
      <span className={rating.count ? 'font-bold' : 'text-muted'}>{text}</span>
    </span>
  )
}
