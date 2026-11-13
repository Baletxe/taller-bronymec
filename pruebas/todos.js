// v50 · Vista general del taller ("Todos"), con navegador y datos de PRUEBA (nada sale de la prueba).
// Comprueba: la portada abre con el TALLER entero y sus cifras son la suma de los clientes; en "Todos" se ven CAF y Talgo
// juntos, cada fila con su cliente; planificar, arrastrar y abrir fichas trabajan con la empresa de cada pieza (nunca se
// mezclan); al elegir un cliente solo se ve ese. Uso: node todos.js APP.html   (código 1 si algo falla)
const { chromium } = require('playwright'); const fs = require('fs');
const APP = process.argv[2]; if (!APP || !fs.existsSync(APP)) { console.error('Uso: node todos.js APP.html'); process.exit(2); }
const HTML = fs.readFileSync(APP, 'utf8'), URL0 = 'http://prueba.localhost/';
(async () => {
  const fallos = [], bien = m => console.log('  🟢 ' + m), mal = m => { fallos.push(m); console.log('  🔴 ' + m); };
  const b = await chromium.launch(); const errs = [];
  const c = await b.newContext({ viewport: { width: 1280, height: 800 }, locale: 'es-ES', timezoneId: 'Europe/Madrid' });
  await c.route('**/*', r => new URL(r.request().url()).origin + '/' === URL0 ? r.fulfill({ status: 200, contentType: 'text/html; charset=utf-8', body: HTML }) : r.fulfill({ status: 404, body: '' }));
  await c.addInitScript(() => { try { localStorage.setItem('taller.resp', '1'); } catch(_){} });
  const p = await c.newPage(); p.on('pageerror', e => errs.push(e.message));
  await p.goto(URL0); await p.waitForFunction(() => document.getElementById('main')); await p.waitForTimeout(300);
  const vista = async v => { await p.evaluate(v => { const xs = [...document.querySelectorAll('[data-go="' + v + '"]')].filter(x => x.getClientRects().length); (xs.find(x => x.closest('nav,.tabs,header')) || xs[0]).click(); }, v); await p.waitForTimeout(450); };
  const items = () => p.evaluate(() => Object.values(JSON.parse(localStorage.getItem('taller.plan.v1') || '{}').items || {}));

  console.log('1 · Portada (v53): FABRICACIÓN de toda la empresa, con sus clientes dentro y sin tarjetas repetidas');
  const pt = await p.evaluate(() => { const num = i => +((document.querySelectorAll('.pq-todo .pq-ks b')[i] || {}).textContent || 'NaN').replace(/\./g, '');
    const cli = e => { const c = document.querySelector('.pq-todo .pq-cli.' + e); return c ? [+c.dataset.n, +c.dataset.r] : [NaN, NaN]; };
    return { pqs: [...document.querySelectorAll('.pq')].map(x => [...x.classList].find(k => /^pq-(todo|caf|talgo|otros)$/.test(k))), nom: (document.querySelector('.pq-todo .pq-name') || {}).textContent,
      ab: [num(0), num(1), num(2)], caf: cli('caf'), talgo: cli('talgo') }; });
  pt.pqs.join() === 'pq-todo' ? bien('solo la tarjeta de la empresa: sin CAF ni Talgo repetidos debajo') : mal('tarjetas de la portada: ' + pt.pqs);
  pt.nom === 'FABRICACIÓN' ? bien('la tarjeta se llama FABRICACIÓN (toda la empresa)') : mal('nombre: ' + pt.nom);
  pt.ab[0] === pt.caf[0] + pt.talgo[0] ? bien('líneas abiertas = CAF + Talgo (' + pt.ab[0] + ' = ' + pt.caf[0] + ' + ' + pt.talgo[0] + ')') : mal('líneas: ' + JSON.stringify(pt));
  pt.ab[1] === pt.caf[1] + pt.talgo[1] ? bien('con retraso = CAF + Talgo (' + pt.ab[1] + ' = ' + pt.caf[1] + ' + ' + pt.talgo[1] + ')') : mal('retraso: ' + JSON.stringify(pt));
  await p.click('.pq-todo .pq-cli.talgo'); await p.waitForTimeout(450);
  const ct = await p.evaluate(() => ({ emp: document.documentElement.dataset.emp, v: (document.querySelector('nav [aria-current]') || {dataset: {}}).dataset.go }));
  ct.emp === 'talgo' && ct.v === 'hoy' ? bien('el acceso Talgo de la tarjeta entra en Talgo (lo que hacía su tarjeta de abajo)') : mal('acceso Talgo: ' + JSON.stringify(ct));
  await p.evaluate(() => { sessionStorage.removeItem('taller.elegido'); }); await p.reload(); await p.waitForFunction(() => document.querySelector('.pq')); await p.waitForTimeout(300);

  console.log('2 · En "Todos" se ven los dos clientes, cada fila con el suyo');
  await p.click('[data-pick="todo|todo"]'); await p.waitForTimeout(400);
  const emp0 = await p.evaluate(() => document.documentElement.dataset.emp);
  emp0 === 'todo' ? bien('al entrar por el taller, la app está en Todos') : mal('emp al entrar: ' + emp0);
  await vista('pedidos');
  const ped = await p.evaluate(() => { const rs = [...document.querySelectorAll('.pl[data-open-lin]')]; return { n: rs.length, caf: rs.filter(r => r.dataset.emp === 'caf').length, talgo: rs.filter(r => r.dataset.emp === 'talgo').length,
    tags: rs.filter(r => r.querySelector('.etag')).length, tagOk: rs.every(r => { const t = r.querySelector('.etag'); return t && t.classList.contains(r.dataset.emp); }) }; });
  ped.caf > 0 && ped.talgo > 0 && ped.tags === ped.n && ped.tagOk ? bien('Pedidos: ' + ped.caf + ' de CAF y ' + ped.talgo + ' de Talgo, todas con su etiqueta correcta') : mal('pedidos en Todos: ' + JSON.stringify(ped));
  for (const e of ['caf', 'talgo']){ // tocar una línea de cada cliente abre su ficha (fallaba en Todos antes de publicar la v50)
    const r = await p.evaluate(e => { const x = document.querySelector('.pl[data-open-lin][data-emp="' + e + '"]'); if (!x) return null; const d = x.querySelector('b:not(.etag)') ; x.click(); return x.dataset.openLin; }, e); await p.waitForTimeout(350);
    const h = await p.evaluate(() => { const s = document.querySelector('.sheet'); return s ? (s.querySelector('.etag') || {}).textContent || '?' : null; });
    h && h.toLowerCase() === e ? bien('tocar una línea de ' + e.toUpperCase() + ' abre su ficha, con su cliente') : mal('abrir línea de ' + e + ': ' + h);
    await p.keyboard.press('Escape'); await p.waitForTimeout(200); }
  await p.click('[data-emp-sel="caf"]'); await p.waitForTimeout(400);
  const soloCaf = await p.evaluate(() => { const rs = [...document.querySelectorAll('.pl[data-open-lin]')]; return { n: rs.length, otros: rs.filter(r => r.dataset.emp !== 'caf').length, tags: rs.filter(r => r.querySelector('.etag')).length }; });
  soloCaf.n > 0 && soloCaf.otros === 0 && soloCaf.n === ped.caf ? bien('al elegir CAF solo se ve CAF (' + soloCaf.n + ' líneas)') : mal('solo CAF: ' + JSON.stringify(soloCaf));
  await p.click('[data-emp-sel="todo"]'); await p.waitForTimeout(400);

  console.log('3 · Planificar y abrir fichas en "Todos" respetan la empresa de cada pieza');
  await vista('plan');
  const tal = await p.evaluate(() => { const x = document.querySelector('.bl-list .tc[data-drag="art"][data-emp="talgo"]'); return x ? x.dataset.key : null; });
  const cel = await p.evaluate(() => { const x = [...document.querySelectorAll('[data-cell]')].find(c => c.getClientRects().length && c.getBoundingClientRect().top > 0 && c.getBoundingClientRect().bottom < innerHeight); return x ? x.dataset.cell : null; });
  if (!tal || !cel) mal('no hay pieza de Talgo por planificar o celda visible: ' + tal + ' ' + cel);
  else {
    const src = await p.$('.bl-list .tc[data-drag="art"][data-emp="talgo"]'); await src.scrollIntoViewIfNeeded(); const sb = await src.boundingBox();
    const db = await (await p.$('[data-cell="' + cel + '"]')).boundingBox();
    await p.mouse.move(sb.x + 20, sb.y + 15); await p.mouse.down(); await p.mouse.move(sb.x + 60, sb.y + 40, { steps: 5 }); await p.mouse.move(db.x + db.width / 2, db.y + db.height / 2, { steps: 15 }); await p.mouse.up(); await p.waitForTimeout(500);
    const it = (await items()).find(i => i.akey === tal);
    it && it.emp === 'talgo' && it.m + '|' + it.d === cel ? bien('arrastrar una pieza de Talgo crea su ficha de Talgo (' + it.qty + ' uds en ' + cel + ')') : mal('arrastrar Talgo: ' + JSON.stringify(it));
  }
  // abrir una pieza de CAF desde Por planificar y planificarla desde su ficha
  const cafKey = await p.evaluate(() => { const x = document.querySelector('.bl-list .tc[data-drag="art"][data-emp="caf"]'); if (!x) return null; x.click(); return x.dataset.key; }); await p.waitForTimeout(400);
  const fic = await p.evaluate(() => { const s = document.querySelector('.sheet'); return s ? { tag: (s.querySelector('.etag') || {}).textContent || '', h: (s.querySelector('h2') || {}).textContent || '' } : null; });
  fic && /CAF/.test(fic.tag) ? bien('la ficha de una pieza de CAF dice CAF: ' + fic.h) : mal('ficha CAF: ' + JSON.stringify(fic));
  const bt = await p.$('.sheet [data-plan-art]');
  if (bt){ await bt.click(); await p.waitForTimeout(500);
    const it2 = (await items()).find(i => i.akey === cafKey && i.k === 'art');
    it2 && it2.emp === 'caf' ? bien('planificar desde la ficha crea la ficha de CAF') : mal('planificar CAF: ' + JSON.stringify(it2));
  } else mal('la ficha no tiene botón de planificar');
  // la misma clave puede existir en los dos clientes: nunca se mezclan
  const mezcla = (await items()).filter(i => i.k !== 'libre' && !['caf', 'talgo'].includes(i.emp));
  mezcla.length === 0 ? bien('ninguna ficha queda sin empresa ni con "todo"') : mal('fichas con empresa rara: ' + JSON.stringify(mezcla));

  console.log('4 · Hoy, Artículos y el resto en "Todos"');
  await vista('hoy');
  const hoy = await p.evaluate(() => (document.querySelector('.hoy-h h1') || {}).textContent || '');
  /^Taller · /.test(hoy) ? bien('Hoy: "' + hoy + '"') : mal('título de Hoy: ' + hoy);
  // v51 · la misma cifra en la portada, en Hoy y en la lista a la que lleva
  const hf = await p.evaluate(() => { const x = document.querySelector('.hoy-h .st[data-af="fab"]'); if (!x) return null; const n = +x.querySelector('b').textContent.replace(/\./g, ''), k = +(/·\s*(\d+)/.exec(x.textContent) || [])[1]; x.click(); return {n, k}; }); await p.waitForTimeout(450);
  const lf = await p.evaluate(() => [...document.querySelectorAll('[data-open-art]')].filter(x => x.getClientRects().length).length);
  hf && hf.n === pt.ab[2] && hf.k === lf ? bien('uds a fabricar: portada ' + pt.ab[2] + ' = Hoy ' + hf.n + ', y lleva a ' + lf + ' artículos, los que dice') : mal('uds a fabricar: portada ' + pt.ab[2] + ', Hoy ' + JSON.stringify(hf) + ', lista ' + lf);
  await vista('articulos');
  const art = await p.evaluate(() => { const cs = [...document.querySelectorAll('[data-open-art]')].filter(x => x.getClientRects().length); return { n: cs.length, emps: [...new Set(cs.map(x => x.dataset.emp))] }; });
  art.emps.includes('caf') && art.emps.includes('talgo') ? bien('Artículos junta las piezas de CAF y de Talgo (' + art.n + ')') : mal('artículos: ' + JSON.stringify(art));
  for (const v of ['talleres', 'semana', 'ofi', 'msg']){ await vista(v); }
  const hs = await p.evaluate(() => document.scrollingElement.scrollWidth > innerWidth); hs ? mal('scroll horizontal') : bien('sin scroll horizontal');
  // al recargar se queda en Todos
  await p.reload(); await p.waitForFunction(() => document.getElementById('main')); await p.waitForTimeout(300);
  const tras = await p.evaluate(() => localStorage.getItem('taller.emp')); tras === 'todo' ? bien('el aparato recuerda Todos') : mal('recordado: ' + tras);

  console.log('5 · Portada: los otros trabajos tienen su tarjeta');
  await p.evaluate(() => { const pl = JSON.parse(localStorage.getItem('taller.plan.v1')); const d = new Date(); const k = x => { const y = new Date(d); y.setDate(y.getDate() + x); return y.getFullYear() + '-' + String(y.getMonth() + 1).padStart(2, '0') + '-' + String(y.getDate()).padStart(2, '0'); };
    const lib = (id, desc, cli, ent, qty) => ({id, k: 'libre', m: 'h1', d: k(1), qty, done: false, ord: 1, nota: '', desc, cli, ref: '', ent, key: id, akey: 'libre:' + id, emp: null, ts: new Date().toISOString()});
    pl.items.ot1 = lib('ot1', 'Casquillo Lantier', 'Lantier', k(-3), 40); pl.items.ot2 = lib('ot2', 'Muestra MJF', 'Interno', k(10), 5);
    localStorage.setItem('taller.plan.v1', JSON.stringify(pl)); sessionStorage.removeItem('taller.elegido'); });
  await p.reload(); await p.waitForFunction(() => document.querySelector('.pq')); await p.waitForTimeout(300);
  const ot = await p.evaluate(() => { const c = document.querySelector('.pq-todo .pq-cli.otros'); return c ? [+c.dataset.n, +c.dataset.r, c.textContent] : null; });
  ot && ot[0] === 2 && ot[1] === 1 ? bien('acceso Otros en la tarjeta de la empresa: 2 trabajos, 1 con retraso') : mal('acceso otros: ' + JSON.stringify(ot));
  await p.click('.pq-todo .pq-cli.otros'); await p.waitForTimeout(500);
  const fo = await p.evaluate(() => ({ v: document.querySelector('#dock [aria-current], nav [aria-current]') ? document.querySelector('nav [aria-current]').dataset.go : '', filas: [...document.querySelectorAll('#otros .pl')].map(x => x.textContent.replace(/\s+/g, ' ')), top: (document.getElementById('otros') || {getBoundingClientRect: () => ({top: 9999})}).getBoundingClientRect().top }));
  fo.v === 'pedidos' && fo.filas.length === 1 && /Casquillo Lantier/.test(fo.filas[0]) && fo.top < 800 - 120 ? bien('"con retraso" lleva a Pedidos, a la lista de otros trabajos (a la vista), solo el retrasado') : mal('otros desde la portada: ' + JSON.stringify(fo));

  console.log('6 · Calendario de la empresa (v53): por sección y máquina, cifras que cuadran y casillas que llevan a su día');
  await p.evaluate(() => { sessionStorage.removeItem('taller.elegido'); }); await p.reload(); await p.waitForFunction(() => document.querySelector('.cg')); await p.waitForTimeout(300);
  const cg = await p.evaluate(() => { const H = s => +String(s || '').replace(/[^\d,]/g, '').replace(',', '.') || 0;
    const secs = [...document.querySelectorAll('.cg-g')].map(g => g.classList[1]);
    const maqs = [...document.querySelectorAll('.cg-mn span')].map(x => x.textContent);
    let cuadra = true, casillas = 0; document.querySelectorAll('.cg-g').forEach(g => { const tot = [...g.querySelectorAll('.cg-sr .cg-c')], ms = [...g.querySelectorAll('.cg-mr')];
      tot.forEach((c, i) => { casillas++; const suma = ms.reduce((s, r) => s + H((r.querySelectorAll('.cg-c')[i].querySelector('b') || {}).textContent), 0); if (Math.abs(suma - H((c.querySelector('b') || {}).textContent)) > 0.6) cuadra = false; }); });
    const llena = [...document.querySelectorAll('.cg-mr .cg-c')].find(c => c.querySelector('b'));
    return { secs, maqs, cuadra, casillas, sinEtiqueta: [...document.querySelectorAll('.cg-c')].filter(c => !c.getAttribute('aria-label')).length, llena: llena ? llena.dataset.cg : null, hoy: document.querySelectorAll('.cg-d.hoy').length }; });
  cg.secs.join() === 'fresa,torno,secc' ? bien('tres secciones: Fresa, Torno y Seccionadora') : mal('secciones: ' + cg.secs);
  !cg.maqs.some(n => /subcontrat|aditiv/i.test(n)) && cg.maqs.length >= 5 ? bien('máquinas: ' + cg.maqs.join(', ') + ' (sin Subcontrata ni Aditiva)') : mal('máquinas: ' + cg.maqs);
  cg.cuadra ? bien('cada sección suma sus máquinas, día a día (' + cg.casillas + ' casillas)') : mal('las horas de la sección no cuadran con sus máquinas');
  !cg.sinEtiqueta ? bien('todas las casillas dicen qué son (lector de pantalla y ratón)') : mal(cg.sinEtiqueta + ' casillas sin etiqueta');
  cg.hoy === 1 ? bien('hoy marcado') : mal('hoy: ' + cg.hoy);
  if (cg.llena){ await p.click('.cg-mr .cg-c[data-cg="' + cg.llena + '"]'); await p.waitForTimeout(500);
    const r = await p.evaluate(() => ({ v: (document.querySelector('nav [aria-current]') || {dataset: {}}).dataset.go, sec: document.documentElement.dataset.sec || localStorage.getItem('taller.sec'), cal: document.body.classList.contains('cal') }));
    const [, sec] = cg.llena.split('|');
    r.v === 'plan' && r.cal && r.sec === sec ? bien('tocar una casilla abre la Planificación de ' + sec + ' en ese día') : mal('casilla: ' + JSON.stringify(r) + ' esperado ' + cg.llena); }
  else mal('no hay ninguna casilla con fichas para probar el clic');

  errs.length ? mal('errores JS: ' + errs.join(' | ')) : bien('sin errores JS');
  await b.close();
  console.log(fallos.length ? '🔴 ' + fallos.length + ' fallo(s) en la vista general' : '🟢 vista general del taller: todo bien');
  process.exit(fallos.length ? 1 : 0);
})().catch(e => { console.error('🔴 la prueba no ha podido correr:', e); process.exit(1); });
