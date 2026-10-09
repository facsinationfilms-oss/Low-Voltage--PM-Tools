/* B&S Office Hub — offline support. The app and the markup tools are cached so they open with no signal;
   your data syncs when you're back online. New versions load the next time you're online. */
const CACHE = 'bs-hub-35de2afe98';
const FILES = ['./', './index.html', './markup.html', './quote.html', './supabase.js', './pdf-lib.min.js', './pdf.min.mjs', './pdf.worker.min.mjs', './manifest.webmanifest', './icon-192.png', './icon-512.png', './icon-maskable-512.png', './apple-touch-icon.png'];
self.addEventListener('install', e => { e.waitUntil(caches.open(CACHE).then(c => c.addAll(FILES)).then(() => self.skipWaiting())); });
self.addEventListener('activate', e => {
  e.waitUntil(caches.keys().then(keys => Promise.all(keys.filter(k => /^bs-(hub|markup)-/.test(k) && k !== CACHE).map(k => caches.delete(k)))).then(() => self.clients.claim()));
});
self.addEventListener('fetch', e => {
  const req = e.request;
  const url = new URL(req.url);
  if (req.method !== 'GET' || url.origin !== location.origin) return;   // Supabase sync and files go straight to the network
  if (req.mode === 'navigate') {
    // pages (the hub and the markup tools): newest when online, cached copy when offline
    const key = /markup\.html$/.test(url.pathname) ? './markup.html' : /quote\.html$/.test(url.pathname) ? './quote.html' : './index.html';
    e.respondWith(fetch(req).then(res => { if (res.ok) { const c = res.clone(); caches.open(CACHE).then(x => x.put(key, c)); } return res; })
      .catch(() => caches.match(key).then(r => r || caches.match('./'))));
    return;
  }
  e.respondWith(caches.match(req, { ignoreSearch: true }).then(hit => hit || fetch(req)));
});
