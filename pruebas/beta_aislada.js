// Prueba: la beta (mismo origen que la app real) no lee ni toca nada de la app real en el aparato.
// Uso: CLAVE_PRUEBA=… node beta_aislada.js CARPETA_BETA   (sale con código 1 si algo se cruza)
const { chromium } = require('playwright'); const fs = require('fs'); const path = require('path'); const http = require('http');
const BETA = path.resolve(process.argv[2]); const clave = (process.env.CLAVE_PRUEBA || '').trim();
const srv = http.createServer((q, r) => {
  let u = decodeURIComponent(new URL(q.url, 'http://x').pathname);
  if (u.startsWith('/taller-bronymec/')) { r.writeHead(200, { 'Content-Type': 'text/html' }); return r.end('<!doctype html><title>real</title><p>app real (simulada)</p>'); }
  if (!u.startsWith('/taller-bronymec-beta/')) { r.writeHead(404); return r.end(); }
  u = u.slice('/taller-bronymec-beta'.length); if (u.endsWith('/')) u += 'index.html';
  const f = path.join(BETA, u); if (!f.startsWith(BETA)) { r.writeHead(403); return r.end(); }
  fs.readFile(f, (e, b) => { if (e) { r.writeHead(404); return r.end(); }
    const t = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript', '.json': 'application/json', '.enc': 'application/json', '.png': 'image/png', '.woff2': 'font/woff2', '.webmanifest': 'application/manifest+json' }[path.extname(f)] || 'application/octet-stream';
    r.writeHead(200, { 'Content-Type': t, 'Cache-Control': 'no-store' }); r.end(b); });
});
(async () => {
  await new Promise(r => srv.listen(8766, '127.0.0.1', r));
  const O = 'http://127.0.0.1:8766';
  const b = await chromium.launch(); const c = await b.newContext({ viewport: { width: 1280, height: 800 } });
  const fallos = []; const ok = (cond, txt) => { if (!cond) fallos.push(txt); };
  // 1) La app real tiene lo suyo guardado en este aparato
  const real = await c.newPage(); await real.goto(O + '/taller-bronymec/');
  const REAL = { 'tl.k': 'LLAVE-REAL', 'tl.salt': 'SAL-REAL', 'taller.plan.v1': '{"v":1,"real":true}', 'taller.sync.cfg': '{"token":"REAL"}', 'taller.resp': '1', 'panel.cola.v1': '[1]' };
  await real.evaluate(async R => { Object.entries(R).forEach(([k, v]) => localStorage.setItem(k, v)); sessionStorage.setItem('tl.ks', 'S-REAL');
    const cc = await caches.open('taller-v3'); await cc.put('/taller-bronymec/marca', new Response('real')); }, REAL);
  // 2) Se usa la beta: entrar, recorrer, recordar, instalar el service worker y salir con ?salir
  const p = await c.newPage(); const errs = []; p.on('pageerror', e => errs.push(e.message));
  await p.goto(O + '/taller-bronymec-beta/');
  const vioReal = await p.evaluate(() => [localStorage.getItem('tl.k'), localStorage.getItem('taller.plan.v1'), localStorage.getItem('taller.sync.cfg'), sessionStorage.getItem('tl.ks')]);
  ok(vioReal.every(x => x === null), 'la beta ve claves de la app real: ' + JSON.stringify(vioReal));
  await p.fill('#pw', clave); await p.click('#go'); await p.waitForFunction(() => document.getElementById('main'), null, { timeout: 30000 });
  await p.waitForTimeout(1500);
  await p.evaluate(() => { const x = document.querySelector('[data-pick$="|fresa"]'); if (x) x.click(); }); await p.waitForTimeout(600);
  await p.evaluate(() => { const x = document.querySelector('[data-go="plan"]'); if (x) x.click(); }); await p.waitForTimeout(600);
  ok(await p.evaluate(() => !!document.getElementById('betaF')), 'falta la franja BETA en la app');
  await p.goto(O + '/taller-bronymec-beta/?salir'); await p.waitForTimeout(1500);
  ok(await p.evaluate(() => !!document.getElementById('betaF')), 'falta la franja BETA en la entrada');
  await p.evaluate(async () => { const r = await navigator.serviceWorker.getRegistration(); if (r) await navigator.serviceWorker.ready; });
  await p.reload(); await p.waitForTimeout(2000);
  // 3) Lo de la app real sigue intacto
  const despues = await real.evaluate(async R => { const o = {}; Object.keys(R).forEach(k => o[k] = localStorage.getItem(k));
    o.ks = sessionStorage.getItem('tl.ks'); o.cache = (await caches.keys()); o.marca = !!(await (await caches.open('taller-v3')).match('/taller-bronymec/marca'));
    o.todas = Object.keys(localStorage); return o; }, REAL);
  Object.entries(REAL).forEach(([k, v]) => ok(despues[k] === v, 'la beta ha cambiado ' + k));
  ok(despues.marca, 'la beta ha borrado la caché de la app real');
  ok(despues.cache.includes('beta-taller-v3'), 'la beta no usa su propia caché: ' + despues.cache.join(','));
  const ajenas = despues.todas.filter(k => !(k in REAL) && !k.startsWith('beta:'));
  ok(!ajenas.length, 'la beta ha guardado claves sin prefijo: ' + ajenas.join(','));
  ok(despues.todas.some(k => k.startsWith('beta:')), 'la beta no ha guardado nada con su prefijo (¿no se ha usado?)');
  ok(!errs.length, 'errores JS en la beta: ' + errs.join(' / '));
  await b.close(); srv.close();
  console.log(fallos.length ? '🔴 ' + fallos.join(' · ') : '🟢 beta aislada: no lee ni toca nada de la app real (' + despues.todas.filter(k => k.startsWith('beta:')).length + ' claves beta:, caché propia)');
  if (fallos.length) process.exitCode = 1;
})();
