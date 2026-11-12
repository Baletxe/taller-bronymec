#!/usr/bin/env python3
"""Vigía (regla 9): avisa si falta la pasada a su hora, si algo está en rojo o si la copia o la web se han quedado viejas."""
import os, sys, datetime, unittest

K = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
sys.path.insert(0, K)
import vigia as V  # noqa: E402

MAD = datetime.timezone(datetime.timedelta(hours=1))  # 12/11/2026 = invierno (CET); la lógica no depende de la zona
UTC = datetime.timezone.utc
d = lambda h, m, dia=12: datetime.datetime(2026, 11, dia, h, m, tzinfo=MAD)
OK_PLAN = '🟢 · 2026-11-12 08:40 UTC · copiado: plan.json'


class Vigia(unittest.TestCase):
    def ev(self, ahora, pasadas, pasada_txt='🟢 todo', plan=OK_PLAN, web=None):
        return V.evaluar(ahora, pasadas, pasada_txt, plan, web or ahora - datetime.timedelta(hours=1))

    def test_todo_bien(self):
        self.assertEqual(self.ev(d(13, 30), [d(9, 36), d(12, 36)]), [])

    def test_falta_la_de_las_doce_y_media(self):
        r = self.ev(d(13, 30), [d(9, 36)])
        self.assertEqual(len(r), 1); self.assertIn('12:36', r[0]); self.assertIn('12/11 09:36', r[0])

    def test_antes_de_su_hora_no_exige(self):
        self.assertEqual(self.ev(d(10, 5), [d(12, 36, 11)]), [], 'a las 10:05 la de las 09:36 aún tiene margen')
        self.assertEqual(len(self.ev(d(10, 30), [d(12, 36, 11)])), 1, 'a las 10:30 ya falta')

    def test_la_de_ayer_no_vale_por_la_de_hoy(self):
        self.assertEqual(len(self.ev(d(10, 30), [d(9, 36, 11), d(12, 36, 11)])), 1)

    def test_pasada_en_rojo(self):
        r = self.ev(d(13, 30), [d(9, 36), d(12, 36)], pasada_txt='🔴 12/11 12:36 · el panel no carga')
        self.assertTrue(any('no está en verde' in x for x in r))

    def test_copia_del_plan_roja_o_vieja(self):
        self.assertTrue(any('copia del plan no' in x for x in self.ev(d(13, 30), [d(9, 36), d(12, 36)], plan='🔴 · plan.json ilegible')))
        self.assertTrue(any('sin renovarse' in x for x in self.ev(d(13, 30), [d(9, 36), d(12, 36)], plan='🟢 · 2026-11-10 08:40 UTC · sin cambios')))
        self.assertTrue(any('copia del plan no' in x for x in self.ev(d(13, 30), [d(9, 36), d(12, 36)], plan='')))

    def test_web_vieja(self):
        self.assertTrue(any('web' in x for x in self.ev(d(13, 30), [d(9, 36), d(12, 36)], web=d(9, 0, 11))))

    def test_hora_con_zona_utc(self):
        # los commits llegan en UTC: 08:36 UTC = 09:36 en Madrid (invierno)
        p = [datetime.datetime(2026, 11, 12, 8, 36, tzinfo=UTC), datetime.datetime(2026, 11, 12, 11, 36, tzinfo=UTC)]
        self.assertEqual(self.ev(d(13, 30), p), [])


    def test_workflow_listo_para_instalar(self):
        wf = open(os.path.join(K, 'instalar', 'taller-plan', '.github', 'workflows', 'vigia.yml'), encoding='utf-8').read()
        self.assertIn('.github/vigia/vigia.py', wf); self.assertNotIn('secrets.', wf); self.assertIn('contents: read', wf)


if __name__ == '__main__':
    unittest.main()
