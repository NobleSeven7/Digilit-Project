// Sends records to the Make.com webhook, which adds them to Google Sheets
// and sends the email alerts. If no webhook URL is set, the app still works:
// the record is simply kept on this device and noted in the sync log.

const LOG_KEY = 'raastashare-sync-log-v1'

// Vite reads VITE_WEBHOOK_URL from the .env.local file when the app starts.
const WEBHOOK_URL = (import.meta.env.VITE_WEBHOOK_URL || '').trim()

export function isWebhookConfigured() {
  return WEBHOOK_URL !== ''
}

// The sync log is a simple list kept in localStorage, newest entry first.
export function readSyncLog() {
  try {
    return JSON.parse(localStorage.getItem(LOG_KEY)) || []
  } catch {
    return []
  }
}

export function clearSyncLog() {
  localStorage.removeItem(LOG_KEY)
}

function addToSyncLog(event, summary, result) {
  const entry = { time: new Date().toISOString(), event, summary, result }
  const log = [entry, ...readSyncLog()].slice(0, 50) // keep the latest 50
  localStorage.setItem(LOG_KEY, JSON.stringify(log))
}

// event   = 'shipment' | 'journey' | 'match' | 'delivery' | 'dispute'
// record  = a flat object; each property becomes a column in Google Sheets
// summary = short text for the sync log
export async function sendToWebhook(event, record, summary) {
  if (!isWebhookConfigured()) {
    addToSyncLog(event, summary, 'Saved on this device (no webhook URL set)')
    return
  }
  try {
    await fetch(WEBHOOK_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ event, sentAt: new Date().toISOString(), ...record }),
    })
    addToSyncLog(event, summary, 'Sent to Make.com')
  } catch {
    // Offline or the URL is wrong: the app carries on with its local copy.
    addToSyncLog(event, summary, 'Could not reach Make.com (saved on this device)')
  }
}
