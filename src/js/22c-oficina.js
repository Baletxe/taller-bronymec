/* ================= OFICINA (Fase 3) =================
   Ventas: en qué estado está cada pedido y cuándo se prevé que salga, sacado del calendario del taller (nada se estima).
   Gerencia: cumplimiento, retrasos, carga, terminado pendiente de almacén y otros trabajos, con su evolución día a día.
   Solo en Total (como Talleres). La evolución sale de una foto diaria cifrada en taller-plan/hist.json. */
S.of = LS.get('taller.of') === 'ger' ? 'ger' : 'ven'; S.vf = 'todo';
I.ofi = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 20V9l8-5 8 5v11"/><path d="M9 20v-6h6v6"/><path d="M8 11h.01M16 11h.01"/></svg>';

/* Previsión de una empresa: a cada línea abierta se le asignan las fichas del calendario de su pieza, por orden de fecha
   (primero las ya hechas). La fecha prevista es el día de la última ficha que la completa. Si no se completa, se dice cuánto falta. */
function prevision(eid){
  const M = MOD[eid], out = {};
  M.ARTS.forEach(a => {
    const fichas = Object.values(PLAN.items).filter(it => it.k !== 'libre' && itEmp(it) === eid && it.akey === a.key)
      .map(it => ({d: it.d, q: it.qty, done: !!it.done, lin: it.k === 'lin' ? it.key : null})).sort((x, y) => (y.done - x.done) || (x.d < y.d ? -1 : x.d > y.d ? 1 : 0));
    const fuera = FUERA[tipoArt(a)];
    a.lines.filter(l => !l.term).sort((x, y) => x.d - y.d).forEach(l => {
      let falta = l.falta, ult = null, hechas = 0, plan = 0;
      // primero las fichas de esta línea, luego las de la pieza
      [fichas.filter(f => f.lin === l.id), fichas.filter(f => !f.lin)].forEach(grupo => grupo.forEach(f => {
        if (falta <= 0 || f.q <= 0) return; const t = Math.min(f.q, falta); f.q -= t; falta -= t;
        if (f.done) hechas += t; else { plan += t; if (!ult || f.d > ult) ult = f.d; } }));
      let e;
      if (l.falta === 0) e = l.emp !== 'talgo' && l.serv === 'listo' ? {k: 'listo', t: 'En stock, lista para salir'} : {k: 'listo', t: 'Cubierta con stock'};
      else if (falta === 0 && !ult) e = {k: 'hecho', t: 'Fabricada, falta pasar a almacén'};
      else if (falta === 0) e = {k: 'plan', t: 'Planificada'};
      else if (fuera) e = {k: 'fuera', t: tipoArt(a) === 'adit' ? 'Aditiva (sin calendario)' : 'Subcontrata (sin calendario)'};
      else if (plan || hechas) e = {k: 'parcial', t: 'Planificadas ' + nf(plan + hechas) + ' de ' + nf(l.falta)};
      else e = {k: 'sin', t: 'Sin planificar'};
      const sale = e.k === 'plan' ? pd(ult) : null;
      out[l.id] = Object.assign(e, {sale, riesgo: !!sale && sale > l.d && !l.late, falta, ult: ult ? pd(ult) : null});
    });
  });
  return out;
}
const PREV_C = {k: null, v: null};
function previsiones(){ const k = JSON.stringify([Object.keys(PLAN.items).length, PLAN.upd, HOY.getTime(), S.sec]); if (PREV_C.k !== k){ PREV_C.k = k; PREV_C.v = {}; EIDS.forEach(e => { PREV_C.v[e] = prevision(e); }); } return PREV_C.v; }

/* Ventas: un pedido = empresa + pedido. */
function ventasPedidos(){
  const P = previsiones(), g = {};
  EIDS.forEach(e => MOD[e].LINEAS.forEach(l => { if (l.term && S.vf !== 'listo') return; if (!secLin(l)) return;
    const pv = l.term ? {k: 'hecho', t: 'Terminada en taller, pendiente de almacén', sale: null, riesgo: false} : P[e][l.id]; if (!pv) return;
    const k = e + '|' + l.pedido, o = g[k] || (g[k] = {k, emp: e, pedido: l.pedido, planta: l.planta, ls: []}); o.ls.push(Object.assign({l}, pv)); }));
  return Object.values(g).map(o => { o.ls.sort((a, b) => a.l.d - b.l.d); o.d = o.ls[0].l.d; o.late = o.ls.some(x => x.l.late);
    o.riesgo = o.ls.some(x => x.riesgo); o.sin = o.ls.some(x => x.k === 'sin' || x.k === 'parcial'); o.listo = o.ls.every(x => x.k === 'listo' || x.k === 'hecho');
    const sales = o.ls.map(x => x.sale).filter(Boolean); o.sale = o.ls.every(x => x.sale || x.k === 'listo' || x.k === 'hecho') && sales.length ? new Date(Math.max(...sales)) : null;
    o.txt = [empN(o.emp), o.pedido, o.planta].concat(o.ls.map(x => [x.l.desc, x.l.cod, x.l.ref].join(' '))).join(' '); return o; })
    .sort((a, b) => a.d - b.d);
}
function ventasFiltro(xs, f){ return f === 'late' ? xs.filter(o => o.late) : f === 'riesgo' ? xs.filter(o => o.riesgo) : f === 'sin' ? xs.filter(o => o.sin) : f === 'listo' ? xs.filter(o => o.listo) : xs; }
function vVentas(){
  const todos = ventasPedidos().filter(o => casa(o.txt)), xs = ventasFiltro(todos, S.vf);
  const n = f => ventasFiltro(todos, f).length;
  const ch = (k, t) => `<button class="chip" data-vf="${k}" aria-pressed="${S.vf === k}">${t} <b class="num">${n(k)}</b></button>`;
  const fila = x => { const l = x.l, u = urg(l.d, l.late);
    return `<button class="vt-l" data-open-lin="${esc(l.id)}" data-emp="${esc(l.emp)}"><span class="dt ${u}">${dS(l.d)}<small>${l.late ? Math.abs(l.dias || 0) + ' d tarde' : 'entrega'}</small></span>
      <span class="vt-d"><b>L${l.linea} · ${esc(l.desc)}</b><span class="mut">${esc(l.cod || 'sin código')} · ${nf(l.pend)} uds</span></span>
      <span class="vt-e ${x.k}${x.riesgo ? ' riesgo' : ''}"><i></i>${esc(x.t)}${x.sale ? `<small>sale el ${diaCorto(x.sale)}${x.riesgo ? ' · después de la entrega' : ''}</small>` : x.ult ? `<small>hasta el ${diaCorto(x.ult)}</small>` : ''}</span></button>`; };
  const body = xs.slice(0, 120).map(o => `<section class="vt-p ${o.late ? 'late' : o.riesgo ? 'riesgo' : o.listo ? 'ok' : ''}"><h4 class="lkh" data-lk="vq" data-k="${esc(o.pedido)}" role="button" tabindex="0" title="Ver solo este pedido"><span>${etag(o.emp)}<b>Pedido ${esc(o.pedido)}</b> <span class="mut">${esc(o.planta)}</span></span>
      <span class="vt-s">${o.listo ? 'Todo listo' : o.sale ? 'Sale el <b>' + diaCorto(o.sale) + '</b>' : o.sin ? 'Falta planificar' : 'Sin fecha'}</span></h4>${o.ls.map(fila).join('')}</section>`).join('');
  return `<div class="vt-c"><div class="chips">${ch('todo', 'Todos')}${ch('late', 'Con retraso')}${ch('riesgo', 'Saldrán tarde')}${ch('sin', 'Falta planificar')}${ch('listo', 'Listos para salir')}</div>
    <p class="note">La fecha de salida es el día de la última ficha del calendario que completa la línea. Busca por cliente, planta, pedido, pieza o código arriba.</p>
    ${body || '<div class="box"><div class="empty">Ningún pedido con este filtro.</div></div>'}${xs.length > 120 ? `<div class="note">y ${xs.length - 120} pedidos más: busca arriba para verlos.</div>` : ''}${ventasOtrosHTML()}</div>`;
}
function ventasOtrosHTML(){
  const fin = o => o.its.filter(i => !i.done).map(i => i.d).sort().pop();
  const xs = otrosFiltro('todo').filter(o => casa([o.desc, o.cli, o.ref].join(' ')) && (S.vf === 'late' ? o.late : S.vf === 'listo' || S.vf === 'sin' ? false : S.vf === 'riesgo' ? !o.late && !!o.d && pd(fin(o)) > o.d : true));
  if (!xs.length) return '';
  return `<section class="vt-p"><h4><span><b>Otros trabajos</b> <span class="mut">fuera de ${EIDS.map(e => esc(empN(e))).join(' y ')}</span></span><span class="vt-s tlk" data-lk="otros" data-f="todo" role="button" tabindex="0">${xs.length} por hacer</span></h4>${xs.map(o => {
    return `<button class="vt-l" data-open-item="${esc(o.abre)}"><span class="dt ${o.late ? 'late' : o.d ? urg(o.d, false) : 'ok'}">${o.d ? dS(o.d) : 'Sin fecha'}<small>${o.late ? Math.abs(diasA(o.d)) + ' d tarde' : 'entrega'}</small></span>
      <span class="vt-d"><b>${esc(o.desc)}</b><span class="mut">${esc(o.cli || 'Otro cliente')}${o.ref ? ' · ' + esc(o.ref) : ''} · ${nf(o.falta)} uds</span></span>
      <span class="vt-e plan"><i></i>Planificado<small>sale el ${diaCorto(pd(fin(o)))}</small></span></button>`; }).join('')}</section>`;
}

/* ---------- Gerencia: indicadores de hoy y su evolución ---------- */
function indicadores(){
  const sec0 = S.sec; S.sec = 'todo';
  try {
    const P = previsiones(), D = semanaDatos(lunes(HOY)), lim = addD(HOY, 14);
    const late = {}, med = {}; let ab = 0, riesgo = 0, sin14 = 0, termPend = 0, termU = 0;
    EIDS.forEach(e => { const ls = MOD[e].LINEAS.filter(l => !l.term), lt = ls.filter(l => l.late); ab += ls.length; late[e] = lt.length;
      med[e] = lt.length ? Math.round(lt.reduce((s, l) => s + Math.abs(l.dias || diasA(l.d)), 0) / lt.length) : 0;
      ls.forEach(l => { const pv = P[e][l.id]; if (!pv) return; if (pv.riesgo) riesgo++; if ((pv.k === 'sin' || pv.k === 'parcial') && l.d < lim) sin14++; });
      MOD[e].LINEAS.forEach(l => { if (l.term || (e !== 'talgo' && l.serv === 'listo')){ termPend++; termU += l.pend || 0; } }); });
    const cg = {}; ['fresa', 'torno', 'secc'].forEach(t => { const ms = maqTaller().filter(m => m.t === t); if (!ms.length) return; let h = 0, c = 0;
      for (let i = 0; i < 14; i++){ const d = addD(HOY, i); if (d.getDay() === 0) continue; const x = carga(ms, iso(d)); h += x.h; c += x.cap; } cg[t] = c ? Math.round(h / c * 100) : 0; });
    const ot = otrosFiltro('todo');
    return {late, med, lateT: Object.values(late).reduce((s, x) => s + x, 0), ab, riesgo, sin14, termPend, termU, carga: cg, cumple: D.cumple, uh: D.uh, u: D.u, otros: ot.length, otrosLate: ot.filter(o => o.late).length};
  } finally { S.sec = sec0; }
}
let HIST = (() => { try { const o = JSON.parse(LS.get('taller.hist.v1') || 'null'); return o && typeof o === 'object' && o.d ? o : {v: 1, d: {}}; } catch(_){ return {v: 1, d: {}}; } })();
function sparkHTML(clave, f, inv){
  const ks = Object.keys(HIST.d).sort().slice(-60), vs = ks.map(k => f(HIST.d[k])).filter(v => typeof v === 'number' && isFinite(v));
  if (vs.length < 2) return `<span class="spk-n">La evolución empieza a verse con dos días de fotos${ks.length ? ' (hay ' + ks.length + ')' : ''}</span>`;
  const mx = Math.max(...vs), mn = Math.min(...vs), w = 120, h = 30, r = mx - mn || 1;
  const pts = vs.map((v, i) => (i / (vs.length - 1) * w).toFixed(1) + ',' + (h - 3 - (v - mn) / r * (h - 6)).toFixed(1)).join(' ');
  const d = vs[vs.length - 1] - vs[0], bien = inv ? d <= 0 : d >= 0;
  return `<svg class="spk ${d === 0 ? '' : bien ? 'g' : 'r'}" viewBox="0 0 ${w} ${h}" role="img" aria-label="Evolución en ${vs.length} días: de ${vs[0]} a ${vs[vs.length - 1]}"><polyline points="${pts}"/></svg><span class="spk-n">${vs.length} días: de ${vs[0]} a ${vs[vs.length - 1]}</span>`;
}
function vGerencia(){
  const X = indicadores(), cs = X.carga;
  const kpi = (cls, attrs, v, suf, t, em, sp) => `<button class="sn lkh ${cls}" ${attrs}><b class="num">${v}<small>${suf || ''}</small></b><span>${t}</span><em>${em}</em><span class="spk-w">${sp}</span></button>`;
  return `<div class="sn-g ger">
    ${kpi(X.cumple == null ? '' : X.cumple >= 90 ? 'g' : X.cumple < 70 ? 'r' : '', 'data-go="semana"', X.cumple == null ? '—' : X.cumple, X.cumple == null ? '' : '%', 'cumplimiento del plan', 'fichas hechas de las que tocaban esta semana', sparkHTML('cumple', x => x.cumple))}
    ${kpi(X.lateT ? 'r' : 'g', 'data-go="pedidos" data-pf="late"', X.lateT, '', 'líneas con retraso', EIDS.map(e => esc(empN(e)) + ' ' + X.late[e] + (X.late[e] ? ' (media ' + X.med[e] + ' d)' : '')).join(' · ') + ' · de ' + X.ab + ' abiertas', sparkHTML('late', x => x.lateT, true))}
    ${kpi(X.riesgo ? 'a' : 'g', 'data-of="ven" data-vf="riesgo"', X.riesgo, '', 'saldrán tarde según el plan', 'planificadas después de su entrega', sparkHTML('riesgo', x => x.riesgo, true))}
    ${kpi(X.sin14 ? 'a' : 'g', 'data-of="ven" data-vf="sin"', X.sin14, '', 'sin planificar, entrega en 14 días', 'líneas que aún no están en el calendario', sparkHTML('sin14', x => x.sin14, true))}
    ${kpi('', 'data-of="ven" data-vf="listo"', X.termPend, '', 'terminado pendiente de almacén', nf(X.termU) + ' uds terminadas en taller o en stock, sin salir', sparkHTML('term', x => x.termPend, true))}
    ${kpi(X.otrosLate ? 'r' : '', 'data-lk="otros" data-f="' + (X.otrosLate ? 'late' : 'todo') + '"', X.otros, '', 'otros trabajos por hacer', X.otrosLate + ' con retraso', sparkHTML('otros', x => x.otrosLate, true))}
  </div>
  <section class="box" style="margin-top:14px"><div class="box-h"><h3>Carga de las próximas dos semanas</h3><span>horas planificadas sobre las horas de máquina</span></div>
    ${Object.entries(cs).map(([t, p]) => `<button class="mb lkh" data-go="plan" style="--mc:var(--${t === 'torno' ? 'm4' : t === 'secc' ? 'm6' : 'm1'})"><b><i></i>${t === 'fresa' ? 'Fresa' : t === 'torno' ? 'Torno' : 'Seccionadora'}</b><div class="tr" role="img" aria-label="${p}% de carga"><i style="width:${Math.min(100, p)}%"></i></div><span class="v"><strong>${p}%</strong> de carga ${sparkHTML('c' + t, x => (x.carga || {})[t])}</span></button>`).join('')}</section>
  <p class="note">Cada cifra lleva a su lista. La evolución sale de una foto diaria cifrada que guarda el primer aparato conectado de cada día${HIST.ult ? ' (última: ' + esc(HIST.ult) + ')' : ''}.</p>`;
}
function vOficina(){
  return `<div class="vh"><div><h1 data-txt>Oficina</h1><p>${S.of === 'ger' ? 'Cómo va la fabricación y su evolución.' : 'En qué estado está cada pedido y cuándo sale.'} Con el calendario del taller, lo marcado hecho y los pedidos abiertos. Sin estimaciones.</p></div>
    <div class="chips"><button class="btn" data-of="ven" aria-pressed="${S.of === 'ven'}">Ventas</button><button class="btn" data-of="ger" aria-pressed="${S.of === 'ger'}">Gerencia</button></div></div>
    ${S.of === 'ger' ? vGerencia() : vVentas()}`;
}

/* Foto diaria para la evolución: la guarda el primer aparato conectado (y se renueva cada 30 min si cambia). */
async function fotoDiaria(){
  try {
    if (!SYNC.on || SYNC.st !== 'on' || !SYNC.hist) return;
    const ult = +(LS.get('taller.hist.ts') || 0); if (Date.now() - ult < 30 * 60000) return;
    const X = indicadores(), f = {cumple: X.cumple, lateT: X.lateT, late: X.late, ab: X.ab, riesgo: X.riesgo, sin14: X.sin14, termPend: X.termPend, carga: X.carga, otros: X.otros, otrosLate: X.otrosLate};
    const o = await SYNC.hist(iso(HOY), f); LS.set('taller.hist.ts', String(Date.now()));
    if (o){ HIST = o; LS.set('taller.hist.v1', JSON.stringify(o)); if (S.v === 'ofi' && S.of === 'ger' && !S.sheet){ S.keepY = true; render(); } }
  } catch(_){}
}
setTimeout(fotoDiaria, 15000); setInterval(fotoDiaria, 5 * 60000);
