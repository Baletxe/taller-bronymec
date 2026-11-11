/* ================= v18 · MENSAJES ================= */
const YO = () => { try { const y = JSON.parse(LS.get('taller.yo') || 'null'); if (y && y.n && GR[y.g]) return y; } catch(_){} return null; };
const yoG = () => (YO() || {}).g || (S.sec === 'torno' ? 'torno' : S.sec === 'fresa' ? 'fresa' : 'prod');
const msgId = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
const hilos = () => Object.values(PLAN.msg || {}).filter(m => !m.hilo).sort((a, b) => ultimoTs(b) < ultimoTs(a) ? -1 : 1);
const respuestas = id => Object.values(PLAN.msg || {}).filter(m => m.hilo === id).sort((a, b) => a.ts < b.ts ? -1 : 1);
function ultimoTs(r){ const rs = respuestas(r.id); return rs.length ? rs[rs.length - 1].ts : r.ts; }
/* Pendiente: pide respuesta, no está resuelta y el grupo destinatario aún no ha contestado. */
const pendiente = r => r.resp && !(PLAN.mst || {})[r.id] && !respuestas(r.id).some(x => x.deg === r.para);
function msgPend(g){ const gg = g === undefined ? yoG() : g; return hilos().filter(r => pendiente(r) && (gg == null || r.para === gg)); }
const leidos = () => { try { return JSON.parse(LS.get('taller.mleido') || '{}'); } catch(_){ return {}; } };
function marcarLeido(id){ const l = leidos(); l[id] = new Date().toISOString(); LS.set('taller.mleido', JSON.stringify(l)); }
const sinLeer = r => { const g = yoG(); if (r.para !== g && r.deg !== g) return false; const u = ultimoTs(r), l = leidos()[r.id]; const ult = respuestas(r.id).concat([r]).sort((a,b) => a.ts < b.ts ? 1 : -1)[0]; return (!l || l < u) && ult.de !== (YO() || {}).n; };
const hace = ts => { const d = (Date.now() - new Date(ts)) / 6e4; return d < 1 ? 'ahora' : d < 60 ? 'hace ' + Math.round(d) + ' min' : d < 1440 ? 'hace ' + Math.round(d / 60) + ' h' : new Date(ts).toLocaleDateString('es-ES', {day: 'numeric', month: 'short'}); };
const grChip = g => `<span class="gch" style="--gc:${GRC[g]}">${esc(GR[g])}</span>`;
const tam = s => s > 1048576 ? (s / 1048576).toFixed(1).replace('.', ',') + ' MB' : Math.max(1, Math.round(s / 1024)) + ' KB';
const ADJ = {};
function adjHTML(a){ const img = /^image\//.test(a.t);
  return img ? `<button class="adj img" data-adj-open="${a.id}" data-n="${esc(a.n)}" data-t="${esc(a.t)}"><img data-adj-img="${a.id}" data-t="${esc(a.t)}" alt="${esc(a.n)}"></button>`
    : `<button class="adj" data-adj-open="${a.id}" data-n="${esc(a.n)}" data-t="${esc(a.t)}">${I.clip}<span><b>${esc(a.n)}</b><small>${tam(a.s)}</small></span></button>`; }
function burbuja(m){ const mio = m.de === (YO() || {}).n && m.deg === yoG();
  return `<div class="bub ${mio ? 'mio' : ''}" style="--gc:${GRC[m.deg]}"><div class="bh"><b>${esc(m.de)}</b><span>${esc(GR[m.deg])} · ${hace(m.ts)}</span>${m.via === 'teams' ? '<span class="vt">desde Teams</span>' : m.tm ? '<span class="vt">también en Teams</span>' : ''}${m.hilo && esMio(m) ? `<button class="bdel" data-mdel1="${m.id}" data-lbl="" title="Borrar este mensaje" aria-label="Borrar este mensaje">${I.del}<span></span></button>` : ''}</div>${m.txt ? `<div class="bt">${esc(m.txt).replace(/\n/g, '<br>')}</div>` : ''}${(m.adj || []).length ? `<div class="ba">${m.adj.map(adjHTML).join('')}</div>` : ''}</div>`; }
function composer(nuevo){
  const g = yoG(), fs = S.mfiles;
  return `<div class="mc">
    ${nuevo ? `<div class="mc-p"><span>Para</span>${Object.keys(GR).filter(k => k !== g).map(k => `<button class="gsel" style="--gc:${GRC[k]}" data-mpara="${k}" aria-pressed="${S.mpara === k}">${esc(GR[k])}</button>`).join('')}</div>
      ${S.mref ? `<div class="mc-ref">Sobre: <b>${esc(S.mref.desc)}</b><button class="x" data-mref-x="1" aria-label="Quitar pieza">${I.x}</button></div>` : ''}` : ''}
    ${fs.length ? `<div class="mc-f">${fs.map((f, i) => `<span class="fch">${I.clip}${esc(f.name)} · ${tam(f.size)}<button data-mfx="${i}" aria-label="Quitar">${I.x}</button></span>`).join('')}</div>` : ''}
    <div class="mc-r"><label class="btn ic mclip" title="Adjuntar foto o fichero" aria-label="Adjuntar">${I.clip}<input type="file" id="mfile" multiple hidden></label>
      <textarea id="mtx" rows="2" placeholder="${nuevo ? 'Escribe el mensaje…' : 'Responder…'}" enterkeyhint="send">${esc(S.mdraft)}</textarea>
      <button class="btn pri msend" data-msend="${nuevo ? 'new' : esc(S.mth)}" aria-label="Enviar">${I.send}<span>Enviar</span></button></div>
    ${nuevo ? `<label class="mc-q"><input type="checkbox" id="mresp" ${S.mresp ? 'checked' : ''}> <b>Necesita respuesta</b> <span>queda en rojo hasta que contesten</span></label>` : ''}
  </div>`;
}
function vMsg(){
  const yo = YO();
  if (!yo || S.yoEdit){ const y = yo || {n: '', g: yoG()};
    return `<div class="vh"><div><h1>Mensajes</h1><p>Antes de escribir: ¿quién eres? Se guarda en esta tablet.</p></div></div>
      <section class="box yo"><div class="yo-in"><label>Tu nombre<input id="yoN" value="${esc(y.n)}" maxlength="40" placeholder="Nombre" autocomplete="off"></label>
      <div class="yo-g"><span>Tu grupo</span>${Object.keys(GR).map(k => `<button class="gsel" style="--gc:${GRC[k]}" data-yog="${k}" aria-pressed="${y.g === k}">${esc(GR[k])}</button>`).join('')}</div>
      <div class="acts"><button class="btn pri" data-yosave="1">Guardar</button>${yo ? '<button class="btn" data-yocancel="1">Cancelar</button>' : ''}</div>
      <p class="note">En una tablet compartida, pon el nombre del puesto (por ejemplo "Fresa · turno mañana").</p></div></section>`; }
  const g = yo.g, H = hilos(), mios = H.filter(r => r.para === g || r.deg === g);
  const lista = S.mf === 'pend' ? msgPend() : S.mf === 'todos' ? H : mios;
  const nPend = msgPend().length;
  const item = r => { const rs = respuestas(r.id), ult = rs.length ? rs[rs.length - 1] : r, pen = pendiente(r), res = (PLAN.mst || {})[r.id];
    return `<button class="mli ${S.mth === r.id ? 'on' : ''} ${sinLeer(r) ? 'nl' : ''}" data-mth="${r.id}"><span class="mli-h">${grChip(r.deg)}<i>→</i>${grChip(r.para)}<span class="sp"></span><small>${hace(ultimoTs(r))}</small></span>
      <span class="mli-t">${r.ref ? `<em>${esc(r.ref.desc)}</em> · ` : ''}${esc((ult.txt || (ult.adj && ult.adj.length ? '📎 ' + ult.adj[0].n : '')).slice(0, 110))}</span>
      <span class="mli-f">${pen ? `<span class="tagr">Por contestar</span>` : res ? `<span class="tago">Resuelto</span>` : r.resp ? `<span class="tago">Contestado</span>` : ''}${rs.length ? `<span>${rs.length} ${rs.length === 1 ? 'respuesta' : 'respuestas'}</span>` : ''}${(r.adj || []).length || rs.some(x => (x.adj || []).length) ? `<span>${I.clip}</span>` : ''}</span></button>`; };
  const r = S.mth && S.mth !== 'new' ? (PLAN.msg || {})[S.mth] : null;
  if (r) marcarLeido(r.id);
  const panel = S.mth === 'new' || !r ? `<div class="mt-h"><h2>Nuevo mensaje</h2><p>De <b>${esc(yo.n)}</b> (${esc(GR[g])})</p></div><div class="mt-l mt-empty">${!SYNC.on ? '<div class="note">Esta tablet no está conectada al plan compartido: los mensajes se quedarán aquí hasta que se conecte.</div>' : '<div class="note">Elige a quién va, escribe y, si hace falta, adjunta una foto o un plano. Si marcas "Necesita respuesta", saldrá en rojo a quien lo reciba hasta que conteste.</div>'}</div>${composer(true)}`
    : `<div class="mt-h"><div><h2>${grChip(r.deg)} <i>→</i> ${grChip(r.para)}</h2><p>${r.ref ? `Sobre <button class="lk" data-open-art="${esc(r.ref.key)}" data-emp="${r.ref.emp}">${esc(r.ref.desc)}</button> · ` : ''}${pendiente(r) ? `<b class="tr">Esperando respuesta de ${esc(GR[r.para])}</b>` : (PLAN.mst || {})[r.id] ? `Resuelto por ${esc(PLAN.mst[r.id].por)}` : 'Al día'}</p></div>
        <div class="mt-a">${(PLAN.mst || {})[r.id] ? `<button class="btn" data-mres="${r.id}" data-on="0">Reabrir</button>` : `<button class="btn okb" data-mres="${r.id}" data-on="1">Marcar resuelto</button>`}${puedeBorrarHilo(r) ? `<button class="btn mdel" data-mdel="${r.id}" data-lbl="Borrar" title="Borrar la conversación entera (para todos)">${I.del}<span>Borrar</span></button>` : ''}<button class="btn ic mback" data-mth="" aria-label="Volver a la lista">${I.l}</button></div></div>
      <div class="mt-l" id="mtl">${[r].concat(respuestas(r.id)).map(burbuja).join('')}</div>${composer(false)}`;
  return `<div class="vh"><div><h1>Mensajes</h1><p>Eres <b>${esc(yo.n)}</b> · ${grChip(g)} <button class="btn yoch" data-yoedit="1">Cambiar nombre o grupo</button>${esDir(g) ? `<button class="btn yoch ${tconf().on ? 'tm-on' : ''}" data-teams="1">${tconf().on ? 'Teams conectado' : 'Conectar con Teams'}</button>` : ''}${nPend ? ` · <b class="tr">${nPend} por contestar</b>` : ''}</p></div><div class="seg"><button data-mf="mios" aria-pressed="${S.mf === 'mios'}">Mis conversaciones</button><button data-mf="pend" aria-pressed="${S.mf === 'pend'}">Por contestar${nPend ? ' (' + nPend + ')' : ''}</button><button data-mf="todos" aria-pressed="${S.mf === 'todos'}">Todas</button></div></div>
    <div class="msgw ${S.mth ? 'abierto' : ''}"><aside class="ml"><button class="btn pri mnew" data-mth="new">${I.msg} Nuevo mensaje</button>${lista.length ? lista.map(item).join('') : `<div class="empty">${S.mf === 'pend' ? 'Nada por contestar.' : 'Sin conversaciones todavía.'}</div>`}</aside><section class="mt">${panel}</section></div>`;
}
async function prepFichero(f){
  if (/^image\/(jpeg|png|webp|heic|heif)$/i.test(f.type) && f.size > 350000 && window.createImageBitmap){
    try { const bm = await createImageBitmap(f), sc = Math.min(1, 1600 / Math.max(bm.width, bm.height)), c = document.createElement('canvas');
      c.width = Math.round(bm.width * sc); c.height = Math.round(bm.height * sc); c.getContext('2d').drawImage(bm, 0, 0, c.width, c.height);
      const b = await new Promise(r => c.toBlob(r, 'image/jpeg', .82)); if (b) return {bytes: new Uint8Array(await b.arrayBuffer()), t: 'image/jpeg', n: f.name.replace(/\.\w+$/, '') + '.jpg'}; } catch(_){} }
  return {bytes: new Uint8Array(await f.arrayBuffer()), t: f.type || 'application/octet-stream', n: f.name};
}
let enviando = false;
async function msgEnviar(dest){
  if (enviando) return; const yo = YO(); if (!yo) return;
  const t = ($('mtx') ? $('mtx').value : S.mdraft).trim(), nuevo = dest === 'new';
  if (!t && !S.mfiles.length){ toast('Escribe algo o adjunta un fichero'); return; }
  if (nuevo && !S.mpara){ toast('Elige a quién va el mensaje'); return; }
  const raiz = nuevo ? null : (PLAN.msg || {})[dest]; if (!nuevo && !raiz) return;
  if (S.mfiles.length && !SYNC.on){ toast('Para adjuntar ficheros la tablet tiene que estar conectada al plan compartido'); return; }
  if (S.mfiles.some(f => f.size > 25e6)){ toast('Algún fichero pasa de 25 MB'); return; }
  enviando = true; const adj = [];
  try {
    for (const f of S.mfiles){ toast('Subiendo ' + f.name + '…'); const p = await prepFichero(f); if (p.bytes.length > 10e6) throw new Error('grande'); const id = msgId(); await SYNC.subirAdj(id, p.bytes); adj.push({id, n: p.n, t: p.t, s: p.bytes.length}); }
  } catch(e){ enviando = false; toast(String(e && e.message) === 'grande' ? 'Ese fichero pasa de 10 MB incluso comprimido' : 'No se ha podido subir el adjunto. Revisa la conexión y vuelve a probar.'); return; }
  const id = msgId(), m = {id, de: yo.n, deg: yo.g, para: nuevo ? S.mpara : (raiz.deg === yo.g ? raiz.para : raiz.deg), txt: t, ts: new Date().toISOString(), resp: nuevo ? !!($('mresp') ? $('mresp').checked : S.mresp) : false, hilo: nuevo ? null : raiz.id};
  if (nuevo && S.mref) m.ref = S.mref; if (adj.length) m.adj = adj;
  PLAN.msg = PLAN.msg || {}; PLAN.msg[id] = m;
  if (!nuevo && PLAN.mst && PLAN.mst[raiz.id] && raiz.resp) {}
  S.mdraft = ''; S.mfiles = []; if (nuevo){ S.mth = id; S.mref = null; S.mpara = null; S.mresp = true; }
  enviando = false; guardar(); marcarLeido(nuevo ? id : raiz.id); const aT = teamsEnviar(m); render(); toast(SYNC.on ? (aT ? 'Enviado (también a Teams)' : 'Enviado') : 'Guardado en esta tablet: se enviará al conectar');
}
/* v19 · Borrar (Jon, 17/10/2026). La conversación entera: quien la empezó o Dirección. Un mensaje suelto: solo el suyo.
   El borrado viaja a todos los aparatos como cualquier otro cambio del plan; los adjuntos se quitan del repositorio. */
const esMio = m => { const y = YO(); return !!y && m.de === y.n && m.deg === y.g; };
const puedeBorrarHilo = r => esMio(r) || esDir(yoG());
let borrarArmado = null, borrarT = null;
function armarBorrar(btn, clave){ if (borrarArmado === clave) return true;
  borrarArmado = clave; clearTimeout(borrarT); btn.classList.add('armado'); const sp = btn.querySelector('span'); if (sp) sp.textContent = 'Toca otra vez para borrar';
  borrarT = setTimeout(() => { borrarArmado = null; btn.classList.remove('armado'); if (sp) sp.textContent = btn.dataset.lbl || 'Borrar'; }, 4000); return false; }
function msgBorrar(ids){ const adj = []; ids.forEach(id => { const m = (PLAN.msg || {})[id]; if (!m) return; (m.adj || []).forEach(a => adj.push(a.id)); delete PLAN.msg[id]; if (PLAN.mst) delete PLAN.mst[id]; });
  borrarArmado = null; guardar(); adj.forEach(a => { delete ADJ[a]; SYNC.borrarAdj(a); }); }
async function adjAbrir(id, n, t){
  try { let url = ADJ[id]; if (!url){ toast('Abriendo ' + n + '…'); url = ADJ[id] = URL.createObjectURL(new Blob([await SYNC.bajarAdj(id)], {type: t || 'application/octet-stream'})); }
    const a = document.createElement('a'); a.href = url; a.target = '_blank'; a.rel = 'noopener'; if (!/^(image\/|application\/pdf)/.test(t)) a.download = n; document.body.appendChild(a); a.click(); a.remove();
  } catch(_){ toast('No se ha podido abrir el adjunto (¿sin conexión con el plan?)'); }
}
function adjMiniaturas(){ document.querySelectorAll('img[data-adj-img]').forEach(im => { const id = im.dataset.adjImg; if (ADJ[id]){ im.src = ADJ[id]; return; }
  if (!SYNC.on || im.dataset.cargando) return; im.dataset.cargando = '1';
  SYNC.bajarAdj(id).then(b => { ADJ[id] = URL.createObjectURL(new Blob([b], {type: im.dataset.t || 'image/jpeg'})); document.querySelectorAll('img[data-adj-img="' + id + '"]').forEach(x => { x.src = ADJ[id]; }); }).catch(() => { im.alt = 'No se ha podido cargar'; }); }); }
/* Aviso cuando llega algo nuevo para mi grupo (en cualquier pantalla). */
let msgVistos = null;
function msgAvisos(){ const ids = Object.keys(PLAN.msg || {}); if (!msgVistos){ msgVistos = new Set(ids); return; }
  const g = yoG(), yo = (YO() || {}).n; const nuevos = ids.filter(id => !msgVistos.has(id)).map(id => PLAN.msg[id]).filter(m => m.de !== yo && (m.para === g || (m.hilo && PLAN.msg[m.hilo] && (PLAN.msg[m.hilo].deg === g || PLAN.msg[m.hilo].para === g))));
  ids.forEach(id => msgVistos.add(id));
  if (nuevos.length){ const m = nuevos[nuevos.length - 1]; toast('Mensaje de ' + m.de + ' (' + GR[m.deg] + '): ' + (m.txt || '📎 adjunto').slice(0, 80)); try { navigator.vibrate && navigator.vibrate([120, 60, 120]); } catch(_){} } }
