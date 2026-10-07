/* Campingfinder v34.0 service worker
   Mobile-/Tablet-Update mit hartem Versions-Busting. */

const APP_VERSION = '34.0.0';
const CACHE = 'campingfinder-v34-0';
const LOCAL_ASSETS = [
  './',
  './index.html',
  './styles.css',
  './v31-ui.css',
  './v34-theme.css',
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
      try {
        const url = new URL(asset, self.location.href);
        if (/\.(?:html|css|js|json)$/.test(url.pathname) || url.pathname.endsWith('/')) {
          url.searchParams.set('v', APP_VERSION);
        }
        const response = await fetch(url.toString(), { cache:'no-store' });
        if (response && response.ok) await cache.put(asset, response.clone());
      } catch {}
    }
  })());
});

self.addEventListener('activate', event => {
  event.waitUntil((async () => {
    const keys = await caches.keys();
    await Promise.all(
      keys.filter(k => k.startsWith('campingfinder-') && k !== CACHE).map(k => caches.delete(k))
    );
    await self.clients.claim();
  })());
});

async function networkFirst(request) {
  try {
    const u = new URL(request.url);
    if (u.origin === self.location.origin && (
      request.mode === 'navigate' ||
      /\.(?:html|css|js|json)$/.test(u.pathname)
    )) {
      u.searchParams.set('v', APP_VERSION);
    }

    const response = await fetch(u.toString(), { cache:'no-store' });
    if (response && response.ok) {
      const cache = await caches.open(CACHE);
      try { await cache.put(request, response.clone()); } catch {}
    }
    return response;
  } catch {
    return (
      await caches.match(request, { ignoreSearch:true }) ||
      await caches.match('./index.html', { ignoreSearch:true })
    );
  }
}

async function cacheFirst(request) {
  const cached = await caches.match(request, { ignoreSearch:true });
  if (cached) return cached;
  try {
    const response = await fetch(request, { cache:'no-store' });
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
