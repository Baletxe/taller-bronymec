/* ---------- tarjetas ---------- */
function cardArt(a, sm){
  const resto = restoArt(a), u = a.cod ? urg(a.first, a.late) : 'nocod';
  const dd = diasA(a.first);
  return `<div class="tc ${u} ${sm?'sm':''}" data-drag="art" data-key="${esc(a.key)}" data-open-art="${esc(a.key)}">
    <div class="d">${esc(a.desc)}</div>
    <div class="k cond">${matTag(a.desc)}${esc(a.cod || 'Código por confirmar')}${a.refs.size?' · '+esc([...a.refs][0]):''}${S.sec==='todo'?TTAG(tipoArt(a)):''}</div>
    <div class="row"><div class="q num">${nf(resto)}<small>uds</small></div>
      <div class="due">${a.late || dd < 0 ? 'Vencido<br>'+dS(a.first) : 'Entrega<br>'+dS(a.first)}</div></div>
    <div class="pv">${a.peds.size} ${a.peds.size===1?'pedido':'pedidos'}${a.prev6 ? ' · detrás +' + nf(a.prev6) + ' en 6 m' : ''}</div>${sugHTML(a)}
    ${!a.cod?'<span class="flag gris">Oficina tiene que confirmar el código</span>':''}
    ${plCod(a.key) > 0 && resto > 0 ? `<span class="flag amb">${nf(plCod(a.key))} ya planificadas</span>` : ''}
  </div>`;
}
function cardLin(l, sm){
  const resto = restoLin(l), u = l.conCod ? urg(l.d, l.late) : 'nocod', a = artDeLin(l);
  return `<div class="tc ${u} ${sm?'sm':''}" data-drag="lin" data-key="${esc(l.id)}" data-open-lin="${esc(l.id)}">
    <div class="d">${esc(l.desc)}</div>
    <div class="k cond">${esc(l.pedido)} L${l.linea} · ${esc(l.planta)}${S.sec==='todo'?TTAG(tipoArt(a)):''}</div>
    <div class="row"><div class="q num">${nf(resto)}<small>uds</small></div>
      <div class="due">${l.late || l.d < HOY ? 'Vencido<br>'+dS(l.d) : 'Entrega<br>'+dS(l.d)}</div></div>
    ${a && a.peds.size > 1 ? `<div class="pv">Referencia: ${nf(a.pend)} uds en ${a.peds.size} pedidos${a.prev6 ? ' · prev. 6 m: ' + nf(a.prev6) : ''}</div>` : a && a.prev6 ? `<div class="pv">Previsión 6 m: ${nf(a.prev6)}</div>` : ''}
  </div>`;
}
/* v35 · Programa y Material de cada ficha */
I.pmk = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3.2" stroke-linecap="round" stroke-linejoin="round"><path d="M5 12.5l4.5 4.5L19 7.5"/></svg>';
const pmHTML = (it, cls) => `<div class="pm ${cls || ''}" role="group" aria-label="Programa y material">${[['prg', 'Programa', 'Prog'], ['mat', 'Material', 'Mat']].map(([k, t, c]) => `<button class="pmb ${it[k] ? 'on' : ''}" data-pm="${k}" data-id="${esc(it.id)}" aria-pressed="${!!it[k]}" title="${t}: ${it[k] ? 'listo' : 'falta'} (toca para cambiar)"><i>${it[k] ? I.pmk : ''}</i><span class="pl">${t}</span><span class="ps">${c}</span></button>`).join('')}</div>`;
const pmListo = it => !!(it.prg && it.mat);
function cardItem(it){
  const inf = infoItem(it); if (!inf) return '';
  const dia = pd(it.d), soloP = (inf.a && inf.a.soloPrev) || !inf.due, vencido = !soloP && (inf.due < HOY || inf.late), tarde = !it.done && !soloP && (vencido ? dia > diaTrabajo(HOY) : dia > inf.due);
  const cubierto = inf.a && inf.a.falta === 0 && !it.done;
  const pasado = dia < HOY && !it.done;
  const u = inf.libre ? 'libre' : inf.cod ? urg(inf.due, inf.late) : 'nocod';
  return `<div class="tc sm ${u} ${it.done?'done':''} ${inf.term && !it.done?'term':''} ${pmListo(it) ? 'pmok' : ''}" data-drag="item" data-id="${esc(it.id)}" data-open-item="${esc(it.id)}">
    <button class="chk" data-done="${esc(it.id)}" aria-label="${it.done?'Quitar hecho':'Marcar hecho'}">${it.done?I.chk:''}</button>
    <div class="d">${esc(inf.desc)}</div>
    <div class="k cond">${inf.libre ? '' : matTag(inf.desc)}${inf.libre ? `<span class="etag libre">${esc((inf.cli || 'OTRO').toUpperCase())}</span>` : etag(inf.emp)}${esc(it.k==='lin' ? inf.l.pedido+' L'+inf.l.linea : (inf.cod || inf.ref))}</div>
    ${pmHTML(it)}<div class="row"><div class="q num">${nf(it.qty)}<small>${it.k === 'art' && inf.a && !inf.a.soloPrev && inf.a.falta > it.qty ? 'de ' + nf(inf.a.falta) : 'uds'}</small></div><span class="hh${it.h ? '' : ' est'}" title="${it.h ? 'Horas de máquina' : 'Horas estimadas: ponlas en la ficha'}">${fmtH(horasIt(it))} h</span><div class="due">${inf.a && inf.a.soloPrev ? 'Previsión' : inf.due ? dS(inf.due) : inf.libre ? 'Sin fecha' : ''}</div></div>
    ${it.k === 'art' && inf.a && !inf.a.soloPrev && it.qty > inf.a.falta && !it.done ? '<span class="flag gris">Incluye previsión</span>' : ''}${inf.term && !it.done ? '<span class="flag gris">Terminado en taller</span>' : ''}${!inf.term && tarde ? `<span class="flag">${vencido ? 'Vencido: mejor hoy' : 'Sale después de la entrega'}</span>` : ''}${!inf.term && cubierto && !(inf.a && inf.a.soloPrev) ? `<span class="flag gris">Ya cubierto: no hace falta</span>` : ''}${pasado && !tarde && !cubierto && !inf.term ? `<span class="flag amb">Se quedó sin hacer</span>` : ''}
    ${it.nota ? `<div class="k">✎ ${esc(it.nota)}</div>` : ''}
  </div>`;
}

