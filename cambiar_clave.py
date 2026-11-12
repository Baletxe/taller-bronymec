#!/usr/bin/env python3
"""Cambio de la contraseña del taller sin perder nada (piezas sueltas; el orden lo lleva fase0/tools/cambiar_clave_taller.ps1).

Las contraseñas se leen SOLO del entorno (TALLER_CLAVE_VIEJA, TALLER_CLAVE_NUEVA), nunca de la línea de comandos ni de ficheros,
y nunca se imprimen. Lo que se imprime son solo estados 🟢/🔴 y recuentos.

  python3 cambiar_clave.py web DATA.enc SAL
      ¿TALLER_CLAVE_VIEJA abre la web publicada? (y la sal de la web es la del kit)
  python3 cambiar_clave.py sal SALIDA
      Escribe una sal nueva aleatoria (16 bytes, base64): una por contraseña.
  python3 cambiar_clave.py plan PLAN_VIEJO SAL_VIEJA PLAN_NUEVO SAL_NUEVA
      Recifra el plan compartido de la llave vieja a la nueva y comprueba que el contenido es idéntico.
  python3 cambiar_clave.py secreto REPO NOMBRE
      Guarda TALLER_CLAVE_NUEVA como secreto de GitHub (gh secret set), pasándola por la entrada, exacta y sin salto de línea.
"""
import sys, os, json, base64, hashlib

ITER = 600000  # igual que taller_web.py


def _aes():
    from cryptography.hazmat.primitives.ciphers.aead import AESGCM
    return AESGCM


def tlk(clave, sal_b64):
    return hashlib.pbkdf2_hmac('sha256', clave.encode('utf-8'), base64.b64decode(sal_b64), ITER, 32)


def llave_plan(clave, sal_b64):
    from cryptography.hazmat.primitives.kdf.hkdf import HKDF
    from cryptography.hazmat.primitives import hashes
    return HKDF(algorithm=hashes.SHA256(), length=32, salt=b'bronymec-taller', info=b'plan-compartido-v1').derive(tlk(clave, sal_b64))


def descifrar_plan(raw, clave, sal_b64):
    o = json.loads(raw)
    return json.loads(_aes()(llave_plan(clave, sal_b64)).decrypt(base64.b64decode(o['iv']), base64.b64decode(o['ct']), None))


def cifrar_plan(obj, clave, sal_b64):
    iv = os.urandom(12)
    ct = _aes()(llave_plan(clave, sal_b64)).encrypt(iv, json.dumps(obj, ensure_ascii=False, separators=(',', ':')).encode('utf-8'), None)
    return json.dumps({'v': 1, 'iv': base64.b64encode(iv).decode(), 'ct': base64.b64encode(ct).decode()}, separators=(',', ':')).encode()


def leer_sal(f):
    s = open(f).read().strip()
    assert len(base64.b64decode(s)) == 16, 'la sal no tiene 16 bytes'
    return s


def clave_env(n):
    c = os.environ.get(n, '')
    if not c:
        sys.exit('🔴 falta %s en el entorno' % n)
    return c


def cmd_web(data_enc, sal_f):
    W, sal = json.load(open(data_enc, encoding='utf-8')), leer_sal(sal_f)
    if W.get('salt') != sal:
        print('🔴 la web publicada no usa la sal del kit: no se sigue'); return 1
    try:
        _aes()(hashlib.pbkdf2_hmac('sha256', clave_env('TALLER_CLAVE_VIEJA').encode('utf-8'), base64.b64decode(sal), int(W.get('iter') or ITER), 32)).decrypt(
            base64.b64decode(W['iv']), base64.b64decode(W['ct']), None)
    except Exception:
        print('🔴 la contraseña actual no abre la web publicada'); return 2
    print('🟢 la contraseña actual abre la web publicada'); return 0


def cmd_sal(salida):
    open(salida, 'w', newline='\n').write(base64.b64encode(os.urandom(16)).decode() + '\n')
    print('🟢 sal nueva escrita'); return 0


def cmd_plan(viejo, sal_v_f, nuevo, sal_n_f):
    cv, cn = clave_env('TALLER_CLAVE_VIEJA'), clave_env('TALLER_CLAVE_NUEVA')
    if cv == cn:
        print('🔴 la contraseña nueva es igual que la vieja'); return 1
    sv, sn = leer_sal(sal_v_f), leer_sal(sal_n_f)
    if sv == sn:
        print('🔴 la sal nueva es igual que la vieja: hace falta una sal nueva'); return 1
    raw = open(viejo, 'rb').read()
    try:
        obj = descifrar_plan(raw, cv, sv)
    except Exception:
        print('🔴 el plan compartido no se abre con la contraseña actual: no se toca'); return 1
    if not isinstance(obj, dict) or not isinstance(obj.get('d'), dict):
        print('🔴 el plan compartido no tiene la forma esperada: no se toca'); return 1
    nuevo_raw = cifrar_plan(obj, cn, sn)
    # Comprobación: con la llave nueva se recupera EXACTAMENTE lo mismo, y con la vieja ya no se abre.
    if descifrar_plan(nuevo_raw, cn, sn) != obj:
        print('🔴 la comprobación del plan recifrado no cuadra: no se escribe'); return 1
    try:
        descifrar_plan(nuevo_raw, cv, sv); print('🔴 el plan nuevo se abre con la llave vieja: algo va mal'); return 1
    except Exception:
        pass
    open(nuevo, 'wb').write(nuevo_raw)
    d = obj['d']
    print('🟢 plan recifrado y comprobado · %d fichas, %d terminadas, %d talleres de pieza, %d mensajes' % tuple(
        sum(k.startswith(p) for k in d) for p in ('i:', 't:', 'p:', 'x:')))
    return 0


def cmd_secreto(repo, nombre):
    import subprocess
    assert repo == 'Baletxe/taller-bronymec' and nombre == 'TALLER_CLAVE', 'solo para el secreto de la web del taller'
    r = subprocess.run(['gh', 'secret', 'set', nombre, '--repo', repo], input=clave_env('TALLER_CLAVE_NUEVA').encode('utf-8'), capture_output=True)
    print('🟢 secreto %s cambiado en GitHub' % nombre if r.returncode == 0 else '🔴 no se ha podido cambiar el secreto %s' % nombre)
    return r.returncode


if __name__ == '__main__':
    a = sys.argv[1:]
    try:
        sys.stdout.reconfigure(encoding='utf-8')
    except Exception:
        pass
    if len(a) == 3 and a[0] == 'web':
        sys.exit(cmd_web(a[1], a[2]))
    if len(a) == 2 and a[0] == 'sal':
        sys.exit(cmd_sal(a[1]))
    if len(a) == 3 and a[0] == 'secreto':
        sys.exit(cmd_secreto(a[1], a[2]))
    if len(a) == 5 and a[0] == 'plan':
        sys.exit(cmd_plan(*a[1:]))
    sys.exit(__doc__)
