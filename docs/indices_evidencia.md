# Evidencia de índices — `EXPLAIN ANALYZE` antes y después

**Bloque:** Juan Camilo · **Motor:** PostgreSQL 16.15 · **Esquema:** `migraciones/001_creacion_esquema.sql`



---

## 1. Consulta elegida

**Pregunta de negocio:** ¿Cuál es el historial de pagos exitosos de un cliente, con el tipo de membresía y el plan al que corresponde? (es la pantalla de "pagos de un cliente"; el escritorio hace algo equivalente en `PagoDAO.listarTodosConCliente`).

Une **3 tablas**: `pagos` ⨝ `membresias` ⨝ `planes_membresias`.

```sql
SELECT p.id_pago, p.fecha_pago, p.valor, p.metodo_pago,
       m.tipo_membresia, pl.nombre AS plan
FROM pagos p
JOIN membresias m         ON m.id_membresia = p.id_membresia
JOIN planes_membresias pl ON pl.id_plan = m.id_plan
WHERE p.id_cliente = 'C100'
  AND p.estado_pago = 'EXITOSO'
ORDER BY p.fecha_pago DESC;
```

Devuelve 20 filas en los datos de prueba. (`'C100'` es un cliente del seed sintético; con el seed real usa un cliente que tenga varios pagos.)

## 2. EXPLAIN ANALYZE ANTES (sin índice)

Índices existentes en `pagos` en ese momento: solo `pk_pagos (id_pago)`. Postgres **no crea índices automáticamente sobre las llaves foráneas**, así que `pagos.id_cliente` no tenía ninguno.

```sql
EXPLAIN ANALYZE <consulta de arriba>;
```

```
Gather Merge  (cost=6692.33..6693.50 rows=10 width=43) (actual time=92.217..95.936 rows=20 loops=1)
  Workers Planned: 2
  Workers Launched: 2
  ->  Sort  (cost=5692.31..5692.32 rows=5 width=43) (actual time=74.038..74.044 rows=7 loops=3)
        Sort Key: p.fecha_pago DESC
        Sort Method: quicksort  Memory: 25kB
        Worker 0:  Sort Method: quicksort  Memory: 25kB
        Worker 1:  Sort Method: quicksort  Memory: 25kB
        ->  Nested Loop  (cost=0.43..5692.25 rows=5 width=43) (actual time=4.060..73.967 rows=7 loops=3)
              ->  Nested Loop  (cost=0.29..5691.53 rows=5 width=43) (actual time=4.013..73.865 rows=7 loops=3)
                    ->  Parallel Seq Scan on pagos p  (cost=0.00..5650.00 rows=5 width=35) (actual time=3.963..73.617 rows=7 loops=3)
                          Filter: (((id_cliente)::text = 'C100'::text) AND ((estado_pago)::text = 'EXITOSO'::text))
                          Rows Removed by Filter: 99993
                    ->  Index Scan using pk_membresias on membresias m  (cost=0.29..8.30 rows=1 width=24) (actual time=0.023..0.023 rows=1 loops=20)
                          Index Cond: (id_membresia = p.id_membresia)
              ->  Memoize  (cost=0.14..0.16 rows=1 width=16) (actual time=0.011..0.011 rows=1 loops=20)
                    Cache Key: m.id_plan
                    Cache Mode: logical
                    Hits: 6  Misses: 1  Evictions: 0  Overflows: 0  Memory Usage: 1kB
                    Worker 0:  Hits: 6  Misses: 1  Evictions: 0  Overflows: 0  Memory Usage: 1kB
                    Worker 1:  Hits: 5  Misses: 1  Evictions: 0  Overflows: 0  Memory Usage: 1kB
                    ->  Index Scan using pk_planes_membresias on planes_membresias pl  (cost=0.13..0.15 rows=1 width=16) (actual time=0.032..0.032 rows=1 loops=3)
                          Index Cond: (id_plan = m.id_plan)
Planning Time: 1.293 ms
Execution Time: 96.114 ms
```

**Lectura:** el cuello de botella es `Parallel Seq Scan on pagos`. Para encontrar 20 pagos de un cliente, Postgres leyó las 300 000 filas de la tabla (cada uno de los 3 procesos descartó unas 99 993) y hasta tuvo que lanzar 2 workers paralelos. Los joins con `membresias` y `planes_membresias` ya usaban sus llaves primarias y no son el problema.

## 3. Índice creado y justificación

```sql
CREATE INDEX idx_pagos_cliente_fecha ON pagos (id_cliente, fecha_pago DESC);
ANALYZE pagos;
```

**Por qué ayuda:**
- `pagos.id_cliente` es una **llave foránea** y es el filtro principal (`WHERE p.id_cliente = ...`) de esta consulta y de cualquier pantalla "pagos de un cliente". Sin índice, cada búsqueda recorre toda la tabla.
- Se agrega `fecha_pago DESC` como segunda columna porque la consulta ordena por ese campo; así el índice queda alineado con el patrón de uso (cliente + pagos más recientes).
- No se incluyó `estado_pago`: tiene pocos valores distintos (`EXITOSO`, `RECHAZADO`, `PENDIENTE`) y poca selectividad; el índice por cliente ya reduce las filas a unas pocas decenas.

**Costo del índice:** ocupa unos 7,7 MB frente a 29 MB de la tabla `pagos`, y hace un poco más lentos los `INSERT` de pagos. Es un costo razonable porque `pagos` se lee por cliente con frecuencia.

## 4. EXPLAIN ANALYZE DESPUÉS (con índice)

Se ejecutó el **mismo SQL**:

```
Sort  (cost=170.92..170.95 rows=12 width=43) (actual time=0.357..0.360 rows=20 loops=1)
  Sort Key: p.fecha_pago DESC
  Sort Method: quicksort  Memory: 26kB
  ->  Nested Loop  (cost=4.84..170.71 rows=12 width=43) (actual time=0.088..0.311 rows=20 loops=1)
        Join Filter: (pl.id_plan = m.id_plan)
        ->  Nested Loop  (cost=4.84..169.05 rows=12 width=43) (actual time=0.070..0.285 rows=20 loops=1)
              ->  Bitmap Heap Scan on pagos p  (cost=4.55..69.39 rows=12 width=35) (actual time=0.043..0.204 rows=20 loops=1)
                    Recheck Cond: ((id_cliente)::text = 'C100'::text)
                    Filter: ((estado_pago)::text = 'EXITOSO'::text)
                    Heap Blocks: exact=20
                    ->  Bitmap Index Scan on idx_pagos_cliente_fecha  (cost=0.00..4.55 rows=17 width=0) (actual time=0.023..0.023 rows=20 loops=1)
                          Index Cond: ((id_cliente)::text = 'C100'::text)
              ->  Index Scan using pk_membresias on membresias m  (cost=0.29..8.30 rows=1 width=24) (actual time=0.003..0.003 rows=1 loops=20)
                    Index Cond: (id_membresia = p.id_membresia)
        ->  Materialize  (cost=0.00..1.06 rows=4 width=16) (actual time=0.001..0.001 rows=1 loops=20)
              ->  Seq Scan on planes_membresias pl  (cost=0.00..1.04 rows=4 width=16) (actual time=0.005..0.005 rows=1 loops=1)
Planning Time: 1.411 ms
Execution Time: 0.480 ms
```

## 5. Comparación y conclusión

| Métrica | Antes | Después |
| :-- | :-- | :-- |
| Acceso a `pagos` | `Parallel Seq Scan` (300 000 filas leídas) | `Bitmap Index Scan` sobre `idx_pagos_cliente_fecha` |
| Filas descartadas por el filtro | ~99 993 por worker | 0 en el índice (20 bloques leídos) |
| Costo estimado (total) | 6693.50 | 170.95 |
| Tiempo de ejecución (`Execution Time`) | 96.114 ms | 0.480 ms |
| Workers paralelos | 2 | 0 (no hacen falta) |

Repitiendo la consulta 3 veces por lado, el tiempo fue de 84 / 55 / 97 ms antes y de 0,37 / 0,37 / 0,52 ms después: la mejora es de **más de dos órdenes de magnitud** y es estable, no un efecto de caché.

**Observaciones objetivas:**
- Sí cambió el plan: se pasó de `Seq Scan` a un índice. Ojo: el plan usa **`Bitmap Index Scan`**, no un `Index Scan` simple. Es normal en Postgres cuando se esperan varias decenas de filas dispersas en la tabla.
- Aunque el índice incluye `fecha_pago DESC`, el planner igual hace un `Sort` final (sobre solo 20 filas, 26 kB en memoria); aquí esa columna aporta poco, y se podría quitar sin perder el beneficio principal.
- El `Seq Scan on planes_membresias` del plan "después" es correcto: la tabla tiene 4 filas y leerla completa es más barato que usar un índice.
- **Vale la pena:** la consulta pasa de ~100 ms a menos de 1 ms, el índice cuesta pocos MB y `pagos` es una tabla que crece con el tiempo.
- **Advertencia:** con pocas filas (por ejemplo, un seed de unos pocos miles de pagos) Postgres puede seguir eligiendo `Seq Scan` aunque exista el índice, porque leer la tabla entera es igual de barato. No significa que el índice esté mal; con el volumen real del seed de Samuel la diferencia debería ser visible.

## 6. Cómo reproducirlo con el seed real

```sql
-- 0) Elegir un cliente con varios pagos y reemplazar 'C100' en la consulta
SELECT id_cliente, COUNT(*) FROM pagos GROUP BY id_cliente ORDER BY 2 DESC LIMIT 5;

-- 1) Asegurar que NO existe el índice y actualizar estadísticas
DROP INDEX IF EXISTS idx_pagos_cliente_fecha;
ANALYZE pagos;

-- 2) ANTES: ejecutar 2 o 3 veces y copiar la última salida completa
EXPLAIN ANALYZE <consulta>;

-- 3) Crear el índice
CREATE INDEX idx_pagos_cliente_fecha ON pagos (id_cliente, fecha_pago DESC);
ANALYZE pagos;

-- 4) DESPUÉS: mismo SQL, copiar la salida completa
EXPLAIN ANALYZE <consulta>;
```

Pega las salidas tal como salen de pgAdmin o psql en las secciones 2 y 4, y actualiza la tabla de la sección 5 con tus números.

## 7. Otros índices candidatos (sugerencia, no medidos)

Por el mismo motivo (llaves foráneas sin índice) y por su uso en `banco_consultas.sql`, podrían ayudar `historial_membresias(id_cliente)`, `pagos(id_membresia)`, `citas(id_instructor, fecha)` y `registros_ingresos(id_cliente, fecha)`. No los medí; solo el de `pagos` tiene evidencia completa.
