/* ================= SEMANA EN NÚMEROS =================
   Todo sale de datos reales: el plan del taller (lo planificado y lo marcado hecho) y los pedidos abiertos.
   Nada se estima ni se inventa. */
function semanaDatos(base){
  const ds = [0,1,2,3,4,5].map(i => addD(base, i)), keys = new Set(ds.map(iso)), fin = addD(base, 7);
  const hoyS = slotDia(HOY), vis = maqVis();
  const its = Object.values(PLAN.items).filter(it => keys.has(it.d) && vis.some(m => m.id === it.m));
  const vencen = its.filter(it => it.d <= hoyS);
  const porM = vis.map(m => { const xs = its.filter(it => it.m === m.id); const dn = xs.filter(it => it.done);
    return {m, n: xs.length, nh: dn.length, u: xs.reduce((s,i) => s + i.qty, 0), uh: dn.reduce((s,i) => s + i.qty, 0)}; });
  const porDia = ds.map(d => { const k = iso(d), xs = its.filter(it => it.d === k); return {d, k, n: xs.length, nh: xs.filter(i => i.done).length}; });
  const emp = EIDS.map(e => { const ab = MOD[e].LINEAS.filter(l => !l.term && secLin(l)), lt = ab.filter(l => l.late);
    return {e, ab: ab.length, lt: lt.length, med: lt.length ? Math.round(lt.reduce((s,l) => s + Math.abs(l.dias || diasA(l.d)), 0) / lt.length) : 0,
      sem: ab.filter(l => l.d >= base && l.d < fin).length, semU: ab.filter(l => l.d >= base && l.d < fin).reduce((s,l) => s + l.pend, 0),
      sig: ab.filter(l => l.d >= fin && l.d < addD(fin, 7)).length}; });
  const term = Object.values(PLAN.term).filter(t => t && t.ts && new Date(t.ts) >= base && new Date(t.ts) < fin).length;
  const libres = its.filter(it => it.k === 'libre').length;
  return {ds, its, vencen, porM, porDia, emp, term, libres, fin,
    n: its.length, nh: its.filter(i => i.done).length, u: its.reduce((s,i) => s + i.qty, 0), uh: its.filter(i => i.done).reduce((s,i) => s + i.qty, 0),
    cumple: vencen.length ? Math.round(vencen.filter(i => i.done).length / vencen.length * 100) : null};
}
const pc = (a, b) => b ? Math.round(a / b * 100) : 0;
function barrasMaq(D){
  return D.porM.map(x => `<div class="mb lkh" style="--mc:${mcol(x.m.id)}" data-go="plan" data-tvmq="${esc(x.m.id)}" role="button" tabindex="0"><b><i></i>${esc(x.m.n)}</b>
    <div class="tr" role="img" aria-label="${esc(x.m.n)}: ${nf(x.uh)} de ${nf(x.u)} uds hechas"><i style="width:${x.u ? Math.max(x.uh ? 2 : 0, pc(x.uh, x.u)) : 0}%"></i></div>
    <span class="v"><strong>${nf(x.uh)}</strong> de ${nf(x.u)} uds · ${x.nh}/${x.n} fichas</span></div>`).join('');
}
function vSemana(){
  const D = semanaDatos(S.wk), esta = +S.wk === +lunes(HOY);
  const T = EMPS.talgo && EMPS.talgo.punt;
  const lts = D.emp.reduce((s,x) => s + x.lt, 0);
  return `<div class="vh"><div><h1 data-txt>Semana ${semanaN(S.wk)} en números</h1><p><b class="tlk" data-go="plan" role="button" tabindex="0" title="Ver esta semana en el plan">${dS(D.ds[0])} al ${dS(addD(D.ds[5],1))}</b>${S.sec === 'todo' ? '' : ' · ' + SECN[S.sec]}. Con lo planificado en el calendario, lo marcado hecho y los pedidos abiertos. Sin estimaciones.</p></div>
    <div class="chips"><button class="btn ic" data-wk="-1" aria-label="Semana anterior">${I.l}</button><button class="btn" data-wk="0">Esta semana</button><button class="btn ic" data-wk="1" aria-label="Semana siguiente">${I.r}</button><button class="btn noart" data-print="resumen">${I.pr} Imprimir</button></div></div>
    <div class="sn-g">
      <div class="sn lkh ${D.cumple == null ? '' : D.cumple >= 90 ? 'g' : D.cumple < 70 ? 'r' : ''}" data-go="plan" role="button" tabindex="0"><b class="num">${D.cumple == null ? '—' : D.cumple}<small>${D.cumple == null ? '' : '%'}</small></b><span>cumplimiento del plan</span><em>${D.vencen.length ? D.vencen.filter(i => i.done).length + ' de ' + D.vencen.length + ' fichas que tocaban ' + (esta ? 'hasta hoy' : '') : 'nada que tocara todavía'}</em></div>
      <div class="sn lkh" data-go="plan" role="button" tabindex="0"><b class="num">${nf(D.uh)}<small>uds</small></b><span>fabricadas según el plan</span><em>de ${nf(D.u)} planificadas · ${D.nh} de ${D.n} fichas</em></div>
      <div class="sn lkh ${lts ? 'r' : 'g'}" data-go="pedidos" data-pf="late" role="button" tabindex="0"><b class="num">${lts}</b><span>líneas con retraso ahora</span><em>${D.emp.map(x => esc(empN(x.e)) + ' ' + x.lt + (x.lt ? ' (media ' + x.med + ' d)' : '')).join(' · ')}</em></div>
      <div class="sn lkh" data-go="pedidos" data-pf="sem" role="button" tabindex="0"><b class="num">${D.emp.reduce((s,x) => s + x.sem, 0)}</b><span>entregas que vencen esta semana</span><em>${D.emp.map(x => esc(empN(x.e)) + ' ' + x.sem + ' (' + nf(x.semU) + ' uds)').join(' · ')} · la siguiente: ${D.emp.reduce((s,x) => s + x.sig, 0)}</em></div>
      ${D.term ? `<div class="sn g lkh" data-go="pedidos" role="button" tabindex="0"><b class="num">${D.term}</b><span>líneas terminadas en taller</span><em>marcadas Terminado esta semana</em></div>` : ''}
      ${(() => { const ot = otrosFiltro('todo'), ol = ot.filter(o => o.late).length; return ot.length ? `<div class="sn lkh ${ol ? 'r' : ''}" data-lk="otros" data-f="${ol ? 'late' : 'todo'}" role="button" tabindex="0"><b class="num">${ot.length}</b><span>otros trabajos por hacer</span><em>${ol ? ol + ' con retraso · ' : ''}${nf(ot.reduce((s, o) => s + o.falta, 0))} uds · fuera de ${EIDS.map(empN).join(' y ')}</em></div>` : ''; })()}
    </div>
    <section class="box"><div class="box-h"><h3>Por máquina</h3><span>unidades hechas sobre planificadas</span></div>${barrasMaq(D) || '<div class="empty">Sin máquinas en esta sección.</div>'}</section>
    <section class="box" style="margin-top:14px"><div class="box-h"><h3>Día a día</h3><span>fichas hechas / planificadas</span></div>
      <div class="dl">${D.porDia.map((x,i) => `<div class="lkh ${x.k === slotDia(HOY) ? 'hoy' : ''}" data-dia="${x.k}" role="button" tabindex="0"><b class="num">${x.nh}/${x.n}</b><span>${i === 5 ? 'Finde' : DIAS[x.d.getDay()].slice(0,3)} ${x.d.getDate()}</span></div>`).join('')}</div></section>
    ${T && T.anio ? `<section class="box" style="margin-top:14px"><div class="box-h"><h3>Puntualidad con Talgo</h3><span>líneas servidas a tiempo por año · portal de Talgo</span></div>
      <div class="yr">${T.anio.map(y => { const v = pc(y.ok, y.n); return `<div title="${y.ok} de ${y.n} a tiempo"><b>${v}%</b><i style="height:${Math.max(4, v)}%"></i><span>${y.y} · ${y.n}</span></div>`; }).join('')}</div>
      <div class="note" style="padding:0 16px 14px">Retraso medio cuando llega tarde: ${T.med} días. Datos del panel Talgo (${EMPS.talgo.export ? 'foto del ' + dS(pd(EMPS.talgo.export)) : '—'}).</div></section>` : ''}`;
}

