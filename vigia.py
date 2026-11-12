#!/usr/bin/env python3
"""Vigía (regla 9: lo que debe estar al día tiene quien lo vigile). Comprueba, sin secretos y solo leyendo:
  - la pasada de Claude: hay pasada de hoy a su hora (09:36 y 12:36, hora de Madrid, todos los días) y su estado es 🟢;
  - la copia del plan compartido: plan-ultima.txt en 🟢 y de menos de 26 h;
  - la web del taller: publicada hace menos de 26 h.
Sale con 🟢 (código 0) o 🔴 y el motivo (código 1: el workflow falla y GitHub avisa por correo).

  python3 vigia.py [--siempre]
      Lee de GitHub (repos públicos y, con GH_TOKEN, plan-ultima.txt de taller-plan). Sin --siempre solo actúa en sus
      horas (10 y 13 h de Madrid), para que el cron en UTC sirva en invierno y en verano.
Horario: HORAS_PASADA. Si Jon cambia la hora de la pasada, se cambia aquí.
"""
import sys, os, json, re, datetime, subprocess, urllib.request

HORAS_PASADA = [(9, 36), (12, 36)]   # visto en la rama datos (12/11/2026); margen: 40 min
MARGEN_MIN = 40
MAX_H = 26


def evaluar(ahora, pasadas, pasada_txt, plan_ultima, web_ts):
    """ahora: datetime con zona de Madrid. pasadas: [datetime con zona] de los commits 'Pasada horaria'.
    Devuelve la lista de motivos en rojo (vacía = todo bien)."""
    rojo = []
    hoy = ahora.date()
    for h, m in HORAS_PASADA:
        limite = ahora.replace(hour=h, minute=m, second=0, microsecond=0) + datetime.timedelta(minutes=MARGEN_MIN)
        if ahora >= limite:
            desde = limite - datetime.timedelta(minutes=MARGEN_MIN + 30)
            if not any(p.astimezone(ahora.tzinfo) >= desde and p.astimezone(ahora.tzinfo).date() == hoy for p in pasadas):
                rojo.append('falta la pasada de las %02d:%02d de hoy (la última: %s)' % (h, m, max(pasadas).astimezone(ahora.tzinfo).strftime('%d/%m %H:%M') if pasadas else 'ninguna'))
    if not (pasada_txt or '').startswith('🟢'):
        rojo.append('la última pasada no está en verde: ' + (pasada_txt or 'sin pasada.txt').strip()[:120])
    m = re.search(r'(\d{4}-\d{2}-\d{2} \d{2}:\d{2}) UTC', plan_ultima or '')
    if not (plan_ultima or '').startswith('🟢'):
        rojo.append('la copia del plan no está en verde: ' + (plan_ultima or 'sin plan-ultima.txt').strip()[:120])
    elif not m or ahora - datetime.datetime.strptime(m.group(1), '%Y-%m-%d %H:%M').replace(tzinfo=datetime.timezone.utc) > datetime.timedelta(hours=MAX_H):
        rojo.append('la copia del plan lleva más de %d h sin renovarse' % MAX_H)
    if not web_ts or ahora - web_ts > datetime.timedelta(hours=MAX_H):
        rojo.append('la web del taller lleva más de %d h sin publicarse' % MAX_H)
    return rojo


def _get(url, token=None, raw=False):
    rq = urllib.request.Request(url, headers=dict({'User-Agent': 'vigia-taller', 'Accept': 'application/vnd.github.raw' if raw else 'application/vnd.github+json'},
                                                  **({'Authorization': 'Bearer ' + token} if token else {})))
    with urllib.request.urlopen(rq, timeout=30) as r:
        return r.read().decode('utf-8')


def main(siempre):
    from zoneinfo import ZoneInfo
    mad = ZoneInfo('Europe/Madrid')
    ahora = datetime.datetime.now(mad)
    if not siempre and ahora.hour not in (10, 13):
        print('fuera de hora (%s): nada que vigilar' % ahora.strftime('%H:%M')); return 0
    cs = json.loads(_get('https://api.github.com/repos/Baletxe/taller-bronymec/commits?sha=datos&per_page=40'))
    pasadas = [datetime.datetime.fromisoformat(c['commit']['author']['date'].replace('Z', '+00:00')) for c in cs
               if re.match(r'Pasada horaria \d', c['commit']['message'])]
    pasada_txt = _get('https://raw.githubusercontent.com/Baletxe/taller-bronymec/datos/pasada.txt')
    tok = os.environ.get('GH_TOKEN')
    try:
        plan_ultima = _get('https://api.github.com/repos/Baletxe/taller-plan/contents/plan-ultima.txt?ref=copias', tok, raw=True) if tok else ''
    except Exception:
        plan_ultima = ''
    try:
        web_ts = datetime.datetime.fromisoformat(json.loads(_get('https://baletxe.github.io/taller-bronymec/version.json'))['ts'].replace('Z', '+00:00'))
    except Exception:
        web_ts = None
    rojo = evaluar(ahora, pasadas, pasada_txt, plan_ultima, web_ts)
    print(('🔴 ' + '; '.join(rojo)) if rojo else '🟢 pasada, copia del plan y web al día (%s)' % ahora.strftime('%d/%m %H:%M'))
    return 1 if rojo else 0


if __name__ == '__main__':
    try:
        sys.stdout.reconfigure(encoding='utf-8')
    except Exception:
        pass
    sys.exit(main('--siempre' in sys.argv))
