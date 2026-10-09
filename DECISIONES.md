# Decisiones de arquitectura — GYMBROT multitenant

Registro de las decisiones **cerradas** del equipo para la conversión de GYMBROT a
multitenant (SaaS de varios gimnasios sobre una sola app). No reabrir una decisión
cerrada sin acuerdo del equipo. Las decisiones aún abiertas están al final.

Basado en la *Guía de multitenancy para GYMBROT* (@alejandro, oct 2026).

---

## D1 — Modelo de aislamiento: tablas compartidas + `gimnasio_id` + RLS

**Decidido.** Una sola base de datos con tablas compartidas; cada fila lleva una
columna `gimnasio_id` que marca a qué gimnasio (tenant) pertenece. El aislamiento
real lo da Row Level Security (RLS) en la base; en el frontend se simula con un
filtro por `gimnasio_id`.

Se descartaron "base de datos por gimnasio" y "esquema por gimnasio" por costo y
complejidad para muchos gimnasios pequeños.

---

## D2 — Alcance de la entrega: multitenant simulado en el frontend

**Decidido.** Para la entrega académica el multitenant se **simula en `api.ts`**
sobre `localStorage`. Supabase + RLS queda **documentado como el paso de
producción**, no se implementa ahora.

Clave: como todas las vistas pasan por `api.ts` y nunca tocan la base
directamente, migrar a Supabase el día de mañana solo toca `api.ts`, no las vistas.

**Supabase: diferido.**

---

## D3 — Identidad de las personas: `gimnasio_id` + `numero_identificacion`

**Decidido (Opción A).** La cédula (`numero_identificacion`) sigue siendo la llave
de negocio. Se agrega `gimnasio_id` a las entidades-persona (Cliente, Usuario,
Instructor) y a las tablas. Como cada lectura se filtra por el gimnasio activo, la
cédula es **única dentro de cada gimnasio**.

- La misma persona en dos gimnasios = **dos registros separados**, uno por gimnasio.
- Los FKs (`id_cliente`, `id_instructor`) y las rutas (`/clientes/:id`,
  `/instructores/:id`) **se mantienen con la cédula**; no se repuntan.
- Requisito: el helper tenant debe filtrar por `gimnasio_id` **antes** de cualquier
  búsqueda por cédula, para que el `.find(cédula)` nunca sea ambiguo.

**Rechazado (Opción B — id interno subrogado).** Sería lo correcto para un SaaS con
identidad unificada de una persona entre gimnasios, pero queda **fuera de alcance**:
implicaría repuntar ~75 FKs y ~111 referencias a la cédula en todo el código.
Si en el futuro se necesita identidad compartida entre gimnasios, se reabre aquí.

---

## Decisiones pendientes (por cerrar en equipo)

- [ ] Cómo identifica el login a qué gimnasio pertenece alguien: por usuario /
      por código de gimnasio / por subdominio. *(Recomendado: por usuario.)*
      **Implementado por usuario de forma provisional** (`b347270`): el login
      busca al usuario en toda la plataforma y la sesión hereda su
      `gimnasio_id`. Consecuencia: el nombre y el correo de quien inicia sesión
      deben ser **únicos en toda la plataforma**. Falta confirmarlo en equipo.
- [ ] Qué catálogos son globales (compartidos) y cuáles por gimnasio:
      especialidades, ejercicios base.
- [ ] Roles definitivos (superadmin, administrador, instructor, cliente) —
      validar contra las historias de usuario.
- [ ] Si el superadmin de plataforma entra en esta entrega o después.
- [ ] Unicidad por gimnasio: revisar cada validación de duplicados en `api.ts`
      (hoy son globales; deben ser por gimnasio). *Hecho en `api.clientes`;
      falta en el resto de entidades.*

---

## Convenciones técnicas acordadas

- **Un solo punto de filtro:** la inyección de `gimnasio_id` vive en la capa
  `db`/`api.ts`, nunca en las vistas.
- Las vistas **no conocen** `gimnasio_id`.
- **Patrón en `api.ts`:** leer con `db.readTenant<T>(col)` y escribir con
  `db.writeTenant(col, filas)`. Nunca pasar a `db.write()` un arreglo que salió
  de `readTenant`: borraría las filas de los otros gimnasios. Referencia:
  `api.clientes`.
- Los ids numéricos (`id_cita`, `id_pago`...) se calculan con `db.read`
  (tabla completa), no con `readTenant`: son globales como un `SERIAL`, así
  dos gimnasios nunca repiten id.
- Los tipos "Nuevo" de cada entidad omiten `gimnasio_id` (ej. `ClienteNuevo`):
  lo pone `api.ts`, no la vista.
- El seed debe tener **al menos 2 gimnasios** (con datos que se solapen: misma
  cédula, mismo nombre de plan) para que una fuga de aislamiento se vea al instante.
  *(Hecho: `gym-centro` y `gym-titan`; se entra con `admin` o `titan`.)*
- **Pendiente de acordar:** un `.prettierrc` único en el repo antes de arrancar el
  refactor, para evitar que el format-on-save de cada quien genere diffs enormes en
  archivos compartidos (`api.ts`, `types/index.ts`).

---

*Última actualización: oct 2026 · Equipo GYMBROT (4 integrantes)*
