// Small helpers that turn raw values into text people can read.

// 1500 -> "PKR 1,500"
export function formatPKR(amount) {
  return `PKR ${Math.round(amount).toLocaleString('en-PK')}`
}

// "2026-11-11T18:00" -> "Wed, 11 Nov, 6:00 pm"
export function formatDateTime(value) {
  return new Date(value).toLocaleString('en-GB', {
    weekday: 'short', day: 'numeric', month: 'short',
    hour: 'numeric', minute: '2-digit', hour12: true,
  })
}

// Date object -> "2026-11-11T18:00" (the format <input type="datetime-local"> uses)
export function toInputValue(date) {
  const pad = (n) => String(n).padStart(2, '0')
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}` +
    `T${pad(date.getHours())}:${pad(date.getMinutes())}`
}

// A date some days from today at a fixed hour, e.g. dayAt(1, 18) = tomorrow 6 pm.
export function dayAt(daysFromToday, hour, minute = 0) {
  const d = new Date()
  d.setDate(d.getDate() + daysFromToday)
  d.setHours(hour, minute, 0, 0)
  return toInputValue(d)
}

// Make a short unique id such as "s-m3x9k2ab". The prefix says what it is.
export function makeId(prefix) {
  return `${prefix}-${Date.now().toString(36)}${Math.random().toString(36).slice(2, 5)}`
}

// A moment in time -> Pakistan time as text, e.g. "2026-11-11 12:34:58".
// Used for the Google Sheets log so the times match the clock in Pakistan,
// whatever time zone the visitor's device is set to.
// (The 'sv-SE' style is used only because it writes dates as YYYY-MM-DD.)
export function toPakistanTime(value) {
  return new Date(value).toLocaleString('sv-SE', { timeZone: 'Asia/Karachi' })
}

// A day only, e.g. "Sat 28 Nov" (or "28 Nov" without the weekday). Short
// enough for a picker on a phone.
export function formatDay(value, weekday = true) {
  return new Date(value).toLocaleDateString('en-GB',
    weekday ? { weekday: 'short', day: 'numeric', month: 'short' } : { day: 'numeric', month: 'short' })
}

// Picker labels that stay short on a phone: "Islamabad to Lahore, 5 kg, 27 Nov".
// Only when two items would read the same is the time added, to tell them apart.
// items: [{ id, base, at }] -> Map of id to label.
export function pickerLabels(items) {
  const short = (item) => `${item.base}, ${formatDay(item.at, false)}`
  const count = {}
  items.forEach((item) => { count[short(item)] = (count[short(item)] || 0) + 1 })
  return new Map(items.map((item) => [item.id,
    count[short(item)] > 1 ? `${short(item)}, ${formatShort(item.at).split(', ')[1]}` : short(item)]))
}

// A short date and time for picker lists, e.g. "17 Nov, 2:23 pm".
export function formatShort(value) {
  return new Date(value).toLocaleString('en-GB', {
    day: 'numeric', month: 'short', hour: 'numeric', minute: '2-digit', hour12: true,
  })
}

// A person's name inside a sentence. The invisible marks around it keep a
// right-to-left name (e.g. Urdu) from pulling the full stop or nearby words
// to the wrong side. They change nothing for English names.
export function isolate(name) {
  return `\u2068${name}\u2069`
}
