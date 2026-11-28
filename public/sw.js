// The service worker: a small script the browser keeps for this site, so
// RaastaShare can be installed on a phone's home screen and still opens
// without internet. It only stores the app's own files (pages, code, fonts,
// icons) on this device; it never stores or sends anything you type.
//
// How it chooses:
//   * Pages: try the internet first (so you always get the newest version),
//     and use the saved copy only when offline.
//   * Code and fonts (the "assets" folder): their names change with every
//     new version, so a saved copy is always correct and is used first.
//   * Anything from another site (Supabase, Make.com, PostHog) is left alone.

const CACHE = 'raastashare-v1'
const START = ['./', './offline.html', './manifest.webmanifest', './icon-192.png']

self.addEventListener('install', (event) => {
  event.waitUntil(caches.open(CACHE).then((cache) => cache.addAll(START)).then(() => self.skipWaiting()))
})

// A new version: remove files saved by older versions of this script.
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((key) => key !== CACHE).map((key) => caches.delete(key))))
      .then(() => self.clients.claim()),
  )
})

async function pageFirstFromInternet(request) {
  const cache = await caches.open(CACHE)
  try {
    const response = await fetch(request)
    if (response.ok) cache.put('./', response.clone())
    return response
  } catch {
    return (await cache.match('./')) || (await cache.match('./offline.html'))
  }
}

async function savedCopyFirst(request) {
  const cache = await caches.open(CACHE)
  const saved = await cache.match(request)
  if (saved) return saved
  const response = await fetch(request)
  if (response.ok) cache.put(request, response.clone())
  return response
}

async function internetThenSaved(request) {
  const cache = await caches.open(CACHE)
  try {
    const response = await fetch(request)
    if (response.ok) cache.put(request, response.clone())
    return response
  } catch {
    const saved = await cache.match(request)
    if (saved) return saved
    throw new Error('offline')
  }
}

self.addEventListener('fetch', (event) => {
  const { request } = event
  if (request.method !== 'GET') return
  const url = new URL(request.url)
  if (url.origin !== self.location.origin) return

  if (request.mode === 'navigate') event.respondWith(pageFirstFromInternet(request))
  else if (url.pathname.includes('/assets/')) event.respondWith(savedCopyFirst(request))
  else event.respondWith(internetThenSaved(request))
})
