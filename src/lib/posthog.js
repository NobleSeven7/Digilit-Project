import posthog from 'posthog-js'

const posthogKey = import.meta.env.VITE_POSTHOG_KEY
const posthogHost = import.meta.env.VITE_POSTHOG_HOST

export const posthogEnabled = Boolean(posthogKey && posthogHost)

// Without a key (e.g. a teammate running `npm run dev` with no .env.local),
// PostHog stays off and the app works as normal; development shows a warning.
if (!posthogEnabled) {
  if (import.meta.env.DEV) {
    console.warn('PostHog is off: add VITE_POSTHOG_KEY and VITE_POSTHOG_HOST to .env.local to send analytics.')
  }
} else {
  // No cookies: the anonymous visitor ID is kept in this browser's local
  // storage, and browsers that ask not to be tracked ("Do Not Track") send
  // nothing. Screen recording (session replay) and surveys stay off, so only
  // events and page views are sent. See "About this demo".
  posthog.init(posthogKey, {
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
}

export default posthog
