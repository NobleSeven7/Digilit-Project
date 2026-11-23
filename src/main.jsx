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
import App from './App.jsx'

// Find the <div id="root"> in index.html and draw the App inside it.
createRoot(document.getElementById('root')).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
