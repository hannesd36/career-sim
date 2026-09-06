// A season away from wifi should still be a season you can play. This is a
// runtime cache, not a build-time precache list: hashed filenames change every
// release, so there is no fixed manifest to keep in sync here. Instead, every
// GET that succeeds is cached as it is made, so a full page load online is
// enough to make the next one work offline.
const CACHE = 'career-sim-v1'
const SHELL = ['./', './index.html']

self.addEventListener('install', (event) => {
  event.waitUntil(caches.open(CACHE).then((cache) => cache.addAll(SHELL)))
  self.skipWaiting()
})

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.filter((key) => key !== CACHE).map((key) => caches.delete(key))))
      .then(() => self.clients.claim()),
  )
})

// Stale while revalidate: whatever is cached answers immediately, and the
// network response quietly replaces it for next time. A visit with no network
// at all falls back to the cache alone.
self.addEventListener('fetch', (event) => {
  if (event.request.method !== 'GET') return

  event.respondWith(
    caches.match(event.request).then((cached) => {
      const network = fetch(event.request)
        .then((response) => {
          if (response.ok) {
            const copy = response.clone()
            caches.open(CACHE).then((cache) => cache.put(event.request, copy))
          }
          return response
        })
        .catch(() => cached)
      return cached ?? network
    }),
  )
})
