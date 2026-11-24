// A green circle with a check mark, shown next to "Delivered and paid" and
// "Journey posted". With animate, it plays one short confirmation, timed the
// way Apple times its "done" moments (see .tick-pop and .tick-draw in
// src/index.css):
//   1. the circle grows into place on a spring that settles without bouncing
//      (nothing was thrown, so nothing should overshoot);
//   2. once the circle has nearly landed, the check mark draws itself;
//   3. on the frame the check mark is complete, phones that support it give
//      two light taps of vibration, so the feeling and the picture arrive
//      together. (iPhones ignore web vibration; the visual is the same.)
// With reduced motion the tick simply fades in, and the taps come as the fade
// ends, so they still arrive together with the picture.
import { prefersReducedMotion } from '../lib/motion.js'

// Two light taps, like a phone's "success" feedback. Only for real
// completions (a delivery paid, a journey posted), never for every tap.
function successTaps() {
  try { navigator.vibrate?.([10, 60, 14]) } catch { /* not supported */ }
}

export default function SuccessTick({ animate = false }) {
  // Which animation ends last decides when the taps come: the check mark's
  // drawing normally, the circle's fade with reduced motion (no drawing then).
  const reduced = animate && prefersReducedMotion()

  return (
    <span aria-hidden="true" onAnimationEnd={reduced ? successTaps : undefined}
      className={`flex size-9 shrink-0 items-center justify-center rounded-full bg-brand text-white ${animate ? 'tick-pop' : ''}`}>
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor"
        strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
        <path d="M5 12.5l4.5 4.5L19 7.5" pathLength="1" className={animate ? 'tick-draw' : ''}
          onAnimationEnd={animate && !reduced ? successTaps : undefined} />
      </svg>
    </span>
  )
}
