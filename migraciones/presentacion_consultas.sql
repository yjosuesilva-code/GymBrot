-- =============================================================================
-- PRESENTACIÓN DE CONSULTAS — GymBrot
-- Motor: PostgreSQL 12+. Requiere el esquema (001_creacion_esquema.sql) y los
-- datos de prueba (00_ejecutar_todo.sql) ya cargados.
-- Se ejecuta completo en el Query Tool de pgAdmin: no usa comandos de psql.
-- Para mostrar cada resultado en pgAdmin, selecciona el bloque y pulsa F5
-- (al ejecutar todo el archivo, pgAdmin solo muestra el resultado del último).
-- Orden de la presentación: vistas → plataforma (multi-gimnasio) → operación del
-- gimnasio → análisis (CTE, subconsulta) → rutina de un cliente.
-- =============================================================================


-- ---------------------------------------------------------------------------
-- 0. Vistas que usa la presentación (CREATE OR REPLACE: se puede re-ejecutar)
-- ---------------------------------------------------------------------------
CREATE OR REPLACE VIEW vista_membresias_vigentes AS
SELECT c.numero_identificacion,
       u.nombre || ' ' || u.apellidos AS cliente,
       u.correo,
       pl.nombre                      AS plan,
       m.id_membresia,
       m.modalidad_pago,
       m.fecha_inicio,
       m.fecha_vencimiento,
       (m.fecha_vencimiento - CURRENT_DATE) AS dias_restantes
FROM clientes c
JOIN usuarios u             ON u.numero_identificacion = c.numero_identificacion
JOIN historial_membresias h ON h.id_cliente = c.numero_identificacion
                           AND h.activa
JOIN membresias m           ON m.id_membresia = h.id_membresia
JOIN planes_membresias pl   ON pl.id_plan = m.id_plan
WHERE m.estado = 'ACTIVA'
  AND m.fecha_vencimiento >= CURRENT_DATE;

CREATE OR REPLACE VIEW vista_rutinas_detalle AS
SELECT r.id_rutina,
       r.nombre                         AS rutina,
       r.objetivo,
       ui.nombre || ' ' || ui.apellidos AS instructor,
       uc.nombre || ' ' || uc.apellidos AS cliente,
       re.dia_semana,
       re.orden,
       e.nombre                         AS ejercicio,
       e.grupo_muscular
FROM rutinas r
JOIN instructores i       ON i.numero_identificacion = r.id_instructor
JOIN usuarios ui          ON ui.numero_identificacion = i.numero_identificacion
JOIN usuarios uc          ON uc.numero_identificacion = r.id_cliente
JOIN rutina_ejercicios re ON re.id_rutina = r.id_rutina
JOIN ejercicios e         ON e.id_ejercicio = re.id_ejercicio;


-- ---------------------------------------------------------------------------
-- 1. [Vista] ¿Qué clientes tienen la membresía por vencer en los próximos 7 días?
-- ---------------------------------------------------------------------------
SELECT cliente, correo, plan, fecha_vencimiento, dias_restantes
FROM vista_membresias_vigentes
WHERE dias_restantes <= 7
ORDER BY dias_restantes, cliente;


-- ---------------------------------------------------------------------------
-- 2. [Multi-gimnasio] ¿Cuánto ha recaudado cada gimnasio en pagos exitosos,
--    en total y en los últimos 30 días?
-- ---------------------------------------------------------------------------
SELECT g.nombre                                                         AS gimnasio,
       g.plan_software,
       COUNT(*)                                                         AS pagos_exitosos,
       SUM(p.valor)                                                     AS ingresos_totales,
       COALESCE(SUM(p.valor) FILTER (WHERE p.fecha_pago >= CURRENT_DATE - 30), 0) AS ingresos_30_dias
FROM pagos p
JOIN membresias m         ON m.id_membresia = p.id_membresia
JOIN planes_membresias pl ON pl.id_plan = m.id_plan
JOIN gimnasios g          ON g.id_gimnasio = pl.id_gimnasio
WHERE p.estado_pago = 'EXITOSO'
GROUP BY g.id_gimnasio, g.nombre, g.plan_software
ORDER BY ingresos_totales DESC;


-- ---------------------------------------------------------------------------
-- 3. [Multi-gimnasio] ¿Cuántos clientes tiene cada gimnasio, cuántos están
--    activos y cuántos tienen hoy una membresía vigente?
-- ---------------------------------------------------------------------------
SELECT g.nombre                                               AS gimnasio,
       g.ciudad,
       COUNT(u.numero_identificacion)                         AS clientes,
       COUNT(u.numero_identificacion) FILTER (WHERE u.estado = 'ACTIVO') AS clientes_activos,
       COUNT(u.numero_identificacion) FILTER (WHERE EXISTS (
           SELECT 1
           FROM historial_membresias h
           JOIN membresias m ON m.id_membresia = h.id_membresia
           WHERE h.id_cliente = u.numero_identificacion
             AND h.activa
             AND m.estado = 'ACTIVA'
             AND m.fecha_vencimiento >= CURRENT_DATE))        AS con_membresia_vigente
FROM gimnasios g
LEFT JOIN usuarios u ON u.id_gimnasio = g.id_gimnasio
                    AND u.tipo_usuario = 'CLIENTE'
GROUP BY g.id_gimnasio, g.nombre, g.ciudad
ORDER BY clientes DESC;


-- ---------------------------------------------------------------------------
-- 4. [Multi-gimnasio] ¿Qué gimnasios tienen su suscripción a GymBrot vencida o
--    por vencer en los próximos 60 días, y a quién contactar?
-- ---------------------------------------------------------------------------
SELECT g.nombre                                  AS gimnasio,
       g.plan_software,
       g.estado,
       g.vence_suscripcion,
       g.vence_suscripcion - CURRENT_DATE        AS dias_restantes,
       string_agg(u.correo, ', ' ORDER BY u.correo) AS contactos_admin
FROM gimnasios g
LEFT JOIN usuarios u ON u.id_gimnasio = g.id_gimnasio
                    AND u.tipo_usuario = 'ADMINISTRADOR'
WHERE g.vence_suscripcion <= CURRENT_DATE + 60
GROUP BY g.id_gimnasio, g.nombre, g.plan_software, g.estado, g.vence_suscripcion
ORDER BY g.vence_suscripcion;


-- ---------------------------------------------------------------------------
-- 5. [JOIN + agregación] ¿Quiénes son los 10 clientes que más asistieron en los
--    últimos 30 días y cuánto dura en promedio su visita?
-- ---------------------------------------------------------------------------
SELECT u.nombre || ' ' || u.apellidos AS cliente,
       g.nombre                       AS gimnasio,
       COUNT(*)                       AS visitas,
       ROUND(AVG(EXTRACT(EPOCH FROM (ri.hora_salida - ri.hora_entrada)) / 60)) AS minutos_promedio
FROM registros_ingresos ri
JOIN usuarios u  ON u.numero_identificacion = ri.id_cliente
JOIN gimnasios g ON g.id_gimnasio = u.id_gimnasio
WHERE ri.fecha >= CURRENT_DATE - 30
  AND ri.estado_verificacion = 'APROBADO'
  AND ri.hora_salida IS NOT NULL
GROUP BY u.numero_identificacion, u.nombre, u.apellidos, g.nombre
ORDER BY visitas DESC, cliente
LIMIT 10;


-- ---------------------------------------------------------------------------
-- 6. [NOT EXISTS] ¿Qué clientes con cuenta ACTIVA no tienen membresía vigente?
--    (candidatos para una campaña de renovación)
-- ---------------------------------------------------------------------------
SELECT u.nombre || ' ' || u.apellidos AS cliente,
       u.correo,
       g.nombre                       AS gimnasio
FROM clientes c
JOIN usuarios u  ON u.numero_identificacion = c.numero_identificacion
JOIN gimnasios g ON g.id_gimnasio = u.id_gimnasio
WHERE u.estado = 'ACTIVO'
  AND NOT EXISTS (
        SELECT 1
        FROM historial_membresias h
        JOIN membresias m ON m.id_membresia = h.id_membresia
        WHERE h.id_cliente = c.numero_identificacion
          AND h.activa
          AND m.estado = 'ACTIVA'
          AND m.fecha_vencimiento >= CURRENT_DATE
  )
ORDER BY gimnasio, cliente;


-- ---------------------------------------------------------------------------
-- 7. [CTE] ¿Cuánto ha cambiado el peso de cada cliente entre su primera y su
--    última medición? (los 10 con mayor baja de peso)
-- ---------------------------------------------------------------------------
WITH mediciones AS (
    SELECT pr.id_cliente,
           pr.fecha_registro,
           pr.peso,
           ROW_NUMBER() OVER (PARTITION BY pr.id_cliente ORDER BY pr.fecha_registro ASC)  AS rn_asc,
           ROW_NUMBER() OVER (PARTITION BY pr.id_cliente ORDER BY pr.fecha_registro DESC) AS rn_desc
    FROM progresos pr
    WHERE pr.peso IS NOT NULL
)
SELECT u.nombre || ' ' || u.apellidos AS cliente,
       ini.fecha_registro             AS fecha_inicial,
       ini.peso                       AS peso_inicial,
       fin.fecha_registro             AS fecha_actual,
       fin.peso                       AS peso_actual,
       fin.peso - ini.peso            AS variacion_kg
FROM mediciones ini
JOIN mediciones fin ON fin.id_cliente = ini.id_cliente AND fin.rn_desc = 1
JOIN usuarios u     ON u.numero_identificacion = ini.id_cliente
WHERE ini.rn_asc = 1
  AND ini.fecha_registro < fin.fecha_registro
ORDER BY variacion_kg ASC
LIMIT 10;


-- ---------------------------------------------------------------------------
-- 8. [HAVING + subconsulta] ¿Qué clientes han pagado en total más que el
--    cliente promedio? (clientes de mayor valor)
-- ---------------------------------------------------------------------------
SELECT u.nombre || ' ' || u.apellidos AS cliente,
       COUNT(*)                       AS pagos_exitosos,
       SUM(p.valor)                   AS total_pagado
FROM pagos p
JOIN usuarios u ON u.numero_identificacion = p.id_cliente
WHERE p.estado_pago = 'EXITOSO'
GROUP BY u.numero_identificacion, u.nombre, u.apellidos
HAVING SUM(p.valor) > (
        SELECT AVG(t.total)
        FROM (SELECT SUM(valor) AS total
              FROM pagos
              WHERE estado_pago = 'EXITOSO'
              GROUP BY id_cliente) t
)
ORDER BY total_pagado DESC
LIMIT 10;


-- ---------------------------------------------------------------------------
-- 9. [Vista] ¿Cómo es la rutina completa de un cliente, día por día?
--    (la rutina vigente más reciente)
-- ---------------------------------------------------------------------------
SELECT rutina, objetivo, instructor, cliente, dia_semana, orden, ejercicio, grupo_muscular
FROM vista_rutinas_detalle
WHERE id_rutina = (SELECT MAX(id_rutina) FROM rutinas WHERE fecha_fin IS NULL)
ORDER BY CASE dia_semana WHEN 'LUNES' THEN 1 WHEN 'MARTES' THEN 2 WHEN 'MIERCOLES' THEN 3
                         WHEN 'JUEVES' THEN 4 WHEN 'VIERNES' THEN 5 WHEN 'SABADO' THEN 6 ELSE 7 END,
         orden;
