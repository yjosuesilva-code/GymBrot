-- =============================================================================
-- VISTAS — GymBrot  (BLOQUE JUAN CAMILO)
-- Motor: PostgreSQL 12+. Ejecutar DESPUÉS de la migración 001 y del seed.
-- =============================================================================

-- ---------------------------------------------------------------------------
-- VISTA 1: vista_membresias_vigentes
-- Clientes con membresía vigente hoy, con su plan y fecha de vencimiento.
-- Úsala para control de acceso, recordatorios de renovación y KPIs.
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
                           AND h.activa = 1
JOIN membresias m           ON m.id_membresia = h.id_membresia
JOIN planes_membresias pl   ON pl.id_plan = m.id_plan
WHERE m.estado = 'ACTIVA'
  AND m.fecha_vencimiento >= CURRENT_DATE;

-- ---------------------------------------------------------------------------
-- VISTA 2: vista_pagos_detallados
-- Cada pago con cliente, plan y membresía (todos los estados de pago).
-- ---------------------------------------------------------------------------
CREATE OR REPLACE VIEW vista_pagos_detallados AS
SELECT p.id_pago,
       p.fecha_pago,
       c.numero_identificacion,
       u.nombre || ' ' || u.apellidos AS cliente,
       pl.nombre                      AS plan,
       m.tipo_membresia,
       p.metodo_pago,
       p.estado_pago,
       p.valor
FROM pagos p
JOIN clientes c           ON c.numero_identificacion = p.id_cliente
JOIN usuarios u           ON u.numero_identificacion = c.numero_identificacion
JOIN membresias m         ON m.id_membresia = p.id_membresia
JOIN planes_membresias pl ON pl.id_plan = m.id_plan;

-- ---------------------------------------------------------------------------
-- VISTA 3: vista_rutinas_detalle
-- Rutina + instructor + cliente + ejercicios (una fila por ejercicio).
-- ---------------------------------------------------------------------------
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

-- =============================================================================
-- DEMOSTRACIÓN: consultar las vistas
-- =============================================================================

-- Membresías que vencen pronto (usa la vista 1)
SELECT * FROM vista_membresias_vigentes
WHERE dias_restantes <= 7
ORDER BY dias_restantes, cliente
LIMIT 20;

-- Clientes vigentes por plan (usa la vista 1)
SELECT plan, COUNT(*) AS clientes_vigentes
FROM vista_membresias_vigentes
GROUP BY plan
ORDER BY clientes_vigentes DESC;

-- Últimos pagos exitosos (usa la vista 2)
SELECT * FROM vista_pagos_detallados
WHERE estado_pago = 'EXITOSO'
ORDER BY fecha_pago DESC
LIMIT 20;

-- Rutina completa de un cliente (usa la vista 3)
SELECT * FROM vista_rutinas_detalle
WHERE id_rutina = (SELECT MIN(id_rutina) FROM rutinas)
ORDER BY dia_semana, orden;
