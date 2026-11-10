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
