const CACHE = 'campingfinder-v25';
const LOCAL_ASSETS = [
  './', './index.html', './styles.css', './app.js', './qr-local.js', './manifest.webmanifest',
  './logo-campingfinder.png', './logo-campingfinder-700.webp',
  './favicon-32.png', './apple-touch-icon.png', './icon-192.png', './icon-512.png'
];

self.addEventListener('install', event => {
  self.skipWaiting();
  event.waitUntil(caches.open(CACHE).then(cache => cache.addAll(LOCAL_ASSETS)));
});

self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys()
      .then(keys => Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', event => {
  if (event.request.method !== 'GET') return;
  const url = new URL(event.request.url);
  const cacheableExternal = url.hostname === 'unpkg.com' && url.pathname.includes('/leaflet@1.9.4/');
  if (url.origin !== location.origin && !cacheableExternal) return;
  event.respondWith(
    caches.match(event.request).then(cached => {
      const network = fetch(event.request)
        .then(response => {
          if (response.ok || response.type === 'opaque') caches.open(CACHE).then(cache => cache.put(event.request, response.clone()));
          return response;
        })
        .catch(() => cached);
      return cached || network;
    })
  );
});
