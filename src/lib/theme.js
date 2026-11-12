// Light / dark theme.
// By default the app follows the device: dark if the phone or computer is in
// dark mode, light otherwise. The switch in the header overrides that, and
// the choice is remembered in this browser.
//
// The theme is applied by setting <html data-theme="light"> or "dark".
// The colours for each theme live in src/index.css.

const KEY = 'raastashare-theme'

// The theme to use right now: the saved choice, or else the device setting.
export function getTheme() {
  try {
    const saved = localStorage.getItem(KEY)
    if (saved === 'light' || saved === 'dark') return saved
  } catch {
    // localStorage can be blocked; fall through to the device setting
  }
  return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'
}

// Show a theme on the page (without saving it).
export function applyTheme(theme) {
  document.documentElement.dataset.theme = theme
}

// Save the user's choice and show it.
export function saveTheme(theme) {
  try {
    localStorage.setItem(KEY, theme)
  } catch {
    // still apply it for this visit
  }
  applyTheme(theme)
}
