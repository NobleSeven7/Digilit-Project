// The Home page illustration: the Islamabad to Lahore motorway drawn as a
// simple route map, in the same style as the RouteLine (green road, dashed
// white centre line, round stops). An amber dot travels the route once when
// the page opens, like a parcel riding along with a carrier.
import { tripHours } from '../data/constants.js'

// The shape of the road. The same path is used by the CSS animation
// (see ".route-parcel" in index.css), so keep the two in step.
const ROAD = 'M60 40 V110 L130 180 H220 L260 220 V320'

// Stops along the M-2 motorway. "side" says where the label sits.
const STOPS = [
  { name: 'Islamabad', x: 60, y: 40, side: 'right', end: true },
  { name: 'Chakri', x: 60, y: 95, side: 'right' },
  { name: 'Kallar Kahar', x: 112, y: 162, side: 'left' },
  { name: 'Bhera', x: 175, y: 180, side: 'above' },
  { name: 'Pindi Bhattian', x: 240, y: 200, side: 'right' },
  { name: 'Sheikhupura', x: 260, y: 270, side: 'left' },
  { name: 'Lahore', x: 260, y: 320, side: 'left', end: true },
]

// Where to draw a stop's label, depending on its side.
function labelProps(stop) {
  const gap = stop.end ? 20 : 16
  if (stop.side === 'left') return { x: stop.x - gap, y: stop.y + 5, textAnchor: 'end' }
  if (stop.side === 'above') return { x: stop.x, y: stop.y - 16, textAnchor: 'middle' }
  return { x: stop.x + gap, y: stop.y + 5, textAnchor: 'start' }
}

export default function RouteMap() {
  const hours = tripHours('Islamabad', 'Lahore')
  return (
    <figure className="rounded-xl bg-white p-4 text-ink">
      <svg viewBox="0 0 360 360" className="mx-auto block w-full max-w-xs" role="img"
        aria-label="Route map of the motorway from Islamabad to Lahore, with five stops in between">
        {/* The road, then its dashed centre line on top */}
        <path d={ROAD} fill="none" stroke="var(--color-brand)" strokeWidth="16"
          strokeLinecap="round" strokeLinejoin="round" />
        <path d={ROAD} fill="none" stroke="white" strokeWidth="2" strokeDasharray="7 7" opacity="0.75" />

        {/* Stops and their names */}
        {STOPS.map((stop) => (
          <g key={stop.name}>
            <circle cx={stop.x} cy={stop.y} r={stop.end ? 11 : 7} fill="white"
              stroke="var(--color-brand-dark)" strokeWidth={stop.end ? 5 : 3} />
            <text {...labelProps(stop)} fill="var(--color-ink)"
              fontSize={stop.end ? 17 : 13} fontWeight={stop.end ? 700 : 400}
              fontFamily={stop.end ? 'var(--font-display)' : 'var(--font-body)'}>
              {stop.name}
            </text>
          </g>
        ))}

        {/* The parcel: an amber dot that rides the route once */}
        <circle className="route-parcel" r="8" fill="var(--color-hold)" stroke="white" strokeWidth="3" />
      </svg>
      <figcaption className="mt-2 text-center text-sm text-muted">
        About {hours} hours by motorway. Someone is already driving it.
      </figcaption>
    </figure>
  )
}
