-- PLANES_MEMBRESIAS: tres planes por gimnasio (15 registros)
INSERT INTO planes_membresias (id_plan, id_gimnasio, nombre, descripcion, precio_mensual, precio_semestral, precio_anual, beneficios) VALUES
(1, 1, 'Básico', 'Acceso a sala de máquinas en horario regular', 80000, 440000, 800000, 'Sala de máquinas; casillero'),
(2, 1, 'Plus', 'Acceso total con clases grupales', 120000, 660000, 1200000, 'Sala de máquinas; clases grupales; valoración mensual'),
(3, 1, 'Full', 'Acceso total con asesoría personalizada', 160000, 880000, 1600000, 'Sala de máquinas; clases; asesoría nutricional; rutina personalizada'),
(4, 2, 'Básico', 'Acceso a sala de máquinas en horario regular', 68000, 374000, 680000, 'Sala de máquinas; casillero'),
(5, 2, 'Plus', 'Acceso total con clases grupales', 102000, 561000, 1020000, 'Sala de máquinas; clases grupales; valoración mensual'),
(6, 2, 'Full', 'Acceso total con asesoría personalizada', 136000, 748000, 1360000, 'Sala de máquinas; clases; asesoría nutricional; rutina personalizada'),
(7, 3, 'Básico', 'Acceso a sala de máquinas en horario regular', 72000, 396000, 720000, 'Sala de máquinas; casillero'),
(8, 3, 'Plus', 'Acceso total con clases grupales', 108000, 594000, 1080000, 'Sala de máquinas; clases grupales; valoración mensual'),
(9, 3, 'Full', 'Acceso total con asesoría personalizada', 144000, 792000, 1440000, 'Sala de máquinas; clases; asesoría nutricional; rutina personalizada'),
(10, 4, 'Básico', 'Acceso a sala de máquinas en horario regular', 88000, 484000, 880000, 'Sala de máquinas; casillero'),
(11, 4, 'Plus', 'Acceso total con clases grupales', 132000, 726000, 1320000, 'Sala de máquinas; clases grupales; valoración mensual'),
(12, 4, 'Full', 'Acceso total con asesoría personalizada', 176000, 968000, 1760000, 'Sala de máquinas; clases; asesoría nutricional; rutina personalizada'),
(13, 5, 'Básico', 'Acceso a sala de máquinas en horario regular', 64000, 352000, 640000, 'Sala de máquinas; casillero'),
(14, 5, 'Plus', 'Acceso total con clases grupales', 96000, 528000, 960000, 'Sala de máquinas; clases grupales; valoración mensual'),
(15, 5, 'Full', 'Acceso total con asesoría personalizada', 128000, 704000, 1280000, 'Sala de máquinas; clases; asesoría nutricional; rutina personalizada');

SELECT setval(pg_get_serial_sequence('planes_membresias', 'id_plan'), (SELECT MAX(id_plan) FROM planes_membresias));
