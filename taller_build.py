#!/usr/bin/env python3
"""Mete los datos del taller en la app -> taller.html
Uso: python3 -I taller_build.py taller_app.html salida.html --caf caf.json [--talgo talgo.json] [--artifact]
caf.json lo genera taller_datos.js (panel CAF); talgo.json, talgo_datos.py (panel Talgo).
Nunca lleva precios, importes, facturación ni contratos: se comprueba por nombre de campo."""
import sys, json, re
a = sys.argv[1:]
app, out = a[0], a[1]
op = lambda k: a[a.index(k) + 1] if k in a else None
h = open(app, encoding='utf-8').read()
emp = {}
caf = json.load(open(op('--caf'), encoding='utf-8'))
ts = caf.pop('ts', None)
emp['caf'] = dict(caf, nombre='CAF')
if op('--talgo'):
    t = json.load(open(op('--talgo'), encoding='utf-8')); t.pop('ts', None)
    emp['talgo'] = dict(t, nombre='Talgo')
d = {'ts': ts, 'emp': emp}
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
           "connect-src 'self' https://api.github.com; manifest-src 'self'; base-uri 'none'; form-action 'none'; object-src 'none'")
    assert h.count('<meta charset="utf-8">') == 1
    h = h.replace('<meta charset="utf-8">', '<meta charset="utf-8">\n<meta http-equiv="Content-Security-Policy" content="' + csp + '">', 1)
open(out, 'w', encoding='utf-8').write(h)
print(json.dumps({'salida': out, 'empresas': {k: len(v['lineas']) for k, v in emp.items()}, 'bytes': len(h.encode())}))
