#!/usr/bin/env python3
"""Cambio de la contraseña del taller (cambiar_clave.py): el plan recifrado es idéntico, solo abre con la nueva,
y nada se escribe si algo no cuadra. Contraseñas de PRUEBA inventadas; nunca se imprimen."""
import os, sys, json, base64, hashlib, tempfile, subprocess, unittest

K = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
sys.path.insert(0, K)
try:
    import cryptography  # noqa: F401
    CRYPTO = os.path.dirname(os.path.dirname(cryptography.__file__))
except Exception:
    CRYPTO = None


@unittest.skipUnless(CRYPTO, 'sin cryptography')
class CambiarClave(unittest.TestCase):
    def setUp(self):
        import cambiar_clave as C
        self.C, self.t = C, tempfile.mkdtemp(prefix='clave-')
        self.vieja, self.nueva = 'prueba-vieja-' + os.urandom(4).hex(), 'prueba-nueva-' + os.urandom(4).hex()
        self.sv, self.sn = os.path.join(self.t, 'SAL'), os.path.join(self.t, 'SAL.nueva')
        open(self.sv, 'w').write(base64.b64encode(os.urandom(16)).decode())
        self.d = {'d': {'i:a1': {'id': 'a1'}, 'i:a2': {'id': 'a2'}, 't:caf|1': {'ts': 'x'}, 'x:m1': {'txt': 'ñ'}}, 'mt': {'i:a1': 1}}
        self.plan = os.path.join(self.t, 'plan.json')
        open(self.plan, 'wb').write(C.cifrar_plan(self.d, self.vieja, C.leer_sal(self.sv)))

    def run_(self, *a, **env):
        e = dict(os.environ, PYTHONPATH=CRYPTO, PYTHONIOENCODING='utf-8', **env)
        return subprocess.run([sys.executable, '-X', 'utf8', os.path.join(K, 'cambiar_clave.py'), *a], capture_output=True, text=True, encoding='utf-8', env=e)

    def test_recifra_identico_y_solo_con_la_nueva(self):
        self.assertEqual(self.run_('sal', self.sn).returncode, 0)
        out = os.path.join(self.t, 'nuevo.json')
        r = self.run_('plan', self.plan, self.sv, out, self.sn, TALLER_CLAVE_VIEJA=self.vieja, TALLER_CLAVE_NUEVA=self.nueva)
        self.assertEqual(r.returncode, 0, r.stdout + r.stderr)
        self.assertIn('2 fichas, 1 terminadas', r.stdout)
        self.assertNotIn(self.vieja, r.stdout + r.stderr); self.assertNotIn(self.nueva, r.stdout + r.stderr)
        raw = open(out, 'rb').read()
        self.assertEqual(self.C.descifrar_plan(raw, self.nueva, self.C.leer_sal(self.sn)), self.d)
        with self.assertRaises(Exception):
            self.C.descifrar_plan(raw, self.vieja, self.C.leer_sal(self.sv))
        # y plan_copia (la prueba de restauración) lo abre con la nueva
        r = subprocess.run([sys.executable, '-X', 'utf8', os.path.join(K, 'plan_copia.py'), 'leer', out, '--sal', self.sn],
                           capture_output=True, text=True, encoding='utf-8', env=dict(os.environ, PYTHONPATH=CRYPTO, TALLER_CLAVE=self.nueva))
        self.assertEqual(r.returncode, 0, r.stdout)

    def test_no_escribe_si_algo_no_cuadra(self):
        self.run_('sal', self.sn); out = os.path.join(self.t, 'nuevo.json')
        casos = [dict(TALLER_CLAVE_VIEJA='otra', TALLER_CLAVE_NUEVA=self.nueva),          # la actual no abre el plan
                 dict(TALLER_CLAVE_VIEJA=self.vieja, TALLER_CLAVE_NUEVA=self.vieja)]      # la nueva es la misma
        for env in casos:
            with self.subTest(env=list(env)):
                r = self.run_('plan', self.plan, self.sv, out, self.sn, **env)
                self.assertNotEqual(r.returncode, 0); self.assertFalse(os.path.exists(out))
        r = self.run_('plan', self.plan, self.sv, out, self.sv, TALLER_CLAVE_VIEJA=self.vieja, TALLER_CLAVE_NUEVA=self.nueva)
        self.assertNotEqual(r.returncode, 0, 'misma sal: no'); self.assertFalse(os.path.exists(out))

    def test_web(self):
        from cryptography.hazmat.primitives.ciphers.aead import AESGCM
        sal = self.C.leer_sal(self.sv); iv = os.urandom(12)
        k = hashlib.pbkdf2_hmac('sha256', self.vieja.encode(), base64.b64decode(sal), 600000, 32)
        w = os.path.join(self.t, 'data.enc')
        json.dump({'v': 1, 'iter': 600000, 'salt': sal, 'iv': base64.b64encode(iv).decode(), 'ct': base64.b64encode(AESGCM(k).encrypt(iv, b'web', None)).decode()}, open(w, 'w'))
        self.assertEqual(self.run_('web', w, self.sv, TALLER_CLAVE_VIEJA=self.vieja).returncode, 0)
        self.assertEqual(self.run_('web', w, self.sv, TALLER_CLAVE_VIEJA='otra').returncode, 2)
        self.run_('sal', self.sn)
        self.assertEqual(self.run_('web', w, self.sn, TALLER_CLAVE_VIEJA=self.vieja).returncode, 1, 'sal distinta de la web: parar')

    def test_secreto_solo_para_la_web_del_taller(self):
        r = self.run_('secreto', 'Baletxe/otro', 'TALLER_CLAVE', TALLER_CLAVE_NUEVA='x')
        self.assertNotEqual(r.returncode, 0)


if __name__ == '__main__':
    unittest.main()
