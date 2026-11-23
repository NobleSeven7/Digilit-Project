// The top-level component. It owns all the app data and decides which page to show.
import { useEffect, useRef, useState } from 'react'
import { useRoute } from './lib/navigation.js'
import { loadState, saveState, resetState } from './lib/storage.js'
import { getProfile, PROFILES, profileKey, saveProfile } from './lib/profile.js'
import posthog, { posthogEnabled } from './lib/posthog.js'
import Layout from './components/Layout.jsx'
import Home from './pages/Home.jsx'
import Sender from './pages/Sender.jsx'
import Carrier from './pages/Carrier.jsx'
import Matches from './pages/Matches.jsx'
import Delivery from './pages/Delivery.jsx'
import Admin from './pages/Admin.jsx'
import Dashboard from './pages/Dashboard.jsx'

export default function App() {
  // "state" holds { shipments, journeys, deliveries }. It is loaded from
  // localStorage once, when the app starts.
  const [state, setState] = useState(loadState)
  const { page, id } = useRoute()

  // Who is "signed in": one of the fictional demo people (see src/lib/profile.js).
  const [profile, setProfileState] = useState(getProfile)
  const identifiedProfile = useRef(null)

  // Demo profiles have no account ids. Their fixed position in the static profile
  // list gives PostHog a stable, opaque id without sending the person's name.
  function distinctIdFor(profileToIdentify) {
    const index = PROFILES.findIndex((candidate) => profileKey(candidate) === profileKey(profileToIdentify))
    return index === -1 ? null : `demo_profile_${index + 1}`
  }

  // Restore identity after a refresh. posthog-js retains it thereafter, so this
  // only runs again when the simulated signed-in person changes.
  useEffect(() => {
    if (!posthogEnabled) return

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

  // Pages call save(newState) whenever something changes.
  // It writes to localStorage AND updates the screen.
  function save(newState) {
    saveState(newState)
    setState(newState)
  }

  // "Reset demo data" button: ask first, then reload the sample data.
  function handleReset() {
    if (window.confirm('Reset demo data? Everything you added will be replaced by the sample data.')) {
      setState(resetState())
      window.location.hash = '/home'
    }
  }

  // Every page receives the same three things: the data, the save function,
  // and the id from the address bar (if there is one).
  const pageProps = { state, save, id, profile, setProfile }
  const pages = {
    home: <Home {...pageProps} />,
    sender: <Sender {...pageProps} />,
    carrier: <Carrier {...pageProps} />,
    matches: <Matches {...pageProps} />,
    delivery: <Delivery {...pageProps} />,
    admin: <Admin {...pageProps} />,
    dashboard: <Dashboard {...pageProps} />,
  }

  return (
    <Layout currentPage={page} onReset={handleReset} profile={profile} setProfile={setProfile}>
      {pages[page] || <Home {...pageProps} />}
    </Layout>
  )
}
