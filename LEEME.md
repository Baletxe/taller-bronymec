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

### v23 (20/10/2026) — entregas claras
- Hoy: bloque "Próxima entrega" con el día, cuántas líneas y unidades, el estado de cada línea (lista en stock / fabricar N / en el plan / subcontrata) y las tres entregas siguientes.
- Calendario: cada día enseña cuántas líneas se entregan; al tocarlo se abre la lista del día con la suma de unidades, flechas a la entrega anterior y siguiente, y el botón "Ver el día en la planificación" (lo que antes hacía el toque).
- Pedidos: agrupados por día de entrega, con la suma de líneas y unidades de cada día (antes por semana).
- Móvil: "Próxima entrega" va antes que el calendario; el número de líneas del día debajo de la fecha.

### v24 (20/10/2026) — lo terminado llega al panel CAF
- Lo que el taller marca "Terminado" en la ficha de una pieza viaja con tipos.json (`term`: línea de pedido → hora) a taller-plan; el workflow "Traer talleres de la app" lo copia a la rama datos y la pasada horaria lo escribe en la colección `terminadas` del panel CAF (V136): aviso en verde en Hoy toca ("Terminadas en el taller: almacén todavía no las ha sacado"), etiqueta en cada línea y pieza en verde en Fabricar. Sin quién, sin tiempos, sin cantidades (Jon, 20/10).

### v25 (20/10/2026) — completas en verde, Almacén rehecho, fluidez
- Regla fija de Jon: cuando el stock cubre lo pendiente la línea es completa y va en verde en todos los sitios (Almacén, Pedidos, Próxima entrega, Con retraso, fichas).
- Almacén: resumen arriba (completas · uds / con stock parcial), agrupado por día de entrega con su suma, ubicación del SGA en cada línea y barra de stock en las parciales.
- Pedidos: filtros en una fila deslizable; cabecera más corta.
- Fluidez: entrada suave al cambiar de vista y respuesta al toque en filas y botones (respeta "reducir movimiento").

### v26 (21/10/2026) — taller Aditiva (MJF)
- Nuevo taller "Aditiva": se elige en el panel CAF o en la app (Talleres y ficha de la pieza) como uno más, y vale para todos los pedidos de esa pieza.
- La pieza de aditiva se lleva aparte: como Subcontrata, no entra en el calendario de máquinas ni en las listas de fresa / torno / seccionadora. En Artículos aparece en su propio chip "Aditiva · n".
- La hoja de taller del panel CAF no le pone casillas de taller: dice "Aditiva (MJF): se lleva aparte".
- `sincronizar_talleres.py` y la pasada horaria aceptan `adit`.

### v27 (21/10/2026) — día a pantalla completa, datos al día, fresa y torno sin cruces
- Tocar un día (calendario de Hoy, Próxima entrega, "Después") abre la vista Día a pantalla completa: fecha grande, líneas y uds a entregar, por fabricar, completas, trabajos en máquina; entregas del día con su estado y lo que hay en cada máquina; flechas día a día, entrega a entrega, Hoy, Volver y "Planificar este día".
- Datos al día: si la app estuvo en segundo plano más de 2 minutos y hay datos nuevos, recarga sola; el chip "pendiente de actualizar" recarga al tocarlo; el aviso "Hay datos nuevos" en el móvil va abajo, sobre la barra, donde se ve. Con datos de más de 3 días, comprueba cada 30 s.
- En un taller (Fresa, Torno, Seccionadora) no se ve nada del otro: sin pestaña Talleres, sin selector de taller en la ficha (solo la etiqueta y "avisa al responsable"), sin sugerencias ni aviso de "piezas que no saben". Todo eso solo lo ve y lo decide Total.
- Cabecera del móvil con una fila menos: el plan solo con su punto y "pedidos del" fuera de la cabecera (sigue en Hoy y en Ajustes).

### v28 (21/10/2026) — día desde Planificación, tele por máquina, hora del Terminado, datos viejos imposibles de no ver
- Planificación: tocar la fecha de un día en la cabecera del calendario abre la vista Día.
- Pantalla de taller: en "Hoy en máquinas", un botón por máquina (Todas · Holzer 1 · …); con una elegida sale sola y a lo grande. Se recuerda en el aparato.
- Las líneas marcadas Terminado siguen en las entregas del día, en verde y con la hora: "Terminada en taller · 21 oct 14:32".
- Datos al día: comprueba la versión al abrir, al volver el foco y cada 2 min (30 s si el export tiene más de 3 días); recarga sola si nadie toca la pantalla 20 s, si estuvo en segundo plano 2 min o si los datos cargados tienen más de 3 h. Si aun así los datos tienen más de 26 h, aviso grande en Hoy con botón Actualizar.

### v29 (21/10/2026) — calendario de verdad en el móvil
- Móvil vertical: una sola barra (‹ fecha › · Hoy/Semana · pantalla completa · ⋯). Proponer, Otro trabajo, Por planificar (con su número en el ⋯), Pasar a hoy y Deshacer van en el menú ⋯. Por planificar oculto por defecto.
- Columna de máquinas estrecha (sigla y nombre); la semana arranca en hoy, se ven dos días y pico y el desplazamiento encaja por días. Ya no vuelve al lunes cada vez que se repinta (también en el PC).
- Un día en vertical: cada máquina es una franja fija arriba con su carga, y sus fichas debajo a todo el ancho.
- Móvil girado o botón pantalla completa: fuera cabecera y barra de abajo; la semana entera (lunes a sábado) cabe en el ancho y las máquinas se reparten el alto. En Chrome el botón pide pantalla completa y gira a horizontal si el móvil lo deja; si no, basta con girarlo.

### v30 (21/10/2026) — cabecera del móvil con una fila menos
- En el móvil, el punto del plan, Buscar y Ajustes van en la misma fila que el logo BM; debajo, CAF/Talgo y el taller. Más alto libre para el calendario y las demás vistas.

### v31 (21/10/2026) — el taller junto al logo y fresa nueva
- En el móvil, el botón del taller (Fresa, Torno, Seccionadora, Total) sube a la fila del logo BM; por debajo de 420 px solo el icono. Tocarlo lleva a elegir taller, como el logo.
- Icono de fresa nuevo: fresa de mango inclinada con hélice.

### v32 (21/10/2026) — todo dato se puede pinchar
- Auditoría de todas las vistas (tw/dead.js + tw/lk32.js): cifras y títulos de día sin enlace pasan a llevar a su lista. Hoy: "N líneas van con retraso" → Pedidos con retraso, "uds por fabricar" → Artículos, "N urgentes sin planificar" → Plan con Por planificar (7 días), cabeceras de cada caja → su lista, cada máquina y su carga → el día en Planificación, "Mañana: n fichas" → mañana, domingos del calendario → su día, aviso de datos viejos y "Datos de…" → actualizar. Pedidos y Almacén: título de cada día → vista Día. Planificación: cabecera del día entera → vista Día, esquina del taller → Semana, máquina → alterna semana / día. Semana: cada cifra, máquina y día → su origen. Vista Día: cada cifra baja a su lista (con destello). Talleres: progreso → tablero.
- En la copia fijada en Claude el plan compartido no puede conectar (Claude no deja hablar con GitHub): el aviso lo explica y "Abrir la app" abre la web completa.

### v33 (21/10/2026) — volver fácil y fichas sin letras encima
- El botón Atrás del móvil vuelve a la pantalla anterior de la app (pantalla completa → día → semana → Hoy) en vez de salir.
- Móvil girado: barra de abajo fina con iconos. Pantalla completa: el botón dice "Salir" y hay "‹ Volver" flotante.
- Fichas en el móvil: el círculo de hecho no tapa el título ni el código; cantidad, horas y fecha bajan de línea; "+ Trabajo" es un "+" redondo en la semana. Test tw/ov.js (solapes de texto en el calendario: 0 en 360, 412 y girado).
