/* ---------- fichas ---------- */
function prevHTML(a){
  const D = EMPS[a.emp] || {}, P = D.prev || {};
  const titulo = a.emp === 'talgo' ? 'Previsión de Talgo (pedidos provisionales)' : 'Previsión de ' + esc(empN(a.emp)) + (P.caf ? ' (forecast del ' + dS(pd(P.caf)) + ')' : '');
  const nota = a.emp === 'talgo' ? 'Lo que Talgo tiene como provisional en el portal: todavía no es pedido firme ni se puede entregar.' : 'Lo que CAF prevé pedir. No es pedido firme: CAF lo quita de la previsión cuando lo convierte en pedido.';
  if (!a.prevT) return `<div class="sec"><h3>${titulo}</h3><div class="note" style="margin:0">Sin previsión para esta pieza.</div></div>`;
  const vals = MESES12.map(d => a.prev[mesK(d)] || 0), mx = Math.max(1, ...vals);
  const fuera = a.prevT - vals.reduce((s,v) => s+v, 0);
  return `<div class="sec"><h3>${titulo}</h3>
    <div class="kv"><div><b class="num">${nf(a.prev3)}</b><span>próximos 3 meses</span></div><div><b class="num">${nf(a.prev6)}</b><span>próximos 6 meses</span></div><div><b class="num">${nf(a.pend + a.prev3)}</b><span>pedido + 3 meses</span></div></div>
    <div class="pvg">${vals.map((v,i) => `<div title="${nf(v)} uds"><b>${v ? nf(v) : ''}</b><i class="${v?'':'z'}" style="height:${v ? Math.max(4, v/mx*62) : 2}px"></i><span>${MESES[MESES12[i].getMonth()]}</span></div>`).join('')}</div>
    <div class="note">${nota}${fuera > 0 ? ' Además hay ' + nf(fuera) + ' uds previstas más allá de 12 meses.' : ''}</div></div>`;
}
/* Bloque "Planificar" de la ficha: el lote (lo pendiente, con la previsión de 3 o 6 meses detrás), la máquina y el día. */
function planBlock(a){
  const resto = restoArt(a), pl = plCod(a.key, a.emp);
  const ops = [];
  if (resto > 0) ops.push({q: resto, t: 'Lo pendiente', e: a.peds.size + (a.peds.size === 1 ? ' pedido' : ' pedidos') + ' sin planificar'});
  const mesesCon = n => MESES12.slice(0, n).filter(d => a.prev[mesK(d)]);
  if (a.prev3 > 0){ const ms = mesesCon(3); ops.push({q: resto + a.prev3, t: '+ previsión 3 meses', e: 'cubre hasta ' + MESES[ms[ms.length-1].getMonth()]}); }
  if (a.prev6 > a.prev3){ const ms = mesesCon(6); ops.push({q: resto + a.prev6, t: '+ previsión 6 meses', e: 'cubre hasta ' + MESES[ms[ms.length-1].getMonth()]}); }
  const def = ops.length ? ops[0].q : 1;
  const d0 = diaTrabajo(HOY), k0 = iso(d0), m0 = maqLibre(tipoArt(a), k0);
  const dSel = (() => { const out = []; const base = lunes(d0); for (let i = 0; i < 28; i++){ const d = addD(base, i); if (d.getDay() === 0 || d < d0) continue; const k = iso(d); out.push(`<option value="${k}" ${k === k0 ? 'selected' : ''}>${d.getDay()===6 ? 'Finde ' + dS(d) : DIAS[d.getDay()].slice(0,3) + ' ' + dS(d)}${k === iso(HOY) ? ' (hoy)' : k === k0 ? ' (próximo)' : ''}</option>`); } return out.join(''); })();
  const detras = (() => { const ms = mesesCon(6).map(d => MESES[d.getMonth()] + ' ' + nf(a.prev[mesK(d)])); if (!ms.length) return resto > 0 ? 'Detrás no viene previsión: con lo pendiente cubres todos los pedidos abiertos.' : 'Sin previsión detrás.';
    return 'Detrás de los pedidos viene previsión: ' + ms.join(' · ') + (a.prevT > a.prev6 ? ' · y ' + nf(a.prevT - a.prev6) + ' más adelante' : '') + '. Un lote más largo ahorra preparaciones, pero fabrica antes de que sea pedido firme.'; })();
  return `<div class="sec"><h3>Planificar</h3>
    ${resto === 0 && pl > 0 ? `<div class="okbox">Todo lo pendiente ya está en el calendario (${nf(pl)} uds). Lo de abajo es para adelantar previsión.</div>` : ''}
    ${ops.length ? `<div class="lotes">${ops.map((o,i) => `<button class="lote" type="button" data-lote="${o.q}" aria-pressed="${i===0}"><b class="num">${nf(o.q)}</b><span>${o.t}</span><em>${esc(o.e)}</em></button>`).join('')}</div>` : ''}
    <div class="ctl"><label>Unidades<div class="step"><button type="button" data-qd="-10">−</button><input id="fQ" type="number" inputmode="numeric" min="1" value="${def}"><button type="button" data-qd="10">+</button></div></label>
      <label>Máquina<select id="pM">${maqTaller().map(m => `<option value="${esc(m.id)}" ${m0.id===m.id?'selected':''}>${esc(m.n)}${m.t==='torno'?' (torno)':m.t==='secc'?' (seccionadora)':m.t==='sub'?' (fuera)':''}</option>`).join('')}</select></label>
      <label>Día<select id="pD">${dSel}</select></label>
      <label>&nbsp;<button class="btn pri" style="height:46px;justify-content:center" data-plan-art="${esc(a.key)}" data-qty="1">Planificar</button></label></div>
    <div class="note">${detras}</div></div>`;
}
function fichaArt(key, itId, eid){
  const M = MOD[eid || EA || S.emp]; const a = M && M.ART[key]; if (!a) return '';
  const it = itId ? PLAN.items[itId] : null;
  const plans = Object.values(PLAN.items).filter(x => x.akey === key && itEmp(x) === a.emp).sort((x,y) => x.d.localeCompare(y.d));
  const tor = tipoArt(a) === 'torno', vivas = a.lines.filter(l => !l.term);
  const dSel = (() => { const out = []; const base = lunes(HOY); for (let i = -7; i < 35; i++){ const d = addD(base, i); if (d.getDay() === 0) continue; const k = iso(d); out.push(`<option value="${k}" ${it && it.d === k ? 'selected' : ''}>${d.getDay()===6 ? 'Finde ' + dS(d) : DIAS[d.getDay()].slice(0,3) + ' ' + dS(d)}${k === iso(HOY) ? ' (hoy)' : ''}</option>`); } return out.join(''); })();
  const nota = PLAN.notas[a.emp === 'caf' ? key : tKey(a.emp, key)] || '';
  const notaK = a.emp === 'caf' ? key : tKey(a.emp, key);
  return `<div class="scrim" data-close="1"></div><aside class="sheet" role="dialog" aria-modal="true" aria-label="${esc(a.desc)}">
    <div class="sh-h"><div><h2>${esc(a.desc)}</h2><p>${etag(a.emp)}${esc(a.cod || 'Código por confirmar')}${a.refs.size?' · ref. '+esc([...a.refs].join(', ')):''}${a.planos.size?' · plano '+esc([...a.planos].join(', ')):''}${TTAG(tipoArt(a))}</p></div><button class="x" data-close="1" aria-label="Cerrar">${I.x}</button></div>
    <div class="sh-b">
      ${it ? `<div class="sec"><h3>En el calendario</h3>
        <div class="ctl"><label>Máquina<select id="fM">${maqTaller().map(m => `<option value="${esc(m.id)}" ${it.m===m.id?'selected':''}>${esc(m.n)}${m.t==='torno'?' (torno)':m.t==='secc'?' (seccionadora)':m.t==='sub'?' (fuera)':''}</option>`).join('')}</select></label>
          <label>Día<select id="fD">${dSel}</select></label>
          <label>Unidades<div class="step"><button type="button" data-qd="-10">−</button><input id="fQ" type="number" inputmode="numeric" min="1" value="${esc(it.qty)}"><button type="button" data-qd="10">+</button></div></label>
          ${horasCtl(it)}<label>Nota para el operario<input id="fN" type="text" value="${esc(it.nota||'')}" placeholder="Ej.: utillaje nuevo, prioridad…"></label></div>
        ${pmHTML(it, 'big')}
        <div class="acts" style="margin-top:10px"><button class="btn pri" data-save="${esc(it.id)}">Guardar</button><button class="btn ${it.done?'':'okb'}" data-done="${esc(it.id)}">${it.done?'Quitar hecho':'Marcar hecho'}</button><button class="btn" data-split="${esc(it.id)}">Partir en dos</button><button class="btn del" data-quitar="${esc(it.id)}">Quitar del calendario</button></div></div>` : ''}
      <div class="kv"><div><b class="num">${nf(a.pend)}</b><span>pendiente en ${a.peds.size} ${a.peds.size===1?'pedido':'pedidos'}</span></div><div><b class="num">${nf(plCod(a.key, a.emp))}</b><span>en el calendario</span></div><div><b class="num" style="color:${a.falta?'var(--late)':'var(--ok)'}">${nf(a.falta)}</b><span>a fabricar</span></div>
</div>
      ${tallerFicha(a)}${!it ? (tipoArt(a) === 'sub' ? '<div class="okbox sub">Pieza subcontratada: no va al calendario de máquinas. Si vuelve a hacerse en casa, pásala a su taller aquí abajo.</div>' : tipoArt(a) === 'adit' ? '<div class="okbox sub">Pieza de aditiva (MJF): se lleva aparte, no va al calendario de máquinas. Si pasa a mecanizado, pásala a su taller aquí abajo.</div>' : planBlock(a)) : ''}
      <div class="acts">${vivas.length ? `<button class="btn okb" data-term-art="${esc(a.key)}" data-emp="${a.emp}">Terminado (${vivas.length === 1 ? 'la línea' : 'las ' + vivas.length + ' líneas'})</button>` : ''}${a.lines.some(l => l.term) ? `<button class="btn" data-unterm-art="${esc(a.key)}" data-emp="${a.emp}">Volver a pendiente</button>` : ''}</div>
      <div class="note" style="margin-top:-8px">Terminado quita la pieza del tablero del taller; no cambia la lista oficial de pedidos (el envío lo marca Jon).</div>
      <div class="acts"><button class="btn" data-msg-ref="${esc(a.key)}" data-emp="${a.emp}">${I.msg} Escribir sobre esta pieza${(() => { const n = Object.values(PLAN.msg || {}).filter(m => !m.hilo && m.ref && m.ref.key === a.key && m.ref.emp === a.emp).length; return n ? ' · ' + n + (n === 1 ? ' conversación' : ' conversaciones') : ''; })()}</button></div>
      <div class="sec"><h3>Líneas de pedido de esta referencia</h3>${a.lines.length ? a.lines.map(l => `<div class="ln"><div><b>${esc(l.pedido)} L${l.linea} · ${esc(l.planta)}</b><span>Entrega ${dS(l.d)}${l.late?' · '+Math.abs(l.dias||0)+' días de retraso':''}</span></div><div class="rq num">${nf(l.pend)} uds<span>${l.term ? '<span class="tbadge">Terminado</span>' : l.serv === 'listo' ? '<span class="tbadge">Completa en stock</span>' : l.falta ? nf(l.falta)+' a fabricar' : 'no hay que fabricar'}</span><div class="lb"><button class="btn" data-term-lin="${esc(l.id)}" data-emp="${a.emp}">${l.term ? 'Deshacer' : 'Terminado'}</button></div></div></div>`).join('') + `<div class="ln"><div><b>Total</b><span>${a.peds.size} ${a.peds.size===1?'pedido abierto':'pedidos abiertos'}</span></div><div class="rq num">${nf(a.pend)} uds</div></div>` : '<div class="empty" style="text-align:left;padding:4px 0">Sin pedidos abiertos: solo hay previsión.</div>'}</div>
      ${prevHTML(a)}
      <div class="sec"><h3>Planificado</h3>${plans.length ? plans.map(p => `<div class="ln"><div><b>${esc(maqDe(p.m).n)} · ${pd(p.d).getDay()===6?'fin de semana del '+dS(pd(p.d)):DIAS[pd(p.d).getDay()]+' '+dS(pd(p.d))}</b><span>${p.done?'Hecho':'Pendiente'}${p.k==='lin'?' · pedido '+esc(LID[p.key]?LID[p.key].pedido:''):''}${p.nota?' · '+esc(p.nota):''}</span></div><div class="rq num">${nf(p.qty)} uds</div></div>`).join('') : '<div class="empty" style="text-align:left;padding:4px 0">Todavía no está en el calendario.</div>'}</div>
      <div class="sec"><h3>Notas del taller sobre esta pieza</h3><textarea id="fNota" data-nota="${esc(notaK)}" placeholder="Material, utillaje, programa, incidencias…">${esc(nota)}</textarea></div>
    </div></aside>`;
}
/* v43 · Talgo: stock según SGA SIN VERIFICAR (como el panel Talgo, I7). Ámbar, nunca verde: hay que confirmarlo en almacén. */
function sgaHTML(l, corto){
  const s = l && l.sga; if (!s || typeof s !== 'object') return '';
  const f = DIA_OK.test(s.f || '') ? dS(pd(s.f)) : '';
  const est = s.est === 'cubre' ? 'cubriría esta línea entera' : s.est === 'parcial' ? 'cubriría ' + nf(s.a) + ' de ' + nf(l.pend) + ' uds' : 'no queda stock ubicado para esta línea';
  if (corto) return s.u > 0 ? `<span class="sga-t" title="Stock según SGA, sin verificar: confirmar en almacén">SGA ${nf(s.u)} uds · sin verificar</span>` : '';
  return `<div class="sga-b"><span class="sga-p">Stock según SGA${f ? ' · ' + f : ''}</span><div><b class="num">${nf(s.u || 0)}</b> uds ubicadas · ${esc(est)}</div>${s.loc ? `<small>${esc(s.loc)}</small>` : ''}<small>Sin verificar: el SGA no es fiable. Confírmalo en almacén antes de prometer nada.</small></div>`;
}
function fichaLin(id){
  const l = LID[id]; if (!l) return '';
  const key = l.conCod ? l.cod : 'ref:' + (l.ref || l.id);
  return fichaArt(key, null, l.emp).replace('<div class="sec"><h3>Líneas de pedido de esta referencia</h3>', () => `<div class="sec"><h3>Pedido ${esc(l.pedido)} L${l.linea}</h3><div class="ln"><div><b>${esc(l.planta)}</b><span>Entrega ${dS(l.d)}${l.pactada?' (fecha pactada con CAF)':''}${l.late?' · '+Math.abs(l.dias||0)+' días de retraso':''}</span></div><div class="rq num">${nf(l.pend)} de ${nf(l.pedida)} uds<span>${l.serv === 'listo' ? '<span class="tbadge">Completa en stock</span>' : l.falta ? nf(l.falta)+' a fabricar' : 'no hay que fabricar'}</span></div></div>${l.falta && restoLin(l) > 0 ? `<div class="acts" style="margin-top:8px"><button class="btn" data-plan-lin="${esc(l.id)}">Planificar solo este pedido (${nf(restoLin(l))} uds)</button></div>` : ''}${sgaHTML(l)}</div><div class="sec"><h3>Todas las líneas de esta referencia</h3>`);
}
