// The shared backend (Supabase): real accounts, and parcels, trips and
// deliveries that every device sees.
//
// It is used only when both VITE_SUPABASE_URL and
// VITE_SUPABASE_PUBLISHABLE_KEY are set (in .env.local, or as GitHub secrets
// for the live site). Without them the app keeps everything in this browser,
// exactly as before. The publishable key is meant to be public: the database
// rules (database/02-sign-in-and-rules.sql) decide what each person may do.
// The secret key is never used here.
import { changesBetween, hasChanges, stateFromRows, TABLES } from './serverRows.js'

const URL = (import.meta.env?.VITE_SUPABASE_URL || '').trim()
const KEY = (import.meta.env?.VITE_SUPABASE_PUBLISHABLE_KEY || '').trim()

export const serverEnabled = URL !== '' && KEY !== ''

// The Supabase library is only downloaded when the backend is switched on.
let clientPromise = null
export function getClient() {
  if (!clientPromise) {
    clientPromise = import('@supabase/supabase-js').then(({ createClient }) => createClient(URL, KEY))
  }
  return clientPromise
}

// Turn a Supabase error into a sentence a person can act on.
function plain(error, fallback) {
  const text = error?.message || ''
  if (/invalid login credentials/i.test(text)) return 'That email and password do not match an account.'
  if (/already registered|already been registered/i.test(text)) return 'There is already an account with that email. Sign in instead.'
  if (/database error saving new user/i.test(text)) return 'That name is already taken. Add your surname or a number and try again.'
  if (/password/i.test(text) && /least|short|weak/i.test(text)) return 'Use a password of at least 8 characters.'
  if (/fetch|network/i.test(text)) return 'Could not reach the RaastaShare server. Check your internet connection.'
  return fallback
}

// ---- Accounts --------------------------------------------------------------

// The signed-in person's profile ({ id, name, role, isAdmin }), or null.
export async function currentProfile() {
  const supabase = await getClient()
  const { data: { session } } = await supabase.auth.getSession()
  if (!session) return null
  const { data, error } = await supabase.from('profiles')
    .select('id, name, role, is_admin').eq('id', session.user.id).maybeSingle()
  if (error || !data) return null
  return { id: data.id, name: data.name, role: data.role, isAdmin: data.is_admin }
}

// Call back whenever someone signs in or out (in this tab or another).
export async function onAccountChange(callback) {
  const supabase = await getClient()
  const { data } = supabase.auth.onAuthStateChange((event) => {
    // Supabase asks that no other Supabase call runs inside this listener,
    // so the callback runs just after it.
    if (event === 'SIGNED_IN' || event === 'SIGNED_OUT') setTimeout(callback, 0)
  })
  return () => data.subscription.unsubscribe()
}

export async function signIn(email, password) {
  const supabase = await getClient()
  const { error } = await supabase.auth.signInWithPassword({ email, password })
  return error ? plain(error, 'Could not sign in. Try again.') : null
}

// A new account. The server makes the profile from the name and role.
export async function createAccount({ email, password, name, role }) {
  const supabase = await getClient()
  const { data, error } = await supabase.auth.signUp({
    email, password, options: { data: { name, role } },
  })
  if (error) return plain(error, 'Could not create the account. Try again.')
  // With "Confirm email" switched off in Supabase, the person is signed in
  // straight away. If it is ever switched back on, say what to do next.
  if (!data.session) return 'Account created. Check your email for the link to finish, then sign in.'
  return null
}

export async function signOut() {
  const supabase = await getClient()
  await supabase.auth.signOut()
}

// ---- Data ------------------------------------------------------------------

// Chat, ratings, photos and cancelling need database/05-upgrades.sql. Until
// it has been run, the app works as before and those parts say so.
export let upgradesReady = true

// Everything this person may see, as the app's
// { journeys, shipments, deliveries, messages, ratings }.
export async function loadServerState() {
  const supabase = await getClient()
  const [journeys, shipments, deliveries, codes, messages, ratings] = await Promise.all([
    supabase.from('journeys').select('*'),
    supabase.from('shipments').select('*'),
    supabase.from('deliveries').select('*'),
    supabase.from('delivery_codes').select('*'),
    supabase.from('messages').select('*'),
    supabase.from('ratings').select('*'),
  ])
  const failed = [journeys, shipments, deliveries, codes].find((r) => r.error)
  if (failed) throw new Error(plain(failed.error, 'Could not load the latest data from the server.'))
  upgradesReady = !messages.error && !ratings.error
  return stateFromRows({
    journeys: journeys.data, shipments: shipments.data, deliveries: deliveries.data, codes: codes.data,
    messages: messages.data || [], ratings: ratings.data || [],
  })
}

// ---- Live updates ------------------------------------------------------------

// Call back whenever someone changes a trip, parcel, delivery, message or
// rating this person may see. Several changes close together (one save can
// touch three tables) bring one call. Returns a function that stops listening.
export async function watchChanges(callback) {
  const supabase = await getClient()
  let timer = null
  const soon = () => { clearTimeout(timer); timer = setTimeout(callback, 300) }
  const channel = supabase.channel('raastashare-live')
  for (const table of ['journeys', 'shipments', 'deliveries', 'messages', 'ratings']) {
    channel.on('postgres_changes', { event: '*', schema: 'public', table }, soon)
  }
  channel.subscribe()
  return () => { clearTimeout(timer); supabase.removeChannel(channel) }
}

// Send what changed between two states. Trips and parcels go first, as
// deliveries point to them; removals go in the opposite order.
// Returns null when saved, or a sentence saying what went wrong.
export async function pushChanges(before, after) {
  const changes = changesBetween(before, after)
  if (!hasChanges(changes)) return null
  const supabase = await getClient()
  const refused = 'The server did not allow that change for your account, so it was not saved.'
  const failed = (error) => (/row-level security|permission/i.test(error.message)
    ? refused : plain(error, 'Could not save to the server. Your last change was not kept.'))

  for (const table of TABLES) {
    if (changes.insert[table].length) {
      const { error } = await supabase.from(table).insert(changes.insert[table])
      if (error) return failed(error)
    }
    // A change the rules do not allow updates no row (no error), so count them.
    for (const row of changes.update[table]) {
      const { data, error } = await supabase.from(table).update(row).eq('id', row.id).select('id')
      if (error) return failed(error)
      if (data.length === 0) return refused
    }
  }
  // Codes are never sent: the server makes them (database/03-codes-and-timers.sql).
  for (const table of [...TABLES].reverse()) {
    if (changes.remove[table].length) {
      const { error } = await supabase.from(table).delete().in('id', changes.remove[table])
      if (error) return failed(error)
    }
  }
  return null
}

// Either person cancels before pickup; the server refunds the sender and
// puts the parcel back into matching. Returns { outcome: 'ok' } or { error }.
export async function cancelDelivery(deliveryId, reason) {
  const supabase = await getClient()
  const { data, error } = await supabase.rpc('cancel_delivery', { delivery: deliveryId, reason })
  if (error) return { error: plain(error, 'Could not cancel. Try again.') }
  return data
}

// ---- Photo proof ---------------------------------------------------------------

// Upload a photo (a JPEG Blob) for a delivery. kind is 'pickup' or 'dropoff'.
// Returns { path } (where it is kept) or { error: 'a sentence' }.
export async function uploadPhoto(deliveryId, kind, blob) {
  const supabase = await getClient()
  const path = `${deliveryId}/${kind}-${Date.now()}.jpg`
  const { error } = await supabase.storage.from('parcel-photos')
    .upload(path, blob, { contentType: 'image/jpeg' })
  if (error) return { error: plain(error, 'Could not upload the photo. Try again.') }
  return { path }
}

// A short-lived link to show a private photo (photos are not public).
// Each link works for an hour; a new one is made after 50 minutes.
const photoLinks = new Map() // path -> { url, madeAt }
export async function photoLink(path) {
  const kept = photoLinks.get(path)
  if (kept && Date.now() - kept.madeAt < 50 * 60 * 1000) return kept.url
  const supabase = await getClient()
  const { data, error } = await supabase.storage.from('parcel-photos').createSignedUrl(path, 60 * 60)
  if (error) return null
  photoLinks.set(path, { url: data.signedUrl, madeAt: Date.now() })
  return data.signedUrl
}

// The carrier enters a pickup or delivery code; the server checks it.
// kind is 'pickup' or 'delivery'. Returns { outcome: 'ok' | 'wrong' | 'frozen',
// triesLeft } or { error: 'a sentence' }.
export async function enterCode(deliveryId, kind, code) {
  const supabase = await getClient()
  const { data, error } = await supabase.rpc('enter_code', { delivery: deliveryId, kind, code })
  if (error) return { error: plain(error, 'Could not check the code. Try again.') }
  return data
}
