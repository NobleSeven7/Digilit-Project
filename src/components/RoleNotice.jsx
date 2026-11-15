// Shown when the signed-in demo person has the wrong role for a page,
// e.g. a carrier opening the Send page. One button switches profile.
import { firstWithRole } from '../lib/profile.js'

export default function RoleNotice({ profile, setProfile, needs, action }) {
  const other = firstWithRole(needs)
  return (
    <div className="card border-hold bg-hold-tint" data-testid="role-notice">
      <p className="font-bold">
        You are signed in as {profile.name}, a {profile.role}. Only a {needs} can {action}.
      </p>
      <button type="button" className="btn btn-primary mt-3" data-testid="switch-role"
        onClick={() => setProfile(other)}>
        Switch to {other.name} ({needs})
      </button>
    </div>
  )
}
