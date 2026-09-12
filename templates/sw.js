const CACHE = 'jsd-cache-v{{ asset_version }}';
const PRECACHE = [
  '/',
  '/credits',
  '/jj-hub',
  '/leaderboard',
  '{{ asset_url("manifest.webmanifest") }}',
  '{{ asset_url("branding/logo-horizontal.webp") }}',
  '{{ asset_url("branding/logo-mark-192.png") }}',
  '{{ asset_url("icons/icon-192.png") }}',
  '{{ asset_url("icons/icon-512.png") }}',
  '{{ asset_url("js/core.js") }}',
  '{{ asset_url("js/flow.js") }}',
  '{{ asset_url("js/i18n.js") }}',
  '{{ asset_url("js/session.js") }}',
];

self.addEventListener('install', (event) => {
  self.skipWaiting();
  event.waitUntil(
    caches.open(CACHE).then((cache) => cache.addAll(PRECACHE).catch(() => undefined)),
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.filter((key) => key !== CACHE).map((key) => caches.delete(key))))
      .then(() => self.clients.claim()),
  );
});

self.addEventListener('fetch', (event) => {
  if (event.request.method !== 'GET') return;
  const url = new URL(event.request.url);
  if (url.origin !== self.location.origin || url.pathname.startsWith('/api/')) return;

  event.respondWith(
    caches.match(event.request).then((cached) => {
      const network = fetch(event.request).then((response) => {
        if (response.ok) {
          const copy = response.clone();
          caches.open(CACHE).then((cache) => cache.put(event.request, copy));
        }
        return response;
      });
      return cached || network.catch(() => caches.match(event.request));
    }),
  );
});
