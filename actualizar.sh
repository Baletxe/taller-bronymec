#!/usr/bin/env bash
# Actualiza la web del taller (Baletxe/taller-bronymec) con los datos de los paneles CAF y Talgo.
# Uso: TALLER_CLAVE='…' bash actualizar.sh KIT_DIR CAF.html CAF_DB TALGO.html TALGO_DB REPO_DIR [-]
#   La contraseña va en la variable de entorno TALLER_CLAVE (no en la línea de comandos). KIT_DIR/SAL = sal aleatoria.
#   KIT_DIR: equipo_build.py taller_datos.js talgo_datos.py taller_build.py taller_web.py taller_app.html iconos/
#   CAF.html / TALGO.html: index.html de cada panel; *_DB: <coleccion>/<id>.json de cada panel.
#   Si TALGO.html no existe, la app sale solo con CAF.
# Imprime SIN_CAMBIOS si datos y app son los mismos que los publicados; LISTO si deja el repo listo para commit.
set -euo pipefail
K=$1; P=$2; DB=$3; TP=$4; TDB=$5; R=$6; C=${7:--}
if [ "$C" != "-" ]; then export TALLER_CLAVE="$C"; fi
[ -n "${TALLER_CLAVE:-}" ] || { echo "ERROR: falta TALLER_CLAVE"; exit 4; }
W=$(mktemp -d)
trap 'rm -rf "$W"' EXIT
python3 -I "$K/equipo_build.py" "$P" "$DB" "$W/equipo.html" >/dev/null
( cd "$K" && [ -d node_modules/playwright-core ] || npm i --silent --no-save playwright-core@1.56.0 >/dev/null 2>&1 )
node "$K/taller_datos.js" "$W/equipo.html" "$W/caf.json" > "$W/datos.log"
cat "$W/datos.log"
grep -q '"errs":\[\]' "$W/datos.log" || { echo "ERROR: el panel CAF dio errores al leer los datos"; exit 2; }
N=$(python3 -I -c "import json,sys;print(len(json.load(open(sys.argv[1]))['lineas']))" "$W/caf.json")
[ "$N" -gt 0 ] || { echo "ERROR: 0 lineas abiertas de CAF, no publico"; exit 3; }
TALGO=()
if [ -f "$TP" ]; then
  python3 -I "$K/talgo_datos.py" "$TP" "$TDB" "$W/talgo.json" && TALGO=(--talgo "$W/talgo.json") || echo "AVISO: Talgo no se ha podido leer; sale solo CAF"
fi
python3 -I "$K/taller_build.py" "$K/taller_app.html" "$W/taller.html" --caf "$W/caf.json" "${TALGO[@]}" > "$W/build.log"
cat "$W/build.log"
H=$(python3 -I -c "
import json,sys,hashlib
h=hashlib.sha256()
d=json.load(open(sys.argv[1]));d.pop('ts',None);h.update(json.dumps(d,sort_keys=True).encode())
if len(sys.argv)>3: h.update(open(sys.argv[3],'rb').read())
h.update(open(sys.argv[2],'rb').read())
import os
k=os.path.dirname(sys.argv[2])
for f in ('taller_web.py','SAL'):
    h.update(open(os.path.join(k,f),'rb').read())
# (la contraseña NO entra en la huella: datos.sha es público. Contraseña nueva = SAL nueva, y la SAL sí entra)
print(h.hexdigest())" "$W/caf.json" "$K/taller_app.html" ${TALGO[1]:-})
if [ -f "$R/datos.sha" ] && [ "$(cat "$R/datos.sha")" = "$H" ]; then echo "SIN_CAMBIOS lineas=$N"; exit 0; fi
python3 -I "$K/taller_web.py" "$W/taller.html" - "$W/web" --iconos "$K/iconos" --sal "$K/SAL" >/dev/null
cp -a "$W/web/." "$R/"
echo "$H" > "$R/datos.sha"
echo "LISTO lineas=$N"
