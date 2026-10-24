# Rama datos (automática)

La tarea programada de Claude sube aquí `datos.age`: los datos de los paneles CAF y Talgo, cifrados con
la llave pública de `llave_publica.txt` (age). Nadie puede leerlos sin la llave privada, que solo está en el
secreto `DATOS_LLAVE` del repositorio.

Cada vez que cambia `datos.age`, el workflow `.github/workflows/actualizar-web.yml` descifra los datos,
monta la web con el kit de la rama `herramientas` (contraseña en el secreto `TALLER_CLAVE`) y la publica en `main`.

`datos.sha256` es la huella de los datos sin cifrar: si no cambia, la tarea no sube nada.
No tocar a mano.

Antes de publicar, el workflow comprueba que `TALLER_CLAVE` abre la web que ya está publicada: un secreto mal
pegado nunca cambia la contraseña del taller. Los datos los prepara `subir_datos.sh` (rama `herramientas`).

`plan.age` es el acceso al plan compartido (repo privado taller-plan), cifrado con la misma llave. El workflow lo
mete dentro de la web cifrada con la contraseña del taller: así cualquier tablet que abra la app queda conectada
sola al mismo calendario, sin enlaces. Si se cambia el acceso, basta con volver a cifrarlo con `llave_publica.txt`.

Lo que decide el taller en la app (taller de cada pieza y piezas terminadas) se queda solo en el repo privado
taller-plan; la pasada horaria lo lee de ahí. En esta rama pública no se guarda nada en claro salvo `pasada.txt`
(Jon, 24/10/2026).
