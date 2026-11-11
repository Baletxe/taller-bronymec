#!/usr/bin/env python3
"""Monta taller_app.html a partir de src/ (orden en src/orden.json). Sin dependencias.
Uso: python3 -I build_app.py [salida.html]          → por defecto escribe taller_app.html junto a este script
     python3 -I build_app.py --comprobar            → falla si taller_app.html no es exactamente lo que sale de src/
taller_app.html sigue en el repo (lo usan actualizar.sh, el workflow y la pasada): src/ es donde se edita,
y la prueba --comprobar garantiza que los dos nunca se separan."""
import sys, os, json
try: sys.stdout.reconfigure(encoding='utf-8')
except Exception: pass
K = os.path.dirname(os.path.abspath(__file__))
S = os.path.join(K, 'src')
orden = json.load(open(os.path.join(S, 'orden.json'), encoding='utf-8'))
h = ''.join(open(os.path.join(S, p), encoding='utf-8', newline='').read() for p in orden)
assert h.count('/*__DATOS__*/null') == 1, 'falta el punto de los datos /*__DATOS__*/null'
dest = os.path.join(K, 'taller_app.html')
if '--comprobar' in sys.argv:
    cur = open(dest, encoding='utf-8', newline='').read()
    if cur != h:
        sys.exit('🔴 taller_app.html no coincide con src/: ejecuta python3 build_app.py')
    print('🟢 taller_app.html = src/ (%d ficheros, %d bytes)' % (len(orden), len(h.encode())))
else:
    out = sys.argv[1] if len(sys.argv) > 1 else dest
    open(out, 'w', encoding='utf-8', newline='').write(h)
    print('🟢', out, len(h.encode()), 'bytes')
