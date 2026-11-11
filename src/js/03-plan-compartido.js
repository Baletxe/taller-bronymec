/* ================= PLAN COMPARTIDO =================
   El plan (fichas, terminados, secciones, notas, máquinas) se guarda también en un repositorio PRIVADO de GitHub,
   cifrado con la misma clave que abre la app (AES-GCM). Cada dispositivo lo lee cada pocos segundos y escribe al cambiar.
   Si dos dispositivos cambian a la vez, se mezcla ficha a ficha: gana el cambio más reciente de cada ficha. */
const SYNC = (() => {
  const CFG_K = 'taller.sync.cfg', MT_K = 'taller.sync.mt', NO_K = 'taller.sync.no';
  const enc = new TextEncoder(), dec = new TextDecoder();
  const b64 = u => { let s = ''; const a = new Uint8Array(u); for (let i = 0; i < a.length; i += 0x8000) s += String.fromCharCode.apply(null, a.subarray(i, i + 0x8000)); return btoa(s); };
  const u8 = s => Uint8Array.from(atob(s), c => c.charCodeAt(0));
  const b64u = s => s.replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, ''), unb64u = s => { s = s.replace(/-/g, '+').replace(/_/g, '/'); while (s.length % 4) s += '='; return s; };
  let ultErr = '', cfg = null, key = null, sha = null, etag = null, st = 'off', msg = 'Plan sin conectar', ultimo = null, tPush = null, tPull = null, ocupado = false, pend = false, ultOk = 0, fallos = 0;
  let MT = (() => { try { return JSON.parse(LS.get(MT_K) || '{}'); } catch(_){ return {}; } })();
  try { cfg = JSON.parse(LS.get(CFG_K) || 'null'); if (cfg){ cfg.repo = 'Baletxe/taller-plan'; if (typeof cfg.token !== 'string') cfg = null; } } catch(_){}
  async function clave(){
    if (key) return key;
    let raw = null; try { raw = localStorage.getItem('tl.k') || sessionStorage.getItem('tl.ks'); } catch(_){}
    if (!raw || !crypto.subtle) return null;
    const base = await crypto.subtle.importKey('raw', u8(raw), 'HKDF', false, ['deriveKey']);
    key = await crypto.subtle.deriveKey({name: 'HKDF', hash: 'SHA-256', salt: enc.encode('bronymec-taller'), info: enc.encode('plan-compartido-v1')}, base, {name: 'AES-GCM', length: 256}, false, ['encrypt', 'decrypt']);
    return key;
  }
  async function cifra(obj){ const k = await clave(), iv = crypto.getRandomValues(new Uint8Array(12)); const ct = await crypto.subtle.encrypt({name: 'AES-GCM', iv}, k, enc.encode(JSON.stringify(obj))); return {v: 1, iv: b64(iv), ct: b64(ct)}; }
  async function descifra(o){ const k = await clave(); return JSON.parse(dec.decode(await crypto.subtle.decrypt({name: 'AES-GCM', iv: u8(o.iv)}, k, u8(o.ct)))); }
  /* Lo que se comparte, como claves sueltas: así se puede mezclar ficha a ficha. */
  function plano(){ const o = {};
    Object.entries(PLAN.items).forEach(([k, v]) => { o['i:' + k] = v; });
    Object.entries(PLAN.term).forEach(([k, v]) => { o['t:' + k] = v; });
    Object.entries(PLAN.tipo).forEach(([k, v]) => { o['p:' + k] = v; });
    Object.entries(PLAN.notas).forEach(([k, v]) => { o['n:' + k] = v; });
    Object.entries(PLAN.hp || {}).forEach(([k, v]) => { o['h:' + k] = v; }); o['k:conf'] = PLAN.conf;
    Object.entries(PLAN.msg || {}).forEach(([k, v]) => { o['x:' + k] = v; });
    Object.entries(PLAN.mst || {}).forEach(([k, v]) => { o['y:' + k] = v; }); if (PLAN.teams) o['q:teams'] = PLAN.teams;
    o['m:maq'] = PLAN.maq; o['c:clis'] = PLAN.clis; o['r:reglas'] = PLAN.reglas; return o; }
  function aplicar(o){
    PLAN.items = {}; PLAN.term = {}; PLAN.tipo = {}; PLAN.notas = {}; PLAN.hp = {}; PLAN.msg = {}; PLAN.mst = {};
    Object.entries(o).forEach(([k, v]) => { const t = k.slice(0, 2), id = k.slice(2);
      if (t === 'x:') PLAN.msg[id] = v; else if (t === 'y:') PLAN.mst[id] = v; else if (t === 'i:') PLAN.items[id] = v; else if (t === 't:') PLAN.term[id] = v; else if (t === 'p:') PLAN.tipo[id] = v; else if (t === 'n:') PLAN.notas[id] = v; else if (t === 'h:') PLAN.hp[id] = v; else if (k === 'k:conf' && v && typeof v === 'object') PLAN.conf = v; else if (k === 'q:teams' && v && typeof v === 'object') PLAN.teams = v;
      else if (k === 'm:maq' && Array.isArray(v) && v.length) PLAN.maq = v; else if (k === 'c:clis' && Array.isArray(v)) PLAN.clis = v; else if (k === 'r:reglas' && Array.isArray(v)) PLAN.reglas = v; });
  }
  const J = v => JSON.stringify(v);
  /* Marca con la hora cada clave que ha cambiado desde la última vez (también las borradas). */
  function marcar(){
    const ahora = Date.now(), cur = plano(); if (!ultimo){ ultimo = {}; Object.entries(cur).forEach(([k, v]) => { ultimo[k] = J(v); if (!MT[k]) MT[k] = 1; }); }
    let hay = false;
    new Set([...Object.keys(cur), ...Object.keys(ultimo)]).forEach(k => { const a = k in cur ? J(cur[k]) : null; if (a !== (k in ultimo ? ultimo[k] : null)){ MT[k] = ahora; hay = true; if (a == null) delete ultimo[k]; else ultimo[k] = a; } });
    if (hay) LS.set(MT_K, J(MT)); return hay;
  }
  function mezclar(rem){ /* rem = {d: {clave: valor}, mt: {clave: hora}} */
    const cur = plano(), out = {}; let cambiaLocal = false, faltaRemoto = false;
    new Set([...Object.keys(cur), ...Object.keys(rem.d || {}), ...Object.keys(MT), ...Object.keys(rem.mt || {})]).forEach(k => {
      const ml = MT[k] || 0, mr = (rem.mt || {})[k] || 0, enL = k in cur, enR = k in (rem.d || {});
      if (mr > ml){ if (enR) out[k] = rem.d[k]; MT[k] = mr; if (J(enL ? cur[k] : null) !== J(enR ? rem.d[k] : null)) cambiaLocal = true; }
      else { if (enL) out[k] = cur[k]; if (ml > mr || enL !== enR) faltaRemoto = true; }
    });
    /* Las marcas de lo borrado hace más de 60 días ya no hacen falta. */
    const lim = Date.now() - 60 * 864e5; Object.keys(MT).forEach(k => { if (!(k in out) && MT[k] < lim) delete MT[k]; });
    if (cambiaLocal){ aplicar(out); normalizarPlan(); LS.set(KEY, J(PLAN)); ultimo = null; marcar(); }
    LS.set(MT_K, J(MT));
    return {cambiaLocal, faltaRemoto};
  }
  const api = (path, opt) => fetch('https://api.github.com/repos/' + cfg.repo + '/contents/' + path, Object.assign({cache: 'no-store'}, opt, {headers: Object.assign({'Authorization': 'Bearer ' + cfg.token, 'Accept': 'application/vnd.github+json', 'X-GitHub-Api-Version': '2022-11-28'}, (opt && opt.headers) || {})}));
  function estado(s, m){ const ok0 = st === 'on'; st = s; msg = m; const b = $('sync'); if (!b) return; b.hidden = false; b.className = 'sync ' + s; b.querySelector('span').textContent = m; b.title = s === 'on' ? 'Plan compartido: los cambios se ven en todos los dispositivos' : m + ' · toca para ver'; 
    if ((s === 'on') !== ok0 && S && !S.drag && !S.sheet && S.v !== 'tv' && S.v !== 'elegir'){ S.keepY = true; render(); } }
  async function bajar(){
    const r = await api('plan.json' + '?t=' + Date.now(), {headers: etag ? {'If-None-Match': etag} : {}});
    if (r.status === 304) return null;
    if (r.status === 404){ sha = null; etag = null; return {d: {}, mt: {}}; }
    if (!r.ok) throw new Error('GitHub ' + r.status);
    etag = r.headers.get('ETag'); const j = await r.json(); sha = j.sha;
    const txt = dec.decode(u8(j.content.replace(/\n/g, '')));
    /* Si el plan remoto no se puede descifrar (cambio de contraseña del taller), se trata como vacío y se reescribe con la clave nueva. */
    try { return await descifra(JSON.parse(txt)); } catch(_){ return {d: {}, mt: {}}; }
  }
  /* v13 · El taller de cada pieza se comparte con el panel CAF (Jon, 17/10/2026: "lo que pongo en un sitio también debe
     aparecer en el otro"). Dos caminos: el panel → la web trae en los datos lo decidido allí (importarTipos, gana la hora
     más reciente); la app → tipos.json en claro en taller-plan, que la pasada horaria lleva al panel. */
  function tiposPlano(){ const tipo = {}; Object.entries(PLAN.tipo || {}).forEach(([k, t]) => { if (SEC_OK[t]) tipo[k] = {t, ts: MT['p:' + k] || 0}; });
    const term = {}; Object.entries(PLAN.term || {}).forEach(([k, v]) => { const ts = v && v.ts ? Date.parse(v.ts) : 0; if (/^(caf|talgo)\|[A-Za-z0-9_\-]{1,40}$/.test(k) && ts > 0) term[k] = ts; });
    return {v: 1, tipo, reglas: (PLAN.reglas || []).filter(g => g && g.w && SEC_OK[g.t]).map(g => ({w: String(g.w).slice(0, 40), t: g.t})), term}; }
  function importarTipos(lista){
    let n = 0; const ahora = Date.now();
    (Array.isArray(lista) ? lista : []).forEach(x => { if (!Array.isArray(x)) return; const [k, t, ts0] = x; const ts = Math.min(+ts0 || 0, ahora + 60000);
      if (typeof k !== 'string' || !/^(caf|talgo)\|[^|]{1,120}$/.test(k) || !SEC_OK[t]) return;
      const mk = 'p:' + k, ml = MT[mk] || 0;
      if (PLAN.tipo[k] === t){ if (ts > ml){ MT[mk] = ts; } return; }
      if (PLAN.tipo[k] && ts <= ml) return;
      PLAN.tipo[k] = t; MT[mk] = ts || ahora; n++; });
    if (n){ LS.set(MT_K, J(MT)); LS.set(KEY, J(PLAN)); ultimo = null; marcar(); }
    return n;
  }
  let tiposSha = null, tiposUlt = LS.get('taller.sync.tipos') || '';
  async function hex(txt){ const d = await crypto.subtle.digest('SHA-256', enc.encode(txt)); return [...new Uint8Array(d)].map(b => b.toString(16).padStart(2, '0')).join(''); }
  async function subirTipos(){
    try {
      const txt = J(tiposPlano()), hh = await hex(txt); if (hh === tiposUlt) return;
      if (tiposSha == null){ const g = await api('tipos.json?t=' + Date.now()); if (g.ok) tiposSha = (await g.json()).sha; else if (g.status === 404) tiposSha = ''; else return; }
      const r = await api('tipos.json', {method: 'PUT', headers: {'Content-Type': 'application/json'}, body: J({message: 'Taller de cada pieza ' + new Date().toISOString().slice(0, 16), content: b64(enc.encode(txt)), sha: tiposSha || undefined})});
      if (r.status === 409 || r.status === 422){ tiposSha = null; return; }
      if (!r.ok) return;
      tiposSha = (await r.json()).content.sha; tiposUlt = hh; LS.set('taller.sync.tipos', hh);
    } catch(_){}
  }
  /* v37 · Marcas hechas en el panel de control dentro de la app (Enviado, parcial, nota…): se guardan en este aparato
     (panel.cola.v1) y se suben a taller-plan/panel-cambios.json; la pasada horaria de Claude las escribe en el panel. */
  let panelSha = null, panelUlt = LS.get('taller.sync.panel') || '';
  async function subirPanel(){
    try {
      let q = []; try { q = JSON.parse(localStorage.getItem('panel.cola.v1') || '[]') || []; } catch(_){}
      q = (Array.isArray(q) ? q : []).filter(x => x && (x.emp === 'caf' || x.emp === 'talgo') && x.col === 'marcas' && typeof x.doc === 'string' && (x.op === 'set' || x.op === 'delete'));
      const hh = await hex(J(q)); if (hh === panelUlt) return;
      if (panelSha == null){ const g = await api('panel-cambios.json?t=' + Date.now()); if (g.ok) panelSha = (await g.json()).sha; else if (g.status === 404) panelSha = ''; else return; }
      const txt = J({v: 1, ts: new Date().toISOString(), cambios: q});
      const r = await api('panel-cambios.json', {method: 'PUT', headers: {'Content-Type': 'application/json'}, body: J({message: 'Marcas del panel ' + new Date().toISOString().slice(0, 16), content: b64(enc.encode(txt)), sha: panelSha || undefined})});
      if (r.status === 409 || r.status === 422){ panelSha = null; return; }
      if (!r.ok) return;
      panelSha = (await r.json()).content.sha; panelUlt = hh; LS.set('taller.sync.panel', hh);
    } catch(_){}
  }
  async function subir(){
    const cuerpo = J(await cifra({d: plano(), mt: MT, por: navigator.userAgent.slice(0, 60), ts: new Date().toISOString()}));
    const r = await api('plan.json', {method: 'PUT', headers: {'Content-Type': 'application/json'}, body: J({message: 'Plan del taller ' + new Date().toISOString().slice(0, 16), content: b64(enc.encode(cuerpo)), sha: sha || undefined})});
    if (r.status === 409 || r.status === 422){ sha = null; etag = null; return false; }
    if (!r.ok) throw new Error('GitHub ' + r.status);
    const j = await r.json(); sha = j.content.sha; etag = null; await subirTipos(); return true;
  }
  async function ciclo(forzarSubir){
    if (!cfg || ocupado){ pend = pend || forzarSubir; return; }
    ocupado = true; if (forzarSubir) estado('busy', 'Guardando…');
    try {
      for (let i = 0; i < 3; i++){
        const rem = await bajar(); let falta = forzarSubir;
        if (rem){ const m = mezclar(rem); if (m.cambiaLocal && !S.drag){ reconstruir(); if (!S.sheet || S.v === 'tv') render(); else S.repintar = true; } falta = falta || m.faltaRemoto; }
        if (!falta) break;
        if (await subir()) break;
      }
      if (!tiposUlt) await subirTipos();
      await subirPanel();
      ultOk = Date.now(); fallos = 0; ultErr = ''; estado('on', 'En vivo');
    } catch(e){ fallos++; const c = +((/GitHub (\d+)/.exec((e && e.message) || '') || [])[1] || 0); ultErr = c ? 'GitHub ' + c : String((e && e.message) || e).slice(0, 60); estado('err', navigator.onLine === false ? 'Sin internet' : (c === 401 || c === 403 || c === 404) ? 'Enlace del plan caducado' : 'Sin conexión con el plan'); }
    ocupado = false;
    if (st === 'on' && window.TEAMS_TICK) window.TEAMS_TICK();
    if (pend){ pend = false; setTimeout(() => ciclo(true), 200); }
  }
  function programar(){ clearTimeout(tPull); if (!cfg) return; const ms = document.visibilityState === 'visible' ? Math.min(60000, 8000 * Math.pow(2, Math.min(fallos, 3))) : 60000; tPull = setTimeout(async () => { await ciclo(false); programar(); }, ms); }
  async function conectarCon(token, repo){ if (typeof token !== 'string' || !/^github_pat_[A-Za-z0-9_]{20,}$/.test(token)) throw new Error('token'); cfg = {token, repo: 'Baletxe/taller-plan'}; LS.set(CFG_K, J(cfg)); try { localStorage.removeItem(NO_K); } catch(_){} sha = null; etag = null; ultimo = null; marcar(); await ciclo(true); programar(); }
  /* Enlace de conexión: …/#conectar=<token y repo cifrados con la clave del taller>. Sin la contraseña no sirve. */
  async function desdeEnlace(txt){
    const m = /conectar=([A-Za-z0-9_\-]+)\.([A-Za-z0-9_\-]+)/.exec(txt || ''); if (!m) return false;
    const k = await clave(); if (!k) { toast('Abre primero la app con la contraseña del taller y vuelve a usar el enlace'); return false; }
    try { const o = JSON.parse(dec.decode(await crypto.subtle.decrypt({name: 'AES-GCM', iv: u8(unb64u(m[1]))}, k, u8(unb64u(m[2])))));
      await conectarCon(o.t, o.r); toast('Plan compartido conectado: este dispositivo ya ve el mismo calendario que los demás'); return true;
    } catch(_){ toast('Ese enlace no es de este taller o la contraseña ha cambiado'); return false; }
  }
  async function crearEnlace(token, repo){ const k = await clave(), iv = crypto.getRandomValues(new Uint8Array(12));
    const ct = await crypto.subtle.encrypt({name: 'AES-GCM', iv}, k, enc.encode(J({t: token, r: repo || 'Baletxe/taller-plan'})));
    return location.origin + location.pathname + '#conectar=' + b64u(b64(iv)) + '.' + b64u(b64(ct)); }
  function local(){ if (marcar() && cfg){ clearTimeout(tPush); tPush = setTimeout(() => ciclo(true), 1200); } }
  function desconectar(){ cfg = null; try { localStorage.removeItem(CFG_K); } catch(_){} LS.set(NO_K, '1'); clearTimeout(tPull); estado('off', 'Plan sin conectar'); }
  /* La web trae (dentro de los datos cifrados con la contraseña) el acceso al plan: cualquier tablet que abra la app queda conectada. */
  const AUTO = (RAW.plan && typeof RAW.plan.t === 'string' && /^github_pat_[A-Za-z0-9_]{20,}$/.test(RAW.plan.t)) ? RAW.plan.t : null;
  async function reconectar(){ try { localStorage.removeItem(NO_K); } catch(_){} if (!AUTO) return false; cfg = {token: AUTO, repo: 'Baletxe/taller-plan'}; LS.set(CFG_K, J(cfg)); sha = null; etag = null; ultimo = null; marcar(); estado('busy', 'Conectando…'); await ciclo(true); programar(); return true; }
  async function iniciar(){
    try { const n = importarTipos(Object.values(RAW.emp || {}).flatMap(e => (e && e.taller) || [])); if (n){ reconstruir(); render(); } } catch(_){}
    marcar();
    if (/conectar=/.test(location.hash)){ const h = location.hash; try { history.replaceState(null, '', location.pathname + location.search); } catch(_){} await desdeEnlace(h); }
    if (AUTO && LS.get(NO_K) !== '1' && (!cfg || cfg.token !== AUTO)){ cfg = {token: AUTO, repo: 'Baletxe/taller-plan'}; LS.set(CFG_K, J(cfg)); sha = null; etag = null; }
    if (cfg){ estado('busy', 'Conectando…'); await ciclo(false); programar(); }
    else estado('off', 'Plan sin conectar');
    document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'visible' && cfg){ ciclo(false); programar(); } });
    addEventListener('online', () => { if (cfg){ ciclo(false); programar(); } });
    addEventListener('hashchange', async () => { if (/conectar=/.test(location.hash)){ const h = location.hash; try { history.replaceState(null, '', location.pathname + location.search); } catch(_){} if (await desdeEnlace(h)) render(); } });
  }
  /* v18 · Adjuntos de los mensajes: cifrados con la clave del taller (AES-GCM) en adj/<id> del repo del plan. */
  async function subirAdj(id, bytes){
    if (!cfg) throw new Error('sin plan'); const k = await clave(); if (!k) throw new Error('sin clave');
    const iv = crypto.getRandomValues(new Uint8Array(12)), ct = new Uint8Array(await crypto.subtle.encrypt({name: 'AES-GCM', iv}, k, bytes));
    const all = new Uint8Array(12 + ct.length); all.set(iv, 0); all.set(ct, 12);
    const r = await api('adj/' + id, {method: 'PUT', headers: {'Content-Type': 'application/json'}, body: J({message: 'Adjunto ' + id, content: b64(all)})});
    if (!r.ok) throw new Error('GitHub ' + r.status);
  }
  async function bajarAdj(id){
    if (!cfg) throw new Error('sin plan'); const k = await clave(); if (!k) throw new Error('sin clave');
    const r = await api('adj/' + id, {headers: {'Accept': 'application/vnd.github.raw+json'}}); if (!r.ok) throw new Error('GitHub ' + r.status);
    const all = new Uint8Array(await r.arrayBuffer());
    return new Uint8Array(await crypto.subtle.decrypt({name: 'AES-GCM', iv: all.slice(0, 12)}, k, all.slice(12)));
  }
  async function borrarAdj(id){
    if (!cfg) return; try { const g = await api('adj/' + id + '?t=' + Date.now()); if (!g.ok) return; const s = (await g.json()).sha;
      await api('adj/' + id, {method: 'DELETE', headers: {'Content-Type': 'application/json'}, body: J({message: 'Borrar adjunto ' + id, sha: s})}); } catch(_){} }
  /* v20 · Teams. La app avisa a GitHub (repository_dispatch) y recoge las respuestas de la rama 'puente'. */
  async function despachar(tipo, carga){ if (!cfg) throw new Error('sin plan');
    const r = await fetch('https://api.github.com/repos/' + cfg.repo + '/dispatches', {method: 'POST', cache: 'no-store', headers: {'Authorization': 'Bearer ' + cfg.token, 'Accept': 'application/vnd.github+json', 'X-GitHub-Api-Version': '2022-11-28', 'Content-Type': 'application/json'}, body: J({event_type: tipo, client_payload: carga})});
    if (r.status !== 204) throw new Error('GitHub ' + r.status); }
  let pEtag = null, pLista = [];
  async function puente(){ if (!cfg) return [];
    const r = await api('teams/in?ref=puente', {headers: pEtag ? {'If-None-Match': pEtag} : {}});
    if (r.status === 304) return pLista.slice();
    if (r.status === 404){ pEtag = null; pLista = []; return []; }
    if (!r.ok) throw new Error('GitHub ' + r.status);
    pEtag = r.headers.get('ETag'); const j = await r.json();
    pLista = (Array.isArray(j) ? j : []).filter(f => f && f.type === 'file' && /^[a-z0-9]{6,40}\.json$/.test(f.name)).map(f => ({name: f.name, sha: f.sha})); return pLista.slice(); }
  async function puenteLeer(n){ const r = await api('teams/in/' + n + '?ref=puente', {headers: {'Accept': 'application/vnd.github.raw+json'}}); if (!r.ok) throw new Error('GitHub ' + r.status); return r.text(); }
  async function puenteBorrar(n, s){ try { await api('teams/in/' + n, {method: 'DELETE', headers: {'Content-Type': 'application/json'}, body: J({message: 'Recibido ' + n, sha: s, branch: 'puente'})}); } catch(_){} pLista = pLista.filter(f => f.name !== n); }
  async function subirPub(jwk){ let s; const g = await api('teams/pub.json?t=' + Date.now()); if (g.ok) s = (await g.json()).sha;
    const r = await api('teams/pub.json', {method: 'PUT', headers: {'Content-Type': 'application/json'}, body: J({message: 'Clave pública para las respuestas de Teams', content: b64(enc.encode(J(jwk))), sha: s})});
    if (!r.ok) throw new Error('GitHub ' + r.status); }
  return {despachar, puente, puenteLeer, puenteBorrar, subirPub, subirAdj, bajarAdj, borrarAdj, local, iniciar, ahora: () => ciclo(true), desdeEnlace, crearEnlace, conectarCon, desconectar, reconectar, get auto(){ return !!AUTO; }, get err(){ return ultErr; }, get clave(){ return !!(function(){ try { return localStorage.getItem('tl.k') || sessionStorage.getItem('tl.ks'); } catch(_){ return null; } })(); }, get on(){ return !!cfg; }, get st(){ return st; }, get msg(){ return msg; }, get ult(){ return ultOk; }, get repo(){ return cfg && cfg.repo; }, tiposPlano, panelAhora: () => { if (cfg) subirPanel(); }};
})();
function foto(){ return JSON.stringify({items: PLAN.items, term: PLAN.term, tipo: PLAN.tipo}); }
function cambio(desc, fn){ historial.push(foto()); if (historial.length > 30) historial.shift(); fn(); guardar(); reconstruir(); render(); toast(desc, true); }
function deshacer(){ const h = historial.pop(); if (!h) return; const f = JSON.parse(h); PLAN.items = f.items; PLAN.term = f.term || {}; PLAN.tipo = f.tipo || {}; guardar(); reconstruir(); render(); toast('Deshecho'); }
const uid = () => Date.now().toString(36) + Math.random().toString(36).slice(2,6);
const maqDe = id => PLAN.maq.find(m => m.id === id) || {id, n:id, c:'m1', t:'fresa'};
const mcol = m => { const c = maqDe(m).c; return 'var(--' + (MCOL_OK.test(c || '') ? c : 'm1') + ')'; };

