/* ---------- modelo: de las líneas abiertas a lo que hay que fabricar (una vez por empresa) ---------- */
const mesK = d => d.getFullYear() + '-' + String(d.getMonth()+1).padStart(2,'0');
let MESES12 = [];
/* Los 12 meses de previsión empiezan en el mes de hoy (se recalcula si la tablet sigue abierta al cambiar de mes). */
const meses12 = () => { MESES12 = Array.from({length: 12}, (_, i) => new Date(HOY.getFullYear(), HOY.getMonth() + i, 1)); };
meses12();
const tKey = (eid, id) => eid + '|' + id;
const SECS = [['fresa','Fresa'],['torno','Torno'],['secc','Seccionadora'],['sub','Subcontrata'],['adit','Aditiva'],['todo','Todos']];
const SECN = {fresa: 'fresa', torno: 'tornos', secc: 'seccionadora', sub: 'subcontratación', adit: 'aditiva (MJF)'};
const TTAG = t => t === 'torno' ? '<span class="ttag">TORNO</span>' : t === 'secc' ? '<span class="ttag secc">SECCIONADORA</span>' : t === 'sub' ? '<span class="ttag sub">SUBCONTRATA</span>' : t === 'adit' ? '<span class="ttag adit">ADITIVA</span>' : '';
function modelo(eid){
  const D = EMPS[eid] || {lineas: []};
  const LINEAS = (D.lineas || []).map(l => { const tm = PLAN.term[tKey(eid, l.id)], term = !!tm;
    return Object.assign({}, l, {emp: eid, d: pd(l.fecha), conCod: !!l.cod && (l.cruce === 'OK' || l.cruce === 'REVISAR'), term, termTs: term && tm.ts ? tm.ts : null, falta: term ? 0 : Math.max(0, l.pend - (l.asig || 0))}); });
  const LID = Object.fromEntries(LINEAS.map(l => [l.id, l]));
  const ART = {};
  LINEAS.forEach(l => {
    const key = l.conCod ? l.cod : 'ref:' + (l.ref || l.id);
    const a = ART[key] || (ART[key] = {key, emp: eid, cod: l.conCod ? l.cod : null, desc: l.desc, refs: new Set(), planos: new Set(), lines: [], falta: 0, pend: 0, pendAll: 0, asig: 0, stock: l.stock, ubic: l.ubic, plantas: new Set(), peds: new Set(), prev: {}});
    a.lines.push(l); a.falta += l.falta; a.pendAll += l.pend; if (!l.term){ a.pend += l.pend; a.asig += (l.asig || 0); a.peds.add(l.pedido); }
    if (l.ref) a.refs.add(l.ref); if (l.plano) a.planos.add(l.plano); a.plantas.add(l.planta);
    if (l.stock != null) a.stock = l.stock; if (l.ubic) a.ubic = l.ubic;
  });
  /* Previsión (CAF: forecast de Ariba; Talgo: pedidos provisionales). Por código si cruza, si no por plano. */
  const pv = (D.prev && D.prev.items) || [];
  const porRef = {}; Object.values(ART).forEach(a => a.refs.forEach(r => { (porRef[r] = porRef[r] || []).push(a); }));
  pv.forEach(p => {
    let a = (p.cod && ART[p.cod]) || ((porRef[p.ref] || [])[0]) || null;
    if (!a){ const key = p.cod || 'ref:' + p.ref; a = ART[key] || (ART[key] = {key, emp: eid, cod: p.cod || null, desc: p.desc, refs: new Set(p.ref ? [p.ref] : []), planos: new Set(), lines: [], falta: 0, pend: 0, pendAll: 0, asig: 0, stock: null, ubic: '', plantas: new Set(), peds: new Set(), prev: {}, soloPrev: true}); }
    Object.entries(p.sem || {}).forEach(([k, v]) => { const m = k.slice(0, 7); a.prev[m] = (a.prev[m] || 0) + v; });
    if (a.stock == null && p.stock != null){ a.stock = p.stock; if (p.ubic) a.ubic = p.ubic; }
  });
  Object.values(ART).forEach(a => {
    a.lines.sort((x,y) => x.d - y.d);
    const conFalta = a.lines.filter(l => l.falta > 0), vivas = a.lines.filter(l => !l.term);
    a.first = (conFalta[0] || vivas[0] || a.lines[0] || {d: addD(HOY, 3650)}).d;
    a.late = conFalta.some(l => l.late);
    a.term = a.lines.length > 0 && vivas.length === 0;
    a.prev6 = MESES12.slice(0, 6).reduce((s, d) => s + (a.prev[mesK(d)] || 0), 0);
    a.prev3 = MESES12.slice(0, 3).reduce((s, d) => s + (a.prev[mesK(d)] || 0), 0);
    a.prevT = Object.values(a.prev).reduce((s, v) => s + v, 0);
  });
  return {eid, D, LINEAS, LID, ART, ARTS: Object.values(ART)};
}
let MOD = {}, LINEAS = [], LID = {}, ART = {}, ARTS = [];
function reconstruir(){ EIDS.forEach(e => { MOD[e] = modelo(e); }); if (cuadrar()){ guardar(); EIDS.forEach(e => { MOD[e] = modelo(e); }); } usar(S.emp); }
function usar(eid){ if (!MOD[eid]) eid = EIDS[0]; S.emp = eid; const M = MOD[eid]; LINEAS = M.LINEAS; LID = M.LID; ART = M.ART; ARTS = M.ARTS; DATA = Object.assign({ts: RAW.ts}, M.D); }
const empN = eid => (EMPS[eid] && EMPS[eid].nombre) || eid.toUpperCase();
const etag = eid => EIDS.length > 1 ? `<span class="etag ${eid}">${esc(empN(eid).toUpperCase())}</span>` : '';
function urg(d, late){ if (late || d < HOY) return 'late'; return diasA(d) <= 7 ? 'soon' : 'ok'; }
const itEmp = it => it.k === 'libre' ? null : (it.emp || 'caf');
function plCod(key, eid){ eid = eid || S.emp; let s = 0; Object.values(PLAN.items).forEach(it => { if (it.akey === key && itEmp(it) === eid) s += it.qty; }); return s; }
function plLin(id, eid){ eid = eid || S.emp; let s = 0; Object.values(PLAN.items).forEach(it => { if (it.k === 'lin' && it.key === id && itEmp(it) === eid) s += it.qty; }); return s; }
const restoArt = a => Math.max(0, a.falta - plCod(a.key, a.emp));
/* Primer día en el calendario (sin hacer) de un artículo: para decir "en el plan · lun 19". */
function planDia(key, eid){ let d = null; Object.values(PLAN.items).forEach(it => { if (it.akey === key && itEmp(it) === eid && !it.done && (!d || it.d < d)) d = it.d; }); return d ? pd(d) : null; }
const diaCorto = d => DIAS[d.getDay()].slice(0,3) + ' ' + dS(d);
const restoLin = l => Math.max(0, l.falta - plLin(l.id, l.emp));
const artDeLin = l => MOD[l.emp].ART[l.conCod ? l.cod : 'ref:' + (l.ref || l.id)];
/* Fresa o torno: cada pieza es de fresa salvo que el taller diga que es de tornos. */
/* La sección de cada pieza se recuerda (y se comparte): la próxima vez que llegue un pedido de esa pieza ya sale en su sección.
   Si la pieza es la misma (mismo código Bronymec) en CAF y en Talgo, vale lo marcado en cualquiera de las dos. */
/* Taller de cada pieza: lo decidido a mano (se recuerda para siempre por código) manda; si no, la regla por palabra
   cuya palabra sale antes en la descripción (CASQUILLO → torno, PLACA → fresa…); si no, fresa. */
const REG_ESC = s => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
/* Se usa al arrancar (antes de que exista norm): por eso es una función declarada. */
function normU(x){ return String(x || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').toUpperCase(); }
let _rg = [], _rgK = null, _rgC = {};
function reglasC(){ const k = JSON.stringify(PLAN.reglas || []); if (k !== _rgK){ _rgK = k; _rgC = {};
    _rg = (PLAN.reglas || []).map(g => { const w = normU(g.w).trim(); return w && SEC_OK[g.t] ? {w: g.w, t: g.t, re: new RegExp('(^|[^A-Z0-9])' + REG_ESC(w) + '(?=[^A-Z0-9]|$)')} : null; }).filter(Boolean); }
  return _rg; }
function reglaDe(desc){ const rs = reglasC(), k = String(desc || ''); if (k in _rgC) return _rgC[k];
  const d = ' ' + normU(k) + ' '; let best = null, bi = 1e9; rs.forEach(r => { const m = r.re.exec(d); if (m && m.index < bi){ bi = m.index; best = r; } });
  return (_rgC[k] = best); }
function origen(a){
  if (!a) return {t: 'fresa', src: 'def'};
  let t = PLAN.tipo[tKey(a.emp, a.key)]; if (!t && a.cod) for (const e of EIDS){ const x = PLAN.tipo[tKey(e, a.key)]; if (x){ t = x; break; } }
  if (t) return {t, src: 'man'};
  const r = a.desc ? reglaDe(a.desc) : null; if (r) return {t: r.t, src: 'regla', w: r.w};
  return {t: 'fresa', src: 'def'};
}
const tipoArt = a => origen(a).t;
/* Sugerencia de sección (solo aviso, nunca cambia sola):
   1) Reglas por palabra: si la descripción contiene la palabra, se sugiere esa sección ("fresa" bloquea cualquier sugerencia).
   2) Lo aprendido: si al menos 2 piezas que empiezan por la misma palabra (CASQUILLO, ARANDELA…) se han pasado a torno
      (o a subcontrata) y ninguna de esa familia se ha dejado expresamente en fresa, se sugiere lo mismo para las demás. */
const palabra1 = d => (norm(d).toUpperCase().match(/[A-Z]{3,}/) || [''])[0];
function aprendido(){
  const fam = {};
  EIDS.forEach(e => MOD[e].ARTS.forEach(a => { const t = PLAN.tipo[tKey(e, a.key)]; if (!t) return; const w = palabra1(a.desc); if (!w) return;
    const f = fam[w] || (fam[w] = {torno: 0, secc: 0, sub: 0, fresa: 0}); f[t] = (f[t] || 0) + 1; }));
  return fam;
}
let _apr = null, _aprK = '';
function tipoSug(a){
  if (!a || origen(a).src !== 'def') return null;
  const k = JSON.stringify(PLAN.tipo); if (k !== _aprK){ _apr = aprendido(); _aprK = k; }
  const w = palabra1(a.desc), f = w && _apr[w]; if (!f || f.fresa) return null;
  if ((f.secc || 0) >= 2 && f.secc >= f.torno && f.secc >= f.sub) return {t: 'secc', por: f.secc + ' ' + w.toLowerCase() + ' ya en seccionadora'};
  if (f.torno >= 2 && f.torno >= f.sub) return {t: 'torno', por: f.torno + ' ' + w.toLowerCase() + (f.torno === 1 ? '' : 's') + ' ya en tornos'};
  if (f.sub >= 2) return {t: 'sub', por: f.sub + ' ' + w.toLowerCase() + ' ya en subcontrata'};
  return null;
}
const sugHTML = a => { const s = tipoSug(a); if (!s || S.sec === s.t || !esTotal()) return ''; return `<button class="sug ${s.t === 'sub' ? 'sub' : ''}" data-sug="${esc(a.key)}" data-emp="${a.emp}" data-t="${esc(s.t)}" title="Sugerido por ${esc(s.por)}">¿${s.t === 'sub' ? 'Subcontrata' : 'Torno'}?</button>`; };
/* Talleres: fresa y torno son talleres distintos (cada operario ve el suyo); la subcontrata no tiene calendario. */
const maqTaller = () => PLAN.maq.filter(m => !FUERA[m.t]);
const maqVis = () => maqTaller().filter(m => S.sec === 'todo' || m.t === S.sec);
const secPlan = a => !!a && secOk(a) && !FUERA[tipoArt(a)];
/* Capacidad en horas: cada máquina tiene sus horas de lunes a viernes y del sábado; cada ficha, sus horas (o las de la última vez, o las de por defecto). */
const HDEF = () => (PLAN.conf && PLAN.conf.hdef) || 2;
const capDia = (m, d) => { const w = d.getDay(); if (w === 0) return 0; if (w === 6) return +m.sab || 0; return m.cap == null ? 8 : +m.cap; };
const horasIt = it => +it.h || (it.akey && +(PLAN.hp || {})[it.akey]) || HDEF();
const fmtH = x => (Math.round(x * 2) / 2).toLocaleString('es-ES');
function carga(ms, k){ const d = pd(k); let cap = 0, hh = 0, n = 0, nh = 0; ms.forEach(m => { cap += capDia(m, d); itemsDe(m.id, k).forEach(it => { hh += horasIt(it); n++; if (it.done) nh++; }); }); return {cap, h: hh, n, nh, p: cap ? hh / cap : (hh ? 9 : 0)}; }
const nivel = c => c.p >= 1 ? 'r' : c.p >= .85 ? 'a' : 'g';
const gauge = c => `<div class="gg ${nivel(c)}" title="${fmtH(c.h)} de ${fmtH(c.cap)} h de máquina${c.p >= 1 ? ' · lleno' : ' · con hueco'}"><i style="width:${Math.min(100, Math.round(c.p * 100))}%"></i><span>${fmtH(c.h)} / ${fmtH(c.cap)} h</span></div>`;
const sigla = n => { const w = String(n || '?').trim().split(/\s+/); return (w.length > 1 ? w[0][0] + w[1][0] : w[0].slice(0, 3)).toUpperCase(); };
/* Material deducido de la descripción (solo orientativo): sirve para agrupar piezas del mismo material y ahorrar cambios. */
const MATS = [[/FENOL|BAQUEL|PERTINAX|TEXTOLIT/, 'Fenólico'], [/ERTALYTE|\bPET\b|ARNITE/, 'PET'], [/POLIAMID|NYLON|ERTALON|\bPA ?6|\bPA ?66|NYLATRON/, 'Poliamida'], [/\bPA ?12|MJF/, 'MJF PA12'], [/\bPOM\b|DELRIN|ACETAL|ERTACETAL|HOSTAFORM/, 'POM'], [/TEFLON|PTFE/, 'PTFE'], [/POLIPROP|\bPP\b/, 'PP'], [/POLIETIL|\bPE-?(HD|UHMW|1000|500)|UHMW/, 'PE'], [/PEEK/, 'PEEK'], [/\bPEI\b|ULTEM/, 'PEI'], [/POLICARB|\bPC\b|MAKROLON/, 'PC'], [/\bPVC\b/, 'PVC'], [/METACRIL|PMMA|PLEXI/, 'PMMA'], [/CUSN|BRONCE|LATON/, 'Bronce'], [/FIBRA DE VIDRIO|\bFR4\b|\bG-?10\b|\bG-?11\b|GLASTECH|EPOXI|POLIESTER/, 'Composite']];
const matCache = {};
const mat = d => { const k = d || ''; if (k in matCache) return matCache[k]; const u = norm(k).toUpperCase(); const f = MATS.find(([r]) => r.test(u)); return (matCache[k] = f ? f[1] : ''); };
const matTag = d => { const m = mat(d); return m ? `<span class="mtag">${m}</span>` : ''; };
const MESL = ['enero','febrero','marzo','abril','mayo','junio','julio','agosto','septiembre','octubre','noviembre','diciembre'];
/* Una pieza de tornos nunca se queda en una máquina de fresa (ni al revés): si pasa (otra tablet, una copia vieja), va a su taller el mismo día. */
function cuadrar(){
  let n = 0;
  Object.values(PLAN.items).forEach(it => {
    const mq = PLAN.maq.find(m => m.id === it.m); if (!mq) return;
    let t;
    if (it.k === 'libre') t = FUERA[mq.t] ? 'fresa' : mq.t;
    else { const key = it.akey, e = itEmp(it), A = MOD[e] && MOD[e].ART[key]; t = tipoArt(A || {emp: e, key, cod: key && !String(key).startsWith('ref:') ? key : null}); if (FUERA[t]) return; }
    if (mq.t !== t){ const dest = PLAN.maq.find(m => m.t === t); if (dest){ it.m = dest.id; n++; } }
  });
  return n;
}
const secOk = a => S.sec === 'todo' || tipoArt(a) === S.sec;
const secLin = l => secOk(artDeLin(l));
function infoItem(it){
  if (it.k === 'libre') return {libre: true, desc: it.desc || 'Trabajo', cod: it.ref || '', ref: it.ref || '', due: it.ent ? pd(it.ent) : null, late: false, a: null, emp: null, cli: it.cli || '', term: false, sub: (it.cli || 'Otro cliente') + (it.ref ? ' · ' + it.ref : '')};
  const M = MOD[itEmp(it)]; if (!M) return null;
  if (it.k === 'lin'){ const l = M.LID[it.key]; if (!l) return null; const a = M.ART[it.akey]; return {desc: l.desc, cod: l.cod, ref: l.ref, due: l.d, late: l.late, a, l, emp: M.eid, term: l.term, sub: 'Pedido ' + l.pedido + ' L' + l.linea + ' · ' + l.planta}; }
  const a = M.ART[it.key]; if (!a) return null;
  return {desc: a.desc, cod: a.cod, ref: [...a.refs][0] || '', due: a.first, late: a.late, a, emp: M.eid, term: a.term, sub: (a.cod || 'sin código') + (a.refs.size ? ' · ' + [...a.refs].slice(0,2).join(', ') : '')};
}

