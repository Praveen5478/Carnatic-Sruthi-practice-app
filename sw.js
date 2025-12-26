const CACHE_NAME = 'sruthi-trainer-v1';

const URLS_TO_CACHE = [
  './',
  './index.html',
  './manifest.json',
  './icon.svg',
  './index.tsx',
  './App.tsx',
  './constants.ts',
  './services/audioService.ts',
  './components/SwaraButton.tsx'
];

self.addEventListener('install', (event) => {
  self.skipWaiting();
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      // Pre-cache critical local files
      return cache.addAll(URLS_TO_CACHE).catch(err => {
          console.warn('Pre-caching warning:', err);
      });
    })
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          if (cacheName !== CACHE_NAME) {
            return caches.delete(cacheName);
          }
        })
      );
    })
  );
  self.clients.claim();
});

self.addEventListener('fetch', (event) => {
  if (event.request.method !== 'GET') return;

  event.respondWith(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.match(event.request).then((cachedResponse) => {
        const fetchPromise = fetch(event.request)
          .then((networkResponse) => {
            // Cache if successful (200) or opaque (0 - for no-cors CDNs)
            if (!networkResponse || (networkResponse.status !== 200 && networkResponse.status !== 0)) {
              return networkResponse;
            }
            cache.put(event.request, networkResponse.clone());
            return networkResponse;
          })
          .catch(() => {
            // Network failed, nothing to do here, we rely on cachedResponse
          });

        return cachedResponse || fetchPromise;
      });
    })
  );
});