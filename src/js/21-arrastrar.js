/* ---------- arrastrar (ratón y dedo) ---------- */
let pd0 = null, timer = null;
function dropTarget(x, y){
  const el = document.elementFromPoint(x, y); if (!el) return null;
  const cc = el.closest('[data-cls-col]'); if (cc) return {cls: cc.dataset.clsCol, el: cc};
  const bl = el.closest('[data-backlog]'); if (bl) return {bl: true, el: bl};
  const c = el.closest('[data-cell]'); if (!c) return null;
  const card = el.closest('.tc[data-id]');
  let before = null;
  if (card && card.parentElement === c){ const r = card.getBoundingClientRect();
    if (y < r.top + r.height / 2) before = card.dataset.id; else { let nx = card.nextElementSibling; while (nx && !(nx.matches && nx.matches('.tc[data-id]'))) nx = nx.nextElementSibling; before = nx ? nx.dataset.id : null; } }
  return {cell: c.dataset.cell, el: c, before};
}
let lastOver = null, lastIns = null;
function marcar(t){ if (lastOver && (!t || lastOver !== t.el)) lastOver.classList.remove('over'); if (t){ t.el.classList.add('over'); lastOver = t.el; } else lastOver = null;
  const insEl = t && t.before && !t.bl ? t.el.querySelector('.tc[data-id="' + t.before + '"]') : null;
  if (lastIns && lastIns !== insEl) lastIns.classList.remove('ins-before'); if (insEl && insEl !== (S.drag && S.drag.card)) insEl.classList.add('ins-before'); lastIns = insEl;
  const di = $('dragInfo'); if (di && S.drag && S.drag.tipo === 'cls'){ di.textContent = t && t.cls ? 'Pasar a ' + TNOM[t.cls] : 'Suelta en Fresa, Torno o Subcontrata'; } else if (di){ if (!t) di.textContent = 'Suelta sobre una máquina y un día'; else if (t.bl) di.textContent = S.drag && S.drag.tipo === 'item' ? 'Quitar del calendario' : 'Aquí ya está'; else { const [m, dia] = t.cell.split('|'); di.textContent = maqDe(m).n + ' · ' + etiquetaDia(dia); } di.classList.toggle('del', !!(t && t.bl && S.drag && S.drag.tipo === 'item')); } }
function empezar(e, card){
  const r = card.getBoundingClientRect();
  const g = card.cloneNode(true); g.classList.add('ghost'); g.style.width = Math.min(260, r.width) + 'px'; document.body.appendChild(g);
  card.classList.add('drag-src');
  S.drag = {card, g, dx: e.clientX - r.left, dy: e.clientY - r.top, tipo: card.dataset.drag, key: card.dataset.key, id: card.dataset.id, emp: card.dataset.emp};
  const di = document.createElement('div'); di.id = 'dragInfo'; di.className = 'drag-info'; di.textContent = card.dataset.drag === 'cls' ? 'Suelta en Fresa, Torno o Subcontrata' : 'Suelta sobre una máquina y un día'; document.body.appendChild(di);
  mov(e);
  if (navigator.vibrate) try { navigator.vibrate(12); } catch(_){}
}
function mov(e){ const d = S.drag; if (!d) return; d.g.style.left = (e.clientX - d.dx) + 'px'; d.g.style.top = (e.clientY - d.dy) + 'px'; marcar(dropTarget(e.clientX, e.clientY));
  /* Auto-scroll: dentro del calendario (horizontal y vertical) y en la página. */
  const m = 70, sc = $('wksc');
  if (sc){ const r = sc.getBoundingClientRect(); if (e.clientY > r.top && e.clientY < r.bottom){ if (e.clientX < r.left + 56) sc.scrollLeft -= 16; else if (e.clientX > r.right - 56) sc.scrollLeft += 16; }
    if (e.clientX > r.left && e.clientX < r.right){ if (e.clientY < r.top + 56 && e.clientY > r.top) sc.scrollTop -= 14; else if (e.clientY > r.bottom - 56 && e.clientY < r.bottom) sc.scrollTop += 14; } }
  if (e.clientY < m) scrollBy(0, -14); else if (e.clientY > innerHeight - m) scrollBy(0, 14); }
function cancelarDrag(){ const d = S.drag; if (!d) return; S.drag = null; marcar(null); d.g.remove(); d.card.classList.remove('drag-src'); const di = $('dragInfo'); if (di) di.remove(); }
function soltar(e){
  const d = S.drag; if (!d) return; const t = dropTarget(e.clientX, e.clientY); cancelarDrag(); if (!t) return;
  if (d.emp) activar(d.emp);
  if (d.tipo === 'cls' || t.cls){ if (d.tipo === 'cls' && t.cls){ const M = MOD[d.emp], a = M && M.ART[d.key]; if (a) ponerTipo(a, t.cls); } return; }
  if (t.bl){ if (d.tipo === 'item'){ const it = PLAN.items[d.id]; const inf = infoItem(it); cambio('Quitado del calendario: ' + (inf ? inf.desc : ''), () => { delete PLAN.items[d.id]; }); } return; }
  const [m, dia] = t.cell.split('|'); const mq = maqDe(m), n = mq.n;
  /* Soltar en una máquina de la otra sección (fresa o torno) cambia la pieza de sección. */
  const artD = d.tipo === 'item' ? (infoItem(PLAN.items[d.id]) || {}).a : d.tipo === 'art' ? ART[d.key] : artDeLin(LID[d.key]);
  const cambiaT = artD && tipoArt(artD) !== mq.t;
  const fijaT = () => { if (cambiaT){ PLAN.tipo[tKey(artD.emp, artD.key)] = mq.t; } };
  const extra = cambiaT ? ' · la pieza pasa a ' + SECN[mq.t] : '';
  if (d.tipo === 'item'){ if (t.before === d.id) return; cambio('Movido a ' + n + ', ' + etiquetaDia(dia) + extra, () => { fijaT(); mover(d.id, m, dia, t.before); }); return; }
  const qty = d.tipo === 'art' ? restoArt(ART[d.key]) : restoLin(LID[d.key]); if (qty <= 0) return;
  cambio('Planificado en ' + n + ', ' + etiquetaDia(dia) + ': ' + nf(qty) + ' uds' + extra, () => { fijaT(); nuevo(d.tipo, d.key, m, dia, qty, t.before); });
}
const etiquetaDia = k => { const d = pd(k); return d.getDay() === 6 ? 'fin de semana' : DIAS[d.getDay()] + ' ' + dS(d); };
document.addEventListener('pointerdown', e => {
  const card = e.target.closest('.tc[data-drag],.cc[data-drag]'); if (!card || e.target.closest('.chk') || e.target.closest('.sug') || e.target.closest('.mv') || e.button > 0) return;
  pd0 = {x: e.clientX, y: e.clientY, card, id: e.pointerId, t: e.pointerType, moved: false};
  if (e.pointerType !== 'mouse'){ clearTimeout(timer); timer = setTimeout(() => { if (pd0 && !pd0.moved){ pd0.armed = true; empezar(e, card); } }, 280); }
});
document.addEventListener('pointermove', e => {
  if (S.drag){ e.preventDefault(); mov(e); return; }
  if (!pd0) return; const dx = e.clientX - pd0.x, dy = e.clientY - pd0.y, dist = Math.hypot(dx, dy);
  if (pd0.t === 'mouse' && dist > 5){ empezar(e, pd0.card); pd0.moved = true; return; }
  if (pd0.t !== 'mouse' && dist > 9 && !pd0.armed){ clearTimeout(timer); pd0 = null; }
}, {passive: false});
document.addEventListener('touchmove', e => { if (S.drag) e.preventDefault(); }, {passive: false});
const fin = e => { clearTimeout(timer); if (S.drag){ soltar(e); S.justDragged = Date.now(); } pd0 = null; };
document.addEventListener('pointerup', fin); document.addEventListener('pointercancel', () => { clearTimeout(timer); cancelarDrag(); pd0 = null; });
document.addEventListener('contextmenu', e => { if (e.target.closest('.tc,.cc')) e.preventDefault(); });

