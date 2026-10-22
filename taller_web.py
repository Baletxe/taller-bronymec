#!/usr/bin/env python3
"""Web del equipo (y app para móvil/tablet) del panel Control de Pedidos CAF — V109, 16/10/2026.

Uso:  python3 -I web_build.py COPIA.html CLAVE CARPETA_SALIDA [--iconos CARPETA_ICONOS]

COPIA.html     la copia del equipo que genera equipo_build.py (panel + datos, solo lectura).
CLAVE          la contraseña que Jon da a sus compañeros (la misma siempre: si cambia, todos la vuelven a poner).
CARPETA_SALIDA se escribe la web entera, lista para subir tal cual a GitHub Pages:
               index.html (pantalla de entrada), data.enc (el panel CIFRADO), version.json, sw.js,
               manifest.webmanifest e iconos.

Seguridad: en la web pública solo está data.enc, cifrado con AES-256-GCM y una clave derivada de la
contraseña (PBKDF2-SHA256, 250.000 vueltas). Sin la contraseña no se ve nada: ni pedidos, ni precios,
ni clientes. El navegador recuerda la clave (no la contraseña) para que el favorito abra directo.
Solo lectura de verdad: la copia no tiene ninguna conexión con la base de datos del panel de Jon.
"""
import sys, os, json, gzip, base64, hashlib, hmac, shutil, datetime, re
from cryptography.hazmat.primitives.ciphers.aead import AESGCM

a = sys.argv[1:]
if len(a) < 3:
    sys.exit(__doc__)
src, clave, out = a[0], a[1], a[2]
if clave == '-':
    clave = os.environ.get('TALLER_CLAVE', '')  # mejor por variable de entorno: no se ve en la lista de procesos
iconos = a[a.index('--iconos') + 1] if '--iconos' in a else os.path.join(os.path.dirname(os.path.abspath(__file__)), 'pages')
if len(clave) < 16:
    sys.exit('La contraseña tiene que tener al menos 16 caracteres')
sal_f = a[a.index('--sal') + 1] if '--sal' in a else None
if not sal_f or not os.path.exists(sal_f):
    sys.exit('Falta --sal FICHERO (16 bytes aleatorios en base64, uno por contraseña)')
html = open(src, encoding='utf-8').read()
m = re.search(r'"ts":"([^"]+)"', html)
if not m or '__TALLER_DATA__' not in html:
    sys.exit('No es la app del taller con datos')
ts = m.group(1)

ITER = 600000
# Sal ALEATORIA y fija (fichero --sal): la clave recordada en cada navegador sigue valiendo en cada actualización,
# y la sal no da ninguna pista de la contraseña (antes era un HMAC de la contraseña: permitía probar contraseñas al instante).
salt = base64.b64decode(open(sal_f).read().strip())
assert len(salt) == 16
key = hashlib.pbkdf2_hmac('sha256', clave.encode('utf-8'), salt, ITER, 32)
iv = os.urandom(12)
ct = AESGCM(key).encrypt(iv, gzip.compress(html.encode('utf-8'), 9), None)
b64 = lambda b: base64.b64encode(b).decode('ascii')
os.makedirs(out, exist_ok=True)
json.dump({'v': 1, 'ts': ts, 'iter': ITER, 'salt': b64(salt), 'iv': b64(iv), 'ct': b64(ct)},
          open(os.path.join(out, 'data.enc'), 'w'), separators=(',', ':'))
json.dump({'ts': ts}, open(os.path.join(out, 'version.json'), 'w'))
# v37: Panel de control dentro de la app (Jon, 22/10/2026). Mismo cifrado y misma clave que data.enc; la app lo abre
# en panel.html a pantalla completa, solo en aparatos de gerencia y con la clave de responsable.
paneles = []
for i, x in enumerate(a):
    if x == '--panel' and i + 1 < len(a):
        e, f = a[i + 1].split('=', 1)
        assert e in ('caf', 'talgo'), e
        if os.path.exists(f):
            iv2 = os.urandom(12)
            ct2 = AESGCM(key).encrypt(iv2, gzip.compress(open(f, encoding='utf-8').read().encode('utf-8'), 9), None)
            json.dump({'v': 1, 'ts': ts, 'iter': ITER, 'salt': b64(salt), 'iv': b64(iv2), 'ct': b64(ct2)},
                      open(os.path.join(out, 'panel-%s.enc' % e), 'w'), separators=(',', ':'))
            paneles.append(e)
for f in ['icon-192.png', 'icon-512.png', 'icon-maskable-512.png', 'apple-touch-icon.png', 'archivo.woff2']:
    shutil.copy(os.path.join(iconos, f), os.path.join(out, f))
open(os.path.join(out, '.nojekyll'), 'w').write('')
open(os.path.join(out, 'robots.txt'), 'w').write('User-agent: *\nDisallow: /\n')

json.dump({
  'name': 'Bronymec', 'short_name': 'Bronymec', 'lang': 'es',
  'description': 'Producción del taller y panel de control de pedidos de Bronymec',
  'start_url': './', 'scope': './', 'display': 'fullscreen', 'display_override': ['fullscreen', 'standalone'], 'orientation': 'any',
  'background_color': '#0E2A3D', 'theme_color': '#0E2A3D',
  'icons': [{'src': 'icon-192.png', 'sizes': '192x192', 'type': 'image/png'},
            {'src': 'icon-512.png', 'sizes': '512x512', 'type': 'image/png'},
            {'src': 'icon-maskable-512.png', 'sizes': '512x512', 'type': 'image/png', 'purpose': 'maskable'}]
}, open(os.path.join(out, 'manifest.webmanifest'), 'w'), ensure_ascii=False, indent=1)

SW = r"""/* Taller · Bronymec. Los datos siempre se piden nuevos a la red; sin red, la última copia. */
const C = 'taller-v3';
const BASE = ['./', 'index.html', 'manifest.webmanifest', 'icon-192.png', 'icon-512.png', 'apple-touch-icon.png', 'archivo.woff2'];
self.addEventListener('install', e => { e.waitUntil(caches.open(C).then(c => c.addAll(BASE))); self.skipWaiting(); });
self.addEventListener('activate', e => { e.waitUntil(caches.keys().then(ks => Promise.all(ks.filter(k => k !== C).map(k => caches.delete(k)))).then(() => self.clients.claim())); });
self.addEventListener('fetch', e => {
  const r = e.request, u = new URL(r.url);
  if (r.method !== 'GET' || u.origin !== location.origin) return;
  if (u.pathname.endsWith('/version.json')) {
    e.respondWith(fetch(r, {cache: 'no-store'}).catch(() => new Response('{}', {headers: {'Content-Type': 'application/json'}})));
    return;
  }
  if (u.pathname.endsWith('.enc')) {
    const nom = u.pathname.split('/').pop();
    e.respondWith(fetch(u.pathname, {cache: 'no-store'}).then(res => { if (res.ok) { const cl = res.clone(); caches.open(C).then(c => c.put(nom, cl)); } return res; })
      .catch(() => caches.open(C).then(c => c.match(nom))));
    return;
  }
  e.respondWith(fetch(r).then(res => { if (res.ok) { const cl = res.clone(); caches.open(C).then(c => c.put(r, cl)); } return res; })
    .catch(() => caches.match(r).then(m => m || caches.match('index.html'))));
});
"""
open(os.path.join(out, 'sw.js'), 'w').write(SW)

INDEX = r"""<!doctype html>
<html lang="es"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover">
<meta name="robots" content="noindex,nofollow">
<meta name="theme-color" content="#0E2A3D">
<link rel="manifest" href="manifest.webmanifest">
<link rel="icon" href="icon-192.png"><link rel="apple-touch-icon" href="apple-touch-icon.png">
<meta name="mobile-web-app-capable" content="yes"><meta name="apple-mobile-web-app-capable" content="yes">
<meta name="apple-mobile-web-app-title" content="Bronymec">
<title>Bronymec</title>
<style>
:root{--bg:#ECF0F2;--card:#fff;--ink:#0F2230;--ink2:#4A5C69;--ink3:#5F6E79;--line:#D5DDE2;--brand:#014A7D;--brand2:#3C6E8D;--bad:#B4232C;color-scheme:light}
@media (prefers-color-scheme:dark){:root{--bg:#0A1117;--card:#121C24;--ink:#E7EEF3;--ink2:#A9B8C3;--ink3:#8597A4;--line:#26343F;--brand:#71B4E2;--brand2:#8AB2C9;--bad:#F06A72;color-scheme:dark}}
*{box-sizing:border-box}html,body{margin:0;height:100%}
body{font:16px/1.45 system-ui,-apple-system,"Segoe UI",Roboto,sans-serif;background:var(--bg);color:var(--ink);display:grid;place-items:center;padding:24px 16px}
.hero{position:fixed;inset:0 0 auto 0;height:44vh;background:#0E2A3D;background-image:radial-gradient(rgba(255,255,255,.09) 1px,transparent 1.2px);background-size:22px 22px;z-index:-1}
.card{width:min(420px,100%);background:var(--card);border-radius:22px;box-shadow:0 30px 60px -30px rgba(0,30,50,.55),0 2px 8px rgba(0,0,0,.06);padding:30px 28px 24px}
.top{display:flex;gap:14px;align-items:center;margin-bottom:22px}
.mk{width:52px;height:52px;border-radius:14px;background:#0E2A3D;color:#fff;font-weight:800;font-size:21px;display:grid;place-items:center;letter-spacing:-.02em;flex:none}
h1{margin:0;font-size:22px;letter-spacing:-.01em}
.sub{margin:2px 0 0;color:var(--ink3);font-size:14px}
label{display:block;font-weight:600;font-size:14px;margin:0 0 8px}
.f{display:flex;gap:8px}
input[type=password],input[type=text]{flex:1;min-width:0;height:52px;border-radius:14px;border:1.5px solid var(--line);background:transparent;color:var(--ink);font:inherit;font-size:17px;padding:0 14px;outline:none}
input:focus{border-color:var(--brand);box-shadow:0 0 0 4px color-mix(in srgb,var(--brand) 18%,transparent)}
.eye{width:52px;border-radius:14px;border:1.5px solid var(--line);background:transparent;color:var(--ink2);font-size:13px;cursor:pointer}
.rem{display:flex;gap:10px;align-items:center;margin:14px 0 18px;color:var(--ink2);font-size:14.5px;font-weight:500}
.rem input{width:20px;height:20px;accent-color:#014A7D}
.go{width:100%;height:54px;border:0;border-radius:14px;background:#0E2A3D;color:#fff;font:inherit;font-weight:700;font-size:17px;cursor:pointer}
.go:disabled{opacity:.6;cursor:wait}
.err{color:var(--bad);font-size:14px;min-height:20px;margin:10px 0 0}
.foot{margin-top:18px;padding-top:14px;border-top:1px solid var(--line);color:var(--ink3);font-size:12.5px;display:flex;justify-content:space-between;gap:10px;flex-wrap:wrap}
.inst{display:none;margin-top:14px;width:100%;height:46px;border-radius:14px;border:1.5px solid var(--brand);background:transparent;color:var(--brand);font:inherit;font-weight:700;cursor:pointer}
.load{display:none;text-align:center;color:#fff}
.load .sp{width:46px;height:46px;border-radius:50%;border:4px solid rgba(255,255,255,.25);border-top-color:#fff;margin:0 auto 16px;animation:r 1s linear infinite}
@keyframes r{to{transform:rotate(360deg)}}
body.cargando .card{display:none}body.cargando .load{display:block}body.cargando .hero{height:100vh}
</style></head>
<body>
<div class="hero"></div>
<div class="load"><div class="sp"></div><div id="lmsg">Abriendo…</div></div>
<form class="card" id="f" autocomplete="on">
  <div class="top"><div class="mk">BM</div><div><h1>Bronymec</h1><p class="sub">Producción del taller · CAF · Talgo</p></div></div>
  <input type="text" name="username" value="taller" autocomplete="username" hidden>
  <label for="pw">Contraseña</label>
  <div class="f"><input id="pw" type="password" autocomplete="current-password" required autofocus><button class="eye" type="button" id="eye" aria-label="Ver contraseña">ver</button></div>
  <label class="rem"><input type="checkbox" id="rem" checked> Recordar en este dispositivo</label>
  <button class="go" id="go">Entrar</button>
  <p class="err" id="err" role="alert"></p>
  <button class="inst" type="button" id="inst">Instalar como app</button>
  <div class="foot"><span id="ver">Datos: comprobando…</span><span>Si no la tienes, pídesela a Jon</span></div>
</form>
<script>
(async function(){
  const $ = id => document.getElementById(id);
  const u8 = b => Uint8Array.from(atob(b), c => c.charCodeAt(0));
  const b64 = a => btoa(String.fromCharCode.apply(null, new Uint8Array(a)));
  const ls = { get(k){ try { return localStorage.getItem(k); } catch(_) { return null; } }, set(k,v){ try { localStorage.setItem(k,v); } catch(_){} }, del(k){ try { localStorage.removeItem(k); } catch(_){} } };
  if ('serviceWorker' in navigator) navigator.serviceWorker.register('sw.js').catch(() => {});
  if (/[?&]salir\b/.test(location.search)){ ['tl.k','tl.salt','taller.sync.cfg','taller.sync.mt','taller.plan.v1'].forEach(k => ls.del(k)); try { sessionStorage.clear(); } catch(_){} history.replaceState(null, '', location.pathname); }
  let pedido = null;
  addEventListener('beforeinstallprompt', e => { e.preventDefault(); pedido = e; window.__bip = e; $('inst').style.display = 'block'; });
  $('inst').onclick = () => { if (pedido){ pedido.prompt(); pedido = null; $('inst').style.display = 'none'; } };
  $('eye').onclick = () => { const p = $('pw'); p.type = p.type === 'password' ? 'text' : 'password'; $('eye').textContent = p.type === 'password' ? 'ver' : 'ocultar'; };

  let D;
  try { const r = await fetch('data.enc', {cache: 'no-cache'}); D = await r.json(); }
  catch(e){ $('err').textContent = 'No se ha podido descargar la app. Revisa la conexión y vuelve a intentarlo.'; return; }
  const t = new Date(D.ts);
  $('ver').textContent = 'Datos del ' + t.toLocaleDateString('es-ES', {day:'numeric', month:'short'}) + ' a las ' + t.toLocaleTimeString('es-ES', {hour:'2-digit', minute:'2-digit'});

  async function abrir(key){
    const raw = await crypto.subtle.decrypt({name: 'AES-GCM', iv: u8(D.iv)}, key, u8(D.ct));
    document.body.classList.add('cargando');
    const txt = await new Response(new Blob([raw]).stream().pipeThrough(new DecompressionStream('gzip'))).text();
    document.open(); document.write(txt); document.close();
  }
  const guardada = ls.get('tl.k');
  if (guardada && ls.get('tl.salt') === D.salt){
    document.body.classList.add('cargando');
    try { try { sessionStorage.setItem('tl.ks', guardada); } catch(_){} const k = await crypto.subtle.importKey('raw', u8(guardada), 'AES-GCM', false, ['decrypt']); await abrir(k); return; }
    catch(e){ ls.del('tl.k'); document.body.classList.remove('cargando'); $('err').textContent = 'La contraseña ha cambiado: vuelve a escribirla.'; }
  }
  $('f').onsubmit = async ev => {
    ev.preventDefault(); $('err').textContent = ''; $('go').disabled = true; $('go').textContent = 'Comprobando…';
    try {
      const base = await crypto.subtle.importKey('raw', new TextEncoder().encode($('pw').value), 'PBKDF2', false, ['deriveBits']);
      const bits = await crypto.subtle.deriveBits({name: 'PBKDF2', hash: 'SHA-256', salt: u8(D.salt), iterations: D.iter}, base, 256);
      const k = await crypto.subtle.importKey('raw', bits, 'AES-GCM', false, ['decrypt']);
      await crypto.subtle.decrypt({name: 'AES-GCM', iv: u8(D.iv)}, k, u8(D.ct));
      if ($('rem').checked){ ls.set('tl.k', b64(bits)); ls.set('tl.salt', D.salt); }
      try { sessionStorage.setItem('tl.ks', b64(bits)); } catch(_){}
      await abrir(k);
    } catch(e){
      $('go').disabled = false; $('go').textContent = 'Entrar';
      $('err').textContent = 'Contraseña incorrecta.'; $('pw').select();
    }
  };
})();
</script>
</body></html>
"""
_h = lambda t: "'sha256-" + base64.b64encode(hashlib.sha256(t.encode('utf-8')).digest()).decode() + "'"
_scripts = re.findall(r'<script>(.*?)</script>', INDEX, re.S) + re.findall(r'<script>(.*?)</script>', html, re.S)
_csp = ("default-src 'none'; script-src " + ' '.join(sorted(set(_h(t) for t in _scripts))) + "; style-src 'self' 'unsafe-inline'; font-src 'self'; "
        "img-src 'self' data: blob:; connect-src 'self' https://api.github.com; frame-src 'self'; manifest-src 'self'; worker-src 'self'; base-uri 'none'; form-action 'none'; object-src 'none'")
INDEX = INDEX.replace('<meta charset="utf-8">', '<meta charset="utf-8">\n<meta http-equiv="Content-Security-Policy" content="' + _csp + '">', 1)
open(os.path.join(out, 'index.html'), 'w', encoding='utf-8').write(INDEX)
# panel.html: abre panel-<emp>.enc con la clave que ya tiene este aparato (la misma que abre la app) y lo pinta.
# CSP propia: el panel trae sus scripts en línea (es nuestro y va cifrado); nada externo, sin conexiones fuera.
PANEL = r'''<!doctype html><html lang="es"><head><meta charset="utf-8">
<meta http-equiv="Content-Security-Policy" content="default-src 'none'; script-src 'unsafe-inline'; style-src 'self' 'unsafe-inline'; font-src 'self'; img-src 'self' data: blob:; connect-src 'self'; base-uri 'none'; form-action 'none'; object-src 'none'">
<meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover"><meta name="robots" content="noindex,nofollow">
<title>Panel de control</title>
<style>html,body{margin:0;height:100%;background:#0E2A3D;color:#fff;font:16px/1.4 system-ui,-apple-system,"Segoe UI",Roboto,sans-serif}
.w{min-height:100%;display:grid;place-items:center;text-align:center;padding:24px}.sp{width:42px;height:42px;border-radius:50%;border:4px solid rgba(255,255,255,.25);border-top-color:#fff;margin:0 auto 14px;animation:r 1s linear infinite}
@keyframes r{to{transform:rotate(360deg)}}#m{color:rgba(255,255,255,.8)}</style></head>
<body><div class="w"><div><div class="sp"></div><div id="m">Abriendo el panel…</div></div></div>
<script>
(async function(){
  const u8 = b => Uint8Array.from(atob(b), c => c.charCodeAt(0)), m = t => { document.getElementById('m').textContent = t; document.querySelector('.sp').style.display = 'none'; };
  const e = (new URLSearchParams(location.search).get('e') || '').replace(/[^a-z]/g, '');
  let k = null; try { k = sessionStorage.getItem('tl.ks') || localStorage.getItem('tl.k'); } catch(_){}
  if (!k || !e){ m('Abre el panel desde la app.'); return; }
  try {
    const r = await fetch('panel-' + e + '.enc', {cache: 'no-cache'}); if (!r.ok){ m('Este panel todavía no está en la app.'); return; }
    const D = await r.json();
    const key = await crypto.subtle.importKey('raw', u8(k), 'AES-GCM', false, ['decrypt']);
    const raw = await crypto.subtle.decrypt({name: 'AES-GCM', iv: u8(D.iv)}, key, u8(D.ct));
    const txt = await new Response(new Blob([raw]).stream().pipeThrough(new DecompressionStream('gzip'))).text();
    document.open(); document.write(txt); document.close();
  } catch(_){ m('No se ha podido abrir el panel. Vuelve a entrar en la app.'); }
})();
</script></body></html>
'''
if paneles:
    open(os.path.join(out, 'panel.html'), 'w', encoding='utf-8').write(PANEL)
size = os.path.getsize(os.path.join(out, 'data.enc'))
print(json.dumps({'carpeta': out, 'ts': ts, 'data_enc_bytes': size, 'paneles': paneles, 'ficheros': sorted(os.listdir(out))}, ensure_ascii=False))
