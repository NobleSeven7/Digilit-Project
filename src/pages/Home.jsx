// Home page: choose whether you are sending a parcel or carrying one.
import { BASE_FEE, FEE_PER_KG, COURIER_FEE } from '../data/constants.js'
import { calculatePrice } from '../lib/pricing.js'
import { formatPKR } from '../lib/format.js'

export default function Home() {
  return (
    <div className="space-y-8">
      {/* Hero, styled like a green motorway sign with a white inner border */}
      <section className="rounded-2xl bg-brand p-2">
        <div className="rounded-xl border-2 border-white px-5 py-8 text-white sm:px-10 sm:py-12">
          <h1 className="max-w-2xl text-4xl font-bold sm:text-5xl">
            Send it with someone already going that way
          </h1>
          <p className="mt-4 max-w-xl text-lg text-white/90">
            RaastaShare matches your parcel with a traveller who has spare space on the
            same intercity route. Payment stays in escrow until delivery is confirmed.
          </p>

          {/* The two profile choices (simulated accounts: no login needed) */}
          <div className="mt-8 grid gap-4 sm:grid-cols-2">
            <a href="#/sender" data-testid="choose-sender"
              className="rounded-xl bg-white p-5 text-ink hover:bg-brand-tint">
              <span className="block font-display text-2xl font-bold text-brand">I am a sender</span>
              <span className="mt-1 block text-muted">Post a parcel and see ranked carriers</span>
            </a>
            <a href="#/carrier" data-testid="choose-carrier"
              className="rounded-xl bg-white p-5 text-ink hover:bg-brand-tint">
              <span className="block font-display text-2xl font-bold text-brand">I am a carrier</span>
              <span className="mt-1 block text-muted">Post a journey and earn from spare space</span>
            </a>
          </div>
        </div>
      </section>

      {/* How it works: three real steps, in order */}
      <section>
        <h2 className="text-2xl font-bold">Three steps instead of eight</h2>
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

      {/* Price example from the proposal */}
      <section className="card">
        <h2 className="text-2xl font-bold">What it costs</h2>
        <p className="mt-2 max-w-2xl">
          {formatPKR(BASE_FEE)} base fee plus {formatPKR(FEE_PER_KG)} per kg. A 5 kg parcel
          from Islamabad to Lahore costs <strong>{formatPKR(calculatePrice(5))}</strong>,
          compared with about {formatPKR(COURIER_FEE)} by courier.
        </p>
      </section>
    </div>
  )
}
