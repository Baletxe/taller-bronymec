#!/usr/bin/env python3
"""Regla 6 en Talgo (v43): el stock sale de la tabla del SGA del panel CAF (misma fuente), solo con cruce único,
repartido por fecha y sin contar dos veces lo ya asignado a CAF. Datos de PRUEBA inventados."""
import os, sys, json, tempfile, subprocess, unittest

K = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))


def linea(i, cods, ctd, f, avis=0, fp='F'):
    return {'id': 'P%d' % i, 'ped': 'PRUEBA-%d' % i, 'pos': 10, 'ce': 'X', 'mat': 'M%d' % i, 'doc': '', 'cod': cods,
            'sd': 'PIEZA PRUEBA %d' % i, 'ctd': ctd, 'avis': avis, 'fp': fp, 'f': f}


# talgo_datos.py usa la hora de Madrid (zoneinfo). En Windows Python no trae la base de husos: allí se saltan; el CI (Linux) las corre.
TZ_OK = subprocess.run([sys.executable, '-I', '-c', "import zoneinfo; zoneinfo.ZoneInfo('Europe/Madrid')"], capture_output=True).returncode == 0


@unittest.skipUnless(TZ_OK, 'sin base de husos horarios (Windows): corre en el CI')
class TalgoStock(unittest.TestCase):
    def montar(self, lineas, stock=None, caf=None):
        t = tempfile.mkdtemp(prefix='tstock-')
        D = {'lineas': lineas, 'meta': {'foto': '2026-11-12'}}
        open(os.path.join(t, 'talgo.html'), 'w', encoding='utf-8').write('<script id="data" type="application/json">' + json.dumps(D) + '</script>')
        os.makedirs(os.path.join(t, 'db'))
        a = [sys.executable, '-I', '-X', 'utf8', os.path.join(K, 'talgo_datos.py'), os.path.join(t, 'talgo.html'), os.path.join(t, 'db'), os.path.join(t, 'out.json')]
        if stock is not None:
            json.dump({'fecha': '2026-11-12', 'stock': stock}, open(os.path.join(t, 's.json'), 'w')); a += ['--stock', os.path.join(t, 's.json')]
        if caf is not None:
            json.dump({'lineas': caf}, open(os.path.join(t, 'c.json'), 'w')); a += ['--caf', os.path.join(t, 'c.json')]
        r = subprocess.run(a, capture_output=True, text=True, encoding='utf-8')
        self.assertEqual(r.returncode, 0, r.stderr)
        self.salida = r.stdout
        return {l['id']: l for l in json.load(open(os.path.join(t, 'out.json'), encoding='utf-8'))['lineas']}

    def test_sin_tabla_como_antes(self):
        L = self.montar([linea(1, ['C1'], 10, '2026-12-01')])
        self.assertIsNone(L['TP1']['stock']); self.assertEqual(L['TP1']['serv'], 'sin')

    def test_stock_suficiente_sale_completa(self):
        L = self.montar([linea(1, ['C1'], 10, '2026-12-01')], {'C1': [25, 'A-01']})
        l = L['TP1']; self.assertEqual((l['stock'], l['asig'], l['serv'], l['ubic']), (25, 10, 'listo', 'A-01'))
        self.assertIn('1 de 1 líneas cruzan', self.salida); self.assertNotIn('C1', self.salida.split('AVISO')[-1], 'log solo con recuentos')

    def test_reparto_por_fecha(self):
        L = self.montar([linea(1, ['C1'], 10, '2026-12-05'), linea(2, ['C1'], 10, '2026-12-01')], {'C1': [15, '']})
        self.assertEqual(L['TP2']['serv'], 'listo', 'la más antigua primero')
        self.assertEqual((L['TP1']['asig'], L['TP1']['serv']), (5, 'parcial'))

    def test_no_esta_en_la_tabla_no_se_supone(self):
        L = self.montar([linea(1, ['C9'], 10, '2026-12-01')], {'C1': [5, '']})
        self.assertIsNone(L['TP1']['stock'], 'la tabla del panel CAF no es el listado entero del SGA: si no está, no se sabe (no se pone 0)')

    def test_sin_cruce_unico_no_se_supone(self):
        L = self.montar([linea(1, ['C1', 'C2'], 10, '2026-12-01'), linea(2, [], 10, '2026-12-01')], {'C1': [50, ''], 'C2': [50, '']})
        self.assertIsNone(L['TP1']['stock']); self.assertIsNone(L['TP2']['stock'])

    def test_no_cuenta_dos_veces_lo_de_caf(self):
        caf = [{'cod': 'C1', 'cruce': 'OK', 'asig': 12}, {'cod': 'C1', 'cruce': 'REVISAR', 'asig': 99}]
        L = self.montar([linea(1, ['C1'], 10, '2026-12-01')], {'C1': [20, '']}, caf)
        self.assertEqual((L['TP1']['asig'], L['TP1']['serv']), (8, 'parcial'), '20 en el SGA - 12 ya de CAF = 8 para Talgo')

    def test_pasa_por_el_adaptador_sin_avisos(self):
        sys.path.insert(0, K); import adaptadores
        L = self.montar([linea(1, ['C1'], 10, '2026-12-01'), linea(2, ['C1'], 10, '2026-12-02')], {'C1': [15, '']})
        e, av = adaptadores.talgo({'lineas': list(L.values())})
        self.assertEqual(av, [])


if __name__ == '__main__':
    unittest.main()
