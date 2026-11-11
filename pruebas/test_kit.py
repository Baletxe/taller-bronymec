#!/usr/bin/env python3
"""Pruebas del kit (solo biblioteca estándar). Uso: python3 -m unittest discover -s pruebas -v
Comprueban lo que no se puede romper: src/ = taller_app.html, montaje con datos de prueba, nada de precios,
el contrato de los datos y la lista de talleres en todos los sitios."""
import os, re, sys, json, subprocess, tempfile, unittest

K = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
PY = sys.executable
TALLERES = ['fresa', 'torno', 'secc', 'sub', 'adit']

def run(*a, ok=True):
    env = dict(os.environ, PYTHONUTF8='1', PYTHONIOENCODING='utf-8')  # rutas con tilde en Windows (-I ignora PYTHON*: por eso también -X utf8)
    r = subprocess.run([PY, '-I', '-X', 'utf8', *a], cwd=K, capture_output=True, text=True, encoding='utf-8', env=env)
    if ok and r.returncode != 0:
        raise AssertionError('falló %s\n%s\n%s' % (a, r.stdout, r.stderr))
    return r

class Kit(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.tmp = tempfile.mkdtemp(prefix='kit-')
        run(os.path.join(K, 'pruebas', 'gen_fixtures.py'), cls.tmp, '2026-11-11')

    def test_src_igual_a_taller_app(self):
        run('build_app.py', '--comprobar')

    def test_monta_con_datos_de_prueba(self):
        out = os.path.join(self.tmp, 'taller.html')
        r = run('taller_build.py', 'taller_app.html', out, '--caf', os.path.join(self.tmp, 'caf.json'), '--talgo', os.path.join(self.tmp, 'talgo.json'))
        info = json.loads(r.stdout.strip().splitlines()[-1])
        self.assertEqual(info['empresas'], {'caf': 60, 'talgo': 18})
        self.assertFalse(info['plan'], 'sin --plan-token no puede llevar acceso al plan')
        h = open(out, encoding='utf-8').read()
        self.assertIn('Content-Security-Policy', h)
        self.assertNotIn('/*__DATOS__*/null', h)

    def test_artifact_sin_esqueleto_ni_acceso(self):
        out = os.path.join(self.tmp, 'art.html')
        tk = os.path.join(self.tmp, 'tk'); open(tk, 'w').write('github_pat_' + 'A' * 40)
        run('taller_build.py', 'taller_app.html', out, '--caf', os.path.join(self.tmp, 'caf.json'), '--plan-token', tk, '--artifact')
        h = open(out, encoding='utf-8').read()
        self.assertNotIn('github_pat_' + 'A' * 40, h, 'la copia de Claude nunca lleva el acceso al plan')
        self.assertNotIn('<head>', h)

    def test_nunca_precios(self):
        for campo in ['precio', 'importe', 'eur', 'factura', 'contrato', 'coste', 'val', 'pr', 'imp']:
            with self.subTest(campo=campo):
                d = json.load(open(os.path.join(self.tmp, 'caf.json'), encoding='utf-8'))
                d['lineas'][0][campo] = 1
                f = os.path.join(self.tmp, 'malo.json'); json.dump(d, open(f, 'w', encoding='utf-8'))
                r = run('taller_build.py', 'taller_app.html', os.path.join(self.tmp, 'x.html'), '--caf', f, ok=False)
                self.assertNotEqual(r.returncode, 0, campo + ' no debe pasar')
                self.assertIn('el taller no lleva', r.stderr)

    def test_talleres_iguales_en_todos_los_sitios(self):
        """Aditiva (v26) se escapó en taller_datos.js: un taller nuevo tiene que estar en todas las listas."""
        js = open(os.path.join(K, 'taller_datos.js'), encoding='utf-8').read()
        self.assertRegex(js, r'\^\(fresa\|torno\|secc\|sub\|adit\)\$')
        sy = open(os.path.join(K, 'sincronizar_talleres.py'), encoding='utf-8').read()
        self.assertEqual(sorted(re.search(r'OK_T = \{([^}]*)\}', sy).group(1).replace('"', '').replace(' ', '').split(',')), sorted(TALLERES))
        app = open(os.path.join(K, 'taller_app.html'), encoding='utf-8').read()
        sec = re.search(r'SEC_OK = \{([^}]*)\}', app).group(1)
        self.assertEqual(sorted(x.split(':')[0].strip() for x in sec.split(',')), sorted(TALLERES))

    def test_sincronizar_talleres(self):
        t = os.path.join(self.tmp, 'tipos.json'); db = os.path.join(self.tmp, 'dbt'); os.makedirs(db, exist_ok=True)
        json.dump({'v': 1, 'tipo': {'caf|9990001': {'t': 'adit', 'ts': 5}, 'caf|9990002': {'t': 'torno', 'ts': 1}, 'x|mal': {'t': 'fresa'}, 'caf|9990003': {'t': 'raro'}},
                   'reglas': [{'w': 'CASQUILLO', 't': 'torno'}]}, open(t, 'w'))
        json.dump({'emp': 'caf', 'key': '9990002', 't': 'fresa', 'ts': 9}, open(os.path.join(db, 'caf.9990002.json'), 'w'))
        out = os.path.join(self.tmp, 'w.json')
        run('sincronizar_talleres.py', t, db, out)
        w = json.load(open(out, encoding='utf-8'))
        ids = [x['doc_id'] for x in w]
        self.assertIn('caf.9990001', ids, 'aditiva se escribe en el panel')
        self.assertNotIn('caf.9990002', ids, 'el panel más reciente gana')
        self.assertTrue(all(not i.startswith('x.') and i != 'caf.9990003' for i in ids))

    @unittest.skipUnless(os.environ.get('KIT_PUBLICAR'), 'VERSION se sube al publicar (la compara la pasada horaria); en CI de publicación se exige')
    def test_version_y_leeme_al_dia(self):
        v = open(os.path.join(K, 'VERSION')).read().strip()
        app = open(os.path.join(K, 'taller_app.html'), encoding='utf-8').read()
        log = subprocess.run(['git', 'log', '-1', '--format=%s', '--grep=^Kit v'], cwd=K, capture_output=True, text=True).stdout
        m = re.search(r'Kit v(\d+)', log)
        if m:
            self.assertGreaterEqual(int(v), int(m.group(1)), 'VERSION (%s) va por detrás del último "Kit v%s"' % (v, m.group(1)))
        leeme = open(os.path.join(K, 'LEEME.md'), encoding='utf-8').read()
        self.assertIn('v' + v, leeme, 'LEEME.md no tiene la nota de la v' + v)

if __name__ == '__main__':
    unittest.main()
