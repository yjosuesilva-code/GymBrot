# Correcciones del Esquema de Base de Datos - Entrega 1

## Resumen de Cambios
Este documento detalla las modificaciones e implementaciones realizadas al esquema relacional de **GymBrot** para la construcción de la migración inicial (`migraciones/001_creacion_esquema.sql`), garantizando integridad declarativa total, políticas de borrado adecuadas y cumplimiento estricto con el diccionario base de 19 tablas, más la tabla `GIMNASIOS` que da soporte multitenant.

- **Motor:** PostgreSQL 12+. La WebApi se conecta con el proveedor `Npgsql.EntityFrameworkCore.PostgreSQL`.

---

## 1. Mapeo de Herencia de Usuarios
- **Modelo adoptado:** Se implementó una estrategia de clase por subtipo compartiendo la clave primaria.
- **Detalle:** `CLIENTES`, `INSTRUCTORES` y `ADMINISTRADORES` utilizan `numero_identificacion` como `PRIMARY KEY` propia y, a su vez, como `FOREIGN KEY` referenciando a `USUARIOS(numero_identificacion)`.
- **Integridad:**
  - `CLIENTES` e `INSTRUCTORES` manejan la regla `ON DELETE RESTRICT` para salvaguardar el historial operativo y transaccional del sistema.
  - `ADMINISTRADORES` maneja `ON DELETE CASCADE` para que sus privilegios administrativos sean eliminados automáticamente si el usuario base es removido.

---

## 2. Multitenant (GIMNASIOS)
- Se agregó la tabla `GIMNASIOS` (tenant), identificada por `id_gimnasio` y con un `slug` único que corresponde al enlace `/g/:slug` del frontend.
- `USUARIOS.id_gimnasio` indica a qué gimnasio pertenece cada persona; los subtipos (`CLIENTES`, `INSTRUCTORES`, `ADMINISTRADORES`) lo heredan a través de la clave compartida.
  - El `SUPERADMIN` es el único usuario sin gimnasio: `chk_usuarios_gimnasio` exige `id_gimnasio` nulo solo para ese tipo.
- Los catálogos propios de cada gimnasio llevan `id_gimnasio`:
  - `PLANES_MEMBRESIAS` (obligatorio, nombre único por gimnasio).
  - `EJERCICIOS` y `PLANTILLAS_MENSAJE` (opcional: `NULL` significa catálogo base del sistema compartido por todos los gimnasios).
- Las tablas transaccionales obtienen el gimnasio a través del cliente o del instructor.

---

## 3. Aplicación de Políticas de Borrado (FK)
Se asignaron políticas de borrado orientadas a la naturaleza de la relación entre tablas:

1. **`ON DELETE CASCADE` (Composición y Relaciones Fuertes):**
   - `RUTINA_EJERCICIOS` al eliminar la rutina.
   - `MENSAJES_GYMBROT` al eliminar la sesión (`SESIONES_GYMBROT`).
2. **`ON DELETE SET NULL` (Relaciones Opcionales):**
   - `MENSAJES_GYMBROT.id_cita` para conservar el mensaje en el historial aunque se elimine la cita vinculada.
   - `NOTIFICACIONES.id_plantilla` para mantener el registro del envío de la notificación en caso de que la plantilla base sea eliminada.
3. **`ON DELETE RESTRICT` (Protección Transaccional e Histórica):**
   - Aplicado a todas las entidades transaccionales y maestras (`GIMNASIOS`, `PAGOS`, `MEMBRESIAS`, `HISTORIAL_MEMBRESIAS`, `PROGRESOS`, `CITAS`, `REGISTROS_INGRESOS`, `ESPECIALIDADES`, `PLANES_MEMBRESIAS`).
   - `RUTINA_EJERCICIOS.id_ejercicio`: un ejercicio que está en alguna rutina no se puede eliminar (antes era `CASCADE` y lo quitaba en silencio de todas las rutinas).

---

## 4. Restricciones de Integridad Declarativa (CHECK y UNIQUE)
Para evitar la inserción de datos corruptos a nivel de motor de base de datos se agregaron las siguientes restricciones:

- **Validación de Dominios (CHECK):**
  - `GIMNASIOS.slug`: solo minúsculas, números y guiones; `plan_software` en `('BASICO', 'PRO', 'PREMIUM')`; `estado` en `('ACTIVO', 'SUSPENDIDO', 'INACTIVO')`.
  - `USUARIOS.tipo_identificacion`: Limitado a `('CC', 'TI', 'CE', 'PP')`.
  - `USUARIOS.tipo_usuario`: Limitado a `('CLIENTE', 'INSTRUCTOR', 'ADMINISTRADOR', 'SUPERADMIN')`.
  - `USUARIOS.estado`: Limitado a `('ACTIVO', 'INACTIVO', 'SUSPENDIDO', 'BLOQUEADO')`.
  - `RUTINA_EJERCICIOS.dia_semana`: días de la semana en mayúsculas sin tilde; `orden > 0`.
  - `REGISTROS_INGRESOS.metodo_verificacion`: Limitado a `('HUELLAS', 'QR', 'MANUAL')`.
  - `REGISTROS_INGRESOS.estado_verificacion`: Limitado a `('APROBADO', 'RECHAZADO')`.
  - `PAGOS.estado_pago`: Limitado a `('EXITOSO', 'RECHAZADO', 'PENDIENTE')`.
  - `CITAS.estado`: Limitado a `('PENDIENTE', 'CONFIRMADA', 'COMPLETADA', 'CANCELADA')`.
  - `MENSAJES_GYMBROT.remitente`: Limitado a `('CLIENTE', 'GYMBROT')`.
  - `NOTIFICACIONES.tipo`, `estado_envio` y `origen`.
- **Campos Numéricos, Fechas y Horas:**
  - Control de montos no negativos en precios de planes y valor de pagos (`> 0` o `>= 0`).
  - Coherencia en rangos de fechas (`fecha_fin >= fecha_inicio` o `fecha_vencimiento >= fecha_inicio`).
  - Coherencia en rangos de horas (`hora_salida >= hora_entrada`, `hora_fin >= hora_inicio`).
- **Unicidad (UNIQUE):**
  - `GIMNASIOS.slug`
  - `USUARIOS.correo`
  - `ESPECIALIDADES.nombre`
  - `PLANES_MEMBRESIAS (id_gimnasio, nombre)`
  - `HISTORIAL_MEMBRESIAS (id_cliente, id_membresia)`
  - `RUTINA_EJERCICIOS (id_rutina, id_ejercicio, dia_semana)`

---

## 5. Correcciones de Diseño
- **`RUTINA_EJERCICIOS`:** la clave primaria pasa de `(id_rutina, id_ejercicio)` a una clave propia `id_rutina_ejercicio`. Así un mismo ejercicio puede programarse en varios días de la misma rutina (ej. lunes y jueves).
- **Coherencia de `PAGOS`:** además de sus FK simples, `PAGOS (id_cliente, id_membresia)` referencia a `HISTORIAL_MEMBRESIAS (id_cliente, id_membresia)`. Un cliente solo puede pagar una membresía que le fue asignada.
- **Tipos de hora:** las columnas de hora que acompañan una columna `fecha` pasan de `TIMESTAMP` a `TIME` para no repetir la fecha (`CITAS.hora`, `REGISTROS_INGRESOS.hora_entrada/hora_salida`, `SESIONES_GYMBROT.hora_inicio/hora_fin`). `MENSAJES_GYMBROT.timestamp_msg` y `NOTIFICACIONES.fecha_envio` siguen como `TIMESTAMP` porque no tienen fecha aparte.
- **Banderas:** `PLANTILLAS_MENSAJE.activa` e `HISTORIAL_MEMBRESIAS.activa` pasan de `SMALLINT (0/1)` a `BOOLEAN`.

---

## 6. Índices
PostgreSQL no crea índices automáticamente sobre las claves foráneas. Se agregaron índices (`ix_*`) sobre las FK usadas en consultas y borrados, combinados con la fecha donde las consultas filtran por cliente o instructor y fecha (`PROGRESOS`, `REGISTROS_INGRESOS`, `CITAS`). Se omiten las columnas que ya encabezan una PK o un UNIQUE.
