// Home page: choose whether you are sending a parcel or carrying one.
import { BASE_FEE, FEE_PER_KG, COURIER_FEE, tripHours } from '../data/constants.js'
import { calculatePrice, savingPercent } from '../lib/pricing.js'
import { formatPKR } from '../lib/format.js'
import { ParcelIcon, CarIcon, ArrowRightIcon } from '../components/Icons.jsx'
import RouteWeb from '../components/RouteWeb.jsx'

// The demo case from the proposal.
const DEMO_KG = 5

// One of the two big "who are you?" choices. It is a link that lifts a
// little when you point at it and presses in when you tap it.
function ChoiceCard({ href, testId, icon, title, text }) {
  return (
    <a href={href} data-testid={testId}
      className="group flex items-center gap-4 rounded-xl bg-surface p-4 text-ink
                 shadow-[0_1px_2px_rgba(0,0,0,0.14)]
                 transition-[translate,scale,box-shadow] duration-200 ease-[cubic-bezier(0.23,1,0.32,1)]
                 hover:-translate-y-0.5 hover:shadow-[0_12px_24px_-12px_rgba(0,0,0,0.5)]
                 active:scale-[0.98] motion-reduce:transition-none sm:p-5">
      <span className="flex size-12 shrink-0 items-center justify-center rounded-full bg-brand-tint text-brand-ink">
        {icon}
      </span>
      <span className="min-w-0 flex-1">
        <span className="block whitespace-nowrap font-display text-xl font-bold text-brand-ink">{title}</span>
        <span className="mt-0.5 block text-sm text-muted">{text}</span>
      </span>
      <span className="text-brand-ink transition-[translate] duration-200 ease-[cubic-bezier(0.23,1,0.32,1)]
                       group-hover:translate-x-1 motion-reduce:transition-none">
        <ArrowRightIcon size={22} />
      </span>
    </a>
  )
}

// The hero's centrepiece: the Islamabad to Lahore road running the full
// width of the hero, with a parcel tag (weight and price) riding along it.
function HeroRoute() {
  return (
    <div className="hero-enter [--i:2]" data-testid="hero-route">
      <div className="flex items-baseline justify-between gap-3 font-display text-xl font-bold sm:text-2xl">
        <span>Islamabad</span>
        <span>Lahore</span>
      </div>

      <div className="relative mt-2 h-14">
        {/* The road and its two end stops */}
        <div aria-hidden="true" className="absolute inset-x-0 top-1/2 h-4 -translate-y-1/2 rounded-full bg-brand-dark">
          <div className="absolute inset-x-5 top-1/2 -translate-y-1/2 border-t-2 border-dashed border-white/60" />
        </div>
        <span aria-hidden="true" className="absolute left-0 top-1/2 size-6 -translate-y-1/2 rounded-full border-[5px] border-white bg-brand-dark" />
        <span aria-hidden="true" className="absolute right-0 top-1/2 size-6 -translate-y-1/2 rounded-full border-[5px] border-white bg-brand-dark" />

        {/* The parcel tag. The wrapper slides along the road; the tag sits on it. */}
        <div className="parcel-ride pointer-events-none absolute inset-x-8 top-1/2 -translate-y-1/2">
          <span className="inline-flex -translate-x-1/2 items-center gap-2 whitespace-nowrap rounded-full bg-surface py-1.5 pl-2.5 pr-3.5
                           text-brand-ink shadow-[0_6px_16px_-6px_rgba(0,0,0,0.55)]">
            <ParcelIcon size={20} />
            <span className="text-sm text-muted">{DEMO_KG} kg</span>
            <strong className="font-display text-lg">{formatPKR(calculatePrice(DEMO_KG))}</strong>
          </span>
        </div>
      </div>

      <p className="mt-1 max-w-2xl text-white/85">
        A {DEMO_KG} kg parcel rides with a driver already making the trip, about{' '}
        {tripHours('Islamabad', 'Lahore')} hours by road. A courier charges about {formatPKR(COURIER_FEE)}.
      </p>
    </div>
  )
}

// The three steps of a delivery, in order (from the proposal: Submit, Accept, Verify).
const STEPS = [
  ['Submit', 'Post the parcel or the journey. Matching runs straight away.'],
  ['Accept', 'Sender and carrier both accept. The fee moves into escrow.'],
  ['Verify', 'One-time codes confirm pickup and delivery, then the carrier is paid.'],
]

// A numbered stop that sits on the "How it works" road.
function StepStop({ number, className }) {
  return (
    <span className={`absolute flex size-8 items-center justify-center rounded-full border-4 border-brand-ink bg-surface text-sm font-bold text-brand-ink ${className}`}>
      {number}
    </span>
  )
}

// One line of the price comparison: a name, a price, and a bar drawn to scale.
function PriceRow({ name, note, price, highlight }) {
  return (
    <div>
      <div className="flex items-baseline justify-between gap-4">
        <dt>
          <span className={`font-bold ${highlight ? 'text-brand-ink' : ''}`}>{name}</span>
          <span className="block text-sm text-muted sm:ml-3 sm:inline">{note}</span>
        </dt>
        <dd className={`font-display text-2xl font-bold tabular-nums sm:text-3xl ${highlight ? 'text-brand-ink' : ''}`}>
          {formatPKR(price)}
        </dd>
      </div>
      <div className="mt-2 h-3 rounded-full bg-line" aria-hidden="true">
        <div className={`h-3 rounded-full ${highlight ? 'bg-brand' : 'bg-muted/60'}`}
          style={{ width: `${(price / COURIER_FEE) * 100}%` }} />
      </div>
    </div>
  )
}

export default function Home() {
  return (
    <div className="space-y-12 sm:space-y-16">
      {/* Hero, in the green of a motorway sign */}
      <section className="relative overflow-hidden rounded-2xl bg-brand px-5 py-9 text-white sm:px-10 sm:py-14">
        {/* Faint web of routes behind everything in the hero */}
        <RouteWeb />

        <div className="relative space-y-8 sm:space-y-10">
          <div>
            <h1 className="hero-enter max-w-3xl text-balance text-4xl font-bold [--i:0] sm:text-5xl lg:text-6xl">
              Send it with someone already going that way
            </h1>
            <p className="hero-enter mt-4 max-w-xl text-lg text-white/90 [--i:1]">
              RaastaShare matches your parcel with a traveller who has spare space on the
              same intercity route. Payment stays in escrow until delivery is confirmed.
            </p>
          </div>

          <HeroRoute />

          {/* The two profile choices (simulated accounts: no login needed) */}
          <div className="hero-enter grid max-w-3xl gap-4 [--i:3] sm:grid-cols-2">
            <ChoiceCard href="#/sender" testId="choose-sender" icon={<ParcelIcon size={26} />}
              title="I am a sender" text="Post a parcel and see ranked carriers" />
            <ChoiceCard href="#/carrier" testId="choose-carrier" icon={<CarIcon size={26} />}
              title="I am a carrier" text="Post a journey and earn from spare space" />
          </div>
        </div>
      </section>

      {/* How it works: the three steps as stops along one road */}
      <section>
        <h2 className="text-2xl font-bold sm:text-3xl">How it works</h2>
        <p className="mt-1 max-w-2xl text-muted">
          Three steps, where phone calls and bargaining took about eight. A match takes under a minute.
        </p>

        {/* Wide screens: the road runs left to right */}
        <ol className="mt-6 hidden sm:grid sm:grid-cols-3" data-testid="steps-road">
          {STEPS.map(([title, text], index) => (
            <li key={title}>
              <h3 className="text-xl font-bold">{title}</h3>
              <div className={`relative my-4 h-3 bg-brand ${index === 0 ? 'rounded-l-full' : ''} ${
                index === STEPS.length - 1 ? 'rounded-r-full' : ''}`}>
                <span aria-hidden="true"
                  className="absolute inset-x-2 top-1/2 -translate-y-1/2 border-t-2 border-dashed border-white/70" />
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
              <span aria-hidden="true" className={`absolute inset-y-0 left-2.5 w-3 bg-brand ${
                index === 0 ? 'rounded-t-full' : ''} ${index === STEPS.length - 1 ? 'rounded-b-full' : ''}`}>
                <span className="absolute inset-y-2 left-1/2 -translate-x-1/2 border-l-2 border-dashed border-white/70" />
              </span>
              <StepStop number={index + 1} className="left-0 top-0" />
              <h3 className="text-xl font-bold">{title}</h3>
              <p className="mt-1 text-muted">{text}</p>
            </li>
          ))}
        </ol>
      </section>

      {/* Price comparison from the proposal: two bars drawn to the same scale */}
      <section>
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <h2 className="text-2xl font-bold sm:text-3xl">What it costs</h2>
            <p className="mt-1 text-muted">A {DEMO_KG} kg parcel from Islamabad to Lahore</p>
          </div>
          <span className="rounded-full bg-brand px-4 py-1.5 font-bold text-white" data-testid="saving-badge">
            Save {savingPercent(DEMO_KG)}%
          </span>
        </div>
        <dl className="mt-6 space-y-6">
          <PriceRow name="Courier" note="Typical courier quote" price={COURIER_FEE} />
          <PriceRow name="RaastaShare" highlight price={calculatePrice(DEMO_KG)}
            note={`${formatPKR(BASE_FEE)} base + ${formatPKR(FEE_PER_KG)} × ${DEMO_KG} kg`} />
        </dl>
      </section>
    </div>
  )
}
