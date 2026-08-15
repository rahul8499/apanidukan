// Minimal service worker registration script placeholder.
// In production, use Workbox or a proper service worker for caching and offline.
self.addEventListener('install', (event: any) => {
  // @ts-ignore
  self.skipWaiting()
})

self.addEventListener('activate', (event: any) => {
  // @ts-ignore
  self.clients.claim()
})

self.addEventListener('fetch', (event: any) => {
  // network-first strategy placeholder
})
