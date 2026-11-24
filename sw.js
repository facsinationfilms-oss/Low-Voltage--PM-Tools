/* QuaField Office Hub — offline support. The app and the markup tools are cached so they open with no signal;
   your data syncs when you're back online. New versions load the next time you're online. */
const CACHE = 'bs-hub-mv1';
const FILES = ['./', './index.html', './markup.html', './quote.html', './view.html', './view.js', './view.css', './supabase.js', './pdf-lib.min.js', './zxing.min.js', './pdf.min.mjs', './pdf.worker.min.mjs', './manifest.webmanifest', './icon-192.png', './icon-512.png', './icon-maskable-512.png', './apple-touch-icon.png'];
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
    const key = /markup\.html$/.test(url.pathname) ? './markup.html' : /quote\.html$/.test(url.pathname) ? './quote.html' : /view\.html$/.test(url.pathname) ? './view.html' : './index.html';
    e.respondWith(fetch(req).then(res => { if (res.ok) { const c = res.clone(); caches.open(CACHE).then(x => x.put(key, c)); } return res; })
      .catch(() => caches.match(key).then(r => r || caches.match('./'))));
    return;
  }
  e.respondWith(caches.match(req, { ignoreSearch: true }).then(hit => hit || fetch(req)));
});

// Alerts: someone asked to edit a map
self.addEventListener('push', e => {
  let d = {}; try { d = e.data ? e.data.json() : {}; } catch (_) {}
  e.waitUntil(self.registration.showNotification(d.title || 'QuaField', { body: d.body || '', tag: d.tag || 'qf', icon: './icon-192.png', badge: './icon-192.png', data: { url: d.url || './?go=requests' } }));
});
self.addEventListener('notificationclick', e => {
  e.notification.close();
  const url = (e.notification.data && e.notification.data.url) || './?go=requests';
  e.waitUntil(self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then(list => {
    for (const c of list) { if ('focus' in c) { c.postMessage({ go: 'requests' }); return c.focus(); } }
    return self.clients.openWindow(url);
  }));
});
