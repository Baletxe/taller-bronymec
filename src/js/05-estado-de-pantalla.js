/* ---------- estado de pantalla ---------- */
const S = {v: (LS.get('taller.v') || 'hoy'), wk: lunes(diaTrabajo(HOY)), q: '', bl: 'art', blf: 'todo', pf: 'todo', af: 'fab', sheet: null, drag: null,
  emp: LS.get('taller.emp'), sec: LS.get('taller.sec') || 'todo'};
if (['hoy','plan','pedidos','articulos','talleres','semana','tv','almacen','msg','ofi'].indexOf(S.v) < 0) S.v = 'hoy';
S.mf = 'mios'; S.mth = null; S.mdraft = ''; S.mfiles = []; S.mpara = null; S.mresp = true; S.mref = null; S.yoEdit = false;
S.tf = 'abiertas'; S.rgt = 'torno';
S.tvp = 0; S.tvAuto = true;
if (['todo','fresa','torno','secc'].indexOf(S.sec) < 0) S.sec = 'todo';
S.mes = null; S.foco = null; S.prop = null; S.dia = null; S.diaB = false; S.pmes = null;
S.big = LS.get('taller.big') === '1'; S.z = ['s','m','l'].includes(LS.get('taller.z')) ? LS.get('taller.z') : 'm'; S.wk2 = LS.get('taller.wk2') === '1';
const elegido = !!(S.emp && EMPS[S.emp]);
let yaElegido = false; try { yaElegido = sessionStorage.getItem('taller.elegido') === '1'; } catch(_){}
if (S.v !== 'tv' && (!elegido || !yaElegido)) S.v = 'elegir';
if (!S.emp || !EMPS[S.emp]) S.emp = EIDS[0];
reconstruir();
const tema = t => { if (t) document.documentElement.dataset.theme = t; else delete document.documentElement.dataset.theme; };
tema(PLAN.tema);

const I = {
  hoy:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><rect x="3" y="5" width="18" height="16" rx="2"/><path d="M3 10h18M8 3v4M16 3v4"/><circle cx="12" cy="15" r="1.6" fill="currentColor"/></svg>',
  plan:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><rect x="3" y="4" width="18" height="16" rx="2"/><path d="M3 9h18M9 9v11M15 9v11"/></svg>',
  pedidos:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M8 6h13M8 12h13M8 18h13M3 6h.01M3 12h.01M3 18h.01"/></svg>',
  articulos:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linejoin="round"><path d="M12 3l8 4.5v9L12 21l-8-4.5v-9z"/><path d="M12 12l8-4.5M12 12v9M12 12L4 7.5"/></svg>',
  chk:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><path d="M5 12l5 5L20 7"/></svg>',
  x:'<svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"><path d="M6 6l12 12M18 6L6 18"/></svg>',
  l:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round"><path d="M15 6l-6 6 6 6"/></svg>',
  r:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round"><path d="M9 6l6 6-6 6"/></svg>',
  pr:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M7 9V4h10v5"/><rect x="4" y="9" width="16" height="7" rx="1.5"/><path d="M7 14h10v6H7z"/></svg>'
};
const VIEWS = [['hoy','Hoy'],['plan','Planificación'],['pedidos','Pedidos'],['articulos','Artículos'],['talleres','Talleres'],['semana','Semana'],['ofi','Oficina'],['msg','Mensajes']];
I.msg = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 12a8 8 0 0 1-11.6 7.1L4 20.5l1.4-4.8A8 8 0 1 1 21 12z"/><path d="M8.5 10.5h7M8.5 14h4.5"/></svg>';
I.clip = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 11.5l-8.6 8.6a5.5 5.5 0 0 1-7.8-7.8l8.9-8.9a3.7 3.7 0 0 1 5.2 5.2l-8.9 8.9a1.8 1.8 0 0 1-2.6-2.6l8.1-8.1"/></svg>';
I.del = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 7h16M10 11v6M14 11v6M6 7l1 12a2 2 0 0 0 2 2h6a2 2 0 0 0 2-2l1-12M9 7V4h6v3"/></svg>';
I.send = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 12l16-8-6 16-2.5-6.5z"/><path d="M11.5 13.5L20 4"/></svg>';
I.semana = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M4 20V10M10 20V4M16 20v-7M22 20H2"/></svg>';
I.mg = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 3l1.8 4.7 4.7 1.8-4.7 1.8L12 16l-1.8-4.7L5.5 9.5l4.7-1.8z"/><path d="M19 15l.8 2.2 2.2.8-2.2.8L19 21l-.8-2.2L16 18l2.2-.8z"/></svg>';
I.almacen = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 21V8l9-5 9 5v13"/><path d="M7 21v-8h10v8M7 17h10"/></svg>';
const IT = {
  fresa: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><g transform="rotate(38 12 12)"><rect x="9.6" y="1.2" width="4.8" height="5.6" rx="1"/><path d="M8.2 6.8h7.6v12.4c0 .9-.7 1.6-1.6 1.6H9.8c-.9 0-1.6-.7-1.6-1.6z"/><path d="M8.2 11.2l7.6-3.4M8.2 15.4l7.6-3.4M8.6 19.6l7.2-3.2"/></g></svg>',
  torno: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="8.5"/><circle cx="12" cy="12" r="2.6"/><path d="M12 3.5v4.2M4.6 16.3l3.7-2.1M19.4 16.3l-3.7-2.1"/></svg>',
  todo: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="4" width="7.5" height="16" rx="2"/><rect x="13.5" y="4" width="7.5" height="16" rx="2"/></svg>'};
IT.sub = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M2 6.5h11v9.5H2zM13 9.5h4.2l3.3 3.4v3.1H13"/><circle cx="6" cy="17.5" r="1.9"/><circle cx="17" cy="17.5" r="1.9"/></svg>';
I.talleres = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="4" width="5" height="16" rx="1.5"/><rect x="9.5" y="4" width="5" height="11" rx="1.5"/><rect x="16" y="4" width="5" height="7" rx="1.5"/></svg>';
IT.secc = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="10.5" r="6"/><circle cx="12" cy="10.5" r="1.7"/><path d="M12 2.5v2M12 16.5v2M4 10.5h2M18 10.5h2M6.3 4.8l1.4 1.4M16.3 14.8l1.4 1.4M6.3 16.2l1.4-1.4M16.3 6.2l1.4-1.4"/><path d="M2.5 21.5h19"/></svg>';
/* v26: icono de aditiva (capas de impresión) */
IT.adit = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 3l8 4.5-8 4.5-8-4.5z"/><path d="M4 12l8 4.5 8-4.5"/><path d="M4 16.5L12 21l8-4.5"/></svg>';
const TALLER = [['fresa','Fresa'],['torno','Torno'],['secc','Seccionadora'],['todo','Total']];
I.back = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round"><path d="M15 5l-7 7 7 7"/></svg>';
I.lock = '<svg class="lk" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><rect x="5" y="11" width="14" height="10" rx="2"/><path d="M8 11V8a4 4 0 0 1 8 0v3"/></svg>';
I.pc = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="4" width="18" height="13" rx="2.5"/><path d="M7 13l3-3 2.5 2.5L17 8M8 21h8M12 17v4"/></svg>';
I.prod = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 21V10l5 3V10l5 3V7l8 4v10z"/><path d="M7 17h2M12 17h2M17 17h1"/></svg>';
I.ext = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><path d="M14 4h6v6M20 4l-9 9M18 14v5a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V7a1 1 0 0 1 1-1h5"/></svg>';
I.arr = '<svg class="ar" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round"><path d="M5 12h14M13 6l6 6-6 6"/></svg>';
function tallerHTML(lt){ return `<div class="tll" role="group" aria-label="Taller">${TALLER.map(([k,t]) => `<button data-sec="${k}" class="t-${k}" aria-pressed="${S.sec===k}"${lt && lt[k] ? ` aria-label="${t}: ${lt[k]} con retraso"` : ''}>${IT[k]}<span>${t}</span>${lt && lt[k] ? `<em class="num" aria-hidden="true">${lt[k]}</em>` : ''}</button>`).join('')}</div>`; }
const esTotal = () => S.sec === 'todo';
/* v27: Talleres (decidir fresa/torno/…) solo para Total; en un taller no hay nada del otro. */
const vistas = () => (LS.get('taller.alm') === '1' ? VIEWS.concat([['almacen','Almacén']]) : VIEWS).filter(([k]) => (k !== 'talleres' && k !== 'ofi') || esTotal());
const tallerN = () => S.sec === 'todo' ? 'Todos los talleres' : S.sec === 'torno' ? 'Taller de torno' : S.sec === 'secc' ? 'Seccionadora' : 'Taller de fresa';
/* v28b: datos viejos, a la vista en Hoy */
function viejoAviso(){ const ts = new Date(DATA.ts), hh = (Date.now() - ts) / 36e5, viejo = DATA.export && diasA(pd(DATA.export)) < -3;
  if (!(hh > 26 || viejo)) return '';
  return `<div class="inst old" ${/^https?:/.test(location.protocol) ? 'data-recargar="1" role="button" tabindex="0"' : ''}><div><b>Estos datos son del ${dS(ts)} a las ${ts.toLocaleTimeString('es-ES', {hour: '2-digit', minute: '2-digit'})}${viejo ? ' · pedidos del ' + dS(pd(DATA.export)) : ''}</b><span>${/^https?:/.test(location.protocol) ? 'La app se actualiza sola cada hora; si ves esto, toca Actualizar.' : 'Esta copia no se actualiza sola: abre la app desde la web.'}</span></div><span class="sp"></span>${/^https?:/.test(location.protocol) ? '<button class="btn pri" data-recargar="1">Actualizar</button>' : ''}</div>`; }
const enClaude = () => !/(^|\.)github\.io$/.test(location.hostname) && /^https?:/.test(location.protocol);
function syncAviso(){
  /* Regla 11: en la copia de Claude (artifact) no hay conexión con GitHub, y se avisa siempre (antes solo si el plan estaba conectado y fallaba). */
  if (document.documentElement.dataset.artifact || (enClaude() && SYNC.on && SYNC.st === 'err')) return `<div class="sbar info" data-lk="web" role="button" tabindex="0"><i></i><div><b>Aquí, dentro de Claude, el plan compartido no se puede abrir</b><span>Claude no deja que sus páginas se conecten con el plan (GitHub). Los pedidos, artículos y entregas sí están al día. Para ver y mover el calendario, abre la app.</span></div><button class="btn pri" data-lk="web">Abrir la app</button></div>`;
  if (document.documentElement.dataset.artifact || (SYNC.on && SYNC.st !== 'err')) return '';
  const cad = SYNC.st === 'err' && /caducado/i.test(SYNC.msg), sinRed = SYNC.st === 'err' && /internet/i.test(SYNC.msg);
  return `<div class="sbar ${SYNC.on ? 'err' : ''}"><i></i><div><b>${!SYNC.on ? 'Este dispositivo no está conectado al plan compartido' : cad ? 'El enlace del plan compartido ha caducado' : sinRed ? 'Sin internet' : 'Sin conexión con el plan compartido'}</b><span>${!SYNC.on ? (SYNC.auto ? 'Se desconectó a mano. Lo que planifiques aquí no lo verán las demás tablets.' : 'Lo que planifiques aquí no lo verán las demás tablets. Abre el enlace que te pasa Jon.') : cad ? 'Pide a Jon el enlace nuevo y ábrelo en este dispositivo.' : 'Lo que cambies se guarda aquí y se envía solo en cuanto vuelva la conexión.'}</span></div><button class="btn" ${!SYNC.on && SYNC.auto ? 'data-sync-auto' : 'data-sync-open'}="1">${SYNC.on ? 'Ver' : 'Conectar'}</button></div>`;
}
I.tv = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="2" y="4" width="20" height="13" rx="2"/><path d="M8 21h8M12 17v4"/></svg>';

