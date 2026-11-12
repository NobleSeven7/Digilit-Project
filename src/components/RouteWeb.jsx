// A decorative background for the Home page hero: a web of routes drawn like
// a transit map, in a green only slightly lighter than the hero itself, so
// it reads as a faint pattern behind the text. It is decoration only
// (hidden from screen readers) and does not show real roads.

// Each route is a path made of straight and 45-degree stretches.
const ROUTES = [
  'M-20 120 H260 L380 240 H700 L820 120 H1020',
  'M140 -20 V200 L300 360 H620 L760 500 H1020',
  'M480 -20 V240 L600 360 V580',
  'M880 -20 V300 L760 420 V580',
  'M-20 300 H120 L240 420 H560 L640 500 V580',
  'M-20 500 H160 L240 420',
  'M700 240 L820 360 H1020',
]

// Stops along the routes. "big" marks a junction where routes meet.
const STOPS = [
  { x: 140, y: 120, big: true }, { x: 260, y: 120 }, { x: 480, y: 120 },
  { x: 380, y: 240 }, { x: 480, y: 240, big: true }, { x: 700, y: 240, big: true },
  { x: 820, y: 120 }, { x: 880, y: 120, big: true }, { x: 140, y: 200 },
  { x: 300, y: 360 }, { x: 600, y: 360, big: true }, { x: 820, y: 360 },
  { x: 880, y: 300 }, { x: 760, y: 420 }, { x: 760, y: 500, big: true },
  { x: 120, y: 300 }, { x: 240, y: 420, big: true }, { x: 560, y: 420 },
  { x: 640, y: 500 }, { x: 160, y: 500 }, { x: 940, y: 500 }, { x: 60, y: 120 },
]

export default function RouteWeb() {
  return (
    <svg aria-hidden="true" viewBox="0 0 1000 560" preserveAspectRatio="xMidYMid slice"
      className="route-web pointer-events-none absolute inset-0 size-full">
      {ROUTES.map((d) => (
        <path key={d} d={d} fill="none" stroke="var(--color-brand-light)" strokeWidth="10"
          strokeLinecap="round" strokeLinejoin="round" />
      ))}
      {STOPS.map((stop) => (
        <circle key={`${stop.x}-${stop.y}`} cx={stop.x} cy={stop.y} r={stop.big ? 11 : 7}
          fill="var(--color-brand)" stroke="var(--color-brand-light)" strokeWidth={stop.big ? 5 : 4} />
      ))}
    </svg>
  )
}
