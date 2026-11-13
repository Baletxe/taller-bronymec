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

### v34 (22/10/2026) — pantalla de taller táctil (monitor interactivo)
- Hoy en máquinas: tocar una ficha abre la pieza (en oscuro y grande); el círculo de cada ficha marca hecho. Urgente: tocar una línea abre su ficha con Terminado. La semana: cada cifra lleva a su página; cada máquina abre Hoy en máquinas con esa máquina sola.
- Deslizar cambia de página; cualquier toque pausa el pase 60 s; una ficha abierta se cierra sola a los 90 s sin tocar.
- "‹ App" pasa a la app normal; "Pantalla de taller" vuelve. Enlace directo al modo pantalla: https://baletxe.github.io/taller-bronymec/?tv (se recuerda).
- Test tw/v34.js (1920x1080 táctil).

### v35 (22/10/2026) — Programa y Material en cada ficha
- Cada ficha planificada lleva dos casillas: Programa y Material. Se tocan en el calendario (semana y día), en Hoy en máquinas, en la vista Día, en la pantalla de taller y en la ficha abierta (grandes). Con las dos activas la ficha lleva borde verde ("lista para empezar"). Se puede deshacer.
- Viajan con el plan compartido (campos `prg` y `mat` de cada ficha) y salen en la hoja impresa (columnas Prog. / Mat.). Test tw/v35.js.

## v36 (22/10/2026) — Producción y Panel de control en la portada
- [Jon, 22/10: "donde está CAF tener las dos opciones, y donde está Talgo… por un lado producción y por otro el panel de control"; "una única aplicación en mi móvil"].
- En aparatos de gerencia (grupo Jon o Ander en Mensajes, o clave de responsable recordada) cada empresa de la portada lleva un selector **Producción | Panel de control**. Producción = los talleres de siempre; Panel de control = botón grande que abre el Control de Pedidos de esa empresa en Claude (CAF JaNin9x1uSdN9N7M86ywHP, Talgo ANQdhLtbetajpn863XY5cZ). La elección se recuerda por empresa (`taller.pq.<emp>`).
- En las tablets del taller no aparece. La app sigue sin precios: el panel vive en Claude y pide la cuenta de Jon.
- Móvil: el nombre de la puerta encoge en vez de cortarse ("Seccionadora"), "✉ n por contestar" en una línea y "Lo más urgente" en dos líneas en vez de cortarse.

## v37 (22/10/2026) — El panel de control DENTRO de la app · icono solo BM
- [Jon, 22/10: "no quiero que sea enlace"; "misma aplicación, con las dos opciones"; clave de Total; "consultar y marcar enviado"; "si se puede poner solo BM mejor, sin taller"].
- Portada (solo aparatos de gerencia: grupo Jon/Ander o clave recordada): en CAF y en Talgo, **Producción | Panel de control**. Panel de control pide la clave de responsable (se recuerda en el aparato) y abre el panel completo a pantalla completa dentro de la app (`panel.html?e=caf|talgo` en un iframe, barra "‹ CAF · Panel de control", Atrás del móvil cierra).
- `panel_build.py` saca el mismo código del panel con su base de datos dentro (la pasada horaria ya sube panel y base cifrados a la rama datos); `taller_web.py --panel caf=… --panel talgo=…` los cifra como data.enc (`panel-caf.enc`, `panel-talgo.enc`, misma clave) y escribe `panel.html` (CSP propia). Datos renovados cada hora con la web.
- Escritura: SOLO marcas (enviado, parcial, nota…). Se guardan en el aparato (`panel.cola.v1`), se ven al momento, la app las sube a `taller-plan/panel-cambios.json` y la pasada horaria de Claude las escribe en la base del panel (paso 4c). El resto (precios, decisiones…) avisa de solo lectura.
- Seguridad (decisión de Jon): protección = contraseña del taller + clave de responsable; cuando se instale en las tablets del taller, se hará una versión sin panel.
- Manifest: nombre "Bronymec"; iconos nuevos sin "TALLER" (BM + tres barras).

## v38 (25/10/2026) — Paneles cifrados con la clave de gerencia
- [Jon, 25/10: la clave de responsable se veía en el código público y era lo único que protegía pedidos, precios y contratos.]
- `panel-caf.enc` y `panel-talgo.enc` van cifrados con otra clave, la de gerencia (secreto PANEL_CLAVE, 16+ caracteres, distinta de la del taller) y su propia sal (`SAL_PANEL`). La frase del taller ya no abre los paneles.
- `panel.html` pide la clave de gerencia; "Recordar en este aparato" guarda solo la llave derivada (por sal: si cambia la clave, la vuelve a pedir).
- Sin PANEL_CLAVE no se publica ningún panel y `actualizar.sh` borra de la web los que hubiera.
- Cambiar la clave de gerencia = poner el secreto PANEL_CLAVE y después una `SAL_PANEL` nueva.
- La clave de responsable de "Total" sigue siendo solo una barrera de pantalla, no protege datos.

## v39 (26/10/2026) — Pantalla de la oficina: todo en una app
- Enlace https://baletxe.github.io/taller-bronymec/?oficina deja el aparato como pantalla de gerencia (`taller.oficina`): sale Producción | Panel de control en CAF y Talgo sin pasar por la clave de responsable. Los paneles siguen pidiendo la clave de gerencia (v38), que es lo que protege los datos.

## v40 (26/10/2026) — Panel de control solo con la clave de gerencia
- El Panel de control ya no pide la clave de 4 cifras de Total: solo la de gerencia (la que de verdad protege los datos, v38).
- Clave de gerencia: botón Ver, sin autocorrector, y tolera espacios al final.
- Web: si la clave de gerencia es igual que la del taller, se publica sin paneles en vez de fallar.

## v41 (30/10/2026) — dentro de Claude, siempre Producción | Panel de control
- En la copia fijada en Claude (artifact), la portada enseña siempre el selector Producción | Panel de control.
- (Nota escrita el 11/11/2026: v40 y v41 se publicaron sin nota en este LEEME ni cambio en `VERSION`, que sigue en 37.
  `VERSION` se pondrá al día en la próxima publicación, con el sí de Jon, porque lo compara la pasada horaria.)

## v51 (13/11/2026) — Las cifras cuadran en todas partes y los otros trabajos tienen su tarjeta
- **Unidades a fabricar:** Hoy contaba solo las piezas con código que van a máquinas, pero su cifra llevaba a Artículos, que cuenta
  todas (como la portada). Ahora Hoy cuenta lo mismo que la lista a la que lleva y que la portada (la prueba lo compara).
- **Portada, Por cliente:** detrás de CAF y Talgo, la tarjeta **OTROS** (trabajos fuera de CAF y Talgo): por hacer, con retraso,
  unidades pendientes, entregas de la semana y lo más urgente. Cada cifra lleva a su lista de otros trabajos en Pedidos.
- Ir a la lista de otros trabajos deja la lista a la vista, justo debajo de la barra de arriba.

## v52 (13/11/2026) — Lo importante, a la vista al abrir
- **Hoy:** los avisos (instalar, datos antiguos, plan sin conectar, piezas sin taller) van compactos, dos por fila en tablet y PC.
  Antes ocupaban media pantalla y el resumen del día quedaba abajo; ahora el resumen y sus cifras se ven sin deslizar.
- **Cabecera:** en tablet y PC pasa de tres filas a dos (el buscador se adapta al hueco).
- **Etiqueta de cliente** (CAF, TALGO) en las filas de Hoy: es una etiqueta pequeña, ya no una barra a todo lo ancho.

## v50 (13/11/2026) — Vista general del taller: primero el taller entero, luego cada cliente
- Jon: "empezar por una vista general y luego entrar en CAF o Talgo". La **portada** abre con la tarjeta **TALLER** (todos los
  clientes: líneas abiertas, retrasos, unidades a fabricar, entregas de la semana, otros trabajos y lo más urgente) con sus
  puertas Fresa, Torno, Seccionadora y Total; debajo, **Por cliente**, las tarjetas de CAF y Talgo como antes.
  Las cifras del TALLER son exactamente la suma de las de los clientes (lo comprueba la prueba).
- Dentro, el selector de arriba es **TODOS · CAF · TALGO** (en el móvil caben los tres). En Todos, Hoy ("Taller · día"), Pedidos,
  Artículos, Planificación, Talleres y Almacén juntan los dos clientes y **cada fila lleva la etiqueta de su cliente**.
  El operario de un taller ve todos los clientes de su taller. Un aparato nuevo empieza en Todos; cada aparato recuerda su elección.
- Por dentro: `S.emp = 'todo'` junta líneas y piezas; cada una sigue sabiendo su empresa (`data-emp` en todo lo que se toca).
  Planificar, arrastrar y abrir fichas trabajan siempre con la empresa de su pieza (`activar(e)`), aunque el mismo código exista
  en los dos clientes. Ninguna ficha nueva queda sin empresa. El plan compartido no cambia de formato.
- Prueba nueva `pruebas/todos.js` (en el CI); la auditoría entra primero por Todos (capturas y clics muertos).

## v49 (13/11/2026) — Pantalla de entrada: "Plan de fabricación del taller"
- La pantalla de la contraseña decía "Producción del taller · CAF · Talgo" (de cuando iban juntos paneles y producción).
  Ahora dice "Plan de fabricación del taller". Solo cambia ese texto (`taller_web.py`).

## v48 (12/11/2026) — Fabricación va suelta de los paneles
- Jon: Fabricación es solo el plan de fabricación (CAF, Talgo y Total). Los paneles de control (CAF, Talgo, ofertas…) van aparte.
  Fuera de la app la entrada "Producción | Panel de control" de la portada, el panel a pantalla completa y su clave; la portada
  se llama siempre "Fabricación Bronymec". `actualizar.sh` ya no genera ningún panel y quita de la web los que hubiera
  (`panel.html`, `panel-*.enc`). Si algún día se quieren unir, lo dirá Jon.
- Las cifras con estado (retraso, esta semana, bien) llevan el color alrededor de toda la tarjeta, no solo arriba.
- `?oficina` sigue funcionando (abre la app como siempre). Prueba nueva en `oficina.js`: la portada no lleva paneles.

## v47 (12/11/2026) — Estética: el lenguaje de la portada en toda la app
- **Hoy** abre con una cabecera de héroe como las tarjetas de la portada (azul CAF o morado Talgo, rayado fino, brillo) y las cifras
  en tarjetas de cristal con su banda de color (rojo retraso, ámbar esta semana).
- Cabecera con brillo y línea de marca en degradado; títulos de pantalla con su barra; tarjetas y filas con relieve y, en PC, se
  levantan al pasar el ratón; estados como píldoras; cifras grandes con banda de color según su estado.
- **Oficina:** se ve si estás en Ventas o en Gerencia (interruptor); Gerencia en dos filas de tres; la cabecera de cada pedido
  toma el color de su estado.
- **Móvil:** los avisos de arriba (instalar, datos viejos, plan sin conectar) ocupan una línea con su botón: Hoy se ve antes.
- Solo presentación (`src/css/33-v47-estetica.css`): ni textos ni enlaces cambian. Accesibilidad 100 % en claro y oscuro,
  auditoría 0/0/0 en los 6 tamaños, se imprime igual que antes.

## v46 (12/11/2026) — Fases 2 a 5 completas: Oficina (Ventas y Gerencia), accesibilidad y Sage preparado
- **Fase 2 (fin):** los otros trabajos salen también en la pantalla de taller (`?tv`, pantalla Urgente: con retraso y de esta semana,
  junto a las líneas de pedido) y en Semana en números ("N otros trabajos por hacer · M con retraso", se pincha). **Planos y fotos**
  en cada otro trabajo (hasta 8, cifrados como los adjuntos de los mensajes en `adj/` de taller-plan); al partir una ficha la copia
  los conserva y un fichero solo se borra cuando ya no lo usa nadie.
- **Fase 3 · Oficina** (solo en Total, módulo `src/js/22c-oficina.js`):
  - **Ventas:** cada pedido (CAF, Talgo y otros trabajos) con el estado de cada línea y su **fecha prevista de salida**, sacada del
    calendario: el día de la última ficha que la completa (primero cuentan las fichas ya hechas). Estados: en stock / cubierta,
    fabricada pendiente de almacén, planificada (sale el …), planificadas X de Y, sin planificar, subcontrata o aditiva.
    Filtros con su cuenta: con retraso, saldrán tarde (planificadas después de la entrega), falta planificar, listos. Se busca por
    cliente, planta, pedido, pieza o código.
  - **Gerencia:** cumplimiento del plan, líneas con retraso (y media de días), saldrán tarde, sin planificar con entrega en 14 días,
    terminado pendiente de almacén y otros trabajos; carga de las dos próximas semanas por taller. Cada cifra lleva a su lista.
  - **Evolución:** foto diaria de esas cifras en `taller-plan/hist.json`, cifrada con la llave del plan (fichero aparte: los aparatos
    viejos no lo tocan). La guarda el primer aparato conectado de cada día y se renueva cada 30 min si cambia; lo que llega mal se
    limpia (solo cifras). La copia horaria del plan copia también `hist.json` (`plan_copia.py`, workflow en `instalar/`).
- **Fase 4 · pulido:** accesibilidad WCAG 2.1 AA con axe-core (el motor de Lighthouse): 100 % de reglas en todas las vistas, en modo
  claro y oscuro. Contraste de grises, ámbar, rojo y verde (`--soon-tx` para el texto ámbar), filas que se tocan enteras y llevan
  botones dentro pasan a "grupo" con nombre (se abren igual con el dedo, el ratón o Intro), lista "Por planificar" accesible con teclado.
  Medido: abre en ~0,5 s con la CPU 4 veces más lenta (tablet normal), funciona sin conexión con los últimos datos y las tres hojas
  impresas salen sin cortarse en A4 y sin precios. Prueba `pruebas/pulido.js`.
- **Fase 5 · preparado, no activo:** adaptador de **Sage** (`adaptadores.sage(..., activo=True)` + `sage_filas`): contrato de columnas,
  nunca copia precios (los descarta y avisa), no inventa stock ni cruces, y lo que no se entiende no entra y se dice. **Semáforo de
  material** (`semaforo_material`): verde, ámbar, rojo o sin dato, repartiendo por orden de entrega. Documento:
  `docs/FASE5_SAGE_Y_MATERIAL.md`. Para encenderlos hace falta decidir qué clientes y qué export.
- Pruebas nuevas en el CI: `oficina.js` (GitHub simulado), `pulido.js`; `manuales.js` amplía con Semana, `?tv` y planos;
  `test_adaptadores.py` con el contrato de Sage y el semáforo; `test_plan_copia.py` con la foto diaria.

## v45 (12/11/2026) — Fase 2: los otros trabajos salen como pedidos
- Las fichas "Otro trabajo" se agrupan en pedidos (mismo cliente, pedido/plano, descripción y entrega = un pedido, aunque esté
  partido en varias fichas; lo hecho son las fichas marcadas hecho). Salen en **Pedidos**, en su sección "Otros trabajos", con los
  mismos filtros (retrasadas, esta semana, a fabricar, terminadas), y en **Hoy**, con un botón "N otros trabajos · M con retraso"
  que lleva a la lista. Respetan el taller elegido (por la máquina de cada ficha). Módulo `src/js/22b-otros-trabajos.js`.
- La auditoría lleva ya unos otros trabajos de prueba en el plan de la tablet, para medir también esta sección en los 6 tamaños.

## v44 (12/11/2026) — Fase 2, primer paso: alta rápida de otros trabajos
- Alta rápida en la ficha "Otro trabajo": **Repetir** (los últimos trabajos, rellenan todo de un toque), autocompletar en qué hay
  que hacer, cliente y pedido/plano, **Duplicar** una ficha (va al día siguiente) y **Pegar varias desde Excel**
  (Cliente · Pedido o plano · Qué hay que hacer · Unidades · Entrega): entran las filas buenas y se dice cuáles no y por qué.
- Prueba con navegador: `pruebas/manuales.js` (alta en 5 toques, repetir, duplicar, pegar con filas malas).

## v43 (12/11/2026) — Talgo: stock según SGA, sin verificar (como el panel Talgo)
- Jon, 12/11: el stock de Talgo sale del listado del SGA, pero el SGA "no es muy fiable": la app hace lo mismo que el panel
  Talgo (I7). Si el panel trae el bloque `<script id="sga">`, `talgo_datos.py` añade a cada línea en firme `sga` = unidades
  ubicadas (ALMSUP… y SRL) de su código, repartidas por fecha de entrega como en el panel.
- Se ve en ámbar ("Stock según SGA · sin verificar", con ubicaciones) en la ficha de la línea y en Pedidos. NUNCA en verde:
  `stock` y `serv` de Talgo no cambian. El log de la publicación solo da recuentos.
- Probado antes con la tabla del panel CAF: 0 de 30 códigos de Talgo estaban (solo trae los de CAF), por eso se descartó.
- Pruebas: `pruebas/test_talgo_stock.py` (en Windows se saltan por falta de husos horarios; corren en el CI).
- Cambio de la contraseña del taller sin perder nada: `cambiar_clave.py` (piezas: comprobar la actual contra la web, sal nueva,
  recifrar el plan compartido y comprobarlo, secreto de GitHub) y el orquestador `fase0/tools/cambiar_clave_taller.ps1` en el PC
  de Jon. Orden: plan recifrado → secreto → sal → web → comprobaciones con la nueva. Pruebas: `pruebas/test_cambiar_clave.py`.

## v42 (12/11/2026) — Fase 1: módulos, plan a salvo, copias y todo dato enlazado
Para el taller (lo que se ve):
- Todo dato se pincha (regla 5): la portada (líneas abiertas, retrasos, uds a fabricar, entregas de la semana, lo más urgente,
  fichas en el calendario) lleva a su lista filtrada; la hora de los datos, a los pedidos; en Hoy, Pedidos, Talleres y Semana,
  fecha → día, semana → semana en números, recuentos → su lista. Los rótulos que no son datos llevan `data-txt`.
- La copia de Claude (artifact) avisa siempre de que no conecta con GitHub (regla 11), en la portada y en Hoy.
- Móvil girado: el número de entregas ya no tapa el día en el calendario; la cabecera se va al bajar y la barra de abajo
  queda en iconos (como ya hacía el calendario).
Para que nadie pierda nada:
- Plan compartido ilegible: ya no se reescribe nunca (antes se trataba como vacío y se pisaba). Plan de la tablet dañado:
  se aparta sin borrar (`taller.plan.v1.ilegible`) y vuelve entero del compartido, sin subir borrados.
- `plan_copia.py` + workflow `instalar/taller-plan/.github/workflows/copia-plan.yml`: copia horaria del plan compartido a la
  rama `copias` de taller-plan con prueba de restauración y estado `plan-ultima.txt` (se instala aparte, con el sí de Jon).
Por dentro:
- La app se edita en `src/` (56 ficheros); `build_app.py` monta `taller_app.html` (`--comprobar` falla si se separan).
- `adaptadores.py`: cada origen (caf, talgo; manual en la app; sage preparado para la Fase 5) entrega líneas en el formato
  común con `origen`. No inventa ni corrige: avisa (también si stock ≥ pendiente y la línea no sale completa, regla 6).
  `taller_build.py --estricto` falla con avisos (pruebas); en la publicación solo los cuenta.
- `taller_datos.js` deja pasar Aditiva (`adit`) del panel CAF a la app.
- Pruebas (CI en cada push): `test_kit.py`, `test_adaptadores.py`, `test_plan_copia.py`; `audit.js` (6 tamaños: cifras sin enlace,
  clics muertos, solapes, tapado, scroll horizontal, Atrás, ?tv, ?oficina, artifact y enlaces de la portada);
  `plan_seguro.js` (plan ilegible, tablet dañada, saneado sin código, mezcla clave a clave);
  `visual.js` (cambios a la vista frente a la web publicada); beta aislada (`beta_build.py` + `beta_aislada.js`).
- `VERSION` pasa de 37 a 42 (v40 y v41 se publicaron sin subirla).
