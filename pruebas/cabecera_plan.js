// v57 · Cabecera de Planificación: la semana se lee entera (S47 en el móvil), Imprimir va junto al tamaño de las fichas
// y la barra no se sale de la pantalla, de 360 px a PC. Uso: CLAVE_PRUEBA=... node cabecera_plan.js WEB_DIR
const { chromium } = require('playwright'); const path = require('path');
const serve = require('./serve.js');
(async () => { const srv = await serve(process.argv[2] || path.join(process.env.PRUEBA_DIR || '..', 'web'), 8775); const b = await chromium.launch(); let mal = 0;
  for (const [w, h] of [[360, 780], [400, 860], [430, 932], [780, 360], [1024, 768], [1280, 800], [1920, 1080]]) {
    const c = await b.newContext({ viewport: { width: w, height: h }, hasTouch: w < 800 }); const p = await c.newPage();
    await p.goto('http://127.0.0.1:8775/'); await p.fill('#pw', process.env.CLAVE_PRUEBA.trim()); await p.click('#go'); await p.waitForFunction(() => document.getElementById('main'));
    await p.evaluate(() => localStorage.setItem('taller.resp', '1')); await p.evaluate(() => document.querySelector('[data-pick="todo|todo"]').click()); await p.waitForTimeout(300);
    await p.evaluate(() => { const xs = [...document.querySelectorAll('[data-go="plan"]')].filter(x => x.getClientRects().length); xs[0].click(); }); await p.waitForTimeout(500);
    const r = await p.evaluate(() => { const t = document.querySelector('.wk-h .wk-t h2'), pr = document.querySelector('.wk-h [data-print]'), z = document.querySelector('.wk-h .seg.z'), wh = document.querySelector('.wk-h');
      const vis = e => e && e.getClientRects().length && getComputedStyle(e).display !== 'none';
      const tr = t.getBoundingClientRect(), pb = vis(pr) ? pr.getBoundingClientRect() : null, zb = vis(z) ? z.getBoundingClientRect() : null;
      return { txt: t.innerText.replace(/\s+/g, ' '), sw: [t.scrollWidth, t.clientWidth, wh.scrollWidth, wh.clientWidth], corta: [...t.querySelectorAll('*')].some(x => x.scrollWidth > x.clientWidth + 1 && getComputedStyle(x).overflow === 'hidden'),
        suelto: !!(pb && zb && Math.abs(pb.top - zb.top) > 6), hs: wh.scrollWidth > wh.clientWidth + 1 || document.documentElement.scrollWidth > innerWidth }; });
    const bad = r.corta || r.suelto || r.hs; if (bad) mal++; console.log(bad ? '🔴' : '🟢', w + 'x' + h, JSON.stringify(r)); await c.close(); }
  await b.close(); srv.close(); process.exit(mal ? 1 : 0); })();
