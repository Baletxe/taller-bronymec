/* ---------- clics ---------- */
document.addEventListener('click', e => {
  if (S.justDragged && Date.now() - S.justDragged < 350) return;
  const t = e.target.closest('[data-tvp],[data-tvmq],.sug,button,.brand[data-go],[data-wkpick],[data-open-art],[data-open-lin],[data-open-item],[data-close],label.btn,[data-go],[data-dia],[data-recargar],[data-riesgo],[data-lk]'); if (!t) return;
  const ds = t.dataset;
  if (ds.close){ S.sheet = null; if (S.repintar){ S.repintar = false; render(); } else pintarFicha(); return; }
  if (ds.undo){ deshacer(); return; }
  if (ds.lk){ S.sheet = null;
    if (ds.lk === 'otros'){ S.v = 'pedidos'; LS.set('taller.v', 'pedidos'); S.pf = ds.f === 'late' ? 'late' : 'todo'; render(); const o = $('otros'); if (o) o.scrollIntoView({block: 'start'}); return; }
    if (ds.lk === 'buscar'){ const w = String(ds.w || '').slice(0, 40); $('q').value = w; S.q = w; render(); return; }
    if (ds.lk === 'pq'){ const e2 = ds.e; if (!EMPS[e2]) return; if (!respOk()) pinAbrir(e2, {v: ds.v, f: ds.f}); else irDesdePortada(e2, ds.v, ds.f); return; }
    if (ds.lk === 'porplan'){ S.v = 'plan'; S.dia = null; S.big = false; LS.set('taller.big', '0'); S.blM = true; S.blf = ds.blf || 'urg'; S.wk = lunes(diaTrabajo(HOY)); render(); scrollTo(0, 0); return; }
    if (ds.lk === 'pdia'){ S.v = 'plan'; S.dia = ds.k; S.wk = lunes(pd(ds.k)); render(); scrollTo(0, 0); return; }
    if (ds.lk === 'maq'){ if (S.dia){ S.wk = lunes(pd(S.dia)); S.dia = null; } else { S.dia = diaHoy(); S.wk = lunes(pd(S.dia)); } S.keepY = true; render(); return; }
    if (ds.lk === 'ir'){ const el = $(ds.to); if (el){ el.scrollIntoView({behavior: 'smooth', block: 'start'}); el.classList.remove('flash'); void el.offsetWidth; el.classList.add('flash'); setTimeout(() => el.classList.remove('flash'), 1300); } return; }
    if (ds.lk === 'web'){ try { window.open('https://baletxe.github.io/taller-bronymec/', '_blank', 'noopener'); } catch(_){ location.href = 'https://baletxe.github.io/taller-bronymec/'; } return; }
  }
  if (ds.recargar){ if (window.__recargar) window.__recargar(); else location.reload(); return; }
  if (ds.dia){ S.dia = ds.dia; S.v = 'dia'; S.sheet = null; render(); scrollTo(0, 0); return; }
  if (ds.diaPlan){ const d = pd(ds.diaPlan); S.v = 'plan'; LS.set('taller.v', 'plan'); S.wk = lunes(d); S.foco = ds.diaPlan; S.sheet = null; render(); scrollTo(0,0); return; }
  if (ds.mth != null){ S.mth = ds.mth || null; S.mfiles = []; if (ds.mth !== 'new') S.mdraft = ''; render(); return; }
  if (ds.mf){ S.mf = ds.mf; render(); return; }
  if (ds.mpara){ S.mpara = ds.mpara; S.keepY = true; render(); return; }
  if (ds.mrefX){ S.mref = null; render(); return; }
  if (ds.mfx != null){ S.mfiles.splice(+ds.mfx, 1); render(); return; }
  if (ds.msend){ msgEnviar(ds.msend); return; }
  if (ds.mres){ const on = ds.on === '1', id = ds.mres; PLAN.mst = PLAN.mst || {}; if (on) PLAN.mst[id] = {c: new Date().toISOString(), por: (YO() || {}).n || ''}; else delete PLAN.mst[id]; guardar(); render(); toast(on ? 'Marcado como resuelto' : 'Reabierto'); return; }
  if (ds.teams){ S.tgente = null; S.tmon = tconf().on; S.sheet = {t: 'teams'}; pintarFicha(); return; }
  if (ds.tgadd){ teamsLeerForm(); S.tgente.push({n: '', e: '', g: 'prod'}); pintarFicha(); const x = document.querySelector(`[data-tn="${S.tgente.length - 1}"]`); if (x) x.focus(); return; }
  if (ds.tgdel != null){ teamsLeerForm(); S.tgente.splice(+ds.tgdel, 1); pintarFicha(); return; }
  if (ds.tmon != null){ teamsLeerForm(); S.tmon = ds.tmon === '1'; const hk = $('tmHook') ? $('tmHook').value : ''; pintarFicha(); if ($('tmHook')) $('tmHook').value = hk; return; }
  if (ds.tmsave){ teamsGuardar(); return; }
  if (ds.tmtest){ teamsPrueba(); return; }
  if (ds.mdel){ const r = (PLAN.msg || {})[ds.mdel]; if (!r || !puedeBorrarHilo(r)) return; if (!armarBorrar(t, 'h:' + r.id)) return;
    msgBorrar([r.id].concat(respuestas(r.id).map(x => x.id))); S.mth = null; render(); toast('Conversación borrada'); return; }
  if (ds.mdel1){ const m = (PLAN.msg || {})[ds.mdel1]; if (!m || !m.hilo || !esMio(m)) return; if (!armarBorrar(t, 'm:' + m.id)) return;
    msgBorrar([m.id]); S.keepY = true; render(); toast('Mensaje borrado'); return; }
  if (ds.adjOpen){ adjAbrir(ds.adjOpen, ds.n, ds.t); return; }
  if (ds.yoedit){ S.yoEdit = true; render(); return; }
  if (ds.yocancel){ S.yoEdit = false; render(); return; }
  if (ds.yog){ document.querySelectorAll('[data-yog]').forEach(b => b.setAttribute('aria-pressed', String(b === t))); return; }
  if (ds.yosave){ const n = ($('yoN') && $('yoN').value || '').trim(), b = document.querySelector('[data-yog][aria-pressed=true]'); if (!n){ toast('Pon tu nombre'); return; } if (!b){ toast('Elige tu grupo'); return; } LS.set('taller.yo', JSON.stringify({n: n.slice(0, 40), g: b.dataset.yog})); S.yoEdit = false; render(); return; }
  if (ds.msgRef){ const M = MOD[ds.emp], a = M && M.ART[ds.msgRef]; if (!a) return; S.sheet = null; S.v = 'msg'; LS.set('taller.v', 'msg'); S.mth = 'new'; S.mref = {emp: a.emp, key: a.key, desc: a.desc}; S.mdraft = ''; S.mfiles = []; render(); scrollTo(0, 0); return; }
  if (ds.wkpick){ S.pmes = null; S.sheet = {t: 'wkpick'}; pintarFicha(); return; }
  if (ds.pkmes){ const m = S.pmes || new Date((S.dia ? pd(S.dia) : S.wk).getFullYear(), (S.dia ? pd(S.dia) : S.wk).getMonth(), 1); S.pmes = new Date(m.getFullYear(), m.getMonth() + (+ds.pkmes), 1); pintarFicha(); return; }
  if (ds.pkwk){ S.wk = pd(ds.pkwk); if (S.dia){ S.dia = null; } S.sheet = null; S.pmes = null; render(); return; }
  if (ds.pkday){ S.dia = ds.pkday; S.wk = lunes(pd(S.dia)); S.sheet = null; S.pmes = null; render(); return; }
  if (ds.wkgo){ S.v = 'plan'; LS.set('taller.v', 'plan'); S.dia = null; S.wk = pd(ds.wkgo); S.sheet = null; render(); scrollTo(0,0); return; }
  if (ds.mes != null){ const n = +ds.mes, b = diaTrabajo(HOY), m0 = S.mes || new Date(b.getFullYear(), b.getMonth(), 1); S.mes = n === 0 ? null : new Date(m0.getFullYear(), m0.getMonth() + n, 1); S.keepY = true; render(); return; }
  if (ds.riesgo){ const el = $('riesgo'); if (el) el.scrollIntoView({behavior: 'smooth', block: 'start'}); return; }
  if (ds.prop){ e.stopPropagation(); S.prop = proponer(); S.sheet = {t:'prop'}; pintarFicha(); return; }
  if (ds.propOk){ const sel = [...document.querySelectorAll('[data-pi]')].filter(x => x.checked).map(x => (S.prop || [])[+x.dataset.pi]).filter(x => x && x.m);
    if (!sel.length){ toast('Marca al menos una ficha'); return; }
    cambio(sel.length + (sel.length === 1 ? ' ficha planificada' : ' fichas planificadas') + ' con la propuesta', () => sel.forEach((x, i) => { const id = uid() + i; PLAN.items[id] = {id, emp: x.a.emp, k: 'art', key: x.a.key, akey: x.a.key, m: x.m.id, d: x.k, qty: x.q, done: false, nota: '', ord: 9999, ts: new Date().toISOString()}; renumerar(x.m.id, x.k); }));
    S.sheet = null; S.prop = null; pintarFicha(); return; }
  if (ds.syncOpen){ S.sheet = {t:'ajustes'}; pintarFicha(); return; }
  if (ds.alm != null){ LS.set('taller.alm', ds.alm); if (ds.alm !== '1' && S.v === 'almacen') S.v = 'hoy'; render(); return; }
  if (ds.hd){ const i = $('fH'); if (i) i.value = Math.max(0.25, Math.round(((+i.value || 0) + (+ds.hd)) * 4) / 4); return; }
  if (ds.done && S.v === 'tv'){ tvPausa = Date.now() + 30000; }
  if (ds.pm && ds.id){ const it = PLAN.items[ds.id]; if (!it || !['prg','mat'].includes(ds.pm)) return; if (S.v === 'tv') tvPausa = Date.now() + 60000; const t = ds.pm === 'prg' ? 'Programa' : 'Material', on = !it[ds.pm];
    cambio(t + (on ? ' listo' : ' pendiente') + (on && (ds.pm === 'prg' ? it.mat : it.prg) ? ' · ficha lista para empezar' : ''), () => { if (on) it[ds.pm] = 1; else delete it[ds.pm]; }); return; }
  if (ds.done){ const it = PLAN.items[ds.done]; if (!it) return; cambio(it.done ? 'Vuelve a pendiente' : 'Hecho', () => { it.done = !it.done; it.doneTs = it.done ? new Date().toISOString() : null; }); return; }
  if (t.id === 'btnTv'){ tvEntrar(); return; }
  if (t.id === 'sync'){ S.sheet = {t:'ajustes'}; pintarFicha(); return; }
  if (ds.syncLink){ const v = ($('sLink') || {}).value || ''; SYNC.desdeEnlace(v).then(ok => { if (ok){ S.sheet = null; pintarFicha(); } }); return; }
  if (ds.syncNow){ SYNC.ahora(); toast('Sincronizando…'); return; }
  if (ds.syncAuto){ SYNC.reconectar().then(() => { pintarFicha(); render(); }); return; }
  if (ds.syncOff){ if (t.dataset.seguro){ SYNC.desconectar(); pintarFicha(); toast('Este dispositivo ya no comparte el plan (lo guardado aquí se queda)'); } else { t.dataset.seguro = '1'; t.textContent = 'Pulsa otra vez para desconectar'; } return; }
  if (ds.tvout){ tvSalir(); return; }
  if (ds.tvmq != null && S.v === 'tv'){ LS.set('taller.tvm', ds.tvmq); S.tvp = 0; tvPausa = Date.now() + 60000; render(); tvCiclo(); return; }
  if (ds.tvp != null){ S.tvp = +ds.tvp; tvPausa = Date.now() + 60000; render(); tvCiclo(); return; }
  if (ds.tvm != null){ if (ds.tvm) LS.set('taller.tvm', ds.tvm); else LS.del('taller.tvm'); tvPausa = Date.now() + 60000; render(); tvCiclo(); return; }
  if (ds.rgAdd){ PLAN.reglas.push({w: '', t: 'torno'}); guardar(); pintarFicha(); setTimeout(() => { const x = document.querySelectorAll('[data-rg-w]'); if (x.length) x[x.length-1].focus(); }, 30); return; }
  if (ds.rgDel != null){ const g = PLAN.reglas.splice(+ds.rgDel, 1)[0]; guardar(); reconstruir(); S.keepY = true; render(); if (g) toast('Regla ' + g.w + ' quitada'); return; }
  if (ds.rgt){ S.rgt = ds.rgt; document.querySelectorAll('[data-rgt]').forEach(b => b.setAttribute('aria-pressed', b === t)); return; }
  if (ds.rgNew || ds.rgSug){ const w = String(ds.rgSug || ($('rgW') || {}).value || '').trim().toUpperCase().replace(/\s+/g, ' ').slice(0, 40), tt = ds.rgSug ? ds.t : S.rgt;
    if (norm(w).replace(/[^a-z0-9]/g, '').length < 2){ toast('Escribe la palabra, por ejemplo EJE'); const i = $('rgW'); if (i) i.focus(); return; } if (!SEC_OK[tt]) return;
    const nw = norm(w).toUpperCase(), ex = PLAN.reglas.find(g => norm(g.w).toUpperCase().trim() === nw), antes = ARTS.filter(a => tipoArt(a) === tt).length;
    if (ex) ex.t = tt; else { if (PLAN.reglas.length >= 60){ toast('Ya hay 60 reglas: quita alguna antes'); return; } PLAN.reglas.push({w, t: tt}); }
    guardar(); reconstruir(); const n = ARTS.filter(a => tipoArt(a) === tt).length - antes; S.keepY = true; render();
    toast('Regla ' + w + ' → ' + TNOM[tt] + (n > 0 ? ': ' + n + (n === 1 ? ' pieza va' : ' piezas van') + ' a ' + TNOM[tt] : '')); return; }
  if (ds.clsAll){ const k = ds.clsAll, xs = talleresBase().filter(a => casa(txtArt(a))).filter(a => { const o = origen(a); return o.t === k && o.src !== 'man'; }); if (!xs.length) return;
    if (xs.length > 8 && !t.dataset.seguro){ t.dataset.seguro = '1'; t.lastChild.textContent = '¿Seguro? Pulsa otra vez'; return; }
    S.keepY = true; cambio(xs.length + (xs.length === 1 ? ' pieza confirmada' : ' piezas confirmadas') + ' en ' + TNOM[k], () => xs.forEach(a => { PLAN.tipo[tKey(a.emp, a.key)] = k; })); return; }
  if (ds.tf){ S.tf = ds.tf; S.keepY = true; render(); return; }
  if (ds.clsCsv){ const cel = c => { c = String(c == null ? '' : c); if (/^[=+\-@\t\r]/.test(c)) c = "'" + c; return /[;"\n\r]/.test(c) ? '"' + c.replace(/"/g, '""') + '"' : c; };
    const rows = [['Empresa', 'Código', 'Referencias', 'Descripción', 'Taller', 'Cómo se decidió', 'Uds en pedido']];
    EIDS.forEach(e => MOD[e].ARTS.forEach(a => { const o = origen(a); rows.push([empN(e), a.cod || '', [...a.refs].join(' '), a.desc, TNOM[o.t], o.src === 'man' ? 'Confirmada a mano' : o.src === 'regla' ? 'Regla ' + o.w : 'Sin decidir (fresa)', a.pend || 0]); }));
    const b = new Blob(['﻿' + rows.map(r => r.map(cel).join(';')).join('\r\n')], {type: 'text/csv;charset=utf-8'}); const x = document.createElement('a'); x.href = URL.createObjectURL(b); x.download = 'talleres-bronymec-' + iso(new Date()) + '.csv'; document.body.appendChild(x); x.click(); x.remove(); return; }
  if (t.id === 'btnFs'){ const on = !FS.on(); LS.set('taller.fs', on ? '1' : '0'); if (on) FS.entrar(); else FS.salir(); return; }
  if (ds.inst){ INST.lanzar().then(ok => { if (!ok){ S.sheet = {t:'inst'}; pintarFicha(); } }); return; }
  if (ds.instNo){ LS.set('taller.inst.no', '1'); render(); return; }
  if (ds.libreRep){ const r = PLAN.items[ds.libreRep]; if (r){ $('lD').value = r.desc || ''; $('lC').value = r.cli || ''; $('lR').value = r.ref || ''; $('fQ').value = r.qty || 1; $('fN').value = r.nota || ''; if ($('fH') && r.h) $('fH').value = r.h; $('fQ').focus(); $('fQ').select(); } return; }
  if (ds.libreDup){ const r = PLAN.items[ds.libreDup]; if (!r) return; let n = addD(pd(r.d), 1); while (n.getDay() === 0) n = addD(n, 1); S.libreBase = r.id; S.sheet = {t:'libre', key: null, pre: r.m + '|' + iso(n)}; pintarFicha(); toast('Copia lista: cambia lo que haga falta y añádela'); return; }
  if (ds.librePeg){ const P = leerPegado($('lP').value), m = $('fM').value, d = $('fD').value;
    if (!P.ok.length){ toast(P.mal.length ? 'Ninguna fila se entiende: ' + P.mal.slice(0, 3).map(x => 'fila ' + x.n + ', ' + x.por).join('; ') : 'Pega primero las filas de Excel'); return; }
    cambio('Añadidos ' + P.ok.length + ' trabajos en ' + maqDe(m).n + ', ' + etiquetaDia(d) + (P.mal.length ? ' · sin añadir: ' + P.mal.map(x => 'fila ' + x.n + ' (' + x.por + ')').join(', ') : ''), () => {
      P.ok.forEach(v => { const id = nuevo('libre', null, m, d, v.qty); Object.assign(PLAN.items[id], v, {emp: null, key: id, akey: 'libre:' + id}); if (v.cli && PLAN.clis.indexOf(v.cli) < 0){ PLAN.clis.unshift(v.cli); PLAN.clis = PLAN.clis.slice(0, 30); } }); });
    S.sheet = null; pintarFicha(); return; }
  if (ds.libreNew != null){ e.stopPropagation(); S.sheet = {t:'libre', key: null, pre: ds.libreNew}; pintarFicha(); return; }
  if (ds.libreSave != null){ const desc = $('lD').value.trim(); if (!desc){ $('lD').focus(); toast('Escribe qué hay que hacer'); return; }
    const v = {desc, cli: $('lC').value.trim(), ref: $('lR').value.trim(), qty: Math.max(1, Math.round(+$('fQ').value || 1)), ent: $('lE').value || null, nota: $('fN').value.trim()}, m = $('fM').value, d = $('fD').value; { const hh = +(($('fH') || {}).value); if (hh > 0 && hh <= 500) v.h = Math.round(hh * 4) / 4; }
    if (v.cli && PLAN.clis.indexOf(v.cli) < 0){ PLAN.clis.unshift(v.cli); PLAN.clis = PLAN.clis.slice(0, 30); }
    const old = ds.libreSave && PLAN.items[ds.libreSave];
    cambio(old ? 'Guardado' : 'Añadido: ' + desc + ' · ' + maqDe(m).n + ', ' + etiquetaDia(d), () => {
      if (old){ Object.assign(old, v); if (old.m !== m || old.d !== d) mover(old.id, m, d); }
      else { const id = nuevo('libre', null, m, d, v.qty); Object.assign(PLAN.items[id], v, {emp: null, key: id, akey: 'libre:' + id}); }
    }); S.sheet = null; pintarFicha(); return; }
  if (ds.pfs){ planFs(!S.pfs); return; }
  if (ds.pmas){ S.pmas = !S.pmas; S.keepY = true; render(); return; }
  if (ds.big){ S.pmas = false; if (S.dia){ S.diaB = !S.diaB; } else if (esMov()){ S.blM = !S.blM; } else { S.big = !S.big; LS.set('taller.big', S.big ? '1' : '0'); } S.keepY = true; render(); return; }
  if (ds.z){ S.z = ds.z; LS.set('taller.z', S.z); S.keepY = true; render(); return; }
  if (ds.wk2 != null){ S.pmas = false; if (S.dia){ S.wk = lunes(pd(S.dia)); S.dia = null; } S.wk2 = ds.wk2 === '1'; LS.set('taller.wk2', S.wk2 ? '1' : '0'); S.keepY = true; render(); return; }
  if (ds.pday){ S.pmas = false; S.dia = ds.pday === 'man' ? diaManana() : diaHoy(); S.wk = lunes(pd(S.dia)); S.keepY = true; render(); return; }
  if (ds.pnav){ S.pmas = false; S.dia = iso(diaMover(pd(S.dia), +ds.pnav)); S.wk = lunes(pd(S.dia)); S.keepY = true; render(); return; }
  if (ds.lote){ const i = $('fQ'); if (i) i.value = ds.lote; t.parentElement.querySelectorAll('.lote').forEach(b => b.setAttribute('aria-pressed', String(b === t))); return; }
  if (ds.empSel){ try { sessionStorage.setItem('taller.elegido', '1'); } catch(_){} S.emp = ds.empSel; LS.set('taller.emp', S.emp); if (S.v === 'elegir') LS.set('taller.v', 'hoy'); usar(S.emp); if (S.v === 'elegir') S.v = 'hoy'; S.sheet = null; render(); scrollTo(0,0); return; }
  if (ds.sec){ return; }
  if (ds.pqp){ if (EMPS[ds.pqp] && esGerencia()) abrirPanel(ds.pqp); return; }
  if (ds.pnlx){ cerrarPanel(true); return; }
  if (ds.pick){ const [e2, t2] = ds.pick.split('|'); if (!EMPS[e2] || ['fresa','torno','secc','todo'].indexOf(t2) < 0) return; if (t2 === 'todo' && !respOk()) pinAbrir(e2); else entrarTaller(e2, t2); return; }
  if (ds.pinR){ if (PIN){ PIN.r = !PIN.r; pinPintar(false); } return; }
  if (ds.respOlv){ LS.set(RESP_K, '0'); render(); return; }
  if (ds.pinK != null){ pinTecla(ds.pinK); return; }
  if (ds.pinX){ pinCerrar(); return; }
  if (ds.planArt){ e.stopPropagation(); const q = ds.qty && $('fQ') ? Math.max(1, Math.round(+$('fQ').value || 0)) : 0; const m = ds.qty && $('pM') ? $('pM').value : null, d = ds.qty && $('pD') ? $('pD').value : null; S.sheet = null; planificarRapido('art', ds.planArt, q, m, d); return; }
  if (ds.termLin){ const k = tKey(ds.emp, ds.termLin), on = !PLAN.term[k]; cambio(on ? 'Terminado: sale del tablero del taller' : 'Vuelve a pendiente', () => { if (on) PLAN.term[k] = {ts: new Date().toISOString()}; else delete PLAN.term[k]; }); return; }
  if (ds.termArt || ds.untermArt){ const M = MOD[ds.emp], a = M && M.ART[ds.termArt || ds.untermArt]; if (!a) return; const on = !!ds.termArt;
    cambio(on ? 'Terminado: ' + a.desc + ' sale del tablero' : 'Vuelve a pendiente: ' + a.desc, () => { a.lines.forEach(l => { const k = tKey(a.emp, l.id); if (on) PLAN.term[k] = {ts: new Date().toISOString()}; else delete PLAN.term[k]; }); }); if (on){ S.sheet = null; } return; }
  if (ds.sug){ e.stopPropagation(); ds.tipoSet = ds.t; ds.key = ds.sug; }
  if (ds.tipoSet){ if (!esTotal()){ toast('El taller de cada pieza lo decide el responsable (Total)'); return; } const M = MOD[ds.emp], a = M && M.ART[ds.key]; if (!a || !SEC_OK[ds.tipoSet]) return; ponerTipo(a, ds.tipoSet); return; }
  if (ds.planLin){ S.sheet = null; planificarRapido('lin', ds.planLin); return; }
  if (ds.go){ S.v = ds.go; LS.set('taller.v', S.v); if (ds.pf) S.pf = ds.pf; if (ds.af) S.af = ds.af; if (ds.blf) S.blf = ds.blf; S.sheet = null; render(); scrollTo(0,0); return; }
  if (ds.bl){ S.bl = ds.bl; render(); return; }
  if (ds.blf){ S.blf = ds.blf; render(); return; }
  if (ds.pf){ S.pf = ds.pf; render(); return; }
  if (ds.of){ S.v = 'ofi'; LS.set('taller.v', 'ofi'); S.of = ds.of; LS.set('taller.of', ds.of); if (ds.vf) S.vf = ds.vf; S.sheet = null; render(); scrollTo(0, 0); return; }
  if (ds.vf){ S.vf = ds.vf; S.keepY = true; render(); return; }
  if (ds.af){ S.af = ds.af; render(); return; }
  if (ds.wk){ const n = +ds.wk; S.wk = n === 0 ? lunes(diaTrabajo(HOY)) : addD(S.wk, 7*n); S.keepY = true; render(); return; }
  if (ds.traer){ const hoyS = iso(diaTrabajo(HOY)); const ps = Object.values(PLAN.items).filter(it => !it.done && pd(it.d) < HOY && it.d !== hoyS);
    cambio(ps.length + ' fichas pasadas a hoy', () => ps.forEach(it => mover(it.id, it.m, hoyS))); return; }
  if (ds.print){ imprimir(ds.print); return; }
  if (ds.openItem){ S.sheet = {t:'item', key: ds.openItem}; pintarFicha(); return; }
  if (ds.openArt){ S.sheet = {t:'art', key: ds.openArt, emp: S.emp}; pintarFicha(); return; }
  if (ds.openLin){ if (ds.emp && ds.emp !== S.emp && MOD[ds.emp]) usar(ds.emp); S.sheet = {t:'lin', key: ds.openLin}; pintarFicha(); return; }
  if (ds.qd){ const i = $('fQ'); i.value = Math.max(1, (+i.value || 0) + (+ds.qd)); return; }
  if (ds.save){ const it = PLAN.items[ds.save]; const m = $('fM').value, d = $('fD').value, q = Math.max(1, Math.round(+$('fQ').value || it.qty)), n = $('fN').value.trim();
    const hh = +(($('fH') || {}).value); cambio('Guardado', () => { if (it.m !== m || it.d !== d) mover(it.id, m, d); it.qty = q; it.nota = n; if (hh > 0 && hh <= 500){ it.h = Math.round(hh * 4) / 4; if (it.k !== 'libre' && it.akey) PLAN.hp[it.akey] = it.h; } }); S.sheet = null; pintarFicha(); return; }
  if (ds.split){ const it = PLAN.items[ds.split]; if (it.qty < 2){ toast('Con 1 unidad no se puede partir'); return; } const mitad = Math.floor(it.qty/2);
    cambio('Partida en dos: ' + nf(it.qty - mitad) + ' + ' + nf(mitad) + ' uds (la segunda, al día siguiente)', () => { it.qty -= mitad; const d = pd(it.d); let n = addD(d, 1); if (n.getDay() === 0) n = addD(n, 1); const id = nuevo(it.k, it.key, it.m, iso(n), mitad); const nw = PLAN.items[id]; nw.akey = it.akey; nw.emp = itEmp(it); if (it.k === 'libre'){ Object.assign(nw, {desc: it.desc, cli: it.cli, ref: it.ref, ent: it.ent, nota: it.nota, key: id, akey: 'libre:' + id, emp: null}); if (it.adj) nw.adj = it.adj.map(a => Object.assign({}, a)); } }); S.sheet = null; pintarFicha(); return; }
  if (ds.quitar){ const adj0 = ((PLAN.items[ds.quitar] || {}).adj || []).map(a => a.id); cambio('Quitado del calendario', () => { delete PLAN.items[ds.quitar]; }); adjHuerfanos(adj0); S.sheet = null; pintarFicha(); return; }
  if (ds.ladjX){ const [iid, aid] = ds.ladjX.split('|'), it = PLAN.items[iid]; if (!it) return;
    cambio('Adjunto quitado', () => { it.adj = (it.adj || []).filter(a => a.id !== aid); if (!it.adj.length) delete it.adj; }); adjHuerfanos([aid]); S.sheet = {t: 'libre', key: iid}; pintarFicha(); return; }
  if (t.id === 'btnQ'){ const top = document.querySelector('.top'), q = $('q'), abre = !top.classList.contains('qopen');
    if (!abre && q.value){ q.value = ''; S.q = ''; render(); }
    top.classList.toggle('qopen', abre); t.setAttribute('aria-pressed', abre); alto(); if (abre) q.focus(); return; }
  if (t.id === 'btnSet'){ S.sheet = {t:'ajustes'}; pintarFicha(); return; }
  if (t.id === 'btnPrint'){ imprimir(S.v === 'hoy' ? 'hoy' : 'semana'); return; }
  if (ds.wake){ LS.set('taller.wake', ds.wake); despierta(); pintarFicha(); toast(ds.wake === '1' ? 'La pantalla no se apagará mientras la app esté abierta' : 'La pantalla se apagará como siempre'); return; }
  if (ds.tema){ PLAN.tema = ds.tema === 'auto' ? null : ds.tema; tema(PLAN.tema); guardar(); pintarFicha(); return; }
  if (ds.export){ const b = new Blob([JSON.stringify(PLAN, null, 1)], {type:'application/json'}); const a = document.createElement('a'); a.href = URL.createObjectURL(b); a.download = 'plan-taller-' + iso(new Date()) + '.json'; document.body.appendChild(a); a.click(); a.remove(); return; }
  if (ds.borrar){ if (t.dataset.seguro){ cambio('Calendario vaciado', () => { PLAN.items = {}; }); S.sheet = null; pintarFicha(); } else { t.dataset.seguro = '1'; t.textContent = 'Pulsa otra vez para vaciarlo todo'; } return; }
});
document.addEventListener('input', e => { if (e.target.id === 'mtx') S.mdraft = e.target.value; if (e.target.id === 'mresp') S.mresp = e.target.checked; });
/* Fase 2 · planos y fotos de los otros trabajos: cifrados como los adjuntos de los mensajes (adj/<id> del repo del plan). */
function adjHuerfanos(ids){ ids.forEach(id => { const usado = Object.values(PLAN.items).some(x => (x.adj || []).some(a => a.id === id)) || Object.values(PLAN.msg || {}).some(m => (m.adj || []).some(a => a.id === id)); if (!usado){ delete ADJ[id]; SYNC.borrarAdj(id); } }); }
async function libreAdjuntar(iid, files){
  const it = PLAN.items[iid]; if (!it || !files.length) return;
  if (!SYNC.on){ toast('Para adjuntar ficheros la tablet tiene que estar conectada al plan compartido'); return; }
  const libres = 8 - (it.adj || []).length; if (files.length > libres) toast('Caben ' + libres + ' adjuntos más en este trabajo');
  const nuevos = [];
  try {
    for (const f of files.slice(0, Math.max(0, libres))){ if (f.size > 25e6) throw new Error('grande'); toast('Subiendo ' + f.name + '…'); const p = await prepFichero(f); if (p.bytes.length > 10e6) throw new Error('grande');
      const id = msgId(); await SYNC.subirAdj(id, p.bytes); nuevos.push({id, n: p.n, t: p.t, s: p.bytes.length}); }
  } catch(e){ toast(String(e && e.message) === 'grande' ? 'Ese fichero pasa de 10 MB incluso comprimido' : 'No se ha podido subir el adjunto. Revisa la conexión y vuelve a probar.'); }
  if (!nuevos.length) return;
  const it2 = PLAN.items[iid]; if (!it2){ adjHuerfanos(nuevos.map(a => a.id)); return; }
  cambio(nuevos.length === 1 ? 'Adjuntado: ' + nuevos[0].n : 'Adjuntados ' + nuevos.length + ' ficheros', () => { it2.adj = (it2.adj || []).concat(nuevos).slice(0, 8); });
  S.sheet = {t: 'libre', key: iid}; pintarFicha();
}
document.addEventListener('change', e => { if (e.target.id === 'lfile' && e.target.files){ libreAdjuntar(e.target.dataset.item, [...e.target.files]); return; } if (e.target.id === 'mresp') S.mresp = e.target.checked; if (e.target.id === 'mfile' && e.target.files){ S.mfiles = S.mfiles.concat([...e.target.files]).slice(0, 6); S.mdraft = $('mtx') ? $('mtx').value : S.mdraft; render(); } });
document.addEventListener('keydown', e => {
  if (e.key === 'Enter' && !e.shiftKey && e.target.id === 'mtx' && matchMedia('(pointer:fine)').matches){ e.preventDefault(); const b = document.querySelector('[data-msend]'); if (b) b.click(); return; }
  if (e.key === 'Enter' && e.target.id === 'rgW'){ e.preventDefault(); const b = document.querySelector('[data-rg-new]'); if (b) b.click(); return; }
  if (e.key === 'Escape' && S.drag){ cancelarDrag(); pd0 = null; return; }
  if (e.key === 'Escape' && S.sheet){ S.sheet = null; pintarFicha(); }
  else if (e.key === 'Escape' && S.v === 'tv'){ tvSalir(); }
  if ((e.key === 'Enter' || e.key === ' ') && e.target.matches && e.target.matches('[role=button]:not(button),[data-anid]') && !e.target.closest('.sheet input,.sheet textarea')){ e.preventDefault(); e.target.click(); }
  if ((e.ctrlKey || e.metaKey) && e.key === 'z' && !/INPUT|TEXTAREA/.test(e.target.tagName)){ e.preventDefault(); deshacer(); }
  if (e.key === 'Enter' && e.target.id === 'q') e.target.blur(); /* en la tablet, cierra el teclado para ver los resultados */
  if (e.key === '/' && !/INPUT|TEXTAREA|SELECT/.test(e.target.tagName) && !S.sheet){ e.preventDefault(); const b = $('btnQ'); if (getComputedStyle(b).display !== 'none' && !document.querySelector('.top.qopen')) b.click(); else $('q').focus(); }
});
let qt; $('q').addEventListener('input', e => { S.q = e.target.value; clearTimeout(qt); qt = setTimeout(() => { if (S.v === 'hoy' || S.v === 'elegir'){ S.v = 'articulos'; S.af = 'todo'; } render(); }, 160); });
document.addEventListener('change', e => {
  if (e.target.id === 'imp' && e.target.files[0]){ e.target.files[0].text().then(t => { try { const p = JSON.parse(t); if (p.v !== 1 || !p.items) throw 0; cambio('Copia cargada: ' + Object.keys(p.items).length + ' fichas', () => { PLAN.items = p.items; PLAN.notas = p.notas || {}; PLAN.term = p.term || {}; PLAN.tipo = p.tipo || {}; if (p.maq) PLAN.maq = p.maq; normalizarPlan(); }); S.sheet = null; pintarFicha(); } catch(_){ toast('Ese fichero no es una copia del plan del taller'); } }); }
  if (e.target.dataset && (e.target.dataset.rgW != null || e.target.dataset.rgT != null)){ const i = +(e.target.dataset.rgW != null ? e.target.dataset.rgW : e.target.dataset.rgT); const g = PLAN.reglas[i]; if (!g) return;
    if (e.target.dataset.rgW != null) g.w = e.target.value.trim().toUpperCase(); else g.t = e.target.value; guardar(); S.keepY = true; const sh = S.sheet; render(); S.sheet = sh; return; }
  if (e.target.dataset && (e.target.dataset.cap || e.target.dataset.sab || e.target.dataset.hdef)){ const v = +e.target.value; if (!(v >= 0 && v <= 24)) return;
    if (e.target.dataset.hdef) PLAN.conf.hdef = Math.max(0.25, v); else { const m = PLAN.maq.find(x => x.id === (e.target.dataset.cap || e.target.dataset.sab)); if (!m) return; if (e.target.dataset.cap) m.cap = v; else m.sab = v; }
    guardar(); S.keepY = true; render(); return; }
  if (e.target.dataset && e.target.dataset.maq){ const m = PLAN.maq.find(x => x.id === e.target.dataset.maq); if (m && e.target.value.trim()){ m.n = e.target.value.trim(); guardar(); render(); } }
});
document.addEventListener('input', e => { if (e.target.dataset && e.target.dataset.nota != null){ const k = e.target.dataset.nota; const v = e.target.value; if (v.trim()) PLAN.notas[k] = v; else delete PLAN.notas[k]; clearTimeout(e.target._t); e.target._t = setTimeout(guardar, 500); } });

