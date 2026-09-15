const CACHE = 'jsd-cache-v{{ asset_version }}';
const PRECACHE = [
  '/credits',
  '/jj-hub',
  '/leaderboard',
  '{{ asset_url("manifest.webmanifest") }}',
  '{{ asset_url("branding/logo-horizontal.webp") }}',
  '{{ asset_url("branding/logo-mark-192.png") }}',
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

  // HTML contains the login state and CSRF data. Never place a navigation in
  // Cache Storage: an anonymous home page must not reappear after login, nor
  // an authenticated one after logout.
  if (event.request.mode === 'navigate' || url.searchParams.has('admin_preview')) {
    event.respondWith(
      // `reload` also bypasses an HTML response cached before this protection
      // existed, which is exactly the login/logout transition we must repair.
      fetch(event.request, { cache: 'reload' })
        .catch(() => new Response('Connexion nécessaire pour ouvrir cette page hors ligne.', {
          status: 503,
          headers: { 'Content-Type': 'text/plain; charset=utf-8' },
        })),
    );
    return;
  }

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
