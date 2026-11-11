/* =====================================================================
   TALLER · Bronymec — pedidos de CAF y Talgo y planificación de máquinas (fresa y torno).
   Solo lectura sobre los pedidos (vienen del panel de Jon, sin precios ni
   contratos). Lo único que se escribe es el PLAN del taller: qué artículo
   o pedido va a qué máquina y qué día, si está hecho y las notas.
   ===================================================================== */
const RAW = window.__TALLER_DATA__ || {ts:new Date().toISOString(), emp:{caf:{nombre:'CAF', lineas:[]}}};
/* v2: una o varias empresas (CAF, Talgo). Compatibilidad con el formato de una sola (CAF). */
const EMPS = RAW.emp || {caf: Object.assign({nombre:'CAF'}, RAW)};
const EIDS = Object.keys(EMPS);
let DATA = null;
const $ = id => document.getElementById(id);
const esc = s => String(s == null ? '' : s).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const _nf = new Intl.NumberFormat('es-ES');
const nf = n => { const s = _nf.format(Math.round(n || 0)); return s.replace(/^(-?\d)(\d{3})$/, '$1.$2'); };
const pd = s => { const [y,m,d] = s.split('-').map(Number); return new Date(y, m-1, d); };
const iso = d => d.getFullYear()+'-'+String(d.getMonth()+1).padStart(2,'0')+'-'+String(d.getDate()).padStart(2,'0');
const addD = (d, n) => { const x = new Date(d); x.setDate(x.getDate()+n); return x; };
const DIAS = ['domingo','lunes','martes','miércoles','jueves','viernes','sábado'];
const DC = ['D','L','M','X','J','V','S'];
const MESES = ['ene','feb','mar','abr','may','jun','jul','ago','sept','oct','nov','dic'];
const dS = d => d.getDate()+' '+MESES[d.getMonth()];
const lunes = d => { const x = new Date(d); x.setHours(0,0,0,0); x.setDate(x.getDate()-((x.getDay()+6)%7)); return x; };
let HOY = new Date(); HOY.setHours(0,0,0,0);
const semanaN = d => { const t = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate())); const dn = (t.getUTCDay()+6)%7; t.setUTCDate(t.getUTCDate()-dn+3); const f = new Date(Date.UTC(t.getUTCFullYear(),0,4)); return 1+Math.round(((t-f)/864e5-3+((f.getUTCDay()+6)%7))/7); };
const diasA = d => Math.round((d - HOY)/864e5);
/* Día de trabajo que cuenta para un plan: el sábado guarda el fin de semana entero. */
/* Día de trabajo "de hoy": en sábado y domingo la app trabaja ya sobre el lunes. */
const diaTrabajo = d => { let x = new Date(d); x.setHours(0,0,0,0); while (x.getDay() === 0 || x.getDay() === 6) x = addD(x, 1); return x; };
const slotDia = d => { const x = new Date(d); const w = x.getDay(); if (w === 0) x.setDate(x.getDate()-1); return iso(x); };

