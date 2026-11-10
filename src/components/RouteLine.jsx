// The signature RaastaShare element: two cities joined by a road with a
// dashed centre line. Used wherever a shipment or journey is shown.
// Optional "stops" turn it into a progress tracker (see the Delivery page).

export default function RouteLine({ origin, destination, stops, reached = 0 }) {
  return (
    <div>
      {/* City names */}
      <div className="flex items-baseline justify-between gap-3 font-display text-lg font-bold sm:text-xl">
        <span>{origin}</span>
        <span className="text-right">{destination}</span>
      </div>

      {/* The road */}
      <div className="relative mt-2 h-4 rounded-full bg-brand" aria-hidden="true">
        <div className="absolute inset-x-4 top-1/2 -translate-y-1/2 border-t-2 border-dashed border-white/70" />
        {/* End markers when there are no progress stops */}
        {!stops && (
          <>
            <span className="absolute left-0 top-0 size-4 rounded-full border-[3px] border-brand bg-white" />
            <span className="absolute right-0 top-0 size-4 rounded-full border-[3px] border-brand bg-white" />
          </>
        )}
      </div>

      {/* Progress stops: a filled marker means that step is done */}
      {stops && (
        <ol className="-mt-5 flex justify-between">
          {stops.map((stop, index) => {
            const done = index < reached
            const alignment =
              index === 0 ? 'items-start text-left'
              : index === stops.length - 1 ? 'items-end text-right'
              : 'items-center text-center'
            return (
              <li key={stop} className={`flex w-20 flex-col ${alignment}`}>
                <span className={`relative flex size-6 items-center justify-center rounded-full border-[3px] border-brand text-xs font-bold ${
                  done ? 'bg-brand text-white' : 'bg-white text-brand'
                }`}>
                  {done ? '✓' : index + 1}
                </span>
                <span className={`mt-1 text-sm ${done ? 'font-bold text-ink' : 'text-muted'}`}>
                  {stop}
                  <span className="sr-only">{done ? ' (done)' : ' (not yet)'}</span>
                </span>
              </li>
            )
          })}
        </ol>
      )}
    </div>
  )
}
