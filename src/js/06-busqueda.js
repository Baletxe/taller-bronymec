/* ---------- búsqueda ---------- */
const norm = s => String(s || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');
function casa(txt){ const q = norm(S.q).trim(); if (!q) return true; const t = norm(txt); return q.split(/\s+/).every(k => t.includes(k)); }
const txtArt = a => [a.cod, a.desc, [...a.refs].join(' '), [...a.planos].join(' '), a.ubic, a.lines.map(l => l.pedido).join(' ')].join(' ');
const txtLin = l => [l.cod, l.desc, l.ref, l.plano, l.pedido, l.planta, l.ubic].join(' ');

