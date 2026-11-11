/* ---------- acciones del plan ---------- */
function nuevo(k, key, m, d, qty, antesDe){
  let akey = key;
  if (k === 'lin'){ const l = LID[key]; akey = l.conCod ? l.cod : 'ref:' + (l.ref || l.id); }
  if (k === 'libre') akey = null;
  const its = itemsDe(m, d); let ord = its.length ? (its[its.length-1].ord || 0) + 1 : 1;
  if (antesDe && PLAN.items[antesDe]) ord = (PLAN.items[antesDe].ord || 0) - 0.5;
  const id = uid(); PLAN.items[id] = {id, emp: S.emp, k, key, akey, m, d, qty: Math.max(1, Math.round(qty)), done: false, nota: '', ord, ts: new Date().toISOString()};
  renumerar(m, d); return id;
}
function renumerar(m, d){ itemsDe(m, d).forEach((it, i) => { it.ord = i + 1; }); }
function mover(id, m, d, antesDe){
  const it = PLAN.items[id]; if (!it) return; const om = it.m, od = it.d;
  it.m = m; it.d = d; it.ord = antesDe && PLAN.items[antesDe] ? (PLAN.items[antesDe].ord || 0) - 0.5 : 9999;
  renumerar(m, d); if (om !== m || od !== d) renumerar(om, od);
}
/* Máquina con menos trabajo ese día dentro de la sección de la pieza (fresa, torno o subcontrata). */
function maqLibre(t, k2){ const cands = maqTaller().filter(x => x.t === t); const pool = cands.length ? cands : maqTaller(); return pool.map(x => ({x, n: itemsDe(x.id, k2).length, u: itemsDe(x.id, k2).reduce((s,i) => s + i.qty, 0)})).sort((a,b) => a.n - b.n || a.u - b.u)[0].x; }
function planificarRapido(k, key, qtyFija, mFija, dFija){
  /* Sin arrastrar: va a la máquina de su sección con menos fichas el próximo día laborable, o donde diga la ficha. */
  const d = dFija && DIA_OK.test(dFija) ? pd(dFija) : diaTrabajo(HOY), k2 = iso(d);
  const a = k === 'art' ? ART[key] : artDeLin(LID[key]), t = tipoArt(a);
  if (FUERA[t]){ toast('Esta pieza está en ' + TNOM[t] + ': no va al calendario de máquinas'); return; }
  const m = (mFija && PLAN.maq.find(x => x.id === mFija)) || maqLibre(t, k2);
  const qty = qtyFija || (k === 'art' ? restoArt(ART[key]) : restoLin(LID[key]));
  if (qty <= 0) return;
  const cambiaT = a && m.t !== t;
  cambio('Planificado en ' + m.n + ' para ' + (k2 === iso(HOY) ? 'hoy' : etiquetaDia(k2)) + (cambiaT ? ' · la pieza pasa a ' + SECN[m.t] : '') + (mFija ? '' : '. Muévelo en Planificación si quieres otra máquina.'), () => { if (cambiaT) PLAN.tipo[tKey(a.emp, a.key)] = m.t; nuevo(k, key, m.id, k2, qty); });
}

