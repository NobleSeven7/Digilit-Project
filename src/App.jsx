// The top-level component. It owns all the app data and decides which page to show.
import { useCallback, useEffect, useRef, useState } from 'react'
import { useRoute } from './lib/navigation.js'
import { loadState, saveState, resetState, canSave, readSavedState, STORAGE_KEY } from './lib/storage.js'
import { getProfile, PROFILES, profileKey, saveProfile } from './lib/profile.js'
import posthog, { posthogEnabled } from './lib/posthog.js'
import { serverEnabled, currentProfile, onAccountChange, loadServerState, pushChanges, signOut, watchChanges } from './lib/server.js'
import Layout from './components/Layout.jsx'
import SignIn from './components/SignIn.jsx'
import Home from './pages/Home.jsx'
import Sender from './pages/Sender.jsx'
import Carrier from './pages/Carrier.jsx'
import Matches from './pages/Matches.jsx'
import Delivery from './pages/Delivery.jsx'
import Admin from './pages/Admin.jsx'
import Dashboard from './pages/Dashboard.jsx'
import About from './pages/About.jsx'
import History from './pages/History.jsx'

// Nothing loaded yet (shared backend, before the first load).
const EMPTY = { shipments: [], journeys: [], deliveries: [], messages: [], ratings: [] }

// Pages anyone can open without an account when the shared backend is on.
const OPEN_PAGES = ['home', 'about']

export default function App() {
  // "state" holds { shipments, journeys, deliveries, messages, ratings }. Without the shared
  // backend it is loaded from localStorage once, when the app starts. With it
  // (src/lib/server.js) it comes from the server after signing in.
  const [state, setState] = useState(serverEnabled ? EMPTY : loadState)
  // True when the browser will not save (storage full or blocked). The app
  // still works for this visit; a notice says changes will not be kept.
  const [saveFailed, setSaveFailed] = useState(() => !serverEnabled && !canSave())
  // Shared backend only: a sentence when loading or saving went wrong.
  const [serverProblem, setServerProblem] = useState('')
  const { page, id } = useRoute()

  // Who is signed in. Without the backend: one of the fictional demo people
  // (see src/lib/profile.js). With it: the real account, or null when signed
  // out (undefined while the app is still checking).
  const [profile, setProfileState] = useState(serverEnabled ? undefined : getProfile)
  const identifiedProfile = useRef(null)
  // Shared backend: the data as the server last had it, so a save sends only
  // what changed since.
  const serverCopy = useRef(EMPTY)

  // Demo profiles have no account ids. Their fixed position in the static profile
  // list gives PostHog a stable, opaque id without sending the person's name.
  function distinctIdFor(profileToIdentify) {
    const index = PROFILES.findIndex((candidate) => profileKey(candidate) === profileKey(profileToIdentify))
    return index === -1 ? null : `demo_profile_${index + 1}`
  }

  // Restore identity after a refresh. posthog-js retains it thereafter, so this
  // only runs again when the simulated signed-in person changes.
  useEffect(() => {
    // Real accounts are not linked to analytics, only the demo profiles are.
    if (!posthogEnabled || serverEnabled || !profile) return

    const distinctId = distinctIdFor(profile)
    if (!distinctId || identifiedProfile.current === distinctId) return

    posthog.identify(distinctId, { role: profile.role, is_demo_profile: true })
    identifiedProfile.current = distinctId
  }, [profile])

  function setProfile(newProfile) {
    if (profileKey(newProfile) !== profileKey(profile)) {
      // Switching directly between accounts must not retain the prior person's
      // analytics state. The effect above identifies the newly selected profile.
      if (posthogEnabled) posthog.reset()
      identifiedProfile.current = null
    }
    saveProfile(newProfile)
    setProfileState(newProfile)
  }

  // Shared backend: fetch the latest data (after signing in, and whenever
  // the person comes back to this tab, so other people's changes show up).
  // After a refused save the notice stays up (keepNotice), so it is not lost.
  // A save made while a refresh is on its way wins: that refresh is dropped.
  const saveCount = useRef(0)
  const refresh = useCallback(async (keepNotice = false) => {
    const startedAt = saveCount.current
    try {
      const fresh = await loadServerState()
      if (saveCount.current !== startedAt) return
      serverCopy.current = fresh
      setState(fresh)
      if (!keepNotice) setServerProblem('')
    } catch (error) {
      setServerProblem(error.message)
    }
  }, [])

  // Shared backend: who is signed in, now and after any sign-in or sign-out.
  useEffect(() => {
    if (!serverEnabled) return undefined
    let stopListening = () => {}
    let cancelled = false
    async function checkAccount() {
      const account = await currentProfile()
      if (cancelled) return
      setProfileState(account)
      if (account) {
        refresh(false)
      } else {
        serverCopy.current = EMPTY
        setState(EMPTY)
      }
    }
    checkAccount()
    onAccountChange(checkAccount).then((stop) => { stopListening = stop })
    const onVisible = () => {
      if (document.visibilityState === 'visible') checkAccount()
    }
    document.addEventListener('visibilitychange', onVisible)
    return () => {
      cancelled = true
      stopListening()
      document.removeEventListener('visibilitychange', onVisible)
    }
  }, [refresh])

  // Live updates. Shared backend: when anyone changes something this person
  // may see, load the latest at once, so nobody has to refresh. (A notice
  // about a refused save stays up.) Without the backend: when another tab
  // of this browser saves (the demo open as sender in one tab and as
  // carrier in another), show its data here too.
  const signedInId = profile?.id
  useEffect(() => {
    if (!serverEnabled || !signedInId) return undefined
    let stop = () => {}
    let cancelled = false
    watchChanges(() => refresh(true)).then((stopWatching) => {
      if (cancelled) stopWatching()
      else stop = stopWatching
    })
    return () => { cancelled = true; stop() }
  }, [signedInId, refresh])

  useEffect(() => {
    if (serverEnabled) return undefined
    function onStorage(e) {
      if (e.key !== STORAGE_KEY) return
      const fresh = readSavedState(e.newValue)
      if (fresh) setState(fresh)
    }
    window.addEventListener('storage', onStorage)
    return () => window.removeEventListener('storage', onStorage)
  }, [])

  // Pages call save(newState) whenever something changes. It updates the
  // screen at once, and writes to localStorage, or (shared backend) sends
  // the changes to the server. If the server refuses, the latest server data
  // is loaded again and a notice says the change was not kept.
  function save(newState) {
    setState(newState)
    if (!serverEnabled) {
      setSaveFailed(!saveState(newState))
      return
    }
    const before = serverCopy.current
    serverCopy.current = newState
    const count = ++saveCount.current
    pushChanges(before, newState).then((problem) => {
      if (problem) setServerProblem(problem)
      else setServerProblem('')
      // Load what the server made of it (for example new codes), unless
      // another save has started since.
      if (saveCount.current === count) refresh(Boolean(problem))
    })
  }

  // "Reset demo data" button: ask first, then reload the sample data.
  function handleReset() {
    if (window.confirm('Reset demo data? Everything you added will be replaced by the sample data.')) {
      setState(resetState())
      window.location.hash = '/home'
    }
  }

  // Every page receives the same things: the data, the save function, the
  // id from the address bar (if there is one) and who is signed in. With real
  // accounts there is no switching to another person, so setProfile is null.
  const pageProps = {
    state, save, id, profile,
    setProfile: serverEnabled ? null : setProfile,
    // Shared backend: load the latest data now (after a code is checked).
    reload: serverEnabled ? () => refresh(false) : null,
  }
  const pages = {
    home: <Home {...pageProps} />,
    sender: <Sender {...pageProps} />,
    carrier: <Carrier {...pageProps} />,
    matches: <Matches {...pageProps} />,
    delivery: <Delivery {...pageProps} />,
    admin: <Admin {...pageProps} />,
    dashboard: <Dashboard {...pageProps} />,
    history: <History {...pageProps} />,
    about: <About />,
  }

  // Shared backend: pages other than Home and About need an account.
  const needsAccount = serverEnabled && !profile && !OPEN_PAGES.includes(page in pages ? page : 'home')
  let content = pages[page] || <Home {...pageProps} />
  if (needsAccount) content = profile === undefined ? <p className="text-muted">Loading…</p> : <SignIn />

  return (
    <Layout currentPage={page} profile={profile} saveFailed={saveFailed} serverProblem={serverProblem}
      onReset={serverEnabled ? null : handleReset}
      setProfile={serverEnabled ? null : setProfile}
      onSignOut={serverEnabled ? signOut : null}>
      {content}
    </Layout>
  )
}
