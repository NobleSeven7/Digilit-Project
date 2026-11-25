// PostHog analytics, loaded a moment AFTER the page has appeared.
//
// The posthog-js library is large (about 390 KB, more than half of the app's
// download), so it is not part of the first download. The app talks to the
// small stand-in below instead: calls made before the library has arrived
// (capture, identify, reset, logs) wait in a queue and are sent, in order, as
// soon as it is ready. What is tracked does not change.

const posthogKey = import.meta.env.VITE_POSTHOG_KEY
const posthogHost = import.meta.env.VITE_POSTHOG_HOST

export const posthogEnabled = Boolean(posthogKey && posthogHost)

let real = null // the loaded posthog-js, once it has arrived
const waiting = [] // calls made before that, as [path, args]

// Run one call on the real library ("capture" or "logger.info").
function run(path, args) {
  const parts = path.split('.')
  const target = parts.length === 2 ? real[parts[0]] : real
  target[parts.at(-1)](...args)
}

function call(path, args) {
  if (!posthogEnabled) return
  if (real) run(path, args)
  else waiting.push([path, args])
}

// The stand-in. It has only the calls this app uses.
const posthog = {
  capture: (...args) => call('capture', args),
  identify: (...args) => call('identify', args),
  reset: (...args) => call('reset', args),
  logger: {
    info: (...args) => call('logger.info', args),
    warn: (...args) => call('logger.warn', args),
  },
}

async function load() {
  const { default: library } = await import('posthog-js')
  // No cookies: the anonymous visitor ID is kept in this browser's local
  // storage, and browsers that ask not to be tracked ("Do Not Track") send
  // nothing. Screen recording (session replay) and surveys stay off, so only
  // events and page views are sent. See "About this demo".
  library.init(posthogKey, {
    api_host: posthogHost,
    defaults: '2026-08-30',
    persistence: 'localStorage',
    respect_dnt: true,
    disable_session_recording: true,
    disable_surveys: true,
    logs: {
      serviceName: 'raastashare-web',
      environment: import.meta.env.MODE,
    },
    capture_exceptions: {
      capture_unhandled_errors: true,
      capture_unhandled_rejections: true,
      capture_console_errors: false,
    },
  })
  real = library
  for (const [path, args] of waiting.splice(0)) {
    try { run(path, args) } catch { /* analytics must never break the app */ }
  }
}

// Without a key (e.g. a teammate running `npm run dev` with no .env.local),
// PostHog stays off and the app works as normal; development shows a warning.
if (!posthogEnabled) {
  if (import.meta.env.DEV) {
    console.warn('PostHog is off: add VITE_POSTHOG_KEY and VITE_POSTHOG_HOST to .env.local to send analytics.')
  }
} else {
  // Start loading once the page has finished loading, when the browser is idle.
  const start = () => (window.requestIdleCallback ?? setTimeout)(() => { load().catch(() => {}) })
  if (document.readyState === 'complete') start()
  else window.addEventListener('load', start, { once: true })
}

export default posthog
