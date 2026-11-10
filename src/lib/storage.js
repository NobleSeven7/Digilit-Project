// Saves and loads all app data in the browser's localStorage,
// so the demo keeps its data between visits and works offline.
import { createSampleData } from '../data/sampleData.js'
import { STATUS, FLAG_AFTER_HOURS } from '../data/constants.js'
import { clearSyncLog } from './webhook.js'

const KEY = 'raastashare-data-v1'

// A request still "Unmatched – Retrying" after 2 hours is flagged for the admin.
function flagOldUnmatched(state) {
  const limitMs = FLAG_AFTER_HOURS * 60 * 60 * 1000
  const shipments = state.shipments.map((shipment) => {
    const waitedMs = Date.now() - new Date(shipment.createdAt)
    if (shipment.status === STATUS.RETRYING && waitedMs > limitMs) {
      return { ...shipment, status: STATUS.FLAGGED }
    }
    return shipment
  })
  return { ...state, shipments }
}

export function saveState(state) {
  localStorage.setItem(KEY, JSON.stringify(state))
}

// Load saved data. On the very first visit (or if the saved data is damaged),
// start from the fictional sample data instead.
export function loadState() {
  try {
    const saved = localStorage.getItem(KEY)
    if (saved) return flagOldUnmatched(JSON.parse(saved))
  } catch {
    // fall through to fresh sample data
  }
  return resetState()
}

// "Reset demo data": throw everything away and reload the sample data.
export function resetState() {
  const fresh = flagOldUnmatched(createSampleData())
  saveState(fresh)
  clearSyncLog()
  return fresh
}
