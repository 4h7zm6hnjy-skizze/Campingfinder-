/* Campingfinder v31.3 service worker
   Lädt weiterhin die bestehende v30-Kern-App und ergänzt die v31-Oberfläche.
   v31.3 enthält die verzögerte Update-Übernahme und verbessert Offline-Fallbacks. */

const CACHE = 'campingfinder-v31-3';
const LOCAL_ASSETS = [
  './',
  './index.html',
  './styles.css',
  './app.js',
  './qr-local.js',
  './manifest.webmanifest',
  './logo-campingfinder.png',
  './logo-campingfinder-700.webp',
  './favicon-32.png',
  './apple-touch-icon.png',
  './icon-192.png',
  './icon-512.png',
  './v31-ui.css',
  './ai-assistant.js',
  './version.json'
];

self.addEventListener('install', event => {
  self.skipWaiting();
  event.waitUntil(
    caches.open(CACHE).then(async cache => {
      for (const asset of LOCAL_ASSETS) {
        try { await cache.add(asset); } catch {}
      }
    })
  );
});

self.addEventListener('activate', event => {
  event.waitUntil((async () => {
    const keys = await caches.keys();
    await Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k)));
    await self.clients.claim();

    // Wichtig: Nach Aktivierung genau dieser neuen SW-Version werden offene
    // Campingfinder-Fenster einmal neu geladen. Erst dann werden app.js/styles.css
    // durch diesen Service Worker erweitert.
    const windows = await self.clients.matchAll({
      type: 'window',
      includeUncontrolled: true
    });

    await Promise.all(
      windows.map(async client => {
        try {
          const url = new URL(client.url);
          if (url.origin === self.location.origin) await client.navigate(client.url);
        } catch {}
      })
    );
  })());
});

async function networkOrCache(request) {
  try {
    const response = await fetch(request);
    if (response && response.ok) {
      const cache = await caches.open(CACHE);
      try { await cache.put(request, response.clone()); } catch {}
    }
    return response;
  } catch {
    return (
      await caches.match(request, { ignoreSearch: true }) ||
      await caches.match('./index.html')
    );
  }
}

async function fetchAddon(path) {
  const url = new URL(path, self.location.href);
  try {
    const response = await fetch(url, { cache: 'no-store' });
    if (response.ok) {
      const cache = await caches.open(CACHE);
      try { await cache.put(url, response.clone()); } catch {}
      return response;
    }
  } catch {}

  return (
    await caches.match(url, { ignoreSearch: true }) ||
    await caches.match(path, { ignoreSearch: true })
  );
}

async function mergedTextResponse(request, addonPath, contentType) {
  const baseResponse = await networkOrCache(request);
  if (!baseResponse) return new Response('', { status: 503 });

  const addonResponse = await fetchAddon(addonPath);
  if (!addonResponse) return baseResponse;

  try {
    const [baseText, addonText] = await Promise.all([
      baseResponse.clone().text(),
      addonResponse.clone().text()
    ]);

    const headers = new Headers(baseResponse.headers);
    headers.set('content-type', contentType);
    headers.set('cache-control', 'no-cache');

    return new Response(baseText + '\n\n' + addonText, {
      status: baseResponse.status,
      statusText: baseResponse.statusText,
      headers
    });
  } catch {
    return baseResponse;
  }
}

self.addEventListener('fetch', event => {
  if (event.request.method !== 'GET') return;

  const url = new URL(event.request.url);
  const cacheableExternal =
    url.hostname === 'unpkg.com' &&
    url.pathname.includes('/leaflet@1.9.4/');

  if (url.origin !== self.location.origin && !cacheableExternal) return;

  // Bestehende v30-Dateien werden zur Laufzeit um v31 ergänzt.
  if (url.origin === self.location.origin && url.pathname.endsWith('/styles.css')) {
    event.respondWith(
      mergedTextResponse(event.request, './v31-ui.css', 'text/css; charset=utf-8')
    );
    return;
  }

  if (url.origin === self.location.origin && url.pathname.endsWith('/app.js')) {
    event.respondWith(
      mergedTextResponse(event.request, './ai-assistant.js', 'text/javascript; charset=utf-8')
    );
    return;
  }

  const isFreshCode =
    url.origin === self.location.origin &&
    (
      event.request.mode === 'navigate' ||
      /\.(?:html|css|js|json)$/.test(url.pathname)
    );

  if (isFreshCode) {
    event.respondWith(networkOrCache(event.request));
    return;
  }

  event.respondWith((async () => {
    const cached = await caches.match(event.request, { ignoreSearch: true });
    if (cached) return cached;

    try {
      const response = await fetch(event.request);
      if (response.ok || response.type === 'opaque') {
        const cache = await caches.open(CACHE);
        try { await cache.put(event.request, response.clone()); } catch {}
      }
      return response;
    } catch {
      return new Response('', { status: 503 });
    }
  })());
});

/* Manuelle Aktivierung eines wartenden Updates. */
self.addEventListener('message', event => {
  if (event.data && event.data.type === 'SKIP_WAITING') self.skipWaiting();
});
