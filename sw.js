/* =============================================================================
 * sw.js - service worker for ISBN Capture
 *
 * Precaches the single-file app shell on install and serves it cache-first so
 * the app launches offline from the home screen.
 *
 * APP_VERSION is the cache namespace: bump it whenever index.html, the
 * manifest, or an icon changes, otherwise installed clients keep the stale
 * shell forever.
 * ========================================================================== */
'use strict';

var APP_VERSION = 'isbn-capture-v1';
var SHELL_CACHE = APP_VERSION + '-shell';

/* Paths are relative to this worker's scope, so "./" resolves correctly
 * whether the app is served from a domain root or a subdirectory. */
var SHELL_FILES = [
  './',
  './index.html',
  './manifest.webmanifest',
  './icons/icon-192.png',
  './icons/icon-512.png'
];

self.addEventListener('install', function (event) {
  event.waitUntil(
    caches.open(SHELL_CACHE)
      .then(function (cache) { return cache.addAll(SHELL_FILES); })
      .then(function () { return self.skipWaiting(); })
  );
});

self.addEventListener('activate', function (event) {
  event.waitUntil(
    caches.keys()
      .then(function (keys) {
        return Promise.all(keys.map(function (key) {
          if (key !== SHELL_CACHE) return caches.delete(key);
          return null;
        }));
      })
      .then(function () { return self.clients.claim(); })
  );
});

self.addEventListener('fetch', function (event) {
  var req = event.request;

  // Only handle same-origin GETs; never intercept API/proxied traffic.
  if (req.method !== 'GET') return;
  if (new URL(req.url).origin !== self.location.origin) return;

  event.respondWith(
    caches.match(req, { ignoreSearch: true }).then(function (hit) {
      if (hit) return hit;
      return fetch(req).then(function (res) {
        if (res && res.ok && res.type === 'basic') {
          var copy = res.clone();
          caches.open(SHELL_CACHE).then(function (cache) { cache.put(req, copy); });
        }
        return res;
      }).catch(function () {
        if (req.mode === 'navigate') return caches.match('./index.html');
        return new Response('', { status: 504, statusText: 'Offline' });
      });
    })
  );
});