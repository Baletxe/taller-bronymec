// Saca del panel (copia del equipo, con los datos dentro) SOLO lo que necesita el taller: pedidos,
// cantidades, fechas, stock y estado. Nada de precios, facturación, contratos ni previsión.
// Uso: node taller_datos.js Panel_CAF_equipo.html taller_datos.json
const { chromium } = require('playwright-core'); const fs = require('fs'); const path = require('path');
(async () => {
  const [src, out] = process.argv.slice(2);
  let html = fs.readFileSync(src, 'utf8');
  const a = "\nrender();\n\n(async () => {";
  if (html.split(a).length !== 2) throw new Error('No encuentro el punto de enganche del panel');
  html = html.replace(a, "\nwindow.__TL = () => ({L, DATA, MAESTRO: (typeof MAESTRO!=='undefined'?MAESTRO:{}), FC: (typeof FC!=='undefined'?FC:null), effCod: (typeof fcEffCod!=='undefined'?fcEffCod:null), effCruce: (typeof fcEffCruce!=='undefined'?fcEffCruce:null), TALLER: (typeof S!=='undefined'?S.taller:null)});" + a);
  const tmp = path.join(path.dirname(path.resolve(out)), '.taller_tmp.html'); fs.writeFileSync(tmp, html);
  const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium', args: ['--no-sandbox'] });
  const p = await (await b.newContext({ locale: 'es-ES', timezoneId: 'Europe/Madrid' })).newPage();
  const errs = []; p.on('pageerror', e => errs.push(e.message));
  await p.route(/fonts\./, r => r.abort());
  await p.goto('file://' + tmp);
  await p.waitForFunction(() => window.__cafListo && window.__cafListo(), null, { timeout: 30000 });
  await p.waitForTimeout(500);
  const r = await p.evaluate(() => {
    const { L, DATA } = window.__TL();
    const iso = d => { const x = new Date(d); return x.getFullYear() + '-' + String(x.getMonth() + 1).padStart(2, '0') + '-' + String(x.getDate()).padStart(2, '0'); };
    const lineas = L.filter(l => l.open).map(l => ({
      id: l.id, pedido: l.pedido, linea: l.linea, planta: l.planta, empresa: l.empresa,
      ref: l.ref || '', cod: l.cod || '', cruce: l.cruce || '', desc: l.desc || '',
      pedida: l.pedida, entregada: l.entregada || 0, pend: l.pend, asig: l.asig || 0, env: l.env || 0,
      stock: l.stock == null ? null : Math.max(0, l.stock), ubic: l.ubic || '',
      serv: l.serv, fecha: iso(l.f), fechaCAF: l.fechaCAF || null, pactada: (l.fechaPactada && l.fechaPactada.fecha) || null,
      late: !!l.late, dias: l.dias
    }));
    const T = window.__TL();
    let prev = null;
    if (T.FC && T.FC.articulos){
      prev = { fecha: T.FC.generado || null, caf: T.FC.actualizado_caf || null, items: T.FC.articulos.map(a => {
        let cod = '', cr = a.cruce;
        try { cod = T.effCod ? (T.effCod(a) || '') : (a.cod || ''); cr = T.effCruce ? T.effCruce(a) : a.cruce; } catch(_){ cod = a.cod || ''; }
        const sem = {}; Object.entries(a.porSemana || {}).forEach(([k,v]) => { if (v > 0) sem[k] = Math.round(v); });
        const c2 = cr === 'OK' ? cod : '', st = c2 && DATA.stock && DATA.stock[c2];
        return { cod: c2, ref: a.ref || '', desc: a.desc || '', sem, stock: st ? Math.max(0, st[0]) : null, ubic: st ? (st[1] || '') : '' };
      }).filter(x => Object.keys(x.sem).length) };
    }
    /* v13: taller de cada pieza decidido en el panel (colección taller): [emp|clave, fresa|torno|sub, ts]. Sin descripciones. */
    const taller = []; Object.entries(T.TALLER || {}).forEach(([id, d]) => { if (!d || id === '_reglas' || !d.key || !/^(fresa|torno|sub)$/.test(d.t)) return; taller.push([(d.emp || 'caf') + '|' + d.key, d.t, +d.ts || 0]); });
    return { lineas, export: DATA.export, stock_fecha: DATA.stock_fecha || null, prev, taller };
  });
  const meta = JSON.parse(html.match(/window\.__EQUIPO__ = (\{.*?\});/)[1]);
  const res = { ts: meta.ts, export: r.export, stock_fecha: r.stock_fecha, lineas: r.lineas, prev: r.prev, taller: r.taller };
  fs.writeFileSync(out, JSON.stringify(res));
  fs.unlinkSync(tmp);
  console.log(JSON.stringify({ lineas: r.lineas.length, taller: r.taller.length, prev: r.prev ? r.prev.items.length : 0, export: r.export, stock: r.stock_fecha, ts: meta.ts, errs }));
  await b.close();
})();
