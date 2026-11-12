#!/usr/bin/env python3
"""Copia del plan compartido (taller-plan) y prueba de restauración. Fase 1.

  python3 -I plan_copia.py copiar VIVO COPIAS [--ahora AAAA-MM-DDTHH:MM]
      VIVO = checkout de taller-plan/main, COPIAS = checkout de la rama copias. Guarda en COPIAS/plan/ lo que haya cambiado
      (plan.json, tipos.json, panel-cambios.json) tal cual, cifrado, y comprueba que la copia se puede restaurar
      (se vuelve a leer, es idéntica byte a byte y tiene la forma correcta). Deja COPIAS/plan-ultima.txt con 🟢/🔴.
      Un plan.json ilegible NUNCA sustituye a la última copia buena: se guarda aparte como ilegible-….
      Solo biblioteca estándar: no necesita ninguna clave.
  python3 -I plan_copia.py comprobar FICHERO
      Forma de un plan.json cifrado ({v:1, iv, ct}). Sin clave.
  python3 -I plan_copia.py leer FICHERO --sal SAL
      Restauración de verdad: descifra con la contraseña del taller (se escribe al pedirla, o TALLER_CLAVE en el entorno
      para las pruebas) y dice cuántas fichas, terminadas, notas… trae. Nunca enseña el contenido. Necesita cryptography.

Restaurar: copiar el fichero elegido de plan/ (rama copias) encima de plan.json en taller-plan/main. Las tablets lo mezclan
clave a clave (gana lo más reciente de cada ficha), así que lo que siga vivo en una tablet no se pierde."""
import sys, os, json, base64, hashlib, datetime, re

FICHEROS = ['plan.json', 'tipos.json', 'panel-cambios.json', 'hist.json']  # hist.json: foto diaria de Gerencia (Fase 3), cifrada como el plan
CIFRADOS = ('plan.json', 'hist.json')
DIAS_TODO = 30          # hasta 30 días se guarda cada cambio; después, solo la primera copia de cada día
ITER = 600000           # igual que taller_web.py


def b64ok(s, minimo):
    try:
        b = base64.b64decode(s, validate=True)
    except Exception:
        return None
    return b if len(b) >= minimo else None


def forma_plan(raw):
    """'' si es un plan cifrado con buena forma; si no, el motivo."""
    try:
        o = json.loads(raw.decode('utf-8'))
    except Exception:
        return 'no es JSON'
    if not isinstance(o, dict) or o.get('v') != 1:
        return 'no es un plan cifrado v1'
    iv = b64ok(o.get('iv', ''), 12)
    if iv is None or len(iv) != 12:
        return 'iv incorrecto'
    if b64ok(o.get('ct', ''), 17) is None:
        return 'contenido cifrado vacío o roto'
    return ''


def forma_json(raw):
    try:
        o = json.loads(raw.decode('utf-8'))
    except Exception:
        return 'no es JSON'
    return '' if isinstance(o, dict) else 'no es un objeto'


def sha(b):
    return hashlib.sha256(b).hexdigest()


def podar(base, hoy):
    """Más de DIAS_TODO días: solo la primera copia de cada fichero y día. Lo ilegible no se borra nunca."""
    lim = hoy - datetime.timedelta(days=DIAS_TODO)
    n = 0
    for dia in sorted(os.listdir(base)) if os.path.isdir(base) else []:
        if not re.fullmatch(r'\d{4}-\d{2}-\d{2}', dia) or datetime.date.fromisoformat(dia) >= lim:
            continue
        vistos = set()
        for f in sorted(os.listdir(os.path.join(base, dia))):
            m = re.fullmatch(r'\d{4}Z-(.+)', f)
            if not m:
                continue
            if m.group(1) in vistos:
                os.remove(os.path.join(base, dia, f)); n += 1
            vistos.add(m.group(1))
    return n


def copiar(vivo, copias, ahora):
    base = os.path.join(copias, 'plan')
    ult = os.path.join(base, 'ultima')
    os.makedirs(ult, exist_ok=True)
    dia, hora = ahora.strftime('%Y-%m-%d'), ahora.strftime('%H%MZ')
    nuevas, rojo, notas = [], [], []
    for f in FICHEROS:
        src = os.path.join(vivo, f)
        if not os.path.exists(src):
            if f == 'plan.json':
                rojo.append('falta plan.json en el plan compartido')
            continue
        raw = open(src, 'rb').read()
        mal = (forma_plan if f in CIFRADOS else forma_json)(raw)
        u = os.path.join(ult, f)
        if mal:
            rojo.append('%s ilegible (%s): la última copia buena se conserva' % (f, mal))
            d = os.path.join(base, dia); os.makedirs(d, exist_ok=True)
            open(os.path.join(d, '%s-ilegible-%s' % (hora, f)), 'wb').write(raw)
            continue
        if os.path.exists(u) and sha(open(u, 'rb').read()) == sha(raw):
            continue
        d = os.path.join(base, dia); os.makedirs(d, exist_ok=True)
        dest = os.path.join(d, '%s-%s' % (hora, f))
        for p in (dest, u):
            open(p, 'wb').write(raw)
            # prueba de restauración: lo guardado se vuelve a leer y tiene que ser idéntico y con buena forma
            back = open(p, 'rb').read()
            if sha(back) != sha(raw) or (forma_plan if f in CIFRADOS else forma_json)(back):
                rojo.append('la copia de %s no se puede restaurar (%s)' % (f, p))
        nuevas.append(f)
    podadas = podar(base, ahora.date())
    if podadas:
        notas.append('%d copias antiguas resumidas a una por día' % podadas)
    if not os.path.exists(os.path.join(ult, 'plan.json')):
        rojo.append('no hay ninguna copia buena de plan.json')
    linea = ('🔴 ' + '; '.join(rojo)) if rojo else '🟢'
    linea += ' · %s · %s' % (ahora.strftime('%Y-%m-%d %H:%M UTC'), ('copiado: ' + ', '.join(nuevas)) if nuevas else 'sin cambios')
    if notas:
        linea += ' · ' + '; '.join(notas)
    est = os.path.join(copias, 'plan-ultima.txt')
    prev = open(est, encoding='utf-8').read() if os.path.exists(est) else ''
    # Sin cambios y en verde: la línea de estado solo se renueva una vez al día (no hace falta un commit cada hora).
    if rojo or nuevas or notas or not prev.startswith('🟢 · ' + ahora.strftime('%Y-%m-%d')):
        open(est, 'w', encoding='utf-8', newline='\n').write(linea + '\n')
    print(linea)
    return 1 if rojo else 0


def leer(f, sal_f, web=None):
    from cryptography.hazmat.primitives.ciphers.aead import AESGCM
    from cryptography.hazmat.primitives.kdf.hkdf import HKDF
    from cryptography.hazmat.primitives import hashes
    clave = os.environ.get('TALLER_CLAVE')
    if not clave:
        import getpass
        clave = getpass.getpass('Contraseña del taller (no se ve al escribir): ')
    salt = base64.b64decode(open(sal_f).read().strip())
    tlk = hashlib.pbkdf2_hmac('sha256', clave.encode('utf-8'), salt, ITER, 32)
    k = HKDF(algorithm=hashes.SHA256(), length=32, salt=b'bronymec-taller', info=b'plan-compartido-v1').derive(tlk)
    if web:  # primero: ¿esta contraseña abre la web real? Así se distingue "contraseña mal leída" de "copia con otra llave"
        W = json.load(open(web, encoding='utf-8'))
        if W.get('salt') != base64.b64encode(salt).decode():
            print('🔴 la sal de la web no es la del kit (SAL): avisa a Claude'); return 1
        try:
            AESGCM(hashlib.pbkdf2_hmac('sha256', clave.encode('utf-8'), salt, int(W.get('iter') or ITER), 32)).decrypt(base64.b64decode(W['iv']), base64.b64decode(W['ct']), None)
            print('🟢 la contraseña abre la web real del taller')
        except Exception:
            print('🔴 esa contraseña no abre la web real (%d caracteres%s). Revisa mayúsculas, espacios al final o el teclado.' % (
                len(clave), ', acaba en espacio' if clave != clave.rstrip() else '')); return 2  # 2 = contraseña: se puede repetir
    raw = open(f, 'rb').read()
    mal = forma_plan(raw)
    if mal:
        print('🔴 %s: %s' % (f, mal)); return 1
    o = json.loads(raw)
    try:
        p = json.loads(AESGCM(k).decrypt(base64.b64decode(o['iv']), base64.b64decode(o['ct']), None))
    except Exception:
        print('🔴 la contraseña es buena (abre la web) pero la copia del plan está cifrada con OTRA llave: avisa a Claude' if web
              else '🔴 no se puede descifrar con esa contraseña (o el fichero está dañado)'); return 1
    d = p.get('d') if isinstance(p, dict) else None
    if not isinstance(d, dict):
        print('🔴 descifrado pero sin plan dentro'); return 1
    nom = {'i:': 'fichas', 't:': 'terminadas', 'p:': 'talleres de pieza', 'n:': 'notas', 'h:': 'horas por pieza', 'x:': 'mensajes', 'y:': 'conversaciones'}
    cuenta = {v: 0 for v in nom.values()}
    for kk in d:
        if kk[:2] in nom:
            cuenta[nom[kk[:2]]] += 1
    maq = d.get('m:maq') or []
    print('🟢 se puede restaurar · guardado %s · %s · %d máquinas' % (str(p.get('ts', '?'))[:16], ', '.join('%d %s' % (n, k2) for k2, n in cuenta.items()), len(maq)))
    return 0


if __name__ == '__main__':
    a = sys.argv[1:]
    try:
        sys.stdout.reconfigure(encoding='utf-8')
    except Exception:
        pass
    if len(a) >= 3 and a[0] == 'copiar':
        ah = a[a.index('--ahora') + 1] if '--ahora' in a else None
        ahora = datetime.datetime.fromisoformat(ah) if ah else datetime.datetime.now(datetime.timezone.utc).replace(tzinfo=None)
        sys.exit(copiar(a[1], a[2], ahora))
    if len(a) == 2 and a[0] == 'comprobar':
        m = forma_plan(open(a[1], 'rb').read()); print('🔴 ' + m if m else '🟢 plan cifrado con buena forma'); sys.exit(1 if m else 0)
    if len(a) in (4, 6) and a[0] == 'leer' and a[2] == '--sal':
        sys.exit(leer(a[1], a[3], a[5] if len(a) == 6 and a[4] == '--web' else None))
    sys.exit(__doc__)
