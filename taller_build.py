#!/usr/bin/env python3
"""Mete los datos del taller en la app -> taller.html
Uso: python3 -I taller_build.py taller_app.html salida.html --caf caf.json [--talgo talgo.json] [--plan-token FICHERO] [--artifact] [--estricto]
caf.json lo genera taller_datos.js (panel CAF); talgo.json, talgo_datos.py (panel Talgo).
Nunca lleva precios, importes, facturación ni contratos: se comprueba por nombre de campo."""
import sys, os, json, re
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))  # -I no añade la carpeta del kit: se pone a mano
import adaptadores  # Fase 1: cada origen entrega líneas en el formato común, con su `origen`
a = sys.argv[1:]
app, out = a[0], a[1]
op = lambda k: a[a.index(k) + 1] if k in a else None
h = open(app, encoding='utf-8').read()
emp = {}
caf = json.load(open(op('--caf'), encoding='utf-8'))
ts = caf.pop('ts', None)
avisos = []
emp['caf'], av = adaptadores.caf(caf); avisos += av
if op('--talgo'):
    t = json.load(open(op('--talgo'), encoding='utf-8')); t.pop('ts', None)
    emp['talgo'], av = adaptadores.talgo(t); avisos += av
# Los avisos de formato no paran la publicación (no se inventa ni se quita nada), pero se ven; --estricto (pruebas) sí para.
for x in avisos[:20]:
    print('AVISO formato:', x, file=sys.stderr)
if avisos and '--estricto' in a:
    sys.exit('%d líneas no cumplen el formato común' % len(avisos))
d = {'ts': ts, 'emp': emp}
# Acceso al plan compartido (repo privado taller-plan): va DENTRO de la web cifrada con la contraseña, así
# cualquier tablet que abra la app queda conectada sola. Nunca en la vista previa (--artifact).
if op('--plan-token') and '--artifact' not in a:
    tk = open(op('--plan-token'), encoding='utf-8').read().strip()
    assert re.fullmatch(r'github_pat_[A-Za-z0-9_]{20,}', tk), 'el acceso al plan no tiene el formato esperado'
    d['plan'] = {'t': tk}
def claves(o, acc):
    if isinstance(o, dict):
        for k, v in o.items():
            if not re.fullmatch(r'\d{4}-\d{2}-\d{2}', k): acc.add(k.lower())
            claves(v, acc)
    elif isinstance(o, list):
        for v in o: claves(v, acc)
    return acc
for k in claves(d, set()):
    assert not re.search(r'precio|eur|importe|factur|contrato|^val$|^pr$|^imp$|coste', k), 'el taller no lleva ' + k
txt = json.dumps(d, ensure_ascii=False, separators=(',', ':'))
assert h.count('/*__DATOS__*/null') == 1
h = h.replace('/*__DATOS__*/null', txt.replace('<', '\\u003c'))
if '--artifact' in a:
    # Vista previa como artifact de Claude: sin esqueleto propio, sin manifest, sin imprimir ni descargar.
    h = h.replace('<!doctype html>\n<html lang="es">\n<head>\n', '').replace('</head>\n<body>\n', '').replace('</body>\n</html>\n', '')
    h = re.sub(r'<link rel="manifest"[^>]*>\n<link rel="icon"[^>]*><link rel="apple-touch-icon"[^>]*>\n', '', h)
    h = h.replace('<style>', '<style>body::before{content:"";position:fixed;inset:0 0 auto;height:env(safe-area-inset-top,0px);z-index:31;background:#0E2A3D}', 1)
    h = h.replace("window.__TALLER_DATA__ =", "document.documentElement.dataset.artifact='1';\nwindow.__TALLER_DATA__ =", 1)
    assert '<html' not in h[:400] and '<head>' not in h and '<body>' not in h
else:
    # CSP: solo pueden ejecutarse los scripts de la propia app (por su huella); nada de terceros.
    import hashlib, base64
    hs = ["'sha256-" + base64.b64encode(hashlib.sha256(m.encode('utf-8')).digest()).decode() + "'" for m in re.findall(r'<script>(.*?)</script>', h, re.S)]
    csp = ("default-src 'none'; script-src " + ' '.join(hs) + "; style-src 'self' 'unsafe-inline'; font-src 'self'; img-src 'self' data: blob:; "
           "connect-src 'self' https://api.github.com; frame-src 'self'; manifest-src 'self'; base-uri 'none'; form-action 'none'; object-src 'none'")
    assert h.count('<meta charset="utf-8">') == 1
    h = h.replace('<meta charset="utf-8">', '<meta charset="utf-8">\n<meta http-equiv="Content-Security-Policy" content="' + csp + '">', 1)
open(out, 'w', encoding='utf-8').write(h)
print(json.dumps({'salida': out, 'empresas': {k: len(v['lineas']) for k, v in emp.items()}, 'plan': 'plan' in d, 'avisos': len(avisos), 'bytes': len(h.encode())}))
