#!/usr/bin/env bash
# Prepara los datos de los paneles para la rama "datos" (cifrados con age, llave pública de la rama).
# Uso: bash subir_datos.sh W D
#   W: carpeta con caf/index.html, db/<coleccion>/<id>.json y, si hay, talgo/index.html y tdb/...
#   D: clon de la rama datos (con llave_publica.txt y datos.sha256)
# Imprime SIN_CAMBIOS si los datos son los mismos que los ya subidos; LISTO si deja datos.age y datos.sha256
# nuevos en D (el commit y el push los hace quien lo llama). Aquí no entra ninguna contraseña.
set -euo pipefail
W=$(cd "$1" && pwd); D=$(cd "$2" && pwd)
[ -s "$W/caf/index.html" ] || { echo "ERROR: falta el panel CAF"; exit 2; }
for c in marcas precios pedidos_extra; do
  [ -n "$(ls -A "$W/db/$c" 2>/dev/null)" ] || { echo "ERROR: la colección $c está vacía"; exit 3; }
done
command -v age >/dev/null || { echo "ERROR: falta el programa age"; exit 4; }
P=$(grep -o 'age1[0-9a-z]*' "$D/llave_publica.txt" | head -1)
[ -n "$P" ] || { echo "ERROR: llave_publica.txt no trae una llave age"; exit 5; }
cd "$W"
L=(caf db); [ -d talgo ] && L+=(talgo); [ -d tdb ] && L+=(tdb)
# Huella del contenido (rutas + ficheros, en orden fijo), sin fechas ni dueños
H=$(find "${L[@]}" -type f | LC_ALL=C sort | while read -r f; do printf '%s\0' "$f"; sha256sum < "$f"; done | sha256sum | cut -d' ' -f1)
if [ -f "$D/datos.sha256" ] && [ "$(tr -d ' \n' < "$D/datos.sha256")" = "$H" ]; then echo "SIN_CAMBIOS"; exit 0; fi
tar --sort=name --mtime=@0 --owner=0 --group=0 --numeric-owner -cf - "${L[@]}" | gzip -n -9 | age -r "$P" -o "$D/datos.age"
echo "$H" > "$D/datos.sha256"
echo "LISTO $(find caf db -type f | wc -l) ficheros CAF$( [ -d talgo ] && echo ' + Talgo' || echo ' (sin Talgo)')"
