// The frame around every page: header with navigation, a bottom tab bar
// on phones, and a footer with the "Reset demo data" button.

import { useEffect, useRef, useState } from 'react'
import { getTheme, saveTheme } from '../lib/theme.js'
import { PROFILES, profileKey, findProfile } from '../lib/profile.js'
import { PROHIBITED } from '../data/constants.js'
import { SunIcon, MoonIcon, ParcelIcon, CarIcon, RankIcon, RouteIcon, ShieldIcon, BarsIcon } from './Icons.jsx'
import { withViewTransition, useHideOnScroll } from '../lib/motion.js'

// "for" says who sees the page in the menu: a sender, a carrier, both, or the
// team (Admin and Dashboard, set apart after a divider). Every page still opens
// from a link whoever you are; the menu just shows what your role needs.
const NAV_ITEMS = [
  { page: 'sender', label: 'Send', for: 'sender', Icon: ParcelIcon },
  { page: 'carrier', label: 'Carry', for: 'carrier', Icon: CarIcon },
  { page: 'matches', label: 'Matches', for: 'sender', Icon: RankIcon },
  { page: 'delivery', label: 'Delivery', for: 'both', Icon: RouteIcon },
  { page: 'admin', label: 'Admin', for: 'team', Icon: ShieldIcon },
  { page: 'dashboard', label: 'Dashboard', for: 'team', Icon: BarsIcon },
]

// The menu for one role: its own pages first, then the team pages.
function menuFor(role) {
  return {
    own: NAV_ITEMS.filter((item) => item.for === role || item.for === 'both'),
    team: NAV_ITEMS.filter((item) => item.for === 'team'),
  }
}

// The RaastaShare logo: two stops joined by a road.
function Logo() {
  return (
    <a href="#/home" className="flex min-h-11 min-w-0 items-center gap-2 font-display text-xl font-bold text-white active:opacity-80 sm:text-2xl">
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

  // The colours cross-fade instead of flipping in one frame (an abrupt jump
  // from light to dark is hard on the eyes). Reduced motion: instant.
  function handleClick() {
    withViewTransition(() => {
      saveTheme(next)
      setTheme(next)
    }, 'theme')
  }

  return (
    <button type="button" onClick={handleClick} data-testid="theme-switch"
      aria-label={`Switch to ${next} theme`} title={`Switch to ${next} theme`}
      className="flex size-11 shrink-0 cursor-pointer items-center justify-center rounded-lg text-white hover:bg-brand-dark active:bg-brand-dark">
      {next === 'dark' ? <MoonIcon size={22} /> : <SunIcon size={22} />}
    </button>
  )
}

// The simulated sign-in: pick which fictional person you are.
function ProfileBar({ profile, setProfile }) {
  return (
    <aside aria-label="Demo profile" className="border-b border-line bg-surface">
      <div className="mx-auto flex max-w-5xl flex-wrap items-center gap-x-3 gap-y-1 safe-x py-2">
        {/* The picker is never wider than the screen (max-w-full): with very
            large text the longest name would otherwise push the page sideways. */}
        <label htmlFor="profilePicker" className="text-sm font-bold">Signed in as</label>
        <select id="profilePicker" data-testid="profile-picker" value={profileKey(profile)}
          onChange={(e) => setProfile(findProfile(e.target.value))}
          className="min-h-11 min-w-0 max-w-full rounded-lg border border-muted/60 bg-surface px-2 py-1 font-bold text-brand-ink">
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
        {/* Which side of the service you are looking at, so an audience can follow along */}
        {/* Phones: hidden, as the picker already says "(sender)" or "(carrier)";
            the bar then fits on one line */}
        <span className="ml-auto hidden font-display text-xl font-bold text-brand-ink sm:inline" data-testid="role-view">
          {profile.role === 'carrier' ? 'Carrier view' : 'Sender view'}
        </span>
      </div>
    </aside>
  )
}

// The browser tab's title for each page, so the tab (and a screen reader)
// says where you are.
const TITLES = { home: 'RaastaShare', about: 'About this demo · RaastaShare' }
function titleFor(page) {
  const item = NAV_ITEMS.find((i) => i.page === page)
  return TITLES[page] ?? (item ? `${item.label} · RaastaShare` : 'RaastaShare')
}

// Move keyboard and screen-reader focus to the page's heading. Screen
// readers then read the new page's name, as they would after a full page load.
function focusHeading() {
  const heading = document.querySelector('main h1')
  if (!heading) return
  heading.setAttribute('tabindex', '-1')
  heading.focus({ preventScroll: true })
}

export default function Layout({ currentPage, onReset, profile, setProfile, saveFailed, children }) {
  // After a page change (not on the first load): new title, focus on its heading.
  const firstPage = useRef(true)
  useEffect(() => {
    document.title = titleFor(currentPage)
    if (firstPage.current) { firstPage.current = false; return }
    focusHeading()
  }, [currentPage])

  // Name of the page we are on (shown in the phone header, where there is no top menu).
  const current = NAV_ITEMS.find((item) => item.page === currentPage)
  const menu = menuFor(profile.role)
  // Phones: the header slides away while scrolling down (see .site-header).
  const headerHidden = useHideOnScroll()

  return (
    <div className="flex min-h-dvh flex-col">
      {/* Keyboard users: skip the header and menu. Hidden until it has focus.
          A button, not a "#main" link, because the address hash is the page. */}
      <button type="button" onClick={focusHeading}
        className="skip-link btn btn-primary">
        Skip to content
      </button>
      {/* Header (on phones it stays at the top and hides while scrolling down) */}
      <header className="site-header bg-brand" data-hidden={headerHidden}>
        {/* flex-wrap: if the menu does not fit beside the logo (very large text
            on a tablet), it moves onto its own line instead of pushing the
            page sideways. At normal sizes everything fits on one line. */}
        <div className="mx-auto flex max-w-5xl flex-wrap items-center justify-between gap-x-2 gap-y-2 safe-x py-3 sm:gap-x-4">
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
          <nav aria-label="Main" className="hidden flex-wrap items-center gap-1 md:ml-auto md:flex">
            {[...menu.own, ...menu.team].map((item, index) => (
              <a
                key={item.page}
                href={`#/${item.page}`}
                aria-current={currentPage === item.page ? 'page' : undefined}
                className={`relative flex min-h-11 items-center rounded-lg px-3 font-bold ${
                  index === menu.own.length ? 'ml-3 before:absolute before:-left-2 before:h-6 before:w-px before:bg-white/35' : ''} ${
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

      {/* The browser would not save: say so, instead of losing changes silently */}
      {saveFailed && (
        <p role="status" data-testid="save-failed" className="border-b border-hold bg-hold-tint">
          <span className="mx-auto block max-w-5xl safe-x py-2 font-bold">
            This browser is not letting RaastaShare save. You can keep using the demo, but your
            changes will be lost when you reload or close this page.
          </span>
        </p>
      )}

      {/* Page content. Extra bottom padding on phones leaves room for the tab bar. */}
      <main className="mx-auto w-full max-w-5xl flex-1 safe-x py-6 sm:py-8">{children}</main>

      {/* Footer */}
      <footer className="border-t border-line pb-[calc(6rem+env(safe-area-inset-bottom))] md:pb-0">
        <div className="mx-auto flex max-w-5xl flex-col gap-3 safe-x py-5 text-sm text-muted sm:flex-row sm:items-center sm:justify-between">
          <div className="space-y-1">
            {/* What-you-can-send note, always visible. Every route is within
                Pakistan, so it speaks to what is allowed rather than customs.
                It opens to the same list senders tick on the Send page. */}
            <details className="rule-details" data-testid="customs-note">
              <summary className="inline-flex min-h-11 cursor-pointer items-center font-bold text-ink underline underline-offset-2">
                Check what you&rsquo;re allowed to send
              </summary>
              <ul className="mb-2 list-disc space-y-1 pl-5">
                {PROHIBITED.map((line) => <li key={line}>{line}</li>)}
              </ul>
            </details>
            <p>
              Student prototype. All people and trips are fictional; codes and payments are simulated.{' '}
              <a href="#/about" data-testid="about-link" className="font-bold text-brand-ink underline underline-offset-2">About this demo</a>
            </p>
          </div>
          <button type="button" onClick={onReset} data-testid="reset-demo"
            className="btn btn-secondary shrink-0 self-start text-base sm:self-auto">
            Reset demo data
          </button>
        </div>
      </footer>

      {/* Phone navigation: a tab bar fixed to the bottom of the screen. The
          padding keeps the tabs above an iPhone's home bar. */}
      <nav aria-label="Main" className="tabbar fixed inset-x-0 bottom-0 z-10 flex border-t border-line bg-surface [overflow-x:clip] md:hidden"
        style={{ paddingBottom: 'env(safe-area-inset-bottom)', paddingLeft: 'env(safe-area-inset-left)', paddingRight: 'env(safe-area-inset-right)' }}>
        {[...menu.own, ...menu.team].map((item, index) => (
          <a
            key={item.page}
            href={`#/${item.page}`}
            aria-current={currentPage === item.page ? 'page' : undefined}
            className={`flex min-h-14 min-w-0 flex-auto flex-col items-center justify-center gap-0.5 border-t-4 px-1 pb-1 text-xs font-bold active:bg-brand-tint ${
              index === menu.own.length ? 'shadow-[inset_1px_0_0_var(--color-line)]' : ''} ${
              currentPage === item.page ? 'border-brand-ink text-brand-ink' : 'border-transparent text-muted'
            }`}
          >
            {/* Icon and label together: quicker to find than a word alone */}
            <item.Icon size={22} />
            {item.label}
          </a>
        ))}
      </nav>
    </div>
  )
}
