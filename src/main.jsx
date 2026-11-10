// Entry point: this is the first file the browser runs.
import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'

// Fonts are bundled with the app (not loaded from the internet), so they work offline.
import '@fontsource/bricolage-grotesque/600.css'
import '@fontsource/bricolage-grotesque/700.css'
import '@fontsource/atkinson-hyperlegible/400.css'
import '@fontsource/atkinson-hyperlegible/700.css'

import './index.css'
import App from './App.jsx'

// Find the <div id="root"> in index.html and draw the App inside it.
createRoot(document.getElementById('root')).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
