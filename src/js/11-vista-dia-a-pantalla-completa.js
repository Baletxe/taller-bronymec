/* ---------- v27 · Vista Día a pantalla completa (Jon, 21/10/2026: "pinchar el día y que coja toda la pantalla") ---------- */
const diaLab = d => { const w = d.getDay(); return w === 0 || w === 6 ? 'fin de semana' : ''; };
function vDia(){
  const k = S.dia || iso(diaTrabajo(HOY)), d = pd(k), E = entregasDia(), x = E[k], MV = maqVis();
  const ks = Object.keys(E).filter(q => q !== 'v').sort(), prevE = ks.filter(q => q < k).pop(), nextE = ks.find(q => q > k);
  const lab = d => { let p = addD(d, -1); while (p.getDay() === 0) p = addD(p, -1); let n = addD(d, 1); while (n.getDay() === 0) n = addD(n, 1); return [iso(p), iso(n)]; };
  const [kPrev, kNext] = lab(d);
  const ls = x ? x.ls : [], uds = x ? x.uds : 0, fab = x ? x.fab : 0;
  const comp = ls.filter(l => l.serv === 'listo' || l.term).length, conCod = ls.filter(l => l.conCod).length;
  const rel = diasA(d), relT = rel === 0 ? 'Hoy' : rel === 1 ? 'Mañana' : rel === -1 ? 'Ayer' : rel < 0 ? 'Hace ' + (-rel) + ' días' : 'En ' + rel + ' días';
  const maqs = MV.map(m => ({m, its: itemsDe(m.id, k)})).filter(z => z.its.length);
  const nIt = maqs.reduce((s, z) => s + z.its.length, 0), hIt = maqs.reduce((s, z) => s + z.its.reduce((a, it) => a + horasIt(it), 0), 0);
  const porPlanta = {}; ls.forEach(l => { const p = l.planta || '—'; porPlanta[p] = (porPlanta[p] || 0) + (l.pend || 0); });
  const plantas = Object.entries(porPlanta).sort((a, b) => b[1] - a[1]);
  return `<section class="dia-v">
    <div class="dia-h">
      <div class="dia-nav2"><button class="btn ic" data-dia="${kPrev}" aria-label="Día anterior">${I.l}</button><button class="btn" data-dia="${iso(diaTrabajo(HOY))}">Hoy</button><button class="btn ic" data-dia="${kNext}" aria-label="Día siguiente">${I.r}</button><span class="sp"></span><button class="btn" data-go="hoy">${I.l} Volver</button></div>
      <h1><small>${relT} · semana ${semanaN(lunes(d))}${diaLab(d) ? ' · ' + diaLab(d) : ''}</small>${diaLargo(d)}</h1>
      <div class="dia-k">
        <div class="st lkh" data-lk="ir" data-to="dia-ent" role="button" tabindex="0"><b class="num">${ls.length}</b><span>${ls.length === 1 ? 'línea a entregar' : 'líneas a entregar'}</span></div>
        <div class="st lkh" data-lk="ir" data-to="dia-ent" role="button" tabindex="0"><b class="num">${nf(uds)}</b><span>uds a entregar</span></div>
        <div class="st lkh ${fab ? 'warn' : 'ok'}" data-lk="ir" data-to="dia-ent" role="button" tabindex="0"><b class="num">${nf(fab)}</b><span>${fab ? 'por fabricar' : 'todo cubierto'}</span></div>
        <div class="st ok lkh" data-lk="ir" data-to="dia-ent" role="button" tabindex="0"><b class="num">${comp}</b><span>${comp === 1 ? 'completa' : 'completas'}</span></div>
        <div class="st lkh" data-lk="ir" data-to="dia-maq" role="button" tabindex="0"><b class="num">${nIt}</b><span>${nIt === 1 ? 'trabajo en máquina' : 'trabajos en máquina'}${nIt ? ' · ' + fmtH(hIt) + ' h' : ''}</span></div>
      </div>
      ${plantas.length > 1 ? `<div class="dia-pl">${plantas.map(([p, u]) => `<span class="chip on lkh" data-lk="ir" data-to="dia-ent" role="button" tabindex="0">${esc(p)} <b class="num">${nf(u)}</b></span>`).join('')}</div>` : ''}
    </div>
    <div class="dia-g">
      <section class="box" id="dia-ent"><div class="box-h"><h3>Entregas del día</h3><span>${ls.length ? `<button class="lk" ${prevE ? `data-dia="${prevE}"` : 'disabled'}>${I.l} anterior</button> · <button class="lk" ${nextE ? `data-dia="${nextE}"` : 'disabled'}>siguiente entrega ${I.r}</button>` : ''}</span></div>
        <div class="rows">${ls.length ? entRows(ls) : `<div class="empty">Ninguna línea de pedido vence este día.${nextE ? ` <button class="lk" data-dia="${nextE}">Ir a la siguiente entrega (${dS(pd(nextE))})</button>` : ''}</div>`}</div></section>
      <section class="box" id="dia-maq"><div class="box-h"><h3>En máquinas ese día</h3><button class="tlk cnt2" data-dia-plan="${k}">${MV.length} ${MV.length === 1 ? 'máquina' : 'máquinas'} · planificar</button></div>
        ${maqs.length ? maqs.map(z => `<div class="dia-m"><h4 class="lkh" data-lk="pdia" data-k="${k}" role="button" tabindex="0"><i class="dot ${z.m.c}"></i>${esc(z.m.n)}<small>${z.its.length} · ${fmtH(z.its.reduce((a, it) => a + horasIt(it), 0))} h</small></h4><div class="dia-cc">${z.its.map(cardItem).join('')}</div></div>`).join('') : '<div class="empty">Nada planificado en máquinas para este día.</div>'}
        <div class="acts" style="margin-top:12px"><button class="btn pri" data-dia-plan="${k}">Planificar este día</button></div></section>
    </div></section>`;
}
function vHoy(){
  const dT = diaTrabajo(HOY), hoyS = iso(dT), d = HOY, finde = +dT !== +HOY;
  const pend = LINEAS.filter(l => !l.term && secLin(l));
  const late = pend.filter(l => l.late);
  const fab = ARTS.filter(a => a.cod && a.falta > 0 && secPlan(a));
  const sinPlan = fab.filter(a => restoArt(a) > 0 && diasA(a.first) <= 7).sort((a,b) => a.first - b.first);
  /* v51 · la cifra de Hoy cuenta lo mismo que la lista a la que lleva (Artículos · A fabricar) y que la portada */
  const fabT = ARTS.filter(a => a.falta > 0 && secOk(a)), ufab = fabT.reduce((s,a) => s + a.falta, 0);
  const fin = addD(lunes(HOY), 7);
  const venceSem = pend.filter(l => l.d >= HOY && l.d < fin).length;
  const MV = maqVis();
  const lateL = late.slice().sort((a,b) => a.d - b.d);
  const artF = fab.filter(a => !a.soloPrev).sort((a,b) => (b.late?1:0) - (a.late?1:0) || a.first - b.first);
  const maqHoy = MV.map(m => {
    const its = itemsDe(m.id, hoyS), c = carga([m], hoyS);
    const fila = it => { const inf = infoItem(it); if (!inf) return ''; return `<div class="mq-i ${it.done?'done':''}" data-open-item="${esc(it.id)}" role="button" tabindex="0"><button class="chk" data-done="${esc(it.id)}" aria-label="${it.done?'Quitar hecho':'Marcar hecho'}">${it.done?I.chk:''}</button><span>${esc(inf.desc)}</span>${pmHTML(it, 'mini')}<b class="num">${nf(it.qty)}</b></div>`; };
    return `<section class="mq" style="--mc:${mcol(m.id)}"><div class="mq-h lkh" data-lk="pdia" data-k="${hoyS}" role="button" tabindex="0" title="Ver el día en Planificación"><span class="av">${esc(sigla(m.n))}</span><b>${esc(m.n)}</b><span>${its.length ? c.nh + '/' + its.length + ' hechas' : 'libre'}</span><button class="mq-add" data-libre-new="${esc(m.id)}|${hoyS}" aria-label="Otro trabajo en ${esc(m.n)}" title="Otro trabajo">+</button></div>${c.cap || c.n ? `<div class="lkh" data-lk="pdia" data-k="${hoyS}" role="button" tabindex="0">${gauge(c)}</div>` : ''}
      <div class="mq-b" data-cell="${esc(m.id)}|${hoyS}">${its.slice(0,4).map(fila).join('')}${its.length > 4 ? `<button class="mq-mas" data-go="plan">+${its.length - 4} más</button>` : ''}${its.length ? '' : '<div class="mq-v">Nada para hoy</div>'}</div></section>`;
  }).join('');
  const manana = diaTrabajo(addD(dT, 1)), nMan = carga(MV, iso(manana));
  const vis = new Set(MV.map(m => m.id));
  const riesgo = Object.values(PLAN.items).filter(it => !it.done && vis.has(it.m) && it.k !== 'libre').map(it => ({it, inf: infoItem(it)})).filter(x => x.inf && x.inf.due && !(x.inf.a && x.inf.a.soloPrev) && !x.inf.term && pd(x.it.d) > x.inf.due && pd(x.it.d) >= dT).sort((a,b) => a.inf.due - b.inf.due);
  const saludo = (h => h < 6 ? 'Gabon' : h < 13 ? 'Egun on' : h < 20 ? 'Arratsalde on' : 'Gabon')(new Date().getHours());
  const ts = new Date(DATA.ts);
  const nSD = S.sec === 'todo' ? sinDecidir().length : 0;
  return `<div class="avs">` + instHTML() + viejoAviso() + syncAviso() + (nSD && esTotal() ? `<div class="hoy-cls">${IT.todo}<span><b class="tlk" data-go="talleres" role="button" tabindex="0">${nSD} ${nSD === 1 ? 'pieza con pedido no sabe' : 'piezas con pedido no saben'}</b> todavía si son de fresa, torno, seccionadora o subcontrata (ninguna regla las reconoce).</span><button class="btn" data-go="talleres">Decidir en Talleres</button></div>` : '') + `</div><div class="hoy-h"><div><h1 class="lkh" data-dia="${iso(d)}" role="button" tabindex="0" title="Ver el día">${EIDS.length > 1 ? (S.emp === 'todo' ? 'Taller' : esc(empN(S.emp))) + ' · ' : ''}${DIAS[d.getDay()][0].toUpperCase()+DIAS[d.getDay()].slice(1)}, ${d.getDate()} de ${MESL[d.getMonth()]}</h1>
    <p>${saludo}. <b class="tlk" data-go="semana" role="button" tabindex="0" title="Ver la semana en números">Semana ${semanaN(d)}</b> · ${esc(tallerN())}. ${late.length ? `<b class="tlk" data-go="pedidos" data-pf="late" role="button" tabindex="0">${late.length} ${late.length===1?'línea va':'líneas van'} con retraso</b>, ` : 'Ninguna línea con retraso, '}<b class="tlk fl" data-go="articulos" data-af="fab" role="button" tabindex="0">${nf(ufab)} uds por fabricar</b>${sinPlan.length?` y <b class="tlk" data-lk="porplan" role="button" tabindex="0">${sinPlan.length} ${sinPlan.length===1?'artículo urgente está':'artículos urgentes están'} sin planificar</b>`:''}.</p>
    <p class="hoy-meta" ${/^https?:/.test(location.protocol) ? 'data-recargar="1" role="button" tabindex="0" title="Actualizar"' : ''}>Datos de ${diasA(new Date(ts.getFullYear(),ts.getMonth(),ts.getDate()))===0?'hoy':dS(ts)} ${ts.toLocaleTimeString('es-ES',{hour:'2-digit',minute:'2-digit'})} · pedidos del ${DATA.export ? dS(pd(DATA.export)) : '—'}</p></div>
    ${msgPend().length ? `<button class="msg-alert" data-go="msg">${I.msg}<span><b>${msgPend().length} ${msgPend().length === 1 ? 'mensaje por contestar' : 'mensajes por contestar'}</b> para ${esc(GR[yoG()])}</span><em>Ver</em></button>` : ''}
    <div class="strip">
      <button class="st r" data-go="pedidos" data-pf="late"><b class="num">${late.length}</b><span>líneas retrasadas</span></button>
      ${riesgo.length ? `<button class="st r" data-riesgo="1" title="Fichas planificadas para después de su fecha de entrega"><b class="num">${riesgo.length}</b><span>planificadas tarde</span></button>` : ''}
      <button class="st a" data-go="pedidos" data-pf="sem"><b class="num">${venceSem}</b><span>entregas esta semana</span></button>
      ${otrosHoyHTML()}
      <button class="st" data-go="articulos" data-af="fab"><b class="num">${nf(ufab)}</b><span>uds a fabricar · ${fabT.length} artículos</span></button>
      <button class="st" data-go="articulos" data-af="prev"><b class="num">${nf(ARTS.filter(secPlan).reduce((s,a) => s + a.prev3, 0))}</b><span>uds en previsión · 3 meses</span></button>
    </div></div>
    <div class="hoy-g"><div class="hoy-l">${mesHTML()}${riesgo.length ? `<section class="box riesgo" id="riesgo" style="margin-top:14px"><div class="box-h lkh" data-lk="pdia" data-k="${hoyS}" role="button" tabindex="0"><h3 class="h-late">Saldrán tarde <em class="num">${riesgo.length}</em></h3><span>adelántalas o avisa al cliente</span></div><div class="rows">${riesgo.slice(0,6).map(x => `<div class="r" data-open-item="${esc(x.it.id)}" role="button" tabindex="0"><span class="dt late">${Math.round((pd(x.it.d) - x.inf.due) / 864e5)} d tarde</span><span class="t"><b>${esc(x.inf.desc)}</b><span>${esc(maqDe(x.it.m).n)} · ${diaCorto(pd(x.it.d))} · entrega ${dS(x.inf.due)}</span></span><span class="v num">${nf(x.it.qty)}<small>uds</small></span></div>`).join('')}${riesgo.length > 6 ? `<div class="empty">y ${riesgo.length - 6} más en Planificación</div>` : ''}</div></section>` : ''}</div>
    <div class="hoy-r">${proxHTML()}
      <section class="box"><div class="box-h lkh" data-go="pedidos" data-pf="late" role="button" tabindex="0"><h3 class="h-late">Con retraso <em class="num">${lateL.length}</em></h3><span>${lateL.length ? 'la más antigua: ' + (lateL[0].dias || 0) + ' días' : ''}</span></div>
        <div class="rows">${lateL.slice(0,7).map(l => { const al = artDeLin(l), sub = al && FUERA[tipoArt(al)], rl = sub ? 0 : al && restoArt(al) === 0 ? 0 : restoLin(l); return `<div class="r" data-open-lin="${esc(l.id)}" data-emp="${esc(l.emp)}" role="button" tabindex="0"><span class="dt late">${l.dias || 0} d tarde</span><span class="t"><b>${ctag(l.emp)}${esc(l.desc)}</b><span>${esc(l.pedido)} L${l.linea} · ${esc(l.planta || '')} · ${nf(l.pend)} uds</span></span>${l.serv === 'listo' ? '<span class="ok-t">Completa en stock</span>' : sub ? '<span class="ok-t" style="color:var(--ink-3)">' + TNOM[tipoArt(al)] + '</span>' : rl > 0 ? `<button class="go" data-plan-lin="${esc(l.id)}">Planificar ${nf(rl)}</button>` : `<span class="ok-t">En el plan${(() => { const pdx = al && planDia(al.key, al.emp); return pdx ? '<br>' + diaCorto(pdx) : ''; })()}</span>`}</div>`; }).join('') || '<div class="empty">Ninguna línea con retraso.</div>'}
        ${lateL.length > 7 ? `<div class="empty"><button class="btn" data-go="pedidos" data-pf="late">Ver las ${lateL.length}</button></div>` : ''}</div></section>
      <section class="box"><div class="box-h lkh" data-lk="porplan" role="button" tabindex="0"><h3>Urgente y sin planificar <em class="num">${sinPlan.length}</em></h3><span>entrega en 7 días o vencido</span></div>
        <div class="rows">${sinPlan.slice(0,7).map(a => { const u = urg(a.first, a.late);
          return `<div class="r" data-open-art="${esc(a.key)}" data-emp="${esc(a.emp)}" role="button" tabindex="0"><span class="dt ${u}">${u==='late'?'Vencido':dS(a.first)}</span><span class="t"><b>${ctag(a.emp)}${esc(a.desc)}</b><span>${esc(a.cod)} · ${a.lines.length} ${a.lines.length===1?'línea':'líneas'}${a.prev6 ? ' · detrás +' + nf(a.prev6) : ''}</span></span><button class="go" data-plan-art="${esc(a.key)}">Planificar ${nf(restoArt(a))}</button></div>`; }).join('') || '<div class="empty">Todo lo urgente ya está planificado.</div>'}
        ${sinPlan.length > 7 ? `<div class="empty"><button class="btn" data-prop="1">${I.mg} Proponer dónde van los ${sinPlan.length}</button></div>` : ''}</div></section>
    </div></div>
    <div class="mqs-h"><h3>${finde ? 'El ' + DIAS[dT.getDay()] + ' ' + dS(dT) + ' en máquinas' : 'Hoy en máquinas'}</h3><span>${finde ? 'Es fin de semana: se planifica ya para el ' + DIAS[dT.getDay()] + ' · ' : ''}<b class="tlk" data-lk="pdia" data-k="${iso(manana)}" role="button" tabindex="0">${DIAS[manana.getDay()][0].toUpperCase() + DIAS[manana.getDay()].slice(1)} ${dS(manana)}: ${nMan.n} fichas · ${fmtH(nMan.h)} de ${fmtH(nMan.cap)} h</b></span><button class="btn" data-go="plan">Abrir planificación</button></div>
    <div class="mqs">${maqHoy || '<div class="box"><div class="empty">Sin máquinas en este taller.</div></div>'}</div>
    <div class="cols2">
      <section class="box"><div class="box-h lkh" data-go="articulos" data-af="fab" role="button" tabindex="0"><h3>Artículos a fabricar <em class="num">${artF.length}</em></h3><span>todo lo pendiente de cada pieza, sumando pedidos</span></div>
        <div class="rows">${artF.slice(0,8).map(a => `<div class="r ra" data-open-art="${esc(a.key)}" data-emp="${esc(a.emp)}" role="button" tabindex="0"><span class="dt ${urg(a.first, a.late)}">${a.late || a.first < HOY ? 'Vencido' : dS(a.first)}</span><span class="t"><b>${ctag(a.emp)}${esc(a.desc)}</b><span>${esc(a.cod)} · ${a.peds.size} ${a.peds.size===1?'pedido':'pedidos'}${a.prev3 ? ' · previsión 3 m: ' + nf(a.prev3) : ''}${restoArt(a) === 0 ? (() => { const pdx = planDia(a.key, a.emp); return ' · en el plan' + (pdx ? ' · ' + diaCorto(pdx) : ''); })() : ''}</span></span><span class="v num">${nf(a.falta)}<small>uds a fabricar</small></span></div>`).join('') || '<div class="empty">Nada por fabricar.</div>'}
        ${artF.length > 8 ? `<div class="empty"><button class="btn" data-go="articulos" data-af="fab">Ver los ${artF.length}</button></div>` : ''}</div></section>
      ${vieneHTML()}
    </div>
`;
}

function vieneHTML(){
  const xs = ARTS.filter(a => a.prev3 > 0 && secPlan(a)).sort((a,b) => b.prev3 - a.prev3);
  return `<section class="box"><div class="box-h lkh" data-go="articulos" data-af="prev" role="button" tabindex="0"><h3>Lo que viene</h3><span>previsión de ${esc(cliN())} · 3 meses</span></div>
    <div class="rows">${xs.slice(0,10).map(a => `<button class="r" data-open-art="${esc(a.key)}" data-emp="${esc(a.emp)}"><span class="dt">${a.lines.length ? a.peds.size + ' ped.' : 'sin ped.'}</span><span class="t"><b>${ctag(a.emp)}${esc(a.desc)}</b><span>${esc(a.cod || 'sin código')}${a.refs.size ? ' · ' + esc([...a.refs][0]) : ''}${a.pend ? ' · ' + nf(a.pend) + ' uds en pedido' : ''}</span></span><span class="v num">${nf(a.prev3)}<small>uds previstas</small></span></button>`).join('') || '<div class="empty" data-txt>Sin previsión en los próximos 3 meses.</div>'}
    ${xs.length > 10 ? `<div class="empty"><button class="btn" data-go="articulos" data-af="prev">Ver las ${xs.length}</button></div>` : ''}</div></section>`;
}
function nPorPlanificar(){ return ARTS.filter(a => a.falta > 0 && restoArt(a) > 0 && secPlan(a)).length; }
function backlog(){
  const lim7 = addD(HOY, 7), lim14 = addD(HOY, 14);
  const f = S.blf;
  const pasa = d => f === 'todo' || (f === 'urg' && d < lim7) || (f === 'dos' && d < lim14);
  let html, n = 0;
  if (S.bl === 'art'){
    const xs = ARTS.filter(a => a.falta > 0 && restoArt(a) > 0 && secPlan(a) && (f !== 'late' || a.late || a.first < HOY) && (f === 'late' || pasa(a.first)) && casa(txtArt(a))).sort((a,b) => (a.cod?0:1)-(b.cod?0:1) || a.first - b.first);
    n = xs.length; html = xs.map(a => cardArt(a)).join('');
  } else {
    const xs = LINEAS.filter(l => l.falta > 0 && restoLin(l) > 0 && secPlan(artDeLin(l)) && (f !== 'late' || l.late || l.d < HOY) && (f === 'late' || pasa(l.d)) && casa(txtLin(l))).sort((a,b) => a.d - b.d);
    n = xs.length; html = xs.map(l => cardLin(l)).join('');
  }
  const nV = (S.bl === 'art' ? ARTS.filter(a => a.falta > 0 && restoArt(a) > 0 && secPlan(a) && (a.late || a.first < HOY)) : LINEAS.filter(l => l.falta > 0 && restoLin(l) > 0 && secPlan(artDeLin(l)) && (l.late || l.d < HOY))).length;
  const ch = (k,t) => `<button class="chip" data-blf="${k}" aria-pressed="${S.blf===k}">${t}</button>`;
  return `<aside class="bl"><div class="bl-h"><h2>Por planificar <button class="tlk cnt" data-blf="todo" title="Ver todo">${n}</button><button class="btn" data-big="1" title="Ocultar la lista y ver el calendario entero">Ocultar</button></h2>
    <div class="seg"><button data-bl="art" aria-pressed="${S.bl==='art'}">Por artículo</button><button data-bl="lin" aria-pressed="${S.bl==='lin'}">Por pedido</button></div>
    <div class="chips">${ch('todo','Todo')}${ch('late', nV ? 'Vencido · ' + nV : 'Vencido')}${ch('urg','7 días')}${ch('dos','14 días')}</div></div>
    <div class="bl-list" data-backlog="1" tabindex="0" aria-label="Por planificar">${html || `<div class="bl-empty">${S.q ? 'Nada con «'+esc(S.q)+'».' : 'Todo lo que hay que fabricar ya está en el calendario.'}</div>`}</div>
    <div class="bl-hint">Arrastra una ficha a una máquina y un día (en la tablet, mantenla pulsada). Para quitarla del calendario, tráela aquí. Tocándola ves la pieza y eliges el lote.</div></aside>`;
}
function diasPlan(){ if (S.dia) return [pd(S.dia)]; const n = S.wk2 ? 2 : 1, out = []; for (let w = 0; w < n; w++) for (let i = 0; i < 6; i++) out.push(addD(S.wk, w*7 + i)); return out; }
/* v15 · Vista de un día: Hoy y Mañana a pantalla entera. Se salta el domingo, y el sábado si ninguna máquina trabaja. */
const diaAbre = d => d.getDay() !== 0 && (d.getDay() !== 6 || maqVis().some(m => capDia(m, d) > 0));
function diaMover(d, n){ let x = d; for (let i = 0; i < 14; i++){ x = addD(x, n); if (diaAbre(x)) return x; } return addD(d, n); }
I.undo = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M9 14L4 9l5-5"/><path d="M4 9h10.5a5.5 5.5 0 0 1 0 11H11"/></svg>';
const diaHoy = () => iso(diaTrabajo(HOY)), diaManana = () => iso(diaMover(diaTrabajo(HOY), 1));

/* v29 · móvil: vertical estrecho o móvil girado */
const esMov = () => { try { return matchMedia('(max-width:760px), (max-height:520px) and (orientation:landscape)').matches; } catch(_){ return false; } };
I.fsOn = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 9V4h5M20 9V4h-5M4 15v5h5M20 15v5h-5"/></svg>';
I.fsOff = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M9 4v5H4M15 4v5h5M9 20v-5H4M15 20v-5h5"/></svg>';
I.mas = '<svg viewBox="0 0 24 24" fill="currentColor"><circle cx="5" cy="12" r="2.1"/><circle cx="12" cy="12" r="2.1"/><circle cx="19" cy="12" r="2.1"/></svg>';
function planFs(on){ S.pfs = on; S.pmas = false;
  if (on){ if (FS.ok() && !FS.on()) FS.entrar(); setTimeout(() => { try { if (FS.on() && screen.orientation && screen.orientation.lock) screen.orientation.lock('landscape').catch(() => {}); } catch(_){} }, 250); }
  else { try { if (screen.orientation && screen.orientation.unlock) screen.orientation.unlock(); } catch(_){} if (FS.on() && LS.get('taller.fs') !== '1') FS.salir(); }
  render(); }
function vPlan(){
  const ds = diasPlan(), hoyS = iso(diaTrabajo(HOY)), MV = maqVis(), vis = new Set(MV.map(m => m.id)), keys = new Set(ds.map(iso));
  const enRango = Object.values(PLAN.items).filter(it => keys.has(it.d) && vis.has(it.m));
  const sem = semanaN(ds[0]), semF = semanaN(ds[ds.length-1]);
  const cols = 'var(--mcw) ' + ds.map(d => d.getDay() === 6 ? 'minmax(calc(var(--cw) * .7),.7fr)' : 'minmax(var(--cw),1fr)').join(' ');
  const cg = (hh, cap) => ({h: hh, cap, p: cap ? hh / cap : (hh ? 9 : 0)});
  const capT = ds.reduce((s,d) => s + MV.reduce((t,m) => t + capDia(m, d), 0), 0), hT = enRango.reduce((s,i) => s + horasIt(i), 0);
  const head = `<div class="gh corner" data-go="semana" role="button" tabindex="0" title="Ver la semana en números"><b>${esc(tallerN())}</b><span>${MV.length} ${MV.length === 1 ? 'máquina' : 'máquinas'} · ${enRango.length} fichas</span>${capT ? gauge(cg(hT, capT)) : ''}</div>` + ds.map(d => {
    const fin = d.getDay() === 6, k = iso(d), today = k === hoyS, c = carga(MV, k);
    return `<div class="gh ${today?'today':''} ${fin?'fin':''} ${S.foco === k ? 'foco' : ''}" data-dh="${k}" data-dia="${k}"><div class="gd" data-dia="${k}" role="button" tabindex="0" title="Ver el día entero"><span class="dn">${fin ? 'Finde' : DIAS[d.getDay()].slice(0,3)}</span><b>${d.getDate()}</b><span class="mo">${MESES[d.getMonth()]}${S.wk2 && d.getDay() === 1 ? ' · sem. ' + semanaN(d) : ''}</span></div>${c.cap || c.n ? gauge(c) : '<div class="gg z"><span>Cerrado</span></div>'}</div>`;
  }).join('');
  const fila = m => { const its = enRango.filter(it => it.m === m.id), hh = its.reduce((s,i) => s + horasIt(i), 0), cap = ds.reduce((s,d) => s + capDia(m, d), 0);
    return `<div class="gm" style="--mc:${mcol(m.id)}" data-lk="maq" role="button" tabindex="0" title="${S.dia ? 'Ver la semana' : 'Ver solo hoy'}"><span class="av">${esc(sigla(m.n))}</span><div class="gmi"><b>${esc(m.n)}</b><span>${its.length} ${its.length===1?'ficha':'fichas'} · ${nf(its.reduce((s,i)=>s+i.qty,0))} uds</span>${cap ? gauge(cg(hh, cap)) : ''}</div></div>` + ds.map(d => {
      const k = iso(d), its2 = itemsDe(m.id, k), fin = d.getDay() === 6, c = carga([m], k);
      const cls = (k === hoyS ? 'today ' : '') + (d < HOY && k !== slotDia(HOY) ? 'past ' : '') + (fin ? 'fin ' : '') + (S.foco === k ? 'foco' : '');
      return `<div class="cell ${cls}" style="--mc:${mcol(m.id)}" data-cell="${esc(m.id)}|${k}">${its2.map(cardItem).join('')}<button class="add" data-libre-new="${esc(m.id)}|${k}" aria-label="Otro trabajo en ${esc(m.n)}">+ Trabajo</button>${c.n || c.cap ? `<div class="cf">${gauge(c)}</div>` : ''}</div>`;
    }).join(''); };
  const grupos = S.sec === 'todo' ? [['fresa','Taller de fresa'],['torno','Taller de torno'],['secc','Seccionadora']].map(([t,n]) => ({t, n, ms: MV.filter(m => m.t === t)})).filter(g => g.ms.length) : [{t: S.sec, n: '', ms: MV}];
  const rows = grupos.map(g => (g.n ? `<div class="gsep t-${g.t}" style="grid-column:1/-1"><span>${IT[g.t]}${g.n}</span></div>` : '') + g.ms.map(fila).join('')).join('');
  const pasados = Object.values(PLAN.items).filter(it => !it.done && vis.has(it.m) && pd(it.d) < HOY && it.d !== slotDia(HOY));
  const nB = nPorPlanificar();
  const mov = esMov(), sinLista = S.dia ? !S.diaB : (mov ? !S.blM : S.big), d0 = ds[0], tit = S.dia ? DIAS[d0.getDay()][0].toUpperCase() + DIAS[d0.getDay()].slice(1) + ' ' + d0.getDate() : '';
  return `${syncAviso()}<div class="plan z-${S.z} ${sinLista ? 'big' : ''} ${S.dia ? 'dia' : ''}">${sinLista ? '' : backlog()}
    <section class="wk"><div class="wk-h ${S.pmas ? 'mas' : ''}">
      <button class="btn prop" data-prop="1" title="Coloca lo pendiente en los huecos libres, por fecha de entrega">${I.mg} Proponer</button>
      <button class="btn ic" ${S.dia ? 'data-pnav="-1" aria-label="Día anterior"' : 'data-wk="-1" aria-label="Semana anterior"'}>${I.l}</button>
      <div class="wk-t" role="button" tabindex="0" data-wkpick="1" title="Abrir el calendario para ir a otra semana">${S.dia ? `<h2><span class="tl">${esc(tit)}</span><span class="ts">${esc(DIAS[d0.getDay()].slice(0,3))} ${d0.getDate()}<span class="tm"> ${MESES[d0.getMonth()].slice(0,3)}</span></span></h2><div class="sub">${MESES[d0.getMonth()]} · semana ${semanaN(d0)}</div>` : `<h2><span class="tl">Semana </span><span class="ts">S</span>${sem}${S.wk2 && semF !== sem ? '–' + semF : ''}</h2><div class="sub">${dS(ds[0])} al ${dS(addD(ds[ds.length-1],1))}${+S.wk === +lunes(diaTrabajo(HOY)) ? ' · <b class="esta">esta semana</b>' : ''}</div>`}</div>
      <button class="btn ic" ${S.dia ? 'data-pnav="1" aria-label="Día siguiente"' : 'data-wk="1" aria-label="Semana siguiente"'}>${I.r}</button>
      <div class="seg vdia" role="group" aria-label="Un día"><button data-pday="hoy" aria-pressed="${S.dia === diaHoy()}">Hoy</button><button data-pday="man" aria-pressed="${S.dia === diaManana()}">Mañana</button><button class="msem" data-wk2="${S.wk2 ? 1 : 0}" aria-pressed="${!S.dia}">Semana</button></div>
      <button class="btn ic mfs" data-pfs="1" aria-pressed="${!!S.pfs}" aria-label="${S.pfs ? 'Salir de pantalla completa' : 'Pantalla completa'}" title="${S.pfs ? 'Salir de pantalla completa' : 'Pantalla completa (gira el móvil para ver la semana entera)'}">${S.pfs ? I.fsOff + '<span class="fsx">Salir</span>' : I.fsOn}</button>
      <button class="btn ic mmas" data-pmas="1" aria-expanded="${!!S.pmas}" aria-label="Más acciones">${I.mas}${nB ? `<i class="mbg">${nB > 99 ? '99+' : nB}</i>` : ''}</button>
      <div class="seg w2" role="group" aria-label="Semanas a la vista"><button data-wk2="0" aria-pressed="${!S.dia && !S.wk2}">1 semana</button><button data-wk2="1" aria-pressed="${!S.dia && S.wk2}">2 semanas</button></div>
      <span class="sp"></span>
      <button class="btn" data-libre-new="">+ Otro trabajo</button>
      ${sinLista ? `<button class="btn" data-big="1">Por planificar${nB ? ' (' + nB + ')' : ''}</button>` : (mov ? '<button class="btn" data-big="1">Ocultar Por planificar</button>' : '')}
      ${pasados.length ? `<button class="btn" data-traer="1">Pasar a hoy lo no hecho (${pasados.length})</button>` : ''}
      ${historial.length ? `<button class="btn" data-undo="1" title="Deshacer" aria-label="Deshacer">${I.undo}<span class="tx">Deshacer</span></button>` : ''}
      <button class="btn pri noart" data-print="semana" title="Imprimir" aria-label="Imprimir">${I.pr}<span class="tx">Imprimir</span></button>
      <div class="seg z" role="group" aria-label="Tamaño de las fichas"><button data-z="s" aria-pressed="${S.z==='s'}" title="Compacto">A</button><button data-z="m" aria-pressed="${S.z==='m'}" title="Normal">A</button><button data-z="l" aria-pressed="${S.z==='l'}" title="Grande">A</button></div>
    </div>
    ${S.pfs ? `<button class="pfs-back" data-go="hoy" aria-label="Volver a Hoy">${I.l}<span>Volver</span></button>` : ''}<div class="wk-sc" id="wksc" style="--nm:${Math.max(1, MV.length)};--nd:${ds.length};--nsab:${ds.filter(d => d.getDay() === 6).length}"><div class="grid" style="grid-template-columns:${S.dia ? 'var(--mcwd) minmax(0,1fr)' : cols};${S.dia ? '' : `min-width:calc(var(--mcw) + ${ds.filter(d => d.getDay() !== 6).length} * var(--cw) + ${ds.filter(d => d.getDay() === 6).length} * var(--cw) * .7)`}">${head}${rows || '<div class="empty" style="grid-column:1/-1">Sin máquinas en este taller.</div>'}</div></div></section></div>`;
}
/* Proponer: lo pendiente sin planificar del taller, por fecha de entrega (lo vencido primero), en el primer hueco libre
   de una máquina de su taller en las próximas dos semanas laborables. No toca nada hasta que se aplica. */
function proponer(){
  const MV = maqVis(); if (!MV.length) return [];
  const dias = []; let d = diaTrabajo(HOY);
  for (let i = 0; dias.length < 10 && i < 30; i++, d = addD(d, 1)){ if (d.getDay() === 0) continue; if (d.getDay() === 6 && !MV.some(m => capDia(m, d) > 0)) continue; dias.push(d); }
  const libre = {}, puestos = {}; dias.forEach(dd => { const k = iso(dd); MV.forEach(m => { const its = itemsDe(m.id, k); libre[m.id + '|' + k] = capDia(m, dd) - its.reduce((s,i) => s + horasIt(i), 0); puestos[m.id + '|' + k] = its.map(i => { const inf = infoItem(i); return inf ? mat(inf.desc) : ''; }); }); });
  const tipos = new Set(MV.map(m => m.t));
  const pool = [].concat(...EIDS.map(e => MOD[e].ARTS.filter(a => a.cod && !a.soloPrev && a.falta > 0 && restoArt(a) > 0 && tipos.has(tipoArt(a)))))
    .sort((a,b) => ((b.late || b.first < HOY) - (a.late || a.first < HOY)) || a.first - b.first).slice(0, 60);
  return pool.map(a => {
    const t = tipoArt(a), hh = (PLAN.hp || {})[a.key] || HDEF(), ms = MV.filter(m => m.t === t);
    for (const dd of dias){ const k = iso(dd);
      const ma = mat(a.desc), igual = m => ma && (puestos[m.id + '|' + k] || []).includes(ma) ? 1 : 0;
      const c = ms.map(m => ({m, r: libre[m.id + '|' + k]})).filter(x => x.r > 0 && x.r >= Math.min(hh, capDia(x.m, dd))).sort((x,y) => igual(y.m) - igual(x.m) || y.r - x.r)[0];
      if (c){ libre[c.m.id + '|' + k] -= hh; (puestos[c.m.id + '|' + k] = puestos[c.m.id + '|' + k] || []).push(ma); return {a, q: restoArt(a), m: c.m, k, h: hh, tarde: dd > a.first, junto: !!igual(c.m)}; } }
    return {a, q: restoArt(a), m: null, k: null, h: hh};
  });
}
function fichaProp(){
  const P = S.prop || [], ok = P.filter(x => x.m), sin = P.filter(x => !x.m), tarde = ok.filter(x => x.tarde);
  const porDia = {}; ok.forEach(x => { (porDia[x.k] = porDia[x.k] || []).push(x); });
  return `<div class="scrim" data-close="1"></div><aside class="sheet wide" role="dialog" aria-modal="true" aria-label="Propuesta de planificación">
    <div class="sh-h"><div><h2>Propuesta de planificación</h2><p>${esc(tallerN())} · lo pendiente sin planificar, por fecha de entrega, en los huecos libres de las dos próximas semanas.</p></div><button class="x" data-close="1" aria-label="Cerrar">${I.x}</button></div>
    <div class="sh-b">
      ${!P.length ? '<div class="okbox">No hay nada pendiente sin planificar en este taller.</div>' : `<div class="kv"><div><b class="num">${ok.length}</b><span>fichas con hueco</span></div><div><b class="num" style="color:${tarde.length ? 'var(--late)' : 'var(--ok)'}">${tarde.length}</b><span>saldrían después de la entrega</span></div><div><b class="num">${sin.length}</b><span>sin hueco en 2 semanas</span></div></div>`}
      ${Object.keys(porDia).sort().map(k => `<div class="sec"><h3>${etiquetaDia(k)[0].toUpperCase() + etiquetaDia(k).slice(1)}</h3>${porDia[k].map(x => `<label class="pp ${x.tarde ? 'late' : ''}"><input type="checkbox" data-pi="${P.indexOf(x)}" checked><span class="t"><b>${esc(x.a.desc)}</b><span>${etag(x.a.emp)}${matTag(x.a.desc)}${esc(x.a.cod)} · entrega ${dS(x.a.first)}${x.tarde ? ' · sale tarde' : ''}${x.junto ? ' · junto a su material' : ''}</span></span><span class="pm" style="--mc:${mcol(x.m.id)}">${esc(x.m.n)}</span><span class="v num">${nf(x.q)}<small>uds · ${fmtH(x.h)} h</small></span></label>`).join('')}</div>`).join('')}
      ${sin.length ? `<div class="sec"><h3>Sin hueco en las dos próximas semanas</h3>${sin.map(x => `<div class="ln"><div><b>${esc(x.a.desc)}</b><span>${esc(x.a.cod)} · entrega ${dS(x.a.first)}</span></div><div class="rq num">${nf(x.q)} uds</div></div>`).join('')}<div class="note">Sube las horas de las máquinas en Ajustes o planifícalas a mano más adelante.</div></div>` : ''}
      ${ok.length ? `<div class="note">Agrupa en la misma máquina y día las piezas del mismo material (deducido de la descripción) para ahorrar cambios. Cuenta ${fmtH(HDEF())} h por ficha cuando la pieza no tiene horas guardadas (se guardan al poner las horas en una ficha). Todo se puede deshacer.</div><div class="acts sticky"><button class="btn pri" data-prop-ok="1">Planificar las marcadas</button><button class="btn" data-close="1">Cancelar</button></div>` : ''}
    </div></aside>`;
}

function vPedidos(){
  const f = S.pf, fin = addD(lunes(HOY), 7);
  let xs = LINEAS.filter(l => casa(txtLin(l)) && secLin(l) && (f === 'term' ? l.term : !l.term));
  if (f === 'late') xs = xs.filter(l => l.late);
  if (f === 'sem') xs = xs.filter(l => l.d >= HOY && l.d < fin);
  if (f === 'listo') xs = xs.filter(l => l.serv === 'listo');
  if (f === 'fab') xs = xs.filter(l => l.falta > 0);
  xs.sort((a,b) => a.d - b.d);
  const grp = {}; xs.forEach(l => { const k = l.late || l.d < HOY ? 'v' : iso(l.d); (grp[k] = grp[k] || []).push(l); });
  const keys = Object.keys(grp).sort((a,b) => a === 'v' ? -1 : b === 'v' ? 1 : a.localeCompare(b));
  const est = l => { const a = artDeLin(l); return l.term ? ['listo','Terminado en taller'] : l.serv === 'listo' ? ['listo','Completa en stock'] : !l.conCod ? ['nocod','Código por confirmar'] : a && tipoArt(a) === 'sub' ? ['nada','Subcontrata'] : l.falta === 0 ? ['nada','No hay que fabricar'] : l.falta < l.pend ? ['parcial','Fabricar ' + nf(l.falta)] : ['sin','A fabricar']; };
  const ch = (k,t) => `<button class="chip" data-pf="${k}" aria-pressed="${S.pf===k}">${t}</button>`;
  const body = keys.map(k => { const ls = grp[k]; const t = k === 'v' ? 'Vencidas' : diaLargo(pd(k)) + ' <small>S' + semanaN(pd(k)) + ' · ' + relDia(pd(k)) + '</small>';
    return `<div class="wkgrp"><h4 class="lkh" ${k === 'v' ? 'data-go="pedidos" data-pf="late"' : `data-dia="${k}"`} role="button" tabindex="0">${t} <span>${ls.length} ${ls.length===1?'línea':'líneas'} · ${nf(ls.reduce((s,l)=>s+l.pend,0))} uds</span></h4>${ls.map(l => { const e = est(l), u = urg(l.d, l.late), pl = plLin(l.id, l.emp);
      const a = artDeLin(l);
      return `<button class="pl" data-open-lin="${esc(l.id)}" data-emp="${esc(l.emp)}"><span class="dt ${u}">${dS(l.d)}<small>${l.late ? Math.abs(l.dias||0)+' d tarde' : diasA(l.d)===0 ? 'hoy' : 'en '+diasA(l.d)+' d'}</small></span>
        <span><b>${ctag(l.emp)}${esc(l.desc)}</b><span class="mut">${esc(l.cod || 'sin código')} · ${esc(l.ref)}${a && a.peds.size > 1 ? ' · referencia: ' + nf(a.pend) + ' uds en ' + a.peds.size + ' pedidos' : ''}</span><span class="mut only-s"><b>${esc(l.pedido)} L${l.linea}</b><span class="est ${e[0]}">${e[1]}</span>${sgaHTML(l, true)}</span></span>
        <span class="hide-s"><b>${esc(l.pedido)} L${l.linea}</b><span class="mut">${esc(l.planta)}</span></span>
        <span class="q num${l.serv === 'listo' ? ' ok' : ''}">${nf(l.pend)}<small>pendientes</small></span>
        <span class="hide-s"><span class="est ${e[0]}"><i></i>${e[1]}</span>${sgaHTML(l, true)}</span></button>`; }).join('')}</div>`; }).join('');
  const nT = LINEAS.filter(l => l.term).length;
  return `<div class="vh"><div><h1>Pedidos pendientes</h1><p><b class="tlk" data-go="pedidos" data-pf="todo" role="button" tabindex="0" title="Ver todas">${LINEAS.filter(l => !l.term && secLin(l)).length} líneas abiertas</b> de ${esc(cliN())}${S.sec === 'todo' ? '' : ' (' + SECN[S.sec] + ')'} por día de entrega. Toca una línea para ver su pieza, lo pendiente y la previsión.</p></div>
    <div class="chips">${ch('todo','Todas')}${ch('late','Retrasadas')}${ch('sem','Esta semana')}${ch('fab','A fabricar')}${nT ? ch('term','Terminadas en taller ('+nT+')') : ''}</div></div>
    ${body || (otrosFiltro(S.pf).length ? '' : '<div class="box"><div class="empty">Ninguna línea con este filtro.</div></div>')}${otrosPedidosHTML()}`;
}

function vArticulos(){
  let xs = ARTS.filter(a => casa(txtArt(a)) && (FUERA[S.af] ? tipoArt(a) === S.af : secOk(a)));
  if (FUERA[S.af]) xs = xs.filter(a => !a.soloPrev && !a.term);
  if (S.af === 'fab') xs = xs.filter(a => a.falta > 0);
  if (S.af === 'prev') xs = xs.filter(a => a.prev6 > 0);
  if (S.af === 'todo') xs = xs.filter(a => !a.soloPrev || S.q);
  xs.sort(S.af === 'prev' ? ((a,b) => b.prev6 - a.prev6) : ((a,b) => (b.falta>0) - (a.falta>0) || a.first - b.first));
  const ch = (k,t) => `<button class="chip" data-af="${k}" aria-pressed="${S.af===k}">${t}</button>`;
  return `<div class="vh"><div><h1>Artículos</h1><p data-txt>${S.af === 'prev' ? 'Piezas con previsión en los próximos 6 meses, de más a menos. Sirve para decidir si conviene fabricar un lote más largo.' : 'Lo pendiente de cada pieza en todos sus pedidos, ' + 'cuánto falta por fabricar y su previsión.'}</p></div>
    <div class="chips">${ch('fab','A fabricar')}${ch('prev','Con previsión')}${['sub','adit'].map(t => { const n = ARTS.filter(a => tipoArt(a) === t && !a.soloPrev && !a.term).length; return n ? ch(t, TNOM[t] + ' · ' + n) : ''; }).join('')}${ch('todo','Todos')}</div></div>
    <div class="agrid">${xs.map(a => { const pl = plCod(a.key, a.emp), u = a.falta === 0 ? 'cub' : a.cod ? urg(a.first, a.late) : 'ok';
      const wP = a.falta ? Math.min(100, Math.round(Math.min(pl, a.falta) / a.falta * 100)) : 100;
      return `<button class="ac ${u}" data-open-art="${esc(a.key)}" data-emp="${esc(a.emp)}"><b>${ctag(a.emp)}${esc(a.desc)}</b><span class="k">${esc(a.cod || 'Código por confirmar')}${a.refs.size?' · '+esc([...a.refs].slice(0,2).join(', ')):''}${TTAG(tipoArt(a))}</span>
        <div class="nums"><div><b class="num">${nf(a.pend)}</b><span>pendiente · ${a.peds.size} ${a.peds.size===1?'pedido':'pedidos'}</span></div><div><b class="num">${nf(pl)}</b><span>planificadas</span></div><div><b class="num" style="color:${a.falta?'var(--late)':'var(--ok)'}">${nf(a.falta)}</b><span>a fabricar</span></div></div>
        <div class="bar" title="parte planificada de lo que hay que fabricar"><i style="width:${wP}%;background:var(--brand)"></i></div>
        <div class="pie"><span>${a.soloPrev ? 'Sin pedido abierto' : a.term ? 'Terminado en taller' : a.lines.length + ' ' + (a.lines.length===1?'línea':'líneas') + ' · entrega ' + dS(a.first)}</span><span>${pl ? nf(pl) + ' planificadas' + (() => { const pdx = planDia(a.key, a.emp); return pdx ? ' · ' + diaCorto(pdx) : ''; })() : a.prev6 ? 'previsión 6 m: <b>' + nf(a.prev6) + '</b>' : a.falta ? 'sin planificar' : 'cubierto'}</span></div></button>`; }).join('') || '<div class="box"><div class="empty">Ningún artículo con este filtro.</div></div>'}</div>`;
}


