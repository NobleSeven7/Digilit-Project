// After a delivery: each person rates the other once, 1 to 5 stars, with an
// optional short comment. The carrier's average shows on the Matches page.
import { useState } from 'react'
import { MAX_RATING_COMMENT } from '../data/constants.js'
import { StarIcon } from './Icons.jsx'
import { StarRow } from './Stars.jsx'

const WORDS = ['', 'Poor', 'Not great', 'OK', 'Good', 'Excellent']

export default function RatingForm({ otherName, given, received, canRate, notReady, onRate }) {
  const [stars, setStars] = useState(0)
  const [comment, setComment] = useState('')

  return (
    <section className="mt-4 rounded-lg bg-surface px-4 py-4" data-testid="rating-section">
      {given ? (
        <div data-testid="rating-given">
          <p className="font-bold">You rated {otherName}</p>
          <p className="mt-1 flex flex-wrap items-center gap-2">
            <StarRow stars={given.stars} size={20} />
            <span>{given.stars} of 5, {WORDS[given.stars].toLowerCase()}</span>
          </p>
          {given.comment && <p className="mt-1 text-muted">“{given.comment}”</p>}
        </div>
      ) : canRate && notReady ? (
        <p>Ratings are not switched on yet. The team needs to run the database step for them.</p>
      ) : canRate ? (
        <form onSubmit={(e) => { e.preventDefault(); if (stars) onRate(stars, comment.trim().slice(0, MAX_RATING_COMMENT)) }}>
          <fieldset>
            <legend className="font-bold">How was it with {otherName}?</legend>
            {/* Five buttons; pressing one picks that many stars */}
            <div className="mt-2 flex flex-wrap items-center gap-1" role="radiogroup" aria-label="Stars">
              {[1, 2, 3, 4, 5].map((n) => (
                <button key={n} type="button" role="radio" aria-checked={stars === n}
                  aria-label={`${n} ${n === 1 ? 'star' : 'stars'}, ${WORDS[n].toLowerCase()}`}
                  data-testid={`rating-star-${n}`} onClick={() => setStars(n)}
                  className="flex size-11 items-center justify-center rounded-lg text-brand-ink active:bg-brand-tint">
                  <StarIcon size={30} filled={n <= stars} />
                </button>
              ))}
              <span className="ml-2 font-bold" aria-live="polite">{WORDS[stars]}</span>
            </div>
          </fieldset>
          <label className="label mt-3" htmlFor="rating-comment">Comment (optional)</label>
          <input id="rating-comment" data-testid="rating-comment" className="field" maxLength={MAX_RATING_COMMENT}
            value={comment} onChange={(e) => setComment(e.target.value)} />
          <button type="submit" className="btn btn-primary mt-3" disabled={!stars} data-testid="rating-submit">
            Send rating
          </button>
        </form>
      ) : null}
      {received && (
        <div className={given || canRate ? 'mt-4 border-t border-line pt-3' : ''} data-testid="rating-received">
          <p className="font-bold">{otherName} rated you</p>
          <p className="mt-1 flex flex-wrap items-center gap-2">
            <StarRow stars={received.stars} size={20} />
            <span>{received.stars} of 5</span>
          </p>
          {received.comment && <p className="mt-1 text-muted">“{received.comment}”</p>}
        </div>
      )}
    </section>
  )
}
