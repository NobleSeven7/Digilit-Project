// Home page: choose whether you are sending a parcel or carrying one.
import { BASE_FEE, FEE_PER_KG, COURIER_FEE } from '../data/constants.js'
import { calculatePrice, savingPercent } from '../lib/pricing.js'
import { formatPKR } from '../lib/format.js'
import { ParcelIcon, CarIcon } from '../components/Icons.jsx'

// The demo case from the proposal.
const DEMO_KG = 5

// One of the two big "who are you?" choices. It is a link, styled as a card
// that lifts slightly when you point at it, so it clearly reads as clickable.
function ChoiceCard({ href, testId, icon, title, text }) {
  return (
    <a href={href} data-testid={testId}
      className="group flex items-center gap-4 rounded-xl bg-white p-4 text-ink shadow-[0_2px_0_rgba(8,79,50,0.35)]
                 transition duration-150 hover:-translate-y-1 hover:shadow-[0_14px_24px_-12px_rgba(8,79,50,0.75)]
                 focus-visible:-translate-y-1 motion-reduce:transition-none motion-reduce:hover:translate-y-0 sm:p-5">
      <span className="flex size-12 shrink-0 items-center justify-center rounded-full bg-brand-tint text-brand">
        {icon}
      </span>
      <span className="min-w-0 flex-1">
        <span className="block font-display text-xl font-bold text-brand sm:text-2xl">{title}</span>
        <span className="mt-0.5 block text-sm text-muted">{text}</span>
      </span>
      <span aria-hidden="true"
        className="text-2xl font-bold text-brand transition-transform group-hover:translate-x-1 motion-reduce:transition-none">
        →
      </span>
    </a>
  )
}

// A fact tile on the right of the hero.
function StatTile({ value, text }) {
  return (
    <li className="rounded-xl bg-brand-dark px-5 py-4">
      <p className="font-display text-3xl font-bold leading-none">{value}</p>
      <p className="mt-1.5 text-white/85">{text}</p>
    </li>
  )
}

// One side of the price comparison, with a bar showing the price to scale.
function PriceColumn({ name, price, note, highlight }) {
  const width = `${(price / COURIER_FEE) * 100}%`
  return (
    <div className={`rounded-lg p-4 ${highlight ? 'border-2 border-brand bg-brand-tint' : 'border border-line'}`}>
      <p className={`font-bold ${highlight ? 'text-brand' : 'text-muted'}`}>{name}</p>
      <p className={`mt-1 font-display text-3xl font-bold ${highlight ? 'text-brand' : 'text-ink'}`}>
        {formatPKR(price)}
      </p>
      <div className="mt-3 h-2.5 rounded-full bg-white" aria-hidden="true">
        <div className={`h-2.5 rounded-full ${highlight ? 'bg-brand' : 'bg-muted/50'}`} style={{ width }} />
      </div>
      <p className="mt-2 text-sm text-muted">{note}</p>
    </div>
  )
}

export default function Home() {
  return (
    <div className="space-y-8">
      {/* Hero, in the green of a motorway sign */}
      <section className="rounded-2xl bg-brand px-5 py-8 text-white sm:px-10 sm:py-12">
        <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_18rem] lg:items-center lg:gap-10">
          <div>
            <h1 className="max-w-2xl text-4xl font-bold sm:text-5xl">
              Send it with someone already going that way
            </h1>
            <p className="mt-4 max-w-xl text-lg text-white/90">
              RaastaShare matches your parcel with a traveller who has spare space on the
              same intercity route. Payment stays in escrow until delivery is confirmed.
            </p>

            {/* The two profile choices (simulated accounts: no login needed) */}
            <div className="mt-8 grid gap-4 sm:grid-cols-2">
              <ChoiceCard href="#/sender" testId="choose-sender" icon={<ParcelIcon size={26} />}
                title="I am a sender" text="Post a parcel and see ranked carriers" />
              <ChoiceCard href="#/carrier" testId="choose-carrier" icon={<CarIcon size={26} />}
                title="I am a carrier" text="Post a journey and earn from spare space" />
            </div>
          </div>

          {/* Three facts from the proposal's impact targets */}
          <ul aria-label="RaastaShare at a glance" className="grid gap-3 sm:grid-cols-3 lg:grid-cols-1">
            <StatTile value={formatPKR(calculatePrice(DEMO_KG))} text={`vs ${formatPKR(COURIER_FEE)} by courier`} />
            <StatTile value="Under 1 minute" text="to find a match" />
            <StatTile value="3 steps" text="instead of 8 calls and messages" />
          </ul>
        </div>
      </section>

      {/* How it works: three real steps, in order */}
      <section>
        <h2 className="text-2xl font-bold">How it works</h2>
        <ol className="mt-4 grid gap-4 sm:grid-cols-3">
          {[
            ['Submit', 'Post the parcel or the journey. Matching runs straight away.'],
            ['Accept', 'Sender and carrier both accept. The fee moves into escrow.'],
            ['Verify', 'One-time codes confirm pickup and delivery, then the carrier is paid.'],
          ].map(([title, text], index) => (
            <li key={title} className="card">
              <span className="flex size-8 items-center justify-center rounded-full bg-brand font-bold text-white">
                {index + 1}
              </span>
              <h3 className="mt-3 text-xl font-bold">{title}</h3>
              <p className="mt-1 text-muted">{text}</p>
            </li>
          ))}
        </ol>
      </section>

      {/* Price comparison from the proposal */}
      <section className="card">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-2xl font-bold">What it costs</h2>
            <p className="text-muted">A {DEMO_KG} kg parcel from Islamabad to Lahore</p>
          </div>
          <span className="rounded-full bg-brand px-4 py-1.5 font-bold text-white" data-testid="saving-badge">
            Save {savingPercent(DEMO_KG)}%
          </span>
        </div>
        <div className="mt-4 grid gap-4 sm:grid-cols-2">
          <PriceColumn name="Courier" price={COURIER_FEE} note="Typical courier quote" />
          <PriceColumn name="RaastaShare" price={calculatePrice(DEMO_KG)} highlight
            note={`${formatPKR(BASE_FEE)} base + ${formatPKR(FEE_PER_KG)} × ${DEMO_KG} kg`} />
        </div>
      </section>
    </div>
  )
}
