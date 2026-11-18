// Home page: choose whether you are sending a parcel or carrying one.
import { BASE_FEE, FEE_PER_KG, COURIER_FEE } from '../data/constants.js'
import { calculatePrice, savingPercent } from '../lib/pricing.js'
import { formatPKR } from '../lib/format.js'
import { ParcelIcon, CarIcon, ArrowRightIcon, CheckIcon, VehicleIcon } from '../components/Icons.jsx'
import { createSampleData } from '../data/sampleData.js'
import { findMatches } from '../lib/matching.js'
import { formatDateTime } from '../lib/format.js'
import HeroMap from '../components/HeroMap.jsx'
import { firstWithRole } from '../lib/profile.js'
import { useSeenOnce } from '../lib/motion.js'

// The demo case from the proposal.
const DEMO_KG = 5

// One of the two big "who are you?" choices. It is a link that lifts a
// little when you point at it and presses in when you tap it.
function ChoiceCard({ href, testId, icon, title, text, onClick }) {
  return (
    <a href={href} data-testid={testId} onClick={onClick}
      className="card-link group flex items-center gap-4 rounded-xl border border-line bg-surface p-4 text-ink sm:p-5">
      <span className="flex size-12 shrink-0 items-center justify-center rounded-full bg-brand-tint text-brand-ink">
        {icon}
      </span>
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

// The real product on the Home page: the matching engine's best carrier for
// the demo parcel (Islamabad to Lahore, 5 kg), worked out from the fresh
// sample data, so it always shows what the Matches page would show.
function BestMatchCard() {
  const sample = createSampleData()
  const parcel = sample.shipments.find((s) => s.id === 's-demo')
  const best = findMatches(parcel, sample.journeys).eligible[0]
  if (!best) return null
  const { journey, rules, score } = best
  const total = Math.round(score.total)
  return (
    <div className="hero-enter card relative z-10 mx-auto w-full max-w-sm shadow-[var(--shadow-lift)] [--i:3] lg:-mt-14 lg:mr-0"
      data-testid="hero-best-match" aria-label="Example: the best match for a 5 kg parcel from Islamabad to Lahore">
      <div className="flex items-start justify-between gap-3">
        <div className="flex min-w-0 items-start gap-3">
          <span className="flex size-10 shrink-0 items-center justify-center rounded-full bg-brand-tint text-brand-ink">
            <VehicleIcon type={journey.vehicleType} />
          </span>
          <div className="min-w-0">
            <p className="text-sm font-bold text-brand-ink">Best match for {parcel.weightKg} kg to {parcel.destination}</p>
            <p className="font-display text-xl font-bold">{journey.carrierName}</p>
            <p className="text-sm text-muted">{journey.vehicleType}, departs {formatDateTime(journey.departure)}</p>
          </div>
        </div>
        <p className="shrink-0 font-display text-3xl font-bold leading-none text-brand-ink">
          {total}<span className="text-base text-muted"> / 100</span>
        </p>
      </div>
      <ul className="mt-3 flex flex-wrap gap-1.5" aria-label="All four rules passed">
        {rules.map((rule) => (
          <li key={rule.key}
            className="inline-flex items-center gap-1 rounded-full bg-brand-tint px-2.5 py-0.5 text-sm font-bold text-brand-ink">
            <CheckIcon size={12} />{rule.label}
          </li>
        ))}
      </ul>
    </div>
  )
}

// The three steps of a delivery, in order (from the proposal: Submit, Accept, Verify).
const STEPS = [
  ['Submit', 'Post the parcel or the journey. Matching runs straight away.'],
  ['Accept', 'Sender and carrier both accept. The fee moves into escrow.'],
  ['Verify', 'One-time codes confirm pickup and delivery, then the carrier is paid.'],
]

// A numbered stop that sits on the "How it works" road. It starts grey and
// lights up green when the road reaches it (.step-stop in src/index.css).
function StepStop({ number, className }) {
  return (
    <span style={{ '--i': number - 1 }}
      className={`step-stop absolute z-10 flex size-8 items-center justify-center rounded-full border-4 bg-surface text-sm font-bold ${className}`}>
      {number}
    </span>
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

export default function Home({ profile, setProfile }) {
  // Two animations wait until they are on screen: the "How it works" road
  // lights up stop by stop, and the price bars fill.
  const [stepsRef, stepsSeen] = useSeenOnce()
  const [pricesRef, pricesSeen] = useSeenOnce()

  // Choosing a side also signs you in as a demo person with that role
  // (unless you already have it).
  const become = (role) => () => {
    if (profile.role !== role) setProfile(firstWithRole(role))
  }

  return (
    <div className="space-y-16 sm:space-y-24">
      {/* Hero: the headline on the left, the route map as the main picture */}
      <section className="grid items-center gap-8 pt-2 lg:grid-cols-[minmax(0,5fr)_minmax(0,6fr)] lg:gap-6 lg:pt-6">
        <div>
          <h1 className="hero-enter text-balance text-[3.4rem] font-bold leading-[0.92] [--i:0] sm:text-7xl lg:text-[5.6rem]">
            Send it with someone already going that way
          </h1>
          <p className="hero-enter mt-5 max-w-md text-lg text-muted [--i:1] sm:text-xl">
            RaastaShare matches your parcel with a traveller who has spare space on the
            same intercity route. Payment stays in escrow until delivery is confirmed.
          </p>
          <p className="hero-enter mt-4 max-w-md font-bold [--i:1]" data-testid="hero-fact">
            Islamabad to Lahore, 5 kg: {formatPKR(calculatePrice(DEMO_KG))} instead of about {formatPKR(COURIER_FEE)} by courier.
          </p>

          {/* The two profile choices (simulated accounts: no login needed) */}
          <div className="hero-enter mt-7 grid max-w-md gap-3 [--i:2]">
            <ChoiceCard href="#/sender" testId="choose-sender" icon={<ParcelIcon size={26} />} onClick={become('sender')}
              title="I am a sender" text="Post a parcel and see ranked carriers" />
            <ChoiceCard href="#/carrier" testId="choose-carrier" icon={<CarIcon size={26} />} onClick={become('carrier')}
              title="I am a carrier" text="Post a journey and earn from spare space" />
          </div>
        </div>

        {/* The route map, with a real ranked result from the matching engine */}
        <div>
          <HeroMap />
          <BestMatchCard />
        </div>
      </section>

      {/* How it works: the three steps as stops along one road */}
      <section ref={stepsRef} className={stepsSeen ? 'is-seen' : ''}>
        <h2 className="text-4xl font-bold sm:text-6xl">How it works</h2>
        <p className="mt-2 max-w-2xl text-lg text-muted">
          Three steps, where phone calls and bargaining took about eight. A match takes under a minute.
        </p>

        {/* Wide screens: the road runs left to right */}
        <ol className="mt-8 hidden sm:grid sm:grid-cols-3" data-testid="steps-road">
          {STEPS.map(([title, text], index) => (
            <li key={title}>
              <h3 className="text-3xl font-semibold">{title}</h3>
              <div className={`relative my-4 h-4 bg-line ${index === 0 ? 'rounded-l-full' : ''} ${
                index === STEPS.length - 1 ? 'rounded-r-full' : ''}`}>
                {/* The green road: grows left to right, one stretch after another */}
                <span aria-hidden="true" style={{ '--i': index }}
                  className="road-grow road-grow-x absolute inset-0 rounded-[inherit] bg-brand">
                  <span className="absolute inset-x-2 top-1/2 -translate-y-1/2 border-t-2 border-dashed border-white/70" />
                </span>
                <StepStop number={index + 1} className="left-0 top-1/2 -translate-y-1/2" />
              </div>
              <p className="pr-8 text-muted">{text}</p>
            </li>
          ))}
        </ol>

        {/* Phones: the same road runs top to bottom */}
        <ol className="mt-6 sm:hidden">
          {STEPS.map(([title, text], index) => (
            <li key={title} className="relative pb-6 pl-12 last:pb-1">
              <span aria-hidden="true" className={`absolute inset-y-0 left-2.5 w-3 bg-line ${
                index === 0 ? 'rounded-t-full' : ''} ${index === STEPS.length - 1 ? 'rounded-b-full' : ''}`}>
                {/* The green road: grows top to bottom on phones */}
                <span style={{ '--i': index }}
                  className="road-grow road-grow-y absolute inset-0 rounded-[inherit] bg-brand">
                  <span className="absolute inset-y-2 left-1/2 -translate-x-1/2 border-l-2 border-dashed border-white/70" />
                </span>
              </span>
              <StepStop number={index + 1} className="left-0 top-0" />
              <h3 className="text-2xl font-semibold">{title}</h3>
              <p className="mt-1 text-muted">{text}</p>
            </li>
          ))}
        </ol>
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
          <PriceRow name="Courier" note="Typical courier quote" price={COURIER_FEE} order={0} />
          <PriceRow name="RaastaShare" highlight order={1} price={calculatePrice(DEMO_KG)}
            note={`${formatPKR(BASE_FEE)} base + ${formatPKR(FEE_PER_KG)} × ${DEMO_KG} kg`} />
        </ul>
      </section>

      {/* Closing: the same two choices as buttons */}
      <section className="pb-4 text-center">
        <h2 className="mx-auto max-w-3xl text-balance text-5xl font-bold leading-[0.95] sm:text-7xl">
          The trip is happening anyway
        </h2>
        <p className="mx-auto mt-4 max-w-xl text-lg text-muted">
          Put a parcel on it, or offer the space in your car.
        </p>
        <div className="mt-7 flex flex-col justify-center gap-3 sm:flex-row">
          <a href="#/sender" className="btn btn-primary" onClick={become('sender')}>Post a parcel</a>
          <a href="#/carrier" className="btn btn-secondary" onClick={become('carrier')}>Post a journey</a>
        </div>
      </section>
    </div>
  )
}
