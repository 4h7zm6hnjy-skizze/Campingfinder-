/* Campingfinder v31 service worker
   Lädt weiterhin die bestehende v30-App und ergänzt die v31-Oberfläche zur Laufzeit. */
const CACHE = 'campingfinder-v31';
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
  './icon-512.png'
];

self.addEventListener('install', event => {
  self.skipWaiting();
  event.waitUntil(
    caches.open(CACHE).then(cache => cache.addAll(LOCAL_ASSETS))
  );
});

self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys()
      .then(keys => Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

async function mergedTextResponse(request, addonPath, contentType) {
  const baseResponse = await fetch(request);
  if (!baseResponse.ok) return baseResponse;

  try {
    const addonUrl = new URL(addonPath, self.location.href);
    const addonResponse = await fetch(addonUrl, { cache: 'no-store' });
    if (!addonResponse.ok) return baseResponse;

    const [baseText, addonText] = await Promise.all([
      baseResponse.clone().text(),
      addonResponse.text()
    ]);

    const headers = new Headers(baseResponse.headers);
    headers.set('content-type', contentType);
    headers.set('cache-control', 'no-cache');

    return new Response(baseText + '\n\n' + addonText, {
      status: baseResponse.status,
      statusText: baseResponse.statusText,
      headers
    });
  } catch (err) {
    return baseResponse;
  }
}

self.addEventListener('fetch', event => {
  if (event.request.method !== 'GET') return;

  const url = new URL(event.request.url);
  const cacheableExternal =
    url.hostname === 'unpkg.com' &&
    url.pathname.includes('/leaflet@1.9.4/');

  if (url.origin !== location.origin && !cacheableExternal) return;

  /* v31 wird an bestehende Dateien angehängt.
     Dadurch muss index.html nicht umgebaut werden und alle bisherigen Funktionen bleiben erhalten. */
  if (url.origin === location.origin && url.pathname.endsWith('/styles.css')) {
    event.respondWith(
      mergedTextResponse(event.request, './v31-ui.css', 'text/css; charset=utf-8')
    );
    return;
  }

  if (url.origin === location.origin && url.pathname.endsWith('/app.js')) {
    event.respondWith(
      mergedTextResponse(event.request, './ai-assistant.js', 'text/javascript; charset=utf-8')
    );
    return;
  }

  const isFreshCode =
    url.origin === location.origin &&
    (
      event.request.mode === 'navigate' ||
      /\.(?:html|css|js)$/.test(url.pathname)
    );

  if (isFreshCode) {
    event.respondWith(
      fetch(event.request)
        .then(response => {
          if (response.ok) {
            caches.open(CACHE).then(cache =>
              cache.put(event.request, response.clone())
            );
          }
          return response;
        })
        .catch(() =>
          caches.match(event.request)
            .then(cached => cached || caches.match('./index.html'))
        )
    );
    return;
  }

  event.respondWith(
    caches.match(event.request).then(cached => {
      if (cached) return cached;
      return fetch(event.request).then(response => {
        if (response.ok || response.type === 'opaque') {
          caches.open(CACHE).then(cache =>
            cache.put(event.request, response.clone())
          );
        }
        return response;
      });
    })
  );
});
