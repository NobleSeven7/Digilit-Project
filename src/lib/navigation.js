// Page switching without a router library.
// The part of the address after "#" says which page to show:
//   .../#/sender          -> Sender page
//   .../#/matches/s-123   -> Matches page for shipment s-123
// This "hash" style also works on GitHub Pages with no extra setup.
import { useEffect, useState } from 'react'
import { withViewTransition } from './motion.js'

// Set just before the app itself changes page (a link or goTo), so only
// those changes fade. Back and Forward leave it false and change at once.
// (It clears itself shortly after, in case the link led to the same page.)
let fromApp = false
let clearTimer = 0
function markFromApp() {
  fromApp = true
  clearTimeout(clearTimer)
  clearTimer = setTimeout(() => { fromApp = false }, 400)
}
document.addEventListener('click', (event) => {
  if (event.target.closest?.('a[href^="#/"]')) markFromApp()
}, true)

// Go to another page, e.g. goTo('matches/s-123').
export function goTo(path) {
  markFromApp()
  window.location.hash = `/${path}`
}

// React hook: returns the current page name and optional id,
// and re-renders the app whenever the address changes.
export function useRoute() {
  const [hash, setHash] = useState(window.location.hash)

  useEffect(() => {
    // A link's new page quickly fades in over the old one (see "page" in
    // index.css); Back and Forward switch at once, as people expect.
    function onChange() {
      const change = () => {
        setHash(window.location.hash)
        window.scrollTo(0, 0) // start each page at the top
      }
      if (fromApp) withViewTransition(change, 'page')
      else change()
      fromApp = false
    }
    window.addEventListener('hashchange', onChange)
    return () => window.removeEventListener('hashchange', onChange)
  }, [])

  const [page, id] = hash.replace(/^#\/?/, '').split('/')
  return { page: page || 'home', id }
}
