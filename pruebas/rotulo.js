// v54 · El rótulo de la portada (FABRICACIÓN) nunca pisa las cifras ni se sale de su tarjeta, de 360 px a 4K.
// Uso: CLAVE_PRUEBA=... node rotulo.js WEB_DIR
const { chromium } = require('playwright'); const path = require('path');
const serve = require('./serve.js');
const clave = process.env.CLAVE_PRUEBA.trim(); let mal = 0;
(async () => {
  const srv = await serve(process.argv[2] || path.join(process.env.PRUEBA_DIR || '..', 'web'), 8771); const b = await chromium.launch();
  for (const [w, h] of [[360, 780], [400, 860], [430, 932], [780, 360], [1024, 768], [1280, 800], [1440, 900], [1920, 1080], [3840, 2160]]){
    const c = await b.newContext({ viewport: { width: w, height: h }, hasTouch: w < 800 }); const p = await c.newPage();
    await p.goto('http://127.0.0.1:8771/'); await p.fill('#pw', clave); await p.click('#go'); await p.waitForFunction(() => document.getElementById('main')); await p.waitForTimeout(400);
    const r = await p.evaluate(() => { const n = document.querySelector('.pq-todo>.pq-name'), card = n.closest('.pq'), ks = card.querySelector('.pq-ks');
      const rn = document.createRange(); rn.selectNodeContents(n); const t = rn.getBoundingClientRect(), cr = card.getBoundingClientRect(), kr = ks.getBoundingClientRect();
      const pisa = kr.top < t.bottom && kr.bottom > t.top && kr.left < t.right; const fuera = t.right > cr.right - 8;
      return { fs: getComputedStyle(n).fontSize, txt: Math.round(t.right), card: Math.round(cr.right), pisa, fuera, hs: document.documentElement.scrollWidth > innerWidth }; });
    const bad = r.pisa || r.fuera || r.hs; if (bad) mal++;
    console.log((bad ? '🔴' : '🟢'), w + 'x' + h, JSON.stringify(r)); await c.close();
  }
  await b.close(); srv.close(); process.exit(mal ? 1 : 0);
})();
