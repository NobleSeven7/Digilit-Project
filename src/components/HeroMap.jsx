// The Home page's main picture: the eight cities drawn as a route map. The
// route chosen in the hero's route finder (from, to) is drawn as a heavy
// road with its two end cities labelled; the rest of the network stays quiet
// (thin, light lines and smaller names). A parcel rides the chosen road once
// when the page first opens.
//
// It is a diagram, not a real map: the cities are in roughly the right
// places, and the lines are straightened like a metro map.
import { calculatePrice } from '../lib/pricing.js'
import { formatPKR } from '../lib/format.js'
import { codeOf } from './RouteCodes.jsx'

// The points on the map. Eight cities, plus one junction south of Lahore
// where the Faisalabad line joins the main line.
const POINTS = {
  Peshawar: [60, 80],
  Islamabad: [220, 80],
  Rawalpindi: [220, 150],
  Lahore: [440, 160],
  Faisalabad: [290, 290],
  Multan: [340, 340],
  Quetta: [70, 340],
  Karachi: [130, 440],
  junction: [440, 240],
}

// The lines between neighbouring points. "via" lists the bends in between,
// so every stretch is straight or at 45 degrees.
const LINKS = [
  { a: 'Peshawar', b: 'Islamabad', via: [] },
  { a: 'Islamabad', b: 'Lahore', via: [[300, 160]] },
  { a: 'Islamabad', b: 'Rawalpindi', via: [] },
  { a: 'Rawalpindi', b: 'Faisalabad', via: [[220, 220]] },
  { a: 'Faisalabad', b: 'Multan', via: [] },
  { a: 'Faisalabad', b: 'junction', via: [[390, 290]] },
  { a: 'Lahore', b: 'junction', via: [] },
  { a: 'junction', b: 'Multan', via: [] },
  { a: 'Multan', b: 'Karachi', via: [[240, 440]] },
  { a: 'Quetta', b: 'Multan', via: [] },
  { a: 'Quetta', b: 'Karachi', via: [[70, 380]] },
]

// One link's points from "start" to the other end, bends included.
function linkPoints(link, start) {
  const points = [POINTS[link.a], ...link.via, POINTS[link.b]]
  return start === link.a ? points : points.reverse()
}
const length = (points) => points.slice(1).reduce((sum, [x, y], i) => sum + Math.hypot(x - points[i][0], y - points[i][1]), 0)
const toPath = (points) => points.map(([x, y], i) => `${i ? 'L' : 'M'}${x} ${y}`).join(' ')

// The shortest way along the lines from one city to another (Dijkstra's
// method over nine points: small enough to work out on every change).
// Returns the road as an SVG path, or null for the same city twice.
export function roadBetween(from, to) {
  if (from === to || !POINTS[from] || !POINTS[to]) return null
  const best = { [from]: { cost: 0, points: [POINTS[from]] } }
  const done = new Set()
  for (;;) {
    const here = Object.keys(best).filter((p) => !done.has(p)).sort((a, b) => best[a].cost - best[b].cost)[0]
    if (!here) return null
    if (here === to) return toPath(best[here].points)
    done.add(here)
    for (const link of LINKS.filter((l) => l.a === here || l.b === here)) {
      const next = link.a === here ? link.b : link.a
      const step = linkPoints(link, here)
      const cost = best[here].cost + length(step)
      if (!best[next] || cost < best[next].cost) best[next] = { cost, points: [...best[here].points, ...step.slice(1)] }
    }
  }
}

// Where each city's name goes.
const CITIES = [
  { name: 'Peshawar', label: { x: 44, y: 56, anchor: 'start' } },
  { name: 'Islamabad', label: { x: 220, y: 52, anchor: 'middle' } },
  { name: 'Rawalpindi', label: { x: 200, y: 157, anchor: 'end' } },
  { name: 'Lahore', label: { x: 458, y: 166, anchor: 'start' } },
  { name: 'Faisalabad', label: { x: 274, y: 297, anchor: 'end' } },
  { name: 'Multan', label: { x: 360, y: 346, anchor: 'start' } },
  { name: 'Quetta', label: { x: 54, y: 316, anchor: 'start' } },
  { name: 'Karachi', label: { x: 130, y: 476, anchor: 'middle' } },
]

// kg: the example parcel's weight. changed: true once the person has picked
// a route themselves; the chosen road then redraws quickly (.route-change)
// instead of joining the once-per-visit intro.
export default function HeroMap({ from, to, kg, changed }) {
  const price = formatPKR(calculatePrice(kg))
  const road = roadBetween(from, to)
  const ends = road ? [from, to] : []
  return (
    <svg viewBox="28 26 520 462" className="block w-full xl:w-[calc(100%+4rem)] xl:max-w-none" role="img" data-testid="hero-map"
      data-route={road ? `${codeOf(from)}-${codeOf(to)}` : ''}
      aria-label={road
        ? `Route map of eight cities, with ${from} to ${to} highlighted. A ${kg} kg parcel costs ${price}.`
        : 'Route map of eight cities.'}>
      {/* The whole network, quiet: thin, light lines */}
      {LINKS.map((link, index) => (
        <path key={`${link.a}-${link.b}`} d={toPath(linkPoints(link, link.a))} pathLength="1" className="route-draw"
          style={{ '--i': index % 5 }} fill="none" stroke="var(--color-route-3)" strokeWidth="7"
          strokeLinecap="round" strokeLinejoin="round" />
      ))}

      {/* The chosen route as a road with a dashed centre line. "key" makes a
          new route a new drawing, so a quick second change replaces the
          first one's animation instead of waiting for it. */}
      {road && (
        <g key={road} className={changed ? 'route-change' : ''} data-testid="map-road">
          <path d={road} pathLength="1" className={changed ? 'route-change-line' : 'route-draw'} style={{ '--i': 5 }}
            fill="none" stroke="var(--color-ink)" strokeWidth="20" strokeLinecap="round" strokeLinejoin="round" />
          <path d={road} className={changed ? '' : 'stop-enter'} style={{ '--i': 6 }}
            fill="none" stroke="var(--color-paper)" strokeWidth="2" strokeDasharray="7 7" opacity="0.8" />
        </g>
      )}

      {/* Stops and city names: the two ends large and dark, the rest small
          and muted */}
      {CITIES.map((city, index) => {
        const [x, y] = POINTS[city.name]
        const end = ends.includes(city.name)
        return (
          <g key={city.name} className="stop-enter" style={{ '--i': index }} data-end={end || undefined}>
            <circle cx={x} cy={y} r={end ? 12 : 7} fill="var(--color-surface)"
              stroke={end ? 'var(--color-ink)' : 'var(--color-route-2)'} strokeWidth={end ? 5 : 3} />
            <text x={city.label.x} y={city.label.y} textAnchor={city.label.anchor}
              fontFamily="var(--font-display)" fontWeight={end ? 700 : 600} fontSize={end ? 28 : 20}
              fill={end ? 'var(--color-ink)' : 'var(--color-muted)'} stroke="var(--color-paper)" strokeWidth="5" paintOrder="stroke">
              {city.name}
            </text>
          </g>
        )
      })}

      {/* The fare tag, top right: the chosen route and its price */}
      {road && (
        <g className="stop-enter" style={{ '--i': 10 }} data-testid="map-fare">
          <rect x="300" y="34" width="240" height="40" rx="4" fill="var(--color-surface)"
            stroke="var(--color-ink)" strokeWidth="2.5" />
          <text x="420" y="62" textAnchor="middle">
            <tspan fontFamily="var(--font-display)" fontWeight="600" fontSize="18" fill="var(--color-muted)">
              {codeOf(from)}–{codeOf(to)}, {kg} kg
            </tspan>
            <tspan dx="8" fontFamily="var(--font-display)" fontWeight="700" fontSize="23"
              fill="var(--color-ink)">{price}</tspan>
          </text>
        </g>
      )}

      {/* The parcel: rides the road once in the intro, then rests at the
          destination. On a route change it simply sits at the new end. */}
      {road && (
        <circle key={`parcel-${road}`} className="map-parcel" r="9" fill="var(--color-hold)"
          stroke="var(--color-surface)" strokeWidth="3.5" style={{ offsetPath: `path("${road}")` }} />
      )}
    </svg>
  )
}
