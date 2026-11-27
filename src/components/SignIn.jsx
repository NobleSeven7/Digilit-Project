// Sign in, or create an account, on the shared RaastaShare server.
// Shown instead of a page when the backend is switched on and nobody is
// signed in (see src/lib/server.js). No email is sent: accounts work at once.
import { useState } from 'react'
import PageHeader from './PageHeader.jsx'
import { createAccount, signIn } from '../lib/server.js'

const MIN_PASSWORD = 8

export default function SignIn() {
  const [mode, setMode] = useState('signin') // 'signin' or 'create'
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [name, setName] = useState('')
  const [role, setRole] = useState('sender')
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)
  const creating = mode === 'create'

  async function handleSubmit(e) {
    e.preventDefault()
    if (!email.includes('@')) return setError('Enter your email address.')
    if (password.length < MIN_PASSWORD) return setError(`Use a password of at least ${MIN_PASSWORD} characters.`)
    if (creating && name.trim().length < 2) return setError('Enter your name, as others will see it.')
    setError('')
    setBusy(true)
    const problem = creating
      ? await createAccount({ email: email.trim(), password, name: name.trim(), role })
      : await signIn(email.trim(), password)
    setBusy(false)
    if (problem) setError(problem)
  }

  function switchMode(next) {
    setMode(next)
    setError('')
  }

  return (
    <div data-testid="sign-in">
      <PageHeader title={creating ? 'Create your account' : 'Sign in'}>
        {creating
          ? 'Senders post parcels; carriers post trips. You can use a different account for each.'
          : 'Sign in to send a parcel, offer space on a trip, or follow a delivery.'}
      </PageHeader>

      <form onSubmit={handleSubmit} noValidate className="card max-w-md space-y-4">
        {creating && (
          <div>
            <label className="label" htmlFor="accountName">Your name</label>
            <input id="accountName" className="field" autoComplete="name" value={name}
              onChange={(e) => setName(e.target.value)} />
          </div>
        )}
        <div>
          <label className="label" htmlFor="accountEmail">Email</label>
          <input id="accountEmail" className="field" type="email" autoComplete="email"
            inputMode="email" value={email} onChange={(e) => setEmail(e.target.value)} />
        </div>
        <div>
          <label className="label" htmlFor="accountPassword">Password</label>
          <input id="accountPassword" className="field" type="password" value={password}
            autoComplete={creating ? 'new-password' : 'current-password'}
            onChange={(e) => setPassword(e.target.value)} />
          {creating && <p className="mt-1 text-sm text-muted">At least {MIN_PASSWORD} characters.</p>}
        </div>

        {creating && (
          <fieldset>
            <legend className="label">I want to</legend>
            {[['sender', 'Send parcels (sender)'], ['carrier', 'Carry parcels on my trips (carrier)']].map(([value, text]) => (
              <label key={value} className="flex min-h-12 cursor-pointer items-center gap-3 rounded-lg px-2 hover:bg-brand-tint">
                <input type="radio" name="accountRole" className="size-5 shrink-0" value={value}
                  checked={role === value} onChange={() => setRole(value)} />
                <span>{text}</span>
              </label>
            ))}
          </fieldset>
        )}

        {error && (
          <p role="alert" data-testid="sign-in-error" className="rounded-lg bg-fail-tint px-3 py-2 font-bold text-fail">{error}</p>
        )}

        <button type="submit" className="btn btn-primary w-full sm:w-auto" disabled={busy} data-testid="sign-in-submit">
          {busy ? 'Please wait…' : creating ? 'Create account' : 'Sign in'}
        </button>
      </form>

      <p className="mt-4">
        {creating ? 'Already have an account? ' : 'New to RaastaShare? '}
        <button type="button" className="font-bold text-brand-ink underline underline-offset-2"
          data-testid="sign-in-switch" onClick={() => switchMode(creating ? 'signin' : 'create')}>
          {creating ? 'Sign in' : 'Create an account'}
        </button>
      </p>
    </div>
  )
}
