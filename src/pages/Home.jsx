// Home page: choose whether you are sending a parcel or carrying one.
import { useCallback, useEffect, useState } from 'react'
import { BASE_FEE, FEE_PER_KG, COURIER_FEE } from '../data/constants.js'
import { calculatePrice, savingPercent } from '../lib/pricing.js'
import { formatPKR } from '../lib/format.js'
import { ArrowRightIcon } from '../components/Icons.jsx'
import ParcelPass from '../components/ParcelPass.jsx'
import { createSampleData } from '../data/sampleData.js'
import HeroMap from '../components/HeroMap.jsx'
import { firstWithRole } from '../lib/profile.js'
import { useSeenOnce } from '../lib/motion.js'
// Screenshots of the real pages, in a light and a dark copy
// (taken from this app at phone width; retake them if those pages change).
import sendLight from '../assets/home/step-send-light.webp'
import sendDark from '../assets/home/step-send-dark.webp'
import matchLight from '../assets/home/step-match-light.webp'
import matchDark from '../assets/home/step-match-dark.webp'
// Photos from Wikimedia Commons (credits under each photo and in the README).
import terminalPhoto from '../assets/home/photo-daewoo-terminal.webp'
import motorwayPhoto from '../assets/home/photo-m2-motorway.webp'

// The demo case from the proposal.
const DEMO_KG = 5

// One of the two "who are you?" choices: a plain row between two thin lines
// (no box), whose arrow moves when you point at it.
function ChoiceRow({ href, testId, title, text, onClick }) {
  return (
    <a href={href} data-testid={testId} onClick={onClick}
      className="group flex min-h-16 items-center gap-4 border-b border-line py-4 text-ink no-underline active:opacity-80">
      <span className="min-w-0 flex-1">
        <span className="block whitespace-nowrap font-display text-2xl font-bold text-brand-ink">{title}</span>
        <span className="mt-0.5 block text-sm text-muted">{text}</span>
      </span>
      <span className="text-brand-ink transition-[translate] duration-200 ease-[var(--ease-out)]
                       group-hover:translate-x-1 motion-reduce:transition-none">
        <ArrowRightIcon size={22} />
      </span>
    </a>
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

// One step: the text, then its phone. Both rise into place the first time the
// step scrolls into view (.reveal-up), and the step 03 code starts rolling.
function StepRow({ step, index }) {
  const [ref, seen] = useSeenOnce()
  return (
    <li ref={ref} className={`reveal-up grid items-center gap-8 lg:grid-cols-2 lg:gap-16 ${seen ? 'is-seen' : ''}`}>
      <div className={`max-w-md ${index % 2 ? 'lg:order-2' : 'lg:justify-self-end'}`}>
        {/* Step number and name in normal case (tiny ALL CAPS labels read as templated) */}
        <p className="font-display text-2xl font-bold text-brand-ink">
          <span className="tabular-nums text-muted">0{index + 1}</span> {step.label}
        </p>
        <h3 className="mt-3 text-4xl font-bold leading-[0.95] sm:text-6xl">{step.title}</h3>
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
      <a href={source} rel="noopener noreferrer" className="underline">Wikimedia Commons</a> (cropped).
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
      {/* Hero: the headline on the left, the route map as the main picture */}
      <section className="grid items-center gap-8 pt-2 lg:grid-cols-[minmax(0,5fr)_minmax(0,6fr)] lg:gap-6 lg:pt-6">
        <div>
          <h1 className="hero-enter text-balance text-[3.4rem] font-bold leading-[0.92] sm:text-7xl lg:text-[5.6rem]">
            Send it with someone already going that way
          </h1>
          <p className="hero-enter mt-5 max-w-md text-lg text-muted [--d:60ms] sm:text-xl">
            RaastaShare matches your parcel with a traveller who has spare space on the
            same intercity route. Payment stays in escrow until delivery is confirmed.
          </p>
          <p className="hero-enter mt-4 max-w-md font-bold [--d:110ms]" data-testid="hero-fact">
            <span aria-hidden="true">ISB → LHE</span><span className="sr-only">Islamabad to Lahore</span>, 5 kg:{' '}
            {formatPKR(calculatePrice(DEMO_KG))} instead of about {formatPKR(COURIER_FEE)} by courier (our estimate).
          </p>

          {/* The two profile choices (simulated accounts: no login needed) */}
          <div className="hero-enter mt-7 max-w-md border-t border-line [--d:150ms]">
            <ChoiceRow href="#/sender" testId="choose-sender" onClick={become('sender')}
              title="I am a sender" text="Post a parcel and see ranked carriers" />
            <ChoiceRow href="#/carrier" testId="choose-carrier" onClick={become('carrier')}
              title="I am a carrier" text="Post a journey and earn from spare space" />
          </div>
        </div>

        <HeroMap />
      </section>

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

      {/* A real photo: the trips already happen, with room to spare */}
      <section className="grid overflow-hidden rounded-2xl bg-brand text-white lg:grid-cols-2" data-testid="photo-terminal">
        <FadeInPhoto src={terminalPhoto} width="1280" height="960" loading="lazy"
          alt="Travellers carrying bags outside the Daewoo Express bus terminal in Bahawalpur"
          className="aspect-[4/3] size-full object-cover lg:aspect-auto" />
        <div className="self-center px-5 py-9 sm:px-12 sm:py-14">
          <h2 className="text-4xl font-bold sm:text-6xl">Already on the road</h2>
          <p className="mt-4 max-w-md text-lg text-on-brand-soft">
            Every day people travel between Pakistan's cities by bus, car and van, often with
            room to spare in a bag or a boot. RaastaShare puts that space to use.
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

      {/* Closing: the same two choices as buttons, over a photo of the M-2 */}
      <section className="pb-4">
        <div className="relative overflow-hidden rounded-2xl bg-black text-white">
          <FadeInPhoto src={motorwayPhoto} width="1280" height="960" loading="lazy" alt=""
            className="absolute inset-0 size-full object-cover" />
          {/* Darkens the photo so the white text stays readable */}
          <div className="absolute inset-0 bg-black/65" aria-hidden="true" />
          <div className="relative px-5 py-20 sm:px-12 sm:py-28">
            <h2 className="max-w-3xl text-balance text-5xl font-bold leading-[0.95] sm:text-7xl">
              The trip is happening anyway
            </h2>
            <p className="mt-4 max-w-xl text-lg text-white/85">
              Put a parcel on it, or offer the space in your car.
            </p>
            <div className="mt-7 flex flex-col gap-3 sm:flex-row">
              <a href="#/sender" className="btn btn-primary" onClick={become('sender')}>Post a parcel</a>
              <a href="#/carrier" className="btn btn-secondary" onClick={become('carrier')}>Post a journey</a>
            </div>
          </div>
        </div>
        <PhotoCredit className="mt-2" author="King Eliot" licence="CC BY-SA 4.0"
          licenceUrl="https://creativecommons.org/licenses/by-sa/4.0/"
          source="https://commons.wikimedia.org/wiki/File:M-2_Motorway_approaching_Islamabad.jpg" />
      </section>
    </div>
  )
}
