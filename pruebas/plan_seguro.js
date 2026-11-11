// Prueba de la salvaguarda del plan compartido (Fase 1). Simula GitHub con Playwright: nada sale a internet.
// Casos:
//   1. plan.json de GitHub ilegible  → la app NO lo reescribe nunca (ni al arrancar ni en los ciclos siguientes) y lo dice.
//   2. plan.json legible             → se mezcla: las fichas del plan compartido llegan a la tablet.
//   3. plan de la tablet dañado      → se aparta sin borrarlo (taller.plan.v1.ilegible) y el plan compartido vuelve entero,
//                                      sin que la tablet suba borrados.
// Uso: node plan_seguro.js APP.html   (APP.html = taller_build.py … --plan-token con un token inventado)
//      Sale con código 1 si algo falla. Con la app de la v41 el caso 1 falla (así se demuestra que la prueba ve el fallo).
const { chromium } = require('playwright'); const fs = require('fs'); const { webcrypto: C } = require('crypto');
const APP = process.argv[2]; if (!APP || !fs.existsSync(APP)) { console.error('Uso: node plan_seguro.js APP.html'); process.exit(2); }
const HTML = fs.readFileSync(APP, 'utf8'), URL0 = 'http://prueba.localhost/';
// Llave como la del navegador: PBKDF2-SHA256 600.000 vueltas de la contraseña de PRUEBA (o una inventada) con la sal SAL del kit.
const PW = process.env.TALLER_CLAVE || 'prueba-' + Buffer.from(C.getRandomValues(new Uint8Array(12))).toString('hex');
const SAL = Buffer.from(fs.readFileSync(require('path').join(__dirname, '..', 'SAL'), 'utf8').trim(), 'base64');
const TLK = require('crypto').pbkdf2Sync(PW, SAL, 600000, 32, 'sha256').toString('base64');
const enc = new TextEncoder();

async function llavePlan(){
  const base = await C.subtle.importKey('raw', Buffer.from(TLK, 'base64'), 'HKDF', false, ['deriveKey']);
  return C.subtle.deriveKey({ name: 'HKDF', hash: 'SHA-256', salt: enc.encode('bronymec-taller'), info: enc.encode('plan-compartido-v1') }, base, { name: 'AES-GCM', length: 256 }, false, ['encrypt', 'decrypt']);
}
async function cifrar(obj){ const k = await llavePlan(), iv = C.getRandomValues(new Uint8Array(12));
  const ct = await C.subtle.encrypt({ name: 'AES-GCM', iv }, k, enc.encode(JSON.stringify(obj)));
  return { v: 1, iv: Buffer.from(iv).toString('base64'), ct: Buffer.from(ct).toString('base64') }; }
async function descifrar(o){ const k = await llavePlan(); return JSON.parse(Buffer.from(await C.subtle.decrypt({ name: 'AES-GCM', iv: Buffer.from(o.iv, 'base64') }, k, Buffer.from(o.ct, 'base64'))).toString('utf8')); }
const ficha = (id, d) => ({ id, k: 'libre', m: 'h1', d, qty: 5, done: false, ord: 1, nota: '', desc: 'Prueba ' + id, cli: 'Cliente de prueba', ref: 'R-' + id, ent: null, ts: '2026-11-10T08:00:00Z' });

async function caso(nombre, { remoto, local, mt }){
  const b = await chromium.launch(); const c = await b.newContext({ locale: 'es-ES', timezoneId: 'Europe/Madrid', viewport: { width: 1280, height: 800 } });
  const puts = []; let cuerpo = remoto; const errs = [];
  await c.route('**/*', async r => {
    const u = new URL(r.request().url()), m = r.request().method();
    if (u.origin + '/' === URL0) return r.fulfill({ status: 200, contentType: 'text/html; charset=utf-8', body: HTML });
    if (u.hostname === 'api.github.com'){
      const f = decodeURIComponent(u.pathname.split('/contents/')[1] || '');
      if (m === 'PUT'){ const j = JSON.parse(r.request().postData() || '{}'); puts.push({ f, j });
        if (f === 'plan.json') cuerpo = JSON.parse(Buffer.from(j.content, 'base64').toString('utf8'));
        return r.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ content: { sha: 'sha' + puts.length } }) }); }
      if (f === 'plan.json'){ if (cuerpo == null) return r.fulfill({ status: 404, body: '{}' });
        return r.fulfill({ status: 200, contentType: 'application/json', headers: { ETag: '"e1"' }, body: JSON.stringify({ sha: 'sha0', content: Buffer.from(JSON.stringify(cuerpo)).toString('base64') }) }); }
      return r.fulfill({ status: 404, body: '{}' });
    }
    return r.fulfill({ status: 404, body: '' }); // nada más sale de la prueba
  });
  await c.addInitScript(([tlk, local, mt]) => { if (sessionStorage.getItem('_ini')) return; sessionStorage.setItem('_ini', '1');
    localStorage.setItem('tl.k', tlk); localStorage.setItem('taller.resp', '1'); if (local != null) localStorage.setItem('taller.plan.v1', local);
    if (mt != null) localStorage.setItem('taller.sync.mt', mt); }, [TLK, local == null ? null : local, mt == null ? null : mt]);
  const p = await c.newPage(); p.on('pageerror', e => errs.push(e.message));
  await p.goto(URL0); await p.waitForFunction(() => document.getElementById('main'), null, { timeout: 30000 });
  await p.waitForTimeout(11000); // arranque + al menos un ciclo más (cada 8 s)
  const st = await p.evaluate(() => ({ sync: (document.querySelector('#sync span') || {}).textContent || '', plan: localStorage.getItem('taller.plan.v1'), apartado: localStorage.getItem('taller.plan.v1.ilegible') }));
  await b.close();
  return { nombre, puts, st, cuerpo, errs };
}

(async () => {
  const fallos = [], bien = m => console.log('  🟢 ' + m), mal = m => { fallos.push(m); console.log('  🔴 ' + m); };
  // 1 · ilegible
  const ileg = { v: 1, iv: Buffer.from(C.getRandomValues(new Uint8Array(12))).toString('base64'), ct: Buffer.from(C.getRandomValues(new Uint8Array(64))).toString('base64') };
  let r = await caso('ilegible', { remoto: ileg });
  console.log('1 · plan compartido ilegible');
  const pp = r.puts.filter(x => x.f === 'plan.json');
  pp.length ? mal('ha reescrito plan.json ' + pp.length + ' vez/veces') : bien('plan.json no se ha tocado');
  JSON.stringify(r.cuerpo) === JSON.stringify(ileg) ? bien('el fichero sigue byte a byte igual') : mal('el fichero ha cambiado');
  r.puts.some(x => x.f === 'tipos.json') ? mal('ha subido tipos.json con un plan sin leer') : bien('tipos.json tampoco se toca');
  /ilegible/i.test(r.st.sync) ? bien('avisa: "' + r.st.sync + '"') : mal('no avisa (estado: "' + r.st.sync + '")');
  r.errs.length && mal('errores JS: ' + r.errs.join(' | '));
  // 2 · legible
  const rem = await cifrar({ d: { 'i:abc123': ficha('abc123', '2026-11-12') }, mt: { 'i:abc123': Date.parse('2026-11-10T08:00:00Z') }, ts: '2026-11-10T08:00:00Z' });
  r = await caso('legible', { remoto: rem });
  console.log('2 · plan compartido legible');
  const pl = JSON.parse(r.st.plan || '{}');
  pl.items && pl.items.abc123 ? bien('la ficha del plan compartido llega a la tablet') : mal('la ficha no ha llegado');
  /vivo/i.test(r.st.sync) ? bien('estado "' + r.st.sync + '"') : mal('estado inesperado "' + r.st.sync + '"');
  const fin2 = await descifrar(r.cuerpo); fin2.d['i:abc123'] ? bien('el plan compartido conserva la ficha') : mal('el plan compartido ha perdido la ficha');
  r.errs.length && mal('errores JS: ' + r.errs.join(' | '));
  // 3 · local dañado (y con marcas de hora más nuevas que las del remoto, que es lo peligroso)
  r = await caso('local dañado', { remoto: rem, local: '{"v":1,"items":{"abc123":', mt: JSON.stringify({ 'i:abc123': Date.now() }) });
  console.log('3 · plan de la tablet dañado');
  r.st.apartado === '{"v":1,"items":{"abc123":' ? bien('lo dañado se ha apartado tal cual') : mal('no se ha apartado lo dañado');
  const pl3 = JSON.parse(r.st.plan || '{}'); pl3.items && pl3.items.abc123 ? bien('el plan compartido vuelve entero a la tablet') : mal('no se ha recuperado del plan compartido');
  r.puts.some(x => x.f === 'plan.json') ? bien('la app ha escrito el plan compartido mezclado') : mal('la app no ha escrito el plan mezclado');
  // El plan que ha escrito la app sirve para probar la restauración con plan_copia.py (Python lee lo que escribe el navegador).
  if (process.env.PLAN_SALIDA) fs.writeFileSync(process.env.PLAN_SALIDA, JSON.stringify(r.cuerpo));
  const fin3 = await descifrar(r.cuerpo); fin3.d['i:abc123'] ? bien('el plan compartido no ha perdido nada') : mal('la tablet ha borrado fichas del plan compartido');
  r.errs.length && mal('errores JS: ' + r.errs.join(' | '));
  console.log(fallos.length ? '🔴 ' + fallos.length + ' fallo(s) en la salvaguarda del plan' : '🟢 salvaguarda del plan: todo bien');
  process.exit(fallos.length ? 1 : 0);
})().catch(e => { console.error('🔴 la prueba no ha podido correr:', e); process.exit(1); });
