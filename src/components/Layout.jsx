// The frame around every page: header with navigation, a bottom tab bar
// on phones, and a footer with the "Reset demo data" button.

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

export default function Layout({ currentPage, onReset, children }) {
  return (
    <div className="flex min-h-screen flex-col">
      {/* Header */}
      <header className="bg-brand">
        <div className="mx-auto flex max-w-5xl items-center justify-between gap-4 px-4 py-3">
          <Logo />
          {/* Desktop navigation (hidden on phones) */}
          <nav aria-label="Main" className="hidden gap-1 md:flex">
            {NAV_ITEMS.map((item) => (
              <a
                key={item.page}
                href={`#/${item.page}`}
                aria-current={currentPage === item.page ? 'page' : undefined}
                className={`rounded-lg px-3 py-2 font-bold ${
                  currentPage === item.page ? 'bg-white text-brand' : 'text-white hover:bg-brand-dark'
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
      <nav aria-label="Main" className="fixed inset-x-0 bottom-0 z-10 flex border-t border-line bg-white md:hidden">
        {NAV_ITEMS.map((item) => (
          <a
            key={item.page}
            href={`#/${item.page}`}
            aria-current={currentPage === item.page ? 'page' : undefined}
            className={`flex min-h-14 flex-1 items-center justify-center border-t-4 text-xs font-bold ${
              currentPage === item.page ? 'border-brand text-brand' : 'border-transparent text-muted'
            }`}
          >
            {item.label}
          </a>
        ))}
      </nav>
    </div>
  )
}
