-- =============================================================================
-- BANCO DE CONSULTAS — GymBrot  (BLOQUE JUAN CAMILO)
-- Motor: PostgreSQL 12+
-- Esquema: migraciones/001_creacion_esquema.sql (Leo). Datos: seed de Samuel.
-- Cada consulta lleva su PREGUNTA DE NEGOCIO.
-- Mínimos cubiertos:
--   A) JOIN de 3+ tablas ............ Q1, Q2, Q3, Q4, Q5, Q11, Q12
--   B) "Los que no tienen" .......... Q6 (NOT EXISTS), Q7 (LEFT JOIN ... IS NULL)
--   C) GROUP BY + HAVING ............ Q8, Q10
--   D) Subconsulta / CTE ............ Q9 (CTE), Q10 (subconsulta)
--   E) Vista creada y consultada .... ver consultas/vistas.sql
-- Nota: nombre y apellidos viven en USUARIOS; CLIENTES e INSTRUCTORES se unen
-- a USUARIOS por numero_identificacion. MEMBRESIAS no guarda el cliente: se
-- llega a él por HISTORIAL_MEMBRESIAS (id_cliente, id_membresia).
-- =============================================================================


-- ---------------------------------------------------------------------------
-- Q1. Clientes con membresía vigente
-- PREGUNTA DE NEGOCIO: ¿Qué clientes tienen hoy una membresía vigente, de qué
-- plan y cuándo vence? (para saber quién puede entrar y a quién avisar).
-- Criterio de vigencia: historial_membresias.activa = 1 Y membresia ACTIVA no
-- vencida. Se exigen ambos para no confiar en un solo indicador.
-- Tablas: clientes, usuarios, historial_membresias, membresias, planes_membresias
-- ---------------------------------------------------------------------------
SELECT c.numero_identificacion,
       u.nombre || ' ' || u.apellidos AS cliente,
       pl.nombre                      AS plan,
       m.fecha_vencimiento
FROM clientes c
JOIN usuarios u             ON u.numero_identificacion = c.numero_identificacion
JOIN historial_membresias h ON h.id_cliente = c.numero_identificacion
                           AND h.activa = 1
JOIN membresias m           ON m.id_membresia = h.id_membresia
JOIN planes_membresias pl   ON pl.id_plan = m.id_plan
WHERE m.estado = 'ACTIVA'
  AND m.fecha_vencimiento >= CURRENT_DATE
ORDER BY m.fecha_vencimiento, cliente;


-- ---------------------------------------------------------------------------
-- Q2. Pagos exitosos con detalle de cliente, plan y membresía
-- PREGUNTA DE NEGOCIO: ¿Qué pagos exitosos se recibieron en los últimos 30
-- días, de quién, por qué plan y con qué método?
-- Tablas: pagos, clientes, usuarios, membresias, planes_membresias
-- ---------------------------------------------------------------------------
SELECT p.id_pago,
       p.fecha_pago,
       u.nombre || ' ' || u.apellidos AS cliente,
       pl.nombre                      AS plan,
       m.tipo_membresia,
       p.metodo_pago,
       p.valor
FROM pagos p
JOIN clientes c           ON c.numero_identificacion = p.id_cliente
JOIN usuarios u           ON u.numero_identificacion = c.numero_identificacion
JOIN membresias m         ON m.id_membresia = p.id_membresia
JOIN planes_membresias pl ON pl.id_plan = m.id_plan
WHERE p.estado_pago = 'EXITOSO'
  AND p.fecha_pago >= CURRENT_DATE - 30
ORDER BY p.fecha_pago DESC, p.id_pago;


-- ---------------------------------------------------------------------------
-- Q3. Rutinas asignadas por instructor con sus ejercicios
-- PREGUNTA DE NEGOCIO: ¿Qué rutinas tiene asignadas cada instructor, a qué
-- cliente y qué ejercicios (en qué orden y día) las componen?
-- Tablas: rutinas, instructores, usuarios (x2: instructor y cliente),
--         rutina_ejercicios, ejercicios
-- ---------------------------------------------------------------------------
SELECT ui.nombre || ' ' || ui.apellidos AS instructor,
       uc.nombre || ' ' || uc.apellidos AS cliente,
       r.nombre                         AS rutina,
       re.dia_semana,
       re.orden,
       e.nombre                         AS ejercicio,
       e.grupo_muscular
FROM rutinas r
JOIN instructores i        ON i.numero_identificacion = r.id_instructor
JOIN usuarios ui           ON ui.numero_identificacion = i.numero_identificacion
JOIN usuarios uc           ON uc.numero_identificacion = r.id_cliente
JOIN rutina_ejercicios re  ON re.id_rutina = r.id_rutina
JOIN ejercicios e          ON e.id_ejercicio = re.id_ejercicio
WHERE r.fecha_fin IS NULL OR r.fecha_fin >= CURRENT_DATE
ORDER BY instructor, r.id_rutina, re.dia_semana, re.orden;


-- ---------------------------------------------------------------------------
-- Q4. Citas de la próxima semana por instructor y cliente
-- PREGUNTA DE NEGOCIO: ¿Qué citas pendientes o confirmadas tiene cada
-- instructor en los próximos 7 días, con qué cliente y de qué especialidad?
-- Tablas: citas, instructores, usuarios (x2), especialidades
-- ---------------------------------------------------------------------------
SELECT ci.fecha,
       ci.hora,
       ui.nombre || ' ' || ui.apellidos AS instructor,
       es.nombre                        AS especialidad,
       uc.nombre || ' ' || uc.apellidos AS cliente,
       ci.tipo_cita,
       ci.estado
FROM citas ci
JOIN instructores i   ON i.numero_identificacion = ci.id_instructor
JOIN usuarios ui      ON ui.numero_identificacion = i.numero_identificacion
JOIN especialidades es ON es.id_especialidad = i.id_especialidad
JOIN usuarios uc      ON uc.numero_identificacion = ci.id_cliente
WHERE ci.fecha BETWEEN CURRENT_DATE AND CURRENT_DATE + 7
  AND ci.estado IN ('PENDIENTE', 'CONFIRMADA')
ORDER BY ci.fecha, ci.hora, instructor;


-- ---------------------------------------------------------------------------
-- Q5. Asistencia de los últimos 30 días
-- PREGUNTA DE NEGOCIO: ¿Quiénes son los 20 clientes que más asistieron en los
-- últimos 30 días y cuánto dura en promedio su visita?
-- Solo cuenta ingresos APROBADOS con hora de salida registrada.
-- Tablas: registros_ingresos, clientes, usuarios
-- ---------------------------------------------------------------------------
SELECT c.numero_identificacion,
       u.nombre || ' ' || u.apellidos AS cliente,
       COUNT(*)                       AS visitas,
       ROUND(AVG(EXTRACT(EPOCH FROM (ri.hora_salida - ri.hora_entrada)) / 60)) AS minutos_promedio
FROM registros_ingresos ri
JOIN clientes c ON c.numero_identificacion = ri.id_cliente
JOIN usuarios u ON u.numero_identificacion = c.numero_identificacion
WHERE ri.fecha >= CURRENT_DATE - 30
  AND ri.estado_verificacion = 'APROBADO'
  AND ri.hora_salida IS NOT NULL
GROUP BY c.numero_identificacion, u.nombre, u.apellidos
ORDER BY visitas DESC, cliente
LIMIT 20;


-- ---------------------------------------------------------------------------
-- Q6. [B] Clientes activos SIN membresía vigente  (NOT EXISTS)
-- PREGUNTA DE NEGOCIO: ¿Qué clientes con cuenta ACTIVA no tienen una membresía
-- vigente? (candidatos para una campaña de renovación).
-- Tablas: clientes, usuarios, historial_membresias, membresias
-- ---------------------------------------------------------------------------
SELECT c.numero_identificacion,
       u.nombre || ' ' || u.apellidos AS cliente,
       u.correo
FROM clientes c
JOIN usuarios u ON u.numero_identificacion = c.numero_identificacion
WHERE u.estado = 'ACTIVO'
  AND NOT EXISTS (
        SELECT 1
        FROM historial_membresias h
        JOIN membresias m ON m.id_membresia = h.id_membresia
        WHERE h.id_cliente = c.numero_identificacion
          AND h.activa = 1
          AND m.estado = 'ACTIVA'
          AND m.fecha_vencimiento >= CURRENT_DATE
  )
ORDER BY cliente;


-- ---------------------------------------------------------------------------
-- Q7. [B] Instructores SIN rutinas asignadas  (LEFT JOIN ... IS NULL)
-- PREGUNTA DE NEGOCIO: ¿Qué instructores no tienen ninguna rutina asignada y
-- podrían recibir más clientes?
-- Tablas: instructores, usuarios, especialidades, rutinas
-- ---------------------------------------------------------------------------
SELECT i.numero_identificacion,
       u.nombre || ' ' || u.apellidos AS instructor,
       es.nombre                      AS especialidad
FROM instructores i
JOIN usuarios u         ON u.numero_identificacion = i.numero_identificacion
JOIN especialidades es  ON es.id_especialidad = i.id_especialidad
LEFT JOIN rutinas r     ON r.id_instructor = i.numero_identificacion
WHERE r.id_rutina IS NULL
ORDER BY instructor;


-- ---------------------------------------------------------------------------
-- Q8. [C] Top instructores por cantidad de citas  (GROUP BY + HAVING)
-- PREGUNTA DE NEGOCIO: ¿Qué instructores han atendido o tienen agendadas 5 o
-- más citas (no canceladas) en los últimos 90 días, y cuántas son?
-- Ajusta el umbral del HAVING al volumen del seed.
-- Tablas: instructores, usuarios, citas
-- ---------------------------------------------------------------------------
SELECT i.numero_identificacion,
       u.nombre || ' ' || u.apellidos AS instructor,
       COUNT(*)                       AS total_citas,
       COUNT(DISTINCT ci.id_cliente)  AS clientes_distintos
FROM instructores i
JOIN usuarios u ON u.numero_identificacion = i.numero_identificacion
JOIN citas ci   ON ci.id_instructor = i.numero_identificacion
WHERE ci.estado <> 'CANCELADA'
  AND ci.fecha >= CURRENT_DATE - 90
GROUP BY i.numero_identificacion, u.nombre, u.apellidos
HAVING COUNT(*) >= 5
ORDER BY total_citas DESC, instructor;


-- ---------------------------------------------------------------------------
-- Q9. [D] Seguimiento de peso con CTE
-- PREGUNTA DE NEGOCIO: ¿Cuánto ha cambiado el peso de cada cliente entre su
-- primera y su última medición? (los 20 con mayor baja de peso).
-- CTE: numera las mediciones de cada cliente de la más antigua y de la más
-- reciente; luego se comparan primera (rn_asc=1) y última (rn_desc=1).
-- Tablas: progresos, clientes, usuarios
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
SELECT c.numero_identificacion,
       u.nombre || ' ' || u.apellidos AS cliente,
       ini.fecha_registro             AS fecha_inicial,
       ini.peso                       AS peso_inicial,
       fin.fecha_registro             AS fecha_actual,
       fin.peso                       AS peso_actual,
       fin.peso - ini.peso            AS variacion_kg
FROM mediciones ini
JOIN mediciones fin ON fin.id_cliente = ini.id_cliente AND fin.rn_desc = 1
JOIN clientes c     ON c.numero_identificacion = ini.id_cliente
JOIN usuarios u     ON u.numero_identificacion = c.numero_identificacion
WHERE ini.rn_asc = 1
  AND ini.fecha_registro < fin.fecha_registro
ORDER BY variacion_kg ASC
LIMIT 20;


-- ---------------------------------------------------------------------------
-- Q10. [C + D] Clientes que pagan por encima del promedio  (HAVING + subconsulta)
-- PREGUNTA DE NEGOCIO: ¿Qué clientes han pagado en total más que el cliente
-- promedio? (clientes de mayor valor).
-- La subconsulta calcula el promedio del total pagado por cliente.
-- Tablas: pagos, clientes, usuarios
-- ---------------------------------------------------------------------------
SELECT c.numero_identificacion,
       u.nombre || ' ' || u.apellidos AS cliente,
       COUNT(*)                       AS pagos_exitosos,
       SUM(p.valor)                   AS total_pagado
FROM pagos p
JOIN clientes c ON c.numero_identificacion = p.id_cliente
JOIN usuarios u ON u.numero_identificacion = c.numero_identificacion
WHERE p.estado_pago = 'EXITOSO'
GROUP BY c.numero_identificacion, u.nombre, u.apellidos
HAVING SUM(p.valor) > (
        SELECT AVG(t.total)
        FROM (SELECT SUM(valor) AS total
              FROM pagos
              WHERE estado_pago = 'EXITOSO'
              GROUP BY id_cliente) t
)
ORDER BY total_pagado DESC
LIMIT 20;


-- ---------------------------------------------------------------------------
-- Q11. Notificaciones fallidas con su plantilla
-- PREGUNTA DE NEGOCIO: ¿Qué notificaciones fallaron en los últimos 30 días, a
-- qué cliente iban y con qué plantilla se generaron?
-- LEFT JOIN a plantillas: id_plantilla puede ser NULL (mensaje manual).
-- Tablas: notificaciones, clientes, usuarios, plantillas_mensaje
-- ---------------------------------------------------------------------------
SELECT n.id_notificacion,
       n.fecha_envio,
       u.nombre || ' ' || u.apellidos          AS cliente,
       n.tipo,
       n.origen,
       COALESCE(pm.nombre, '(sin plantilla)')  AS plantilla
FROM notificaciones n
JOIN clientes c               ON c.numero_identificacion = n.id_cliente
JOIN usuarios u               ON u.numero_identificacion = c.numero_identificacion
LEFT JOIN plantillas_mensaje pm ON pm.id_plantilla = n.id_plantilla
WHERE n.estado_envio = 'FALLIDO'
  AND n.fecha_envio >= CURRENT_DATE - 30
ORDER BY n.fecha_envio DESC;


-- ---------------------------------------------------------------------------
-- Q12. Uso del chatbot GymBrot por cliente
-- PREGUNTA DE NEGOCIO: ¿Qué clientes conversan más con GymBrot y cuántas de
-- sus conversaciones quedaron vinculadas a una cita?
-- Tablas: sesiones_gymbrot, mensajes_gymbrot, clientes, usuarios, citas
-- ---------------------------------------------------------------------------
SELECT c.numero_identificacion,
       u.nombre || ' ' || u.apellidos     AS cliente,
       COUNT(DISTINCT s.id_sesion)        AS sesiones,
       COUNT(m.id_mensaje)                AS mensajes,
       COUNT(DISTINCT ci.id_cita)         AS citas_vinculadas
FROM sesiones_gymbrot s
JOIN clientes c            ON c.numero_identificacion = s.id_cliente
JOIN usuarios u            ON u.numero_identificacion = c.numero_identificacion
JOIN mensajes_gymbrot m    ON m.id_sesion = s.id_sesion
LEFT JOIN citas ci         ON ci.id_cita = m.id_cita
GROUP BY c.numero_identificacion, u.nombre, u.apellidos
ORDER BY mensajes DESC, cliente
LIMIT 20;


-- ---------------------------------------------------------------------------
-- Q13. Ingresos mensuales (último año)
-- PREGUNTA DE NEGOCIO: ¿Cuánto dinero entró por mes en los últimos 12 meses,
-- contando solo pagos exitosos?
-- Tablas: pagos
-- ---------------------------------------------------------------------------
SELECT to_char(date_trunc('month', p.fecha_pago), 'YYYY-MM') AS mes,
       SUM(p.valor)                                           AS ingresos,
       COUNT(*)                                               AS pagos
FROM pagos p
WHERE p.estado_pago = 'EXITOSO'
  AND p.fecha_pago >= date_trunc('month', CURRENT_DATE) - INTERVAL '11 months'
GROUP BY date_trunc('month', p.fecha_pago)
ORDER BY date_trunc('month', p.fecha_pago);
