// Small line icons drawn as SVG (no icon library needed).
// They use "currentColor", so they take the colour of the text around them.

function Svg({ children, size = 24 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor"
      strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      {children}
    </svg>
  )
}

// A wheel with a white centre, so it sits cleanly over the vehicle outline.
const Wheel = ({ x, y, r = 2 }) => <circle cx={x} cy={y} r={r} fill="white" />

export function ParcelIcon(props) {
  return (
    <Svg {...props}>
      <path d="M3 7.5 12 3l9 4.5v9L12 21l-9-4.5z" />
      <path d="M3 7.5 12 12l9-4.5M12 12v9M7.5 5.2l9 4.5" />
    </Svg>
  )
}

export function CarIcon(props) {
  return (
    <Svg {...props}>
      <path d="M5 11l1.6-4.2A2 2 0 0 1 8.5 5.5h7a2 2 0 0 1 1.9 1.3L19 11" />
      <rect x="3" y="11" width="18" height="5" rx="1.5" />
      <Wheel x="7.5" y="16.5" />
      <Wheel x="16.5" y="16.5" />
    </Svg>
  )
}

export function VanIcon(props) {
  return (
    <Svg {...props}>
      <path d="M2.5 6.5h11v9.5h-11z" />
      <path d="M13.5 9.5h4l3 3.5v3h-7z" />
      <Wheel x="6.5" y="16.5" />
      <Wheel x="17" y="16.5" />
    </Svg>
  )
}

export function BusIcon(props) {
  return (
    <Svg {...props}>
      <rect x="3.5" y="3.5" width="17" height="13" rx="2" />
      <path d="M3.5 10h17M9 3.5V10M15 3.5V10" />
      <Wheel x="7.5" y="17.5" r="1.8" />
      <Wheel x="16.5" y="17.5" r="1.8" />
    </Svg>
  )
}

export function MotorbikeIcon(props) {
  return (
    <Svg {...props}>
      <circle cx="5.5" cy="15.5" r="3" />
      <circle cx="18.5" cy="15.5" r="3" />
      <path d="M5.5 15.5 9.5 10h5l4 5.5M14.5 10l-1.2-3.5h3" />
    </Svg>
  )
}

// Pick the right icon for a vehicle type from the compatibility table.
export function VehicleIcon({ type, ...props }) {
  if (type === 'Motorbike') return <MotorbikeIcon {...props} />
  if (type === 'Bus traveller (luggage)') return <BusIcon {...props} />
  if (type === 'Van / Pickup') return <VanIcon {...props} />
  return <CarIcon {...props} />
}
