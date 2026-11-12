/* ---------- almacenamiento del plan (en esta tablet; con copia de seguridad) ---------- */
const KEY = 'taller.plan.v1';
const LS = { get(k){ try { return localStorage.getItem(k); } catch(_){ return null; } }, set(k,v){ try { localStorage.setItem(k,v); return true; } catch(_){ return false; } } };
const MAQ0 = [{id:'h1', n:'Holzer 1', c:'m1', t:'fresa'}, {id:'h2', n:'Holzer 2', c:'m2', t:'fresa'}, {id:'cmi', n:'CMI', c:'m3', t:'fresa'}, {id:'tor', n:'Tornos', c:'m4', t:'torno'}, {id:'sec', n:'Seccionadora', c:'m6', t:'secc'}, {id:'sub', n:'Subcontratación', c:'m5', t:'sub'}];
/* Fase 1 · salvaguarda: si el plan guardado en este aparato no se puede leer, NO se pisa. Se aparta tal cual
   (taller.plan.v1.ilegible y sus marcas de hora) y se arranca sin marcas, para que el plan compartido mande y vuelva entero. */
let PLAN_ILEGIBLE = false;
let PLAN = (() => { const raw = LS.get(KEY); try { const p = JSON.parse(raw || 'null'); if (p && p.v === 1 && typeof p === 'object') return p; } catch(_){}
  if (raw){ PLAN_ILEGIBLE = true; LS.set(KEY + '.ilegible', raw); const mt = LS.get('taller.sync.mt'); if (mt) LS.set('taller.sync.mt.ilegible', mt); try { localStorage.removeItem('taller.sync.mt'); } catch(_){} }
  return {v:1, maq:MAQ0.map(m => Object.assign({}, m)), items:{}, notas:{}, tema:null, upd:null}; })();
/* Seguridad: todo lo que entra en el plan (de otra tablet vía GitHub, de una copia cargada o de esta misma tablet)
   se limpia aquí: ids, máquinas, fechas, cantidades y secciones con formato cerrado; textos como texto y con tope. */
const MCOL_OK = /^m[1-6]$/, ID_OK = /^[a-z0-9]{1,24}$/, DIA_OK = /^\d{4}-\d{2}-\d{2}$/, SEC_OK = {fresa: 1, torno: 1, secc: 1, sub: 1, adit: 1};
/* v26: talleres que se llevan fuera del calendario de máquinas */
const FUERA = {sub: 1, adit: 1};
const num = (v, a, b, def) => { const x = +v; return v !== '' && v != null && isFinite(x) && x >= a && x <= b ? x : def; };
const txt = (v, n) => typeof v === 'string' ? v.slice(0, n || 200) : (v == null ? '' : String(v).slice(0, n || 200));
const GR = {fresa: 'Fresadorak', torno: 'Tornoak', prod: 'Gaizka', com: 'Comercial', alm: 'Almacén', dir: 'Jon', ger: 'Ander'};
/* Dirección = Jon y Ander (gerente): los dos pueden borrar conversaciones y conectar con Teams. */
const esDir = g => g === 'dir' || g === 'ger';
const HOOK_OK = /^https:\/\/[a-z0-9.-]+\.(logic\.azure\.com|powerplatform\.com|webhook\.office\.com)(:443)?\//i;
const MAIL_OK = /^[^\s@<>"']{1,64}@[a-z0-9.-]{1,100}\.[a-z]{2,}$/i;
const GRC = {fresa: '#2E8BD8', torno: '#9C6EDD', prod: '#1A8A7D', com: '#C77A12', alm: '#B4553A', dir: '#4F6F96', ger: '#2F5D50'};
function sanear(){
  const P = PLAN;
  let maq = Array.isArray(P.maq) ? P.maq.filter(m => m && typeof m === 'object' && /^[a-z0-9]{1,12}$/.test(m.id || '')) : [];
  maq = maq.map(m => ({id: m.id, n: txt(m.n, 40) || m.id, c: MCOL_OK.test(m.c || '') ? m.c : 'm1', t: SEC_OK[m.t] ? m.t : 'fresa', cap: num(m.cap, 0, 24, 8), sab: num(m.sab, 0, 24, 0)}));
  const vistos = new Set(); P.maq = maq.filter(m => !vistos.has(m.id) && vistos.add(m.id));
  const ids = new Set(P.maq.map(m => m.id)), items = {};
  Object.entries(P.items && typeof P.items === 'object' ? P.items : {}).forEach(([k, it]) => {
    if (!it || typeof it !== 'object' || !ID_OK.test(k) || it.id !== k || !DIA_OK.test(it.d || '') || !['art','lin','libre'].includes(it.k)) return;
    const q = Math.round(+it.qty); if (!(q >= 1 && q <= 1e7)) return;
    const o = {id: k, k: it.k, m: ids.has(it.m) ? it.m : (P.maq[0] || {}).id, d: it.d, qty: q, done: !!it.done, ord: +it.ord || 0, nota: txt(it.nota, 300),
      key: it.k === 'libre' ? k : txt(it.key, 80), akey: it.k === 'libre' ? 'libre:' + k : txt(it.akey, 80), emp: it.k === 'libre' ? null : (EIDS.includes(it.emp) ? it.emp : 'caf'), ts: txt(it.ts, 30)};
    if (it.doneTs) o.doneTs = txt(it.doneTs, 30);
    if (it.prg) o.prg = 1; if (it.mat) o.mat = 1;
    if (it.h != null){ const hh = +it.h; if (hh > 0 && hh <= 500) o.h = Math.round(hh * 4) / 4; }
    if (it.k === 'libre'){ o.desc = txt(it.desc, 160) || 'Trabajo'; o.cli = txt(it.cli, 60); o.ref = txt(it.ref, 60); o.ent = DIA_OK.test(it.ent || '') ? it.ent : null;
      if (Array.isArray(it.adj)){ const a = it.adj.filter(a => a && /^[a-z0-9]{6,32}$/.test(a.id || '')).slice(0, 8).map(a => ({id: a.id, n: txt(a.n, 80) || 'fichero', t: txt(a.t, 60), s: num(a.s, 0, 2e7, 0)})); if (a.length) o.adj = a; } }
    items[k] = o; });
  P.items = items;
  const mapa = (m, f) => { const o = {}; Object.entries(m && typeof m === 'object' ? m : {}).forEach(([k, v]) => { const x = f(v); if (x != null && k.length < 120) o[k] = x; }); return o; };
  P.term = mapa(P.term, v => v && typeof v === 'object' ? {ts: txt(v.ts, 30)} : null);
  P.tipo = mapa(P.tipo, v => SEC_OK[v] ? v : null);
  P.notas = mapa(P.notas, v => typeof v === 'string' ? v.slice(0, 2000) : null);
  P.hp = mapa(P.hp, v => { const x = +v; return x > 0 && x <= 500 ? Math.round(x * 4) / 4 : null; });
  P.conf = {hdef: num(P.conf && P.conf.hdef, 0.25, 24, 2), rv: num(P.conf && P.conf.rv, 0, 99, 0)};
  P.clis = Array.isArray(P.clis) ? P.clis.filter(c => typeof c === 'string').map(c => c.slice(0, 60)).slice(0, 30) : [];
  P.reglas = Array.isArray(P.reglas) ? P.reglas.filter(g => g && typeof g === 'object').map(g => ({w: txt(g.w, 40).toUpperCase(), t: SEC_OK[g.t] ? g.t : 'torno'})).slice(0, 60) : undefined;
  if (P.tema != null && !['light','dark'].includes(P.tema)) P.tema = null;
  /* v18 · mensajes: solo campos conocidos, textos cortados; se guardan los 600 más recientes. */
  const MID = /^[a-z0-9]{6,32}$/, msg = {};
  Object.entries(P.msg && typeof P.msg === 'object' ? P.msg : {}).forEach(([k, m]) => {
    if (!m || typeof m !== 'object' || !MID.test(k) || m.id !== k || !GR[m.deg] || !GR[m.para]) return;
    const o = {id: k, de: txt(m.de, 40) || 'Alguien', deg: m.deg, para: m.para, txt: txt(m.txt, 2000), ts: txt(m.ts, 30), resp: !!m.resp, hilo: MID.test(m.hilo || '') ? m.hilo : null};
    if (m.ref && typeof m.ref === 'object' && EIDS.includes(m.ref.emp)) o.ref = {emp: m.ref.emp, key: txt(m.ref.key, 80), desc: txt(m.ref.desc, 120)};
    if (Array.isArray(m.adj)) o.adj = m.adj.filter(a => a && MID.test(a.id || '')).slice(0, 6).map(a => ({id: a.id, n: txt(a.n, 80) || 'fichero', t: txt(a.t, 60), s: num(a.s, 0, 2e7, 0)}));
    if (m.via === 'teams') o.via = 'teams'; if (m.tm) o.tm = 1;
    if (o.txt || (o.adj && o.adj.length)) msg[k] = o; });
  const ord = Object.values(msg).sort((a, b) => a.ts < b.ts ? 1 : -1).slice(0, 600); P.msg = {}; ord.forEach(m => { P.msg[m.id] = m; });
  P.mst = mapa(P.mst, v => v && typeof v === 'object' && v.c ? {c: txt(v.c, 30), por: txt(v.por, 40)} : null);
  /* v20 · Teams: dirección del flujo, agenda y clave privada para leer las respuestas. */
  const T0 = P.teams && typeof P.teams === 'object' ? P.teams : {};
  const hook = typeof T0.hook === 'string' && T0.hook.length < 2000 && HOOK_OK.test(T0.hook) ? T0.hook : '';
  const gente = (Array.isArray(T0.gente) ? T0.gente : []).filter(p => p && typeof p === 'object').map(p => ({n: txt(p.n, 40), e: MAIL_OK.test(p.e || '') ? String(p.e).toLowerCase().slice(0, 170) : '', g: GR[p.g] ? p.g : 'prod'})).filter(p => p.n || p.e).slice(0, 60);
  let pk = null; if (T0.pk && typeof T0.pk === 'object' && T0.pk.kty === 'RSA' && typeof T0.pk.n === 'string' && typeof T0.pk.d === 'string'){ pk = {}; ['kty','n','e','d','p','q','dp','dq','qi'].forEach(f => { if (typeof T0.pk[f] === 'string') pk[f] = T0.pk[f].slice(0, 2000); }); }
  P.teams = {on: !!T0.on && !!hook, hook, gente, pk, pub: !!T0.pub && !!pk};
}
function normalizarPlan(){
  sanear();
  if (!PLAN.maq || !PLAN.maq.length) PLAN.maq = MAQ0.map(m => Object.assign({}, m));
  PLAN.maq.forEach(m => { if (!m.t) m.t = m.id === 'tor' ? 'torno' : 'fresa'; });
  if (!PLAN.maq.some(m => m.t === 'torno')) PLAN.maq.push({id:'tor', n:'Tornos', c:'m4', t:'torno'});
  if (!PLAN.maq.some(m => m.t === 'secc')){ const i = PLAN.maq.findIndex(m => m.t === 'sub'); const sm = {id: PLAN.maq.some(m => m.id === 'sec') ? 'secc1' : 'sec', n:'Seccionadora', c:'m6', t:'secc'}; if (i < 0) PLAN.maq.push(sm); else PLAN.maq.splice(i, 0, sm); }
  if (!PLAN.maq.some(m => m.t === 'sub')) PLAN.maq.push({id:'sub', n:'Subcontratación', c:'m5', t:'sub'});
  PLAN.clis = PLAN.clis || [];
  /* Reglas de sección por palabra de la descripción (las pone el taller o Jon). "fresa" = no sugerir nunca otra sección. */
  if (!Array.isArray(PLAN.reglas)) PLAN.reglas = [{w: 'PLACA', t: 'fresa'}, {w: 'FTH', t: 'fresa'}];
  if ((PLAN.conf.rv || 0) < 2){ if (!PLAN.reglas.some(g => g.w === 'CASQUILLO')) PLAN.reglas.push({w: 'CASQUILLO', t: 'torno'}); PLAN.conf.rv = 2; }
  PLAN.items = PLAN.items || {}; PLAN.notas = PLAN.notas || {}; PLAN.term = PLAN.term || {}; PLAN.tipo = PLAN.tipo || {}; PLAN.msg = PLAN.msg || {}; PLAN.mst = PLAN.mst || {};
  Object.values(PLAN.items).forEach(it => { if (!it.emp && it.k !== 'libre') it.emp = 'caf'; });
}
normalizarPlan();
let historial = [];
function guardar(desc){
  PLAN.upd = new Date().toISOString();
  const ok = LS.set(KEY, JSON.stringify(PLAN));
  if (!ok) toast('No se ha podido guardar en esta tablet. Revisa que el navegador no esté en modo incógnito.');
  SYNC.local();
}
