#!/usr/bin/env python3
"""Saca del panel Control de Pedidos Talgo SOLO lo que necesita el taller: líneas en firme abiertas
(pedido, cantidades, fechas, retraso) y lo provisional de Talgo como previsión, en unidades.
Nada de precios, valores, facturación ni contratos.

Uso: python3 -I talgo_datos.py TALGO.html DB_DIR salida.json [--stock stock.json --caf caf.json]
DB_DIR: <coleccion>/<id>.json del panel Talgo (marcas, centros).
--stock (v43, regla 6): la tabla de stock del SGA que saca taller_datos.js del panel CAF (misma fuente para CAF y Talgo:
  ahí están todas las piezas mecanizadas terminadas; si una pieza no está, no hay). Solo con cruce único (un código Bronymec):
  stock del código menos lo ya asignado a líneas de CAF (--caf), repartido por fecha de entrega, la más antigua primero.
  Código que no cruza: sin stock conocido (no se supone nada).
"""
import sys, os, json, re, datetime
from zoneinfo import ZoneInfo

src, dbdir, out = sys.argv[1:4]
op = lambda k: sys.argv[sys.argv.index(k) + 1] if k in sys.argv else None
h = open(src, encoding='utf-8').read()
m = re.search(r'<script id="data"[^>]*>(.*?)</script>', h, re.S)
if not m:
    sys.exit('No encuentro los datos del panel Talgo')
D = json.loads(m.group(1))

def col(c):
    d = os.path.join(dbdir, c); r = {}
    if os.path.isdir(d):
        for f in os.listdir(d):
            if f.endswith('.json'):
                r[f[:-5]] = json.load(open(os.path.join(d, f), encoding='utf-8'))
    return r

marcas, centros = col('marcas'), col('centros')
safe = lambda s: re.sub(r'[^A-Za-z0-9_\-.~:@+]', '_', str(s))[:180]
hoy = datetime.datetime.now(ZoneInfo('Europe/Madrid')).date()
planta = lambda ce: (centros.get(ce) or {}).get('nombre') or ('Centro ' + str(ce))

lineas, prev = [], {}
for l in D['lineas']:
    ctd, avis = l.get('ctd') or 0, l.get('avis') or 0
    pend = max(ctd - avis, 0)
    if pend <= 0:
        continue
    cods = l.get('cod') or []
    cod = cods[0] if cods else ''
    desc = l.get('sd') or l.get('txt') or ''
    if l.get('fp') != 'F':
        k = cod or ('ref:' + str(l.get('mat')))
        p = prev.setdefault(k, {'cod': cod, 'ref': str(l.get('mat') or ''), 'desc': desc, 'sem': {}})
        p['sem'][l['f']] = p['sem'].get(l['f'], 0) + pend
        continue
    mk = marcas.get(safe(l['id'])) or {}
    if mk.get('estado') == 'enviado':
        continue
    f = datetime.date.fromisoformat(l['f'])
    late = f < hoy
    lineas.append({
        'id': 'T' + l['id'], 'pedido': l['ped'], 'linea': l.get('pos'), 'planta': planta(l.get('ce')), 'empresa': 'Talgo',
        'ref': str(l.get('mat') or ''), 'plano': l.get('doc') or '', 'cod': cod,
        'cruce': 'OK' if len(cods) == 1 else ('REVISAR' if cods else ''),
        'desc': desc, 'pedida': ctd, 'entregada': avis, 'pend': pend, 'asig': 0, 'env': 0,
        'stock': None, 'ubic': '', 'serv': 'sin', 'fecha': l['f'], 'fechaCAF': None, 'pactada': None,
        'late': late, 'dias': (hoy - f).days if late else 0,
    })

# v43 · stock del SGA (regla 6): misma fuente que CAF, cruce único, sin contar dos veces lo asignado a CAF.
stock_fecha, cruzadas = None, 0
if op('--stock') and os.path.exists(op('--stock')):
    S = json.load(open(op('--stock'), encoding='utf-8'))
    tabla, stock_fecha = S.get('stock') or {}, S.get('fecha')
    if tabla:
        usado = {}
        if op('--caf') and os.path.exists(op('--caf')):
            for c in json.load(open(op('--caf'), encoding='utf-8')).get('lineas', []):
                if c.get('cruce') == 'OK' and c.get('cod'):
                    usado[c['cod']] = usado.get(c['cod'], 0) + max(0, c.get('asig') or 0)
        queda = {}
        for l in sorted(lineas, key=lambda x: (x['fecha'], str(x['pedido']), str(x['linea']))):
            if l['cruce'] != 'OK' or not l['cod']:
                continue
            c = l['cod']; v = tabla.get(c)
            total = max(0, v[0]) if isinstance(v, list) and v and isinstance(v[0], (int, float)) else 0  # no está en el SGA = no hay
            if c not in queda:
                queda[c] = max(0, total - usado.get(c, 0))
            a = min(queda[c], l['pend']); queda[c] -= a
            l['stock'], l['ubic'], l['asig'] = total, (v[1] if isinstance(v, list) and len(v) > 1 and isinstance(v[1], str) else '')[:40], a
            l['serv'] = 'listo' if a >= l['pend'] else ('parcial' if a > 0 else 'sin')
            cruzadas += 1

meta = D.get('meta', {})
res = {'export': meta.get('foto'), 'sage': (meta.get('cargas') or {}).get('sage'), 'stock_fecha': stock_fecha,
       'lineas': lineas, 'prev': {'fecha': meta.get('foto'), 'caf': None, 'items': list(prev.values())}}
def claves(o, acc):
    if isinstance(o, dict):
        for k, v in o.items(): acc.add(k.lower()); claves(v, acc)
    elif isinstance(o, list):
        for v in o: claves(v, acc)
    return acc
for k in claves({'l': lineas, 'p': list(prev.values())}, set()):
    assert not re.search(r'precio|eur|importe|factur|contrato|^val$|^pr$|^imp$|coste', k), 'el taller no lleva ' + k
json.dump(res, open(out, 'w', encoding='utf-8'), ensure_ascii=False)
print(json.dumps({'lineas': len(lineas), 'prev': len(prev), 'export': res['export'], 'stock': stock_fecha, 'con_stock': cruzadas}))
if op('--stock'):  # solo recuentos (el log de la publicación es público)
    print('AVISO stock Talgo del SGA %s: %d de %d líneas cruzan (código único); %d completas, %d en parte, %d sin stock' % (
        stock_fecha or '¿?', cruzadas, len(lineas), sum(l['serv'] == 'listo' for l in lineas), sum(l['serv'] == 'parcial' for l in lineas),
        sum(l['serv'] == 'sin' and l['stock'] is not None for l in lineas)))
