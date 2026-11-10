// Page switching without a router library.
// The part of the address after "#" says which page to show:
//   .../#/sender          -> Sender page
//   .../#/matches/s-123   -> Matches page for shipment s-123
// This "hash" style also works on GitHub Pages with no extra setup.
import { useEffect, useState } from 'react'

// Go to another page, e.g. goTo('matches/s-123').
export function goTo(path) {
  window.location.hash = `/${path}`
}

// React hook: returns the current page name and optional id,
// and re-renders the app whenever the address changes.
export function useRoute() {
  const [hash, setHash] = useState(window.location.hash)

  useEffect(() => {
    function onChange() {
      setHash(window.location.hash)
      window.scrollTo(0, 0) // start each page at the top
    }
    window.addEventListener('hashchange', onChange)
    return () => window.removeEventListener('hashchange', onChange)
  }, [])

  const [page, id] = hash.replace(/^#\/?/, '').split('/')
  return { page: page || 'home', id }
}
