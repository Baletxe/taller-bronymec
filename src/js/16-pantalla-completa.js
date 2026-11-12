/* ---------- pantalla completa (tablet): se recuerda y vuelve al primer toque, porque el navegador exige un toque para entrar ---------- */
const FS = {
  ok(){ const d = document; return !d.documentElement.dataset.artifact && !!(d.fullscreenEnabled || d.webkitFullscreenEnabled); },
  on(){ return !!(document.fullscreenElement || document.webkitFullscreenElement); },
  entrar(){ const el = document.documentElement, f = el.requestFullscreen || el.webkitRequestFullscreen; if (!f || FS.on()) return; try { const p = f.call(el, {navigationUI: 'hide'}); if (p && p.catch) p.catch(() => {}); } catch(_){} },
  salir(){ const f = document.exitFullscreen || document.webkitExitFullscreen; if (!f || !FS.on()) return; try { const p = f.call(document); if (p && p.catch) p.catch(() => {}); } catch(_){} },
  pintar(){ const b = $('btnFs'); if (!b) return; b.hidden = !FS.ok(); const on = FS.on(); b.setAttribute('aria-pressed', on); b.title = on ? 'Salir de pantalla completa' : 'Pantalla completa'; b.setAttribute('aria-label', b.title); b.innerHTML = on ? '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M9 4v5H4M15 4v5h5M9 20v-5H4M15 20v-5h5"/></svg>' : '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 9V4h5M20 9V4h-5M4 15v5h5M20 15v5h-5"/></svg>'; }
};
['fullscreenchange', 'webkitfullscreenchange'].forEach(ev => document.addEventListener(ev, () => { FS.pintar(); setTimeout(alto, 60); }));
document.addEventListener('click', e => { if (LS.get('taller.fs') === '1' && FS.ok() && !FS.on() && !(e.target.closest && e.target.closest('#btnFs'))) FS.entrar(); }, true);
FS.pintar();
let tvWl = null;
if (/[?&]tv\b/.test(location.search)){ try { localStorage.setItem('taller.v', 'tv'); } catch(_){} }
function tvEntrar(){
  S.v = 'tv'; LS.set('taller.v', 'tv'); S.sheet = null; render(); tvCiclo();
  try { const el = document.documentElement; if (el.requestFullscreen && !document.fullscreenElement) el.requestFullscreen().catch(() => {}); } catch(_){}
  if ('wakeLock' in navigator && !tvWl) navigator.wakeLock.request('screen').then(x => { tvWl = x; x.addEventListener('release', () => { tvWl = null; }); }).catch(() => {});
}
function tvSalir(){
  S.v = 'hoy'; LS.set('taller.v', 'hoy'); clearTimeout(tvT); if (tvWl){ tvWl.release().catch(() => {}); tvWl = null; }
  if (LS.get('taller.fs') !== '1') FS.salir();
  render();
}
document.addEventListener('visibilitychange', () => { if (S.v === 'tv' && document.visibilityState === 'visible' && 'wakeLock' in navigator && !tvWl) navigator.wakeLock.request('screen').then(x => { tvWl = x; x.addEventListener('release', () => { tvWl = null; }); }).catch(() => {}); });

const horasCtl = it => `<label>Horas de máquina${it && it.h ? '' : ' <span style="font-weight:500;color:var(--ink-3)">(estimadas)</span>'}<div class="step"><button type="button" data-hd="-0.5" aria-label="Menos horas">−</button><input id="fH" type="number" inputmode="decimal" min="0.25" max="500" step="0.25" value="${it ? horasIt(it) : HDEF()}"><button type="button" data-hd="0.5" aria-label="Más horas">+</button></div></label>`;
/* Fase 2 · alta rápida de otros trabajos: lo último (para repetir de un toque), autocompletar y pegar desde Excel. */
function libresRecientes(n){
  const vistos = new Set(), out = [];
  Object.values(PLAN.items).filter(it => it.k === 'libre').sort((a, b) => String(b.ts || '').localeCompare(String(a.ts || ''))).forEach(it => {
    const k = [it.desc, it.cli, it.ref].map(x => String(x || '').toLowerCase()).join('|'); if (vistos.has(k)) return; vistos.add(k); out.push(it); });
  return out.slice(0, n || 6);
}
/* Pegar desde Excel: una fila por trabajo, columnas en este orden: Cliente · Pedido/plano · Qué hay que hacer · Unidades · Entrega.
   Separadas por tabulador (lo que copia Excel) o por punto y coma. La entrega, dd/mm/aaaa o aaaa-mm-dd. Nada se adivina:
   una fila sin descripción o con unidades o fecha que no se entienden no entra y se dice cuál. */
function leerPegado(txt){
  const ok = [], mal = [];
  String(txt || '').split(/\r?\n/).forEach((fila, i) => {
    if (!fila.trim()) return;
    const c = fila.split(fila.includes('\t') ? '\t' : ';').map(x => x.trim());
    if (i === 0 && /descrip|qu[eé] hay|unidades|cliente/i.test(fila) && !/^\d/.test(c[3] || '')) return; // fila de títulos
    const [cli, ref, desc, uds, ent] = c, q = Math.round(+String(uds || '').replace(/\./g, '').replace(',', '.'));
    let e = null; const m1 = /^(\d{1,2})[\/\-.](\d{1,2})[\/\-.](\d{2}|\d{4})$/.exec(ent || ''), m2 = /^(\d{4})-(\d{2})-(\d{2})$/.exec(ent || '');
    if (m2) e = ent; else if (m1){ const y = m1[3].length === 2 ? '20' + m1[3] : m1[3]; e = y + '-' + m1[2].padStart(2, '0') + '-' + m1[1].padStart(2, '0'); }
    const fechaOk = !ent || (!!e && DIA_OK.test(e) && iso(pd(e)) === e);
    if (!desc) mal.push({n: i + 1, por: 'falta qué hay que hacer'});
    else if (!(q >= 1 && q <= 1e7)) mal.push({n: i + 1, por: 'unidades que no se entienden'});
    else if (!fechaOk) mal.push({n: i + 1, por: 'fecha de entrega que no se entiende'});
    else ok.push({cli: (cli || '').slice(0, 60), ref: (ref || '').slice(0, 60), desc: desc.slice(0, 160), qty: q, ent: ent ? e : null});
  });
  return {ok, mal};
}
function fichaLibre(id, pre){
  const it = id ? PLAN.items[id] : null;
  const base = !it && S.libreBase ? PLAN.items[S.libreBase] : null; S.libreBase = null;   // duplicar
  const ini = it || base;
  const [pm, pdd] = (pre || '').split('|');
  const m0 = it ? it.m : (pm || (maqVis()[0] || PLAN.maq[0]).id), d0 = it ? it.d : (pdd || iso(diaTrabajo(HOY)));
  const dSel = (() => { const out = []; const base = lunes(HOY); for (let i = -7; i < 49; i++){ const d = addD(base, i); if (d.getDay() === 0) continue; const k = iso(d); out.push(`<option value="${k}" ${d0 === k ? 'selected' : ''}>${d.getDay()===6 ? 'Finde ' + dS(d) : DIAS[d.getDay()].slice(0,3) + ' ' + dS(d)}${k === iso(HOY) ? ' (hoy)' : ''}</option>`); } return out.join(''); })();
  return `<div class="scrim" data-close="1"></div><aside class="sheet" role="dialog" aria-modal="true" aria-label="Otro trabajo">
    <div class="sh-h"><div><h2>${it ? esc(it.desc) : 'Otro trabajo'}</h2><p>Trabajo que no viene de los pedidos de ${EIDS.map(empN).join(' ni ')}: otros clientes, muestras, utillaje, reprocesos…</p></div><button class="x" data-close="1" aria-label="Cerrar">${I.x}</button></div>
    <div class="sh-b">
      <div class="ctl">
        ${!it && libresRecientes().length ? `<div class="lrep" style="grid-column:1/-1"><span>Repetir</span>${libresRecientes().map(r => `<button type="button" class="chip" data-libre-rep="${esc(r.id)}" title="Rellena con este trabajo">${esc(r.desc)}${r.cli ? ' · ' + esc(r.cli) : ''}</button>`).join('')}</div>` : ''}
        <label style="grid-column:span 2">Qué hay que hacer<input id="lD" type="text" list="lDl" value="${esc(ini ? ini.desc : '')}" placeholder="Ej.: casquillo PA6 Ø40, muestra MJF, utillaje…" autocomplete="off"><datalist id="lDl">${[...new Set(Object.values(PLAN.items).filter(x => x.k === 'libre').map(x => x.desc))].slice(0, 60).map(x => `<option value="${esc(x)}">`).join('')}</datalist></label>
        <label>Cliente o para quién<input id="lC" type="text" list="lCl" value="${esc(ini ? ini.cli || '' : '')}" placeholder="Ej.: Lantier, interno…" autocomplete="off"><datalist id="lCl">${PLAN.clis.map(c => `<option value="${esc(c)}">`).join('')}</datalist></label>
        <label>Pedido, plano o código<input id="lR" type="text" list="lRl" value="${esc(ini ? ini.ref || '' : '')}" placeholder="Opcional" autocomplete="off"><datalist id="lRl">${[...new Set(Object.values(PLAN.items).filter(x => x.k === 'libre' && x.ref).map(x => x.ref))].slice(0, 60).map(x => `<option value="${esc(x)}">`).join('')}</datalist></label>
        <label>Unidades<div class="step"><button type="button" data-qd="-10">−</button><input id="fQ" type="number" inputmode="numeric" min="1" value="${ini ? ini.qty : 1}"><button type="button" data-qd="10">+</button></div></label>
        <label>Fecha de entrega<input id="lE" type="date" value="${esc(it && it.ent ? it.ent : '')}"></label>
        <label>Máquina<select id="fM">${maqTaller().map(m => `<option value="${esc(m.id)}" ${m0===m.id?'selected':''}>${esc(m.n)}${m.t==='torno'?' (torno)':m.t==='secc'?' (seccionadora)':m.t==='sub'?' (fuera)':''}</option>`).join('')}</select></label>
        <label>Día<select id="fD">${dSel}</select></label>
        ${horasCtl(ini)}<label>Nota para el operario<input id="fN" type="text" value="${esc(ini ? ini.nota || '' : '')}" placeholder="Material, programa, utillaje, proveedor…"></label>
      </div>
      ${!it ? `<details class="lpeg"><summary>Pegar varias desde Excel</summary><p>Una fila por trabajo, columnas en este orden: <b>Cliente · Pedido o plano · Qué hay que hacer · Unidades · Entrega</b> (dd/mm/aaaa). Van todas a la máquina y al día de arriba.</p><textarea id="lP" rows="5" aria-label="Filas pegadas de Excel" placeholder="Lantier	P-1234	Casquillo PA6 Ø40	50	20/11/2026"></textarea><div class="acts"><button class="btn" data-libre-peg="1">Añadir las filas pegadas</button></div></details>` : ''}
      ${it ? pmHTML(it, 'big') : ''}
      ${it ? `<section class="ladj"><h4>Planos y fotos <small>${(it.adj || []).length ? (it.adj || []).length + ' adjuntos' : 'ninguno todavía'}</small></h4><div class="ladj-l">${(it.adj || []).map(a => `<span class="ladj-i">${adjHTML(a)}<button class="btn ic" data-ladj-x="${esc(it.id)}|${esc(a.id)}" aria-label="Quitar ${esc(a.n)}" title="Quitar">${I.x}</button></span>`).join('')}
        ${(it.adj || []).length < 8 ? `<label class="btn" style="cursor:pointer">${I.clip} Adjuntar plano o foto<input type="file" id="lfile" data-item="${esc(it.id)}" accept="image/*,application/pdf,.dxf,.dwg,.step,.stp,.xlsx,.xls,.docx" multiple hidden></label>` : ''}</div>
        ${SYNC.on ? '' : '<div class="note">Para adjuntar, esta tablet tiene que estar conectada al plan compartido.</div>'}</section>` : '<div class="note">Planos y fotos: se adjuntan al abrir el trabajo ya guardado.</div>'}
      <div class="acts"><button class="btn pri" data-libre-save="${it ? esc(it.id) : ''}">${it ? 'Guardar' : 'Añadir al calendario'}</button>${it ? `<button class="btn ${it.done?'':'okb'}" data-done="${esc(it.id)}">${it.done?'Quitar hecho':'Marcar hecho'}</button><button class="btn" data-split="${esc(it.id)}">Partir en dos</button><button class="btn" data-libre-dup="${esc(it.id)}">Duplicar</button><button class="btn del" data-quitar="${esc(it.id)}">Quitar del calendario</button>` : ''}</div>
      <div class="note">Se guarda en el plan del taller con las demás fichas: se arrastra, se marca hecho y sale en la hoja impresa.</div>
    </div></aside>`;
}
function ajustes(){
  const t = PLAN.tema || 'auto';
  return `<div class="scrim" data-close="1"></div><aside class="sheet" role="dialog" aria-modal="true" aria-label="Ajustes">
    <div class="sh-h"><div><h2>Ajustes</h2><p>${EIDS.map(e => esc(empN(e)) + ': pedidos del ' + (EMPS[e].export ? dS(pd(EMPS[e].export)) : '—')).join(' · ')}</p></div><button class="x" data-close="1" aria-label="Cerrar">${I.x}</button></div>
    <div class="sh-b">
      <div class="sec"><h3>Máquinas y capacidad</h3><p class="ph">Horas de trabajo al día de cada máquina. Con ellas la app sabe si un día tiene hueco (verde) o está lleno (rojo), y dónde proponer cada pieza.</p>
        ${maqTaller().map(m => `<div class="mrow" style="--mc:${mcol(m.id)}"><span class="av">${esc(sigla(m.n))}</span><input data-maq="${esc(m.id)}" value="${esc(m.n)}" aria-label="Nombre de la máquina"><span class="mt">${TNOM[m.t] || 'Fresa'}</span><label>L–V<input type="number" min="0" max="24" step="0.5" inputmode="decimal" data-cap="${esc(m.id)}" value="${m.cap == null ? 8 : m.cap}"> h</label><label>Sáb<input type="number" min="0" max="24" step="0.5" inputmode="decimal" data-sab="${esc(m.id)}" value="${m.sab || 0}"> h</label></div>`).join('')}
        <div class="ctl" style="margin-top:6px"><label>Horas por ficha cuando no se indican<input type="number" min="0.25" max="24" step="0.25" inputmode="decimal" data-hdef="1" value="${HDEF()}"></label></div></div>
      <div class="sec"><h3>Pantalla</h3><div class="seg" style="max-width:360px"><button data-tema="auto" aria-pressed="${t==='auto'}">Automático</button><button data-tema="light" aria-pressed="${t==='light'}">Claro</button><button data-tema="dark" aria-pressed="${t==='dark'}">Oscuro</button></div>
        ${'wakeLock' in navigator ? `<div class="seg" style="max-width:360px;margin-top:10px"><button data-wake="0" aria-pressed="${LS.get('taller.wake') !== '1'}">Se apaga sola</button><button data-wake="1" aria-pressed="${LS.get('taller.wake') === '1'}">Siempre encendida</button></div><p style="margin:8px 0 0;color:var(--ink-2);font-size:13.5px">«Siempre encendida» va bien para la tablet fija del taller, con la app abierta y enchufada.</p>` : ''}</div>
      ${INST.puede() ? `<div class="sec"><h3>Instalar en este dispositivo</h3><div class="acts"><button class="btn pri" data-inst="1">Instalar la app</button></div></div>` : ''}
      <div class="sec"><h3>Talleres y reglas</h3><p style="margin:0 0 10px;color:var(--ink-2);font-size:14px">Qué piezas van a fresa, a torno o fuera, y las reglas por palabra (CASQUILLO → Torno, PLACA → Fresa…), están en la pantalla Talleres.</p><div class="acts"><button class="btn" data-go="talleres">Abrir Talleres</button></div></div>
      <div class="sec"><h3>Almacén</h3><p style="margin:0 0 10px;color:var(--ink-2);font-size:14px">Vista para preparar envíos con el stock del SGA (líneas listas y ubicaciones). El taller no la necesita: actívala solo en el dispositivo de almacén.</p><div class="seg" style="max-width:420px"><button data-alm="0" aria-pressed="${LS.get('taller.alm') !== '1'}">Oculta</button><button data-alm="1" aria-pressed="${LS.get('taller.alm') === '1'}">Visible en este dispositivo</button></div></div>
      <div class="sec"><h3>Plan compartido</h3><p class="note" style="margin:0 0 10px;font-family:ui-monospace,monospace;font-size:12px">Diagnóstico · app v12 · acceso en la web: ${SYNC.auto ? 'sí' : 'NO'} · clave: ${SYNC.clave ? 'sí' : 'NO'} · estado: ${esc(SYNC.st)}${SYNC.err ? ' · respuesta: ' + esc(SYNC.err) : ''}</p>${SYNC.on ? `<p style="margin:0 0 10px;color:var(--ink-2);font-size:14px">Conectado${SYNC.auto ? ' automáticamente con la contraseña del taller' : ''}: lo que se planifica aquí se ve en todos los dispositivos del taller en unos segundos.${SYNC.ult ? ' Última sincronización: ' + new Date(SYNC.ult).toLocaleTimeString('es-ES') + '.' : ''}</p><div class="acts"><button class="btn" data-sync-now="1">Sincronizar ahora</button><button class="btn del" data-sync-off="1">Desconectar este dispositivo</button></div>`
        : SYNC.auto ? `<p style="margin:0 0 10px;color:var(--ink-2);font-size:14px">Este dispositivo se desconectó a mano. Vuelve a conectarlo para ver y compartir el mismo calendario que las demás tablets.</p><div class="acts"><button class="btn pri" data-sync-auto="1">Conectar este dispositivo</button></div>`
        : `<p style="margin:0 0 10px;color:var(--ink-2);font-size:14px">Ahora el plan está solo en este dispositivo. Para compartirlo, abre aquí el enlace de conexión que te pasa Jon, o pégalo:</p><div class="ctl"><label style="grid-column:span 2">Enlace de conexión<input id="sLink" type="text" placeholder="https://baletxe.github.io/taller-bronymec/#conectar=…" autocomplete="off"></label></div><div class="acts" style="margin-top:8px"><button class="btn pri" data-sync-link="1">Conectar</button></div>`}</div>
      <div class="sec"><h3>Copia del plan</h3><p style="margin:0 0 10px;color:var(--ink-2);font-size:14px">El plan se guarda en esta tablet. Descarga una copia de vez en cuando; si cambiáis de tablet, se carga aquí.</p>
        <div class="acts noart"><button class="btn" data-export="1">Descargar copia</button><label class="btn" style="cursor:pointer">Cargar copia<input type="file" accept="application/json" id="imp" hidden></label></div></div>
      <div class="sec"><h3>Empezar de cero</h3><div class="acts"><button class="btn del" data-borrar="1">Vaciar el calendario</button></div></div>
    </div></aside>`;
}

