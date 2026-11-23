// Entry point: this is the first file the browser runs.
import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'

// Fonts are bundled with the app (not loaded from the internet), so they work offline.
// Barlow is modelled on road-sign lettering: the condensed cut is used for
// headings, the regular cut for everything else. Both have plain zeros.
import '@fontsource/barlow-condensed/600.css'
import '@fontsource/barlow-condensed/700.css'
import '@fontsource/barlow/400.css'
import '@fontsource/barlow/500.css'
import '@fontsource/barlow/700.css'

import './index.css'
import App from './App.jsx'
import { initAnalytics } from './lib/analytics.js'

// Start product analytics (does nothing if the PostHog settings are missing).
initAnalytics()

// Find the <div id="root"> in index.html and draw the App inside it.
createRoot(document.getElementById('root')).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
