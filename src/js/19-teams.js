/* ================= v20 · TEAMS =================
   Jon, 17/10/2026: "en la oficina sí tienen Teams, en el taller no; combinar ambas, bidireccional".
   Un mensaje para un grupo con gente en la agenda sale también como tarjeta en Teams, con casilla para contestar;
   lo que contestan allí vuelve a la conversación de la app. Nada de precios ni contratos: solo el mensaje. */
const tconf = () => PLAN.teams || {on: false, hook: '', gente: []};
const teamsGente = g => (tconf().gente || []).filter(p => p.g === g && p.e);
const u8b = s => Uint8Array.from(atob(s), c => c.charCodeAt(0));
function teamsCard(m){
  const raiz = m.hilo ? (PLAN.msg || {})[m.hilo] : m, r0 = raiz || m, ref = r0.ref, adj = (m.adj || []).length, quien = teamsGente(m.para).map(p => p.n || p.e).join(', ');
  const fecha = new Date(m.ts).toLocaleString('es-ES', {weekday: 'short', day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit'});
  const body = [
    {type: 'Container', style: m.resp ? 'attention' : 'emphasis', bleed: true, items: [
      {type: 'ColumnSet', columns: [
        {type: 'Column', width: 'stretch', items: [
          {type: 'TextBlock', text: GR[m.deg] + '  →  ' + GR[m.para], weight: 'Bolder', size: 'Medium', wrap: true},
          {type: 'TextBlock', text: m.de + ' · ' + fecha + (quien ? ' · para ' + quien : ''), isSubtle: true, spacing: 'None', size: 'Small', wrap: true}]},
        {type: 'Column', width: 'auto', verticalContentAlignment: 'Center', items: m.resp ? [{type: 'TextBlock', text: 'Necesita respuesta', color: 'Attention', weight: 'Bolder'}] : []}]}]}];
  if (ref) body.push({type: 'TextBlock', text: 'Pieza: ' + ref.desc + (ref.key && !/^ref:/.test(ref.key) ? ' (' + ref.key + ')' : ''), weight: 'Bolder', wrap: true, spacing: 'Medium'});
  if (m.hilo && raiz) body.push({type: 'TextBlock', text: 'Sobre: «' + String(raiz.txt || 'adjunto').slice(0, 140) + '»', isSubtle: true, wrap: true, size: 'Small', spacing: 'Medium'});
  if (m.txt) body.push({type: 'TextBlock', text: m.txt, wrap: true, size: 'Medium', spacing: 'Medium'});
  if (adj) body.push({type: 'TextBlock', text: '📎 ' + adj + (adj === 1 ? ' adjunto' : ' adjuntos') + ' (se ven en la app)', isSubtle: true, size: 'Small', wrap: true});
  body.push({type: 'Input.Text', id: 'resp', isMultiline: true, maxLength: 2000, placeholder: 'Escribe aquí la respuesta para ' + GR[m.deg].toLowerCase(), spacing: 'Large'});
  return {type: 'AdaptiveCard', $schema: 'http://adaptivecards.io/schemas/adaptive-card.json', version: '1.4', body,
    actions: [{type: 'Action.Submit', title: 'Responder', style: 'positive', data: {hilo: r0.id}}, {type: 'Action.OpenUrl', title: 'Abrir la app', url: location.origin + location.pathname}]};
}
const COLA_K = 'taller.teams.cola';
const teamsCola = () => { try { const c = JSON.parse(LS.get(COLA_K) || '[]'); return Array.isArray(c) ? c : []; } catch(_){ return []; } };
function teamsEnviar(m){ const t = tconf(); if (!t.on || !t.hook || !teamsGente(m.para).length) return false;
  LS.set(COLA_K, JSON.stringify(teamsCola().concat([m.id]).slice(-50))); TM.ult = 0; window.TEAMS_TICK(); return true; }
async function teamsSalida(){ const c = teamsCola(); if (!c.length || !SYNC.on) return; const t = tconf(), resto = []; let n = 0;
  for (const id of c){ const m = (PLAN.msg || {})[id]; if (!m || !t.on || !t.hook || m.tm) continue;
    try { await SYNC.despachar('teams-out', {hook: t.hook, id, para: teamsGente(m.para).map(p => p.e), card: teamsCard(m)}); m.tm = 1; n++; } catch(_){ resto.push(id); } }
  LS.set(COLA_K, JSON.stringify(resto)); if (n){ guardar(); if (S.v === 'msg' && !S.sheet && !S.drag){ S.keepY = true; render(); } } }
async function teamsEntrada(){ const t = tconf(); if (!t.on || !t.pk || !SYNC.on) return; const fs = await SYNC.puente(); if (!fs.length) return;
  const key = await crypto.subtle.importKey('jwk', Object.assign({}, t.pk, {alg: 'RSA-OAEP-256', ext: true, key_ops: ['decrypt']}), {name: 'RSA-OAEP', hash: 'SHA-256'}, false, ['decrypt']);
  let n = 0;
  for (const f of fs.slice(0, 20)){ const id = 'tm' + f.name.replace(/\.json$/, '').replace(/[^a-z0-9]/g, '').slice(0, 28);
    try { const o = JSON.parse(await SYNC.puenteLeer(f.name));
      const aes = await crypto.subtle.importKey('raw', await crypto.subtle.decrypt({name: 'RSA-OAEP'}, key, u8b(o.k)), 'AES-GCM', false, ['decrypt']);
      const p = JSON.parse(new TextDecoder().decode(await crypto.subtle.decrypt({name: 'AES-GCM', iv: u8b(o.iv)}, aes, u8b(o.ct))));
      const raiz = (PLAN.msg || {})[p.hilo], tx = String(p.txt || '').trim().slice(0, 2000);
      if (raiz && !raiz.hilo && tx && !PLAN.msg[id]){
        const em = String(p.email || '').toLowerCase(), per = (t.gente || []).find(x => x.e && x.e === em);
        const deg = per ? per.g : ([raiz.para, raiz.deg].find(g => teamsGente(g).length) || raiz.para), para = raiz.deg === deg ? raiz.para : raiz.deg;
        const ts = p.ts && !isNaN(new Date(p.ts)) ? new Date(p.ts).toISOString() : new Date().toISOString();
        PLAN.msg[id] = {id, de: String((per && per.n) || p.de || 'Teams').slice(0, 40), deg, para, txt: tx, ts, resp: false, hilo: raiz.id, via: 'teams'}; n++; }
    } catch(_){}
    await SYNC.puenteBorrar(f.name, f.sha); }
  if (n){ guardar(); if (!S.drag && !S.sheet){ S.keepY = true; render(); } else msgAvisos(); } }
const TM = {busy: false, ult: 0};
window.TEAMS_TICK = async () => { if (TM.busy || Date.now() - TM.ult < 20000 || !tconf().on) return; TM.busy = true; TM.ult = Date.now();
  try { await teamsSalida(); } catch(_){} try { await teamsEntrada(); } catch(_){} TM.busy = false; };
async function teamsClaves(){ const t = PLAN.teams; if (!t.pk){
    const kp = await crypto.subtle.generateKey({name: 'RSA-OAEP', modulusLength: 2048, publicExponent: new Uint8Array([1, 0, 1]), hash: 'SHA-256'}, true, ['encrypt', 'decrypt']);
    const j = await crypto.subtle.exportKey('jwk', kp.privateKey); t.pk = {}; ['kty','n','e','d','p','q','dp','dq','qi'].forEach(f => { t.pk[f] = j[f]; }); t.pub = false; }
  if (!t.pub){ await SYNC.subirPub({kty: 'RSA', n: t.pk.n, e: t.pk.e}); t.pub = true; } }
function fichaTeams(){ const t = tconf(), g = S.tgente || (t.gente || []).map(p => Object.assign({}, p));
  if (!S.tgente) S.tgente = g; if (!g.length) g.push({n: '', e: '', g: 'prod'});
  const fila = (p, i) => `<div class="tgr"><input data-tn="${i}" value="${esc(p.n)}" placeholder="Nombre" maxlength="40" aria-label="Nombre"><input data-te="${i}" value="${esc(p.e)}" placeholder="correo@bronymec.com" type="email" inputmode="email" autocomplete="off" aria-label="Correo de Teams"><select data-tg="${i}" aria-label="Grupo">${Object.keys(GR).map(k => `<option value="${k}" ${p.g === k ? 'selected' : ''}>${esc(GR[k])}</option>`).join('')}</select><button class="x" data-tgdel="${i}" aria-label="Quitar">${I.x}</button></div>`;
  const porG = Object.keys(GR).map(k => [k, g.filter(p => p.g === k && MAIL_OK.test(p.e || '')).length]).filter(x => x[1]);
  return `<div class="scrim" data-close="1"></div><aside class="sheet" role="dialog" aria-modal="true" aria-label="Teams">
    <div class="sh-h"><div><h2>Mensajes y Teams</h2><p>${t.on ? 'Conectado: los mensajes para la oficina llegan también a Teams.' : 'Sin conectar.'}</p></div><button class="x" data-close="1" aria-label="Cerrar">${I.x}</button></div>
    <div class="sh-b">
      <div class="sec"><h3>Cómo funciona</h3><p class="ph">Cuando alguien escribe en la app a un grupo que tiene personas en esta agenda, el mensaje llega también al chat de Teams como una tarjeta con casilla para contestar. Lo que contesten allí aparece en la conversación de la app, en el taller. El taller sigue usando solo la app.</p></div>
      <div class="sec"><h3>Agenda</h3><p class="ph">Nombre, correo de Teams y grupo de cada compañero. ${porG.length ? 'Llegará a Teams lo que vaya a: ' + porG.map(([k, n]) => esc(GR[k]) + ' (' + n + ')').join(', ') + '.' : 'Pon al menos a una persona con correo.'}</p>
        <div class="tgl">${g.map(fila).join('')}</div><div class="acts"><button class="btn" data-tgadd="1">+ Añadir persona</button></div></div>
      <div class="sec"><h3>Conexión con Teams</h3><p class="ph">La dirección del flujo de Teams (la da Teams al crear el flujo). Se guarda cifrada en el plan; no se ve en ninguna pantalla del taller.</p>
        <div class="ctl"><label style="grid-column:span 2">Dirección del flujo<input id="tmHook" type="password" value="${esc(t.hook)}" placeholder="https://…powerplatform.com/…" autocomplete="off"></label></div>
        <div class="seg" style="max-width:360px;margin-top:10px"><button data-tmon="0" aria-pressed="${!S.tmon}">Apagado</button><button data-tmon="1" aria-pressed="${!!S.tmon}">Encendido</button></div></div>
      <div class="acts"><button class="btn pri" data-tmsave="1">Guardar</button>${t.on ? '<button class="btn" data-tmtest="1">Enviar una prueba a Teams</button>' : ''}</div>
    </div></aside>`;
}
function teamsLeerForm(){ (S.tgente || []).forEach((p, i) => { const n = document.querySelector(`[data-tn="${i}"]`), e = document.querySelector(`[data-te="${i}"]`), s = document.querySelector(`[data-tg="${i}"]`);
  if (n) p.n = n.value.trim().slice(0, 40); if (e) p.e = e.value.trim().toLowerCase(); if (s) p.g = s.value; }); }
async function teamsGuardar(){ teamsLeerForm(); const hook = ($('tmHook') && $('tmHook').value || '').trim();
  const malos = S.tgente.filter(p => p.e && !MAIL_OK.test(p.e)); if (malos.length){ toast('Revisa el correo de ' + (malos[0].n || malos[0].e)); return; }
  if (S.tmon && !HOOK_OK.test(hook)){ toast('Esa dirección no es de un flujo de Teams (debe empezar por https:// y ser de Power Automate)'); return; }
  PLAN.teams = Object.assign({}, tconf(), {hook, on: !!S.tmon, gente: S.tgente.filter(p => p.n || p.e)});
  try { if (PLAN.teams.on){ toast('Preparando la conexión…'); await teamsClaves(); } } catch(_){ toast('No se ha podido preparar la conexión con Teams. Revisa que la tablet esté En vivo.'); return; }
  guardar(); S.sheet = null; S.tgente = null; pintarFicha(); render(); toast(PLAN.teams.on ? 'Teams conectado' : 'Guardado'); }
async function teamsPrueba(){ const yo = YO() || {n: 'Jon', g: 'dir'};
  const m = {id: 'prueba', de: yo.n, deg: 'fresa', para: yo.g, txt: 'Mensaje de prueba desde la app del taller. Si contestas aquí, la respuesta no se guarda (es solo una prueba).', ts: new Date().toISOString(), resp: true, hilo: null};
  const para = teamsGente(yo.g).map(p => p.e); if (!para.length){ toast('Para la prueba, pon tu correo de Teams en la agenda con tu grupo (' + GR[yo.g] + ')'); return; }
  try { await SYNC.despachar('teams-out', {hook: tconf().hook, id: 'prueba', para, card: teamsCard(m)}); toast('Prueba enviada: en unos segundos debería salir en Teams'); } catch(e){ toast('No se ha podido enviar la prueba (' + String(e && e.message) + ')'); } }
/* v36: en la portada, cada empresa con dos caras para gerencia: Producción (los talleres) y Panel de control
   (el Control de Pedidos de esa empresa, que vive en Claude). Solo se enseña en aparatos de gerencia
   (grupo Jon / Ander en Mensajes, o clave de responsable recordada). El panel se abre en Claude con la cuenta de
   Jon: aunque alguien llegara al enlace, sin esa cuenta no ve nada. La app sigue sin precios ni importes. */
const PANELES = {caf: 1, talgo: 1};
/* v39 (26/10/2026) · Pantalla de la oficina: con ?oficina en el enlace el aparato queda como pantalla de gerencia
   (Fabricación + Panel de control de CAF y Talgo en una sola app). Los paneles siguen pidiendo la clave de gerencia. */
const OFI_K = 'taller.oficina';
if (/[?&]oficina\b/.test(location.search)){ try { localStorage.setItem(OFI_K, '1'); } catch(_){} }
const esOficina = () => { try { return localStorage.getItem(OFI_K) === '1'; } catch(_){ return false; } };
/* v41 (30/10/2026) · Jon: "en el fijado solo se ve la fabricación; quiero la vista completa". Dentro de Claude (la copia fijada,
   solo con su cuenta) la portada enseña SIEMPRE Producción | Panel de control: no depende de que el aparato recuerde nada
   (el navegador de Claude borra el almacenamiento al pedir iniciar sesión de nuevo). Los paneles siguen pidiendo la clave de gerencia. */
const esGerencia = () => { try { return esDir(yoG()) || respOk() || esOficina() || enClaude(); } catch(_){ return false; } };
/* v37 · El panel se abre DENTRO de la app (Jon: "no quiero que sea enlace"): panel.html a pantalla completa, con la
   clave de responsable (Total). Las marcas que se hagan allí suben solas al plan compartido. */
function abrirPanel(e){
  if (!PANELES[e] || !EMPS[e]) return;
  /* v40: sin teclado de 4 cifras: el panel ya pide la clave de gerencia (la que protege los datos). */
  let w = $('pnlw'); if (!w){ w = document.createElement('div'); w.id = 'pnlw'; document.body.appendChild(w); }
  w.className = 'pnlw pnl-' + e;
  w.innerHTML = `<div class="pnl-bar"><button class="pnl-x" data-pnlx="1" aria-label="Volver a la portada">${I.back || '‹'}<span>${esc(empN(e))}</span></button><b>Panel de control</b><span class="pnl-n" id="pnlN"></span></div><iframe src="panel.html?e=${e}" title="Panel de control ${esc(empN(e))}" allow="clipboard-write"></iframe>`;
  document.body.classList.add('pnl-on'); S.pnl = e;
  try { history.pushState({tl: 1, pnl: e, v: S.v}, ''); } catch(_){}
}
function cerrarPanel(volver){
  const w = $('pnlw'); if (w) w.remove(); document.body.classList.remove('pnl-on'); S.pnl = null;
  try { SYNC.panelAhora(); } catch(_){}
  if (volver){ try { history.back(); } catch(_){} }
}
addEventListener('message', ev => { if (ev.origin !== location.origin || !ev.data || ev.data.t !== 'bm-panel-cola') return;
  const n = +ev.data.n || 0, el = $('pnlN'); if (el) el.textContent = n ? n + (n === 1 ? ' marca por subir' : ' marcas por subir') : '';
  clearTimeout(window.__pnlT); window.__pnlT = setTimeout(() => { try { SYNC.panelAhora(); } catch(_){} }, 800); });
function renderElegir(){
  document.body.classList.add('picking');
  $('nav').innerHTML = ''; $('dock').innerHTML = ''; $('ctx').innerHTML = ''; { const cm = $('chipm'); if (cm) cm.innerHTML = ''; } $('fresh').innerHTML = '';
  const now = new Date(), fin = addD(lunes(HOY), 7);
  const panel = e => { const M = MOD[e], D = EMPS[e], ab = M.LINEAS.filter(l => !l.term), lt = ab.filter(l => l.late), fab = M.ARTS.filter(a => a.falta > 0);
    const uds = fab.reduce((s,a) => s + a.falta, 0), sem = ab.filter(l => !l.late && l.d >= HOY && l.d < fin).length;
    const sig = ab.filter(l => !l.late && l.d >= HOY).sort((a,b) => a.d - b.d)[0];
    const peor = lt.slice().sort((a,b) => a.d - b.d)[0];
    const viejo = D.export && diasA(pd(D.export)) < -3;
    const enPlan = Object.values(PLAN.items).filter(it => itEmp(it) === e && !it.done && it.d >= slotDia(HOY)).length;
    const porT = {fresa: {late: 0, fab: 0, uds: 0}, torno: {late: 0, fab: 0, uds: 0}, secc: {late: 0, fab: 0, uds: 0}, todo: {late: lt.length, fab: fab.length, uds}};
    lt.forEach(l => { const a = M.ART[l.conCod ? l.cod : 'ref:' + (l.ref || l.id)]; const t = a ? tipoArt(a) : 'fresa'; if (porT[t]) porT[t].late++; });
    fab.forEach(a => { const t = tipoArt(a); if (porT[t]){ porT[t].fab++; porT[t].uds += a.falta; } });
    const door = (k, n) => { const x = porT[k]; return `<button class="pq-door ${k === 'todo' ? 'total' : k}" data-pick="${e}|${k}" aria-label="${esc(empN(e))} · ${n}${k === 'todo' ? ' (clave de responsable)' : ''}"><span class="dt">${IT[k]}<span class="dn">${n}</span>${k === 'todo' && !respOk() ? I.lock : I.arr}</span><span class="dk">${x.fab ? `<b>${nf(x.uds)}</b> uds<br>${x.fab} ${x.fab === 1 ? 'pieza' : 'piezas'}` : 'Nada que fabricar'}<br>${x.late ? `<span class="r">${x.late} con retraso</span>` : '<span>Sin retrasos</span>'}${(() => { const n = msgPend(k === 'todo' ? null : k).length; return n ? `<br><span class="mp">✉ ${n} por contestar</span>` : ''; })()}</span></button>`; };
    return `<div class="pq pq-${e}" role="group" aria-label="${esc(empN(e))}">
      <span class="pq-bg" aria-hidden="true">${esc(empN(e).toUpperCase())}</span>
      <span class="pq-top"><span class="pq-chip ${viejo ? 'old' : ''}"><i></i>${viejo ? 'Pedidos del ' + dS(pd(D.export)) + ' · pendiente de actualizar' : 'Pedidos al día · ' + (D.export ? dS(pd(D.export)) : '—')}</span></span>
      <span class="pq-name">${esc(empN(e).toUpperCase())}</span>
      ${esGerencia() && PANELES[e] ? `<span class="pq-sw" aria-label="${esc(empN(e))}"><button class="on" aria-current="true" disabled>${I.prod}<span>Producción</span></button><button data-pqp="${e}">${I.pc}<span>Panel de control</span></button></span>` : ''}
      <span class="pq-ks">
        <span><b class="num">${ab.length}</b><em>líneas abiertas</em></span>
        <span class="${lt.length ? 'r' : 'g'}"><b class="num">${lt.length}</b><em>con retraso</em></span>
        <span><b class="num">${nf(uds)}</b><em>uds a fabricar · ${fab.length} piezas</em></span>
        <span><b class="num">${sem}</b><em>entregas esta semana</em></span>
      </span>
      <span class="pq-ln">${peor ? `<span class="r">Lo más urgente: <b>${esc(peor.desc)}</b> · ${Math.abs(peor.dias || 0)} días tarde</span>` : sig ? `<span>Siguiente entrega: <b>${esc(sig.desc)}</b> · ${dS(sig.d)}</span>` : '<span>Sin entregas pendientes</span>'}${enPlan ? `<span>${enPlan} ${enPlan === 1 ? 'ficha' : 'fichas'} en el calendario</span>` : ''}</span>
      <span class="pq-doors">${door('fresa', 'Fresa')}${door('torno', 'Torno')}${door('secc', 'Seccionadora')}${door('todo', 'Total')}</span>
    </div>`; };
  $('main').innerHTML = `<div class="pick2">
    <div class="pick2-h"><div class="bm">BM</div><div><b>${esGerencia() ? 'Bronymec' : 'Fabricación Bronymec'}</b><span>${esc(DIAS[now.getDay()][0].toUpperCase() + DIAS[now.getDay()].slice(1))} ${now.getDate()} de ${['enero','febrero','marzo','abril','mayo','junio','julio','agosto','septiembre','octubre','noviembre','diciembre'][now.getMonth()]} · semana ${semanaN(now)}</span></div></div>
    <div class="pick2-g">${EIDS.map(panel).join('')}</div>
    <div class="pick2-f">Entra en tu taller: Fresa, Torno o Seccionadora. Total enseña todos los talleres y pide la clave de responsable. Para cambiar de taller o de empresa, toca el logo BM.${respOk() ? ' <button class="pin-olv" data-resp-olv="1">Volver a pedir la clave en este aparato</button>' : ''}</div></div>`;
  if (!PIN) $('ov').innerHTML = ''; alto();
}
function pintarFicha(){
  const s = S.sheet;
  $('ov').innerHTML = !s ? '' : s.t === 'art' ? fichaArt(s.key, null, s.emp) : s.t === 'lin' ? fichaLin(s.key) : s.t === 'libre' ? fichaLibre(s.key, s.pre) : s.t === 'item' ? (!PLAN.items[s.key] ? '' : PLAN.items[s.key].k === 'libre' ? fichaLibre(s.key) : fichaArt(PLAN.items[s.key].akey, s.key, itEmp(PLAN.items[s.key]))) : s.t === 'ajustes' ? ajustes() : s.t === 'inst' ? instFicha() : s.t === 'prop' ? fichaProp() : s.t === 'wkpick' ? wkPicker() : s.t === 'dia' ? fichaDia(s.key) : s.t === 'teams' ? fichaTeams() : '';
  const f = $('lD'); if (f && !f.value) setTimeout(() => { if (!document.activeElement || document.activeElement === document.body) f.focus(); }, 60);
}
let tt; function toast(t, undo){ clearTimeout(tt); $('toastHost').innerHTML = `<div class="toast" role="status">${esc(t)}${undo && historial.length ? '<button data-undo="1">Deshacer</button>' : ''}</div>`; tt = setTimeout(() => { $('toastHost').innerHTML = ''; }, 4200); }

