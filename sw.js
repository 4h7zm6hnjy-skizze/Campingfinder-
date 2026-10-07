/* Campingfinder v31.7 service worker
   v31.5 lädt die Oberfläche direkt aus index.html.
   Der Service Worker ist nur noch für Cache/Offline/Updates zuständig. */

const CACHE = 'campingfinder-v31-7';
const LOCAL_ASSETS = [
  './',
  './index.html',
  './styles.css',
  './v31-ui.css',
  './app.js',
  './ai-assistant.js',
  './qr-local.js',
  './manifest.webmanifest',
  './logo-campingfinder.png',
  './logo-campingfinder-700.webp',
  './favicon-32.png',
  './apple-touch-icon.png',
  './icon-192.png',
  './icon-512.png',
  './version.json'
];

self.addEventListener('install', event => {
  self.skipWaiting();
  event.waitUntil((async () => {
    const cache = await caches.open(CACHE);
    for (const asset of LOCAL_ASSETS) {
      try { await cache.add(new Request(asset, { cache:'reload' })); } catch {}
    }
  })());
});

self.addEventListener('activate', event => {
  event.waitUntil((async () => {
    const keys = await caches.keys();
    await Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k)));
    await self.clients.claim();

    // Einmal neu laden, damit eine von v31.4 kontrollierte Seite sofort
    // auf die direkte v31.5-Einbindung umschaltet.
    const clients = await self.clients.matchAll({
      type:'window',
      includeUncontrolled:true
    });
    await Promise.all(clients.map(async client => {
      try {
        const u = new URL(client.url);
        if (u.origin === self.location.origin) await client.navigate(client.url);
      } catch {}
    }));
  })());
});

async function networkFirst(request) {
  try {
    const response = await fetch(request, { cache:'no-store' });
    if (response && response.ok) {
      const cache = await caches.open(CACHE);
      try { await cache.put(request, response.clone()); } catch {}
    }
    return response;
  } catch {
    return (
      await caches.match(request, { ignoreSearch:true }) ||
      await caches.match('./index.html')
    );
  }
}

async function cacheFirst(request) {
  const cached = await caches.match(request, { ignoreSearch:true });
  if (cached) return cached;
  try {
    const response = await fetch(request);
    if (response && (response.ok || response.type === 'opaque')) {
      const cache = await caches.open(CACHE);
      try { await cache.put(request, response.clone()); } catch {}
    }
    return response;
  } catch {
    return new Response('', { status:503 });
  }
}

self.addEventListener('fetch', event => {
  if (event.request.method !== 'GET') return;

  const url = new URL(event.request.url);
  const externalLeaflet =
    url.hostname === 'unpkg.com' &&
    url.pathname.includes('/leaflet@1.9.4/');

  if (url.origin !== self.location.origin && !externalLeaflet) return;

  if (
    url.origin === self.location.origin &&
    (
      event.request.mode === 'navigate' ||
      /\.(?:html|css|js|json)$/.test(url.pathname)
    )
  ) {
    event.respondWith(networkFirst(event.request));
    return;
  }

  event.respondWith(cacheFirst(event.request));
});

self.addEventListener('message', event => {
  if (event.data && event.data.type === 'SKIP_WAITING') self.skipWaiting();
});
