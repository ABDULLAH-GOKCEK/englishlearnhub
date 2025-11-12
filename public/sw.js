// sw.js - Güncellenmiş versiyon
const CACHE_NAME = 'english-learn-hub-v2';
const urlsToCache = ['/', '/style.css'];

self.addEventListener('install', (event) => {
  console.log('🚀 Service Worker installed!');
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => cache.addAll(urlsToCache))
  );
});

self.addEventListener('fetch', (event) => {
  event.respondWith(
    caches.match(event.request)
      .then(response => {
        // Cache'te varsa cache'ten, yoksa network'ten
        return response || fetch(event.request);
      })
  );
});