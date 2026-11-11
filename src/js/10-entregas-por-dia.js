/* ---------- v23 · Entregas por día (Jon, 20/10/2026: "a veces hay dudas de lo que hay que entregar la siguiente entrega") ---------- */
/* v28: cuándo se marcó Terminado (hora del plan compartido) */
const termHora = l => { if (!l || !l.termTs) return ''; const d = new Date(l.termTs); if (isNaN(d)) return ''; return ' · ' + dS(d) + ' ' + d.toLocaleTimeString('es-ES', {hour: '2-digit', minute: '2-digit'}); };
function estEnt(l){ const a = artDeLin(l), pl = plLin(l.id);
  if (l.term) return ['listo', 'Terminada en taller' + termHora(l)];
  if (l.serv === 'listo') return ['listo', 'Completa en stock'];
  if (!l.conCod) return ['nocod', 'Código por confirmar'];
  if (a && FUERA[tipoArt(a)]) return ['nada', TNOM[tipoArt(a)]];
  if (!(l.falta > 0)) return ['nada', 'Cubierta'];
  return [pl > 0 ? 'parcial' : 'sin', (l.falta < l.pend ? 'Falta fabricar ' : 'Fabricar ') + nf(l.falta) + (pl > 0 ? ' · en el plan' : '')]; }
function entregasDia(){ const E = {}; LINEAS.forEach(l => { if (!secLin(l)) return; const k = l.late || l.d < HOY ? 'v' : iso(l.d);
  const x = E[k] || (E[k] = {k, d: k === 'v' ? null : l.d, ls: [], uds: 0, fab: 0}); x.ls.push(l); x.uds += l.pend || 0; x.fab += l.falta > 0 ? l.falta : 0; });
  Object.values(E).forEach(x => x.ls.sort((a, b) => a.d - b.d || (b.pend || 0) - (a.pend || 0))); return E; }
function entRows(ls, max){ return ls.slice(0, max || 999).map(l => { const e = estEnt(l);
  return `<div class="r en-r" data-open-lin="${esc(l.id)}" role="button" tabindex="0"><span class="t"><b>${esc(l.desc)}</b><span>${esc(l.pedido)} L${l.linea} · ${esc(l.planta || '')}${l.cod ? ' · ' + esc(l.cod) : ''}</span><em class="est ${e[0]}"><i></i>${e[1]}</em></span><span class="v num">${nf(l.pend)}<small>uds</small></span></div>`; }).join(''); }
const relDia = d => { const n = diasA(d); return n === 0 ? 'hoy' : n === 1 ? 'mañana' : 'en ' + n + ' días'; };
const diaLargo = d => DIAS[d.getDay()][0].toUpperCase() + DIAS[d.getDay()].slice(1) + ' ' + d.getDate() + ' de ' + MESL[d.getMonth()];
function proxHTML(){ const E = entregasDia(), ks = Object.keys(E).filter(k => k !== 'v').sort();
  if (!ks.length) return `<section class="box prox"><div class="box-h"><h3>Próxima entrega</h3></div><div class="empty">No hay entregas pendientes con fecha.</div></section>`;
  const x = E[ks[0]], luego = ks.slice(1, 4).map(k => E[k]);
  return `<section class="box prox"><div class="box-h"><h3>Próxima entrega</h3><span class="lkh" data-dia="${iso(x.d)}" role="button" tabindex="0" title="Ver ese día">${relDia(x.d)}</span></div>
    <button class="prox-d" data-dia="${x.k}"><b>${diaLargo(x.d)}</b><span>${x.ls.length} ${x.ls.length === 1 ? 'línea' : 'líneas'} · <b class="num">${nf(x.uds)}</b> uds${x.fab ? ' · ' + nf(x.fab) + ' por fabricar' : ' · todo cubierto'}</span></button>
    <div class="rows">${entRows(x.ls, 5)}${x.ls.length > 5 ? `<div class="empty"><button class="btn" data-dia="${x.k}">Ver las ${x.ls.length} líneas</button></div>` : ''}</div>
    ${luego.length ? `<div class="prox-l"><span>Después</span>${luego.map(y => `<button class="prox-c" data-dia="${y.k}"><b>${diaCorto(y.d)}</b><span>${y.ls.length} lín. · ${nf(y.uds)} uds</span></button>`).join('')}</div>` : ''}</section>`; }
function fichaDia(k){ const E = entregasDia(), x = E[k], d = pd(k), ks = Object.keys(E).filter(q => q !== 'v').sort(), prev = ks.filter(q => q < k).pop(), next = ks.find(q => q > k);
  const c = carga(maqVis(), k);
  return `<div class="scrim" data-close="1"></div><aside class="sheet" role="dialog" aria-modal="true" aria-label="Entregas del día"><div class="sh-h"><div><h2>${diaLargo(d)}</h2><p>${x ? `${x.ls.length} ${x.ls.length === 1 ? 'línea' : 'líneas'} a entregar · <b>${nf(x.uds)} uds</b>${x.fab ? ' · ' + nf(x.fab) + ' por fabricar' : ' · todo cubierto'}` : 'Nada que entregar este día'}${c.n ? ` · ${c.n} ${c.n === 1 ? 'ficha' : 'fichas'} en máquinas` : ''}</p></div><button class="x" data-close="1" aria-label="Cerrar">${I.x}</button></div>
    <div class="sh-b"><div class="dia-nav"><button class="btn" ${prev ? `data-dia="${prev}"` : 'disabled'}>${I.l} Entrega anterior</button><span class="sp"></span><button class="btn" ${next ? `data-dia="${next}"` : 'disabled'}>Siguiente entrega ${I.r}</button></div>
    <div class="rows">${x ? entRows(x.ls) : '<div class="empty">Ninguna línea de pedido vence este día.</div>'}</div>
    <div class="acts" style="margin-top:14px"><button class="btn pri" data-dia-plan="${k}">Ver el día en la planificación</button></div></div></aside>`; }
