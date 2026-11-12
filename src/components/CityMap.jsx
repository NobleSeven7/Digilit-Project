// A simple map of the eight cities, used on the Send page. The route the
// sender picks (From -> To) is drawn in green, so it works for every pair
// of cities. Positions are approximate and the lines are straight: this is
// a picture of the route, not a maps service.
import { tripHours } from '../data/constants.js'

// Where each city sits in the drawing (x, y) and which side its name goes.
// Based on the cities' real positions; Rawalpindi is nudged away from
// Islamabad so the two do not overlap.
const PLACES = {
  Peshawar: { x: 196, y: 34, side: 'left' },
  Islamabad: { x: 246, y: 42, side: 'right' },
  Rawalpindi: { x: 226, y: 62, side: 'left' },
  Lahore: { x: 290, y: 116, side: 'right' },
  Faisalabad: { x: 244, y: 122, side: 'left' },
  Multan: { x: 192, y: 160, side: 'left' },
  Quetta: { x: 44, y: 158, side: 'right' },
  Karachi: { x: 46, y: 330, side: 'right' },
}

export default function CityMap({ origin, destination }) {
  const from = PLACES[origin]
  const to = PLACES[destination]
  const hasRoute = origin !== destination
  const hours = tripHours(origin, destination)

  return (
    <figure className="rounded-lg bg-paper p-3" data-testid="city-map"
      data-route={hasRoute ? `${origin}-${destination}` : ''}>
      <svg viewBox="0 0 385 360" className="mx-auto block w-full max-w-64" role="img"
        aria-label={hasRoute
          ? `Map showing the route from ${origin} to ${destination}`
          : 'Map of the eight cities'}>
        {/* The chosen route: green road with a dashed centre line */}
        {hasRoute && (
          <>
            <line x1={from.x} y1={from.y} x2={to.x} y2={to.y}
              stroke="var(--color-brand)" strokeWidth="12" strokeLinecap="round" />
            <line x1={from.x} y1={from.y} x2={to.x} y2={to.y}
              stroke="white" strokeWidth="2" strokeDasharray="6 6" opacity="0.75" />
          </>
        )}

        {/* Every city: grey unless it is one end of the chosen route */}
        {Object.entries(PLACES).map(([name, place]) => {
          const chosen = name === origin || name === destination
          const gap = chosen ? 16 : 11
          return (
            <g key={name}>
              <circle cx={place.x} cy={place.y} r={chosen ? 9 : 5} fill="white"
                stroke={chosen ? 'var(--color-brand-dark)' : 'var(--color-muted)'}
                strokeWidth={chosen ? 4 : 2} />
              {/* The white outline keeps a name readable where the road passes behind it */}
              <text x={place.side === 'left' ? place.x - gap : place.x + gap} y={place.y + 5}
                textAnchor={place.side === 'left' ? 'end' : 'start'}
                fontSize={chosen ? 16 : 13} fontWeight={chosen ? 700 : 400}
                fill={chosen ? 'var(--color-ink)' : 'var(--color-muted)'}
                stroke="var(--color-paper)" strokeWidth="4" paintOrder="stroke">
                {name}
              </text>
            </g>
          )
        })}
      </svg>
      <figcaption className="mt-1 text-center text-sm text-muted">
        {hasRoute
          ? `${origin} to ${destination}, about ${hours} hours by road. Map not to scale.`
          : 'Choose two different cities to see the route.'}
      </figcaption>
    </figure>
  )
}
