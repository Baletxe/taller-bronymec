#!/usr/bin/env python3
"""Pruebas de los adaptadores de entrada (adaptadores.py) y de su paso por taller_build.py. Datos de PRUEBA inventados."""
import os, sys, json, copy, tempfile, subprocess, unittest

K = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
sys.path.insert(0, K)
import adaptadores as A  # noqa: E402

PY = sys.executable


def run(*a, ok=True):
    r = subprocess.run([PY, '-I', '-X', 'utf8', *a], cwd=K, capture_output=True, text=True, encoding='utf-8', env=dict(os.environ, PYTHONIOENCODING='utf-8'))
    if ok and r.returncode != 0:
        raise AssertionError('falló %s\n%s\n%s' % (a, r.stdout, r.stderr))
    return r


class Adaptadores(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.tmp = tempfile.mkdtemp(prefix='adapt-')
        run(os.path.join(K, 'pruebas', 'gen_fixtures.py'), cls.tmp, '2026-11-11')
        cls.caf = json.load(open(os.path.join(cls.tmp, 'caf.json'), encoding='utf-8'))
        cls.talgo = json.load(open(os.path.join(cls.tmp, 'talgo.json'), encoding='utf-8'))

    def test_datos_de_prueba_cumplen_el_formato(self):
        for f, d in ((A.caf, self.caf), (A.talgo, self.talgo)):
            e, av = f(copy.deepcopy(d))
            self.assertEqual(av, [], av[:5])
            self.assertTrue(all(l['origen'] == e['origen'] for l in e['lineas']))

    def test_no_inventa_ni_quita_nada(self):
        d = copy.deepcopy(self.caf); d['lineas'][0]['stock'] = None; d['lineas'][1]['fecha'] = '17/12/2026'
        e, av = A.caf(d)
        self.assertEqual(len(e['lineas']), len(d['lineas']), 'ninguna línea se quita')
        self.assertIsNone(e['lineas'][0]['stock'], 'un stock desconocido no se convierte en 0')
        self.assertEqual(e['lineas'][1]['fecha'], '17/12/2026', 'no se corrige a ojo: se avisa')
        self.assertTrue(any('fecha sin formato' in x for x in av))
        for k in d['lineas'][2]:
            self.assertEqual(e['lineas'][2][k], d['lineas'][2][k])
        self.assertNotIn('origen', d['lineas'][0], 'la entrada no se modifica')

    def test_avisos(self):
        casos = [({'pend': -1}, 'pend negativo'), ({'pend': True}, 'pend no es'), ({'desc': None}, 'falta desc'),
                 ({'id': 5}, 'id no es'), ({'stock': '3'}, 'stock no es'), ({'origen': 'otro'}, 'origen desconocido')]
        for cambio, esperado in casos:
            with self.subTest(cambio=cambio):
                l = dict(self.caf['lineas'][0], **cambio)
                self.assertTrue(any(esperado in x for x in A.avisos_linea(l)), A.avisos_linea(l))
        l = dict(self.caf['lineas'][0], stock=50, asig=20, pend=20, serv='parcial')
        self.assertTrue(any('regla 6' in x for x in A.avisos_linea(l)), 'lo asignado cubre el pendiente: tiene que salir completa')
        self.assertFalse(any('regla 6' in x for x in A.avisos_linea(dict(l, serv='listo'))))
        self.assertFalse(any('regla 6' in x for x in A.avisos_linea(dict(l, asig=5))), 'stock total de sobra pero repartido a otras líneas: no es completa (decisión de Jon 12/11)')
        self.assertFalse(any('regla 6' in x for x in A.avisos_linea(dict(l, asig=None))), 'sin reparto conocido no se supone nada')
        d = copy.deepcopy(self.talgo); d['lineas'][1]['id'] = d['lineas'][0]['id']
        self.assertTrue(any('id repetido' in x for x in A.talgo(d)[1]))

    def test_sin_lineas_falla(self):
        with self.assertRaises(ValueError):
            A.caf({'export': 'x'})

    def test_sage_preparado_pero_no_activo(self):
        self.assertIn('sage', A.ORIGENES)
        with self.assertRaises(NotImplementedError):
            A.sage({})

    # ---- Fase 5 · contrato del adaptador de Sage (con activo=True; en la web sigue apagado) ----
    FILAS = [
        {'pedido': 'PV-1', 'linea': '10', 'cliente': 'Cliente Uno', 'planta': 'Elgoibar', 'articulo': '999000000001', 'referencia': 'P-77',
         'descripcion': 'PLACA PRUEBA', 'pedida': '1.200', 'servida': '200', 'pendiente': '1.000', 'entrega': '20/11/2026', 'precio': '3,40', 'Importe total': '3400'},
        {'pedido': 'PV-1', 'linea': 20, 'cliente': 'Cliente Uno', 'articulo': 'NOEXISTE', 'descripcion': 'CASQUILLO', 'pendiente': 5, 'entrega': '2026-12-01'},
        {'pedido': 'PV-2', 'linea': 10, 'descripcion': 'SIN FECHA', 'pendiente': 3, 'entrega': ''},
        {'pedido': 'PV-3', 'linea': 10, 'descripcion': 'FECHA IMPOSIBLE', 'pendiente': 3, 'entrega': '31/02/2026'},
        {'pedido': 'PV-4', 'linea': 10, 'descripcion': '', 'pendiente': 3, 'entrega': '2026-12-01'},
        {'pedido': 'PV-5', 'linea': 10, 'descripcion': 'NEGATIVO', 'pendiente': '-2', 'entrega': '2026-12-01'},
        'basura',
    ]

    def test_sage_contrato_formato_comun(self):
        e, av = A.sage({'filas': copy.deepcopy(self.FILAS), 'articulos': ['999000000001']}, activo=True)
        self.assertEqual(e['origen'], 'sage'); self.assertEqual(len(e['lineas']), 2)
        l1, l2 = e['lineas']
        self.assertEqual((l1['pedido'], l1['linea'], l1['pend'], l1['pedida'], l1['fecha'], l1['cod'], l1['cruce']), ('PV-1', 10, 1000, 1200, '2026-11-20', '999000000001', 'OK'))
        self.assertEqual(l1['origen'], 'sage'); self.assertIsNone(l1['stock'], 'el stock no se inventa')
        self.assertEqual((l2['cod'], l2['cruce']), (None, ''), 'artículo que no existe: sin código, como en CAF y Talgo')
        self.assertEqual([x for x in av if x.startswith('sage línea')], [], av)

    def test_sage_no_entra_lo_que_no_se_entiende_y_lo_dice(self):
        _, av = A.sage({'filas': copy.deepcopy(self.FILAS)}, activo=True)
        txt = ' | '.join(av)
        for n, por in ((3, 'entrega'), (4, 'entrega'), (5, 'descripcion'), (6, 'pendiente'), (7, 'no es una fila')):
            self.assertRegex(txt, 'fila %d: [^|]*%s' % (n, por))

    def test_sage_nunca_copia_precios(self):
        e, av = A.sage({'filas': copy.deepcopy(self.FILAS)}, activo=True)
        txt = json.dumps(e, ensure_ascii=False).lower()
        for k in ('precio', 'importe', '3,40', '3400'):
            self.assertNotIn(k, txt)
        self.assertTrue(any('descartadas' in x and 'precio' in x for x in av))

    def test_sage_pasa_el_guardian_de_precios_de_taller_build(self):
        e, _ = A.sage({'filas': copy.deepcopy(self.FILAS)}, activo=True)
        acc = set()
        def claves(o):
            if isinstance(o, dict):
                for k, v in o.items(): acc.add(k.lower()); claves(v)
            elif isinstance(o, list):
                for v in o: claves(v)
        claves(e)
        import re
        self.assertFalse([k for k in acc if re.search(r'precio|eur|importe|factur|contrato|^val$|^pr$|^imp$|coste', k)])

    def test_semaforo_material(self):
        nec = [{'cod': 'A', 'mat': 'PA6', 'necesario': 10, 'fecha': '2026-11-20'}, {'cod': 'B', 'mat': 'PA6', 'necesario': 7, 'fecha': '2026-11-25'},
               {'cod': 'C', 'mat': 'POM', 'necesario': 4, 'fecha': '2026-11-21'}, {'cod': 'D', 'mat': 'PTFE', 'necesario': 1},
               {'cod': 'E', 'mat': None, 'necesario': 1}, {'cod': 'F', 'mat': 'PET', 'necesario': 10}]
        r = A.semaforo_material(nec, {'PA6': 16, 'POM': 4.5, 'PET': 20, 'PTFE': 'mucho'})
        self.assertEqual(r, {'A': 'verde', 'B': 'rojo', 'C': 'ambar', 'D': None, 'E': None, 'F': 'verde'})
        with self.assertRaises(ValueError):
            A.semaforo_material({}, {})

    def test_build_lleva_origen_y_avisa(self):
        out = os.path.join(self.tmp, 't.html')
        r = run('taller_build.py', 'taller_app.html', out, '--caf', os.path.join(self.tmp, 'caf.json'), '--talgo', os.path.join(self.tmp, 'talgo.json'), '--estricto')
        self.assertEqual(json.loads(r.stdout.strip().splitlines()[-1])['avisos'], 0)
        h = open(out, encoding='utf-8').read()
        self.assertIn('"origen":"caf"', h); self.assertIn('"origen":"talgo"', h)
        d = copy.deepcopy(self.caf); d['lineas'][0]['fecha'] = 'mañana'
        f = os.path.join(self.tmp, 'caf_mal.json'); json.dump(d, open(f, 'w', encoding='utf-8'))
        r = run('taller_build.py', 'taller_app.html', out, '--caf', f)
        self.assertEqual(json.loads(r.stdout.strip().splitlines()[-1])['avisos'], 1, 'sin --estricto publica igual y lo cuenta')
        self.assertIn('AVISO formato: 1 líneas no cumplen el formato común (1 × fecha sin formato AAAA-MM-DD)', r.stderr)
        self.assertNotIn(d['lineas'][0]['id'], r.stderr, 'el log de la publicación es público: sin ids ni cantidades')
        self.assertIn(d['lineas'][0]['id'], run('taller_build.py', 'taller_app.html', out, '--caf', f, '--detalle').stderr)
        r = run('taller_build.py', 'taller_app.html', out, '--caf', f, '--estricto', ok=False)
        self.assertNotEqual(r.returncode, 0)


if __name__ == '__main__':
    unittest.main()
