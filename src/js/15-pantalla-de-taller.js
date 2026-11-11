/* ================= PANTALLA DE TALLER =================
   Para la tele o la tablet fija: tres pantallas que van pasando solas (Hoy, Urgente, Semana).
   Tocar una ficha la marca hecha; tocar arriba elige pantalla y para el pase 1 minuto. */
const TVP = [['hoy','Hoy en máquinas'],['urg','Urgente'],['sem','La semana']];
const tvpTitulo = (id, t, dT) => id === 'hoy' && +dT !== +HOY ? DIAS[dT.getDay()][0].toUpperCase() + DIAS[dT.getDay()].slice(1) + ' en máquinas' : t;
let tvT = null, tvPausa = 0;
function tvDue(inf){ return inf.due ? (inf.due < HOY || inf.late ? `<span class="lt">vencido ${dS(inf.due)}</span>` : 'entrega ' + dS(inf.due)) : ''; }
function vTv(){
  const now = new Date(), MV = maqVis(), dT = diaTrabajo(HOY), k = iso(dT), finde = +dT !== +HOY;
  const head = `<div class="tv-h"><div class="bm">BM</div><div class="tt"><b>Fabricación Bronymec</b><span>${esc(DIAS[now.getDay()][0].toUpperCase() + DIAS[now.getDay()].slice(1))} ${now.getDate()} de ${['enero','febrero','marzo','abril','mayo','junio','julio','agosto','septiembre','octubre','noviembre','diciembre'][now.getMonth()]} · semana ${semanaN(now)}${S.sec === 'todo' ? '' : ' · ' + SECN[S.sec]}</span></div>
    <div class="dots">${TVP.map(([id,t], i) => `<button data-tvp="${i}" aria-pressed="${S.tvp === i}">${tvpTitulo(id, t, dT)}</button>`).join('')}</div>
    <div class="clk"><b id="tvClk">${now.toLocaleTimeString('es-ES',{hour:'2-digit',minute:'2-digit'})}</b><span>${EIDS.map(e => esc(empN(e)) + ' ' + (EMPS[e].export ? dS(pd(EMPS[e].export)) : '—')).join(' · ')}</span></div>
    ${SYNC.on ? `<span class="sync ${SYNC.st}"><i></i>${esc(SYNC.msg)}</span>` : ''}<button class="out" data-tvout="1" title="Pasar a la app normal">${I.l} App</button></div>`;
  let body = '';
  if (TVP[S.tvp][0] === 'hoy'){
    const tvm = LS.get('taller.tvm') || '', MVv = tvm && MV.some(m => m.id === tvm) ? MV.filter(m => m.id === tvm) : MV, una = MVv.length === 1 && MV.length > 1;
    const sel = MV.length > 1 ? `<div class="tvm"><button data-tvm="" aria-pressed="${!tvm || MVv.length > 1}">Todas</button>${MV.map(m => `<button data-tvm="${esc(m.id)}" aria-pressed="${MVv.length === 1 && MVv[0].id === m.id}" style="--mc:${mcol(m.id)}">${esc(m.n)}</button>`).join('')}</div>` : '';
    body = sel + `<div class="tvl ${una ? 'una' : ''}" style="--nl:${MVv.length}">${MVv.map(m => { const its = itemsDe(m.id, k), nh = its.filter(i => i.done).length, u = its.reduce((s,i) => s + i.qty, 0);
      const max = una ? 14 : 7, vis = its.slice(0, max);
      return `<section class="tvc" style="--mc:${mcol(m.id)}"><div class="tvc-h"><b>${esc(m.n)}</b><div class="pg"><i style="width:${its.length ? pc(nh, its.length) : 0}%"></i></div><span>${its.length ? nh + ' de ' + its.length + ' hechas · ' + nf(u) + ' uds' : 'sin trabajo para hoy'}</span></div>
        <div class="tvc-b">${vis.map(it => { const inf = infoItem(it); if (!inf) return ''; const u2 = inf.libre ? 'libre' : inf.due ? urg(inf.due, inf.late) : 'ok';
          const quien = inf.libre ? (inf.cli || 'OTRO') : EIDS.length > 1 ? empN(inf.emp) : '';
          return `<div class="tvk ${u2} ${it.done ? 'done' : ''}" data-open-item="${esc(it.id)}" role="button" tabindex="0"><button class="tvchk" data-done="${esc(it.id)}" aria-label="${it.done ? 'Quitar hecho' : 'Marcar hecho'}">${it.done ? I.chk : ''}</button><div class="d">${esc(inf.desc)}</div><div class="q num">${nf(it.qty)}<small>uds</small></div>${pmHTML(it, 'tvpm')}<div class="k">${quien ? '<em>' + esc(quien.toUpperCase()) + '</em> · ' : ''}${esc(it.k === 'lin' ? inf.l.pedido + ' L' + inf.l.linea : (inf.cod || inf.ref || ''))}${tvDue(inf) ? ' · ' + tvDue(inf) : ''}</div></div>`; }).join('')}
        ${its.length > max ? `<div class="mas">y ${its.length - max} más</div>` : ''}${!its.length ? '<div class="vac">Nada planificado</div>' : ''}</div></section>`; }).join('')}</div>`;
  } else if (TVP[S.tvp][0] === 'urg'){
    const todas = [].concat(...EIDS.map(e => MOD[e].LINEAS.filter(l => !l.term && secLin(l))));
    const late = todas.filter(l => l.late || l.d < HOY).sort((a,b) => a.d - b.d);
    const fin = addD(lunes(HOY), 7), sem = todas.filter(l => !l.late && l.d >= HOY && l.d < fin).sort((a,b) => a.d - b.d);
    const fila = l => { const a = artDeLin(l), pl = plLin(l.id, l.emp) + (a ? plCod(a.key, a.emp) : 0);
      return `<div class="tvr" data-open-lin="${esc(l.id)}" data-emp="${esc(l.emp)}" role="button" tabindex="0"><span class="dt ${urg(l.d, l.late)}">${dS(l.d)}</span><span class="t"><b>${esc(l.desc)}</b><span>${EIDS.length > 1 ? esc(empN(l.emp).toUpperCase()) + ' · ' : ''}${esc(l.pedido)} L${l.linea} · ${esc(l.planta)}${l.late ? ' · ' + Math.abs(l.dias || 0) + ' días tarde' : ''}${pl ? ' · en el plan' : ' · sin planificar'}</span></span><span class="v num">${nf(l.pend)}<small>uds</small></span></div>`; };
    const cab = Math.max(6, Math.floor((innerHeight * 0.72) / (innerHeight * 0.068)));
    body = `<div class="tv2"><section class="tvbx"><h3>Con retraso <span>${late.length} ${late.length === 1 ? 'línea' : 'líneas'}</span></h3>${late.slice(0, cab).map(fila).join('') || '<div class="vac" style="margin:auto;color:var(--ok);font-size:2.4vh">Ninguna línea con retraso</div>'}${late.length > cab ? `<div class="mas" style="padding:1vh;text-align:center;color:var(--ink-3);font-size:1.8vh">y ${late.length - cab} más</div>` : ''}</section>
      <section class="tvbx"><h3>Vence esta semana <span>${sem.length}</span></h3>${sem.slice(0, cab).map(fila).join('') || '<div class="vac" style="margin:auto;color:var(--ink-3);font-size:2.2vh">Nada más esta semana</div>'}${sem.length > cab ? `<div class="mas" style="padding:1vh;text-align:center;color:var(--ink-3);font-size:1.8vh">y ${sem.length - cab} más</div>` : ''}</section></div>`;
  } else {
    const D = semanaDatos(lunes(HOY)), lts = D.emp.reduce((s,x) => s + x.lt, 0);
    body = `<div class="tv3"><div class="sn-g">
      <div class="sn ${D.cumple == null ? '' : D.cumple >= 90 ? 'g' : D.cumple < 70 ? 'r' : ''}" data-tvp="0" role="button" tabindex="0"><b class="num">${D.cumple == null ? '—' : D.cumple}<small>${D.cumple == null ? '' : '%'}</small></b><span>cumplimiento del plan</span><em>${D.vencen.filter(i => i.done).length} de ${D.vencen.length} fichas hasta hoy</em></div>
      <div class="sn" data-tvp="0" role="button" tabindex="0"><b class="num">${nf(D.uh)}<small>uds</small></b><span>fabricadas esta semana</span><em>de ${nf(D.u)} planificadas</em></div>
      <div class="sn ${lts ? 'r' : 'g'}" data-tvp="1" role="button" tabindex="0"><b class="num">${lts}</b><span>líneas con retraso</span><em>${D.emp.map(x => esc(empN(x.e)) + ' ' + x.lt).join(' · ')}</em></div>
      <div class="sn" data-tvp="1" role="button" tabindex="0"><b class="num">${D.emp.reduce((s,x) => s + x.sem, 0)}</b><span>entregas esta semana</span><em>${D.emp.map(x => esc(empN(x.e)) + ' ' + x.sem).join(' · ')}</em></div></div>
      <section class="tvbx tvmaq">${barrasMaq(D).replace(/data-go="plan"/g, '')}</section></div>`;
  }
  return `<div class="tvw">${head}<div class="tv-b">${body}</div><div class="tv-f"><span>${S.tvAuto && Date.now() > tvPausa ? 'Pasa sola cada 20 s' : 'Pase en pausa'}</span><div class="bar"><i id="tvBar"></i></div><span>Toca una ficha para verla · el círculo la marca hecha · desliza para cambiar</span></div></div>`;
}
let tvToque = 0, tvX0 = null, tvY0 = 0;
document.addEventListener('pointerdown', e => { if (S.v !== 'tv') return; tvToque = Date.now(); tvPausa = Date.now() + 60000; tvX0 = e.clientX; tvY0 = e.clientY; }, true);
document.addEventListener('pointerup', e => { if (S.v !== 'tv' || tvX0 == null || S.sheet) { tvX0 = null; return; } const dx = e.clientX - tvX0, dy = e.clientY - tvY0; tvX0 = null;
  if (Math.abs(dx) > 90 && Math.abs(dx) > Math.abs(dy) * 1.5){ S.tvp = (S.tvp + (dx < 0 ? 1 : TVP.length - 1)) % TVP.length; render(); tvCiclo(); } }, true);
setInterval(() => { if (S.v === 'tv' && S.sheet && Date.now() - tvToque > 90000){ S.sheet = null; pintarFicha(); render(); tvCiclo(); } }, 5000);
function tvCiclo(){
  clearTimeout(tvT); if (S.v !== 'tv') return;
  const b = $('tvBar'); if (b && S.tvAuto && Date.now() > tvPausa){ b.classList.remove('run'); void b.offsetWidth; b.style.animationDuration = '20s'; b.classList.add('run'); }
  tvT = setTimeout(() => { if (S.v !== 'tv') return; if (S.tvAuto && Date.now() > tvPausa && !S.sheet){ S.tvp = (S.tvp + 1) % TVP.length; } render(); tvCiclo(); }, Date.now() > tvPausa ? 20000 : tvPausa - Date.now() + 200);
}
setInterval(() => { const c = $('tvClk'); if (c) c.textContent = new Date().toLocaleTimeString('es-ES', {hour:'2-digit', minute:'2-digit'}); }, 15000);
