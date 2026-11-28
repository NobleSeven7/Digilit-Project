// Home page: choose whether you are sending a parcel or carrying one.
import { useCallback, useEffect, useId, useRef, useState } from 'react'
import { BASE_FEE, FEE_PER_KG, COURIER_FEE, CITIES, CITY_CODES, tripHours } from '../data/constants.js'
import { calculatePrice, savingPercent } from '../lib/pricing.js'
import { formatPKR } from '../lib/format.js'
import { ArrowRightIcon, CheckIcon } from '../components/Icons.jsx'
import RouteCodes from '../components/RouteCodes.jsx'
import { findMatches } from '../lib/matching.js'
import ParcelPass from '../components/ParcelPass.jsx'
import { createSampleData } from '../data/sampleData.js'
import HeroMap from '../components/HeroMap.jsx'
import { firstWithRole } from '../lib/profile.js'
// Dev-only (break-ui): worst-case data and its switch. Left out of the
// production build, where import.meta.env.DEV is false.
import { HOME_FIXTURES } from '../dev/homeFixtures.js'
import DataToggle from '../dev/DataToggle.jsx'
// Photo from Wikimedia Commons (credit under the photo and in the README),
// printed as a halftone in label black on kraft (light) and the reverse (dark).
import terminalPrintLight from '../assets/home/photo-daewoo-terminal-halftone-light.png'
import terminalPrintDark from '../assets/home/photo-daewoo-terminal-halftone-dark.png'

// The demo case from the proposal.
const DEMO_KG = 5

// The trust strip under the hero: three things the app really does, each
// checked in the code (matching.js runs four rules; Delivery.jsx makes a
// pickup and a delivery code and holds the fee until the second one).
// Thin rules between them, no boxes.
const TRUST = [
  { fact: 'Four checks on every carrier', detail: 'Route, timing, space and vehicle, before anyone is ranked.' },
  { fact: 'A code at each end', detail: 'The carrier enters a pickup code, then a delivery code.' },
  { fact: 'Money held until delivery', detail: 'The fee is released only when the delivery code is entered. Payments are simulated in this student prototype.' },
]

function TrustStrip({ items }) {
  return (
    <ul data-testid="trust-strip"
      className="trust-strip mt-10 grid divide-y divide-line border-y border-line sm:grid-cols-3 sm:divide-x sm:divide-y-0">
      {items.map(({ fact, detail }) => (
        <li key={fact} className="min-w-0 py-4 sm:px-5 sm:first:pl-0">
          <p className="font-bold text-ink">{fact}</p>
          {detail && <p className="mt-1 text-sm text-muted">{detail}</p>}
        </li>
      ))}
    </ul>
  )
}

// "Routes we cover": Islamabad to each of the other seven cities, built from
// the city list and city codes in src/data/constants.js. Any two of the eight
// cities work the same way. Each row opens the Send page with that route
// already chosen (#/sender/ISB-KHI; see routeFromAddress in Sender.jsx). A
// route missing a code opens the Send page on its usual route.
const HUB = 'Islamabad'
const ROUTES = CITIES.filter((city) => city !== HUB).map((to) => ({
  from: HUB, to, fromCode: CITY_CODES[HUB], toCode: CITY_CODES[to], hours: tripHours(HUB, to),
}))

// Road time in plain words: "about 30 minutes", "about 4.5 hours". The times
// are approximate (see tripHours in constants.js). Unknown (a pair missing
// from the table gives 0) means no time is shown at all.
function roadTime(hours) {
  if (!(hours > 0)) return null
  return hours < 1 ? `about ${Math.round(hours * 60)} minutes` : `about ${hours} hours`
}

// Small counts as words ("seven"), larger ones as digits.
const WORDS = ['no', 'one', 'two', 'three', 'four', 'five', 'six', 'seven', 'eight', 'nine', 'ten']
const inWords = (n) => WORDS[n] ?? String(n)

function RouteList({ routes, onChoose }) {
  return (
    <ul data-testid="route-list" className="mt-8 border-t border-line">
      {routes.map(({ from, to, fromCode, toCode, hours }) => {
        const time = roadTime(hours)
        return (
        <li key={to}>
          <a href={fromCode && toCode ? `#/sender/${fromCode}-${toCode}` : '#/sender'} onClick={onChoose} data-testid="route-link"
            className="flex min-h-16 items-center gap-4 border-b border-line py-3 text-ink no-underline transition-colors
                       duration-(--dur-press) ease-[var(--ease-out)] hover:bg-surface/60 active:bg-sunk">
            <span className="min-w-0 flex-1">
              <span aria-hidden="true" className="block font-display text-2xl font-bold text-brand-ink">
                {/* A city without a code yet shows its name instead */}
                {fromCode || from} → {toCode || to}
              </span>
              <span className="mt-0.5 block text-sm text-muted">
                {from} to {to}{time && `, ${time} by road`}
              </span>
            </span>
            <span className="shrink-0 text-brand-ink"><ArrowRightIcon size={22} /></span>
          </a>
        </li>
        )
      })}
    </ul>
  )
}

// One line of the price comparison: a name, a price, and a bar drawn to scale.
// It sits on the label-black band, so everything is white.
// The bars are drawn at once (no scroll-in fill: DESIGN.md > Motion).
function PriceRow({ name, note, price, highlight }) {
  return (
    <li>
      <div className="flex items-end justify-between gap-4">
        <p className="min-w-0">
          <span className="font-display text-2xl font-semibold sm:text-3xl">{name}</span>
          <span className="block text-on-brand-soft">{note}</span>
        </p>
        <p className="whitespace-nowrap font-display text-4xl font-bold tabular-nums leading-none sm:text-7xl">
          {formatPKR(price)}
        </p>
      </div>
      <div className="mt-3 h-4 rounded-full bg-white/15" aria-hidden="true">
        <div className={`h-4 rounded-full ${highlight ? 'bg-hold' : 'bg-white/45'}`}
          style={{ width: `${(price / COURIER_FEE) * 100}%` }} />
      </div>
    </li>
  )
}

// Joins "PKR 60" with a no-break space, so a narrow screen never puts
// "PKR" at the end of one line and "60" at the start of the next.
const keepTogether = (text) => text.replace(/ /g, '\u00a0')

// A phone outline. Whatever is inside is its screen. It keeps one size
// (a fixed shape), so changing step never makes it jump. Its round corners are
// the one exception to the square label corners (rounded-phone).
function Phone({ label, children }) {
  return (
    <div className="relative mx-auto min-h-[31rem] w-full max-w-[20rem] overflow-hidden rounded-phone border-[10px] border-ink bg-paper shadow-[var(--shadow-lift)]"
      role="img" aria-label={label}>
      <div className="absolute left-1/2 top-2 z-10 h-5 w-24 -translate-x-1/2 rounded-full bg-ink" aria-hidden="true" />
      <div className="pt-9" aria-hidden="true">{children}</div>
    </div>
  )
}

// The hero's route finder (a "where to?" box, as on booking sites): choose
// two cities and go straight to the Send page with that route filled in
// (#/sender/ISB-KHI, the same address the route list uses). The chosen
// cities live in Home, so the map, the fare and the link always agree.
// The fare comes from the app's own pricing (calculatePrice); it depends on
// the weight, not the route. The courier price is our estimate.
// It sits on a flat surface, not the grainy page (DESIGN.md > Home page).
function RouteFinder({ from, to, onChange, onGo }) {
  const same = from === to
  const time = roadTime(tripHours(from, to))
  const id = useId()
  return (
    <div className="hero-enter mt-5 max-w-md rounded-surface border border-line bg-surface p-4 [--d:110ms]" data-testid="route-picker">
      <div className="grid grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] items-end gap-2">
        <div className="min-w-0">
          <label className="label" htmlFor={`${id}-from`}>From</label>
          <select id={`${id}-from`} className="field" value={from} data-testid="picker-from"
            onChange={(event) => onChange(event.target.value, to)}>
            {CITIES.map((city) => <option key={city}>{city}</option>)}
          </select>
        </div>
        <span aria-hidden="true" className="pb-3 text-brand-ink"><ArrowRightIcon size={20} /></span>
        <div className="min-w-0">
          <label className="label" htmlFor={`${id}-to`}>To</label>
          <select id={`${id}-to`} className="field" value={to} data-testid="picker-to"
            onChange={(event) => onChange(from, event.target.value)}>
            {CITIES.map((city) => <option key={city}>{city}</option>)}
          </select>
        </div>
      </div>
      <p className="mt-3 text-sm text-muted" data-testid="hero-fact" aria-live="polite">
        {same ? 'Choose two different cities.' : (
          <>
            <span className="font-bold text-ink" data-testid="hero-fare">{DEMO_KG} kg: {formatPKR(calculatePrice(DEMO_KG))}</span>
            {time && `, ${time} by road`}. By courier, about {keepTogether(formatPKR(COURIER_FEE))} (our estimate).
          </>
        )}
      </p>
      {same
        ? <button type="button" className="btn btn-primary mt-3 w-full" disabled>Find a carrier</button>
        : <a href={`#/sender/${CITY_CODES[from]}-${CITY_CODES[to]}`} onClick={onGo} data-testid="picker-go"
            className="btn btn-primary mt-3 w-full gap-2 no-underline">
            Find a carrier <ArrowRightIcon size={20} />
          </a>}
    </div>
  )
}

// The pickup pass for the demo parcel (Ayesha Khan's 5 kg, carried by Bilal
// Ahmed). The code is an example; real codes are random.
// Worked out once, when the page code loads, not on every redraw.
const SAMPLE = createSampleData()
const PASS_PARCEL = SAMPLE.shipments.find((s) => s.id === 's-demo')
const PASS_JOURNEY = SAMPLE.journeys.find((j) => j.id === 'j-bilal')

// The demo parcel's real match result, from the app's own matching rules:
// the carriers who pass all four checks, best score first.
const MATCH = findMatches(PASS_PARCEL, SAMPLE.journeys).eligible

// A milestone in the demo trip: a filled tick, what happened, and a detail.
function Milestone({ title, detail }) {
  return (
    <li className="flex items-start gap-3">
      <span className="mt-0.5 grid size-6 shrink-0 place-items-center rounded-full bg-brand-ink text-surface" aria-hidden="true">
        <CheckIcon size={14} />
      </span>
      <span className="min-w-0">
        <span className="block font-bold text-ink">{title}</span>
        <span className="block text-sm text-muted">{detail}</span>
      </span>
    </li>
  )
}

// Step 1 on the phone: the parcel as the sender posts it.
function ParcelSummary() {
  return (
    <div className="space-y-3 px-3 pb-4">
      <p className="stamp text-ink">Your parcel</p>
      <div className="rounded-surface border border-line bg-surface p-3">
        <RouteCodes origin={PASS_PARCEL.origin} destination={PASS_PARCEL.destination} size="sm" />
        <dl className="mt-3 grid grid-cols-2 gap-x-3 gap-y-2 text-sm">
          <div><dt className="text-muted">Item</dt><dd className="font-bold">{PASS_PARCEL.itemType}</dd></div>
          <div><dt className="text-muted">Weight</dt><dd className="font-bold">{PASS_PARCEL.weightKg} kg</dd></div>
          <div className="col-span-2"><dt className="text-muted">Fee</dt>
            <dd className="font-bold">{formatPKR(calculatePrice(PASS_PARCEL.weightKg))}</dd></div>
        </dl>
      </div>
      <p className="flex items-center gap-2 text-sm text-ink">
        <span className="text-brand-ink"><CheckIcon size={16} /></span> Checked against four rules
      </p>
    </div>
  )
}

// Step 2 on the phone: the best carriers, ranked by score.
function CarrierMatch() {
  return (
    <div className="space-y-2 px-3 pb-4">
      <p className="stamp text-ink">{MATCH.length} carriers passed</p>
      {MATCH.map(({ journey, score }, index) => (
        <div key={journey.id} className={`rounded-surface border bg-surface p-3 ${index === 0 ? 'border-ink' : 'border-line'}`}>
          <div className="flex items-baseline justify-between gap-2">
            <p className="min-w-0 truncate font-bold">{journey.carrierName}</p>
            <p className="shrink-0 font-display text-xl font-bold tabular-nums">{Math.round(score.total)}<span className="text-sm text-muted">/100</span></p>
          </div>
          <p className="text-sm text-muted">{journey.vehicleType}, {journey.spareKg} kg spare</p>
          {index === 0 && <p className="stamp mt-1 text-sm text-brand-ink">Best match</p>}
        </div>
      ))}
    </div>
  )
}

// The three steps of a delivery, in order (from the proposal: Submit, Accept,
// Verify). Each has the small piece of the real app that explains it, and
// the trip's milestones sit with the step they belong to.
const STEPS = [
  {
    label: 'Submit',
    title: 'Post the parcel',
    text: 'Say what it is, where it is going and when it must leave. Every carrier on that route is checked against four rules straight away.',
    phone: 'A phone showing a posted 5 kg parcel from Islamabad to Lahore, fee PKR 500',
    screen: <ParcelSummary />,
    milestones: [],
  },
  {
    label: 'Accept',
    title: 'Pick a carrier',
    text: 'Carriers who pass all four rules are ranked by a score out of 100. Once both sides accept, the fee is held safely by RaastaShare. Payments are simulated in this student prototype.',
    phone: `A phone showing ${MATCH.length} carriers ranked by score, ${MATCH[0]?.journey.carrierName} first`,
    screen: <CarrierMatch />,
    milestones: [{ title: 'Carrier matched', detail: `${MATCH[0]?.journey.carrierName}, best of ${MATCH.length}` }],
  },
  {
    label: 'Verify',
    title: 'Codes, not phone calls',
    text: 'The parcel gets a pass. The carrier enters the pickup code at the door and the delivery code at the other end. Only then is the money released.',
    phone: 'A phone showing a RaastaShare pickup pass from Islamabad to Lahore, code 4827',
    screen: (
      <div className="px-2 pb-3">
        <ParcelPass kind="Pickup" code="4827" shipment={PASS_PARCEL} journey={PASS_JOURNEY} note="Example pass" />
      </div>
    ),
    milestones: [
      { title: 'Picked up', detail: 'Code checked at the door' },
      { title: 'Delivered in Lahore', detail: `${formatPKR(calculatePrice(DEMO_KG))} paid to the carrier` },
    ],
  },
]

// "How it works": one phone that stays in place, and three step buttons
// (a tab list: Tab reaches the chosen step, the arrow keys move between
// steps, and Enter or Space choose one). Changing step swaps only the
// phone's screen, with a short fade (.step-swap); the text and milestones
// change with it. On phones the buttons sit right above the phone.
function Walkthrough() {
  const [current, setCurrent] = useState(0)
  const tabs = useRef([])
  const id = useId()
  const step = STEPS[current]
  const onKeyDown = (event) => {
    const move = { ArrowRight: 1, ArrowDown: 1, ArrowLeft: -1, ArrowUp: -1 }[event.key]
    let next = move === undefined ? null : (current + move + STEPS.length) % STEPS.length
    if (event.key === 'Home') next = 0
    if (event.key === 'End') next = STEPS.length - 1
    if (next === null) return
    event.preventDefault()
    setCurrent(next)
    tabs.current[next]?.focus()
  }
  return (
    <div className="mt-8 grid gap-6 lg:mt-12 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)] lg:items-start lg:gap-16" data-testid="walkthrough">
      <div className="contents lg:block">
        <div role="tablist" aria-label="Steps" onKeyDown={onKeyDown}
          className="order-1 grid grid-cols-3 gap-px border-y border-line bg-line lg:grid-cols-1">
          {STEPS.map((s, index) => {
            const chosen = index === current
            return (
              <button key={s.label} type="button" role="tab" id={`${id}-tab-${index}`} aria-selected={chosen}
                aria-controls={`${id}-panel`} tabIndex={chosen ? 0 : -1} data-testid="step-tab"
                ref={(el) => { tabs.current[index] = el }} onClick={() => setCurrent(index)}
                className={`flex min-h-14 min-w-0 cursor-pointer flex-col items-start justify-center gap-0.5 px-3 py-2 text-left lg:justify-start transition-colors
                            duration-(--dur-press) ease-[var(--ease-out)] lg:flex-row lg:items-baseline lg:gap-3 lg:px-4 lg:py-4
                            ${chosen ? 'bg-surface text-ink shadow-[inset_0_4px_0_var(--color-hold)] lg:shadow-[inset_4px_0_0_var(--color-hold)]' : 'bg-paper text-muted hover:bg-surface active:bg-sunk'}`}>
                <span className="font-display text-lg font-bold tabular-nums">0{index + 1}</span>
                <span className="min-w-0">
                  <span className="block font-display text-lg font-bold lg:text-2xl">{s.label}</span>
                  <span className="hidden text-sm lg:block">{s.title}</span>
                </span>
              </button>
            )
          })}
        </div>
        <div className="order-3 lg:mt-8" data-testid="step-text">
          <h3 className="text-3xl font-bold sm:text-5xl">{step.title}</h3>
          <p className="mt-3 max-w-md text-lg text-muted">{step.text}</p>
          {step.milestones.length > 0 && (
            <ul className="mt-5 max-w-md space-y-3" data-testid="step-milestones">
              {step.milestones.map((m) => <Milestone key={m.title} {...m} />)}
            </ul>
          )}
        </div>
      </div>
      <div role="tabpanel" id={`${id}-panel`} aria-labelledby={`${id}-tab-${current}`} className="order-2 lg:order-none">
        <Phone label={step.phone}>
          <div key={current} className="step-swap">{step.screen}</div>
        </Phone>
      </div>
    </div>
  )
}

// A photo that fades in once it has loaded (.photo-fade), instead of popping
// in. A photo that fails to load also counts as done, so nothing waits on it.
function FadeInPhoto({ className = '', ...props }) {
  const [loaded, setLoaded] = useState(false)
  // Already in the browser's cache: done before React could listen for it.
  const checkCached = useCallback((img) => { if (img?.complete) setLoaded(true) }, [])
  return (
    <img ref={checkCached} {...props} onLoad={() => setLoaded(true)} onError={() => setLoaded(true)}
      className={`photo-fade ${loaded ? 'is-loaded' : ''} ${className}`} />
  )
}

// Credit line for a Wikimedia Commons photo (the licences ask for one).
function PhotoCredit({ author, licence, licenceUrl, source, className = '', tone = 'text-muted' }) {
  return (
    <p className={`text-xs ${tone} ${className}`}>
      Photo: {author}, <a href={licenceUrl} rel="noopener noreferrer" className="underline">{licence}</a>, via{' '}
      <a href={source} rel="noopener noreferrer" className="underline">Wikimedia Commons</a> (cropped, printed as a halftone).
    </p>
  )
}

// The intro (headline rising, routes drawing, parcel ride) plays on the first
// visit to Home only; coming back shows the finished picture straight away.
// Remembered for this browser tab. If storage is blocked, it simply plays.
const INTRO_KEY = 'raastashare:intro-seen'
function introSeen() {
  try { return sessionStorage.getItem(INTRO_KEY) === '1' } catch { return false }
}

export default function Home({ profile, setProfile }) {
  // The trust facts and routes come from here, so the break-ui toggle (dev
  // only) can swap in worst-case data at this one point.
  const dataMode = import.meta.env.DEV ? new URLSearchParams(window.location.search).get('data') : null
  const fixture = (import.meta.env.DEV && HOME_FIXTURES[dataMode]) || {}
  const trust = fixture.trust ?? TRUST
  const routes = fixture.routes ?? ROUTES

  const [skipIntro] = useState(introSeen)
  // The route chosen in the hero. The map, the fare and the "Find a carrier"
  // link all read these two, so they always show the same cities.
  // A change replaces both at once, so the last change always wins.
  const [route, setRoute] = useState({ from: HUB, to: 'Lahore', changed: false })
  const chooseRoute = (from, to) => setRoute({ from, to, changed: true })
  useEffect(() => {
    try { sessionStorage.setItem(INTRO_KEY, '1') } catch { /* storage blocked */ }
  }, [])

  // Choosing a side also signs you in as a demo person with that role
  // (unless you already have it).
  const become = (role) => () => {
    // Real accounts (shared backend) keep their role; the page then explains.
    if (setProfile && profile.role !== role) setProfile(firstWithRole(role))
  }

  return (
    <div className={`space-y-16 sm:space-y-24 ${skipIntro || route.changed ? 'intro-done' : ''}`}>
      {/* Hero: the headline on the left, the route map as the main picture,
          then the trust strip directly under it */}
      <div>
      {/* Desktop: the text column is the wider one, so the headline sets in
          three lines (not five), and the map's top lines up with it. */}
      <section className="grid items-center gap-8 pt-2 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)] lg:items-start lg:gap-8 lg:pt-2">
        <div>
          {/* Each size is also capped by the screen width (vw), so with very large
              text "someone" still fits on one line; at normal text sizes the caps
              are above the sizes used, so nothing changes. break-word is a last
              resort for anything still too wide. */}
          <h1 className="hero-enter text-balance text-[min(3.4rem,15vw)] font-bold leading-none tracking-[-0.02em] [overflow-wrap:break-word]
                         sm:text-[min(4.5rem,11.5vw)] lg:text-[min(3.5rem,4.9vw)]">
            Send it with someone already going that way
          </h1>
          <p className="hero-enter mt-4 max-w-md text-lg text-muted [--d:60ms] sm:leading-normal">
            RaastaShare matches your parcel with a traveller on the same intercity route who has space to spare.
          </p>
          <RouteFinder from={route.from} to={route.to} onChange={chooseRoute} onGo={become('sender')} />
          {/* Carriers: a quieter link, not a second main button */}
          <p className="hero-enter mt-4 max-w-md text-muted [--d:150ms]">
            Travelling anyway?{' '}
            <a href="#/carrier" data-testid="choose-carrier" onClick={become('carrier')}
              className="inline-flex items-center gap-1 font-bold text-brand-ink underline underline-offset-4">
              Post a journey <ArrowRightIcon size={18} />
            </a>
          </p>
        </div>

        <HeroMap from={route.from} to={route.to} kg={DEMO_KG} changed={route.changed} />
      </section>
      <TrustStrip items={trust} />
      </div>

      {/* How it works: numbered steps, each beside the real screen */}
      <section>
        <h2 className="text-4xl font-bold sm:text-6xl">How it works</h2>
        <p className="mt-2 max-w-2xl text-lg text-muted">
          Three steps, where we estimate phone calls and bargaining take about eight. A match takes under a minute.
        </p>
        <Walkthrough />
      </section>

      {/* Routes we cover: one list, no cards. Each route opens the Send page,
          with that route chosen.
          With no routes the section is left out (an empty list says nothing);
          the counts in the line under the heading come from the data. */}
      {routes.length > 0 && (
        <section>
          <h2 className="text-4xl font-bold sm:text-6xl">Routes we cover</h2>
          <p className="mt-2 max-w-2xl text-lg text-muted">
            From {routes[0].from} to {routes.length === 1 ? 'one other city' : `the ${inWords(routes.length)} other cities`}.
            {' '}Any two of the {inWords(CITIES.length)} work the same way.
          </p>
          <RouteList routes={routes} onChoose={become('sender')} />
        </section>
      )}

      {/* A real photo: the trips already happen, with room to spare.
          Hidden on phones (below sm): it adds length, not information. */}
      <section className="hidden overflow-hidden rounded-surface bg-brand text-white sm:grid lg:grid-cols-2" data-testid="photo-terminal">
        {[[terminalPrintLight, 'shot-light'], [terminalPrintDark, 'shot-dark']].map(([src, theme]) => (
          <FadeInPhoto key={theme} src={src} width="1280" height="960" loading="lazy"
            alt="Travellers carrying bags outside the Daewoo Express bus terminal in Bahawalpur"
            className={`${theme} aspect-[4/3] size-full object-cover lg:aspect-auto`} />
        ))}
        <div className="self-center px-5 py-9 sm:px-12 sm:py-14">
          <h2 className="text-4xl font-bold sm:text-6xl">Already on the road</h2>
          <p className="mt-4 max-w-md text-lg text-on-brand-soft">
            People travel between Pakistan's cities every day with room to spare. RaastaShare puts it to use.
          </p>
          <PhotoCredit className="mt-6 [&_a]:text-white" tone="text-on-brand-soft" author="Ammarkh" licence="CC BY-SA 3.0"
            licenceUrl="https://creativecommons.org/licenses/by-sa/3.0/"
            source="https://commons.wikimedia.org/wiki/File:BahawalpurDaewoo.JPG" />
        </div>
      </section>

      {/* Price comparison from the proposal, on a label-black band */}
      <section className="rounded-surface bg-brand px-5 py-9 text-white sm:px-12 sm:py-14">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <h2 className="text-4xl font-bold sm:text-6xl">What it costs</h2>
            <p className="mt-2 text-lg text-on-brand-soft">A {DEMO_KG} kg parcel from Islamabad to Lahore</p>
          </div>
          <span className="rounded-control bg-hold px-5 py-1.5 font-display text-2xl font-bold text-on-hold"
            data-testid="saving-badge">
            Save {savingPercent(DEMO_KG)}%<span className="ml-2 text-lg font-semibold">our estimate</span>
          </span>
        </div>
        <ul className="mt-9 space-y-9">
          <PriceRow name="Courier" note="Our estimate of a typical quote" price={COURIER_FEE} />
          <PriceRow name="RaastaShare" highlight price={calculatePrice(DEMO_KG)}
            note={`${keepTogether(formatPKR(BASE_FEE))} base + ${keepTogether(formatPKR(FEE_PER_KG))} × ${DEMO_KG}\u00a0kg`} />
        </ul>
      </section>

      {/* Closing: the same two choices again, as a two-colour split: label
          black for senders, kraft for carriers. One line and one button each. */}
      <section className="grid overflow-hidden rounded-surface sm:grid-cols-2" data-testid="closing-split">
        <div className="flex flex-col items-start justify-between gap-7 bg-brand px-5 py-10 text-white sm:px-10 sm:py-14">
          <h2 className="text-3xl font-bold sm:text-4xl">Sending something? Put it on a trip that is already going.</h2>
          <a href="#/sender" className="btn btn-secondary" onClick={become('sender')}>Post a parcel</a>
        </div>
        <div className="flex flex-col items-start justify-between gap-7 bg-sunk px-5 py-10 text-ink sm:px-10 sm:py-14">
          <h2 className="text-3xl font-bold sm:text-4xl">Travelling anyway? Earn from the space you have.</h2>
          <a href="#/carrier" className="btn btn-primary" onClick={become('carrier')}>Post a journey</a>
        </div>
      </section>
      {import.meta.env.DEV && <DataToggle current={dataMode} />}
    </div>
  )
}
