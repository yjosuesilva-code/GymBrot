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

## D4 — Tenant por URL: `/g/:slug` *(propuesta, por aprobar en equipo)*

**Propuesto** en `docs/MULTITENANT-SLUG.md`. Cada gimnasio tiene un `slug` único
(`iron-house`) y su portal vive en `/g/:slug/...`. El gimnasio activo de la capa de
datos sale de la URL (TenantProvider) y solo se usa si la sesión tiene acceso a él
(lo mismo que hará RLS). `gimnasio_id` sigue siendo la llave de las FKs; el slug es
solo para la URL. El login pasa a ser por gimnasio (`/g/:slug/login`).

---

## D5 — Catálogo de ejercicios mixto: base global + propios por gimnasio

**Decidido.** La tabla `ejercicios` es compartida y tiene dos tipos de filas:

- **Ejercicios base:** `gimnasio_id = NULL`. Los ven todos los gimnasios y son de
  **solo lectura** para ellos. Los mantendrá el superadministrador de plataforma
  (mientras tanto vienen en el seed).
- **Ejercicios propios:** llevan el `gimnasio_id` del gimnasio que los creó. Solo ese
  gimnasio los ve, los edita, los desactiva o los elimina.

Reglas (implementadas en `api.ejercicios`):
- `list()` devuelve **base + propios del gimnasio activo**.
- Un gimnasio no puede editar, desactivar ni borrar un ejercicio base: puede
  **personalizarlo**, que crea una copia propia ("<nombre> (personalizado)") con id nuevo.
- El nombre de un ejercicio propio no puede repetirse dentro del gimnasio ni coincidir
  con uno base (sin importar mayúsculas, tildes ni espacios).
- Eliminar un ejercicio propio aplica **RESTRICT** si lo usa alguna rutina del gimnasio
  (se sugiere desactivarlo). *Difiere del esquema de `main`, que proponía CASCADE en
  `RUTINA_EJERCICIOS.id_ejercicio`: borrar el ejercicio cambiaría rutinas ya asignadas.*
- `id_ejercicio` es global (como un `SERIAL`), así una rutina puede referenciar un base
  o un propio sin ambigüedad.

En producción (RLS): lectura con `gimnasio_id IS NULL OR gimnasio_id = <gimnasio de la
sesión>`; escritura solo con `gimnasio_id = <gimnasio de la sesión>` (las filas base
las escribe únicamente el superadmin).

*Nota técnica del mock:* `db.readTenant` filtra por igualdad y no devuelve las filas
base, así que `api.ejercicios` las combina a mano (`leerCatalogo()`); las escrituras de
propios usan `writeTenant`, que conserva intactas las filas base.

**Rechazado:** catálogo solo global (los gimnasios no podrían agregar los suyos) y solo
por gimnasio (cada gimnasio arrancaría vacío y se duplicaría el mismo ejercicio en todos).

**Imágenes del catálogo base (KAN-96).** Vienen de
[free-exercise-db](https://github.com/yuhonas/free-exercise-db) (yuhonas), publicado
bajo **The Unlicense** (dominio público: se pueden copiar, modificar y redistribuir sin
atribución obligatoria; la dejamos por cortesía). Son 2 JPG por ejercicio (posición
inicial y final), reducidos a 400 px de ancho, en
`frontend-react/public/recursos/ejercicios/<id>-0.jpg` y `<id>-1.jpg`. El seed guarda la
ruta de la `-0` en `recurso_url` y la vista alterna las dos (`AnimacionEjercicio`).
39 de los 40 base tienen imagen (33 equivalentes exactos y 6 aproximados); *Burpees*
no tiene equivalente y muestra el ícono de respaldo. Los propios de cada gimnasio usan
la URL que les pongan (una imagen o GIF externo se muestra tal cual).

**Imágenes sugeridas para ejercicios propios (KAN-97).** `frontend-react/public/recursos/indice-imagenes.json`
(185 KB) es un índice derivado de la misma fuente, free-exercise-db (**The Unlicense**, dominio
público): los 873 ejercicios que traen dos imágenes, con nombre en inglés, nombre en español
(traducción propia con un glosario fijo), palabras clave en español (sinónimos usados en gimnasios de
Colombia), grupo muscular y equipo convertidos a nuestras listas, y categoría (fuerza, cardio,
estiramiento). Al crear o editar un ejercicio propio se sugieren hasta 6 imágenes según el nombre; las
imágenes **no se copian al proyecto**: `recurso_url` queda con el enlace a
`raw.githubusercontent.com/yuhonas/free-exercise-db/main/exercises/<id>/0.jpg`. La imagen nunca es
obligatoria: sin imagen se muestra un pictograma por grupo muscular, y también se puede subir una foto
(reducida a ~400 px y ~20 KB en base64) o pegar un enlace.

---

## Decisiones pendientes (por cerrar en equipo)

- [ ] Cómo identifica el login a qué gimnasio pertenece alguien: por usuario /
      por código de gimnasio / por subdominio. *(Recomendado: por usuario.)*
      **Implementado por usuario de forma provisional** (`b347270`): el login
      busca al usuario en toda la plataforma y la sesión hereda su
      `gimnasio_id`. Consecuencia: el nombre y el correo de quien inicia sesión
      deben ser **únicos en toda la plataforma**. Falta confirmarlo en equipo.
      **D4 propone cerrarlo por slug** (`/g/:slug/login`): el usuario se busca solo
      dentro del gimnasio de la URL.
- [ ] Qué catálogos son globales (compartidos) y cuáles por gimnasio:
      especialidades. *(Ejercicios: resuelto en D5, catálogo mixto.)*
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
