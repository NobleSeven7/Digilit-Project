// Helpers for the few animations in the app (see "Motion" in src/index.css).

import { useEffect, useState } from 'react'
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
// differently ("theme" = a cross-fade between light and dark).
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

// React hook: "hidden" is true while the person is scrolling down the page
// (past the first 120px), false as soon as they scroll back up. The phone
// header uses it to get out of the way while reading and come back when needed.
// "instant" is true for a moment after a page change: the new page starts at
// the top with the header already in place, so it must not slide in.
export function useHideOnScroll() {
  const [hidden, setHidden] = useState(false)
  const [instant, setInstant] = useState(false)

  useEffect(() => {
    let lastY = window.scrollY
    let frame = 0
    let timer = 0
    const onPageChange = () => {
      setInstant(true)
      setHidden(false)
      lastY = 0
      clearTimeout(timer)
      timer = setTimeout(() => setInstant(false), 300)
    }
    const onScroll = () => {
      if (frame) return
      frame = requestAnimationFrame(() => {
        frame = 0
        const y = window.scrollY
        if (y < 120) setHidden(false)
        else if (y > lastY + 6) setHidden(true)
        else if (y < lastY - 6) setHidden(false)
        else return // small jitter: keep lastY so slow scrolls still add up
        lastY = y
      })
    }
    window.addEventListener('scroll', onScroll, { passive: true })
    window.addEventListener('hashchange', onPageChange)
    return () => {
      window.removeEventListener('scroll', onScroll)
      window.removeEventListener('hashchange', onPageChange)
      cancelAnimationFrame(frame)
      clearTimeout(timer)
    }
  }, [])

  return [hidden, instant]
}

// A motion token from src/index.css (e.g. '--ease-out'), for motion played
// from JavaScript, so it uses the same curve as the CSS.
function token(name, fallback) {
  return getComputedStyle(document.documentElement).getPropertyValue(name).trim() || fallback
}

// A short side-to-side shake (a "head-shake no"). Used when a wrong code is
// entered. Played with element.animate() so it can run again on every wrong
// try. Three swings that get smaller, 280ms on the --ease-out curve, inside
// the 300ms motion rule. With reduced motion it does nothing (the red message
// still appears).
export function shake(element) {
  if (!element || !element.animate || prefersReducedMotion()) return
  element.animate(
    [
      { transform: 'translateX(0)' },
      { transform: 'translateX(-6px)' },
      { transform: 'translateX(5px)' },
      { transform: 'translateX(-3px)' },
      { transform: 'translateX(0)' },
    ],
    { duration: 280, easing: token('--ease-out', 'cubic-bezier(0.23, 1, 0.32, 1)') },
  )
}

// Matches: the ranked carriers rise in once, right after a parcel is posted
// (the answer to "Post parcel"). Opening Matches any other way shows them in
// place (DESIGN.md: no animation when changing pages). The Send page marks
// the new parcel; Matches takes the mark once.
const JUST_POSTED = 'raastashare:just-posted'
export function markJustPosted(id) {
  try { sessionStorage.setItem(JUST_POSTED, id) } catch { /* storage blocked: no wave */ }
}
export function wasJustPosted(id) {
  try { return sessionStorage.getItem(JUST_POSTED) === id } catch { return false }
}
export function clearJustPosted() {
  try { sessionStorage.removeItem(JUST_POSTED) } catch { /* storage blocked */ }
}
