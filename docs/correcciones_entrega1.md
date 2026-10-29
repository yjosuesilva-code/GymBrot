# Correcciones del Esquema de Base de Datos - Entrega 1

## Resumen de Cambios
Este documento detalla las modificaciones e implemenaciones realizadas al esquema relacional de **GymBrot** para la construcción de la migración inicial (`migraciones/001_creacion_esquema.sql`), garantizando integridad declarativa total, políticas de borrado adecuadas y cumplimiento estricto con el diccionario base de 19 tablas.

---

## 1. Mapeo de Herencia de Usuarios
- **Modelo adoptado:** Se implementó una estrategia de clase por subtipo compartiendo la clave primaria.
- **Detalle:** `CLIENTES`, `INSTRUCTORES` y `ADMINISTRADORES` utilizan `numero_identificacion` como `PRIMARY KEY` propia y, a su vez, como `FOREIGN KEY` referenciando a `USUARIOS(numero_identificacion)`.
- **Integridad:**
  - `CLIENTES` e `INSTRUCTORES` manejan la regla `ON DELETE RESTRICT` para salvaguardar el historial operativo y transaccional del sistema.
  - `ADMINISTRADORES` maneja `ON DELETE CASCADE` para que sus privilegios administrativos sean eliminados automáticamente si el usuario base es removido.

---

## 2. Aplicación de Políticas de Borrado (FK)
Se asignaron políticas de borrado orientadas a la naturaleza de la relación entre tablas:

1. **`ON DELETE CASCADE` (Composición y Relaciones Fuertes):**
   - `RUTINA_EJERCICIOS` al eliminar la rutina o el ejercicio.
   - `MENSAJES_GYMBROT` al eliminar la sesión (`SESIONES_GYMBROT`).
2. **`ON DELETE SET NULL` (Relaciones Opcionales):**
   - `MENSAJES_GYMBROT.id_cita` para conservar el mensaje en el historial aunque se elimine la cita vinculada.
   - `NOTIFICACIONES.id_plantilla` para mantener el registro del envío de la notificación en caso de que la plantilla base sea eliminada.
3. **`ON DELETE RESTRICT` (Protección Transaccional e Histórica):**
   - Aplicado a todas las entidades transaccionales y maestras (`PAGOS`, `MEMBRESIAS`, `HISTORIAL_MEMBRESIAS`, `PROGRESOS`, `CITAS`, `REGISTROS_INGRESOS`, `ESPECIALIDADES`, `PLANES_MEMBRESIAS`).

---

## 3. Restricciones de Integridad Declarativa (CHECK y UNIQUE)
Para evitar la inserción de datos corruptos a nivel de motor de base de datos se agregaron las siguientes restricciones:

- **Validación de Dominios (CHECK):**
  - `USUARIOS.tipo_identificacion`: Limitado a `('CC', 'TI', 'CE', 'PP')`.
  - `USUARIOS.tipo_usuario`: Limitado a `('CLIENTE', 'INSTRUCTOR', 'ADMINISTRADOR')`.
  - `USUARIOS.estado`: Limitado a `('ACTIVO', 'INACTIVO', 'SUSPENDIDO')`.
  - `REGISTROS_INGRESOS.metodo_verificacion`: Limitado a `('HUELLAS', 'QR', 'MANUAL')`.
  - `REGISTROS_INGRESOS.estado_verificacion`: Limitado a `('APROBADO', 'RECHAZADO')`.
  - `PAGOS.estado_pago`: Limitado a `('EXITOSO', 'RECHAZADO', 'PENDIENTE')`.
  - `CITAS.estado`: Limitado a `('PENDIENTE', 'CONFIRMADA', 'COMPLETADA', 'CANCELADA')`.
  - `MENSAJES_GYMBROT.remitente`: Limitado a `('CLIENTE', 'GYMBROT')`.
  - `NOTIFICACIONES.tipo`, `estado_envio` y `origen`.
- **Campos Numéricos y Fechas:**
  - Control de montos no negativos en precios de planes y valor de pagos (`> 0` o `>= 0`).
  - Coherencia en rangos de fechas (`fecha_fin >= fecha_inicio` o `fecha_vencimiento >= fecha_inicio`).
- **Unicidad (UNIQUE):**
  - `USUARIOS.correo`
  - `ESPECIALIDADES.nombre`