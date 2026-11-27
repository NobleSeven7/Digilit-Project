// The signature RaastaShare element: two cities joined by a road.
// Used wherever a shipment or journey is shown.
//
// With "stops" it becomes a progress tracker (Delivery page):
//   - completed steps and the road behind them are green
//   - the current step is highlighted in amber (red if there is a problem)
//   - upcoming steps and the road ahead are grey
//
// Props:
//   reached     = how many stops are complete (0 to stops.length)
//   showCurrent = highlight the next stop as "in progress"
//   problem     = show the current stop in red (e.g. a dispute)
//   todo        = optional names for stops not done yet, so the current step
//                 reads as what happens next ("Pick up") and only finished
//                 steps read as done ("Picked up")

import { useEffect, useRef } from 'react'
import { CheckIcon } from './Icons.jsx'
import RouteCodes from './RouteCodes.jsx'

// A clip-path that shows a full-width road only up to stop number i.
function cutAt(i, count) {
  return `inset(0 ${100 - (i / (count - 1)) * 100}% 0 0 round 9999px)`
}

// Position of stop number i along the road, as a percentage.
function position(i, count) {
  return `${(i / (count - 1)) * 100}%`
}

function Tracker({ stops, todo, reached, showCurrent, problem }) {
  const count = stops.length
  const current = showCurrent && reached < count ? reached : -1 // -1 = no current step
  const lastDone = reached - 1

  // Did the parcel reach the last stop just now (not already done when the
  // page opened)? Only then does the last stop play its small "settle".
  const previous = useRef(reached)
  const justFinished = reached === count && previous.current < count
  useEffect(() => { previous.current = reached }, [reached])

  return (
    <>
      {/* The road with its markers (decorative; the list below is what screen readers read) */}
      <div className="relative mx-3.5 mt-3 h-7" aria-hidden="true">
        {/* Grey road: the whole route */}
        <div className="absolute inset-x-0 top-1/2 h-1.5 -translate-y-1/2 rounded-full bg-line" />
        {/* Amber road: from the start to the stop being travelled to now (the
            green road covers the part already done). Each road is a full-width
            bar cut short with clip-path, so a change of step slides smoothly. */}
        <div className={`road-fill absolute inset-x-0 top-1/2 h-1.5 -translate-y-1/2 rounded-full ${problem ? 'bg-fail/60' : 'bg-hold/70'}`}
          style={{ clipPath: cutAt(current > 0 ? current : 0, count) }} />
        {/* Green road: from the start to the last completed stop */}
        <div className="road-fill absolute inset-x-0 top-1/2 h-1.5 -translate-y-1/2 rounded-full bg-brand-ink"
          style={{ clipPath: cutAt(Math.max(lastDone, 0), count) }} />

        {stops.map((stop, i) => {
          let look = 'border-2 border-line bg-surface text-muted' // upcoming
          if (i <= lastDone) look = 'border-2 border-brand-ink bg-brand text-white' // done
          if (i === current) {
            look = problem
              ? 'border-[3px] border-fail bg-surface text-fail ring-4 ring-fail/20'
              : 'border-[3px] border-hold bg-surface text-hold-ink ring-4 ring-hold/25'
          }
          return (
            <span key={stop} style={{ left: position(i, count) }}
              className={`absolute top-1/2 flex size-7 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full text-xs font-bold transition-colors duration-200 ease-[var(--ease-out)] ${look} ${
                i === count - 1 && justFinished ? 'stop-settle' : ''}`}>
              {i <= lastDone ? <CheckIcon size={14} /> : i + 1}
            </span>
          )
        })}
      </div>

      {/* Step names under each marker */}
      {/* Under 360px wide, middle labels may wrap onto two lines ("Picked /
          up") so neighbours never touch; the row is taller to fit them. */}
      <ol className="relative mx-3.5 mt-1 h-6 max-[22.5rem]:h-9">
        {stops.map((stop, i) => {
          const done = i <= lastDone
          const isCurrent = i === current
          // First label starts at its marker, last label ends at its marker, others are centred.
          const shift = i === 0 ? 'translateX(-0.875rem)'
            : i === count - 1 ? 'translateX(calc(-100% + 0.875rem))'
            : 'translateX(-50%)'
          let colour = 'text-muted'
          if (done) colour = 'font-bold text-ink'
          if (isCurrent) colour = problem ? 'font-bold text-fail' : 'font-bold text-hold-ink'
          return (
            <li key={stop} data-step-state={done ? 'done' : isCurrent ? 'current' : 'upcoming'}
              className={`absolute whitespace-nowrap text-xs sm:text-sm ${colour} ${
                i > 0 && i < count - 1 ? 'text-center max-[22.5rem]:w-14 max-[22.5rem]:whitespace-normal max-[22.5rem]:leading-tight' : ''}`}
              style={{ left: position(i, count), transform: shift }}>
              {done || !todo ? stop : todo[i]}
              <span className="sr-only">
                {done ? ' (done)' : isCurrent ? ' (current step)' : ' (not yet)'}
              </span>
            </li>
          )
        })}
      </ol>
    </>
  )
}

export default function RouteLine({ origin, destination, stops, todo, reached = 0, showCurrent = false, problem = false }) {
  return (
    <div>
      {/* The two cities as codes, e.g. ISB → LHE, with their names underneath */}
      <RouteCodes origin={origin} destination={destination} />

      {stops ? (
        <Tracker stops={stops} todo={todo} reached={reached} showCurrent={showCurrent} problem={problem} />
      ) : (
        /* Plain route: a road with a dashed centre line and two end stops */
        <div className="relative mt-2 h-4 rounded-full bg-brand-ink" aria-hidden="true">
          <div className="absolute inset-x-4 top-1/2 -translate-y-1/2 border-t-2 border-dashed border-surface/70" />
          <span className="absolute left-0 top-0 size-4 rounded-full border-[3px] border-brand-ink bg-surface" />
          <span className="absolute right-0 top-0 size-4 rounded-full border-[3px] border-brand-ink bg-surface" />
        </div>
      )}
    </div>
  )
}
