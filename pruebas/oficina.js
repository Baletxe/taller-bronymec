// Fase 3 · Oficina (Ventas y Gerencia), con navegador, datos de PRUEBA y GitHub simulado (nada sale de la prueba).
// Comprueba: fecha prevista de salida sacada del calendario (planificada, sin planificar, saldrá tarde), filtros con su cuenta,
// Gerencia con cada cifra enlazada a su lista, la foto diaria cifrada en hist.json (y que se limpia lo que llega mal),
// y que en un taller (fresa) no se ve Oficina. Uso: node oficina.js APP.html (con --plan-token inventado). Código 1 si algo falla.
const { chromium } = require('playwright'); const fs = require('fs'); const { webcrypto: C } = require('crypto');
const APP = process.argv[2]; if (!APP || !fs.existsSync(APP)) { console.error('Uso: node oficina.js APP.html'); process.exit(2); }
const HTML = fs.readFileSync(APP, 'utf8'), URL0 = 'http://prueba.localhost/';
const PW = 'prueba-' + Buffer.from(C.getRandomValues(new Uint8Array(12))).toString('hex');
const SAL = Buffer.from(fs.readFileSync(require('path').join(__dirname, '..', 'SAL'), 'utf8').trim(), 'base64');
const TLK = require('crypto').pbkdf2Sync(PW, SAL, 600000, 32, 'sha256').toString('base64');
const enc = new TextEncoder();
async function llave(){ const b = await C.subtle.importKey('raw', Buffer.from(TLK, 'base64'), 'HKDF', false, ['deriveKey']);
  return C.subtle.deriveKey({ name: 'HKDF', hash: 'SHA-256', salt: enc.encode('bronymec-taller'), info: enc.encode('plan-compartido-v1') }, b, { name: 'AES-GCM', length: 256 }, false, ['encrypt', 'decrypt']); }
async function cifrar(o){ const k = await llave(), iv = C.getRandomValues(new Uint8Array(12)); const ct = await C.subtle.encrypt({ name: 'AES-GCM', iv }, k, enc.encode(JSON.stringify(o)));
  return { v: 1, iv: Buffer.from(iv).toString('base64'), ct: Buffer.from(ct).toString('base64') }; }
async function descifrar(o){ const k = await llave(); return JSON.parse(Buffer.from(await C.subtle.decrypt({ name: 'AES-GCM', iv: Buffer.from(o.iv, 'base64') }, k, Buffer.from(o.ct, 'base64'))).toString('utf8')); }

(async () => {
  const fallos = [], bien = m => console.log('  🟢 ' + m), mal = m => { fallos.push(m); console.log('  🔴 ' + m); };
  // hist.json de partida: un día bueno y un día con basura (código y cifras imposibles) que la app debe limpiar
  let hist = await cifrar({ v: 1, d: { '2026-11-10': { cumple: 80, lateT: 9, riesgo: 2 }, '2026-11-11': { cumple: '<img src=x onerror=alert(1)>', lateT: -5, riesgo: 3, late: { caf: 4, '<x>': 9 } }, 'mal': { cumple: 1 } } });
  const puts = [];
  const b = await chromium.launch(); const errs = [];
  const c = await b.newContext({ viewport: { width: 1280, height: 800 }, hasTouch: true, locale: 'es-ES', timezoneId: 'Europe/Madrid' });
  await c.route('**/*', async r => {
    const u = new URL(r.request().url()), m = r.request().method();
    if (u.origin + '/' === URL0) return r.fulfill({ status: 200, contentType: 'text/html; charset=utf-8', body: HTML });
    if (u.hostname === 'api.github.com'){
      const f = decodeURIComponent(u.pathname.split('/contents/')[1] || '');
      if (m === 'PUT'){ const j = JSON.parse(r.request().postData() || '{}'); puts.push(f); if (f === 'hist.json') hist = JSON.parse(Buffer.from(j.content, 'base64').toString('utf8'));
        return r.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ content: { sha: 'sha' + puts.length } }) }); }
      if (f === 'hist.json') return r.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ sha: 'h0', content: Buffer.from(JSON.stringify(hist)).toString('base64') }) });
      return r.fulfill({ status: 404, body: '{}' });
    }
    return r.fulfill({ status: 404, body: '' });
  });
  await c.addInitScript(tlk => { if (sessionStorage.getItem('_ini')) return; sessionStorage.setItem('_ini', '1'); localStorage.setItem('tl.k', tlk); localStorage.setItem('taller.resp', '1'); }, TLK);
  const p = await c.newPage(); p.on('pageerror', e => errs.push(e.message));
  await p.goto(URL0); await p.waitForFunction(() => document.getElementById('main'));
  await p.evaluate(() => document.querySelector('[data-pick="caf|todo"]').click()); await p.waitForTimeout(400);

  console.log('1 · Ventas: fecha prevista de salida desde el calendario');
  // tres líneas de CAF con algo que fabricar: una planificada a tiempo, una planificada después de su entrega y una sin planificar
  const L = await p.evaluate(() => { const T = window.__TALLER; if (!T) return null;
    // piezas cuyas líneas abiertas están todas sin retraso, con algo que fabricar y entrega dentro de más de 6 días; nada planificado aún
    const arts = T.MOD.caf.ARTS.filter(a => { const v = a.lines.filter(l => !l.term); return v.length && v.every(l => !l.late && l.d - new Date() > 6 * 864e5) && v.some(l => l.falta > 0)
      && !Object.values(T.PLAN.items).some(it => it.akey === a.key); });
    const ficha = (a, dias) => { const d = new Date(); d.setDate(d.getDate() + dias); if (d.getDay() === 0) d.setDate(d.getDate() + 1);
      const k = d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0'), id = 'p' + Math.random().toString(36).slice(2, 10);
      T.PLAN.items[id] = { id, k: 'art', key: a.key, akey: a.key, emp: 'caf', m: 'h1', d: k, qty: a.lines.filter(l => !l.term).reduce((s, l) => s + l.falta, 0), done: false, ord: 1, nota: '', ts: new Date().toISOString() }; };
    const [a, r, s] = arts; if (!s) return null;
    const pri = x => x.lines.filter(l => !l.term && l.falta > 0).sort((p, q) => p.d - q.d)[0];
    ficha(a, 1); ficha(r, Math.round((pri(r).d - new Date()) / 864e5) + 3);
    localStorage.setItem('taller.plan.v1', JSON.stringify(T.PLAN));
    return { a: pri(a).id, r: pri(r).id, s: pri(s).id, ps: pri(s).pedido };
  });
  if (!L){ mal('no hay líneas de prueba suficientes'); } else {
    await p.reload(); await p.waitForFunction(() => document.getElementById('main')); await p.waitForTimeout(400);
    await p.evaluate(() => { const x = document.querySelector('[data-pick="caf|todo"]'); if (x) x.click(); }); await p.waitForTimeout(300);
    await p.evaluate(() => [...document.querySelectorAll('[data-go="ofi"]')].find(x => x.getClientRects().length).click()); await p.waitForTimeout(500);
    await p.evaluate(() => { const x = document.querySelector('[data-of="ven"]'); if (x) x.click(); }); await p.waitForTimeout(300);
    const est = async id => p.$eval('.vt-l[data-open-lin="' + id + '"] .vt-e', x => x.textContent.replace(/\s+/g, ' ').trim()).catch(() => '');
    const ea = await est(L.a), er = await est(L.r), es = await est(L.s);
    /Planificada.*sale el/.test(ea) ? bien('planificada a tiempo: "' + ea + '"') : mal('planificada: ' + ea);
    /Planificada.*después de la entrega/.test(er) ? bien('planificada tarde: "' + er + '"') : mal('saldrá tarde: ' + er);
    /Sin planificar/.test(es) ? bien('sin fichas: "' + es + '"') : mal('sin planificar: ' + es);
    // filtros con su cuenta: "Saldrán tarde" incluye el pedido de la línea r
    await p.click('[data-vf="riesgo"]'); await p.waitForTimeout(300);
    const nR = await p.$eval('[data-vf="riesgo"] b', x => +x.textContent), secs = await p.$$eval('.vt-p', xs => xs.length);
    (await p.$('.vt-l[data-open-lin="' + L.r + '"]')) && nR >= 1 && secs >= nR ? bien('filtro "Saldrán tarde": ' + nR + ' pedido(s), y la cuenta cuadra con la lista') : mal('filtro riesgo: ' + nR + ' / ' + secs);
    // buscar por pedido
    await p.fill('#q', L.ps).catch(async () => { await p.click('#btnQ'); await p.fill('#q', L.ps); }); await p.click('[data-vf="todo"]'); await p.waitForTimeout(500);
    const peds = await p.$$eval('.vt-p h4 b', xs => xs.map(x => x.textContent));
    peds.length >= 1 && peds.every(t => t.includes(L.ps)) ? bien('buscar por pedido deja solo ese pedido') : mal('búsqueda: ' + JSON.stringify(peds));
    await p.fill('#q', ''); await p.waitForTimeout(300);
    // tocar la línea abre su ficha
    await p.click('.vt-l[data-open-lin="' + L.a + '"]'); await p.waitForTimeout(300);
    (await p.$('.sheet')) ? bien('tocar una línea abre su ficha') : mal('la línea no abre ficha'); await p.keyboard.press('Escape'); await p.waitForTimeout(200);
  }

  console.log('2 · Gerencia: cifras enlazadas y evolución');
  await p.click('[data-of="ger"]'); await p.waitForTimeout(400);
  const kp = await p.$$eval('.ger .sn', xs => xs.map(x => ({ t: x.querySelector('span').textContent, link: !!(x.dataset.go || x.dataset.of || x.dataset.lk) })));
  kp.length === 6 && kp.every(k => k.link) ? bien('6 indicadores y todos llevan a su lista') : mal('indicadores: ' + JSON.stringify(kp));
  const cg = await p.$$eval('.box .mb', xs => xs.map(x => x.textContent.replace(/\s+/g, ' ')));
  cg.length >= 2 && cg.every(t => /\d+%/.test(t)) ? bien('carga de dos semanas por taller: ' + cg.map(t => t.trim().split(' ').slice(0, 2).join(' ')).join(' · ')) : mal('carga: ' + JSON.stringify(cg));
  const nRg = await p.$eval('.ger .sn[data-vf="riesgo"] b', x => parseInt(x.textContent));
  await p.click('.ger .sn[data-vf="riesgo"]'); await p.waitForTimeout(300);
  const nLista = await p.$$eval('.vt-l[data-open-lin]', xs => xs.filter(x => x.querySelector('.vt-e.riesgo')).length);
  nRg === nLista ? bien('"saldrán tarde" = ' + nRg + ' y la lista enseña las mismas líneas') : mal('riesgo: cifra ' + nRg + ', lista ' + nLista);

  console.log('3 · Foto diaria cifrada (hist.json)');
  await p.waitForTimeout(17000);
  puts.includes('hist.json') ? bien('la app guarda la foto del día en hist.json') : mal('no ha guardado la foto diaria');
  let H = null; try { H = await descifrar(hist); } catch(_){}
  const hoy = await p.evaluate(() => { const d = new Date(); return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0'); });
  H && H.d[hoy] && typeof H.d[hoy].lateT === 'number' && H.d[hoy].carga ? bien('cifrada con la llave del plan y con las cifras de hoy') : mal('foto: ' + JSON.stringify(H && H.d[hoy]));
  H && !('mal' in H.d) && H.d['2026-11-11'] && !('cumple' in H.d['2026-11-11']) && !('lateT' in H.d['2026-11-11']) && H.d['2026-11-11'].riesgo === 3 && !('<x>' in (H.d['2026-11-11'].late || {}))
    ? bien('lo que llega mal se limpia (texto, negativos y claves raras fuera)') : mal('limpieza: ' + JSON.stringify(H && H.d['2026-11-11']));
  !JSON.stringify(hist).includes('lateT') ? bien('en GitHub no hay nada en claro') : mal('hist.json lleva datos en claro');
  await p.evaluate(() => { const x = document.querySelector('[data-of="ger"]'); if (x) x.click(); }); await p.waitForTimeout(400);
  (await p.$$eval('.ger svg.spk', xs => xs.length)) >= 1 ? bien('Gerencia dibuja la evolución') : mal('sin evolución');

  console.log('4 · En un taller no se ve Oficina');
  await p.evaluate(() => { sessionStorage.removeItem('taller.elegido'); }); await p.reload(); await p.waitForFunction(() => document.getElementById('main'));
  // v48 (Jon): Fabricación va suelta de los paneles: en la portada (aparato de gerencia) no hay ninguna entrada a un panel
  const pnl = await p.evaluate(() => ({ txt: /Panel de control/i.test(document.body.innerText), btn: document.querySelectorAll('[data-pqp],iframe[src*="panel"]').length }));
  !pnl.txt && !pnl.btn ? bien('la portada no lleva paneles de control: solo fabricación') : mal('quedan paneles en la portada: ' + JSON.stringify(pnl));
  await p.evaluate(() => { const x = document.querySelector('[data-pick="todo|fresa"]'); if (x) x.click(); }); await p.waitForTimeout(300);
  (await p.$$eval('[data-go="ofi"]', xs => xs.length)) === 0 ? bien('fresa: sin Oficina') : mal('fresa ve Oficina');
  errs.length ? mal('errores JS: ' + errs.join(' | ')) : bien('sin errores JS');
  await b.close();
  console.log(fallos.length ? '🔴 ' + fallos.length + ' fallo(s) en Oficina' : '🟢 Oficina (Ventas y Gerencia): todo bien');
  process.exit(fallos.length ? 1 : 0);
})().catch(e => { console.error('🔴 la prueba no ha podido correr:', e); process.exit(1); });
