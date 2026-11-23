// PostHog product analytics. Every function here is a safe no-op when the
// PostHog settings are missing, so the app works exactly as before without them.
//
// Privacy: events carry only route facts (cities, item type, weight, price,
// counts). They never carry names, codes or free-text descriptions.
// Session recording is OFF until the team decides to turn it on.
import posthog from 'posthog-js'

const KEY = import.meta.env.VITE_POSTHOG_KEY
const HOST = import.meta.env.VITE_POSTHOG_HOST

let ready = false

// Start PostHog once, when the app loads.
export function initAnalytics() {
  if (!KEY || !HOST) {
    if (import.meta.env.DEV) {
      const missing = [!KEY && 'VITE_POSTHOG_KEY', !HOST && 'VITE_POSTHOG_HOST'].filter(Boolean).join(' and ')
      console.error(`${missing} variable required by PostHog is missing or un-configured, this causes events to be silently missed. This error stops appearing once ${missing} is configured`)
    }
    return
  }
  try {
    posthog.init(KEY, {
      api_host: HOST,
      person_profiles: 'identified_only',
      capture_pageview: false, // the app uses #/page links, so pageviews are tracked by events instead
      disable_session_recording: true, // turn on only after the Data & Ethics review
      capture_exceptions: true, // error tracking for uncaught errors
    })
    ready = true
  } catch {
    // analytics must never break the app
  }
}

// Record one action. Use short, past-tense snake_case names.
export function track(event, properties = {}) {
  if (!ready) return
  try {
    posthog.capture(event, properties)
  } catch {
    // ignore
  }
}

// Tie later events to the demo person who is "signed in".
export function identifyUser(profile) {
  if (!ready || !profile) return
  try {
    posthog.identify(`${profile.role}:${profile.name}`, { role: profile.role })
  } catch {
    // ignore
  }
}
