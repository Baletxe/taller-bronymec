#!/usr/bin/env python3
"""Monta la VISTA PREVIA (beta) con datos de PRUEBA inventados, aislada de la app real.

La beta vive en https://baletxe.github.io/taller-bronymec-beta/, el MISMO origen que la app real (baletxe.github.io).
Sin aislar, compartirían localStorage, sessionStorage y la caché del service worker: la beta podría leer o pisar el plan
local y la llave guardada de la app real en ese aparato. Por eso:
  - un guardián (primer script, también dentro de la app) hace que getItem/setItem/removeItem/clear solo vean claves 'beta:…';
  - el service worker usa su propia caché ('beta-…') y solo borra cachés 'beta-…' (nunca 'taller-v3' de la app real);
  - una franja fija 'BETA · datos de prueba' en todas las pantallas;
  - nunca lleva acceso al plan compartido ni paneles (no hay PANEL_CLAVE ni --plan-token).
pruebas/beta_aislada.js comprueba todo esto con un navegador.

Uso: TALLER_CLAVE=<clave de PRUEBA> python3 beta_build.py FIXTURES_DIR SALIDA_DIR
"""
import sys, os, re, json, base64, hashlib, subprocess, tempfile, shutil

K = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
os.environ['PYTHONUTF8'] = '1'  # taller_web.py escribe sw.js y manifest sin encoding: en Windows saldrían en cp1252
fx, out = sys.argv[1], sys.argv[2]
assert os.environ.get('TALLER_CLAVE', '').startswith('prueba-'), 'la beta solo se cifra con una clave de PRUEBA (empieza por "prueba-")'
os.environ.pop('PANEL_CLAVE', None)

GUARDIAN = r"""(function(){if(window.__betaAislada)return;window.__betaAislada=1;var P='beta:',S=Storage.prototype,g=S.getItem,s=S.setItem,r=S.removeItem,k=S.key;
S.getItem=function(x){return g.call(this,P+x)};S.setItem=function(x,v){return s.call(this,P+x,v)};S.removeItem=function(x){return r.call(this,P+x)};
S.clear=function(){for(var i=this.length-1;i>=0;i--){var q=k.call(this,i);if(q&&q.indexOf(P)===0)r.call(this,q)}};
S.key=function(i){var a=[];for(var j=0;j<this.length;j++){var q=k.call(this,j);if(q&&q.indexOf(P)===0)a.push(q.slice(P.length))}return i<a.length?a[i]:null};
var f=function(){if(!document.body||document.getElementById('betaF'))return;var d=document.createElement('div');d.id='betaF';d.setAttribute('aria-hidden','true');
d.textContent='BETA · datos de prueba';d.style.cssText='position:fixed;left:50%;bottom:calc(env(safe-area-inset-bottom,0px) + 2px);transform:translateX(-50%);z-index:2147483647;pointer-events:none;background:#E8A317;color:#1b1300;font:800 11px/1 system-ui,sans-serif;letter-spacing:.06em;padding:4px 10px;border-radius:999px;box-shadow:0 2px 8px rgba(0,0,0,.25);opacity:.92';document.body.appendChild(d)};
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',f);else f();setTimeout(f,1500)})();"""
TAG = '<script>' + GUARDIAN + '</script>\n'
h_sha = "'sha256-" + base64.b64encode(hashlib.sha256(GUARDIAN.encode('utf-8')).digest()).decode() + "'"

tmp = tempfile.mkdtemp(prefix='beta-')
try:
    app = open(os.path.join(K, 'taller_app.html'), encoding='utf-8').read()
    i = app.index('<script>'); app = app[:i] + TAG + app[i:]
    open(os.path.join(tmp, 'app.html'), 'w', encoding='utf-8').write(app)
    py = [sys.executable, '-I']
    subprocess.run(py + [os.path.join(K, 'taller_build.py'), os.path.join(tmp, 'app.html'), os.path.join(tmp, 'taller.html'),
                         '--caf', os.path.join(fx, 'caf.json'), '--talgo', os.path.join(fx, 'talgo.json')], check=True, stdout=subprocess.DEVNULL)
    if os.path.isdir(out):
        for n in os.listdir(out):
            if n != '.git': (shutil.rmtree if os.path.isdir(os.path.join(out, n)) else os.remove)(os.path.join(out, n))
    subprocess.run([sys.executable, os.path.join(K, 'taller_web.py'), os.path.join(tmp, 'taller.html'), '-', out,
                    '--iconos', os.path.join(K, 'iconos'), '--sal', os.path.join(K, 'SAL'), '--sal-panel', os.path.join(K, 'SAL_PANEL')],
                   check=True, stdout=subprocess.DEVNULL)
finally:
    shutil.rmtree(tmp, ignore_errors=True)

# index.html: guardián delante de todo y su huella en la CSP
p = os.path.join(out, 'index.html'); h = open(p, encoding='utf-8').read()
i = h.index('<script>'); h = h[:i] + TAG + h[i:]
h = h.replace("script-src ", "script-src " + h_sha + " ", 1)
h = h.replace('<title>Bronymec</title>', '<title>Bronymec · BETA</title>')
open(p, 'w', encoding='utf-8').write(h)
# service worker: caché propia y solo borra lo suyo
p = os.path.join(out, 'sw.js'); s = open(p, encoding='utf-8').read()
assert "const C = 'taller-v3';" in s and 'ks.filter(k => k !== C)' in s, 'sw.js ha cambiado: revisar el aislamiento de la beta'
s = s.replace("const C = 'taller-v3';", "const C = 'beta-taller-v3';").replace('ks.filter(k => k !== C)', "ks.filter(k => k.startsWith('beta-') && k !== C)")
open(p, 'w', encoding='utf-8').write(s)
# manifest: otro nombre e id, para que no se confunda con la app instalada
p = os.path.join(out, 'manifest.webmanifest'); m = json.load(open(p, encoding='utf-8'))
m.update({'name': 'Bronymec BETA', 'short_name': 'BM beta', 'id': './?beta'})
json.dump(m, open(p, 'w', encoding='utf-8'), ensure_ascii=False, indent=1)
assert not any(n.startswith('panel') for n in os.listdir(out)), 'la beta nunca lleva paneles'
open(os.path.join(out, 'README.md'), 'w', encoding='utf-8').write(
    '# Fabricación Bronymec · BETA\n\nVista previa con **datos de PRUEBA inventados** (pedidos PRUEBA-…, códigos 9990…). '
    'No es la app del taller y no está conectada a nada real.\n\nLa app real está en https://baletxe.github.io/taller-bronymec/\n')
print(json.dumps({'beta': out, 'ficheros': sorted(os.listdir(out))}, ensure_ascii=False))
