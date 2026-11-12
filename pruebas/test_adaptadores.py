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
        l = dict(self.caf['lineas'][0], stock=50, pend=20, serv='parcial')
        self.assertTrue(any('regla 6' in x for x in A.avisos_linea(l)), 'stock ≥ pendiente tiene que salir completa')
        self.assertFalse(any('regla 6' in x for x in A.avisos_linea(dict(l, serv='listo'))))
        self.assertFalse(any('regla 6' in x for x in A.avisos_linea(dict(l, stock=None))), 'sin stock conocido no se supone nada')
        d = copy.deepcopy(self.talgo); d['lineas'][1]['id'] = d['lineas'][0]['id']
        self.assertTrue(any('id repetido' in x for x in A.talgo(d)[1]))

    def test_sin_lineas_falla(self):
        with self.assertRaises(ValueError):
            A.caf({'export': 'x'})

    def test_sage_preparado_pero_no_activo(self):
        self.assertIn('sage', A.ORIGENES)
        with self.assertRaises(NotImplementedError):
            A.sage({})

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
        self.assertIn('AVISO formato: 1 líneas', r.stderr)
        self.assertNotIn(d['lineas'][0]['id'], r.stderr, 'el log de la publicación es público: sin ids ni cantidades')
        self.assertIn(d['lineas'][0]['id'], run('taller_build.py', 'taller_app.html', out, '--caf', f, '--detalle').stderr)
        r = run('taller_build.py', 'taller_app.html', out, '--caf', f, '--estricto', ok=False)
        self.assertNotEqual(r.returncode, 0)


if __name__ == '__main__':
    unittest.main()
