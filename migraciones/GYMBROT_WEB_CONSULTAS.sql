-- BLOQUE JUAN CAMILO — 8 consultas (fase 1)
-- Postgres. Tenant de prueba: slug 'iron-gym-valledupar'.
-- Esquema: migraciones/001_creacion_esquema.sql. Datos: migraciones/01_ a 20_.
-- El gimnasio (tenant) de una persona está en usuarios.id_gimnasio; clientes e
-- instructores lo heredan por numero_identificacion. MEMBRESIAS no guarda el
-- cliente: se llega a él por HISTORIAL_MEMBRESIAS (id_cliente, id_membresia).

-- ============================================================
-- 1. Operación: σ (selección)
-- Enunciado: clientes con estado ACTIVO del gimnasio 'iron-gym-valledupar'.
-- Álgebra: σ slug='iron-gym-valledupar' ∧ estado='ACTIVO' (clientes ⨝ usuarios ⨝ gimnasios)
-- ============================================================
SELECT c.*, u.nombre, u.apellidos, u.correo
FROM clientes c
JOIN usuarios u  ON u.numero_identificacion = c.numero_identificacion
JOIN gimnasios g ON g.id_gimnasio = u.id_gimnasio
WHERE g.slug = 'iron-gym-valledupar'
  AND u.estado = 'ACTIVO';
-- BD vacía: 0 filas. Con seed: los clientes activos de Iron Gym.

-- ============================================================
-- 2. Operación: π (proyección)
-- Enunciado: nombres de los planes de membresía del gimnasio, sin duplicados.
-- Álgebra: π nombre (σ slug='iron-gym-valledupar' (planes_membresias ⨝ gimnasios))
-- Nota: cada gimnasio define sus propios planes (planes_membresias.id_gimnasio).
-- ============================================================
SELECT DISTINCT pl.nombre
FROM planes_membresias pl
JOIN gimnasios g ON g.id_gimnasio = pl.id_gimnasio
WHERE g.slug = 'iron-gym-valledupar';
-- BD vacía: 0 filas. Con seed: Básico, Plus y Full.

-- ============================================================
-- 3. Operación: ⨝ (join)
-- Enunciado: membresías vigentes con el nombre del cliente.
-- Álgebra: σ estado='ACTIVA' ∧ fecha_vencimiento>=hoy (membresias)
--          ⨝ historial_membresias ⨝ usuarios ⨝ gimnasios
-- Criterio: membresias.estado + fecha_vencimiento (fuente directa).
-- ============================================================
SELECT m.id_membresia,
       u.nombre || ' ' || u.apellidos AS cliente,
       m.tipo_membresia,
       m.fecha_vencimiento
FROM membresias m
JOIN historial_membresias h ON h.id_membresia = m.id_membresia
JOIN usuarios u             ON u.numero_identificacion = h.id_cliente
JOIN gimnasios g            ON g.id_gimnasio = u.id_gimnasio
WHERE g.slug = 'iron-gym-valledupar'
  AND m.estado = 'ACTIVA'
  AND m.fecha_vencimiento >= CURRENT_DATE;
-- BD vacía: 0 filas. Con seed: una fila por membresía vigente.

-- ============================================================
-- 4. Operación: ⨝ de 3 tablas
-- Enunciado: pagos EXITOSOS con su membresía y el nombre del plan.
-- Álgebra: σ estado_pago='EXITOSO' (pagos) ⨝ membresias ⨝ planes_membresias ⨝ gimnasios
-- Nota: id_plan es NOT NULL en membresias; el plan define el gimnasio.
-- ============================================================
SELECT p.id_pago, p.valor, p.fecha_pago,
       m.id_membresia, pl.nombre AS plan
FROM pagos p
JOIN membresias m         ON m.id_membresia = p.id_membresia
JOIN planes_membresias pl ON pl.id_plan = m.id_plan
JOIN gimnasios g          ON g.id_gimnasio = pl.id_gimnasio
WHERE g.slug = 'iron-gym-valledupar'
  AND p.estado_pago = 'EXITOSO';          -- CHECK: EXITOSO | RECHAZADO | PENDIENTE
-- BD vacía: 0 filas. Con seed: una fila por pago exitoso con su plan.

-- ============================================================
-- 5. Operación: γ (agregación)
-- Enunciado: total y cantidad de pagos exitosos por método de pago.
-- Álgebra: γ metodo_pago; SUM(valor), COUNT(*) (σ estado_pago='EXITOSO' (pagos ⨝ usuarios ⨝ gimnasios))
-- ============================================================
SELECT p.metodo_pago,
       SUM(p.valor) AS total,
       COUNT(*)     AS cantidad
FROM pagos p
JOIN usuarios u  ON u.numero_identificacion = p.id_cliente
JOIN gimnasios g ON g.id_gimnasio = u.id_gimnasio
WHERE g.slug = 'iron-gym-valledupar'
  AND p.estado_pago = 'EXITOSO'
GROUP BY p.metodo_pago;
-- BD vacía: 0 filas. Con seed: una fila por método de pago.

-- ============================================================
-- 6. Operación: σ + γ (filtro temporal)
-- Enunciado: suma de pagos exitosos del mes actual.
-- Álgebra: γ SUM(valor) (σ estado_pago='EXITOSO' ∧ mes(fecha_pago)=mes(hoy) (pagos))
-- ============================================================
SELECT COALESCE(SUM(p.valor), 0) AS total_mes
FROM pagos p
JOIN usuarios u  ON u.numero_identificacion = p.id_cliente
JOIN gimnasios g ON g.id_gimnasio = u.id_gimnasio
WHERE g.slug = 'iron-gym-valledupar'
  AND p.estado_pago = 'EXITOSO'
  AND date_trunc('month', p.fecha_pago) = date_trunc('month', CURRENT_DATE);
-- BD vacía: una fila con 0. Con seed: total del mes (0 si no hay pagos recientes).

-- ============================================================
-- 7. Operación: − (antijoin con NOT EXISTS)
-- Enunciado: clientes que NO tienen membresía vigente.
-- Álgebra: clientes − π clientes (σ vigente (membresias) ⨝ historial_membresias)
-- ============================================================
SELECT c.numero_identificacion,
       u.nombre || ' ' || u.apellidos AS cliente
FROM clientes c
JOIN usuarios u  ON u.numero_identificacion = c.numero_identificacion
JOIN gimnasios g ON g.id_gimnasio = u.id_gimnasio
WHERE g.slug = 'iron-gym-valledupar'
  AND NOT EXISTS (
        SELECT 1
        FROM historial_membresias h
        JOIN membresias m ON m.id_membresia = h.id_membresia
        WHERE h.id_cliente = c.numero_identificacion
          AND m.estado = 'ACTIVA'
          AND m.fecha_vencimiento >= CURRENT_DATE
  );
-- BD vacía: 0 filas. Con seed: clientes sin membresía activa y no vencida.

-- ============================================================
-- 8. Operación: ⨝ (left) + γ
-- Enunciado: por instructor, cantidad de citas futuras no canceladas (incluye 0).
-- Álgebra: γ instructor; COUNT(id_cita) (instructores ⟕ σ fecha>hoy ∧ estado<>'CANCELADA' (citas))
-- Las condiciones de citas van en el ON: en el WHERE eliminarían a los de 0 citas.
-- ============================================================
SELECT i.numero_identificacion,
       u.nombre || ' ' || u.apellidos AS instructor,
       COUNT(ci.id_cita) AS citas_futuras
FROM instructores i
JOIN usuarios u  ON u.numero_identificacion = i.numero_identificacion
JOIN gimnasios g ON g.id_gimnasio = u.id_gimnasio
LEFT JOIN citas ci
  ON ci.id_instructor = i.numero_identificacion
 AND ci.fecha > CURRENT_DATE
 AND ci.estado <> 'CANCELADA'
WHERE g.slug = 'iron-gym-valledupar'
GROUP BY i.numero_identificacion, u.nombre, u.apellidos;
-- BD vacía: 0 filas. Con seed: todos los instructores, algunos con 0.
