// v54 · Calendario de la empresa: totales, semanas, días y máquinas se pinchan y llevan a la Planificación
// (todas las secciones piden la clave de responsable, como Total; una máquina abre su sección).
const { chromium } = require('playwright'); const path = require('path');
const serve = require('./serve.js');
(async () => { const srv = await serve(process.argv[2] || path.join(process.env.PRUEBA_DIR || '..', 'web'), 8774); const b = await chromium.launch(); let mal = 0; const errs = [];
  for (const resp of [true, false]) for (const sel of ['.cg-d:not(.pas)', '.cg-w', '.cg-k>span', '.cg-ml']) {
    const c = await b.newContext({ viewport: { width: 1280, height: 800 } }); const p = await c.newPage(); p.on('pageerror', e => errs.push(e.message));
    await p.goto('http://127.0.0.1:8774/'); await p.fill('#pw', process.env.CLAVE_PRUEBA.trim()); await p.click('#go'); await p.waitForFunction(() => document.getElementById('main'));
    if (resp) await p.evaluate(() => localStorage.setItem('taller.resp', '1')); else await p.evaluate(() => localStorage.removeItem('taller.resp'));
    await p.waitForTimeout(300); await p.locator(sel).last().click(); await p.waitForTimeout(400);
    const r = await p.evaluate(() => ({ cal: document.body.classList.contains('cal'), tab: ((document.querySelector('.nav [aria-current=page], .nav .on, .nav .act') || {}).textContent || '').trim(), pin: !!document.querySelector('.pin,#pin,[class*=pin-]'), h1: ((document.querySelector('main h1, main h2') || {}).textContent || '').slice(0, 50) }));
    let ok = resp || sel === '.cg-ml' ? r.cal : r.pin;
    if (resp && sel === '.cg-w') ok = ok && await p.evaluate(() => /16|lun/i.test((document.querySelector('main h1, main h2') || {}).textContent || ''));
    if (!ok) mal++; console.log(ok ? '🟢' : '🔴', resp ? 'con clave' : 'sin clave', sel, JSON.stringify(r)); await c.close(); }
  console.log(errs.length ? 'ERRORES ' + errs.join('|') : 'sin errores JS'); await b.close(); srv.close(); process.exit(mal || errs.length ? 1 : 0); })();
