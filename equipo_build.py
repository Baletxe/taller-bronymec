#!/usr/bin/env python3
"""Copia del equipo del panel Control de Pedidos CAF (V109, 16/10/2026).

Uso:  python3 -I equipo_build.py PANEL.html DB_DIR SALIDA.html [--people people.json] [--ts ISO]

PANEL.html  el index.html publicado (Artifact read path "index.html"), con o sin el esqueleto.
DB_DIR      carpeta con <coleccion>/<id>.json (ArtifactData list ... out_dir DB_DIR).
            Colecciones: marcas decisiones precios fc_cruces pedidos_extra fechas fc_snap export_snap precios_rev
people.json opcional: {"u_xxx": "Nombre"} (ArtifactData action profiles) para que salga quién marcó.

Qué hace: el MISMO código del panel, con los datos de la base de datos metidos dentro, en solo
lectura (no escribe nada en ningún sitio), con una pastilla "Copia del equipo · datos de las hh:mm"
y recarga sola cada 5 minutos cuando nadie la está tocando (con OneDrive sincronizando la carpeta,
pulsar F5 o esperar trae la última versión). Escribe también SALIDA.json con el resumen de control.
"""
import json, os, sys, hashlib, datetime, re

args = sys.argv[1:]
if len(args) < 3:
    sys.exit(__doc__)
src, dbdir, out = args[0], args[1], args[2]
people, ts = {}, None
if '--people' in args:
    people = json.load(open(args[args.index('--people') + 1], encoding='utf-8'))
if '--ts' in args:
    ts = args[args.index('--ts') + 1]
if not ts:
    ts = datetime.datetime.now(datetime.timezone.utc).isoformat(timespec='seconds')

html = open(src, encoding='utf-8').read()
# Quitar el esqueleto que añade el visor al leer el artifact (si viene) y quedarse con el fragmento.
i = html.find('<title>Control de Pedidos CAF</title>')
if i < 0:
    sys.exit('No encuentro el inicio del panel (<title>Control de Pedidos CAF</title>)')
frag = html[i:]
j = frag.rfind('</body></html>')
if j > 0 and j > len(frag) - 40:
    frag = frag[:j]
for need in ['id="main"', '<script id="data"', 'window.claude.use']:
    if need not in frag:
        sys.exit('El panel no trae ' + need)

COLS = ['marcas', 'decisiones', 'precios', 'fc_cruces', 'pedidos_extra', 'fechas', 'fc_snap', 'export_snap', 'precios_rev']
dump, cuenta = {}, {}
for c in COLS:
    d = os.path.join(dbdir, c)
    dump[c] = {}
    if os.path.isdir(d):
        for f in sorted(os.listdir(d)):
            if f.endswith('.json'):
                dump[c][f[:-5]] = json.load(open(os.path.join(d, f), encoding='utf-8'))
    cuenta[c] = len(dump[c])
for c in ['marcas', 'precios', 'pedidos_extra']:
    if cuenta[c] == 0:
        sys.exit('La colección %s ha llegado vacía: no se genera la copia (daría cifras falsas)' % c)

def js(o):
    return json.dumps(o, ensure_ascii=False, separators=(',', ':')).replace('</', '<\\/')

MOCK = r'''<script>
window.__EQUIPO__ = %(meta)s;
window.__DUMP__ = %(dump)s;
(function(){
  /* Solo lectura: lo que el panel intente guardar se queda en esta pestaña y no va a ninguna parte. */
  var D = window.__DUMP__, P = %(people)s;
  function snap(c){ var m = D[c] || {}; var ids = Object.keys(m);
    return { docs: ids.map(function(id){ return { id: id, exists: true, data: function(){ return JSON.parse(JSON.stringify(m[id])); } }; }), size: ids.length, empty: !ids.length }; }
  var no = function(){ return Promise.reject(Object.assign(new Error('solo lectura'), {code: 'invalid_argument'})); };
  var db = {
    collection: function(c){ return { onSnapshot: function(ok){ setTimeout(function(){ ok(snap(c)); }, 0); return function(){}; }, get: function(){ return Promise.resolve(snap(c)); } }; },
    doc: function(path){ var p = path.split('/'), c = p[0], id = p[1]; return { set: no, update: no, delete: no,
      get: function(){ var d = (D[c] || {})[id]; return Promise.resolve({ id: id, exists: !!d, data: function(){ return d; } }); },
      onSnapshot: function(ok){ setTimeout(function(){ var d = (D[c] || {})[id]; ok({ id: id, exists: !!d, data: function(){ return d; } }); }, 0); return function(){}; } }; }
  };
  var user = { me: function(){ return Promise.resolve({ id: 'equipo', name: '' }); }, can: function(){ return Promise.resolve(false); },
    profiles: function(ids){ var o = {}; ids.forEach(function(i){ o[i] = { name: P[i] || 'Alguien del equipo', isMe: false, isGuest: false }; }); return Promise.resolve(o); } };
  window.claude = { use: function(k){ return Promise.resolve(k === 'db' ? db : k === 'user' ? user : null); } };
})();
</script>'''

TEAM = r'''<style>
#nubeBtn{display:none!important}
[data-retomar]{display:none!important}
button:disabled{cursor:not-allowed}
.eq-pill{display:inline-flex;align-items:center;gap:8px;height:46px;padding:0 14px;border-radius:12px;border:1px solid var(--line-2);background:var(--surface);color:var(--ink-2);font-size:13.5px;font-weight:600;white-space:nowrap}
.eq-pill i{width:9px;height:9px;border-radius:50%;background:var(--ok,#1E8E4E);box-shadow:0 0 0 3px color-mix(in srgb,var(--ok,#1E8E4E) 22%,transparent)}
.eq-pill.old i{background:var(--warn,#C98A16);box-shadow:0 0 0 3px color-mix(in srgb,var(--warn,#C98A16) 22%,transparent)}
.eq-pill.old{color:var(--warn,#9a6200);border-color:color-mix(in srgb,var(--warn,#C98A16) 40%,var(--line-2))}
.eq-pill small{font-weight:500;color:var(--ink-3)}
@media (max-width:1900px){.eq-pill small{display:none}}
@media (max-width:640px){.eq-pill{height:40px;padding:0 10px;font-size:12px}}
</style>
<script>
(function(){
  var M = window.__EQUIPO__, t = new Date(M.ts);
  function hm(d){ return d.toLocaleTimeString('es-ES', {hour:'2-digit', minute:'2-digit'}); }
  function dia(d){ var h = new Date(); h.setHours(0,0,0,0); var x = new Date(d); x.setHours(0,0,0,0);
    var n = Math.round((h - x) / 864e5); return n === 0 ? 'hoy' : n === 1 ? 'ayer' : d.toLocaleDateString('es-ES', {day:'numeric', month:'short'}); }
  function pill(){
    var tools = document.querySelector('.hd .tools'); if (!tools) return;
    var el = document.getElementById('eqPill');
    if (!el){ el = document.createElement('span'); el.id = 'eqPill'; el.className = 'eq-pill'; tools.insertBefore(el, tools.firstChild); }
    var h = (Date.now() - t) / 36e5, old = h > 26;
    el.className = 'eq-pill' + (old ? ' old' : '');
    el.title = 'Copia de solo lectura del panel de Jon. Datos del ' + t.toLocaleString('es-ES') + '. Se actualiza sola: con F5 o esperando 5 minutos ves la última.' + (old ? ' Lleva más de un día sin actualizarse.' : '');
    el.innerHTML = '<i></i>' + (dia(t) === 'hoy' ? 'Datos de las ' + hm(t) : 'Datos de ' + dia(t) + ', ' + hm(t)) + '<small>&nbsp;· copia del equipo, solo lectura</small>';
  }
  var rb = document.getElementById('refreshBtn');
  if (rb) rb.addEventListener('click', function(e){ e.stopImmediatePropagation(); e.preventDefault(); location.reload(); }, true);
  pill(); setInterval(pill, 60000);
  /* Recarga sola cada 5 minutos si nadie toca nada desde hace 90 s y no hay ninguna ficha abierta.
     Vuelve a la misma pestaña (el panel la recuerda) y a la misma altura de la página. */
  var last = Date.now();
  ['mousemove','keydown','scroll','touchstart','click'].forEach(function(ev){ addEventListener(ev, function(){ last = Date.now(); }, {passive:true}); });
  try { var y = +sessionStorage.getItem('eq.scroll'); if (y) setTimeout(function(){ scrollTo(0, y); sessionStorage.removeItem('eq.scroll'); }, 400); } catch(_){}
  function quieto(){ var ov = document.getElementById('overlay');
    return document.visibilityState === 'visible' && Date.now() - last > 60000 && !(ov && ov.firstElementChild); }
  function recargar(){ try { sessionStorage.setItem('eq.scroll', String(scrollY)); } catch(_){} location.reload(); }
  if (/^https?:/.test(location.protocol)){
    /* En la web (y en la app instalada): cada 2 minutos mira si hay datos nuevos (version.json, sin caché)
       y solo entonces recarga, cuando nadie la está tocando. Con F5 se ve al momento. */
    var nueva = false;
    setInterval(function(){
      fetch('version.json?t=' + Date.now(), {cache: 'no-store'}).then(function(r){ return r.ok ? r.json() : null; }).then(function(v){
        if (v && v.ts && v.ts !== M.ts) nueva = true;
        if (nueva && quieto()) recargar();
      }).catch(function(){});
    }, 120000);
  } else {
    setInterval(function(){ if (quieto()) recargar(); }, 300000);
  }
})();
</script>'''

meta = {'ts': ts, 'colecciones': cuenta, 'version': 'equipo-1'}
page = ('<!doctype html><html lang="es"><head><meta charset="utf-8">'
        '<meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover">'
        '<meta name="robots" content="noindex,nofollow">'
        '<meta name="theme-color" content="#014A7D"><link rel="manifest" href="manifest.webmanifest">'
        '<link rel="icon" href="icon-192.png"><link rel="apple-touch-icon" href="apple-touch-icon.png">'
        '<meta name="mobile-web-app-capable" content="yes"><meta name="apple-mobile-web-app-capable" content="yes">'
        '<meta name="apple-mobile-web-app-title" content="Pedidos CAF">'
        '<style>body{margin:0;padding:0}[hidden]{display:none!important}</style>'
        + MOCK % {'meta': js(meta), 'dump': js(dump), 'people': js(people)}
        + '</head><body>\n'
        + frag.replace('<title>Control de Pedidos CAF</title>', '<title>Pedidos CAF · Bronymec</title>', 1)
        + TEAM + '\n</body></html>\n')
open(out, 'w', encoding='utf-8').write(page)
h = hashlib.sha256((frag + js(dump)).encode('utf-8')).hexdigest()[:16]
res = {'salida': out, 'bytes': len(page.encode('utf-8')), 'hash_datos': h, 'ts': ts, 'colecciones': cuenta}
json.dump(res, open(os.path.splitext(out)[0] + '.json', 'w', encoding='utf-8'), ensure_ascii=False, indent=1)
print(json.dumps(res, ensure_ascii=False))
