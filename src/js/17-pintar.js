/* ---------- pintar ---------- */
let _vAnt = null;
/* v33 · Atrás del móvil: cada cambio de pantalla deja una entrada en el historial del navegador */
let _hk = null, _hPop = false;
function histPaso(){ if (_hPop || S.v === 'elegir' || S.v === 'tv') return; const k = S.v + '|' + (S.v === 'plan' ? (S.dia || '') + '|' + (S.pfs ? 1 : 0) : S.v === 'dia' ? (S.dia || '') : '');
  if (k === _hk) return; const st = {tl: 1, v: S.v, dia: S.dia || null, pfs: !!S.pfs, wk: S.wk ? +S.wk : null};
  try { if (_hk === null) history.replaceState(st, ''); else history.pushState(st, ''); } catch(_){} _hk = k; }
addEventListener('popstate', e => { if (S.pnl && !(e.state && e.state.pnl)){ cerrarPanel(false); return; } const st = e.state; if (!st || !st.tl) return; _hPop = true;
  try { S.sheet = null; S.pmas = false; S.v = st.v; S.dia = st.dia; if (st.wk) S.wk = new Date(st.wk); if (!st.pfs && S.pfs){ S.pfs = false; try { if (FS.on() && LS.get('taller.fs') !== '1') FS.salir(); } catch(_){} } else S.pfs = !!st.pfs; render(); scrollTo(0, 0); } finally { _hPop = false; }
  _hk = S.v + '|' + (S.v === 'plan' ? (S.dia || '') + '|' + (S.pfs ? 1 : 0) : S.v === 'dia' ? (S.dia || '') : ''); });
function render(){ setTimeout(histPaso, 0); if (S.v !== _vAnt){ _vAnt = S.v; const m = document.getElementById('main'); if (m){ m.classList.remove('v-in'); void m.offsetWidth; m.classList.add('v-in'); } }
  { const t = new Date(); t.setHours(0,0,0,0); if (+t !== +HOY){ const mes = t.getMonth() !== HOY.getMonth(); HOY = t; if (mes){ meses12(); reconstruir(); } } }
  if (S.v === 'elegir'){ renderElegir(); return; }
  document.body.classList.remove('picking');
  document.documentElement.dataset.emp = S.emp;
  document.body.classList.toggle('tv', S.v === 'tv');
  document.body.classList.toggle('cal', S.v === 'plan');
  if (S.v !== 'plan' && S.pfs){ S.pfs = false; try { if (screen.orientation && screen.orientation.unlock) screen.orientation.unlock(); } catch(_){} try { if (FS.on() && LS.get('taller.fs') !== '1') FS.salir(); } catch(_){} }
  document.body.classList.toggle('pfs', S.v === 'plan' && !!S.pfs);
  if (S.v === 'tv'){ $('main').innerHTML = vTv(); pintarFicha(); rolesAnidados(); return; }
  const nLate = LINEAS.filter(l => l.late && !l.term && secLin(l)).length;
  const nL = e => MOD[e].LINEAS.filter(l => l.late && !l.term).length;
  $('ctx').innerHTML = (EIDS.length > 1 ? `<div class="sw emp" role="group" aria-label="Empresa">${EIDS.map(e => `<button data-emp-sel="${e}" aria-pressed="${S.emp===e}">${esc(empN(e).toUpperCase())}${nL(e) ? `<span class="c">${nL(e)}</span>` : ''}</button>`).join('')}</div>` : '')
    + `<span class="tsel-chip ${S.sec}" title="Para cambiar de taller, toca el logo BM">${IT[S.sec]}${S.sec === 'todo' ? 'Total' : TNOM[S.sec] || 'Fresa'}</span>`;
  { const cm = $('chipm'); if (cm) cm.innerHTML = `<span class="tsel-chip ${S.sec}" data-go="elegir" role="button" tabindex="0" title="Cambiar de taller">${IT[S.sec]}<span>${S.sec === 'todo' ? 'Total' : TNOM[S.sec] || 'Fresa'}</span></span>`; }
  /* globo de retrasos por sección (de la empresa elegida) */
  const lateSec = {fresa: 0, torno: 0, secc: 0, todo: 0}; LINEAS.forEach(l => { if (!l.late || l.term) return; const a = artDeLin(l); const t = a ? tipoArt(a) : 'fresa'; if (lateSec[t] != null) lateSec[t]++; lateSec.todo++; });
  $('sec').innerHTML = tallerHTML(lateSec);
  if (S.v === 'almacen' && LS.get('taller.alm') !== '1') S.v = 'hoy';
  if ((S.v === 'talleres' || S.v === 'ofi') && !esTotal()) S.v = 'hoy';
  const nav = vistas().map(([k,t]) => `<button data-go="${k}" ${S.v===k || (S.v === 'dia' && k === 'hoy')?'aria-current="page"':''}>${k === 'plan' && S.v === 'plan' ? 'Plan' : t}${k==='pedidos'&&nLate?`<span class="c">${nLate}</span>`:''}${k==='msg'&&msgPend().length?`<span class="c">${msgPend().length}</span>`:''}</button>`).join('');
  $('nav').innerHTML = nav;
  /* v16 · En Artículos el buscador va grande en la fila de pestañas (se usa mucho); en el resto, arriba como siempre. */
  { const lb = $('q').closest('.srch'), art = S.v === 'articulos', dest = art ? $('nsrch') : $('btnQ').parentNode;
    document.body.classList.toggle('v-art', art);
    if (lb.parentNode !== dest){ if (art) dest.appendChild(lb); else dest.insertBefore(lb, $('btnQ')); }
    $('q').placeholder = art ? 'Buscar pieza, código, plano o pedido' : 'Pieza, código, plano o pedido'; }
  $('dock').innerHTML = vistas().map(([k,t]) => `<button data-go="${k}" ${S.v===k || (S.v === 'dia' && k === 'hoy')?'aria-current="page"':''}>${I[k]}<span>${k==='plan'?'Plan':t}</span>${k==='msg'&&msgPend().length?`<em class="dc">${msgPend().length}</em>`:''}</button>`).join('');
  const ts = new Date(DATA.ts), h = (Date.now() - ts)/36e5, viejo = DATA.export && diasA(pd(DATA.export)) < -3;
  $('fresh').className = 'fresh' + (h > 26 || viejo ? ' old' : ''); $('fresh').title = viejo ? 'Toca para actualizar' : 'Ver los pedidos de estos datos'; $('fresh').style.cursor = 'pointer';
  /* Fase 1 · la hora de los datos también se pincha: al día → la lista de pedidos de donde salen; vieja → actualizar (como antes). */
  { const f = $('fresh'); f.setAttribute('role', 'button'); f.tabIndex = 0; if (viejo){ delete f.dataset.go; delete f.dataset.pf; } else { f.dataset.go = 'pedidos'; f.dataset.pf = 'todo'; } }
  $('fresh').innerHTML = viejo ? `${esc(empN(S.emp))}: <b>pedidos del ${dS(pd(DATA.export))}</b><br>pendiente de actualizar` : `Datos de <b>${diasA(new Date(ts.getFullYear(),ts.getMonth(),ts.getDate()))===0?'hoy':dS(ts)} ${ts.toLocaleTimeString('es-ES',{hour:'2-digit',minute:'2-digit'})}</b><br>pedidos ${DATA.export?dS(pd(DATA.export)):'—'}`;
  S.mfoco = document.activeElement && document.activeElement.id === 'mtx';
  const _sc = $('wksc'), _scK = S.v + '|' + (+S.wk) + '|' + (S.dia || '') + '|' + S.sec + '|' + S.emp, _scL = _sc && S._scK === _scK ? [_sc.scrollLeft, _sc.scrollTop] : null; S._scK = _scK;
  const y = scrollY, csc = {}; document.querySelectorAll('[data-cls-col]').forEach(c => { const l = c.querySelector('.ccol-l'); if (l) csc[c.dataset.clsCol] = l.scrollTop; });
  $('main').innerHTML = S.v === 'dia' ? vDia() : S.v === 'plan' ? vPlan() : S.v === 'pedidos' ? vPedidos() : S.v === 'articulos' ? vArticulos() : S.v === 'talleres' ? vTalleres() : S.v === 'semana' ? vSemana() : S.v === 'almacen' ? vAlmacen() : S.v === 'msg' ? vMsg() : S.v === 'ofi' ? vOficina() : vHoy();
  if (S.keepY) { scrollTo(0, y); S.keepY = false; }
  Object.entries(csc).forEach(([k, v]) => { const l = document.querySelector('[data-cls-col="' + k + '"] .ccol-l'); if (l) l.scrollTop = v; });
  if (_scL){ const sc = $('wksc'); if (sc){ sc.scrollLeft = _scL[0]; sc.scrollTop = _scL[1]; } }
  if (S.foco && S.v === 'plan'){ const el = document.querySelector('.gh[data-dh="' + S.foco + '"]'), sc = $('wksc'); if (el && sc) sc.scrollLeft = Math.max(0, el.offsetLeft - (esMov() ? 62 : 190)); S.foco = null; }
  else if (S.v === 'plan' && !S.dia && esMov() && !_scL){ const el = document.querySelector('.gh[data-dh="' + iso(diaTrabajo(HOY)) + '"]'), sc = $('wksc'); if (el && sc) sc.scrollLeft = Math.max(0, el.offsetLeft - 62); }
  msgAvisos(); if (S.v === 'msg'){ adjMiniaturas(); const l = $('mtl'); if (l) l.scrollTop = l.scrollHeight; if (S.mfoco){ const x = $('mtx'); if (x){ x.focus(); const n = x.value.length; try { x.setSelectionRange(n, n); } catch(_){} } } }
  pintarFicha(); alto(); rolesAnidados();
}
/* Fase 4 · accesibilidad: una fila que se toca entera y lleva botones dentro no puede anunciarse como "botón" (botones dentro
   de un botón confunden al lector de pantalla). Pasa a "grupo" con su nombre; se sigue abriendo con el dedo, el ratón y Intro. */
function rolesAnidados(){ document.querySelectorAll('#main [role=button], #ov [role=button]').forEach(x => { if (x.tagName === 'BUTTON' || !x.querySelector('button,a[href],input,select,textarea,[role=button],[tabindex]')) return;
  x.setAttribute('role', 'group'); x.dataset.anid = '1'; if (!x.getAttribute('aria-label')){ const t = (x.querySelector('b') || x).textContent.trim().replace(/\s+/g, ' ').slice(0, 80); if (t) x.setAttribute('aria-label', t + ' · abrir'); } }); }
function alto(){ const t = document.querySelector('.top'); if (t) document.documentElement.style.setProperty('--toph', t.offsetHeight + 'px'); }
addEventListener('resize', alto);
addEventListener('keydown', e => { if (e.key === 'Escape' && S.pfs) planFs(false); });
['fullscreenchange', 'webkitfullscreenchange'].forEach(ev => document.addEventListener(ev, () => { if (S.pfs && !FS.on() && FS.ok() && document.documentElement.dataset.pfsfs === '1'){ document.documentElement.dataset.pfsfs = ''; planFs(false); } else if (FS.on() && S.pfs) document.documentElement.dataset.pfsfs = '1'; }));
/* al girar el móvil, volver a pintar (cambian columnas y Por planificar) */
{ let mq0 = null; addEventListener('resize', () => { const m = esMov(); if (mq0 !== null && m !== mq0 && S.v === 'plan') render(); mq0 = m; }); }
/* v14 · Entrar en un taller desde la portada. Total (los dos talleres) pide la clave de responsable.
   La clave es solo una puerta para que cada uno vea su trabajo: la app ya va cerrada con la contraseña del taller. */
function entrarTaller(e, t){
  try { sessionStorage.setItem('taller.elegido', '1'); } catch(_){}
  S.emp = e; LS.set('taller.emp', e); S.sec = t; LS.set('taller.sec', t);
  LS.set('taller.v', 'hoy'); usar(e); S.v = 'hoy'; S.sheet = null; render(); scrollTo(0, 0);
}
const PIN_OK = '1950';
/* v21 · "Recordar en este aparato": en el PC o la tablet de un responsable, Total deja de pedir la clave. */
const RESP_K = 'taller.resp', respOk = () => LS.get(RESP_K) === '1';
let PIN = null;
function pinPintar(err){
  if (!PIN) return;
  const k = ['1','2','3','4','5','6','7','8','9','x','0','b'];
  $('ov').innerHTML = `<div class="pin-s" data-pin-x="1"><div class="pin ${err ? 'bad' : ''}" role="dialog" aria-modal="true" aria-label="Clave de responsable">
    <h2>${PIN.then === 'panel' ? 'Panel de control' : 'Total'} · ${esc(empN(PIN.e))}</h2><p>${PIN.then === 'panel' ? 'Pedidos, precios y contratos. Clave de responsable.' : 'Los dos talleres. Clave de responsable.'}</p>
    <div class="pin-d" aria-label="${PIN.v.length} de 4">${[0,1,2,3].map(i => `<i class="${i < PIN.v.length ? 'on' : ''}"></i>`).join('')}</div>
    <div class="pin-e" role="alert">${err ? 'Clave incorrecta' : ''}</div>
    <div class="pin-k">${k.map(c => c === 'x' ? '<button class="fn" data-pin-x="1">Cancelar</button>' : c === 'b' ? '<button class="fn" data-pin-k="b" aria-label="Borrar">Borrar</button>' : `<button data-pin-k="${c}">${c}</button>`).join('')}</div>
    <button class="pin-r" data-pin-r="1" aria-pressed="${PIN.r ? 'true' : 'false'}"><i aria-hidden="true">${PIN.r ? '✓' : ''}</i>Recordar en este aparato</button>
  </div></div>`;
}
let PIN_IR = null; /* a dónde ir al acertar la clave (cifras de la portada) */
function pinAbrir(e, ir){ PIN = {e, v: '', r: false}; PIN_IR = ir || null; pinPintar(false); }
function pinCerrar(){ PIN = null; $('ov').innerHTML = ''; }
function pinTecla(c){
  if (!PIN) return;
  if (c === 'b'){ PIN.v = PIN.v.slice(0, -1); pinPintar(false); return; }
  if (!/^\d$/.test(c) || PIN.v.length >= 4) return;
  PIN.v += c; pinPintar(false);
  if (PIN.v.length === 4){
    if (PIN.v === PIN_OK){ const e = PIN.e, th = PIN.then; if (PIN.r) LS.set(RESP_K, '1'); pinCerrar(); if (th === 'panel'){ LS.set(RESP_K, '1'); abrirPanel(e); } else if (PIN_IR) { const ir = PIN_IR; PIN_IR = null; irDesdePortada(e, ir.v, ir.f); } else entrarTaller(e, 'todo'); }
    else { PIN.v = ''; setTimeout(() => pinPintar(true), 120); }
  }
}
document.addEventListener('keydown', e => { if (!PIN) return; if (/^\d$/.test(e.key)){ e.preventDefault(); pinTecla(e.key); } else if (e.key === 'Backspace'){ e.preventDefault(); pinTecla('b'); } else if (e.key === 'Escape'){ pinCerrar(); } }, true);
