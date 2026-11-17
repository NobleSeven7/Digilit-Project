// A green circle with a check mark, shown next to "Delivered and paid" and
// "Journey posted". With animate, the circle pops in and the check mark draws
// itself (see .tick-pop and .tick-draw in src/index.css).
export default function SuccessTick({ animate = false }) {
  return (
    <span aria-hidden="true"
      className={`flex size-9 shrink-0 items-center justify-center rounded-full bg-brand text-white ${animate ? 'tick-pop' : ''}`}>
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor"
        strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
        <path d="M5 12.5l4.5 4.5L19 7.5" pathLength="1" className={animate ? 'tick-draw' : ''} />
      </svg>
    </span>
  )
}
