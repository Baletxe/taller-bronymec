/* ---------- instalar en el dispositivo (Android, iPhone/iPad, PC) ---------- */
const INST = (() => {
  let ev = window.__bip || null;
  addEventListener('beforeinstallprompt', e => { e.preventDefault(); ev = e; if (S && !S.sheet) render(); });
  addEventListener('appinstalled', () => { ev = null; LS.set('taller.inst', 'si'); toast('Instalada: ya tienes el icono en la pantalla de inicio'); render(); });
  const ios = () => /iPhone|iPad|iPod/.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
  const and = () => /Android/.test(navigator.userAgent);
  const dentro = () => (matchMedia && (matchMedia('(display-mode: standalone)').matches || matchMedia('(display-mode: fullscreen)').matches)) || navigator.standalone === true || LS.get('taller.inst') === 'si';
  const web = () => /^https?:/.test(location.protocol) && !document.documentElement.dataset.artifact;
  return {
    puede: () => web() && !dentro(),
    nativo: () => !!ev,
    ios, and,
    async lanzar(){ if (!ev) return false; ev.prompt(); try { const r = await ev.userChoice; if (r && r.outcome === 'accepted') LS.set('taller.inst', 'si'); } catch(_){} ev = null; render(); return true; },
    pasos(){
      if (ios()) return `<ol class="steps"><li>Abre esta página en <b>Safari</b> (es lo más seguro; en iPhones recientes también vale Chrome).</li><li>Toca <b>Compartir</b> (el cuadrado con la flecha hacia arriba; en Chrome está arriba a la derecha).</li><li>Baja y toca <b>Añadir a pantalla de inicio</b> › <b>Añadir</b>.</li><li>Abre la app desde el icono <b>Fabricación</b>, escribe la contraseña del taller y, si usáis el plan compartido, pega el enlace de conexión en Ajustes (en iPhone la app instalada no comparte lo guardado en Safari).</li></ol>`;
      if (and()) return `<ol class="steps"><li>En <b>Chrome</b>, toca el menú <b>⋮</b> (arriba a la derecha).</li><li>Toca <b>Instalar aplicación</b> o <b>Añadir a pantalla de inicio</b> › <b>Instalar</b>.</li><li>Ábrela desde el icono <b>Fabricación</b>: entra directa, sin barra del navegador.</li></ol>`;
      return `<ol class="steps"><li>En <b>Chrome</b> o <b>Edge</b>, pulsa el icono de instalar que sale a la derecha de la barra de direcciones (una pantalla con una flecha), o el menú <b>⋮</b> › <b>Instalar Fabricación Bronymec</b>.</li><li>Queda como un programa más, con su icono en el escritorio o en la barra de tareas.</li></ol>`;
    }
  };
})();
function instHTML(){
  if (!INST.puede() || LS.get('taller.inst.no') === '1' || innerWidth > 1400) return '';
  return `<div class="inst"><div><b>Instala la app en este ${INST.ios() || INST.and() ? (innerWidth < 700 ? 'móvil' : 'tablet') : 'equipo'}</b><span>Con su icono en la pantalla de inicio, a pantalla completa y abriendo al momento.</span></div><span class="sp"></span>
    <button class="btn pri" data-inst="1">Instalar</button><button class="x2" data-inst-no="1" aria-label="No mostrar más">${I.x}</button></div>`;
}
function instFicha(){
  return `<div class="scrim" data-close="1"></div><aside class="sheet" role="dialog" aria-modal="true" aria-label="Instalar"><div class="sh-h"><div><h2>Instalar Fabricación</h2><p>${INST.ios() ? 'iPhone / iPad' : INST.and() ? 'Android' : 'Ordenador'}</p></div><button class="x" data-close="1" aria-label="Cerrar">${I.x}</button></div>
    <div class="sh-b">${INST.pasos()}<div class="note">Las actualizaciones de la app y de los datos llegan solas, también instalada.</div></div></aside>`;
}

/* v17 · Carga por semana en el calendario (CAF + Talgo juntos): lo que hay que fabricar por fecha de entrega,
   en horas estimadas (las guardadas de cada pieza o las de por defecto por línea) frente a las horas de máquina
   de esa semana. Lo vencido cuenta en la semana actual. */
function cargaSemanas(){
  /* v18 · Carga por semana = pedidos (líneas de pedido) y piezas a entregar que hay que fabricar, de CAF y Talgo juntos.
     Sin horas estimadas (Jon, 17/10: "por cantidad de piezas a entregar y número de pedidos"). El color compara cada semana
     con las demás semanas con entregas de aquí a 12 semanas: el tercio más cargado en rojo, el medio en ámbar, el resto en verde. */
  const lun0 = lunes(diaTrabajo(HOY)), W = {};
  EIDS.forEach(e => MOD[e].LINEAS.forEach(l => {
    if (l.term || !(l.falta > 0) || !l.conCod) return;
    const a = MOD[e].ART[l.cod], t = a ? tipoArt(a) : 'fresa'; if (FUERA[t] || (S.sec !== 'todo' && t !== S.sec)) return;
    let w = lunes(l.d); if (w < lun0) w = lun0; const k = iso(w);
    const x = W[k] || (W[k] = {n: 0, uds: 0, peds: new Set(), por: {}}); x.n++; x.uds += l.falta; x.peds.add(e + l.pedido); x.por[e] = (x.por[e] || 0) + 1; }));
  const fin = iso(addD(lun0, 7 * 12)), act = Object.entries(W).filter(([k]) => k < fin);
  const rk = (arr, v) => arr.length < 2 ? .5 : arr.filter(y => y < v).length / (arr.length - 1);
  const ns = act.map(([, x]) => x.n), us = act.map(([, x]) => x.uds);
  Object.values(W).forEach(x => { x.np = x.peds.size; const sc = (rk(ns, x.n) + rk(us, x.uds)) / 2; x.lv = act.length < 3 ? 'g' : sc >= .67 ? 'r' : sc >= .34 ? 'a' : 'g'; });
  return W;
}
function wkPicker(){
  const MV = maqVis(), base = diaTrabajo(HOY), m0 = S.pmes || new Date((S.dia ? pd(S.dia) : S.wk).getFullYear(), (S.dia ? pd(S.dia) : S.wk).getMonth(), 1);
  const ini = lunes(m0), CW = cargaSemanas(), lun0 = lunes(base), lunHoy = lun0, sel = S.dia ? null : +S.wk;
  const filas = []; for (let w = 0; w < 6; w++){ const w0 = addD(ini, 7*w); if (w > 0 && w0.getMonth() !== m0.getMonth() && addD(w0, 6).getMonth() !== m0.getMonth()) break; filas.push(w0); }
  const fila = w0 => { const k = iso(w0), x = CW[k], pas = w0 < lun0, lv = pas ? 'pas' : x ? x.lv : 'g';
    const pct = pas ? '' : x ? x.n + ' lín.' : '—';
    const dias = Array.from({length: 7}, (_, i) => addD(w0, i)).map(d => { const kd = iso(d), fuera = d.getMonth() !== m0.getMonth(), dom = d.getDay() === 0;
      return `<button class="pkd ${fuera ? 'out' : ''} ${dom ? 'dom' : ''} ${kd === iso(HOY) ? 'hoy' : ''} ${S.dia === kd ? 'on' : ''}" ${S.dia && !dom ? `data-pkday="${kd}"` : `data-pkwk="${k}"`}>${d.getDate()}</button>`; }).join('');
    return `<div class="pkr w-${lv} ${+w0 === +lunHoy ? 'now' : ''} ${sel === +w0 ? 'on' : ''}"><button class="mw ${lv} ${+w0 === +lunHoy ? 'now' : ''}" data-pkwk="${k}" title="${x ? esc(`${x.n} líneas de ${x.np} pedidos · ${nf(x.uds)} uds a fabricar`) : ''}"><b>S${semanaN(w0)}</b><span>${pct}</span></button>${dias}</div>`; };
  return `<div class="scrim" data-close="1"></div><aside class="sheet pk" role="dialog" aria-modal="true" aria-label="Ir a otra semana">
    <div class="sh-h"><div><h2>${S.dia ? 'Ir a otro día' : 'Ir a otra semana'}</h2><p>Color de cada semana: pedidos y piezas a entregar de ${EIDS.map(empN).join(' + ')}, comparados con las próximas semanas. Marcada, la semana en la que estamos.</p></div><button class="x" data-close="1" aria-label="Cerrar">${I.x}</button></div>
    <div class="sh-b"><div class="pk-h"><button class="btn ic" data-pkmes="-1" aria-label="Mes anterior">${I.l}</button><h3>${MESL[m0.getMonth()][0].toUpperCase() + MESL[m0.getMonth()].slice(1)} ${m0.getFullYear()}</h3><button class="btn ic" data-pkmes="1" aria-label="Mes siguiente">${I.r}</button><span class="sp"></span><button class="btn" data-pkwk="${iso(lun0)}">Esta semana</button></div>
      <div class="pkg"><span class="mh">Sem</span>${['L','M','X','J','V','S','D'].map(x => `<span class="mh">${x}</span>`).join('')}</div>${filas.map(fila).join('')}
      <div class="mleg wl" style="padding:12px 0 0"><span><i class="sq g"></i>Poca</span><span><i class="sq a"></i>Media</span><span><i class="sq r"></i>Alta</span><span><i class="sq nowk"></i>Semana actual</span></div></div></aside>`;
}
function mesHTML(){
  const MV = maqVis(), base = diaTrabajo(HOY), m0 = S.mes || new Date(base.getFullYear(), base.getMonth(), 1);
  const ini = lunes(m0), celdas = [];
  for (let i = 0; i < 42; i++){ const d = addD(ini, i); if (i % 7 === 0 && i > 0 && d.getMonth() !== m0.getMonth()) break; celdas.push(d); }
  const hoyK = iso(base), capL = MV.reduce((s,m) => s + (m.cap == null ? 8 : +m.cap), 0), CW = cargaSemanas(), lun0 = lunes(base);
  const lunHoy = lunes(diaTrabajo(HOY)), ENT = entregasDia();
  const wkLv = d => (+lunes(d) === +lunHoy ? 'w-now ' : '');
  const semCel = d => { const w0 = lunes(d), k = iso(w0), x = CW[k], pas = w0 < lun0;
    const t = pas ? 'Semana ' + semanaN(w0) + ' (pasada)' : x ? `Semana ${semanaN(w0)}: ${x.n} ${x.n === 1 ? 'línea' : 'líneas'} de ${x.np} ${x.np === 1 ? 'pedido' : 'pedidos'} a entregar (${EIDS.filter(e => x.por[e]).map(e => empN(e) + ' ' + x.por[e]).join(' · ')}) · ${nf(x.uds)} uds a fabricar` : `Semana ${semanaN(w0)}: nada que entregar`;
    return `<button class="mw ${pas ? 'pas' : x ? x.lv : 'g'} ${+w0 === +lunHoy ? 'now' : ''}" data-wkgo="${k}" title="${esc(t)}" aria-label="${esc(t)}"><b>S${semanaN(w0)}</b><span>${pas ? '' : x ? x.n + ' lín.' : '—'}</span></button>`; };
  const cel = d => { const w = d.getDay(), fuera = d.getMonth() !== m0.getMonth(), k = iso(d);
    if (w === 0) return `<div class="md dom ${fuera ? 'out' : ''} ${wkLv(d)}" data-dia="${k}" role="button" tabindex="0"><span>${d.getDate()}</span></div>`;
    const c = carga(MV, k), past = d < base, en = ENT[k];
    const t = (en ? en.ls.length + (en.ls.length === 1 ? ' línea a entregar · ' : ' líneas a entregar · ') + nf(en.uds) + ' uds' : 'nada que entregar') + (c.n ? ' · ' + c.n + ' en máquinas' : '');
    return `${w === 1 ? semCel(d) : ''}<button class="md ${fuera ? 'out' : ''} ${w === 6 ? 'sab' : ''} ${past ? 'past' : ''} ${k === hoyK ? 'hoy' : ''} ${wkLv(d)}" data-dia="${k}" title="${d.getDate()} ${MESES[d.getMonth()]}: ${t}" aria-label="${d.getDate()} de ${MESL[d.getMonth()]}: ${t}"><span>${d.getDate()}</span>${en ? `<i class="en">${en.ls.length}</i>` : ''}</button>`; };
  const futuros = celdas.filter(d => d.getMonth() === m0.getMonth() && d.getDay() > 0 && d.getDay() < 6 && d >= base);
  const llenos = futuros.filter(d => carga(MV, iso(d)).p >= 1).length;
  return `<section class="box mes"><div class="box-h"><h3>${MESL[m0.getMonth()][0].toUpperCase() + MESL[m0.getMonth()].slice(1)} ${m0.getFullYear()}</h3><div class="mnav"><button class="btn ic" data-mes="-1" aria-label="Mes anterior">${I.l}</button><button class="btn" data-mes="0">Hoy</button><button class="btn ic" data-mes="1" aria-label="Mes siguiente">${I.r}</button></div></div>
    <div class="mg mg8"><span class="mh">Sem</span>${['L','M','X','J','V','S','D'].map(x => `<span class="mh">${x}</span>`).join('')}${celdas.map(cel).join('')}</div>
    <div class="mleg wl"><b>Carga de la semana</b> <span class="k">${EIDS.map(empN).join(' + ')} · pedidos y piezas a entregar</span><span><i class="sq g"></i>Poca</span><span><i class="sq a"></i>Media</span><span><i class="sq r"></i>Alta</span></div>
    <div class="mleg"><span>El color va en la semana (S43, S44…): cuántas líneas de pedido hay que entregar esa semana. El número de cada día son las líneas que se entregan ese día: tócalo para ver cuáles y cuántas unidades.</span></div></section>`;
}

