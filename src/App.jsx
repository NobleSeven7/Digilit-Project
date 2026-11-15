// The top-level component. It owns all the app data and decides which page to show.
import { useState } from 'react'
import { useRoute } from './lib/navigation.js'
import { loadState, saveState, resetState } from './lib/storage.js'
import { getProfile, saveProfile } from './lib/profile.js'
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
  function setProfile(newProfile) {
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
