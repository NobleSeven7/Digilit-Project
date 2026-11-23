import posthog, { posthogEnabled } from './posthog.js'

// This scoped logger is the only route used for PostHog Logs added by this
// integration. It deliberately does not wrap console or existing app logs.
function emit(level, message, attributes) {
  if (!posthogEnabled) return

  try {
    posthog.logger[level](message, attributes)
  } catch {
    // Log delivery must never affect the application workflow.
  }
}

export const posthogLog = Object.freeze({
  info: (message, attributes) => emit('info', message, attributes),
  warn: (message, attributes) => emit('warn', message, attributes),
})
