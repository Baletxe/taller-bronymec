// Auditoría Fase 0 de la app del taller (rehace tw/dead.js, tw/lk32.js, tw/ov.js y la prueba del botón Atrás).
// Entra en la web local (cifrada con la clave de PRUEBA), recorre cada vista en cada tamaño y mide:
//   cifras  : textos con números visibles que no llevan a ningún sitio (ni ellos ni un antepasado son pinchables)
//   muertos : elementos pinchables que al tocarlos no cambian nada (solo en 1280x800, muestra por vista)
//   solapes : textos visibles que se montan encima de otro texto
//   hscroll : la página entera se desplaza en horizontal
//   atras   : el botón Atrás vuelve dentro de la app
// Uso: node audit.js [--rapido]   → escribe ../audit/resultado.json y capturas en ../audit/
const { chromium } = require('playwright'); const fs = require('fs'); const path = require('path');
const serve = require('./serve.js');
const BASE = path.resolve(process.env.PRUEBA_DIR || path.join(__dirname, '..')), OUT = path.join(BASE, 'audit');
const RAPIDO = process.argv.includes('--rapido');
const VPS = [
  { n: 'movil360', w: 360, h: 780, m: true }, { n: 'movil430', w: 430, h: 932, m: true }, { n: 'girado', w: 800, h: 360, m: true },
  { n: 'tablet', w: 1280, h: 800, m: true }, { n: 'pc', w: 1920, h: 1080 }, { n: 'tv4k', w: 3840, h: 2160 }];
const VISTAS = ['hoy', 'plan', 'pedidos', 'articulos', 'alm', 'talleres', 'semana', 'msg'];
const PINCHA = 'a,button,input,select,textarea,label,summary,[role=button],[role=tab],[tabindex],[onclick],' +
  '[data-go],[data-dia],[data-pf],[data-open-art],[data-open-lin],[data-open-item],[data-plan-art],[data-plan-lin],[data-lk],[data-tvp],[data-wk],[data-wkgo],[data-maq],[data-pick],[data-id],[data-cell],[data-drag],[data-k],[data-alm],[data-mes],[data-pday],[data-pkday],[data-pkwk],[data-pkmes],[data-big],[data-tvm],[data-tvmq]';

async function entrar(b, vp, clave, extra){
  const c = await b.newContext({ viewport: { width: vp.w, height: vp.h }, hasTouch: !!vp.m, isMobile: false, locale: 'es-ES', timezoneId: 'Europe/Madrid' });
  const p = await c.newPage(); const errs = [];
  p.on('pageerror', e => errs.push('JS ' + e.message.slice(0, 200)));
  p.on('console', m => { if (m.type() === 'error' && !/favicon|api\.github/.test(m.text())) errs.push('consola ' + m.text().slice(0, 200)); });
  await p.goto('http://127.0.0.1:8765/' + (extra || ''));
  await p.fill('#pw', clave); await p.click('#go');
  await p.waitForFunction(() => document.getElementById('main'), null, { timeout: 30000 });
  await p.evaluate(() => { localStorage.setItem('taller.resp', '1'); });
  await p.waitForTimeout(600);
  return { c, p, errs };
}
async function elegir(p, k){
  await p.evaluate(() => { const x = document.querySelector('[data-go="elegir"]'); if (x && !document.querySelector('[data-pick]')) x.click(); }); await p.waitForTimeout(400);
  const ok = await p.evaluate(k => { const x = document.querySelector('[data-pick="' + k + '"]'); if (x){ x.click(); return true; } return false; }, k);
  await p.waitForTimeout(500); return ok;
}
async function irVista(p, v){
  const ok = await p.evaluate(v => { const xs = [...document.querySelectorAll('[data-go="' + v + '"]')].filter(x => x.offsetParent || x.getClientRects().length);
    const x = xs.find(x => x.closest('nav,.tabs,.bar,.bnav,header')) || xs[0]; if (x){ x.click(); return true; } return false; }, v);
  await p.waitForTimeout(450); return ok;
}
// Mide cifras sin enlace, solapes y scroll horizontal en lo que se ve ahora.
async function medir(p){
  return p.evaluate(PINCHA => {
    const vis = e => { const r = e.getBoundingClientRect(); if (r.width < 1 || r.height < 1) return null; const s = getComputedStyle(e); if (s.visibility === 'hidden' || +s.opacity === 0) return null; return r; };
    const hojas = []; const tw = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
    while (tw.nextNode()){ const t = tw.currentNode; if (!t.textContent.trim()) continue; const e = t.parentElement; if (!e || e.closest('script,style,svg,[hidden],[aria-hidden=true]')) continue;
      const rg = document.createRange(); rg.selectNodeContents(t); const rs = [...rg.getClientRects()].filter(r => r.width > 1 && r.height > 1); if (!rs.length || !vis(e)) continue;
      hojas.push({ e, t: t.textContent.trim(), rs }); }
    const cifras = [];
    const sel = s => { const p = []; let x = s; for (let i = 0; i < 3 && x && x !== document.body; i++, x = x.parentElement){ p.unshift(x.tagName.toLowerCase() + (x.id ? '#' + x.id : '') + (x.classList.length ? '.' + [...x.classList].slice(0, 2).join('.') : '')); } return p.join('>'); };
    hojas.forEach(h => { if (!/\d/.test(h.t)) return; if (h.e.closest(PINCHA)) return; if (h.e.closest('#pw,.toast,.foot')) return; cifras.push({ t: h.t.slice(0, 60), s: sel(h.e) }); });
    // Solapes: rectángulos de texto de nodos distintos que se cortan más de 3x3 px, y ninguno contiene al otro.
    const sol = []; const R = []; hojas.forEach((h, i) => h.rs.forEach(r => R.push({ i, r })));
    const vw = innerWidth, vh = innerHeight;
    for (let a = 0; a < R.length; a++){ const A = R[a].r; if (A.bottom < 0 || A.top > vh * 3) continue;
      for (let b = a + 1; b < R.length; b++){ if (R[a].i === R[b].i) continue; const B = R[b].r;
        const w = Math.min(A.right, B.right) - Math.max(A.left, B.left), hh = Math.min(A.bottom, B.bottom) - Math.max(A.top, B.top);
        if (w > 3 && hh > 3){ const ea = hojas[R[a].i].e, eb = hojas[R[b].i].e;
          // ignora lo que está tapado a propósito por una hoja/scrim abierta (lo de debajo no se ve)
          const top = document.elementFromPoint(Math.max(A.left, B.left) + w / 2, Math.max(A.top, B.top) + hh / 2);
          if (top && !(ea.contains(top) || top.contains(ea) || eb.contains(top) || top.contains(eb))) continue;
          sol.push({ a: hojas[R[a].i].t.slice(0, 30), b: hojas[R[b].i].t.slice(0, 30), s: sel(ea) }); if (sol.length > 40) break; } } if (sol.length > 40) break; }
    const se = document.scrollingElement; const hs = se.scrollWidth > vw + 1;
    return { cifras, solapes: sol, hscroll: hs ? se.scrollWidth - vw : 0, vista: (document.querySelector('#main') || {}).className || '' };
  }, PINCHA);
}
// Huella de lo que se ve: si al tocar algo no cambia, es un clic muerto.
const huella = p => p.evaluate(() => { const m = document.body.innerHTML; let h = 0; for (let i = 0; i < m.length; i += 7) h = (h * 31 + m.charCodeAt(i)) | 0;
  return location.href + '|' + m.length + '|' + h + '|' + document.body.className + '|' + (document.fullscreenElement ? 'fs' : '') + '|' + scrollY; });
async function muertos(p, vista, lim){
  const n = await p.evaluate(PINCHA => { const xs = [...document.querySelectorAll('#main ' + PINCHA.split(',').join(',#main '))].filter(x => { const r = x.getBoundingClientRect(); return r.width > 2 && r.height > 2 && r.top < innerHeight * 2 && !x.disabled && !x.closest('[disabled]'); });
    xs.forEach((x, i) => x.setAttribute('data-aud', i)); return xs.length; }, PINCHA);
  const res = []; const tope = Math.min(n, lim);
  for (let i = 0; i < tope; i++){
    const info = await p.evaluate(i => { const x = document.querySelector('[data-aud="' + i + '"]'); if (!x) return null; x.scrollIntoView({ block: 'center' });
      const a = [...x.attributes].filter(a => a.name.startsWith('data-') && a.name !== 'data-aud').map(a => a.name + '=' + a.value.slice(0, 20)).join(' ');
      return { t: (x.getAttribute('aria-label') || x.textContent || x.value || '').trim().replace(/\s+/g, ' ').slice(0, 50), tag: x.tagName.toLowerCase(), a, inp: /^(input|select|textarea)$/i.test(x.tagName) }; }, i);
    if (!info || info.inp) continue;
    const h0 = await huella(p);
    const pop = p.waitForEvent('popup', { timeout: 300 }).then(() => true).catch(() => false);
    await p.evaluate(i => { const x = document.querySelector('[data-aud="' + i + '"]'); if (x) x.click(); }, i);
    await p.waitForTimeout(260);
    const h1 = await huella(p), abre = await pop;
    if (h0 === h1 && !abre) res.push(info);
    if (h0 !== h1){ // volver a la vista de partida y volver a marcar
      await p.keyboard.press('Escape').catch(() => {}); await p.evaluate(() => { document.querySelectorAll('[data-close]').forEach(x => { try { x.click(); } catch(_){} }); });
      await irVista(p, vista);
      await p.evaluate(PINCHA => { const xs = [...document.querySelectorAll('#main ' + PINCHA.split(',').join(',#main '))].filter(x => { const r = x.getBoundingClientRect(); return r.width > 2 && r.height > 2 && r.top < innerHeight * 2 && !x.disabled && !x.closest('[disabled]'); }); xs.forEach((x, i) => x.setAttribute('data-aud', i)); }, PINCHA);
    }
  }
  return { probados: tope, total: n, muertos: res };
}

(async () => {
  fs.mkdirSync(OUT, { recursive: true });
  const srv = await serve(path.join(BASE, process.env.WEB_DIR || 'web'), 8765);
  const clave = (process.env.CLAVE_PRUEBA || fs.readFileSync(path.join(__dirname, '.clave_prueba'), 'utf8')).trim();
  const b = await chromium.launch();
  const R = { fecha: new Date().toISOString(), vps: {}, atras: null, tv: null, oficina: null, errores: [] };
  for (const vp of (RAPIDO ? VPS.filter(v => v.n === 'tablet') : VPS)){
    const { c, p, errs } = await entrar(b, vp, clave);
    const V = R.vps[vp.n] = { portada: await medir(p) };
    await p.screenshot({ path: path.join(OUT, vp.n + '-portada.png') });
    for (const puerta of ['caf|todo', 'caf|fresa', 'talgo|torno']){
      await p.goto('http://127.0.0.1:8765/'); await p.waitForFunction(() => document.getElementById('main'), null, { timeout: 30000 }); await p.waitForTimeout(400);
      if (!await elegir(p, puerta)){ V[puerta] = {error: 'sin puerta'}; continue; }
      if (await p.$('#pinIn, .pin input, [data-pin-k]')){ V[puerta] = {error: 'pide clave'}; continue; }
      const P = V[puerta] = {};
      for (const v of VISTAS){
        if (!await irVista(p, v)){ P[v] = 'no hay pestaña'; continue; }
        const m = await medir(p); P[v] = m;
        if (puerta === 'caf|todo') await p.screenshot({ path: path.join(OUT, vp.n + '-' + v + '.png'), fullPage: false });
        if (puerta === 'caf|todo' && vp.n === 'tablet') P[v].clics = await muertos(p, v, RAPIDO ? 25 : 70);
      }
    }
    V.errores = errs.slice(0, 20);
    await c.close();
  }
  // Botón Atrás (móvil): Hoy → día → Atrás debe volver a Hoy dentro de la app
  { const { c, p } = await entrar(b, VPS[0], clave); await elegir(p, 'caf|todo'); await irVista(p, 'hoy');
    const pasos = []; const v0 = await p.evaluate(() => document.querySelector('#main').className);
    const hayDia = await p.evaluate(() => { const x = document.querySelector('#main [data-dia]'); if (x){ x.click(); return true; } return false; }); await p.waitForTimeout(500);
    const st = () => p.evaluate(() => JSON.stringify(history.state && {v: history.state.v, dia: history.state.dia}) + ' sheet=' + !!document.querySelector('.sheet')).catch(() => 'fuera de la app');
    const v1 = await st();
    await p.goBack().catch(() => {}); await p.waitForTimeout(600);
    const v2 = await st();
    await p.goBack().catch(() => {}); await p.waitForTimeout(600);
    const v3 = await p.evaluate(() => location.href).catch(() => 'fuera de la app');
    R.atras = { hayDia, v0, v1, v2, v3 }; await c.close(); }
  // ?tv (pantalla de taller) y ?oficina
  for (const [k, q, vp] of [['tv', '?tv', { w: 1920, h: 1080, m: true }], ['oficina', '?oficina', { w: 1920, h: 1080 }]]){
    const { c, p, errs } = await entrar(b, vp, clave, q); await p.waitForTimeout(1500);
    R[k] = Object.assign(await medir(p), { errores: errs, texto: (await p.evaluate(() => document.body.innerText)).slice(0, 300) });
    await p.screenshot({ path: path.join(OUT, k + '.png') }); await c.close(); }
  // Copia de Claude (artifact): debe avisar con claridad de que no conecta con GitHub
  { const c = await b.newContext({ viewport: { width: 1280, height: 800 } }); const p = await c.newPage(); const errs = []; p.on('pageerror', e => errs.push(e.message));
    await p.setContent('<!doctype html><html><head><meta charset="utf-8"></head><body>' + fs.readFileSync(path.join(BASE, 'build', 'artifact.html'), 'utf8') + '</body></html>');
    await p.waitForTimeout(1500); await p.screenshot({ path: path.join(OUT, 'artifact.png') });
    R.artifact = { errores: errs, aviso: await p.evaluate(() => (document.body.innerText.match(/[^\n]*(Claude|GitHub|conectar)[^\n]*/g) || []).slice(0, 5)) }; await c.close(); }
  await b.close(); srv.close();
  fs.writeFileSync(path.join(OUT, 'resultado.json'), JSON.stringify(R, null, 1));
  // Resumen
  const sum = []; for (const [vn, V] of Object.entries(R.vps)){ for (const [pk, P] of Object.entries(V)){ if (pk === 'errores'){ if (P.length) sum.push(vn + ' errores: ' + P.join(' / ')); continue; }
      const one = (nm, m) => { if (!m || typeof m !== 'object') { sum.push(vn + ' ' + nm + ': ' + m); return; } sum.push(`${vn} ${nm}: cifras=${m.cifras.length} solapes=${m.solapes.length} hscroll=${m.hscroll}` + (m.clics ? ` muertos=${m.clics.muertos.length}/${m.clics.probados}` : '')); };
      if (P.cifras || P.error) one(pk, P.error || P); else Object.entries(P).forEach(([v, m]) => one(pk + ' ' + v, m)); } }
  // Lo que nunca puede pasar: errores JS, scroll horizontal, Atrás que no vuelve dentro de la app.
  const graves = [];
  for (const [vn, V] of Object.entries(R.vps)){ if ((V.errores || []).length) graves.push(vn + ': errores JS');
    for (const [pk, P] of Object.entries(V)){ if (pk === 'errores') continue; const it = P && P.cifras ? { x: P } : (P || {});
      for (const [v, m] of Object.entries(it)) if (m && m.hscroll) graves.push(vn + ' ' + pk + ' ' + v + ': scroll horizontal'); } }
  if (R.tv.errores.length || R.oficina.errores.length || R.artifact.errores.length) graves.push('errores JS en ?tv, ?oficina o artifact');
  if (!/"v":"hoy"/.test(R.atras.v2)) graves.push('Atrás no vuelve a Hoy');
  R.graves = graves; fs.writeFileSync(path.join(OUT, 'resultado.json'), JSON.stringify(R, null, 1));
  console.log(graves.length ? '🔴 ' + graves.join(' · ') : '🟢 auditoría sin fallos graves');
  if (graves.length) process.exitCode = 1;
  console.log(sum.join('\n')); console.log('ATRAS', JSON.stringify(R.atras)); console.log('TV', R.tv.hscroll, R.tv.errores, '| OFI', R.oficina.errores, '| ART', JSON.stringify(R.artifact));
})();
