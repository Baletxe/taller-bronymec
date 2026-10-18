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

## Mensajes (kit v18-v20, 17-18/10/2026)

- Pestaña Mensajes: grupos Taller de fresa, Taller de torno, Producción, Comercial y Dirección. Cada aparato dice quién es
  (nombre y grupo, guardado en el aparato). "Necesita respuesta" deja la conversación en rojo hasta que el grupo destinatario
  contesta. Los mensajes viajan cifrados con el plan compartido (claves `x:`/`y:`); los adjuntos, cifrados en taller-plan/adj/.
- v19: borrar la conversación entera (quien la empezó o Dirección) y los mensajes propios, con doble toque; los adjuntos se
  borran del repo. Calendario de Hoy: el color de carga va solo en la casilla de la semana; los días, neutros.
- v20 · Teams en los dos sentidos. Agenda y dirección del flujo en el plan cifrado (clave `q:teams`, solo la edita Dirección).
  Salida: la app lanza `repository_dispatch` `teams-out` a Baletxe/taller-plan → Action "Teams · enviar mensaje" → flujo de
  Power Automate (tarjeta con casilla de respuesta). Entrada: el flujo lanza `teams-in` → Action "Teams · recibir respuesta"
  cifra con `teams/pub.json` (RSA-OAEP-256 + AES-GCM) y deja el fichero en la rama `puente` (teams/in/) → la app lo descifra
  con la clave privada del plan, lo mete en la conversación y lo borra. Scripts en taller-plan/.github/teams/.
  Montaje del flujo y límites: documento `claude/teams-mensajes-taller.md` del proyecto CAF.

## v21 · Recordar la clave de responsable (18/10/2026)

- En la ventana de la clave de Total hay una casilla "Recordar en este aparato". Si se marca, ese aparato (PC de Jon, tablet de un responsable)
  entra en Total sin volver a pedirla (`localStorage` `taller.resp`). En la portada sale "Volver a pedir la clave en este aparato" para quitarlo.
  Las tablets del taller no cambian: mientras nadie marque la casilla, Total sigue pidiendo la clave.
- Saludo de la portada en euskera (Egun on / Arratsalde on / Gabon): en todo el entorno Bronymec los saludos van en euskera (Jon, 18/10/2026).
- Grupos de Mensajes (Jon, 18/10/2026): Fresadorak (fresa), Tornoak (torno), Gaizka (prod), Comercial (com), Almacén (alm, nuevo) y Jon (dir). Las claves internas no cambian, así que las conversaciones de antes siguen en su sitio.
- Grupo Ander (ger, gerente, 18/10/2026): mismos permisos que Jon (borrar conversaciones y conectar con Teams), función `esDir`.
