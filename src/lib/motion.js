// Helpers for the few animations in the app (see "Motion" in src/index.css).

import { useEffect, useRef, useState } from 'react'
import { flushSync } from 'react-dom'

// Does the person's device ask for less motion?
export function prefersReducedMotion() {
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches
}

// Run a change to the page as a "view transition": the browser takes a
// picture of the page, makes the change, then slides each named element
// (style viewTransitionName) from its old place to its new one. Used on the
// Admin page so a row that leaves fades out while the rows below slide up.
// "kind" is put on <html> while it runs, so the CSS can style each kind
// differently ("page" = a soft fade between two pages).
// Browsers without view transitions, and reduced motion, just change at once.
let latestTransition = 0
export function withViewTransition(change, kind) {
  if (!document.startViewTransition || prefersReducedMotion()) {
    change()
    return
  }
  const root = document.documentElement
  const id = ++latestTransition
  if (kind) root.dataset.transition = kind
  const transition = document.startViewTransition(() => flushSync(change))
  // Only the newest transition clears the marker; an older one finishing
  // late must not cut the newer one's fade short.
  transition.finished.finally(() => { if (id === latestTransition) delete root.dataset.transition })
}

// React hook: becomes true the first time the element scrolls into view
// (and stays true). Used to start an animation only when people can see it.
// Browsers without IntersectionObserver show the finished state at once.
export function useSeenOnce() {
  const ref = useRef(null)
  const [seen, setSeen] = useState(() => typeof IntersectionObserver === 'undefined')

  useEffect(() => {
    if (seen || !ref.current) return
    const observer = new IntersectionObserver(([entry]) => {
      if (entry.isIntersecting) {
        setSeen(true)
        observer.disconnect()
      }
    }, { threshold: 0.4 })
    observer.observe(ref.current)
    return () => observer.disconnect()
  }, [seen])

  return [ref, seen]
}

// A short side-to-side shake, the familiar "no". Used when a wrong code is
// entered. Played with element.animate() so it can run again on every wrong
// try. With reduced motion it does nothing (the red message still appears).
export function shake(element) {
  if (!element || !element.animate || prefersReducedMotion()) return
  element.animate(
    [
      { transform: 'translateX(0)' },
      { transform: 'translateX(-8px)' },
      { transform: 'translateX(7px)' },
      { transform: 'translateX(-5px)' },
      { transform: 'translateX(3px)' },
      { transform: 'translateX(0)' },
    ],
    { duration: 400, easing: 'linear' }, // the shrinking steps above already slow it down
  )
}
