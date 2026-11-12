#!/usr/bin/env python3
"""Adaptadores de entrada (Fase 1): cada origen de pedidos entrega líneas en el FORMATO COMÚN y marca su `origen`.

Orígenes: caf (panel CAF, taller_datos.js) · talgo (panel Talgo, talgo_datos.py) · manual (fichas "Otro trabajo" del plan,
se crean en la app: no pasan por aquí) · sage (Fase 5: solo documentado, ver `sage`).

Regla de oro: el adaptador NO inventa ni corrige datos. Copia lo que llega, añade `origen` y dice qué no cumple el
formato (avisos). taller_build.py publica igual y enseña los avisos; con --estricto (pruebas) un aviso hace fallar.
Nunca precios ni contratos: eso lo sigue comprobando taller_build.py por nombre de campo, para todos los orígenes."""
import re

ORIGENES = ('caf', 'talgo', 'manual', 'sage')
DIA = re.compile(r'^\d{4}-\d{2}-\d{2}$')
NUM = (int, float)

# Formato común de una línea abierta: campo -> (tipos válidos, obligatorio). None = puede venir vacío.
FORMATO = {
    'id': ((str,), True),            # único dentro de su origen
    'pedido': ((str, int), True),
    'linea': ((int, str), True),
    'planta': ((str,), False),
    'empresa': ((str,), False),
    'ref': ((str,), False),          # referencia / plano del cliente
    'cod': ((str, type(None)), False),  # código Bronymec (cruce con stock); vacío si no cruza
    'cruce': ((str, type(None)), False),  # OK | REVISAR | '' (sin cruce único no se usa el código)
    'desc': ((str,), True),
    'pedida': (NUM, False),
    'entregada': (NUM, False),
    'pend': (NUM, True),             # pendiente de servir
    'asig': (NUM + (type(None),), False),
    'env': (NUM + (type(None),), False),
    'stock': (NUM + (type(None),), False),  # None = no se sabe (nunca se inventa un 0)
    'ubic': ((str, type(None)), False),
    'serv': ((str, type(None)), False),
    'fecha': ((str,), True),         # AAAA-MM-DD: la fecha que manda para el taller
    'fechaCAF': ((str, type(None)), False),
    'pactada': ((str, type(None)), False),
    'late': ((bool,), False),
    'dias': (NUM + (type(None),), False),
    'sga': ((dict, type(None)), False),  # Talgo: stock según SGA SIN VERIFICAR (informativo, nunca en verde)
}


def avisos_linea(l):
    """Lista de lo que no cumple el formato común (vacía si está bien)."""
    if not isinstance(l, dict):
        return ['no es una línea']
    av = []
    for k, (tipos, oblig) in FORMATO.items():
        if k not in l or l[k] is None:
            if oblig:
                av.append('falta ' + k)
            continue
        if isinstance(l[k], bool) and bool not in tipos:
            av.append(k + ' no es ' + '/'.join(t.__name__ for t in tipos))
        elif not isinstance(l[k], tipos):
            av.append(k + ' no es ' + '/'.join(t.__name__ for t in tipos))
    if isinstance(l.get('fecha'), str) and not DIA.match(l['fecha']):
        av.append('fecha sin formato AAAA-MM-DD')
    for k in ('fechaCAF', 'pactada'):
        if isinstance(l.get(k), str) and l[k] and not DIA.match(l[k][:10]):
            av.append(k + ' sin formato de fecha')
    if isinstance(l.get('pend'), NUM) and not isinstance(l.get('pend'), bool) and l['pend'] < 0:
        av.append('pend negativo')
    # Regla 6 (Jon, 11/11 y 12/11/2026): stock ≥ pendiente = línea completa en verde, con el stock REPARTIDO entre las líneas
    # de la pieza como hace el panel (asig = lo asignado a esta línea). Si lo asignado cubre el pendiente y serv no es 'listo',
    # se avisa (no se corrige aquí). El stock total de la pieza no cuenta: puede estar ya asignado a otras líneas.
    asg, pe = l.get('asig'), l.get('pend')
    if isinstance(asg, NUM) and not isinstance(asg, bool) and isinstance(pe, NUM) and not isinstance(pe, bool) and pe > 0 and asg >= pe and l.get('serv') != 'listo':
        av.append('regla 6: asignado %s ≥ pendiente %s y no sale completa (serv=%s)' % (asg, pe, l.get('serv')))
    if l.get('origen') is not None and l['origen'] not in ORIGENES:
        av.append('origen desconocido')
    return av


def _adaptar(d, origen, nombre):
    if not isinstance(d, dict) or not isinstance(d.get('lineas'), list):
        raise ValueError('%s: no trae la lista de líneas' % origen)
    out = dict(d, nombre=nombre, origen=origen)
    lineas, avisos, vistos = [], [], set()
    for i, l in enumerate(d['lineas']):
        av = avisos_linea(l)
        if isinstance(l, dict):
            if l.get('id') in vistos:
                av.append('id repetido')
            vistos.add(l.get('id'))
            l = dict(l, origen=origen)
        for a in av:
            avisos.append('%s línea %s: %s' % (origen, l.get('id', i) if isinstance(l, dict) else i, a))
        lineas.append(l)
    out['lineas'] = lineas
    return out, avisos


def caf(d):
    """caf.json (taller_datos.js, del panel CAF) -> empresa CAF en formato común."""
    return _adaptar(d, 'caf', 'CAF')


def talgo(d):
    """talgo.json (talgo_datos.py, del panel Talgo) -> empresa Talgo en formato común."""
    return _adaptar(d, 'talgo', 'Talgo')


# ---------------------------------------------------------------------------------------------------------------
# Fase 5 · Sage (preparado, NO activo: taller_build.py no lo llama). Contrato en docs/FASE5_SAGE_Y_MATERIAL.md.
# Entrada: las filas de un export de pedidos de venta abiertos de Sage (una por línea), como lista de dicts con estas columnas.
SAGE_COLUMNAS = {
    'pedido': 'pedido', 'linea': 'linea', 'cliente': 'empresa', 'planta': 'planta', 'articulo': 'cod',
    'referencia': 'ref', 'descripcion': 'desc', 'pedida': 'pedida', 'servida': 'entregada', 'pendiente': 'pend', 'entrega': 'fecha',
}
SAGE_PROHIBIDAS = re.compile(r'precio|eur|importe|factur|contrato|coste|descuento|dto|iva|total|tarifa', re.I)
_FECHA_ES = re.compile(r'^(\d{1,2})[/.-](\d{1,2})[/.-](\d{4})$')


def _sage_num(v):
    if isinstance(v, bool):
        return None
    if isinstance(v, NUM):
        return v
    if isinstance(v, str) and re.fullmatch(r'-?\d{1,3}(\.\d{3})*(,\d+)?|-?\d+(,\d+)?|-?\d+(\.\d+)?', v.strip()):
        t = v.strip()
        t = t.replace('.', '').replace(',', '.') if ',' in t or re.fullmatch(r'-?\d{1,3}(\.\d{3})+', t) else t
        x = float(t)
        return int(x) if x == int(x) else x
    return None


def _sage_fecha(v):
    if isinstance(v, str):
        v = v.strip()
        if DIA.match(v):
            return v
        m = _FECHA_ES.match(v)
        if m:
            d, mth, y = int(m.group(1)), int(m.group(2)), int(m.group(3))
            import datetime
            try:
                return datetime.date(y, mth, d).isoformat()
            except ValueError:
                return None
    return None


def sage_filas(filas, articulos=None):
    """Filas del export de Sage -> {'lineas': [...]} en formato común (sin `origen`; lo pone `sage`).
    `articulos`: códigos Bronymec que existen (para el cruce). Nada se inventa: una fila que no se entiende NO entra
    y se dice por qué; un artículo que no está en `articulos` entra sin código (cruce ''), igual que en CAF y Talgo.
    Las columnas de precios o importes no se copian nunca (y se avisa de que venían)."""
    if not isinstance(filas, list):
        raise ValueError('sage: hacen falta las filas del export')
    arts = set(articulos or [])
    lineas, avisos, vistas_prohibidas = [], [], set()
    for i, f in enumerate(filas, 1):
        if not isinstance(f, dict):
            avisos.append('sage fila %d: no es una fila' % i)
            continue
        for k in f:
            if SAGE_PROHIBIDAS.search(str(k)):
                vistas_prohibidas.add(str(k))
        x = {d: f.get(o) for o, d in SAGE_COLUMNAS.items()}
        pend, pedida, serv = _sage_num(x['pend']), _sage_num(x['pedida']), _sage_num(x['entregada'])
        fecha, lin = _sage_fecha(x['fecha']), _sage_num(x['linea'])
        malo = [k for k, v in (('pedido', x['pedido']), ('descripcion', x['desc'])) if not (isinstance(v, (str, int)) and str(v).strip())]
        if pend is None or pend < 0:
            malo.append('pendiente')
        if fecha is None:
            malo.append('entrega')
        if lin is None:
            malo.append('linea')
        if malo:
            avisos.append('sage fila %d: no entra (%s)' % (i, ', '.join(malo)))
            continue
        cod = str(x['cod']).strip() if x['cod'] not in (None, '') else ''
        cruce = 'OK' if cod and cod in arts else ''
        lineas.append({
            'id': 'S%s-%s' % (str(x['pedido']).strip(), lin), 'pedido': str(x['pedido']).strip(), 'linea': lin,
            'planta': str(x['planta'] or '').strip(), 'empresa': str(x['empresa'] or '').strip(),
            'ref': str(x['ref'] or '').strip(), 'cod': cod if cruce else None, 'cruce': cruce,
            'desc': str(x['desc']).strip(), 'pedida': pedida, 'entregada': serv, 'pend': pend,
            'asig': None, 'env': None, 'stock': None, 'ubic': None, 'serv': None, 'fecha': fecha,
            'fechaCAF': None, 'pactada': None, 'late': None, 'dias': None, 'sga': None})
        if lineas[-1]['late'] is None:
            del lineas[-1]['late']
    if vistas_prohibidas:
        avisos.append('sage: columnas de precio o importe descartadas: ' + ', '.join(sorted(vistas_prohibidas)))
    return {'lineas': lineas}, avisos


def sage(d, activo=False):
    """Fase 5. Con activo=False (hoy) falla a propósito: Sage no entra en la web hasta que Jon decida qué clientes y qué export.
    Con activo=True (pruebas del contrato): {'filas': [...], 'articulos': [...]} -> empresa en formato común, origen 'sage'."""
    if not activo:
        raise NotImplementedError('Sage es la Fase 5: adaptador documentado y probado, todavía sin datos de entrada reales')
    if not isinstance(d, dict):
        raise ValueError('sage: entrada sin forma')
    base, av0 = sage_filas(d.get('filas'), d.get('articulos'))
    out, av = _adaptar(dict(base, export=d.get('export')), 'sage', 'Sage')
    return out, av0 + av


# ---------------------------------------------------------------------------------------------------------------
# Fase 5 · Semáforo de material (preparado, NO activo). ¿Hay material para fabricar lo que falta de cada pieza?
# Entrada: necesidades por pieza {cod: {'mat': 'PA6 Ø40', 'necesario': kg o barras}} y existencias {mat: disponible}.
# Salida por pieza: 'verde' (hay de sobra) · 'ambar' (llega justo: menos del 20 % de margen) · 'rojo' (no llega) ·
# None (sin dato: no se sabe el material o su existencia; nunca se supone que hay). Lo necesario se reparte por orden
# de entrega, como el stock en la regla 6.
def semaforo_material(necesidades, existencias):
    if not isinstance(necesidades, list) or not isinstance(existencias, dict):
        raise ValueError('semáforo: entrada sin forma')
    quedan = {k: v for k, v in existencias.items() if isinstance(v, NUM) and not isinstance(v, bool) and v >= 0}
    out = {}
    for n in sorted((x for x in necesidades if isinstance(x, dict)), key=lambda x: (str(x.get('fecha') or '9999'), str(x.get('cod')))):
        cod, mat, nec = n.get('cod'), n.get('mat'), n.get('necesario')
        if not cod:
            continue
        if not mat or mat not in quedan or not isinstance(nec, NUM) or isinstance(nec, bool) or nec < 0:
            out[cod] = None
            continue
        hay = quedan[mat]
        out[cod] = 'rojo' if hay < nec else 'ambar' if hay < nec * 1.2 else 'verde'
        quedan[mat] = max(0, hay - nec)
    return out
