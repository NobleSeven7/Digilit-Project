// Saves and loads all app data in the browser's localStorage,
// so the demo keeps its data between visits and works offline.
import { createSampleData } from '../data/sampleData.js'
import { STATUS, FLAG_AFTER_HOURS } from '../data/constants.js'
import { clearSyncLog } from './webhook.js'
import { toInputValue } from './format.js'

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

// ---- Keeping the sample data current --------------------------------
// The sample journeys are dated from the day the data was created ("tomorrow
// 8 am"). A day later they would be in the past and the demo would find no
// carriers. So when the app opens on a later day, every SAMPLE date moves
// forward by the same number of whole days, as if the data had been reset
// today. Records the user created keep their real dates.
const DAY_MS = 24 * 60 * 60 * 1000
const SAMPLE = createSampleData()
const SAMPLE_IDS = new Set([...SAMPLE.journeys, ...SAMPLE.shipments, ...SAMPLE.deliveries].map((x) => x.id))
const ANCHOR = 'j-bilal' // the demo carrier; its journey always departs "tomorrow"

// Whole calendar days from a to b (local time).
function daysBetween(a, b) {
  const start = new Date(a.getFullYear(), a.getMonth(), a.getDate())
  const end = new Date(b.getFullYear(), b.getMonth(), b.getDate())
  return Math.round((end - start) / DAY_MS)
}
// "2026-11-19T08:00" form (journey departure, parcel deadline) moved by n days.
const shiftInput = (value, n) => {
  const d = new Date(value); d.setDate(d.getDate() + n); return toInputValue(d)
}
// ISO timestamp (createdAt, deliveredAt) moved by ms milliseconds.
const shiftIso = (value, ms) => (value ? new Date(new Date(value).getTime() + ms).toISOString() : value)

export function refreshSampleDates(state, now = new Date()) {
  const anchor = state.journeys.find((j) => j.id === ANCHOR)
  if (!anchor) return state
  // The sample was created the day before the anchor journey departs.
  const created = new Date(anchor.departure); created.setDate(created.getDate() - 1)
  const n = daysBetween(created, now)
  if (n <= 0) return state
  // Dates and times of day ("tomorrow 8 am") move by whole days. Timestamps
  // such as "posted 3 hours ago" move by the exact time that has passed, so
  // they stay that long ago. The demo parcel was posted about 3 minutes
  // before the sample was created, so its timestamp marks that moment.
  const demo = state.shipments.find((s) => s.id === 's-demo')
  const elapsed = demo ? now.getTime() - (new Date(demo.createdAt).getTime() + 3 * 60 * 1000) : n * DAY_MS
  const isSample = (x) => SAMPLE_IDS.has(x.id)
  return {
    ...state,
    journeys: state.journeys.map((j) => (isSample(j) ? { ...j, departure: shiftInput(j.departure, n) } : j)),
    shipments: state.shipments.map((s) => (isSample(s)
      ? { ...s, deadline: shiftInput(s.deadline, n), createdAt: shiftIso(s.createdAt, elapsed) } : s)),
    deliveries: state.deliveries.map((d) => (isSample(d)
      ? { ...d, createdAt: shiftIso(d.createdAt, elapsed), deliveredAt: shiftIso(d.deliveredAt, elapsed) } : d)),
  }
}

export function saveState(state) {
  localStorage.setItem(KEY, JSON.stringify(state))
}

// Load saved data. On the very first visit (or if the saved data is damaged),
// start from the fictional sample data instead.
export function loadState() {
  try {
    const saved = localStorage.getItem(KEY)
    if (saved) {
      const state = flagOldUnmatched(refreshSampleDates(JSON.parse(saved)))
      saveState(state)
      return state
    }
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
