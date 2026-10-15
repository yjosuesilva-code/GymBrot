/* [multitenant-slug] Reglas del slug de un gimnasio: la parte de la URL que
   identifica al tenant en /g/:slug/...

   Funciones puras, sin localStorage ni api: las usa api.ts para validar y
   Registro.tsx para la vista previa, y son las mismas reglas que el CHECK de
   la columna gimnasios.slug en Supabase (docs/MULTITENANT-SLUG.md). */

export const SLUG_MIN = 3;
export const SLUG_MAX = 40;

// kebab-case: minusculas, numeros y guiones simples, sin guion al inicio ni
// al final. Igual a la expresion del CHECK en la base.
const PATRON = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

/* Palabras que no pueden ser slug. Todas las rutas de gimnasio cuelgan de
   /g/, asi que no chocan con /registro o /planes, pero se reservan para no
   cerrarse la puerta a servir gymbrot.com/{slug} o subdominios mas adelante. */
export const SLUGS_RESERVADOS: ReadonlySet<string> = new Set([
  "admin", "api", "app", "auth", "contacto", "dashboard", "g", "gymbrot",
  "login", "logout", "nuevo", "planes", "plataforma", "registro", "soporte",
  "static", "assets", "www",
]);

/* 'Iron House Gym!' -> 'iron-house-gym'. Quita tildes (á -> a, ñ -> n) y
   cualquier simbolo, y recorta a SLUG_MAX sin dejar un guion colgando. */
export function slugify(texto: string): string {
  return texto
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, SLUG_MAX)
    .replace(/-+$/g, "");
}

export type MotivoSlugInvalido = "VACIO" | "CORTO" | "LARGO" | "FORMATO" | "RESERVADO";

export function validarSlug(slug: string): { ok: true } | { ok: false; motivo: MotivoSlugInvalido; mensaje: string } {
  if (!slug) return { ok: false, motivo: "VACIO", mensaje: "El enlace del gimnasio no puede quedar vacío." };
  if (slug.length < SLUG_MIN)
    return { ok: false, motivo: "CORTO", mensaje: `El enlace debe tener al menos ${SLUG_MIN} caracteres.` };
  if (slug.length > SLUG_MAX)
    return { ok: false, motivo: "LARGO", mensaje: `El enlace no puede pasar de ${SLUG_MAX} caracteres.` };
  if (!PATRON.test(slug))
    return { ok: false, motivo: "FORMATO", mensaje: "Usa solo minúsculas, números y guiones." };
  if (SLUGS_RESERVADOS.has(slug))
    return { ok: false, motivo: "RESERVADO", mensaje: "Ese enlace está reservado. Elige otro." };
  return { ok: true };
}

/* Primer slug libre a partir de una base: 'iron-house', 'iron-house-2',
   'iron-house-3'... Si la base no sirve (muy corta, reservada) arranca de
   'gym-<base>'. La comprobacion definitiva la hace quien guarda (api.ts hoy,
   el indice UNIQUE de la base manana); esto solo propone. */
export function slugUnico(base: string, usados: ReadonlySet<string>): string {
  let raiz = slugify(base);
  if (!validarSlug(raiz).ok) raiz = slugify("gym-" + (raiz || "nuevo"));
  // Deja sitio al sufijo '-NN' sin pasarse de SLUG_MAX.
  raiz = raiz.slice(0, SLUG_MAX - 4).replace(/-+$/g, "");

  let candidato = raiz;
  for (let n = 2; usados.has(candidato) || SLUGS_RESERVADOS.has(candidato); n++) {
    candidato = raiz + "-" + n;
  }
  return candidato;
}

/* El slug viene de la URL: se normaliza antes de buscarlo para que
   /g/Iron-House/ y /g/iron-house/ resuelvan igual (luego se redirige a la
   forma canonica). Nunca se usa como clave sin pasar por aqui. */
export function normalizarSlugDeUrl(valor: string | undefined): string {
  return (valor ?? "").trim().toLowerCase();
}
