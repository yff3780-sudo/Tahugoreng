/**
 * DompetKu - Service Worker PWA (Offline Support)
 * Mengelola cache aplikasi untuk memungkinkan DompetKu berjalan 100% offline di smartphone maupun browser laptop.
 */

const CACHE_NAME = 'dompetku-cache-v1';

const ASSETS_TO_CACHE = [
  './',
  './index.html',
  './style.css',
  './manifest.json',
  './icon-192.svg',
  './icon-512.svg',
  './src/app.js',
  './src/db.js',
  './src/router.js',
  './src/seed.js',
  './src/parser.js',
  './src/charts.js',
  './src/utils.js',
  './src/pages/beranda.js',
  './src/pages/transaksi.js',
  './src/pages/anggaran.js',
  './src/pages/dompet.js',
  './src/pages/target.js',
  './src/pages/acara.js',
  './src/pages/laporan.js',
  './src/pages/pengaturan.js'
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      console.log('DompetKu Service Worker: Menyimpan aset statis ke cache...');
      return cache.addAll(ASSETS_TO_CACHE);
    }).then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(
        keys.map((key) => {
          if (key !== CACHE_NAME) {
            console.log('DompetKu Service Worker: Membersihkan cache lawas:', key);
            return caches.delete(key);
          }
        })
      );
    }).then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (event) => {
  // Hanya tangani permintaan GET
  if (event.request.method !== 'GET') return;

  event.respondWith(
    caches.match(event.request).then((cachedResponse) => {
      if (cachedResponse) {
        return cachedResponse;
      }
      return fetch(event.request).then((networkResponse) => {
        // Jangan cache jika respon bukan 200 atau respon opaque non-sukses
        if (!networkResponse || networkResponse.status !== 200 || networkResponse.type !== 'basic') {
          return networkResponse;
        }

        const responseToCache = networkResponse.clone();
        caches.open(CACHE_NAME).then((cache) => {
          cache.put(event.request, responseToCache);
        });

        return networkResponse;
      }).catch(() => {
        // Jika offline dan aset tidak ada di cache, arahkan ke index.html
        if (event.request.mode === 'navigate') {
          return caches.match('./index.html');
        }
      });
    })
  );
});
