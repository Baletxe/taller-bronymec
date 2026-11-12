/* ---------- impresión ---------- */
function imprimir(que){
  const pr = $('print'); const ts = new Date(DATA.ts);
  const pie = `<div class="pr-f"><span>Bronymec · Taller · ${EIDS.map(e => esc(empN(e)) + ': pedidos del ' + (EMPS[e].export ? dS(pd(EMPS[e].export)) : '—')).join(' · ')}</span><span>Impreso el ${new Date().toLocaleString('es-ES',{day:'numeric',month:'short',hour:'2-digit',minute:'2-digit'})}</span></div>`;
  const quien = inf => inf.libre ? (inf.cli || 'Otro') : EIDS.length > 1 ? empN(inf.emp) : '';
  const tarjeta = it => { const inf = infoItem(it); if (!inf) return ''; const u = inf.cod && inf.due && !inf.libre ? urg(inf.due, inf.late) : '';
    return `<div class="pr-c ${u}"><span class="ck"></span><b>${quien(inf) ? esc(quien(inf).toUpperCase()) + ' · ' : ''}${esc(inf.desc)}</b>${(() => { const c = it.k==='lin'?inf.l.pedido+' L'+inf.l.linea:(inf.cod||inf.ref); return c ? esc(c) + ' · ' : ''; })()}<span class="pq">${nf(it.qty)} uds</span>${inf.due ? ' · entrega ' + dS(inf.due) : ''}${it.nota?'<br>✎ '+esc(it.nota):''}</div>`; };
  if (que === 'resumen'){
    pr.innerHTML = `<div class="pr-h"><b>Bronymec · Taller</b><span>Impreso el ${new Date().toLocaleString('es-ES',{day:'numeric',month:'short',hour:'2-digit',minute:'2-digit'})}</span></div><div class="pr-sem">${vSemana().replace(/<div class="chips">[\s\S]*?<\/div><\/div>/, '</div>')}</div>${pie}`;
  } else if (que === 'semana'){
    const ds = diasSemana();
    pr.innerHTML = `<div class="pr-h"><b>Plan de máquinas${S.sec === 'todo' ? '' : ' · ' + SECN[S.sec]} · semana ${semanaN(ds[0])} (${dS(ds[0])} al ${dS(addD(ds[5],1))})</b><span>Marca la casilla al terminar cada ficha</span></div>
      <table class="pr-t"><thead><tr><th style="width:70px"></th>${ds.map((d,i) => `<th>${i===5?'Fin de semana':DIAS[d.getDay()][0].toUpperCase()+DIAS[d.getDay()].slice(1)+' '+dS(d)}</th>`).join('')}</tr></thead>
      <tbody>${maqVis().map(m => `<tr><td class="m">${esc(m.n)}</td>${ds.map(d => `<td>${itemsDe(m.id, iso(d)).map(tarjeta).join('')}</td>`).join('')}</tr>`).join('')}</tbody></table>${pie}`;
  } else {
    const k = slotDia(HOY);
    pr.innerHTML = maqVis().map(m => { const its = itemsDe(m.id, k); return `<div class="pr-day"><div class="pr-h"><b>${esc(m.n)} · ${DIAS[HOY.getDay()]} ${dS(HOY)}</b><span>${its.length} fichas</span></div>
      <table class="pr-list"><thead><tr><th style="width:24px">✓</th><th>Pieza</th><th>Código / pedido</th><th>Uds</th><th>Entrega</th><th style="width:44px">Prog.</th><th style="width:44px">Mat.</th><th>Nota</th></tr></thead><tbody>${its.map(it => { const inf = infoItem(it); if (!inf) return ''; return `<tr><td>☐</td><td><b>${esc(inf.desc)}</b></td><td>${quien(inf) ? esc(quien(inf)) + ' · ' : ''}${esc(it.k==='lin'?inf.l.pedido+' L'+inf.l.linea:(inf.cod||''))}</td><td><b>${nf(it.qty)}</b></td><td>${inf.due ? dS(inf.due) : '—'}</td><td>${it.prg ? '☑' : '☐'}</td><td>${it.mat ? '☑' : '☐'}</td><td>${esc(it.nota||'')}</td></tr>`; }).join('') || '<tr><td colspan="8">Sin trabajo planificado</td></tr>'}</tbody></table>${pie}</div>`; }).join('');
  }
  setTimeout(() => window.print(), 60);
}

/* Pantalla siempre encendida (Wake Lock): el sistema la suelta al cambiar de app; se vuelve a pedir al volver. */
let wl = null;
function despierta(){
  if (!('wakeLock' in navigator)) return;
  if (LS.get('taller.wake') === '1'){ if (!wl && document.visibilityState === 'visible') navigator.wakeLock.request('screen').then(x => { wl = x; x.addEventListener('release', () => { wl = null; }); }).catch(() => {}); }
  else if (wl){ wl.release().catch(() => {}); wl = null; }
}
document.addEventListener('visibilitychange', despierta);
despierta();

render(); if (S.v === 'tv') tvCiclo();
SYNC.iniciar();
if (location.protocol === 'file:') window.__TALLER_SYNC = SYNC;
setInterval(() => { const t = new Date(); t.setHours(0,0,0,0); if (+t !== +HOY && !S.drag && !S.sheet) render(); }, 60000);
/* Para las pruebas: solo en un fichero local o en un nombre .localhost (nunca en la web publicada). */
if (location.protocol === 'file:' || /\.localhost$/.test(location.hostname)) window.__TALLER = {S, PLAN, render, reconstruir, get ART(){ return ART; }, get LINEAS(){ return LINEAS; }, MOD, EMPS};
/* En la tablet (web): cada 2 minutos mira si hay datos nuevos y recarga cuando nadie está tocando la pantalla.
   El plan está guardado en la tablet, así que no se pierde nada al recargar. */
if (/^https?:/.test(location.protocol)){
  let toque = Date.now(), nueva = false;
  ['pointerdown','keydown','scroll'].forEach(ev => addEventListener(ev, () => { toque = Date.now(); }, {passive: true}));
  const recargar = () => { try { sessionStorage.setItem('taller.y', String(scrollY)); } catch(_){} location.reload(); };
  const mirar = () => {
    if (nueva){ decidir(); return; }
    fetch('version.json?t=' + Date.now(), {cache: 'no-store'}).then(r => r.ok ? r.json() : null).then(v => {
      if (v && v.ts && v.ts !== RAW.ts){ nueva = true; decidir(); }
    }).catch(() => {});
  };
  /* Si nadie toca la pantalla, recarga sola; si alguien la está usando, un botón y él decide. */
  /* v27: si la app estuvo en segundo plano más de 2 min y hay datos nuevos, recarga sin preguntar (nadie está a medias). */
  let oculto = 0; document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'hidden') oculto = Date.now(); });
  const decidir = () => {
    if (document.visibilityState !== 'visible') return;
    const viejos = Date.now() - new Date(RAW.ts || 0) > 3 * 36e5;
    if (!S.drag && !S.sheet && (Date.now() - toque > 20000 || (oculto && Date.now() - oculto > 120000) || viejos)) { recargar(); return; }
    if (!$('nd')){ const b = document.createElement('button'); b.id = 'nd'; b.className = 'newdata'; b.innerHTML = '<span>Hay datos nuevos de pedidos</span><b style="text-decoration:underline">Actualizar</b>'; b.onclick = recargar; document.body.appendChild(b); }
  };
  setInterval(mirar, RAW.export && diasA(pd(RAW.export)) < -3 ? 30000 : 120000);
  document.addEventListener('click', e => { if (e.target.closest('#fresh.old')) recargar(); });
  document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'visible') mirar(); });
  addEventListener('focus', mirar); setTimeout(mirar, 4000);
  window.__recargar = recargar;
  try { const y = +sessionStorage.getItem('taller.y'); sessionStorage.removeItem('taller.y'); if (y) setTimeout(() => scrollTo(0, y), 50); } catch(_){}
}
})();
