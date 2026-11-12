#!/usr/bin/env python3
"""Datos de PRUEBA para la app del taller (Fase 0). Todo inventado: pedidos PRUEBA-…, códigos 9990…,
plantas y descripciones ficticias. Nunca datos reales. Semilla fija: siempre la misma salida.
Uso: python gen_fixtures.py CARPETA_SALIDA [AAAA-MM-DD]"""
import sys, json, random, datetime, os

out = sys.argv[1]
hoy = datetime.date.fromisoformat(sys.argv[2]) if len(sys.argv) > 2 else datetime.date.today()
random.seed(41)
os.makedirs(out, exist_ok=True)

DESC = ['PLACA SOPORTE PRUEBA', 'CASQUILLO GUIA PRUEBA', 'FTH AISLANTE PRUEBA', 'PLACA BASE PRUEBA', 'CASQUILLO SEPARADOR PRUEBA',
        'PIEZA MJF PRUEBA', 'TAPA PRUEBA', 'REGLETA PRUEBA', 'ARANDELA PRUEBA', 'PERFIL PRUEBA', 'CUÑA PRUEBA', 'PANEL PRUEBA']
PLANTAS = ['Planta A (prueba)', 'Planta B (prueba)', 'Planta C (prueba)']

def lineas(emp, pref, n, codigos):
    L = []
    for i in range(n):
        art = codigos[i % len(codigos)]
        f = hoy + datetime.timedelta(days=random.randint(-12, 70))
        pedida = random.choice([5, 10, 20, 24, 40, 50, 100, 200])
        entregada = random.choice([0, 0, 0, pedida // 2])
        pend = pedida - entregada
        stock = None if emp == 'talgo' else random.choice([0, 0, pend, pend + 10, pend // 2, None])
        serv = 'sin'
        if stock is not None and stock >= pend: serv = 'listo'
        elif stock: serv = 'parcial'
        late = f < hoy
        L.append({
            'id': f'{pref}{i:04d}', 'pedido': f'PRUEBA-{4500000 + i // 3}', 'linea': 10 * (i % 3 + 1),
            'planta': random.choice(PLANTAS), 'empresa': emp.upper(), 'ref': f'REF-{art}', 'cod': art,
            'cruce': 'OK' if i % 17 else 'REVISAR', 'desc': DESC[i % len(DESC)], 'pedida': pedida, 'entregada': entregada,
            'pend': pend, 'asig': 0, 'env': 0, 'stock': stock, 'ubic': 'ALM-PRUEBA-%02d' % (i % 30) if stock else '',
            'serv': serv, 'fecha': f.isoformat(), 'fechaCAF': None, 'pactada': None, 'late': late,
            'dias': (hoy - f).days if late else 0})
    return L

def prev(codigos):
    items = []
    for c in codigos[:8]:
        sem = {}
        for w in range(4, 26, 3):
            d = hoy + datetime.timedelta(weeks=w); sem[(d - datetime.timedelta(days=d.weekday())).isoformat()] = random.choice([10, 20, 40])
        items.append({'cod': c, 'ref': f'REF-{c}', 'desc': 'PREVISION PRUEBA', 'sem': sem, 'stock': None, 'ubic': ''})
    return {'fecha': hoy.isoformat(), 'caf': None, 'items': items}

cc = [f'9990{n:08d}' for n in range(1, 25)]
tc = [f'9991{n:08d}' for n in range(1, 10)]
ts = datetime.datetime.combine(hoy, datetime.time(9, 12)).isoformat() + 'Z'
caf = {'ts': ts, 'export': hoy.isoformat(), 'stock_fecha': hoy.isoformat(), 'lineas': lineas('caf', 'C', 60, cc), 'prev': prev(cc),
       'taller': [['caf|' + cc[1], 'torno', 1], ['caf|' + cc[5], 'adit', 1], ['caf|' + cc[9], 'sub', 1]]}
talgo = {'export': hoy.isoformat(), 'sage': None, 'stock_fecha': None, 'lineas': lineas('talgo', 'T', 18, tc), 'prev': prev(tc)}
# v43 · Talgo: stock según SGA sin verificar (como el panel Talgo) en una de cada tres líneas, sin tocar stock ni serv
for i, l in enumerate(talgo['lineas']):
    l['stock'], l['serv'], l['asig'] = None, 'sin', 0
    if i % 3 == 0:
        u = [0, 8, 40][i % 9 // 3]
        a = min(u, l['pend'])
        l['sga'] = {'u': u, 'a': a, 'est': 'cubre' if a >= l['pend'] else ('parcial' if a else 'nada'), 'f': hoy.isoformat(),
                    'loc': ('ALMSUP0109PR: %d' % u) if u else ''}
json.dump(caf, open(os.path.join(out, 'caf.json'), 'w', encoding='utf-8'), ensure_ascii=False)
json.dump(talgo, open(os.path.join(out, 'talgo.json'), 'w', encoding='utf-8'), ensure_ascii=False)
print(json.dumps({'caf': len(caf['lineas']), 'talgo': len(talgo['lineas']), 'hoy': hoy.isoformat()}))
