-- =============================================================================
-- PRUEBAS DE VALIDACIONES — GymBrot
-- Inserciones que la base de datos DEBE RECHAZAR, una por cada restricción.
-- Requiere el esquema (001) y los datos de prueba ya cargados.
-- En pgAdmin: selecciona UNA prueba (comentario + INSERT) y pulsa F5. El error
-- que aparece en "Messages" debe nombrar la restricción indicada en "Esperado".
-- Si ejecutas el archivo completo, se detiene en la primera prueba (es lo esperado).
-- Una inserción rechazada no guarda nada: los datos quedan intactos.
-- Al final hay un bloque de inserciones VÁLIDAS que se deshace con ROLLBACK.
-- =============================================================================


-- -----------------------------------------------------------------------------
-- GIMNASIOS
-- -----------------------------------------------------------------------------

-- 1. Clave primaria repetida: ya existe el gimnasio 1.
-- Esperado: pk_gimnasios
INSERT INTO gimnasios (id_gimnasio, slug, nombre, plan_software, estado, fecha_registro)
VALUES (1, 'gym-nuevo', 'Gym Nuevo', 'PRO', 'ACTIVO', CURRENT_DATE);

-- 2. Enlace (slug) repetido: 'titan-fit' ya es de otro gimnasio.
-- Esperado: uq_gimnasios_slug
INSERT INTO gimnasios (slug, nombre, plan_software, estado, fecha_registro)
VALUES ('titan-fit', 'Titan Fit Copia', 'PRO', 'ACTIVO', CURRENT_DATE);

-- 3. Slug con mayúsculas, espacios y símbolos.
-- Esperado: chk_gimnasios_slug
INSERT INTO gimnasios (slug, nombre, plan_software, estado, fecha_registro)
VALUES ('Mi Gym!', 'Mi Gym', 'PRO', 'ACTIVO', CURRENT_DATE);

-- 4. Plan de software que no existe (solo BASICO, PRO, PREMIUM).
-- Esperado: chk_gimnasios_plan
INSERT INTO gimnasios (slug, nombre, plan_software, estado, fecha_registro)
VALUES ('gym-oro', 'Gym Oro', 'GOLD', 'ACTIVO', CURRENT_DATE);

-- 5. Suscripción que vence antes de registrarse.
-- Esperado: chk_gimnasios_fechas
INSERT INTO gimnasios (slug, nombre, plan_software, estado, fecha_registro, vence_suscripcion)
VALUES ('gym-fechas', 'Gym Fechas', 'PRO', 'ACTIVO', CURRENT_DATE, CURRENT_DATE - 1);


-- -----------------------------------------------------------------------------
-- USUARIOS Y HERENCIA
-- -----------------------------------------------------------------------------

-- 6. Tipo de documento inválido (solo CC, TI, CE, PP).
-- Esperado: chk_usuarios_tipo_id
INSERT INTO usuarios (numero_identificacion, id_gimnasio, tipo_identificacion, nombre, apellidos, estado, fecha_registro, tipo_usuario)
VALUES ('1065900001', 1, 'XX', 'Prueba', 'Documento', 'ACTIVO', CURRENT_DATE, 'CLIENTE');

-- 7. Tipo de usuario inválido.
-- Esperado: chk_usuarios_tipo_usuario
INSERT INTO usuarios (numero_identificacion, id_gimnasio, tipo_identificacion, nombre, apellidos, estado, fecha_registro, tipo_usuario)
VALUES ('1065900002', 1, 'CC', 'Prueba', 'Tipo', 'ACTIVO', CURRENT_DATE, 'ENTRENADOR');

-- 8. Estado inválido.
-- Esperado: chk_usuarios_estado
INSERT INTO usuarios (numero_identificacion, id_gimnasio, tipo_identificacion, nombre, apellidos, estado, fecha_registro, tipo_usuario)
VALUES ('1065900003', 1, 'CC', 'Prueba', 'Estado', 'ELIMINADO', CURRENT_DATE, 'CLIENTE');

-- 9. Un CLIENTE sin gimnasio (solo el SUPERADMIN puede no tener gimnasio).
-- Esperado: chk_usuarios_gimnasio
INSERT INTO usuarios (numero_identificacion, id_gimnasio, tipo_identificacion, nombre, apellidos, estado, fecha_registro, tipo_usuario)
VALUES ('1065900004', NULL, 'CC', 'Prueba', 'Sin Gimnasio', 'ACTIVO', CURRENT_DATE, 'CLIENTE');

-- 10. Un SUPERADMIN asignado a un gimnasio.
-- Esperado: chk_usuarios_gimnasio
INSERT INTO usuarios (numero_identificacion, id_gimnasio, tipo_identificacion, nombre, apellidos, estado, fecha_registro, tipo_usuario)
VALUES ('1065900005', 1, 'CC', 'Prueba', 'Superadmin', 'ACTIVO', CURRENT_DATE, 'SUPERADMIN');

-- 11. Correo repetido: ya lo usa el SUPERADMIN.
-- Esperado: uq_usuarios_correo
INSERT INTO usuarios (numero_identificacion, id_gimnasio, tipo_identificacion, nombre, apellidos, correo, estado, fecha_registro, tipo_usuario)
VALUES ('1065900006', 1, 'CC', 'Prueba', 'Correo', 'laura.mendez@gymbrot.co', 'ACTIVO', CURRENT_DATE, 'CLIENTE');

-- 12. Cédula repetida: 1065100001 ya está registrada.
-- Esperado: pk_usuarios
INSERT INTO usuarios (numero_identificacion, id_gimnasio, tipo_identificacion, nombre, apellidos, estado, fecha_registro, tipo_usuario)
VALUES ('1065100001', 1, 'CC', 'Prueba', 'Cedula', 'ACTIVO', CURRENT_DATE, 'CLIENTE');

-- 13. Campo obligatorio vacío: falta el nombre.
-- Esperado: not-null (columna "nombre")
INSERT INTO usuarios (numero_identificacion, id_gimnasio, tipo_identificacion, apellidos, estado, fecha_registro, tipo_usuario)
VALUES ('1065900007', 1, 'CC', 'Sin Nombre', 'ACTIVO', CURRENT_DATE, 'CLIENTE');

-- 14. Gimnasio que no existe.
-- Esperado: fk_usuarios_gimnasio
INSERT INTO usuarios (numero_identificacion, id_gimnasio, tipo_identificacion, nombre, apellidos, estado, fecha_registro, tipo_usuario)
VALUES ('1065900008', 999, 'CC', 'Prueba', 'Gimnasio', 'ACTIVO', CURRENT_DATE, 'CLIENTE');

-- 15. Herencia: un cliente que no existe primero como usuario.
-- Esperado: fk_clientes_usuarios
INSERT INTO clientes (numero_identificacion, direccion)
VALUES ('1065999999', 'Calle 1 # 2-3, Valledupar');

-- 16. Instructor con una especialidad que no existe.
-- Esperado: fk_instructores_especialidad
INSERT INTO instructores (numero_identificacion, id_especialidad)
VALUES ('1065100001', 999);


-- -----------------------------------------------------------------------------
-- CATÁLOGOS
-- -----------------------------------------------------------------------------

-- 17. Plan con precio negativo.
-- Esperado: chk_planes_precio_mensual
INSERT INTO planes_membresias (id_gimnasio, nombre, precio_mensual)
VALUES (1, 'Plan Negativo', -50000);

-- 18. Plan con un nombre que el gimnasio ya usa ('Básico' en Iron Gym).
-- Esperado: uq_planes_gimnasio_nombre
INSERT INTO planes_membresias (id_gimnasio, nombre, precio_mensual)
VALUES (1, 'Básico', 90000);

-- 19. Ejercicio con un nivel inválido.
-- Esperado: chk_ejercicios_nivel
INSERT INTO ejercicios (id_gimnasio, nombre, grupo_muscular, nivel)
VALUES (NULL, 'Sentadilla imposible', 'Piernas', 'EXPERTO');


-- -----------------------------------------------------------------------------
-- MEMBRESÍAS Y PAGOS
-- -----------------------------------------------------------------------------

-- 20. Membresía que vence antes de empezar.
-- Esperado: chk_membresias_fechas
INSERT INTO membresias (id_plan, tipo_membresia, modalidad_pago, valor, fecha_inicio, fecha_vencimiento, estado)
VALUES (1, 'Básico', 'MENSUAL', 80000, CURRENT_DATE, CURRENT_DATE - 10, 'ACTIVA');

-- 21. Membresía de un plan que no existe.
-- Esperado: fk_membresias_plan
INSERT INTO membresias (id_plan, tipo_membresia, modalidad_pago, valor, fecha_inicio, fecha_vencimiento, estado)
VALUES (999, 'Fantasma', 'MENSUAL', 80000, CURRENT_DATE, CURRENT_DATE + 30, 'ACTIVA');

-- 22. Asignar dos veces la misma membresía al mismo cliente.
-- Esperado: uq_historial_cliente_membresia
INSERT INTO historial_membresias (id_cliente, id_membresia, fecha_asignacion, activa)
SELECT id_cliente, id_membresia, fecha_asignacion, FALSE
FROM historial_membresias
WHERE id_historial = 1;

-- 23. Pago por valor 0.
-- Esperado: chk_pagos_valor
INSERT INTO pagos (id_membresia, id_cliente, fecha_pago, valor, metodo_pago, estado_pago)
SELECT id_membresia, id_cliente, CURRENT_DATE, 0, 'EFECTIVO', 'EXITOSO'
FROM historial_membresias
WHERE id_historial = 1;

-- 24. Estado de pago inválido (solo EXITOSO, RECHAZADO, PENDIENTE).
-- Esperado: chk_pagos_estado
INSERT INTO pagos (id_membresia, id_cliente, fecha_pago, valor, metodo_pago, estado_pago)
SELECT id_membresia, id_cliente, CURRENT_DATE, 80000, 'EFECTIVO', 'APROBADO'
FROM historial_membresias
WHERE id_historial = 1;

-- 25. Un cliente paga una membresía que NO le fue asignada.
-- Esperado: fk_pagos_historial
INSERT INTO pagos (id_membresia, id_cliente, fecha_pago, valor, metodo_pago, estado_pago)
VALUES ((SELECT MIN(id_membresia) FROM historial_membresias WHERE id_cliente <> '1065100001'),
        '1065100001', CURRENT_DATE, 80000, 'EFECTIVO', 'EXITOSO');


-- -----------------------------------------------------------------------------
-- RUTINAS Y PROGRESO
-- -----------------------------------------------------------------------------

-- 26. El mismo ejercicio dos veces el mismo día de la misma rutina.
-- Esperado: uq_rutina_ejercicios
INSERT INTO rutina_ejercicios (id_rutina, id_ejercicio, orden, dia_semana)
SELECT id_rutina, id_ejercicio, 99, dia_semana
FROM rutina_ejercicios
WHERE id_rutina_ejercicio = 1;

-- 27. Día de la semana mal escrito (debe ir en mayúsculas y sin tilde).
-- Esperado: chk_rutina_ejercicios_dia
INSERT INTO rutina_ejercicios (id_rutina, id_ejercicio, orden, dia_semana)
VALUES (1, 1, 1, 'Miércoles');

-- 28. Orden en cero.
-- Esperado: chk_rutina_ejercicios_orden
INSERT INTO rutina_ejercicios (id_rutina, id_ejercicio, orden, dia_semana)
VALUES (1, 1, 0, 'DOMINGO');

-- 29. Rutina que termina antes de crearse.
-- Esperado: chk_rutinas_fechas
INSERT INTO rutinas (id_instructor, id_cliente, nombre, fecha_creacion, fecha_fin)
SELECT id_instructor, id_cliente, 'Rutina al revés', CURRENT_DATE, CURRENT_DATE - 1
FROM rutinas
WHERE id_rutina = 1;

-- 30. Medición con peso 0.
-- Esperado: chk_progresos_peso
INSERT INTO progresos (id_cliente, fecha_registro, peso, altura)
VALUES ('1065100001', CURRENT_DATE, 0, 1.70);


-- -----------------------------------------------------------------------------
-- ACCESO, CITAS, ASISTENTE Y NOTIFICACIONES
-- -----------------------------------------------------------------------------

-- 31. Ingreso que sale antes de entrar.
-- Esperado: chk_ingresos_horas
INSERT INTO registros_ingresos (id_cliente, fecha, hora_entrada, hora_salida, metodo_verificacion, estado_verificacion)
VALUES ('1065100001', CURRENT_DATE, '18:00', '17:00', 'QR', 'APROBADO');

-- 32. Método de verificación inválido (solo HUELLAS, QR, MANUAL).
-- Esperado: chk_ingresos_metodo
INSERT INTO registros_ingresos (id_cliente, fecha, hora_entrada, metodo_verificacion, estado_verificacion)
VALUES ('1065100001', CURRENT_DATE, '18:00', 'FACIAL', 'APROBADO');

-- 33. Cita con un instructor que no existe.
-- Esperado: fk_citas_instructor
INSERT INTO citas (id_instructor, id_cliente, fecha, hora, estado)
VALUES ('9999999999', '1065100001', CURRENT_DATE + 1, '08:00', 'PENDIENTE');

-- 34. Estado de cita inválido.
-- Esperado: chk_citas_estado
INSERT INTO citas (id_instructor, id_cliente, fecha, hora, estado)
SELECT id_instructor, id_cliente, CURRENT_DATE + 1, '08:00', 'REPROGRAMADA'
FROM citas
WHERE id_cita = 1;

-- 35. Mensaje con un remitente inválido (solo CLIENTE, GYMBROT).
-- Esperado: chk_mensajes_remitente
INSERT INTO mensajes_gymbrot (id_sesion, remitente, contenido, timestamp_msg)
VALUES (1, 'ADMIN', 'Hola', CURRENT_TIMESTAMP);

-- 36. Notificación por un canal que no existe (solo EMAIL, SMS, OTRO).
-- Esperado: chk_notificaciones_tipo
INSERT INTO notificaciones (id_cliente, tipo, contenido, estado_envio, origen)
VALUES ('1065100001', 'WHATSAPP', 'Hola', 'PENDIENTE', 'MANUAL');


-- =============================================================================
-- INSERCIONES VÁLIDAS: un gimnasio nuevo con su cliente, membresía y pago.
-- Ejecuta el bloque completo (de BEGIN a ROLLBACK): todo entra sin errores y
-- los ids salen de las secuencias. El ROLLBACK final deshace los cambios.
-- =============================================================================
BEGIN;

INSERT INTO gimnasios (slug, nombre, ciudad, plan_software, estado, fecha_registro, vence_suscripcion)
VALUES ('gym-demo', 'Gym Demo', 'Valledupar', 'PRO', 'ACTIVO', CURRENT_DATE, CURRENT_DATE + 365);

INSERT INTO usuarios (numero_identificacion, id_gimnasio, tipo_identificacion, nombre, apellidos, correo, estado, fecha_registro, tipo_usuario)
VALUES ('1065900100', (SELECT id_gimnasio FROM gimnasios WHERE slug = 'gym-demo'),
        'CC', 'Cliente', 'Demo', 'cliente.demo@correo.co', 'ACTIVO', CURRENT_DATE, 'CLIENTE');

INSERT INTO clientes (numero_identificacion, direccion, fecha_nacimiento)
VALUES ('1065900100', 'Calle 10 # 5-20, Valledupar', '2000-05-15');

INSERT INTO planes_membresias (id_gimnasio, nombre, precio_mensual, precio_semestral, precio_anual)
VALUES ((SELECT id_gimnasio FROM gimnasios WHERE slug = 'gym-demo'), 'Demo', 70000, 380000, 700000);

INSERT INTO membresias (id_plan, tipo_membresia, modalidad_pago, valor, fecha_inicio, fecha_vencimiento, estado)
VALUES ((SELECT MAX(id_plan) FROM planes_membresias), 'Demo', 'MENSUAL', 70000, CURRENT_DATE, CURRENT_DATE + 29, 'ACTIVA');

INSERT INTO historial_membresias (id_cliente, id_membresia, fecha_asignacion, activa)
VALUES ('1065900100', (SELECT MAX(id_membresia) FROM membresias), CURRENT_DATE, TRUE);

INSERT INTO pagos (id_membresia, id_cliente, fecha_pago, valor, metodo_pago, estado_pago, referencia_transaccion)
VALUES ((SELECT MAX(id_membresia) FROM membresias), '1065900100', CURRENT_DATE, 70000, 'NEQUI', 'EXITOSO', 'NEQ-000001');

-- Comprobación: el cliente demo aparece con membresía vigente y su pago
SELECT u.nombre || ' ' || u.apellidos AS cliente, g.nombre AS gimnasio,
       m.id_membresia, m.fecha_vencimiento, p.id_pago, p.valor
FROM usuarios u
JOIN gimnasios g            ON g.id_gimnasio = u.id_gimnasio
JOIN historial_membresias h ON h.id_cliente = u.numero_identificacion
JOIN membresias m           ON m.id_membresia = h.id_membresia
JOIN pagos p                ON p.id_membresia = m.id_membresia
WHERE u.numero_identificacion = '1065900100';

ROLLBACK;
