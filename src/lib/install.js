// "Install the app": on Android and desktop Chrome or Edge, the browser
// offers to add RaastaShare to the home screen. It tells the page it can by
// sending a "beforeinstallprompt" event; we keep it and show our own button.
// (iPhones have no such event: there it is Share, then Add to Home Screen.)
import { useEffect, useState } from 'react'

let saved = null // the browser's offer, kept until the button is pressed
const listeners = new Set()
if (typeof window !== 'undefined') {
  window.addEventListener('beforeinstallprompt', (event) => {
    event.preventDefault() // show our button instead of the browser's banner
    saved = event
    listeners.forEach((fn) => fn())
  })
  window.addEventListener('appinstalled', () => {
    saved = null
    listeners.forEach((fn) => fn())
  })
}

// Returns a function that shows the browser's install question, or null
// when the browser has not offered (already installed, or not supported).
export function useInstall() {
  const [, setTick] = useState(0)
  useEffect(() => {
    const update = () => setTick((n) => n + 1)
    listeners.add(update)
    return () => listeners.delete(update)
  }, [])
  if (!saved) return null
  return async () => {
    const offer = saved
    saved = null
    offer.prompt()
    await offer.userChoice.catch(() => {})
    listeners.forEach((fn) => fn())
  }
}
