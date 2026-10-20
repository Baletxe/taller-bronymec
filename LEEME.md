# Kit de actualización de la web del taller

Rama separada de `main` para que GitHub Pages no sirva estos ficheros. No contiene datos ni contraseñas.
`VERSION` = versión del kit (campo "version" del documento herramientas/taller_kit del panel CAF).

Uso (desde la raíz del repo, con esta rama en ./kit):

    bash kit/actualizar.sh kit CAF.html CAF_DB TALGO.html TALGO_DB . CLAVE

## Taller de cada pieza (kit v13, 17/10/2026)

El taller de cada pieza (fresa / torno / seccionadora / subcontrata) es una sola biblioteca para el panel CAF y la app:

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
- Teams (18/10/2026): la salida lleva `para` (correos de Teams del grupo destinatario, de la agenda) para que el flujo mande la tarjeta a cada persona; la prueba va a la gente del grupo de quien la lanza.

## v22 · Seccionadora (19/10/2026)

- Jon, 19/10/2026: la Seccionadora es un taller más, con una máquina, igual que Fresa y Torno. Clave interna `secc`; máquina `sec`
  ("Seccionadora", color m6). Los planes antiguos la reciben sola al abrir la app (`normalizarPlan`), delante de Subcontratación.
- Portada con cuatro puertas por empresa (Fresa, Torno, Seccionadora, Total; en dos filas), calendario propio, columna en Talleres,
  botón en la ficha, reglas por palabra y sugerencias aprendidas también para `secc`; en Total sale como tercer grupo del calendario.
- `sincronizar_talleres.py` acepta `secc`. El panel CAF (V110+) todavía solo conoce fresa / torno / sub: una pieza en
  seccionadora sale allí como "Taller por asignar" hasta que se añada `secc` a `TAL` y `TAL_ORDEN` del panel.

### v22b (20/10/2026) — móvil
- Portada: en pantallas estrechas el nombre de cada puerta baja a su propia línea (icono y flecha arriba): "Seccionadora" ya no se sale de la caja.
- Barra de abajo: con 8 pestañas (Almacén incluido) los nombres ya no se montan; letra que se ajusta al ancho y corte con puntos si no cabe.
- Talleres › reglas: los cuatro botones de taller en 2×2 en el móvil.
