/* ---------- Talleres: en qué taller se hace cada pieza (y el archivo que se va formando) ---------- */
const TNOM = {fresa: 'Fresa', torno: 'Torno', secc: 'Seccionadora', sub: 'Subcontrata', adit: 'Aditiva'};
const maqsTxt = t => t === 'sub' ? 'Se hace fuera: sin calendario' : t === 'adit' ? 'Se lleva aparte (MJF): sin calendario' : maqTaller().filter(m => m.t === t).map(m => m.n).join(' · ') || 'Sin máquinas';
const orgHTML = o => o.src === 'man' ? `<span class="org man">${I.chk}Confirmada</span>` : o.src === 'regla' ? `<span class="org regla" title="Por la regla de la palabra ${esc(o.w)}">Regla ${esc(o.w)}</span>` : '<span class="org def">Sin decidir</span>';
const talleresBase = () => ARTS.filter(a => S.tf === 'todas' || (!a.soloPrev && !a.term));
function sugReglas(){
  const fam = {}, tiene = new Set((PLAN.reglas || []).map(g => norm(g.w).toUpperCase().trim()));
  ARTS.forEach(a => { const w = palabra1(a.desc); if (!w || tiene.has(w)) return; const f = fam[w] || (fam[w] = {fresa: 0, torno: 0, secc: 0, sub: 0}); const t = PLAN.tipo[tKey(a.emp, a.key)]; if (t) f[t]++; });
  return Object.entries(fam).map(([w, f]) => { const t = f.torno >= 2 && !f.fresa && f.torno >= f.sub && f.torno >= f.secc ? 'torno' : f.secc >= 2 && !f.fresa && f.secc >= f.sub ? 'secc' : f.sub >= 2 && !f.fresa ? 'sub' : null; if (!t) return null;
    return {w, t, c: f[t], n: ARTS.filter(a => palabra1(a.desc) === w && origen(a).src === 'def').length}; }).filter(Boolean).sort((a, b) => b.c - a.c).slice(0, 3);
}
const sinDecidir = () => ARTS.filter(a => !a.soloPrev && !a.term && origen(a).src === 'def');
function ccHTML(a, o){
  const k = esc(a.key);
  return `<div class="cc s-${o.src}" data-drag="cls" data-key="${k}" data-emp="${a.emp}" data-open-art="${k}" role="button" tabindex="0" aria-label="${esc(a.desc)}: ${TNOM[o.t]}"><b>${ctag(a.emp)}${esc(a.desc)}</b>
    <span class="k">${esc(a.cod || 'Código por confirmar')}${a.refs.size ? ' · ' + esc([...a.refs][0]) : ''} · ${a.pend ? nf(a.pend) + ' uds en pedido' : 'solo previsión'}${mat(a.desc) ? ' · ' + mat(a.desc) : ''}</span>
    <div class="f">${orgHTML(o)}<span class="mv">${['fresa','torno','secc','sub','adit'].filter(x => x !== o.t).map(x => `<button class="to-${x}" data-tipo-set="${x}" data-key="${k}" data-emp="${a.emp}" title="Pasar a ${TNOM[x]}" aria-label="Pasar a ${TNOM[x]}">${IT[x]}</button>`).join('')}${o.src !== 'man' ? `<button class="ok" data-tipo-set="${o.t}" data-key="${k}" data-emp="${a.emp}" title="Confirmar ${TNOM[o.t]}" aria-label="Confirmar ${TNOM[o.t]}">${I.chk}</button>` : ''}</span></div></div>`;
}
function vTalleres(){
  const base = talleresBase(), cols = {fresa: [], torno: [], secc: [], sub: [], adit: []}; let nMan = 0, nReg = 0;
  base.forEach(a => { const o = origen(a); if (o.src === 'man') nMan++; else if (o.src === 'regla') nReg++; if (casa(txtArt(a))) cols[o.t].push({a, o}); });
  const tot = base.length, pct = tot ? Math.floor(nMan / tot * 100) : 100, nDef = tot - nMan - nReg;
  const rk = o => o.src === 'def' ? 0 : o.src === 'regla' ? 1 : 2;
  const col = k => { const xs = cols[k].sort((x, y) => rk(x.o) - rk(y.o) || (y.a.falta > 0) - (x.a.falta > 0) || (x.a.first || 9e15) - (y.a.first || 9e15) || String(x.a.desc).localeCompare(y.a.desc));
    const pend = xs.filter(x => x.o.src !== 'man').length, uds = xs.reduce((s, x) => s + (x.a.pend || 0), 0);
    return `<section class="ccol c-${k}" data-cls-col="${k}" aria-label="${TNOM[k]}"><div class="ccol-h"><span class="ic">${IT[k]}</span><div style="min-width:0"><h3>${TNOM[k]}</h3><small ${FUERA[k] ? 'data-txt' : 'class="lkh" data-go="plan" role="button" tabindex="0" title="Ver sus máquinas en el plan"'}>${esc(maqsTxt(k))}</small></div><span class="n num lkh" data-lk="ir" data-to="ccl-${k}" role="button" tabindex="0" title="Ver las piezas">${xs.length}</span></div>
      <div class="ccol-s"><span class="lkh" data-lk="ir" data-to="ccl-${k}" role="button" tabindex="0" title="Ver las piezas">${nf(uds)} uds en pedido</span>${pend ? `<button data-cls-all="${k}">${I.chk}Confirmar ${pend === 1 ? 'la que falta' : 'las ' + pend}</button>` : xs.length ? `<span class="okk">${I.chk}Todo confirmado</span>` : ''}</div>
      <div class="ccol-l" id="ccl-${k}">${xs.map(x => ccHTML(x.a, x.o)).join('') || `<div class="cc-vac">${S.q ? 'Nada con esta búsqueda' : 'Arrastra aquí las piezas de ' + TNOM[k].toLowerCase()}</div>`}</div></section>`; };
  const cnt = {}; base.forEach(a => { const r = a.desc ? reglaDe(a.desc) : null; if (r) cnt[r.w] = (cnt[r.w] || 0) + 1; });
  const sug = sugReglas(), ch = (k, t) => `<button class="chip" data-tf="${k}" aria-pressed="${S.tf === k}">${t}</button>`;
  return `<div class="tl-h"><div><h1>Talleres</h1><p>Qué se hace en fresa, en torno o en la seccionadora, y qué se manda fuera. Arrastra cada pieza a su columna o toca los botones de la ficha. Lo que confirmas se guarda en el plan compartido, por código, y vale para todos los pedidos que vengan de esa pieza.</p></div>
    <div class="tl-prog lkh" title="Piezas confirmadas a mano: ver la lista" data-lk="ir" data-to="tl-tablero" role="button" tabindex="0"><div class="ring" style="--p:${pct}"><b class="num">${pct}%</b></div><div class="tst"><span><b class="num">${nMan}</b> de ${tot} piezas confirmadas</span><span>${nReg} por regla · ${nDef} sin decidir</span></div></div></div>
    <section class="box rgx"><div class="rgx-h"><div><h2>Reglas por palabra</h2><p>Si la descripción lleva la palabra, la pieza va sola a ese taller. Lo confirmado a mano manda sobre la regla; si una descripción tiene dos palabras con regla, cuenta la que va primero.</p></div></div>
      <div class="rchips">${PLAN.reglas.map((g, i) => `<span class="rchip r-${g.t}">${IT[g.t] || ''}<b>${esc(g.w)}</b><span>→ ${TNOM[g.t]}</span><em class="num lkh" data-lk="buscar" data-w="${esc(g.w)}" role="button" tabindex="0" title="Ver las piezas con esta palabra">${cnt[g.w] || 0}</em><button data-rg-del="${i}" aria-label="Quitar la regla ${esc(g.w)}">${I.x}</button></span>`).join('') || '<span class="note" style="margin:0">Todavía no hay reglas.</span>'}</div>
      <div class="radd"><input id="rgW" type="text" maxlength="40" placeholder="Nueva palabra, p. ej. EJE" autocomplete="off" aria-label="Palabra de la regla" enterkeyhint="done"><div class="seg" role="group" aria-label="Taller de la regla">${['fresa','torno','secc','sub','adit'].map(k => `<button data-rgt="${k}" aria-pressed="${S.rgt === k}">${IT[k]}${TNOM[k]}</button>`).join('')}</div><button class="btn pri" data-rg-new="1">Añadir regla</button></div>
      ${sug.map(s => `<div class="rsug">${I.mg}<span>Has puesto <b>${s.c} piezas ${esc(s.w)}</b> en ${TNOM[s.t]}${s.n ? ' y quedan <b>' + s.n + '</b> sin decidir' : ''}. ¿Regla <b>${esc(s.w)} → ${TNOM[s.t]}</b>?</span><button class="btn" data-rg-sug="${esc(s.w)}" data-t="${s.t}">Crear la regla</button></div>`).join('')}
    </section>
    <div class="tl-bar"><div class="chips" style="margin:0">${ch('abiertas', 'Con pedido abierto')}${ch('todas', 'Todas, también solo previsión')}</div><button class="btn noart" data-cls-csv="1"><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 4v11M7 10l5 5 5-5M5 20h14"/></svg>Descargar el archivo</button></div>
    <div class="board3 b4 b5" id="tl-tablero">${col('fresa')}${col('torno')}${col('secc')}${col('sub')}${col('adit')}</div>`;
}
function ponerTipo(a, aT){
  const o = origen(a); S.keepY = true;
  if (o.t === aT){ if (o.src === 'man') return; cambio('Confirmada en ' + TNOM[aT] + ': ' + a.desc, () => { PLAN.tipo[tKey(a.emp, a.key)] = aT; }); return; }
  const dest = maqTaller().find(m => m.t === aT);
  cambio(FUERA[aT] ? a.desc + ' pasa a ' + SECN[aT] + ': sale del calendario de máquinas' : a.desc + ' pasa a ' + SECN[aT], () => {
    PLAN.tipo[tKey(a.emp, a.key)] = aT;
    Object.values(PLAN.items).forEach(it => { if (it.akey !== a.key || itEmp(it) !== a.emp || it.done) return; if (FUERA[aT]) delete PLAN.items[it.id]; else if (dest && maqDe(it.m).t !== aT) mover(it.id, dest.id, it.d); });
  });
}
function tallerFicha(a){
  const o = origen(a), s = tipoSug(a);
  if (!esTotal()) return `<div class="sec"><h3>Taller</h3><div class="tsel-n"><span class="tsel-chip ${o.t}">${IT[o.t] || ''}${TNOM[o.t] || 'Fresa'}</span><span style="margin-left:10px">${o.src === 'man' ? 'Fijado por el responsable.' : o.src === 'regla' ? 'Por la palabra ' + esc(o.w) + ' de la descripción.' : 'Sin decidir: se da por fresa.'} Si no es de este taller, avísale al responsable (Total) o escríbelo en Mensajes.</span></div></div>`;
  return `<div class="sec"><h3>Taller</h3><div class="tsel" role="group" aria-label="Taller de la pieza">${['fresa','torno','secc','sub','adit'].map(k => `<button class="t-${k}" data-tipo-set="${k}" data-key="${esc(a.key)}" data-emp="${a.emp}" aria-pressed="${o.t === k}">${IT[k]}<b>${TNOM[k]}</b><span>${esc(maqsTxt(k))}</span></button>`).join('')}</div>
    <div class="tsel-n">${orgHTML(o)}<span>${o.src === 'man' ? 'Decidido a mano: se recuerda para todos los pedidos de esta pieza.' : o.src === 'regla' ? 'Está en ' + TNOM[o.t] + ' porque la descripción lleva ' + esc(o.w) + '. Toca ' + TNOM[o.t] + ' para confirmarlo, o elige otro taller.' : 'Ninguna regla la reconoce y está en Fresa por defecto. Elige su taller y queda guardado.'}${s ? ' <b style="color:var(--' + (s.t === 'sub' ? 'm5' : 'm4') + ')">Sugerencia: ' + TNOM[s.t] + ' (' + esc(s.por) + ').</b>' : ''}</span></div></div>`;
}
function vAlmacen(){
  const xs = LINEAS.filter(l => !l.term && (l.serv === 'listo' || l.serv === 'parcial') && casa(txtLin(l))).sort((a,b) => a.d - b.d || (b.pend || 0) - (a.pend || 0));
  const comp = xs.filter(l => l.serv === 'listo'), parc = xs.filter(l => l.serv !== 'listo');
  const uds = comp.reduce((s,l) => s + (l.pend || 0), 0);
  const grp = {}; xs.forEach(l => { const k = l.late || l.d < HOY ? 'v' : iso(l.d); (grp[k] = grp[k] || []).push(l); });
  const keys = Object.keys(grp).sort((a,b) => a === 'v' ? -1 : b === 'v' ? 1 : a.localeCompare(b));
  const fila = l => { const ok = l.serv === 'listo', st = Math.max(0, l.asig || 0), p = l.pend ? Math.min(100, Math.round(100 * st / l.pend)) : 0;
    return `<div class="r al-r ${ok ? 'ok' : ''}" data-open-lin="${esc(l.id)}" data-emp="${esc(l.emp)}" role="button" tabindex="0"><span class="t"><b>${ctag(l.emp)}${esc(l.desc)}</b><span>${esc(l.pedido)} L${l.linea} · ${esc(l.planta || '')}${l.cod ? ' · ' + esc(l.cod) : ''}</span>${l.ubic ? `<em class="ubic">${I.almacen || ''}${esc(l.ubic)}</em>` : ''}</span><span class="v num">${nf(l.pend)}<small>${ok ? '<i class="okd"></i>completa' : 'stock ' + nf(st) + ' de ' + nf(l.pend)}</small>${ok ? '' : `<u class="sbar"><i style="width:${p}%"></i></u>`}</span></div>`; };
  const body = keys.map(k => { const ls = grp[k], nc = ls.filter(l => l.serv === 'listo').length, u = ls.reduce((s,l) => s + (l.pend || 0), 0);
    const t = k === 'v' ? '<span class="late">Vencidas</span>' : diaLargo(pd(k)) + ' <small>' + relDia(pd(k)) + '</small>';
    return `<section class="box al-g"><div class="box-h lkh" ${k === 'v' ? 'data-go="pedidos" data-pf="late"' : `data-dia="${k}"`} role="button" tabindex="0"><h3>${t}</h3><span>${ls.length} ${ls.length === 1 ? 'línea' : 'líneas'} · ${nf(u)} uds${nc ? ` · <b class="okt">${nc} ${nc === 1 ? 'completa' : 'completas'}</b>` : ''}</span></div><div class="rows">${ls.map(fila).join('')}</div></section>`; }).join('');
  return `<div class="vh"><div><h1>Almacén</h1><p>Lo que se puede preparar con el stock del SGA${DATA.stock_fecha ? ' · datos del ' + dS(pd(DATA.stock_fecha)) : ''}. En verde, las líneas completas.</p></div>
    <div class="strip al-s"><span class="st ok lkh" data-lk="ir" data-to="al-lista" role="button" tabindex="0"><b class="num">${comp.length}</b><span>${comp.length === 1 ? 'línea completa' : 'líneas completas'} · ${nf(uds)} uds</span></span><span class="st lkh" data-lk="ir" data-to="al-lista" role="button" tabindex="0"><b class="num">${parc.length}</b><span>con stock parcial</span></span></div></div><i id="al-lista"></i>
    ${body || '<div class="box"><div class="empty">Nada que preparar con el stock de hoy.</div></div>'}`;
}
