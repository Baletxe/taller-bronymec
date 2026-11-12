// Fase 2 · alta rápida de otros trabajos, con navegador y datos de PRUEBA (sin plan compartido: nada sale de la prueba).
// Comprueba: alta en pocos toques, Repetir rellena de un toque, Duplicar va al día siguiente, Pegar desde Excel añade las filas
// buenas y dice cuáles no entran, y los trabajos salen en el calendario. Uso: node manuales.js APP.html  (código 1 si algo falla)
const { chromium } = require('playwright'); const fs = require('fs');
const APP = process.argv[2]; if (!APP || !fs.existsSync(APP)) { console.error('Uso: node manuales.js APP.html'); process.exit(2); }
const HTML = fs.readFileSync(APP, 'utf8'), URL0 = 'http://prueba.localhost/';
(async () => {
  const fallos = [], bien = m => console.log('  🟢 ' + m), mal = m => { fallos.push(m); console.log('  🔴 ' + m); };
  const b = await chromium.launch(); const errs = [];
  const c = await b.newContext({ viewport: { width: 1280, height: 800 }, hasTouch: true, locale: 'es-ES', timezoneId: 'Europe/Madrid' });
  await c.route('**/*', r => new URL(r.request().url()).origin + '/' === URL0 ? r.fulfill({ status: 200, contentType: 'text/html; charset=utf-8', body: HTML }) : r.fulfill({ status: 404, body: '' }));
  await c.addInitScript(() => { try { localStorage.setItem('taller.resp', '1'); } catch(_){} });
  const p = await c.newPage(); p.on('pageerror', e => errs.push(e.message));
  await p.goto(URL0); await p.waitForFunction(() => document.getElementById('main'));
  await p.evaluate(() => { const x = document.querySelector('[data-pick="caf|todo"]'); if (x) x.click(); }); await p.waitForTimeout(300);
  await p.evaluate(() => [...document.querySelectorAll('[data-go="plan"]')].find(x => x.getClientRects().length).click()); await p.waitForTimeout(400);
  const items = () => p.evaluate(() => Object.values((JSON.parse(localStorage.getItem('taller.plan.v1') || '{}').items) || {}).filter(i => i.k === 'libre'));
  let toques = 0; const toca = async sel => { toques++; await p.click(sel); };
  const escribe = async (sel, v) => { toques++; await p.fill(sel, v); };

  console.log('1 · alta de un trabajo');
  await toca('[data-libre-new=""]'); await p.waitForSelector('#lD');
  await escribe('#lD', 'Casquillo PA6 Ø40'); await escribe('#lC', 'Lantier'); await escribe('#fQ', '50');
  await toca('[data-libre-save=""]'); await p.waitForTimeout(300);
  let L = await items();
  L.length === 1 && L[0].desc === 'Casquillo PA6 Ø40' && L[0].cli === 'Lantier' && L[0].qty === 50 ? bien('alta guardada con cliente y unidades') : mal('alta: ' + JSON.stringify(L));
  toques <= 5 ? bien('alta en ' + toques + ' toques') : mal('demasiados toques: ' + toques);
  (await p.$$eval('.cell .tc', xs => xs.some(x => x.textContent.includes('Casquillo PA6')))) ? bien('sale en el calendario') : mal('no sale en el calendario');

  console.log('2 · repetir de un toque');
  await p.click('[data-libre-new=""]'); await p.waitForSelector('[data-libre-rep]');
  await p.click('[data-libre-rep]');
  const f = await p.evaluate(() => ({ d: document.getElementById('lD').value, c: document.getElementById('lC').value, q: document.getElementById('fQ').value }));
  f.d === 'Casquillo PA6 Ø40' && f.c === 'Lantier' && f.q === '50' ? bien('Repetir rellena descripción, cliente y unidades') : mal('Repetir: ' + JSON.stringify(f));
  await p.click('[data-libre-save=""]'); await p.waitForTimeout(300);
  (await items()).length === 2 ? bien('segundo trabajo añadido') : mal('no se ha añadido el segundo');

  console.log('3 · duplicar');
  const id0 = (await items())[0].id, d0 = (await items())[0].d;
  await p.evaluate(id => { const x = document.querySelector('[data-id="' + id + '"], [data-open-item="' + id + '"]'); if (x) x.click(); }, id0); await p.waitForTimeout(300);
  if (await p.$('[data-libre-dup]')){
    await p.click('[data-libre-dup]'); await p.waitForSelector('#lD');
    (await p.inputValue('#lD')) === 'Casquillo PA6 Ø40' ? bien('la copia trae los datos') : mal('la copia viene vacía');
    await p.click('[data-libre-save=""]'); await p.waitForTimeout(300);
    L = await items(); const nuevo = L.find(i => i.id !== id0 && i.d > d0);
    L.length === 3 && nuevo ? bien('copia en un día posterior (' + nuevo.d + ')') : mal('duplicar: ' + JSON.stringify(L.map(i => i.d)));
  } else mal('no se ha podido abrir la ficha para duplicar');

  console.log('4 · pegar desde Excel');
  await p.click('[data-libre-new=""]'); await p.waitForSelector('.lpeg');
  await p.click('.lpeg summary');
  await p.fill('#lP', 'Cliente\tPedido\tQué hay que hacer\tUnidades\tEntrega\nTalleres Uno\tP-1\tPlaca POM 200x100\t20\t20/11/2026\nTalleres Dos\t\tUtillaje prueba\t3\t\nMalo\tP-3\t\t5\t21/11/2026\nMalo2\tP-4\tTapa\tmuchas\t\nMalo3\tP-5\tCuña\t4\t31/02/2026');
  await p.click('[data-libre-peg]'); await p.waitForTimeout(300);
  L = await items(); const t = await p.evaluate(() => (document.querySelector('.toast') || {}).textContent || '');
  L.length === 5 ? bien('entran las 2 filas buenas (y ninguna mala)') : mal('filas añadidas: ' + (L.length - 3));
  /fila 4.*fila 5.*fila 6/.test(t) ? bien('dice qué filas no entran y por qué') : mal('aviso: ' + t);
  const pl = L.find(i => i.desc === 'Placa POM 200x100'); pl && pl.ent === '2026-11-20' && pl.qty === 20 && pl.cli === 'Talleres Uno' ? bien('fecha dd/mm/aaaa y unidades bien leídas') : mal('fila pegada: ' + JSON.stringify(pl));

  errs.length ? mal('errores JS: ' + errs.join(' | ')) : bien('sin errores JS');
  await b.close();
  console.log(fallos.length ? '🔴 ' + fallos.length + ' fallo(s) en el alta rápida' : '🟢 alta rápida de otros trabajos: todo bien');
  process.exit(fallos.length ? 1 : 0);
})().catch(e => { console.error('🔴 la prueba no ha podido correr:', e); process.exit(1); });
