// Saves and loads all app data in the browser's localStorage,
// so the demo keeps its data between visits and works offline.
import { createSampleData } from '../data/sampleData.js'
import { STATUS, DELIVERY, FLAG_AFTER_HOURS } from '../data/constants.js'
import { clearSyncLog, noteInSyncLog } from './webhook.js'
import { anotherCarrierFits, isAvailable } from './matching.js'
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

// ---- Keeping statuses true as time passes ---------------------------
// 1. A request still waiting for both to accept when the carrier's departure
//    time passes can no longer happen: it ends as declined (no money moved),
//    that carrier is not offered again, and the parcel goes back to matching.
// 2. A parcel marked "Carriers found" whose carriers have all left goes back
//    to "Unmatched – Retrying", so the 2-hour admin flag applies to it.
export function settleExpired(state, now = Date.now()) {
  const journeyOf = (id) => state.journeys.find((j) => j.id === id)
  const expired = state.deliveries.filter((d) => d.status === DELIVERY.AWAITING_ACCEPT
    && journeyOf(d.journeyId) && !isAvailable(journeyOf(d.journeyId), now))
  const expiredIds = new Set(expired.map((d) => d.id))

  const deliveries = state.deliveries.map((d) => (expiredIds.has(d.id) ? { ...d, status: DELIVERY.DECLINED, expired: true } : d))
  const shipments = state.shipments.map((s) => {
    const lost = expired.filter((d) => d.shipmentId === s.id)
    if (lost.length === 0 && s.status !== STATUS.FOUND) return s
    const rejectedJourneyIds = [...s.rejectedJourneyIds, ...lost.map((d) => d.journeyId)]
    const status = anotherCarrierFits(s, state, rejectedJourneyIds) ? STATUS.FOUND : STATUS.RETRYING
    if (lost.length === 0 && status === s.status) return s
    return { ...s, rejectedJourneyIds, status }
  })
  for (const d of expired) {
    const s = state.shipments.find((x) => x.id === d.shipmentId)
    noteInSyncLog('request_expired', `Request expired: ${s?.origin} to ${s?.destination}; the carrier left before both accepted`)
  }
  return { ...state, deliveries, shipments }
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

// Save the app data. Returns false if the browser would not save it (storage
// full, or blocked in some private or locked-down browsers). The app then
// keeps working with the data in memory, and says that changes will not last.
export function saveState(state) {
  try {
    localStorage.setItem(KEY, JSON.stringify(state))
    return true
  } catch {
    return false
  }
}

// Can this browser save at all? Checked once when the app starts.
export function canSave() {
  try {
    localStorage.setItem(`${KEY}-check`, '1')
    localStorage.removeItem(`${KEY}-check`)
    return true
  } catch {
    return false
  }
}

// Load saved data. On the very first visit (or if the saved data is damaged),
// start from the fictional sample data instead.
// Data saved before chat and ratings existed has no lists for them yet.
const withLists = (state) => ({ messages: [], ratings: [], ...state })

// The data another tab of this browser has just saved, or null.
// (The demo can be open in two tabs, one as the sender and one as the
// carrier; each tab shows the other's changes straight away.)
export function readSavedState(text) {
  try {
    return text ? withLists(JSON.parse(text)) : null
  } catch {
    return null
  }
}
export const STORAGE_KEY = KEY

export function loadState() {
  try {
    const saved = localStorage.getItem(KEY)
    if (saved) {
      const state = flagOldUnmatched(settleExpired(refreshSampleDates(withLists(JSON.parse(saved)))))
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
