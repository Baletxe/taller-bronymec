/* Taller · Bronymec. Los datos siempre se piden nuevos a la red; sin red, la última copia. */
const C = 'taller-v3';
const BASE = ['./', 'index.html', 'manifest.webmanifest', 'icon-192.png', 'icon-512.png', 'apple-touch-icon.png', 'archivo.woff2'];
self.addEventListener('install', e => { e.waitUntil(caches.open(C).then(c => c.addAll(BASE))); self.skipWaiting(); });
self.addEventListener('activate', e => { e.waitUntil(caches.keys().then(ks => Promise.all(ks.filter(k => k !== C).map(k => caches.delete(k)))).then(() => self.clients.claim())); });
self.addEventListener('fetch', e => {
  const r = e.request, u = new URL(r.url);
  if (r.method !== 'GET' || u.origin !== location.origin) return;
  if (u.pathname.endsWith('/version.json')) {
    e.respondWith(fetch(r, {cache: 'no-store'}).catch(() => new Response('{}', {headers: {'Content-Type': 'application/json'}})));
    return;
  }
  if (u.pathname.endsWith('.enc')) {
    const nom = u.pathname.split('/').pop();
    e.respondWith(fetch(u.pathname, {cache: 'no-store'}).then(res => { if (res.ok) { const cl = res.clone(); caches.open(C).then(c => c.put(nom, cl)); } return res; })
      .catch(() => caches.open(C).then(c => c.match(nom))));
    return;
  }
  e.respondWith(fetch(r).then(res => { if (res.ok) { const cl = res.clone(); caches.open(C).then(c => c.put(r, cl)); } return res; })
    .catch(() => caches.match(r).then(m => m || caches.match('index.html'))));
});
