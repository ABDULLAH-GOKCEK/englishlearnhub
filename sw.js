// sw.js
const CACHE = 'elh-v1';
const urls = ['/', '/index.html', '/styles.css', '/manifest.json', '/js/common.js', '/js/user-progress.js', '/js/progress-charts.js'];

self.addEventListener('install', e => e.waitUntil(caches.open(CACHE).then(cache => cache.addAll(urls))));
self.addEventListener('fetch', e => e.respondWith(caches.match(e.request).then(res => res || fetch(e.request))));