-- BLOQUE JUAN CAMILO — 8 consultas (fase 1)
-- Postgres. Tenant de prueba: 'gym-centro'.
-- Nombres de columnas tomados de frontend-react\src\types\index.ts.
-- Pendiente de confirmar contra el DDL de Leo y el seed de Samuel: marcas VERIFICAR.

-- ============================================================
-- 1. Operación: σ (selección)
-- Enunciado: clientes con estado ACTIVO del gimnasio 'gym-centro'.
-- Álgebra: σ gimnasio_id='gym-centro' ∧ estado='ACTIVO' (clientes)
-- ============================================================
SELECT c.*
FROM clientes c
WHERE c.gimnasio_id = 'gym-centro'
  AND c.estado = 'ACTIVO';
-- BD vacía: 0 filas. Con seed: los clientes activos de gym-centro.

-- ============================================================
-- 2. Operación: π (proyección)
-- Enunciado: nombres de los planes de membresía activos, sin duplicados.
-- Álgebra: π nombre (σ estado='ACTIVO' (planes))
-- Nota: `planes` es catálogo GLOBAL (sin gimnasio_id), por eso no filtra tenant.
-- ============================================================
SELECT DISTINCT pl.nombre
FROM planes pl
WHERE pl.estado = 'ACTIVO';
-- BD vacía: 0 filas. Con seed: nombres distintos de planes activos.

-- ============================================================
-- 3. Operación: ⨝ (join)
-- Enunciado: membresías vigentes con el nombre del cliente.
-- Álgebra: σ estado='ACTIVA' ∧ fecha_vencimiento>=hoy (membresias)
--          ⨝ (gimnasio_id, id_cliente)=(gimnasio_id, numero_identificacion) clientes
-- Criterio: uso membresias.estado + fecha_vencimiento (fuente directa, sin
-- depender de historial_membresias.activa, que es una tabla extra).
-- ============================================================
SELECT m.id_membresia,
       c.nombre || ' ' || c.apellidos AS cliente,
       m.tipo_membresia,
       m.fecha_vencimiento
FROM membresias m
JOIN clientes c
  ON c.gimnasio_id = m.gimnasio_id
 AND c.numero_identificacion = m.id_cliente
WHERE m.gimnasio_id = 'gym-centro'
  AND m.estado = 'ACTIVA'
  AND m.fecha_vencimiento >= CURRENT_DATE;
-- BD vacía: 0 filas. Con seed: una fila por membresía vigente.

-- ============================================================
-- 4. Operación: ⨝ de 3 tablas
-- Enunciado: pagos EXITOSOS con su membresía y el nombre del plan.
-- Álgebra: σ estado_pago='EXITOSO' (pagos) ⨝ membresias ⨝ planes
-- Nota: id_plan es nullable en membresias; el JOIN interno omite
-- las membresías sin plan.
-- ============================================================
SELECT p.id_pago, p.valor, p.fecha_pago,
       m.id_membresia, pl.nombre AS plan
FROM pagos p
JOIN membresias m
  ON m.id_membresia = p.id_membresia
 AND m.gimnasio_id = p.gimnasio_id
JOIN planes pl
  ON pl.id_plan = m.id_plan
WHERE p.gimnasio_id = 'gym-centro'
  AND p.estado_pago = 'EXITOSO';          -- VERIFICAR contra el seed (estado_pago es texto libre)
-- BD vacía: 0 filas. Con seed: una fila por pago exitoso con su plan.

-- ============================================================
-- 5. Operación: γ (agregación)
-- Enunciado: total y cantidad de pagos exitosos por método de pago.
-- Álgebra: γ metodo_pago; SUM(valor), COUNT(*) (σ estado_pago='EXITOSO' (pagos))
-- ============================================================
SELECT p.metodo_pago,
       SUM(p.valor) AS total,
       COUNT(*)     AS cantidad
FROM pagos p
WHERE p.gimnasio_id = 'gym-centro'
  AND p.estado_pago = 'EXITOSO'           -- VERIFICAR contra el seed
GROUP BY p.metodo_pago;
-- BD vacía: 0 filas. Con seed: una fila por método de pago.

-- ============================================================
-- 6. Operación: σ + γ (filtro temporal)
-- Enunciado: suma de pagos exitosos del mes actual.
-- Álgebra: γ SUM(valor) (σ estado_pago='EXITOSO' ∧ mes(fecha_pago)=mes(hoy) (pagos))
-- ============================================================
SELECT COALESCE(SUM(p.valor), 0) AS total_mes
FROM pagos p
WHERE p.gimnasio_id = 'gym-centro'
  AND p.estado_pago = 'EXITOSO'           -- VERIFICAR contra el seed
  AND date_trunc('month', p.fecha_pago) = date_trunc('month', CURRENT_DATE);
-- BD vacía: una fila con 0. Con seed: total del mes (0 si no hay pagos recientes).

-- ============================================================
-- 7. Operación: − (antijoin con NOT EXISTS)
-- Enunciado: clientes que NO tienen membresía vigente.
-- Álgebra: clientes − π clientes (σ vigente (membresias) ⨝ clientes)
-- ============================================================
SELECT c.numero_identificacion,
       c.nombre || ' ' || c.apellidos AS cliente
FROM clientes c
WHERE c.gimnasio_id = 'gym-centro'
  AND NOT EXISTS (
        SELECT 1
        FROM membresias m
        WHERE m.gimnasio_id = c.gimnasio_id
          AND m.id_cliente = c.numero_identificacion
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
       i.nombre || ' ' || i.apellidos AS instructor,
       COUNT(ci.id_cita) AS citas_futuras
FROM instructores i
LEFT JOIN citas ci
  ON ci.gimnasio_id = i.gimnasio_id
 AND ci.id_instructor = i.numero_identificacion
 AND ci.fecha > CURRENT_DATE
 AND ci.estado <> 'CANCELADA'
WHERE i.gimnasio_id = 'gym-centro'
GROUP BY i.numero_identificacion, i.nombre, i.apellidos;
-- BD vacía: 0 filas. Con seed: todos los instructores, algunos con 0.
