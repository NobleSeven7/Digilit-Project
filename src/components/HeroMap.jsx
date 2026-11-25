// The Home page's main picture: the eight cities drawn as a route map, in
// shades of the brand green. The Islamabad to Lahore route (the demo case)
// is drawn as a road, and a parcel rides along it once when the page opens.
//
// It is a diagram, not a real map: the cities are in roughly the right
// places, and the lines are straightened like a metro map.
import { calculatePrice } from '../lib/pricing.js'
import { formatPKR } from '../lib/format.js'

const DEMO_KG = 5

// Status notes around the map, telling the demo trip the way the app would:
// matched, picked up, delivered. Each appears when that moment happens in the
// intro (the parcel sets off at 2.1s and arrives at about 4.7s), so the map
// reads as one short story. On a return visit, or with reduced motion, they
// are simply there (they use .stop-enter, like the city names).
// done: a filled tick; otherwise an outlined ring.
function Note({ x, y, width, title, detail, delay, done }) {
  return (
    <g className="stop-enter" style={{ animationDelay: delay }}>
      <rect x={x} y={y} width={width} height="54" rx="10" fill="var(--color-surface)"
        stroke="var(--color-line)" strokeWidth="2" />
      <circle cx={x + 22} cy={y + 27} r="10" fill={done ? 'var(--color-brand-ink)' : 'var(--color-surface)'}
        stroke="var(--color-brand-ink)" strokeWidth="2.5" />
      {done && <path d={`M${x + 17} ${y + 27.5} l3.5 3.5 l6.5 -7`} fill="none" stroke="var(--color-surface)"
        strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round" />}
      <text x={x + 42} y={y + 23} fontFamily="var(--font-body)" fontWeight="700" fontSize="16" fill="var(--color-ink)">{title}</text>
      <text x={x + 42} y={y + 43} fontFamily="var(--font-body)" fontSize="14" fill="var(--color-muted)">{detail}</text>
    </g>
  )
}

// The routes, back to front. Each is a path of straight and 45-degree stretches.
const ROUTES = [
  { d: 'M70 340 V380 L130 440', colour: 'var(--color-route-3)' },            // Quetta - Karachi
  { d: 'M70 340 H340', colour: 'var(--color-route-3)' },                     // Quetta - Multan
  { d: 'M290 290 H390 L440 240', colour: 'var(--color-route-2)' },           // Faisalabad - Lahore
  { d: 'M220 80 V220 L340 340', colour: 'var(--color-route-2)' },            // Islamabad - Rawalpindi - Faisalabad - Multan
  { d: 'M60 80 H220 L300 160 H440 V240 L240 440 H130', colour: 'var(--color-brand-ink)' }, // Peshawar ... Karachi
]

// The demo route, drawn on top as a road with a dashed centre line.
const DEMO_ROAD = 'M220 80 L300 160 H440'

// The cities. "label" says where the name goes; "big" marks the larger stops.
const CITIES = [
  { name: 'Peshawar', x: 60, y: 80, label: { x: 44, y: 56, anchor: 'start' } },
  { name: 'Islamabad', x: 220, y: 80, big: true, label: { x: 220, y: 52, anchor: 'middle' } },
  { name: 'Rawalpindi', x: 220, y: 150, label: { x: 200, y: 157, anchor: 'end' } },
  { name: 'Lahore', x: 440, y: 160, big: true, label: { x: 458, y: 166, anchor: 'start' } },
  { name: 'Faisalabad', x: 290, y: 290, label: { x: 274, y: 297, anchor: 'end' } },
  { name: 'Multan', x: 340, y: 340, big: true, label: { x: 360, y: 346, anchor: 'start' } },
  { name: 'Quetta', x: 70, y: 340, label: { x: 54, y: 316, anchor: 'start' } },
  { name: 'Karachi', x: 130, y: 440, label: { x: 130, y: 476, anchor: 'middle' } },
]

export default function HeroMap() {
  const price = formatPKR(calculatePrice(DEMO_KG))
  return (
    <svg viewBox="28 26 520 462" className="block w-full" role="img" data-testid="hero-map"
      aria-label={`Route map of eight cities. A ${DEMO_KG} kg parcel travels from Islamabad to Lahore for ${price}: matched with Bilal Ahmed, picked up in Islamabad, delivered in Lahore.`}>
      {/* The routes draw themselves one after another */}
      {ROUTES.map((route, index) => (
        <path key={route.d} d={route.d} pathLength="1" className="route-draw" style={{ '--i': index }}
          fill="none" stroke={route.colour} strokeWidth="13" strokeLinecap="round" strokeLinejoin="round" />
      ))}

      {/* The demo route as a road */}
      <path d={DEMO_ROAD} pathLength="1" className="route-draw" style={{ '--i': 5 }}
        fill="none" stroke="var(--color-brand-dark)" strokeWidth="22" strokeLinecap="round" strokeLinejoin="round" />
      <path d={DEMO_ROAD} className="stop-enter" style={{ '--i': 6 }}
        fill="none" stroke="white" strokeWidth="2" strokeDasharray="7 7" opacity="0.8" />

      {/* Stops and city names */}
      {CITIES.map((city, index) => (
        <g key={city.name} className="stop-enter" style={{ '--i': index }}>
          <circle cx={city.x} cy={city.y} r={city.big ? 12 : 8} fill="var(--color-surface)"
            stroke="var(--color-ink)" strokeWidth={city.big ? 5 : 4} />
          <text x={city.label.x} y={city.label.y} textAnchor={city.label.anchor}
            fontFamily="var(--font-display)" fontWeight="600" fontSize={city.big ? 27 : 22}
            fill="var(--color-ink)" stroke="var(--color-paper)" strokeWidth="5" paintOrder="stroke">
            {city.name}
          </text>
        </g>
      ))}

      {/* The fare tag above the demo road */}
      <g className="stop-enter" style={{ '--i': 10 }}>
        <rect x="286" y="100" width="150" height="38" rx="19" fill="var(--color-surface)"
          stroke="var(--color-ink)" strokeWidth="2.5" />
        <text x="304" y="126" fontFamily="var(--font-body)" fontSize="17" fill="var(--color-muted)">{DEMO_KG} kg</text>
        <text x="420" y="127" textAnchor="end" fontFamily="var(--font-display)" fontWeight="700" fontSize="23"
          fill="var(--color-brand-ink)">{price}</text>
      </g>

      {/* Status notes: the demo trip as it happens */}
      <Note x={344} y={34} width={196} delay="1500ms" done
        title="Carrier matched" detail="Bilal Ahmed, best of 3" />
      <Note x={36} y={178} width={150} delay="2100ms" done
        title="Picked up" detail="Code checked" />
      <Note x={336} y={410} width={206} delay="4600ms" done
        title="Delivered in Lahore" detail={`${price} paid to carrier`} />

      {/* The parcel riding the road */}
      <circle className="map-parcel" r="9" fill="var(--color-hold)" stroke="var(--color-surface)" strokeWidth="3.5" />
    </svg>
  )
}
