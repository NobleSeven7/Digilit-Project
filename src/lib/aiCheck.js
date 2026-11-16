// The "AI parcel check" on the Send page.
//
// The sender describes the item in their own words. The app sends that text
// to a Make.com webhook, Make.com asks an AI model, and the answer comes back:
//   1. a suggested item type (one of ITEM_TYPES)
//   2. whether the item may be prohibited, with a one-line reason
//
// It is only a suggestion. The sender still chooses the item type and ticks
// the prohibited-items checklist, and a flagged parcel goes to a human admin.
//
// If the AI cannot be reached (no URL set, no reply within 8 seconds, or a
// reply that makes no sense), a simple keyword check is used instead and is
// clearly labelled "Offline check (not AI)". No API key is ever in this code.
import { ITEM_TYPES } from '../data/constants.js'

// Vite reads VITE_AI_WEBHOOK_URL from .env.local (or a GitHub secret) at build time.
const AI_WEBHOOK_URL = (import.meta.env.VITE_AI_WEBHOOK_URL || '').trim()

export const MAX_DESCRIPTION = 200 // characters the sender may type
const TIMEOUT_MS = 8000 // how long to wait for the AI before falling back
const MAX_REASON = 160 // the reason is kept to about one line

// Where an answer came from. Shown on the suggestion card and logged.
export const SOURCE = {
  AI: 'AI suggestion',
  OFFLINE: 'Offline check (not AI)',
}

// ---- The offline keyword check -------------------------------------------

// Words that suggest a prohibited item, grouped by the checklist line they break.
const PROHIBITED_WORDS = [
  { reason: 'Weapons, ammunition and explosives are not allowed',
    words: ['gun', 'pistol', 'rifle', 'firearm', 'weapon', 'ammunition', 'bullet', 'explosive', 'grenade', 'fireworks', 'firecracker'] },
  { reason: 'Illegal drugs, alcohol and bulk tobacco are not allowed',
    words: ['drug', 'heroin', 'cocaine', 'hashish', 'charas', 'alcohol', 'liquor', 'whisky', 'whiskey', 'beer', 'wine', 'tobacco'] },
  { reason: 'Cash, jewellery and high-value documents are not allowed',
    words: ['cash', 'currency', 'banknote', 'jewellery', 'jewelry', 'gold', 'passport'] },
  { reason: 'Flammable, toxic and hazardous materials are not allowed',
    words: ['petrol', 'gasoline', 'diesel', 'kerosene', 'gas cylinder', 'acid', 'poison', 'pesticide'] },
  { reason: 'Live animals are not allowed',
    words: ['live animal', 'puppy', 'kitten', 'parrot', 'chicks', 'goat', 'pet'] },
]

// Words that suggest each item type. Checked in this order; first match wins.
const TYPE_WORDS = [
  { type: 'Fragile item',
    words: ['fragile', 'glass', 'ceramic', 'crockery', 'mirror', 'vase', 'laptop', 'phone', 'tablet', 'screen', 'monitor', 'lamp', 'perfume'] },
  { type: 'Perishables',
    words: ['food', 'fruit', 'mango', 'vegetable', 'meat', 'fish', 'milk', 'sweets', 'mithai', 'cake', 'biryani', 'flowers'] },
  { type: 'Bulky item',
    words: ['furniture', 'chair', 'table', 'sofa', 'mattress', 'fridge', 'bicycle', 'washing machine', 'carpet', 'tyre'] },
  { type: 'Documents',
    words: ['document', 'paper', 'certificate', 'degree', 'transcript', 'letter', 'contract', 'file', 'form'] },
]

// Does the text contain this word as a whole word? Plurals count too:
// "vase" also matches "vases", and "mango" also matches "mangoes".
function hasWord(text, word) {
  return new RegExp(`\\b${word}(?:e?s)?\\b`, 'i').test(text)
}

// The fallback: a plain keyword search. No AI involved.
export function offlineCheck(description) {
  const banned = PROHIBITED_WORDS.find((group) => group.words.some((w) => hasWord(description, w)))
  const typed = TYPE_WORDS.find((group) => group.words.some((w) => hasWord(description, w)))
  return {
    suggestedType: typed ? typed.type : 'Small parcel',
    prohibited: Boolean(banned),
    reason: banned ? banned.reason : 'No prohibited keyword found in the description',
    source: SOURCE.OFFLINE,
  }
}

// ---- Reading the AI's reply ----------------------------------------------

// AI models sometimes wrap their JSON in extra text. Pull out the {...} part.
function parseJson(text) {
  try {
    return JSON.parse(text)
  } catch {
    const match = text.match(/\{[\s\S]*\}/)
    if (!match) return null
    try { return JSON.parse(match[0]) } catch { return null }
  }
}

// Check the reply before trusting it. Returns a clean result, or null if the
// reply is not usable (then the offline check takes over).
export function readAiReply(text) {
  const data = parseJson(text)
  if (!data || typeof data !== 'object') return null

  // The item type must be one of ours (ignoring capital letters).
  const wanted = String(data.itemType ?? '').trim().toLowerCase()
  const suggestedType = ITEM_TYPES.find((type) => type.toLowerCase() === wanted)
  if (!suggestedType) return null

  // "prohibited" must be a clear yes or no.
  const flag = String(data.prohibited).trim().toLowerCase()
  if (!['true', 'false', 'yes', 'no'].includes(flag)) return null
  const prohibited = flag === 'true' || flag === 'yes'

  // Keep the reason to one short line of plain text.
  const reason = String(data.reason ?? '').replace(/\s+/g, ' ').trim().slice(0, MAX_REASON)
  if (!reason) return null

  return { suggestedType, prohibited, reason, source: SOURCE.AI }
}

// ---- The check itself -----------------------------------------------------

export function isAiConfigured() {
  return AI_WEBHOOK_URL !== ''
}

// Ask the AI about a description. Always returns a result: the AI's answer,
// or the offline keyword check if the AI is not available.
export async function checkParcel(description) {
  const text = description.trim().slice(0, MAX_DESCRIPTION)
  if (!isAiConfigured()) return offlineCheck(text)

  // Give up after 8 seconds so the page never hangs.
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS)
  try {
    // Sent as a plain web form with one field, "description". Browsers send
    // this kind of request directly, without a separate permission check
    // first, which leaves less to set up on the Make.com side.
    const response = await fetch(AI_WEBHOOK_URL, {
      method: 'POST',
      body: new URLSearchParams({ description: text }),
      signal: controller.signal,
    })
    if (!response.ok) return offlineCheck(text)
    return readAiReply(await response.text()) || offlineCheck(text)
  } catch {
    // Offline, blocked, wrong URL or timed out.
    return offlineCheck(text)
  } finally {
    clearTimeout(timer)
  }
}
