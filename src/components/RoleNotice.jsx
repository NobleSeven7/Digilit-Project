// Shown when the signed-in demo person has the wrong role for a page,
// e.g. a carrier opening the Send page. One button switches profile (demo
// profiles only; a real account is told to sign in with the other role).
import { firstWithRole } from '../lib/profile.js'

export default function RoleNotice({ profile, setProfile, needs, action }) {
  const other = firstWithRole(needs)
  return (
    <div className="card border-hold bg-hold-tint" data-testid="role-notice">
      <p className="font-bold">
        You are signed in as {profile.name}, a {profile.role}. Only a {needs} can {action}.
      </p>
      {/* Real accounts (shared backend) cannot switch: sign in with a {needs} account instead */}
      {/* The button names the role, so it stays on one line on small phones;
          who you become is said beside it. */}
      {setProfile ? (
        <div className="mt-3 flex flex-wrap items-center gap-x-3 gap-y-2">
          <button type="button" className="btn btn-primary" data-testid="switch-role"
            onClick={() => setProfile(other)}>
            Switch to a {needs}
          </button>
          <p className="text-sm">You&rsquo;ll be <strong>{other.name}</strong>, a demo {needs}.</p>
        </div>
      ) : (
        <p className="mt-2">To {action}, sign out and sign in with a {needs} account.</p>
      )}
    </div>
  )
}
