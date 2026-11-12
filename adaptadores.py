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


def sage(d):
    """Fase 5 (preparado, no activo). Entrada prevista: export de pedidos de venta abiertos de Sage (sin precios),
    una fila por línea. Mapa previsto al formato común: nº pedido -> pedido, nº línea -> linea, artículo -> cod
    (cruce 'OK' solo si el artículo existe y es único), descripción -> desc, cantidad pendiente -> pend,
    fecha de entrega -> fecha (AAAA-MM-DD), cliente -> empresa. Columnas de precio/importe: se descartan en origen.
    Hasta que Jon decida qué clientes entran por Sage y con qué export, no se inventa nada: falla a propósito."""
    raise NotImplementedError('Sage es la Fase 5: adaptador documentado, todavía sin datos de entrada')
