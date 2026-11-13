/* v53 (Jon, 13/11/2026) · Fabricación es global, de toda la empresa. En la portada, el CALENDARIO DE LA EMPRESA:
   dos semanas, cada sección (Fresa, Torno, Seccionadora) y cada máquina, con las horas planificadas frente a la capacidad.
   Subcontrata y Aditiva no van (regla 8). Cada casilla se pincha y abre la Planificación de ese día en su sección. */
const CG_SEC = [['fresa', 'Fresa'], ['torno', 'Torno'], ['secc', 'Seccionadora']];
function cgDias(ms){
  const w0 = lunes(diaTrabajo(HOY)), out = [];
  for (let i = 0; i < 14; i++){ const d = addD(w0, i), w = d.getDay(); if (w === 0) continue;
    if (w === 6 && !ms.some(m => capDia(m, d) > 0 || itemsDe(m.id, iso(d)).length)) continue;
    out.push(d); }
  return out;
}
function calGlobal(){
  const ms = maqTaller(); if (!ms.length) return '';
  const dias = cgDias(ms), hoyK = iso(HOY), e0 = EIDS.length > 1 ? 'todo' : EIDS[0];
  const futuros = dias.filter(d => iso(d) >= hoyK);
  const wks = []; dias.forEach(d => { const k = iso(lunes(d)); const w = wks.find(x => x.k === k); if (w) w.n++; else wks.push({k, n: 1, d}); });
  const cols = `grid-template-columns:var(--cg-l) repeat(${dias.length}, minmax(var(--cg-c), 1fr))`;
  const celda = (grupo, d, sec, mq) => { const k = iso(d), c = carga(grupo, k), pas = k < hoyK, lv = c.n ? nivel(c) : (c.cap ? 'v' : 'x');
    const pct = c.cap ? Math.min(100, Math.round(c.p * 100)) : (c.n ? 100 : 0), quien = mq ? mq.n : TNOM[sec];
    const dTxt = DIAS[d.getDay()] + ' ' + d.getDate() + '/' + (d.getMonth() + 1);
    const t = c.n ? `${quien} · ${dTxt}: ${fmtH(c.h)} h planificadas${c.cap ? ' de ' + fmtH(c.cap) + ' h de máquina' : ''}, ${c.n} ${c.n === 1 ? 'ficha' : 'fichas'}${!c.cap ? ' · sin turno ese día' : c.p >= 1 ? ' · lleno' : ''}` : c.cap ? `${quien} · ${dTxt}: libre, ${fmtH(c.cap)} h de máquina` : `${quien} · ${dTxt}: sin turno`;
    return `<button class="cg-c ${lv}${pas ? ' pas' : ''}${k === hoyK ? ' hoy' : ''}${mq ? '' : ' tot'}" data-cg="${e0}|${sec}|${k}" style="--p:${pct}%" aria-label="${esc(t)}" title="${esc(t)}">${c.n ? `<b>${fmtH(c.h)}<small> h</small></b><em>${c.n}<span class="hide-s"> ${c.n === 1 ? 'ficha' : 'fichas'}</span></em>` : c.cap && !pas ? '<span class="lib">libre</span>' : '<span class="sin">—</span>'}<i aria-hidden="true"></i></button>`; };
  const filas = CG_SEC.map(([sec, nom]) => { const mm = ms.filter(m => m.t === sec); if (!mm.length) return '';
    let h = 0, cap = 0, llenos = 0, libres = 0; futuros.forEach(d => { const c = carga(mm, iso(d)); h += c.h; cap += c.cap; if (c.cap && c.p >= 1) llenos++; libres += Math.max(0, c.cap - c.h); });
    const oc = cap ? Math.round(h / cap * 100) : 0;
    const cab = `<div class="cg-r cg-sr ${sec}" style="${cols}"><div class="cg-n"><button class="cg-sec" data-cg="${e0}|${sec}|${iso(diaTrabajo(HOY))}" aria-label="${esc(nom)}: ${oc} % ocupado, ${fmtH(libres)} h libres; abrir su planificación"><span class="cg-sn">${esc(nom)}</span><span class="cg-ss"><b>${oc}%</b> ocupado · <b>${fmtH(libres)} h</b> libres${llenos ? ` · <b class="r">${llenos} ${llenos === 1 ? 'día lleno' : 'días llenos'}</b>` : ''}</span><span class="cg-bar" aria-hidden="true"><i style="width:${Math.min(100, oc)}%"></i></span></button></div>${dias.map(d => celda(mm, d, sec, null)).join('')}</div>`;
    const hueco = m => { for (const d of futuros){ const c = carga([m], iso(d)); if (c.cap - c.h >= 1) return {d, h: c.cap - c.h}; } return null; };
    const maqs = mm.map(m => { const hu = hueco(m); return `<div class="cg-r cg-mr ${sec}" style="${cols}"><div class="cg-n cg-mn"><i style="background:${mcol(m.id)}" aria-hidden="true"></i><span class="cg-mt"><span class="cg-ml" data-cg="${e0}|${sec}|${iso(diaTrabajo(HOY))}" role="button" tabindex="0" title="Planificación de ${esc(nom)} desde hoy">${esc(m.n)}</span>${hu ? `<small class="cg-hu" data-cg="${e0}|${sec}|${iso(hu.d)}" role="button" tabindex="0" title="Primer hueco: ${esc(DIAS[hu.d.getDay()])} ${hu.d.getDate()}, ${fmtH(hu.h)} h libres">hueco ${iso(hu.d) === hoyK ? 'hoy' : esc(DIAS[hu.d.getDay()].slice(0, 3)) + ' ' + hu.d.getDate()} · ${fmtH(hu.h)} h</small>` : '<small class="cg-hu lleno">sin hueco en dos semanas</small>'}</span></div>${dias.map(d => celda([m], d, sec, m)).join('')}</div>`; }).join('');
    return `<div class="cg-g ${sec}" role="group" aria-label="${esc(nom)}">${cab}${maqs}</div>`; }).join('');
  const sem = `<div class="cg-r cg-wk" style="${cols}"><div class="cg-n"></div>${wks.map(w => `<div class="cg-w" style="grid-column:span ${w.n}" data-cg="${e0}|todo|${iso(lunes(diaTrabajo(HOY))) === w.k ? iso(diaTrabajo(HOY)) : w.k}" role="button" tabindex="0" title="Planificación de esa semana, todas las secciones">Semana ${semanaN(w.d)}${iso(lunes(diaTrabajo(HOY))) === w.k ? ' · <b>esta</b>' : ' · siguiente'}</div>`).join('')}</div>`;
  const cabD = `<div class="cg-r cg-dh" style="${cols}"><div class="cg-n"><span class="cg-lg"><i class="g"></i>hueco<i class="a"></i>casi lleno<i class="r"></i>lleno</span></div>${dias.map(d => { const k = iso(d); return `<div class="cg-d${k === hoyK ? ' hoy' : ''}${k < hoyK ? ' pas' : ''}" data-cg="${e0}|todo|${k}" role="button" tabindex="0" title="Planificación de ese día, todas las secciones"><span>${DIAS[d.getDay()].slice(0, 3)}</span><b>${d.getDate()}</b>${k === hoyK ? '<em>hoy</em>' : ''}</div>`; }).join('')}</div>`;
  let H = 0, C = 0; futuros.forEach(d => { const c = carga(ms, iso(d)); H += c.h; C += c.cap; });
  return `<section class="cg" aria-labelledby="cg-t">
    <div class="cg-h"><div><h2 id="cg-t">Calendario de la empresa</h2><p>Horas de máquina planificadas frente a la capacidad, por sección y máquina. Toca una casilla para abrir ese día.</p></div>
      <div class="cg-k"><span data-cg="${e0}|todo|${iso(diaTrabajo(HOY))}" role="button" tabindex="0" title="Planificación de todas las secciones desde hoy"><b>${C ? Math.round(H / C * 100) : 0}%</b><em>ocupado</em></span><span data-cg="${e0}|todo|${iso(diaTrabajo(HOY))}" role="button" tabindex="0" title="Planificación de todas las secciones desde hoy"><b>${fmtH(Math.max(0, C - H))} h</b><em>libres en ${futuros.length} días</em></span></div></div>
    <div class="cg-sc"><div class="cg-t" role="group" aria-label="Calendario de la empresa por sección y máquina">${sem}${cabD}${filas}</div></div>
  </section>`;
}
function cgIr(v){
  const [e, sec, k] = String(v || '').split('|');
  if ((!EMPS[e] && e !== 'todo') || ['fresa', 'torno', 'secc', 'todo'].indexOf(sec) < 0 || !/^\d{4}-\d{2}-\d{2}$/.test(k || '')) return;
  /* v54 · 'todo' = la planificación de todas las secciones ese día (pide la clave de responsable, como Total). */
  if (sec === 'todo' && !respOk()){ pinAbrir(e, {v: 'plan', d: k}); return; }
  entrarTaller(e, sec); S.v = 'plan'; LS.set('taller.v', 'plan'); S.dia = k; S.wk = lunes(pd(k)); S.sheet = null; render(); scrollTo(0, 0);
}
/* Al abrir, el calendario enseña desde hoy (en el móvil no caben las dos semanas). */
function cgFoco(){ const sc = document.querySelector('.cg-sc'), h = document.querySelector('.cg-d.hoy'), n = document.querySelector('.cg-dh .cg-n'); if (!sc || !h || !n) return;
  const x = h.getBoundingClientRect().left - sc.getBoundingClientRect().left + sc.scrollLeft - n.getBoundingClientRect().width - 8; if (sc.scrollWidth > sc.clientWidth + 4) sc.scrollLeft = Math.max(0, x); }
