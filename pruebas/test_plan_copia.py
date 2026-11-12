#!/usr/bin/env python3
"""Pruebas de la copia del plan compartido y de su restauración (plan_copia.py). Datos y contraseña de PRUEBA inventados.
La de restauración con contraseña necesita cryptography (se salta si no está; en el CI está)."""
import os, sys, json, base64, hashlib, shutil, tempfile, subprocess, unittest

K = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
PY = sys.executable
SCRIPT = os.path.join(K, 'plan_copia.py')
SAL = os.path.join(K, 'SAL')
try:
    import cryptography  # noqa: F401
    CRYPTO = os.path.dirname(os.path.dirname(cryptography.__file__))
except Exception:
    CRYPTO = None


def run(*a, env=None, aislado=True):
    e = dict(os.environ, PYTHONIOENCODING='utf-8', **(env or {}))
    cmd = [PY] + (['-I'] if aislado else []) + ['-X', 'utf8', SCRIPT, *a]
    return subprocess.run(cmd, capture_output=True, text=True, encoding='utf-8', env=e)


def cifrar_plan(d, clave, ts='2026-11-11T08:00:00Z'):
    """Igual que la app: tl.k = PBKDF2(contraseña, SAL); llave del plan = HKDF(tl.k); AES-GCM."""
    from cryptography.hazmat.primitives.ciphers.aead import AESGCM
    from cryptography.hazmat.primitives.kdf.hkdf import HKDF
    from cryptography.hazmat.primitives import hashes
    salt = base64.b64decode(open(SAL).read().strip())
    tlk = hashlib.pbkdf2_hmac('sha256', clave.encode(), salt, 600000, 32)
    k = HKDF(algorithm=hashes.SHA256(), length=32, salt=b'bronymec-taller', info=b'plan-compartido-v1').derive(tlk)
    iv = os.urandom(12)
    ct = AESGCM(k).encrypt(iv, json.dumps({'d': d, 'mt': {}, 'ts': ts}).encode(), None)
    return json.dumps({'v': 1, 'iv': base64.b64encode(iv).decode(), 'ct': base64.b64encode(ct).decode()}).encode()


def plan_falso():
    return json.dumps({'v': 1, 'iv': base64.b64encode(os.urandom(12)).decode(), 'ct': base64.b64encode(os.urandom(80)).decode()}).encode()


class CopiaPlan(unittest.TestCase):
    def setUp(self):
        self.t = tempfile.mkdtemp(prefix='copia-')
        self.vivo, self.cop = os.path.join(self.t, 'vivo'), os.path.join(self.t, 'copias')
        os.makedirs(self.vivo); os.makedirs(self.cop)
        open(os.path.join(self.cop, 'LEEME.md'), 'w').write('copias de otras cosas: no se tocan\n')
        self.esc('plan.json', plan_falso()); self.esc('tipos.json', b'{"v":1,"tipo":{}}'); self.esc('panel-cambios.json', b'{"v":1,"cambios":[]}')

    def tearDown(self):
        shutil.rmtree(self.t, ignore_errors=True)

    def esc(self, f, b):
        open(os.path.join(self.vivo, f), 'wb').write(b)

    def copia(self, ahora):
        return run('copiar', self.vivo, self.cop, '--ahora', ahora)

    def ficheros(self):
        return sorted(os.path.relpath(os.path.join(r, f), self.cop).replace(os.sep, '/') for r, _, fs in os.walk(self.cop) for f in fs)

    def test_copia_y_se_puede_restaurar_byte_a_byte(self):
        r = self.copia('2026-11-11T15:40')
        self.assertEqual(r.returncode, 0, r.stdout + r.stderr)
        self.assertTrue(r.stdout.startswith('🟢'))
        for f in ['plan.json', 'tipos.json', 'panel-cambios.json']:
            orig = open(os.path.join(self.vivo, f), 'rb').read()
            self.assertEqual(open(os.path.join(self.cop, 'plan', '2026-11-11', '1540Z-' + f), 'rb').read(), orig)
            self.assertEqual(open(os.path.join(self.cop, 'plan', 'ultima', f), 'rb').read(), orig)
        self.assertIn('LEEME.md', self.ficheros(), 'lo que ya había en la rama copias no se toca')
        self.assertTrue(open(os.path.join(self.cop, 'plan-ultima.txt'), encoding='utf-8').read().startswith('🟢'))

    def test_foto_diaria_de_gerencia_tambien_se_copia(self):
        h = plan_falso(); self.esc('hist.json', h)
        r = self.copia('2026-11-12T09:40')
        self.assertEqual(r.returncode, 0, r.stdout + r.stderr)
        self.assertEqual(open(os.path.join(self.cop, 'plan', 'ultima', 'hist.json'), 'rb').read(), h)
        self.esc('hist.json', b'{"no": "cifrado"}')
        r = self.copia('2026-11-12T10:40')
        self.assertNotEqual(r.returncode, 0); self.assertIn('hist.json ilegible', r.stdout)
        self.assertEqual(open(os.path.join(self.cop, 'plan', 'ultima', 'hist.json'), 'rb').read(), h, 'una foto ilegible no pisa la buena')

    def test_sin_cambios_no_duplica(self):
        self.copia('2026-11-11T15:40'); antes = self.ficheros()
        est = os.path.join(self.cop, 'plan-ultima.txt'); linea = open(est, encoding='utf-8').read()
        r = self.copia('2026-11-11T16:40')
        self.assertIn('sin cambios', r.stdout)
        self.assertEqual(self.ficheros(), antes)
        self.assertEqual(open(est, encoding='utf-8').read(), linea, 'sin cambios el mismo día no hay commit nuevo')
        self.copia('2026-11-12T07:40')
        self.assertIn('2026-11-12', open(est, encoding='utf-8').read(), 'una vez al día sí se renueva (se ve que sigue viva)')

    def test_workflow_listo_para_instalar(self):
        wf = open(os.path.join(K, 'instalar', 'taller-plan', '.github', 'workflows', 'copia-plan.yml'), encoding='utf-8').read()
        self.assertIn('vivo/.github/copia/plan_copia.py copiar vivo copias', wf)
        self.assertIn('ref: copias', wf); self.assertNotIn('secrets.', wf, 'la copia no usa ningún secreto')
        self.assertIn('exit $rc', wf, 'si sale rojo, el workflow falla y GitHub avisa')

    def test_solo_copia_lo_que_cambia(self):
        self.copia('2026-11-11T15:40'); self.esc('plan.json', plan_falso())
        r = self.copia('2026-11-11T16:40')
        self.assertIn('copiado: plan.json', r.stdout)
        self.assertIn('plan/2026-11-11/1640Z-plan.json', self.ficheros())
        self.assertNotIn('plan/2026-11-11/1640Z-tipos.json', self.ficheros())

    def test_plan_ilegible_no_pisa_la_ultima_buena(self):
        self.copia('2026-11-11T15:40'); buena = open(os.path.join(self.cop, 'plan', 'ultima', 'plan.json'), 'rb').read()
        for malo in [b'{"v":1,"iv":"xx","ct":""}', b'no es json', b'{"v":1,"iv":"AAAAAAAAAAAAAAAA","ct":""}', b'']:
            with self.subTest(malo=malo):
                self.esc('plan.json', malo)
                r = self.copia('2026-11-11T16:40')
                self.assertEqual(r.returncode, 1)
                self.assertTrue(r.stdout.startswith('🔴'), r.stdout)
                self.assertEqual(open(os.path.join(self.cop, 'plan', 'ultima', 'plan.json'), 'rb').read(), buena)
                self.assertEqual(open(os.path.join(self.cop, 'plan', '2026-11-11', '1640Z-ilegible-plan.json'), 'rb').read(), malo)
                self.assertTrue(open(os.path.join(self.cop, 'plan-ultima.txt'), encoding='utf-8').read().startswith('🔴'))

    def test_falta_plan_es_rojo(self):
        os.remove(os.path.join(self.vivo, 'plan.json'))
        r = self.copia('2026-11-11T15:40')
        self.assertEqual(r.returncode, 1); self.assertIn('falta plan.json', r.stdout)

    def test_poda_deja_una_por_dia_pasados_30_dias(self):
        self.copia('2026-09-01T08:00'); self.esc('plan.json', plan_falso()); self.copia('2026-09-01T09:00')
        self.esc('plan.json', plan_falso()); self.copia('2026-11-10T09:00')
        self.esc('plan.json', plan_falso()); self.copia('2026-11-10T10:00')
        fs = self.ficheros()
        self.assertIn('plan/2026-09-01/0800Z-plan.json', fs)
        self.assertNotIn('plan/2026-09-01/0900Z-plan.json', fs, 'lo de hace más de 30 días se queda en una por día')
        self.assertIn('plan/2026-11-10/0900Z-plan.json', fs); self.assertIn('plan/2026-11-10/1000Z-plan.json', fs)

    def test_comprobar(self):
        p = os.path.join(self.vivo, 'plan.json')
        self.assertEqual(run('comprobar', p).returncode, 0)
        self.esc('plan.json', b'{"v":2}')
        self.assertEqual(run('comprobar', p).returncode, 1)

    @unittest.skipUnless(CRYPTO, 'sin cryptography')
    def test_restaurar_con_la_contrasena(self):
        clave = 'prueba-' + os.urandom(8).hex()
        d = {'i:a1': {'id': 'a1'}, 'i:a2': {'id': 'a2'}, 't:caf|9': {'ts': 'x'}, 'n:x': 'nota', 'm:maq': [{'id': 'h1'}, {'id': 'h2'}]}
        self.esc('plan.json', cifrar_plan(d, clave))
        self.assertEqual(self.copia('2026-11-11T15:40').returncode, 0)
        copia = os.path.join(self.cop, 'plan', '2026-11-11', '1540Z-plan.json')
        env = {'TALLER_CLAVE': clave, 'PYTHONPATH': CRYPTO}
        r = run('leer', copia, '--sal', SAL, env=env, aislado=False)
        self.assertEqual(r.returncode, 0, r.stdout + r.stderr)
        self.assertIn('2 fichas', r.stdout); self.assertIn('1 terminadas', r.stdout); self.assertIn('2 máquinas', r.stdout)
        self.assertNotIn('nota', r.stdout.replace('notas', ''), 'nunca enseña el contenido')
        r = run('leer', copia, '--sal', SAL, env=dict(env, TALLER_CLAVE='otra-contraseña'), aislado=False)
        self.assertEqual(r.returncode, 1); self.assertIn('no se puede descifrar', r.stdout)

    @unittest.skipUnless(CRYPTO and os.environ.get('PLAN_DE_LA_APP'), 'sin plan escrito por la app (lo deja plan_seguro.js)')
    def test_restaurar_un_plan_escrito_por_la_app(self):
        """El navegador escribe el plan y Python lo restaura: mismo cifrado en los dos lados."""
        r = run('leer', os.environ['PLAN_DE_LA_APP'], '--sal', SAL, env={'PYTHONPATH': CRYPTO}, aislado=False)
        self.assertEqual(r.returncode, 0, r.stdout + r.stderr)
        self.assertIn('1 fichas', r.stdout)


if __name__ == '__main__':
    unittest.main()
