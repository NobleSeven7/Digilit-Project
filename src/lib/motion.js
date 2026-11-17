// Helpers for the few animations in the app (see "Motion" in src/index.css).

import { flushSync } from 'react-dom'

// Does the person's device ask for less motion?
export function prefersReducedMotion() {
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches
}

// Run a change to the page as a "view transition": the browser takes a
// picture of the page, makes the change, then slides each named element
// (style viewTransitionName) from its old place to its new one. Used on the
// Admin page so a row that leaves fades out while the rows below slide up.
// Browsers without view transitions, and reduced motion, just change at once.
export function withViewTransition(change) {
  if (!document.startViewTransition || prefersReducedMotion()) {
    change()
    return
  }
  document.startViewTransition(() => flushSync(change))
}
