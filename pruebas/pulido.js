// Fase 4 · pulido: accesibilidad (axe-core, el motor de la parte de accesibilidad de Lighthouse), apertura en una tablet
// normal, funcionamiento sin conexión y hojas impresas. Con la web de PRUEBA cifrada (la misma que usa audit.js).
// Criterios ("10"): 0 fallos graves o críticos de accesibilidad (WCAG 2.1 A y AA) en cada vista; apertura < 2 s con la CPU
// 4 veces más lenta (tablet normal) y la contraseña ya guardada; sin conexión abre con los últimos datos; las tres hojas
// impresas salen con contenido y sin cortarse por la derecha en A4. Uso: node pulido.js   (código 1 si algo falla)
const { chromium } = require('playwright'); const fs = require('fs'); const path = require('path');
const serve = require('./serve.js');
const BASE = path.resolve(process.env.PRUEBA_DIR || path.join(__dirname, '..'));
const AXE = fs.readFileSync(require.resolve('axe-core/axe.min.js'), 'utf8');
const clave = (process.env.CLAVE_PRUEBA || fs.readFileSync(path.join(__dirname, '.clave_prueba'), 'utf8')).trim();
const URL0 = 'http://127.0.0.1:8766/';

(async () => {
  const fallos = [], bien = m => console.log('  🟢 ' + m), mal = m => { fallos.push(m); console.log('  🔴 ' + m); };
  const srv = await serve(path.join(BASE, process.env.WEB_DIR || 'web'), 8766);
  const b = await chromium.launch();
  const c = await b.newContext({ viewport: { width: 1280, height: 800 }, hasTouch: true, locale: 'es-ES', timezoneId: 'Europe/Madrid', bypassCSP: true }); // solo para poder inyectar axe
  const p = await c.newPage(); const errs = []; p.on('pageerror', e => errs.push(e.message));
  await p.goto(URL0); await p.fill('#pw', clave); await p.click('#go');
  await p.waitForFunction(() => document.getElementById('main'), null, { timeout: 30000 });
  await p.evaluate(() => localStorage.setItem('taller.resp', '1'));
  const elegir = async k => { await p.evaluate(() => { const x = document.querySelector('[data-go="elegir"]'); if (x && !document.querySelector('[data-pick]')) x.click(); }); await p.waitForTimeout(300);
    await p.evaluate(k => document.querySelector('[data-pick="' + k + '"]').click(), k); await p.waitForTimeout(400); };
  const vista = async v => { await p.evaluate(v => { const xs = [...document.querySelectorAll('[data-go="' + v + '"]')].filter(x => x.getClientRects().length); (xs.find(x => x.closest('nav,header')) || xs[0]).click(); }, v); await p.waitForTimeout(450); };

  console.log('1 · Accesibilidad (WCAG 2.1 A y AA, axe-core)');
  await elegir('caf|todo');
  const vistas = [['portada', null], ['hoy', 'hoy'], ['plan', 'plan'], ['pedidos', 'pedidos'], ['articulos', 'articulos'], ['talleres', 'talleres'], ['semana', 'semana'], ['ventas', 'ofi'], ['gerencia', 'ofi'], ['mensajes', 'msg']];
  const tot = { graves: 0, leves: 0, reglasOk: 0, reglas: 0 };
  for (const tema of ['claro', 'oscuro']){ await p.emulateMedia({ colorScheme: tema === 'oscuro' ? 'dark' : 'light' }); console.log('   modo ' + tema);
  for (const [n, v] of vistas){
    if (n === 'portada'){ await p.evaluate(() => { const x = document.querySelector('[data-go="elegir"]'); if (x) x.click(); }); await p.waitForTimeout(400); }
    else { await vista(v); if (n === 'gerencia' || n === 'ventas') { await p.evaluate(t => { const x = document.querySelector('[data-of="' + t + '"]'); if (x) x.click(); }, n === 'gerencia' ? 'ger' : 'ven'); await p.waitForTimeout(300); } }
    if (!await p.evaluate(() => !!window.axe)) await p.addScriptTag({ content: AXE });
    const r = await p.evaluate(async () => { const r = await axe.run(document, { runOnly: { type: 'tag', values: ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'] }, resultTypes: ['violations', 'passes'] });
      return { v: r.violations.map(x => ({ id: x.id, imp: x.impact, n: x.nodes.length, ej: x.nodes.slice(0, 3).map(y => y.target.join(' ') + (y.any[0] && y.any[0].data && y.any[0].data.fgColor ? ' [' + y.any[0].data.fgColor + ' sobre ' + y.any[0].data.bgColor + ' ' + y.any[0].data.contrastRatio + ']' : '')).join(' | ') })), pasa: r.passes.length }; });
    const g = r.v.filter(x => x.imp === 'serious' || x.imp === 'critical'), l = r.v.filter(x => !(x.imp === 'serious' || x.imp === 'critical'));
    tot.graves += g.length; tot.leves += l.length; tot.reglasOk += r.pasa; tot.reglas += r.pasa + r.v.length;
    g.length ? mal(n + ': ' + g.map(x => x.id + ' ×' + x.n + ' (' + x.ej + ')').join('; ')) : bien(n + ': 0 graves' + (l.length ? ' · leves: ' + l.map(x => x.id + ' ×' + x.n).join(', ') : ''));
    if (n === 'portada') await elegir('caf|todo');
  }
  }
  await p.emulateMedia({ colorScheme: 'light' });
  console.log('     reglas que pasan: ' + tot.reglasOk + ' de ' + tot.reglas + ' (' + Math.round(tot.reglasOk / tot.reglas * 100) + ' %)');

  console.log('2 · Apertura en una tablet normal (CPU ×4, contraseña ya guardada)');
  const cdp = await c.newCDPSession(p); await cdp.send('Emulation.setCPUThrottlingRate', { rate: 4 });
  const ts = [];
  for (let i = 0; i < 3; i++){ const t0 = Date.now(); await p.goto(URL0); await p.waitForFunction(() => document.getElementById('main') && document.getElementById('main').children.length, null, { timeout: 30000 }); ts.push(Date.now() - t0); }
  await cdp.send('Emulation.setCPUThrottlingRate', { rate: 1 });
  const med = ts.sort((a, b) => a - b)[1];
  med < 2000 ? bien('abre en ' + (med / 1000).toFixed(2).replace('.', ',') + ' s (mediana de 3: ' + ts.map(t => (t / 1000).toFixed(2)).join(' / ') + ')') : mal('tarda ' + med + ' ms en abrir');

  console.log('3 · Sin conexión');
  await p.waitForTimeout(1500); // que el service worker guarde lo último
  const sw = await p.evaluate(() => navigator.serviceWorker && navigator.serviceWorker.controller ? 'activo' : 'no');
  await srv.close(); await c.setOffline(true);
  let off = false; try { await p.reload({ timeout: 15000 }); await p.waitForFunction(() => document.getElementById('main') && document.getElementById('main').children.length, null, { timeout: 15000 }); off = true; } catch(_){}
  off ? bien('sin red abre la app con los últimos datos (service worker ' + sw + ')') : mal('sin red no abre (service worker ' + sw + ')');
  const sinRed = await p.evaluate(() => document.body.innerText.match(/Sin internet|Sin conexión|sin conexión/) ? 'lo dice' : 'no lo dice');
  console.log('     aviso de sin conexión: ' + sinRed);
  await c.setOffline(false);

  console.log('4 · Hojas impresas (A4)');
  await p.evaluate(() => { window.print = () => { window.__impreso = (window.__impreso || 0) + 1; }; });
  await elegir('caf|todo');
  for (const [que, ir] of [['hoy', 'hoy'], ['semana', 'plan'], ['resumen', 'semana']]){
    await vista(ir); await p.evaluate(() => { window.print = () => { window.__impreso = (window.__impreso || 0) + 1; }; });
    const ok = await p.evaluate(q => { const x = document.querySelector('[data-print="' + q + '"]') || (q === 'hoy' ? document.getElementById('btnPrint') : null); if (!x) return false; x.click(); return true; }, que);
    await p.waitForTimeout(300);
    await p.emulateMedia({ media: 'print' }); await p.setViewportSize({ width: 794, height: 1123 }); await p.waitForTimeout(200);
    const r = await p.evaluate(() => { const pr = document.getElementById('print'); if (!pr) return null; const rc = pr.getBoundingClientRect();
      const corta = [...pr.querySelectorAll('*')].filter(e => e.getBoundingClientRect().right > innerWidth + 2).length;
      return { txt: pr.innerText.length, alto: Math.round(rc.height), corta, impreso: window.__impreso || 0, precio: /precio|importe|€/i.test(pr.innerText) }; });
    await p.emulateMedia({ media: 'screen' }); await p.setViewportSize({ width: 1280, height: 800 });
    if (!ok || !r) { mal(que + ': no hay botón o no hay hoja'); continue; }
    r.txt > 50 && r.corta === 0 && !r.precio && r.impreso ? bien(que + ': ' + r.txt + ' letras, ' + Math.max(1, Math.round(r.alto / 1050)) + ' página(s), nada cortado, sin precios') : mal(que + ': ' + JSON.stringify(r));
  }

  errs.length ? mal('errores JS: ' + errs.join(' | ')) : bien('sin errores JS');
  await b.close();
  console.log(fallos.length ? '🔴 ' + fallos.length + ' fallo(s) de pulido' : '🟢 pulido (accesibilidad, apertura, sin conexión, impresión): todo bien');
  process.exit(fallos.length ? 1 : 0);
})().catch(e => { console.error('🔴 la prueba no ha podido correr:', e); process.exit(1); });
