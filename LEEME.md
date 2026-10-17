# Kit de actualización de la web del taller

Rama separada de `main` para que GitHub Pages no sirva estos ficheros. No contiene datos ni contraseñas.
`VERSION` = versión del kit (campo "version" del documento herramientas/taller_kit del panel CAF).

Uso (desde la raíz del repo, con esta rama en ./kit):

    bash kit/actualizar.sh kit CAF.html CAF_DB TALGO.html TALGO_DB . CLAVE

## Taller de cada pieza (kit v13, 17/10/2026)

El taller de cada pieza (fresa / torno / subcontrata) es una sola biblioteca para el panel CAF y la app:

- Panel → app: `taller_datos.js` saca la colección `taller` del panel como `[emp|clave, taller, ts]` y la app la
  importa al arrancar (gana la hora más reciente).
- App → panel: la app sube a taller-plan `tipos.json` (en claro: solo claves de pieza, taller, hora y reglas por
  palabra). La pasada horaria lo lee y ejecuta `sincronizar_talleres.py tipos.json DB/taller salida.json`, que
  lista las escrituras pendientes para la colección `taller` del panel (ver la cabecera del script).
