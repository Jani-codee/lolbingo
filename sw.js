// sw.js
const CACHE_STATIC = 'bingo-static-v11';
const CACHE_PAGES  = 'bingo-pages-v11';

const PRECACHE = [
  './',
  './index.html',
  './style.css',
  './script.js',
  './manifest.webmanifest',
  './icons/icon-192.png',
  './icons/icon-512.png',
  './icons/maskable-512.png'
];

self.addEventListener('install', (event) => {
  event.waitUntil(caches.open(CACHE_STATIC).then(c => c.addAll(PRECACHE)));
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => ![CACHE_STATIC, CACHE_PAGES].includes(k)).map(k => caches.delete(k)))
    )
  );
  self.clients.claim();
});

// HTML: network-first (mindig próbál frisset kérni)
self.addEventListener('fetch', (event) => {
  const req = event.request;
  const accept = req.headers.get('accept') || '';
  if (req.mode === 'navigate' || accept.includes('text/html')) {
    event.respondWith(
      fetch(req).then(res => {
        caches.open(CACHE_PAGES).then(c => c.put(req, res.clone()));
        return res;
      }).catch(() => caches.match(req).then(r => r || caches.match('./index.html')))
    );
    return;
  }

  // Egyéb erőforrások: stale-while-revalidate
  event.respondWith(
    caches.match(req).then(cached => {
      const fetchPromise = fetch(req).then(res => {
        caches.open(CACHE_STATIC).then(c => c.put(req, res.clone()));
        return res;
      }).catch(() => cached || Promise.reject());
      return cached || fetchPromise;
    })
  );
});
