/* ---------- Fase 2 · otros trabajos como pedidos ----------
   Las fichas "Otro trabajo" del calendario se agrupan en pedidos: mismo cliente, pedido/plano, descripción y entrega = un pedido
   (aunque esté partido en varias fichas). Lo hecho son las fichas marcadas hecho. Salen en Pedidos (con los mismos filtros)
   y en Hoy, como los de CAF y Talgo. Respetan el taller elegido (por la máquina de cada ficha). */
function otrosTrabajos(){
  const g = {};
  Object.values(PLAN.items).forEach(it => {
    if (it.k !== 'libre') return;
    if (S.sec !== 'todo' && maqDe(it.m).t !== S.sec) return;
    const k = [it.cli, it.ref, it.desc, it.ent].map(x => String(x || '').trim().toLowerCase()).join('|');
    const o = g[k] || (g[k] = {k, cli: it.cli || '', ref: it.ref || '', desc: it.desc || 'Trabajo', ent: it.ent || null, qty: 0, hecho: 0, its: [], dia: null});
    o.qty += +it.qty || 0; if (it.done) o.hecho += +it.qty || 0; o.its.push(it);
    if (!it.done && (!o.dia || it.d < o.dia)) o.dia = it.d;
  });
  return Object.values(g).map(o => {
    o.falta = Math.max(0, o.qty - o.hecho); o.term = o.falta === 0; o.d = o.ent ? pd(o.ent) : null;
    o.late = !o.term && !!o.d && o.d < HOY; o.abre = (o.its.find(i => !i.done) || o.its[0]).id; return o;
  }).sort((a, b) => (a.d ? +a.d : 9e15) - (b.d ? +b.d : 9e15) || a.desc.localeCompare(b.desc));
}
function otrosFiltro(f){
  const fin = addD(lunes(HOY), 7);
  let xs = otrosTrabajos().filter(o => casa([o.desc, o.cli, o.ref].join(' ')));
  if (f === 'term') return xs.filter(o => o.term);
  xs = xs.filter(o => !o.term);
  if (f === 'late') xs = xs.filter(o => o.late);
  if (f === 'sem') xs = xs.filter(o => o.d && o.d >= HOY && o.d < fin);
  if (f === 'listo') xs = [];
  return xs;
}
function otrosPedidosHTML(){
  const xs = otrosFiltro(S.pf); if (!xs.length) return '';
  const uds = xs.reduce((s, o) => s + (o.term ? o.qty : o.falta), 0);
  return `<section class="otros" id="otros"><h4 class="otros-h"><span>Otros trabajos <small>fuera de ${EIDS.map(e => esc(empN(e))).join(' y ')}</small></span><span class="n tlk" data-lk="otros" data-f="todo" role="button" tabindex="0" title="Ver todos los otros trabajos">${xs.length} ${xs.length === 1 ? 'trabajo' : 'trabajos'} · ${nf(uds)} uds</span></h4>
    ${xs.map(o => { const u = o.term ? 'ok' : o.late ? 'late' : o.d ? urg(o.d, false) : 'ok', da = o.d ? diasA(o.d) : null;
      return `<button class="pl" data-open-item="${esc(o.abre)}"><span class="dt ${u}">${o.d ? dS(o.d) : 'Sin fecha'}<small>${o.term ? 'hecho' : o.late ? Math.abs(da) + ' d tarde' : o.d ? (da === 0 ? 'hoy' : 'en ' + da + ' d') : 'de entrega'}</small></span>
        <span><b>${esc(o.desc)}</b><span class="mut">${esc(o.cli || 'Otro cliente')}${o.ref ? ' · ' + esc(o.ref) : ''}</span><span class="mut only-s"><b>${o.its.length} ${o.its.length === 1 ? 'ficha' : 'fichas'}</b><span class="est ${o.term ? 'listo' : 'sin'}">${o.term ? 'Hecho' : 'Por hacer'}</span></span></span>
        <span class="hide-s"><b>${o.its.length} ${o.its.length === 1 ? 'ficha' : 'fichas'} en el calendario</b><span class="mut">${o.dia ? 'siguiente: ' + dS(pd(o.dia)) + ' · ' + esc(maqDe(o.its.find(i => !i.done).m).n) : 'todas hechas'}</span></span>
        <span class="q num${o.term ? ' ok' : ''}">${nf(o.term ? o.qty : o.falta)}<small>${o.term ? 'hechas' : o.hecho ? 'de ' + nf(o.qty) + ' pendientes' : 'pendientes'}</small></span>
        <span class="hide-s"><span class="est ${o.term ? 'listo' : 'sin'}"><i></i>${o.term ? 'Hecho' : 'Por hacer'}</span></span></button>`; }).join('')}</section>`;
}
/* Ir a la lista de otros trabajos en Pedidos, justo debajo de la barra de arriba (sin desplazamiento suave que se pise). */
function irAOtros(){ setTimeout(() => { const o = $('otros'); if (!o) return; const t = document.querySelector('.top'), h = t && getComputedStyle(t).position === 'sticky' ? t.offsetHeight : 0;
  scrollTo({top: Math.max(0, o.getBoundingClientRect().top + scrollY - h - 10), behavior: 'instant'}); }, 80); }
/* Hoy: un toque lleva a la lista (con retraso, si los hay). */
function otrosHoyHTML(){
  const xs = otrosFiltro('todo'); if (!xs.length) return '';
  const late = xs.filter(o => o.late).length;
  return `<button class="st${late ? ' r' : ''}" data-lk="otros" data-f="${late ? 'late' : 'todo'}"><b class="num">${xs.length}</b><span>otros trabajos${late ? ' · ' + late + ' con retraso' : ' por hacer'}</span></button>`;
}
