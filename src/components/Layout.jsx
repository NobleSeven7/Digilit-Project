// The frame around every page: header with navigation, a bottom tab bar
// on phones, and a footer with the "Reset demo data" button.

import { useState } from 'react'
import { getTheme, saveTheme } from '../lib/theme.js'
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
    <a href="#/home" className="flex items-center gap-2 font-display text-xl font-bold text-white">
      <svg width="36" height="20" viewBox="0 0 36 20" aria-hidden="true">
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
      className="flex size-10 shrink-0 cursor-pointer items-center justify-center rounded-lg text-white hover:bg-brand-dark">
      {next === 'dark' ? <MoonIcon size={22} /> : <SunIcon size={22} />}
    </button>
  )
}

export default function Layout({ currentPage, onReset, children }) {
  // Name of the page we are on (shown in the phone header, where there is no top menu).
  const current = NAV_ITEMS.find((item) => item.page === currentPage)

  return (
    <div className="flex min-h-screen flex-col">
      {/* Header */}
      <header className="bg-brand">
        <div className="mx-auto flex max-w-5xl items-center justify-between gap-4 px-4 py-3">
          <Logo />
          {/* Phones: show which page you are on */}
          <div className="flex items-center gap-2 md:order-last">
            {current && (
              <span className="rounded-full bg-surface px-3 py-1 text-sm font-bold text-brand-ink md:hidden">
                {current.label}
              </span>
            )}
            <ThemeSwitch />
          </div>
          {/* Desktop navigation (hidden on phones). The current page is a white tab
              with an amber underline; the others are plain white text. */}
          <nav aria-label="Main" className="hidden gap-1 md:ml-auto md:flex">
            {NAV_ITEMS.map((item) => (
              <a
                key={item.page}
                href={`#/${item.page}`}
                aria-current={currentPage === item.page ? 'page' : undefined}
                className={`rounded-lg border-b-4 px-3 py-1.5 font-bold ${
                  currentPage === item.page
                    ? 'border-hold bg-surface text-brand-ink'
                    : 'border-transparent text-white/85 hover:bg-brand-dark hover:text-white'
                }`}
              >
                {item.label}
              </a>
            ))}
          </nav>
        </div>
      </header>

      {/* Page content. Extra bottom padding on phones leaves room for the tab bar. */}
      <main className="mx-auto w-full max-w-5xl flex-1 px-4 py-6 sm:py-8">{children}</main>

      {/* Footer */}
      <footer className="border-t border-line pb-24 md:pb-0">
        <div className="mx-auto flex max-w-5xl flex-col gap-3 px-4 py-5 text-sm text-muted sm:flex-row sm:items-center sm:justify-between">
          <p>
            Student prototype. All people and trips are fictional; codes and payments are simulated.
          </p>
          <button type="button" onClick={onReset} data-testid="reset-demo"
            className="btn btn-secondary shrink-0 self-start text-base sm:self-auto">
            Reset demo data
          </button>
        </div>
      </footer>

      {/* Phone navigation: a tab bar fixed to the bottom of the screen */}
      <nav aria-label="Main" className="fixed inset-x-0 bottom-0 z-10 flex border-t border-line bg-surface md:hidden">
        {NAV_ITEMS.map((item) => (
          <a
            key={item.page}
            href={`#/${item.page}`}
            aria-current={currentPage === item.page ? 'page' : undefined}
            className={`flex min-h-14 flex-1 items-center justify-center border-t-4 text-xs font-bold ${
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
