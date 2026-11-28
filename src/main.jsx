// Entry point: this is the first file the browser runs.
import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'

// Fonts are bundled with the app (not loaded from the internet), so they work offline.
// IBM Plex: the condensed cut for headings, the normal cut for text.
import '@fontsource/ibm-plex-sans/400.css'
import '@fontsource/ibm-plex-sans/700.css'
import '@fontsource/ibm-plex-sans-condensed/600.css'
import '@fontsource/ibm-plex-sans-condensed/700.css'

import './index.css'
import './lib/posthog.js'
import App from './App.jsx'

// Lets the app be installed on a phone and open without internet (public/sw.js).
// Only in the built site: while developing, saved copies would hide changes.
if (import.meta.env.PROD && 'serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('./sw.js').catch(() => {
      // Not supported here (for example a private window): the site still works.
    })
  })
}

// Find the <div id="root"> in index.html and draw the App inside it.
createRoot(document.getElementById('root')).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
