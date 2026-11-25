// Home page: choose whether you are sending a parcel or carrying one.
import { useCallback, useEffect, useState } from 'react'
import { BASE_FEE, FEE_PER_KG, COURIER_FEE, CITIES, CITY_CODES, tripHours } from '../data/constants.js'
import { calculatePrice, savingPercent } from '../lib/pricing.js'
import { formatPKR } from '../lib/format.js'
import { ArrowRightIcon } from '../components/Icons.jsx'
import ParcelPass from '../components/ParcelPass.jsx'
import { createSampleData } from '../data/sampleData.js'
import HeroMap from '../components/HeroMap.jsx'
import { firstWithRole } from '../lib/profile.js'
import { useSeenOnce } from '../lib/motion.js'
// Dev-only (break-ui): worst-case data and its switch. Left out of the
// production build, where import.meta.env.DEV is false.
import { HOME_FIXTURES } from '../dev/homeFixtures.js'
import DataToggle from '../dev/DataToggle.jsx'
// Screenshots of the real pages, in a light and a dark copy
// (taken from this app at phone width; retake them if those pages change).
import sendLight from '../assets/home/step-send-light.webp'
import sendDark from '../assets/home/step-send-dark.webp'
import matchLight from '../assets/home/step-match-light.webp'
import matchDark from '../assets/home/step-match-dark.webp'
// Photo from Wikimedia Commons (credit under the photo and in the README),
// printed as a halftone in label black on kraft (light) and the reverse (dark).
import terminalPrintLight from '../assets/home/photo-daewoo-terminal-halftone-light.png'
import terminalPrintDark from '../assets/home/photo-daewoo-terminal-halftone-dark.png'

// The demo case from the proposal.
const DEMO_KG = 5

// One half of the "who are you?" split: the role, one line on what you do
// there, and an arrow. The two halves sit side by side between thin rules
// (no boxes; they stack when there is not room for both). Pressing one darkens it at once (feedback on press, colour only,
// 100ms, so it works the same with a finger or a mouse; it stays with reduced
// motion, since nothing moves).
function ChoiceRow({ href, testId, title, text, onClick }) {
  return (
    <a href={href} data-testid={testId} onClick={onClick}
      className="flex min-h-32 min-w-0 flex-col justify-between gap-3 bg-paper px-4 py-4 text-ink no-underline transition-colors
                 duration-100 ease-[ease] hover:bg-surface active:bg-sunk">
      <span className="min-w-0">
        <span className="block font-display text-2xl font-bold text-brand-ink sm:text-3xl">{title}</span>
        <span className="mt-1 block text-sm text-muted">{text}</span>
      </span>
      <span className="text-brand-ink"><ArrowRightIcon size={22} /></span>
    </a>
  )
}

// The trust strip under the hero: three things the app really does, each
// checked in the code (matching.js runs four rules; Delivery.jsx makes a
// pickup and a delivery code and holds the fee until the second one).
// Thin rules between them, no boxes.
const TRUST = [
  { fact: 'Four checks on every traveller', detail: 'Route, timing, space and vehicle, before anyone is ranked.' },
  { fact: 'A code at each end', detail: 'The traveller enters a pickup code, then a delivery code.' },
  { fact: 'Money held until delivery', detail: 'The fee is released only when the delivery code is entered.' },
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
                       duration-100 ease-[ease] hover:bg-surface/60 active:bg-sunk">
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
// It sits on the green band, so everything is white.
// The bar fills from the left when the band scrolls into view (.bar-grow).
function PriceRow({ name, note, price, highlight, order }) {
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
        <div className={`bar-grow h-4 rounded-full ${highlight ? 'bg-hold' : 'bg-white/45'}`}
          style={{ width: `${(price / COURIER_FEE) * 100}%`, '--i': order }} />
      </div>
    </li>
  )
}

// A phone outline. Whatever is inside is its screen.
function Phone({ label, children }) {
  return (
    <div className="relative mx-auto w-full max-w-[20rem] overflow-hidden lg:max-w-[16rem] rounded-[2.75rem] border-[10px] border-ink bg-paper shadow-[var(--shadow-lift)]"
      role="img" aria-label={label}>
      <div className="absolute left-1/2 top-2 z-10 h-5 w-24 -translate-x-1/2 rounded-full bg-ink" aria-hidden="true" />
      <div className="pt-9" aria-hidden="true">{children}</div>
    </div>
  )
}

// A screenshot in both themes; CSS shows the one that matches (.shot-light / .shot-dark).
function Shot({ light, dark }) {
  return (
    <>
      <img src={light} alt="" width="390" height="720" loading="lazy" className="shot-light block h-auto w-full" />
      <img src={dark} alt="" width="390" height="720" loading="lazy" className="shot-dark block h-auto w-full" />
    </>
  )
}

// The pickup pass for the demo parcel (Ayesha Khan's 5 kg, carried by Bilal
// Ahmed). The code is an example; real codes are random.
// Worked out once, when the page code loads, not on every redraw.
const SAMPLE = createSampleData()
const PASS_PARCEL = SAMPLE.shipments.find((s) => s.id === 's-demo')
const PASS_JOURNEY = SAMPLE.journeys.find((j) => j.id === 'j-bilal')

// The three steps of a delivery, in order (from the proposal: Submit, Accept,
// Verify), each beside the screen it happens on.
const STEPS = [
  {
    label: 'Submit',
    title: 'Post the parcel',
    text: 'Say what it is, where it is going and when it must leave. Every carrier on that route is checked against four rules straight away.',
    phone: 'A phone showing the Post a parcel form',
    screen: <Shot light={sendLight} dark={sendDark} />,
  },
  {
    label: 'Accept',
    title: 'Pick a carrier',
    text: 'Carriers who pass all four rules are ranked by a score out of 100. Once both sides accept, the fee is held in escrow.',
    phone: 'A phone showing three carriers ranked by score, Bilal Ahmed first with 75 out of 100',
    screen: <Shot light={matchLight} dark={matchDark} />,
  },
  {
    label: 'Verify',
    title: 'Codes, not phone calls',
    text: 'The parcel gets a pass. The carrier enters the pickup code at the door and the delivery code at the other end. Only then is the money released.',
    phone: 'A phone showing a RaastaShare pickup pass from Islamabad to Lahore',
    screen: (
      <div className="px-2 pb-3">
        <ParcelPass kind="Pickup" code="4827" shipment={PASS_PARCEL} journey={PASS_JOURNEY} note="Example pass" rollCode />
      </div>
    ),
  },
]

// One step: the text, then its phone. They are simply there (no scroll
// reveal: it held the content back); the first time step 03 scrolls into view,
// its code rolls to its digits.
function StepRow({ step, index }) {
  const [ref, seen] = useSeenOnce()
  return (
    <li ref={ref} className={`grid items-center gap-8 lg:grid-cols-2 lg:gap-16 ${seen ? 'is-seen' : ''}`}>
      <div className={`max-w-md ${index % 2 ? 'lg:order-2' : 'lg:justify-self-end'}`}>
        {/* Step number and name in normal case (tiny ALL CAPS labels read as templated) */}
        <p className="font-display text-2xl font-bold text-brand-ink">
          <span className="tabular-nums text-muted">0{index + 1}</span> {step.label}
        </p>
        <h3 className="mt-3 text-4xl font-bold sm:text-6xl">{step.title}</h3>
        <p className="mt-4 text-lg text-muted">{step.text}</p>
      </div>
      <Phone label={step.phone}>{step.screen}</Phone>
    </li>
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
  useEffect(() => {
    try { sessionStorage.setItem(INTRO_KEY, '1') } catch { /* storage blocked */ }
  }, [])

  // The price bars fill once they are on screen.
  const [pricesRef, pricesSeen] = useSeenOnce()

  // Choosing a side also signs you in as a demo person with that role
  // (unless you already have it).
  const become = (role) => () => {
    if (profile.role !== role) setProfile(firstWithRole(role))
  }

  return (
    <div className={`space-y-16 sm:space-y-24 ${skipIntro ? 'intro-done' : ''}`}>
      {/* Hero: the headline on the left, the route map as the main picture,
          then the trust strip directly under it */}
      <div>
      <section className="grid items-center gap-8 pt-2 lg:grid-cols-[minmax(0,5fr)_minmax(0,6fr)] lg:gap-6 lg:pt-6">
        <div>
          {/* Each size is also capped by the screen width (vw), so with very large
              text "someone" still fits on one line; at normal text sizes the caps
              are above the sizes used, so nothing changes. break-word is a last
              resort for anything still too wide. */}
          <h1 className="hero-enter text-balance text-[min(3.4rem,15vw)] font-bold leading-none tracking-[-0.02em] [overflow-wrap:break-word]
                         sm:text-[min(4.5rem,11.5vw)] lg:text-[min(5.6rem,9vw)]">
            Send it with someone already going that way
          </h1>
          <p className="hero-enter mt-5 max-w-md text-lg text-muted [--d:60ms] sm:text-xl sm:leading-normal">
            RaastaShare matches your parcel with a traveller who has spare space on the
            same intercity route. Payment stays in escrow until delivery is confirmed.
          </p>
          <p className="hero-enter mt-4 max-w-md font-bold [--d:110ms]" data-testid="hero-fact">
            <span aria-hidden="true">ISB → LHE</span><span className="sr-only">Islamabad to Lahore</span>, 5 kg:{' '}
            {formatPKR(calculatePrice(DEMO_KG))} instead of about {formatPKR(COURIER_FEE)} by courier (our estimate).
          </p>

          {/* The two profile choices, split side by side (simulated accounts:
              no login needed). Same links and profile switch as before. */}
          {/* Side by side while each half has at least 10rem; with large text
              (10rem grows with it) the halves stack. The 1px gap over a line-coloured
              background draws the rule between them, across or down. */}
          <div className="hero-enter mt-7 grid max-w-md grid-cols-[repeat(auto-fit,minmax(min(100%,10rem),1fr))] gap-px border-y border-line bg-line [--d:150ms]">
            <ChoiceRow href="#/sender" testId="choose-sender" onClick={become('sender')}
              title="Sender" text="Post a parcel and pick who takes it" />
            <ChoiceRow href="#/carrier" testId="choose-carrier" onClick={become('carrier')}
              title="Traveller" text="Post a journey and earn from spare space" />
          </div>
        </div>

        <HeroMap />
      </section>
      <TrustStrip items={trust} />
      </div>

      {/* How it works: numbered steps, each beside the real screen */}
      <section>
        <h2 className="text-4xl font-bold sm:text-6xl">How it works</h2>
        <p className="mt-2 max-w-2xl text-lg text-muted">
          Three steps, where we estimate phone calls and bargaining take about eight. A match takes under a minute.
        </p>
        <ol className="mt-10 space-y-16 sm:mt-14 sm:space-y-24" data-testid="steps">
          {STEPS.map((step, index) => <StepRow key={step.label} step={step} index={index} />)}
        </ol>
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
      <section className="hidden overflow-hidden rounded-2xl bg-brand text-white sm:grid lg:grid-cols-2" data-testid="photo-terminal">
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

      {/* Price comparison from the proposal, on a band of motorway green */}
      <section ref={pricesRef}
        className={`rounded-2xl bg-brand px-5 py-9 text-white sm:px-12 sm:py-14 ${pricesSeen ? 'is-seen' : ''}`}>
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <h2 className="text-4xl font-bold sm:text-6xl">What it costs</h2>
            <p className="mt-2 text-lg text-on-brand-soft">A {DEMO_KG} kg parcel from Islamabad to Lahore</p>
          </div>
          <span className="rounded-full bg-hold px-5 py-1.5 font-display text-2xl font-bold text-on-hold"
            data-testid="saving-badge">
            Save {savingPercent(DEMO_KG)}%
          </span>
        </div>
        <ul className="mt-9 space-y-9">
          <PriceRow name="Courier" note="Our estimate of a typical quote" price={COURIER_FEE} order={0} />
          <PriceRow name="RaastaShare" highlight order={1} price={calculatePrice(DEMO_KG)}
            note={`${formatPKR(BASE_FEE)} base + ${formatPKR(FEE_PER_KG)} × ${DEMO_KG} kg`} />
        </ul>
      </section>

      {/* Closing: the same two choices again, as a two-colour split: label
          black for senders, kraft for travellers. One line and one button each. */}
      <section className="grid overflow-hidden rounded-2xl sm:grid-cols-2" data-testid="closing-split">
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
