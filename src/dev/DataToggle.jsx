// Dev-only switch for the break-ui test: Demo data / Worst case / Empty / One.
// The choice lives in the address bar (?data=…), so a reload keeps it.
// Plain chrome, not part of the design under test. Never shipped: Home only
// renders it when import.meta.env.DEV.
const STATES = [['', 'Demo data'], ['worst', 'Worst case'], ['empty', 'Empty'], ['one', 'One route']]

export default function DataToggle({ current }) {
  return (
    <div style={{
      position: 'fixed', left: '50%', bottom: 'calc(5rem + env(safe-area-inset-bottom))', transform: 'translateX(-50%)',
      zIndex: 50, display: 'flex', gap: 2, padding: 3, borderRadius: 999, background: '#e5e5e5',
      font: '12px system-ui, sans-serif', boxShadow: '0 1px 3px rgb(0 0 0 / 0.2)',
    }}>
      {STATES.map(([value, label]) => (
        <a key={label} href={`${value ? `?data=${value}` : '?'}${window.location.hash}`}
          style={{
            padding: '6px 10px', borderRadius: 999, color: '#111', textDecoration: 'none', whiteSpace: 'nowrap',
            background: (current || '') === value ? '#fff' : 'transparent',
          }}>
          {label}
        </a>
      ))}
    </div>
  )
}
