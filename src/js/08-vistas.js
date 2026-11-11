/* ---------- vistas ---------- */
function itemsDe(m, d){ return Object.values(PLAN.items).filter(it => it.m === m && it.d === d).sort((a,b) => (a.ord||0) - (b.ord||0)); }
function diasSemana(){ const L = S.wk; return [0,1,2,3,4,5].map(i => addD(L, i)); }


