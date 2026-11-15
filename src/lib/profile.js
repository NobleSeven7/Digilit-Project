// The simulated sign-in. There are no passwords and no real accounts: you
// simply pick one of the fictional demo people, and the app behaves as if
// that person were signed in. The choice is remembered in this browser.
import { DEMO_SENDERS, DEMO_CARRIERS } from '../data/constants.js'

const KEY = 'raastashare-profile'

// Every demo person, each with a role ("sender" or "carrier").
export const PROFILES = [
  ...DEMO_SENDERS.map((name) => ({ role: 'sender', name })),
  ...DEMO_CARRIERS.map((name) => ({ role: 'carrier', name })),
]

// A profile is stored as text like "sender:Ayesha Khan".
export const profileKey = (profile) => `${profile.role}:${profile.name}`
export const findProfile = (key) => PROFILES.find((p) => profileKey(p) === key)

// The profile to start with: the saved one, or else the first sender.
export function getProfile() {
  try {
    return findProfile(localStorage.getItem(KEY)) || PROFILES[0]
  } catch {
    return PROFILES[0]
  }
}

export function saveProfile(profile) {
  try {
    localStorage.setItem(KEY, profileKey(profile))
  } catch {
    // still used for this visit
  }
}

// The first demo person with a given role (used by "switch to a sender").
export const firstWithRole = (role) => PROFILES.find((p) => p.role === role)
