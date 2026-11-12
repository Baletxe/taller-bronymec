# Fase 5 · Sage y semáforo de material (preparado, no activo)

🟢 Los dos están escritos y probados (`adaptadores.py`, pruebas en `pruebas/test_adaptadores.py`), pero **no entran en la web**:
`taller_build.py` no los llama. Para encenderlos hace falta la decisión de Jon de qué clientes entran por Sage y con qué export.

## 1 · Adaptador de Sage

**Para qué:** los pedidos de clientes que no son CAF ni Talgo (hoy se meten a mano como "Otro trabajo") podrían llegar solos
desde Sage, igual que llegan los de los paneles.

**Entrada (contrato):** las filas del export de pedidos de venta abiertos de Sage, una por línea, con estas columnas:

| Columna de Sage | Campo del formato común | Regla |
|---|---|---|
| `pedido` | `pedido` | obligatorio |
| `linea` | `linea` | número, obligatorio |
| `cliente` | `empresa` | |
| `planta` | `planta` | |
| `articulo` | `cod` | solo si el artículo existe (lista `articulos`); si no, sin código y `cruce` vacío |
| `referencia` | `ref` | plano o referencia del cliente |
| `descripcion` | `desc` | obligatorio |
| `pedida`, `servida` | `pedida`, `entregada` | números; admite `1.200` y `3,5` |
| `pendiente` | `pend` | obligatorio, no negativo |
| `entrega` | `fecha` | `dd/mm/aaaa` o `aaaa-mm-dd`; una fecha imposible no entra |

**Nunca precios:** cualquier columna que se llame precio, importe, total, IVA, descuento, tarifa, coste, factura o contrato
se descarta sin copiarla, y se avisa de que venía. Además, la salida pasa el mismo guardián de `taller_build.py`.

**Nada se inventa:** el stock, lo asignado y el estado de servicio quedan vacíos (sin dato), nunca a 0. Una fila que no se
entiende no entra y el aviso dice qué fila y por qué.

**Uso (cuando se active):** `adaptadores.sage({'filas': [...], 'articulos': [...], 'export': 'AAAA-MM-DD'}, activo=True)`
devuelve la empresa en formato común (`origen: 'sage'`) y la lista de avisos. Sin `activo=True` falla a propósito.

**Para activarlo hace falta:** (1) qué clientes entran por Sage, (2) un export de prueba sin precios para ajustar los nombres
de columna, (3) dónde lo deja la pasada horaria (como `caf.json`) y (4) un paso más en `actualizar.sh` + `taller_build.py --sage`.

## 2 · Semáforo de material

**Para qué:** antes de planificar, saber si hay material para lo que falta de cada pieza.

**Entrada:** necesidades `[{cod, mat, necesario, fecha}]` (qué material y cuánto necesita lo que falta de cada pieza) y
existencias `{material: disponible}` en la misma unidad (kg, barras o placas).

**Salida por pieza:**
- 🟢 `verde`: hay material con más de un 20 % de margen.
- 🟡 `ambar`: llega justo (menos del 20 % de margen).
- 🔴 `rojo`: no llega.
- sin dato (`None`): no se sabe el material o su existencia. Nunca se supone que hay.

El material se reparte por orden de entrega, igual que el stock en la regla 6: lo que se lleva la primera pieza ya no
está para la siguiente.

**Para activarlo hace falta:** de dónde sale la existencia de material (SGA u hoja de almacén) y el material y consumo por
pieza (hoy la app solo deduce el material de la descripción, de forma orientativa).
