// Comparación visual (Fase 1): lo que cambia a la vista entre la web de REFERENCIA (la que está publicada) y la NUEVA,
// con los mismos datos de PRUEBA, la misma hora fija y sin animaciones. Recorre portada y vistas en los 6 tamaños.
// Deja visual/informe.html (antes | después | diferencias en rojo, de más a menos cambio) y visual/resultado.json.
// No falla por cambiar (los cambios pueden ser queridos): sirve para revisarlos antes de publicar.
// Falla solo si una pantalla no se puede capturar.
// Uso: CLAVE_PRUEBA=… node visual.js WEB_REFERENCIA WEB_NUEVA SALIDA
const { chromium } = require('playwright'); const fs = require('fs'); const path = require('path');
const serve = require('./serve.js');
const [REF, NUE, OUT] = process.argv.slice(2).map(x => x && path.resolve(x));
if (!REF || !NUE || !OUT) { console.error('Uso: node visual.js WEB_REFERENCIA WEB_NUEVA SALIDA'); process.exit(2); }
const clave = (process.env.CLAVE_PRUEBA || '').trim();
const HORA = new Date('2026-11-11T10:30:00+01:00'); // misma hora que los datos de prueba (gen_fixtures 2026-11-11)
const VPS = [{ n: 'movil360', w: 360, h: 780, m: true }, { n: 'movil430', w: 430, h: 932, m: true }, { n: 'girado', w: 800, h: 360, m: true },
  { n: 'tablet', w: 1280, h: 800, m: true }, { n: 'pc', w: 1920, h: 1080 }, { n: 'tv4k', w: 3840, h: 2160 }];
const VISTAS = ['hoy', 'plan', 'pedidos', 'articulos', 'talleres', 'semana', 'msg'];
const QUIETO = '*,*::before,*::after{animation:none!important;transition:none!important;caret-color:transparent!important}';

async function capturas(b, port, dir, vp){
  const c = await b.newContext({ viewport: { width: vp.w, height: vp.h }, hasTouch: !!vp.m, locale: 'es-ES', timezoneId: 'Europe/Madrid' });
  const p = await c.newPage(); await p.clock.install({ time: HORA });
  const fotos = {};
  const foto = async k => { await p.mouse.move(0, 0); /* el ratón no se queda encima de nada (efectos al pasar) */ await p.addStyleTag({ content: QUIETO }).catch(() => {}); await p.clock.runFor(800); await p.waitForTimeout(150);
    fotos[k] = await p.screenshot({ fullPage: false }); };
  await p.goto('http://127.0.0.1:' + port + '/'); await p.fill('#pw', clave); await p.click('#go');
  await p.waitForFunction(() => document.getElementById('main'), null, { timeout: 30000 });
  await p.evaluate(() => { localStorage.setItem('taller.resp', '1'); localStorage.setItem('taller.inst.no', '1'); });
  await p.evaluate(() => { const x = document.querySelector('[data-go="elegir"]'); if (x && !document.querySelector('[data-pick]')) x.click(); }); await p.clock.runFor(500);
  await foto('portada');
  await p.evaluate(() => { const x = document.querySelector('[data-pick="caf|todo"]'); if (x) x.click(); }); await p.clock.runFor(500);
  for (const v of VISTAS){
    const ok = await p.evaluate(v => { const x = [...document.querySelectorAll('[data-go="' + v + '"]')].find(x => x.getClientRects().length); if (x){ x.click(); return true; } return false; }, v);
    if (!ok) continue; await p.evaluate(() => scrollTo({ top: 0, behavior: 'instant' })); await foto(v);
  }
  await c.close(); return fotos;
}

(async () => {
  fs.mkdirSync(path.join(OUT, 'img'), { recursive: true });
  const s1 = await serve(REF, 8771), s2 = await serve(NUE, 8772); const b = await chromium.launch();
  const dif = await b.newPage(); // aquí se comparan los píxeles (canvas): sin dependencias
  const filas = [];
  for (const vp of VPS){
    const A = await capturas(b, 8771, REF, vp), B = await capturas(b, 8772, NUE, vp);
    for (const k of new Set([...Object.keys(A), ...Object.keys(B)])){
      const id = vp.n + '-' + k;
      if (!A[k] || !B[k]){ filas.push({ id, vp: vp.n, vista: k, pct: 100, nota: !A[k] ? 'solo en la nueva' : 'solo en la referencia' }); if (B[k]) fs.writeFileSync(path.join(OUT, 'img', id + '-b.png'), B[k]); if (A[k]) fs.writeFileSync(path.join(OUT, 'img', id + '-a.png'), A[k]); continue; }
      const r = await dif.evaluate(async ([a, bb]) => {
        const load = s => new Promise((ok, ko) => { const i = new Image(); i.onload = () => ok(i); i.onerror = ko; i.src = 'data:image/png;base64,' + s; });
        const [ia, ib] = await Promise.all([load(a), load(bb)]); const w = Math.max(ia.width, ib.width), h = Math.max(ia.height, ib.height);
        const ctx = (img) => { const c = document.createElement('canvas'); c.width = w; c.height = h; const x = c.getContext('2d'); x.drawImage(img, 0, 0); return x.getImageData(0, 0, w, h).data; };
        const da = ctx(ia), db = ctx(ib), out = document.createElement('canvas'); out.width = w; out.height = h; const ox = out.getContext('2d'), od = ox.createImageData(w, h);
        let n = 0; for (let i = 0; i < da.length; i += 4){ const d = Math.abs(da[i] - db[i]) + Math.abs(da[i+1] - db[i+1]) + Math.abs(da[i+2] - db[i+2]);
          const g = (db[i] + db[i+1] + db[i+2]) / 3; if (d > 48){ n++; od.data[i] = 230; od.data[i+1] = 30; od.data[i+2] = 30; od.data[i+3] = 255; } else { od.data[i] = od.data[i+1] = od.data[i+2] = 255 - (255 - g) * .25; od.data[i+3] = 255; } }
        ox.putImageData(od, 0, 0); return { pct: Math.round(10000 * n / (w * h)) / 100, png: out.toDataURL('image/png').split(',')[1] };
      }, [A[k].toString('base64'), B[k].toString('base64')]);
      fs.writeFileSync(path.join(OUT, 'img', id + '-a.png'), A[k]); fs.writeFileSync(path.join(OUT, 'img', id + '-b.png'), B[k]);
      fs.writeFileSync(path.join(OUT, 'img', id + '-d.png'), Buffer.from(r.png, 'base64'));
      filas.push({ id, vp: vp.n, vista: k, pct: r.pct });
    }
  }
  await b.close(); s1.close(); s2.close();
  filas.sort((x, y) => y.pct - x.pct);
  fs.writeFileSync(path.join(OUT, 'resultado.json'), JSON.stringify(filas, null, 1));
  const esc = s => String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  // Página sin esqueleto propio (vale abierta en local y publicada como artifact); colores por tokens, claro y oscuro.
  const html = `<title>Cambios a la vista</title>
<meta name="claude:viewport-fit-sides" content="cover">
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Archivo:wdth,wght@75..100,500..850&display=swap">
<style>
/* Informe de revisión: cabecera corta, una fila plegable por pantalla, de más a menos cambio */
:root{--bg:#F2F5F8;--card:#FFFFFF;--ink:#0E2A3D;--mut:#4E6577;--line:#D6DEE5;--accent:#2E8BD8;--zero:#1A8A4A;--poco:#B26A0B;--mucho:#C62828;
  --display:"Archivo","Segoe UI",system-ui,sans-serif;--body:system-ui,"Segoe UI",Roboto,sans-serif}
@media (prefers-color-scheme:dark){:root:not([data-theme="light"]){--bg:#0B1620;--card:#13212D;--ink:#E4EDF4;--mut:#9DB2C2;--line:#253747;--accent:#5BAEF0;--zero:#5FD08E;--poco:#F0B055;--mucho:#FF8A80;color-scheme:dark}}
:root[data-theme="dark"]{--bg:#0B1620;--card:#13212D;--ink:#E4EDF4;--mut:#9DB2C2;--line:#253747;--accent:#5BAEF0;--zero:#5FD08E;--poco:#F0B055;--mucho:#FF8A80;color-scheme:dark}
body{background:var(--bg);color:var(--ink);font:15px/1.5 var(--body)}
main{max-width:1500px;margin:0 auto;padding-block:24px 40px;padding-left:max(16px,env(safe-area-inset-left,0px));padding-right:max(16px,env(safe-area-inset-right,0px));display:grid;gap:10px}
header{display:grid;gap:6px;margin-bottom:8px}
h1{font:800 26px/1.15 var(--display);font-variation-settings:"wdth" 88;margin:0;text-wrap:balance}
header p{color:var(--mut);margin:0;max-width:70ch}
.res{display:flex;flex-wrap:wrap;gap:8px}.res span{background:var(--card);border:1px solid var(--line);border-radius:999px;padding:3px 12px;font-size:13.5px;font-variant-numeric:tabular-nums}
details{background:var(--card);border:1px solid var(--line);border-radius:10px;padding:10px 14px}
summary{cursor:pointer;font-weight:650;display:flex;gap:12px;align-items:baseline;flex-wrap:wrap}
summary:focus-visible{outline:2px solid var(--accent);outline-offset:3px;border-radius:4px}
summary b{min-width:68px;font-variant-numeric:tabular-nums}.z{color:var(--zero)}.m{color:var(--poco)}.a{color:var(--mucho)}
.g{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:10px;margin-top:10px}.g figure{margin:0;min-width:0}
.g img{display:block;width:100%;max-width:100%;border:1px solid var(--line);border-radius:6px}.g figcaption{font-size:12.5px;color:var(--mut);margin-top:4px}
@media (max-width:700px){.g{grid-template-columns:1fr}}
</style>
<main>
<header><h1>Cambios a la vista · web publicada → rama nueva</h1>
<p>Misma app con los mismos datos de prueba y la misma hora (${HORA.toLocaleString('es-ES', { timeZone: 'Europe/Madrid' })}), en los 6 tamaños. En rojo, los puntos de la pantalla que cambian. Abiertas, las que cambian más de un 1 %.</p>
<div class="res"><span>${filas.length} pantallas</span><span>${filas.filter(f => f.pct > 0).length} cambian</span><span>${filas.filter(f => f.pct === 0).length} iguales</span></div></header>
${filas.map(f => `<details${f.pct >= 1 ? ' open' : ''}><summary><b class="${f.pct === 0 ? 'z' : f.pct < 1 ? 'm' : 'a'}">${f.pct.toLocaleString('es-ES')} %</b><span>${esc(f.vp)} · ${esc(f.vista)}${f.nota ? ' · ' + esc(f.nota) : ''}</span></summary>
<div class="g"><figure><img loading="lazy" src="img/${f.id}-a.png" alt="${esc(f.vp + ' ' + f.vista)}: publicada"><figcaption>Publicada</figcaption></figure><figure><img loading="lazy" src="img/${f.id}-b.png" alt="${esc(f.vp + ' ' + f.vista)}: nueva"><figcaption>Nueva</figcaption></figure><figure><img loading="lazy" src="img/${f.id}-d.png" alt="${esc(f.vp + ' ' + f.vista)}: diferencias"><figcaption>Diferencias</figcaption></figure></div></details>`).join('\n')}
</main>`;
  fs.writeFileSync(path.join(OUT, 'informe.html'), html);
  console.log('🟢 comparación visual: ' + filas.filter(f => f.pct > 0).length + ' de ' + filas.length + ' pantallas cambian');
  filas.filter(f => f.pct > 0).forEach(f => console.log('  ' + f.pct + ' % ' + f.vp + ' ' + f.vista + (f.nota ? ' (' + f.nota + ')' : '')));
})().catch(e => { console.error('🔴 la comparación visual no ha podido correr:', e); process.exit(1); });
