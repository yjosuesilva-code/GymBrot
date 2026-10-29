-- =============================================================================
-- DATOS DE PRUEBA GYMBROT (solo local, no se sube al repositorio)
-- Requiere haber ejecutado migraciones/001_creacion_esquema.sql.
-- Ejecutar desde esta carpeta:  psql -U postgres -d gymbrot -f 00_ejecutar_todo.sql
-- =============================================================================
SET client_encoding = 'UTF8';
\set ON_ERROR_STOP on

BEGIN;
\i 01_gimnasios.sql
\i 02_usuarios.sql
\i 03_especialidades.sql
\i 04_clientes.sql
\i 05_instructores.sql
\i 06_administradores.sql
\i 07_planes_membresias.sql
\i 08_ejercicios.sql
\i 09_plantillas_mensaje.sql
\i 10_membresias.sql
\i 11_historial_membresias.sql
\i 12_pagos.sql
\i 13_rutinas.sql
\i 14_rutina_ejercicios.sql
\i 15_progresos.sql
\i 16_registros_ingresos.sql
\i 17_citas.sql
\i 18_sesiones_gymbrot.sql
\i 19_mensajes_gymbrot.sql
\i 20_notificaciones.sql
COMMIT;
