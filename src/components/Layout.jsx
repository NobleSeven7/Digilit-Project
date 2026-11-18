// The frame around every page: header with navigation, a bottom tab bar
// on phones, and a footer with the "Reset demo data" button.

import { useState } from 'react'
import { getTheme, saveTheme } from '../lib/theme.js'
import { PROFILES, profileKey, findProfile } from '../lib/profile.js'
import { SunIcon, MoonIcon } from './Icons.jsx'

const NAV_ITEMS = [
  { page: 'sender', label: 'Send' },
  { page: 'carrier', label: 'Carry' },
  { page: 'matches', label: 'Matches' },
  { page: 'delivery', label: 'Delivery' },
  { page: 'admin', label: 'Admin' },
  { page: 'dashboard', label: 'Dashboard' },
]

// The RaastaShare logo: two stops joined by a road.
function Logo() {
  return (
    <a href="#/home" className="flex min-h-11 min-w-0 items-center gap-2 font-display text-xl font-bold text-white sm:text-2xl">
      <svg width="36" height="20" viewBox="0 0 36 20" aria-hidden="true" className="shrink-0">
        <path d="M6 10h24" stroke="white" strokeWidth="3" strokeDasharray="4 3" />
        <circle cx="6" cy="10" r="5" fill="white" />
        <circle cx="30" cy="10" r="5" fill="white" />
      </svg>
      RaastaShare
    </a>
  )
}

// The light / dark switch. It shows the icon of the theme you would switch TO.
function ThemeSwitch() {
  const [theme, setTheme] = useState(getTheme)
  const next = theme === 'dark' ? 'light' : 'dark'

  function handleClick() {
    saveTheme(next)
    setTheme(next)
  }

  return (
    <button type="button" onClick={handleClick} data-testid="theme-switch"
      aria-label={`Switch to ${next} theme`} title={`Switch to ${next} theme`}
      className="flex size-11 shrink-0 cursor-pointer items-center justify-center rounded-lg text-white hover:bg-brand-dark">
      {next === 'dark' ? <MoonIcon size={22} /> : <SunIcon size={22} />}
    </button>
  )
}

// The simulated sign-in: pick which fictional person you are.
function ProfileBar({ profile, setProfile }) {
  return (
    <aside aria-label="Demo profile" className="border-b border-line bg-surface">
      <div className="mx-auto flex max-w-5xl flex-wrap items-center gap-x-3 gap-y-1 safe-x py-2">
        <label htmlFor="profilePicker" className="text-sm font-bold">Signed in as</label>
        <select id="profilePicker" data-testid="profile-picker" value={profileKey(profile)}
          onChange={(e) => setProfile(findProfile(e.target.value))}
          className="min-h-11 rounded-lg border border-muted/60 bg-surface px-2 py-1 font-bold text-brand-ink">
          <optgroup label="Senders">
            {PROFILES.filter((p) => p.role === 'sender').map((p) => (
              <option key={profileKey(p)} value={profileKey(p)}>{p.name} (sender)</option>
            ))}
          </optgroup>
          <optgroup label="Carriers">
            {PROFILES.filter((p) => p.role === 'carrier').map((p) => (
              <option key={profileKey(p)} value={profileKey(p)}>{p.name} (carrier)</option>
            ))}
          </optgroup>
        </select>
        <span className="hidden text-sm text-muted sm:inline">Demo profile. No password, no real account.</span>
      </div>
    </aside>
  )
}

export default function Layout({ currentPage, onReset, profile, setProfile, children }) {
  // Name of the page we are on (shown in the phone header, where there is no top menu).
  const current = NAV_ITEMS.find((item) => item.page === currentPage)

  return (
    <div className="flex min-h-dvh flex-col">
      {/* Header */}
      <header className="bg-brand">
        <div className="mx-auto flex max-w-5xl items-center justify-between gap-2 safe-x py-3 sm:gap-4">
          <Logo />
          {/* Phones: show which page you are on */}
          <div className="flex shrink-0 items-center gap-1 md:order-last">
            {current && (
              <span className="rounded-full bg-surface px-3 py-1 text-sm font-bold text-brand-ink md:hidden">
                {current.label}
              </span>
            )}
            <ThemeSwitch />
          </div>
          {/* Desktop navigation (hidden on phones). The current page is a white tab
              with a short amber bar under its name; the others are plain text. */}
          <nav aria-label="Main" className="hidden gap-1 md:ml-auto md:flex">
            {NAV_ITEMS.map((item) => (
              <a
                key={item.page}
                href={`#/${item.page}`}
                aria-current={currentPage === item.page ? 'page' : undefined}
                className={`relative flex min-h-11 items-center rounded-lg px-3 font-bold ${
                  currentPage === item.page
                    ? 'bg-surface text-brand-ink'
                    : 'text-on-brand-soft hover:bg-brand-dark hover:text-white'
                }`}
              >
                {item.label}
                {currentPage === item.page && (
                  <span aria-hidden="true" className="absolute inset-x-3 bottom-1.5 h-1 rounded-full bg-hold" />
                )}
              </a>
            ))}
          </nav>
        </div>
      </header>

      <ProfileBar profile={profile} setProfile={setProfile} />

      {/* Page content. Extra bottom padding on phones leaves room for the tab bar. */}
      <main className="mx-auto w-full max-w-5xl flex-1 safe-x py-6 sm:py-8">{children}</main>

      {/* Footer */}
      <footer className="border-t border-line pb-[calc(6rem+env(safe-area-inset-bottom))] md:pb-0">
        <div className="mx-auto flex max-w-5xl flex-col gap-3 safe-x py-5 text-sm text-muted sm:flex-row sm:items-center sm:justify-between">
          <p>
            Student prototype. All people and trips are fictional; codes and payments are simulated.
          </p>
          <button type="button" onClick={onReset} data-testid="reset-demo"
            className="btn btn-secondary shrink-0 self-start text-base sm:self-auto">
            Reset demo data
          </button>
        </div>
      </footer>

      {/* Phone navigation: a tab bar fixed to the bottom of the screen. The
          padding keeps the tabs above an iPhone's home bar. */}
      <nav aria-label="Main" className="fixed inset-x-0 bottom-0 z-10 flex overflow-hidden border-t border-line bg-surface md:hidden"
        style={{ paddingBottom: 'env(safe-area-inset-bottom)', paddingLeft: 'env(safe-area-inset-left)', paddingRight: 'env(safe-area-inset-right)' }}>
        {NAV_ITEMS.map((item) => (
          <a
            key={item.page}
            href={`#/${item.page}`}
            aria-current={currentPage === item.page ? 'page' : undefined}
            className={`flex min-h-14 min-w-0 flex-auto items-center justify-center border-t-4 px-1 text-xs font-bold active:bg-brand-tint ${
              currentPage === item.page ? 'border-brand-ink text-brand-ink' : 'border-transparent text-muted'
            }`}
          >
            {item.label}
          </a>
        ))}
      </nav>
    </div>
  )
}
