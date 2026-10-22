#!/usr/bin/env python3
"""Panel de control dentro de la app (kit v37, 22/10/2026).

Uso:  python3 -I panel_build.py EMP PANEL.html DB_DIR SALIDA.html

EMP         caf | talgo
PANEL.html  el index.html publicado del panel (Artifact read), con o sin el esqueleto.
DB_DIR      <coleccion>/<id>.json de la base de datos de ese panel.

[Jon, 22/10/2026: "no quiero que sea enlace"; "la misma aplicación, con las dos opciones"; protegido con la clave de
Total; "consultar y marcar enviado".] Saca el MISMO código del panel con los datos de su base de datos dentro, para
abrirlo a pantalla completa dentro de la app (panel.html de la web, cifrado con la contraseña del taller y detrás de la
clave de responsable). Se puede consultar todo y escribir SOLO marcas (enviado, parcial, preparado, incidencia, nota…):
cada marca se guarda en este aparato (localStorage panel.cola.v1), se ve al momento en el panel y la app la sube al plan
compartido (taller-plan/panel-cambios.json); la pasada horaria de Claude la escribe en la base de datos del panel de
verdad. El resto de escrituras (precios, decisiones, cruces…) no se hacen aquí: el panel avisa de que es solo lectura.
"""
import json, os, sys, re, collections

a = sys.argv[1:]
if len(a) < 4:
    sys.exit(__doc__)
emp, src, dbdir, out = a[0], a[1], a[2], a[3]
COLS = {
    'caf': ['marcas', 'decisiones', 'precios', 'fc_cruces', 'pedidos_extra', 'fechas', 'fc_snap', 'export_snap', 'precios_rev', 'taller', 'terminadas'],
    'talgo': ['marcas', 'revisados', 'centros', 'pendientes', 'foto_snap'],
}
CRIT = {'caf': ['marcas', 'precios', 'pedidos_extra'], 'talgo': ['marcas']}
if emp not in COLS:
    sys.exit('EMP tiene que ser caf o talgo')

html = open(src, encoding='utf-8').read()
m = re.search(r'<title>[^<]*</title>', html)
if not m:
    sys.exit('No encuentro el <title> del panel')
frag = html[m.start():]
j = frag.rfind('</body></html>')
if j > 0 and j > len(frag) - 40:
    frag = frag[:j]
for need in ['window.claude.use', 'id="main"']:
    if need not in frag:
        sys.exit('El panel no trae ' + need)
# Fuentes: nada de Google dentro de la app (la web solo carga lo suyo); Archivo va en la propia web.
frag = re.sub(r'<link[^>]+fonts\.(googleapis|gstatic)\.com[^>]*>\s*', '', frag)
# Los iconos de instalación del panel no pintan nada dentro de la app
frag = re.sub(r'<link rel="(manifest|icon|apple-touch-icon)"[^>]*>\s*', '', frag)

dump, cuenta = {}, {}
for c in COLS[emp]:
    d = os.path.join(dbdir, c)
    dump[c] = {}
    if os.path.isdir(d):
        for f in sorted(os.listdir(d)):
            if f.endswith('.json'):
                try:
                    dump[c][f[:-5]] = json.load(open(os.path.join(d, f), encoding='utf-8'))
                except Exception:
                    pass
    cuenta[c] = len(dump[c])
for c in CRIT[emp]:
    if cuenta[c] == 0:
        sys.exit('La colección %s ha llegado vacía: no se genera el panel (daría cifras falsas)' % c)

# Quien marca desde la app es Jon: el uid que más aparece en las marcas
pors = collections.Counter(v.get('por') for v in dump['marcas'].values() if isinstance(v, dict) and v.get('por'))
uid = pors.most_common(1)[0][0] if pors else 'jon'
ts = None
try:
    ts = json.load(open(os.path.join(os.path.dirname(os.path.abspath(out)), '_ts.json')))['ts']
except Exception:
    import datetime
    ts = datetime.datetime.now(datetime.timezone.utc).isoformat(timespec='seconds')

def js(o):
    return json.dumps(o, ensure_ascii=False, separators=(',', ':')).replace('</', '<\\/')

SHIM = r'''<style>@font-face{font-family:'Archivo';src:url(archivo.woff2) format('woff2');font-weight:100 900;font-stretch:62% 125%;font-display:swap}</style>
<script>
window.__PANEL__ = @@META@@;
window.__DUMP__ = @@DUMP@@;
(function(){
  var M = window.__PANEL__, D = window.__DUMP__, EMP = M.emp, UID = M.uid, QK = 'panel.cola.v1';
  var ESCRIBE = {marcas: 1}, CALLA = {export_snap: 1, fc_snap: 1, foto_snap: 1};
  function cola(){ try { var q = JSON.parse(localStorage.getItem(QK) || '[]'); return Array.isArray(q) ? q : []; } catch(_){ return []; } }
  function guardar(q){ try { localStorage.setItem(QK, JSON.stringify(q)); } catch(_){} }
  function igual(a, b){ return JSON.stringify(a) === JSON.stringify(b); }
  /* Lo que ya trae la base de datos se quita de la cola (la pasada horaria lo escribió) */
  (function podar(){ var q = cola(), n = q.length; q = q.filter(function(x){
      if (x.emp !== EMP) return true;
      var cur = (D[x.col] || {})[x.doc];
      if (x.op === 'delete') return !!cur && !(cur.ts && x.data && cur.ts > x.ts);
      return !(cur && (igual(cur, x.data) || (cur.ts && x.data && x.data.ts && cur.ts >= x.data.ts)));
    }); if (q.length !== n) guardar(q); })();
  function aplicar(){ cola().forEach(function(x){ if (x.emp !== EMP) return; D[x.col] = D[x.col] || {};
    if (x.op === 'delete') delete D[x.col][x.doc]; else D[x.col][x.doc] = x.data; }); }
  aplicar();
  var subs = {};
  function snap(c){ var m = D[c] || {}, ids = Object.keys(m);
    return { docs: ids.map(function(id){ return { id: id, exists: true, data: function(){ return JSON.parse(JSON.stringify(m[id])); } }; }), size: ids.length, empty: !ids.length }; }
  function avisar(c){ (subs[c] || []).forEach(function(f){ try { f(snap(c)); } catch(_){} });
    try { parent.postMessage({t: 'bm-panel-cola', n: cola().length}, location.origin); } catch(_){}
    try { window.dispatchEvent(new Event('bm-cola')); } catch(_){} }
  function escribir(c, id, op, data){
    var q = cola().filter(function(x){ return !(x.emp === EMP && x.col === c && x.doc === id); });
    q.push({emp: EMP, col: c, doc: id, op: op, data: op === 'delete' ? null : data, ts: new Date().toISOString(), k: Math.random().toString(36).slice(2, 10)});
    guardar(q); D[c] = D[c] || {}; if (op === 'delete') delete D[c][id]; else D[c][id] = data; avisar(c); return Promise.resolve();
  }
  function no(){ return Promise.reject(Object.assign(new Error('solo lectura'), {code: 'invalid_argument'})); }
  function limpio(o){ return JSON.parse(JSON.stringify(o || {})); }
  var db = {
    collection: function(c){ return {
      onSnapshot: function(ok){ (subs[c] = subs[c] || []).push(ok); setTimeout(function(){ ok(snap(c)); }, 0);
        return function(){ subs[c] = (subs[c] || []).filter(function(f){ return f !== ok; }); }; },
      get: function(){ return Promise.resolve(snap(c)); } }; },
    doc: function(path){ var p = path.split('/'), c = p[0], id = p.slice(1).join('/');
      function cur(){ return (D[c] || {})[id]; }
      return {
        set: function(data, o){ if (CALLA[c]) return Promise.resolve(); if (!ESCRIBE[c]) return no();
          var v = limpio(data); if (o && o.merge && cur()) v = Object.assign(limpio(cur()), v); return escribir(c, id, 'set', v); },
        update: function(data){ if (CALLA[c]) return Promise.resolve(); if (!ESCRIBE[c]) return no();
          return escribir(c, id, 'set', Object.assign(limpio(cur()), limpio(data))); },
        delete: function(){ if (CALLA[c]) return Promise.resolve(); if (!ESCRIBE[c]) return no(); return escribir(c, id, 'delete', null); },
        get: function(){ var d = cur(); return Promise.resolve({ id: id, exists: !!d, data: function(){ return d; } }); },
        onSnapshot: function(ok){ setTimeout(function(){ var d = cur(); ok({ id: id, exists: !!d, data: function(){ return d; } }); }, 0); return function(){}; } }; }
  };
  var user = { me: function(){ return Promise.resolve({ id: UID, name: 'Jon' }); }, can: function(){ return Promise.resolve(true); },
    profiles: function(ids){ var o = {}; (ids || []).forEach(function(i){ o[i] = { name: i === UID ? 'Jon' : 'Alguien del equipo', isMe: i === UID, isGuest: false }; }); return Promise.resolve(o); } };
  window.claude = { use: function(k){ return Promise.resolve(k === 'db' ? db : k === 'user' ? user : null); } };
})();
</script>'''

APP = r'''<style>
#nubeBtn{display:none!important}
.bmp-pill{display:inline-flex;align-items:center;gap:8px;height:46px;padding:0 14px;border-radius:12px;border:1px solid var(--line-2);background:var(--surface);color:var(--ink-2);font-size:13.5px;font-weight:650;white-space:nowrap}
.bmp-pill i{width:9px;height:9px;border-radius:50%;background:var(--ok,#1E8E4E)}
.bmp-pill.old i{background:var(--warn,#C98A16)}.bmp-pill.old{color:var(--warn,#9a6200)}
.bmp-pill b{color:var(--warn,#B4660A);font-weight:750}
@media (max-width:640px){.bmp-pill{height:40px;padding:0 10px;font-size:12px}.bmp-pill small{display:none}}
</style>
<script>
(function(){
  var M = window.__PANEL__, t = new Date(M.ts);
  function hm(d){ return d.toLocaleTimeString('es-ES', {hour:'2-digit', minute:'2-digit'}); }
  function dia(d){ var h = new Date(); h.setHours(0,0,0,0); var x = new Date(d); x.setHours(0,0,0,0);
    var n = Math.round((h - x) / 864e5); return n === 0 ? 'hoy' : n === 1 ? 'ayer' : d.toLocaleDateString('es-ES', {day:'numeric', month:'short'}); }
  function pend(){ try { return (JSON.parse(localStorage.getItem('panel.cola.v1') || '[]') || []).filter(function(x){ return x.emp === M.emp; }).length; } catch(_){ return 0; } }
  function pill(){
    var tools = document.querySelector('.hd .tools'); if (!tools) return;
    var el = document.getElementById('bmpPill');
    if (!el){ el = document.createElement('span'); el.id = 'bmpPill'; tools.insertBefore(el, tools.firstChild); }
    var old = (Date.now() - t) / 36e5 > 26, n = pend();
    el.className = 'bmp-pill' + (old ? ' old' : '');
    el.title = 'Datos del panel del ' + t.toLocaleString('es-ES') + '. Se renuevan cada hora.' + (n ? ' ' + n + ' marcas tuyas se están subiendo: entran en el panel en la próxima pasada horaria.' : '');
    el.innerHTML = '<i></i>' + (dia(t) === 'hoy' ? 'Datos de las ' + hm(t) : 'Datos de ' + dia(t) + ', ' + hm(t)) + (n ? ' · <b>' + n + ' por subir</b>' : '<small>&nbsp;· se renuevan cada hora</small>');
  }
  var rb = document.getElementById('refreshBtn');
  if (rb) rb.addEventListener('click', function(e){ e.stopImmediatePropagation(); e.preventDefault(); location.reload(); }, true);
  addEventListener('bm-cola', pill);
  setInterval(pill, 30000);
  new MutationObserver(function(){ if (!document.getElementById('bmpPill')) pill(); }).observe(document.body, {childList: true, subtree: true});
  pill();
})();
</script>'''

meta = {'emp': emp, 'uid': uid, 'ts': ts, 'colecciones': cuenta}
page = ('<!doctype html><html lang="es"><head><meta charset="utf-8">'
        '<meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover">'
        '<style>body{margin:0;padding:0}[hidden]{display:none!important}</style>'
        + SHIM.replace('@@META@@', js(meta)).replace('@@DUMP@@', js(dump))
        + '</head><body>\n' + frag + APP + '\n</body></html>\n')
open(out, 'w', encoding='utf-8').write(page)
print(json.dumps({'salida': out, 'emp': emp, 'bytes': len(page.encode('utf-8')), 'colecciones': cuenta}, ensure_ascii=False))
