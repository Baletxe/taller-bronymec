/* Pedidos Bronymec: solo guarda la portada para que abra sin red; los paneles viven en Claude. */
const C = 'pedidos-v6';
const BASE = ['./', 'index.html', 'manifest.webmanifest', 'logo-bronymec.png', 'icon-192.png', 'icon-512.png', 'favicon.png', '../archivo.woff2'];
self.addEventListener('install', e => { e.waitUntil(caches.open(C).then(c => c.addAll(BASE))); self.skipWaiting(); });
self.addEventListener('activate', e => { e.waitUntil(caches.keys().then(ks => Promise.all(ks.filter(k => k.startsWith('pedidos-') && k !== C).map(k => caches.delete(k)))).then(() => self.clients.claim())); });
self.addEventListener('fetch', e => {
  const r = e.request, u = new URL(r.url);
  if (r.method !== 'GET' || u.origin !== location.origin) return;
  e.respondWith(fetch(r, {cache: 'no-cache'}).then(res => { if (res.ok) { const cl = res.clone(); caches.open(C).then(c => c.put(r, cl)); } return res; })
    .catch(() => caches.match(r).then(m => m || caches.match('index.html'))));
});
