#!/usr/bin/env python3
"""Talgo (v43, Jon 12/11/2026): stock según SGA SIN VERIFICAR, igual que el panel Talgo (I7). Sale del bloque
<script id="sga"> del panel, se reparte por fecha de entrega y NUNCA pone una línea en verde. Datos de PRUEBA inventados."""
import os, sys, json, tempfile, subprocess, unittest

K = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
# talgo_datos.py usa la hora de Madrid (zoneinfo). En Windows Python no trae la base de husos: allí se saltan; el CI (Linux) las corre.
TZ_OK = subprocess.run([sys.executable, '-I', '-c', "import zoneinfo; zoneinfo.ZoneInfo('Europe/Madrid')"], capture_output=True).returncode == 0


def linea(i, cods, ctd, f, avis=0, fp='F'):
    return {'id': 'P%d' % i, 'ped': 'PRUEBA-%d' % i, 'pos': 10, 'ce': 'X', 'mat': 'M%d' % i, 'doc': '', 'cod': cods,
            'sd': 'PIEZA PRUEBA %d' % i, 'ctd': ctd, 'avis': avis, 'fp': fp, 'f': f}


@unittest.skipUnless(TZ_OK, 'sin base de husos horarios (Windows): corre en el CI')
class TalgoSGA(unittest.TestCase):
    def montar(self, lineas, sga=None):
        t = tempfile.mkdtemp(prefix='tsga-')
        h = '<script id="data" type="application/json">' + json.dumps({'lineas': lineas, 'meta': {'foto': '2026-11-12'}}) + '</script>'
        if sga is not None:
            h += '<script id="sga" type="application/json">' + json.dumps({'fecha': '2026-11-12', 'fuente': 'prueba', 'cod': sga}) + '</script>'
        open(os.path.join(t, 'talgo.html'), 'w', encoding='utf-8').write(h)
        os.makedirs(os.path.join(t, 'db'))
        r = subprocess.run([sys.executable, '-I', '-X', 'utf8', os.path.join(K, 'talgo_datos.py'), os.path.join(t, 'talgo.html'), os.path.join(t, 'db'), os.path.join(t, 'out.json')],
                           capture_output=True, text=True, encoding='utf-8')
        self.assertEqual(r.returncode, 0, r.stderr)
        self.salida = r.stdout
        return {l['id']: l for l in json.load(open(os.path.join(t, 'out.json'), encoding='utf-8'))['lineas']}

    def test_sin_bloque_como_antes(self):
        L = self.montar([linea(1, ['C1'], 10, '2026-12-01')])
        self.assertNotIn('sga', L['TP1']); self.assertIsNone(L['TP1']['stock'])

    def test_nunca_en_verde(self):
        L = self.montar([linea(1, ['C1'], 10, '2026-12-01')], {'C1': {'u': 50, 'loc': [['ALMSUP01', 50]], 'neg': 0, 'und': False}})
        l = L['TP1']
        self.assertEqual((l['sga']['u'], l['sga']['a'], l['sga']['est']), (50, 10, 'cubre'))
        self.assertEqual((l['serv'], l['stock']), ('sin', None), 'el SGA sin verificar nunca pone la línea en verde')
        self.assertIn('ALMSUP01: 50', l['sga']['loc'])

    def test_reparto_por_fecha_como_el_panel(self):
        L = self.montar([linea(1, ['C1'], 10, '2026-12-05'), linea(2, ['C1'], 10, '2026-12-01')], {'C1': {'u': 15, 'loc': [], 'neg': 0}})
        self.assertEqual(L['TP2']['sga']['est'], 'cubre'); self.assertEqual((L['TP1']['sga']['a'], L['TP1']['sga']['est']), (5, 'parcial'))

    def test_codigo_que_no_esta_es_nada(self):
        L = self.montar([linea(1, ['C9'], 10, '2026-12-01')], {'C1': {'u': 5, 'loc': [], 'neg': 0}})
        self.assertEqual((L['TP1']['sga']['u'], L['TP1']['sga']['est']), (0, 'nada'))

    def test_log_solo_recuentos(self):
        self.montar([linea(1, ['C1'], 10, '2026-12-01')], {'C1': {'u': 50, 'loc': [['ALMSUP01', 50]], 'neg': 0}})
        aviso = [x for x in self.salida.splitlines() if x.startswith('AVISO')][0]
        self.assertIn('1 de 1 líneas; 1 lo cubriría', aviso); self.assertNotIn('C1', aviso); self.assertNotIn('ALMSUP', aviso)

    def test_pasa_por_el_adaptador_sin_avisos(self):
        sys.path.insert(0, K); import adaptadores
        L = self.montar([linea(1, ['C1'], 10, '2026-12-01')], {'C1': {'u': 50, 'loc': [], 'neg': 0}})
        self.assertEqual(adaptadores.talgo({'lineas': list(L.values())})[1], [])


if __name__ == '__main__':
    unittest.main()
