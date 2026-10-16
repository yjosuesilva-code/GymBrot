# GYMBROT — Multitenant por slug (`/g/:slug`)

Propuesta técnica para pasar de "el tenant sale de la sesión" a "el tenant sale de la URL".
Implementada y verificada sobre `developer` (`c63f786`) en 4 commits: `feat: implementar MultitenantSlug - Parte 1..4`.

**Estado de verificación:** `tsc -b` ✓ · `eslint .` ✓ · `vite build` ✓ · cada commit compila por separado ✓ · 37/37 pruebas de navegador ✓ (sección 10).

---

## 1. Decisiones

| # | Decisión | Por qué |
|---|----------|---------|
| S1 | `gimnasio_id` sigue siendo la llave de todas las FKs. `slug` es una columna **aparte**, única y solo para la URL. | No se repunta nada (D3 intacta). Mañana `gimnasio_id` será `uuid` y las URLs no cambian. |
| S2 | Rutas privadas en `/g/:slug/...` (prefijo `/g/`). | El sitio público (`/planes`, `/registro`…) nunca choca con un slug. |
| S3 | El **gimnasio activo de la capa de datos** = slug de la URL ∩ acceso de la sesión. | Es exactamente lo que hará RLS: aunque se fuerce otro slug, el api devuelve vacío. |
| S4 | Login por gimnasio (`/g/:slug/login`): el usuario se busca **solo dentro** de ese gimnasio. | Cierra la decisión pendiente de DECISIONES.md ("cómo identifica el login el gimnasio"): el nombre de usuario ya no necesita ser único en toda la plataforma. |
| S5 | Slug autogenerado desde el nombre, editable, validado (formato, reservados, duplicado). | Requisitos 1–3. La garantía final es un `UNIQUE` en la base. |
| S6 | Sesión con `accesos: [{ gimnasio_id, slug, rol }]` (opcional). | Hoy hay 1 gimnasio por usuario; con `gym_members` habrá varios. Las sesiones viejas (sin `accesos`) siguen siendo válidas. |
| S7 | Migración de localStorage **sin subir `SEED_VERSION`**: `completarSlugs()` rellena el slug que falte. | Subir el seed borraría los gimnasios creados desde `/registro`. |
| S8 | Rutas viejas sin slug **redirigen** al portal de la sesión hasta la Fase 4. | Requisito 10: marcadores, enlaces y ramas de P1/P3/P4 siguen funcionando. |

---

## 2. Arquitectura

```
URL /g/iron-house/clientes
        │
        ▼
App.tsx ── <Route path="/g/:slug" element={<TenantProvider><Outlet/></TenantProvider>}>
        │
        ▼
TenantProvider
  1. normaliza :slug (Iron-House → iron-house, redirige a la forma canónica)
  2. api.gimnasios.porSlug(slug)  ── público, sin sesión
  3. no existe → "Gimnasio no encontrado" · INACTIVO → "no está activo"
  4. existe → fijarGimnasio(gimnasio_id)   ◄── capa de datos
             → <TenantContext value={{ slug, gimnasio, ruta }}> ◄── vistas
        │
        ├── /g/:slug/login  → Login (sin guard) → auth.login(u, c, { gimnasio })
        │
        └── <Layout>  = guard: current() && tieneAcceso(sesion, gimnasio_id)
                │        si no → /g/:slug/login  (state.desde para volver)
                ▼
            Vistas (Clientes, Citas…) → api.clientes.list()
                                            │
                                            ▼
                                 db.readTenant(col)
                                   gimnasioActivo() =
                                     gimnasioFijado()            (URL)
                                     ?? gimnasio de la sesión    (solo transición)
                                     ∧ sesionTieneAcceso(gym)    (simula RLS)
```

**Mapeo a Supabase** (no cambia ninguna vista):

| Hoy (localStorage) | Supabase |
|---|---|
| `api.gimnasios.porSlug()` | `supabase.rpc('gimnasio_por_slug', { p_slug })` |
| `gimnasioFijado()` | igual: es el valor de `.eq('gimnasio_id', …)` |
| `sesionTieneAcceso()` en `gimnasioActivo()` | se borra: lo hace la política RLS `es_miembro(gimnasio_id)` |
| `Sesion.accesos` | `select gimnasio_id, rol, gimnasios(slug) from gym_members` |
| `auth.login(u, c, { gimnasio })` | `signInWithPassword` + comprobar fila en `gym_members` |
| `api.gimnasios.registrar()` | `signUp` + `rpc('registrar_gimnasio')` (transacción) |
| `slugUnico()` / validación | `CHECK` + `UNIQUE` en `gimnasios.slug` (error `23505` = duplicado) |

---

## 3. Mapa de rutas

| Ruta | Componente | Guard |
|---|---|---|
| `/` | `Landing` | — |
| `/planes` | `Planes` *(nuevo)* | — |
| `/contacto` | `Contacto` *(nuevo, esqueleto)* | — |
| `/registro` | `Registro` | — |
| `/login` | `BuscarGimnasio` *(nuevo)*: pide el enlace y manda a `/g/:slug/login` | — |
| `/g/:slug` | → `/g/:slug/dashboard` | TenantProvider |
| `/g/:slug/login` | `Login` | TenantProvider |
| `/g/:slug/{dashboard, clientes, clientes/:id, membresias, finanzas, rutinas, instructores, instructores/:id, citas, progreso, acceso, ejercicios, gymbrot-ai}` | vistas actuales | TenantProvider + Layout |
| `/g/:slug/<cualquier otra>` | → `dashboard` | |
| `/dashboard`, `/clientes/:id`… *(viejas)* | `RedirigirAlPortal` → `/g/<slug de la sesión>/…` | se borran en Fase 4 |

---

## 4. Árbol de carpetas

```
frontend-react/src/
├── App.tsx                          ✎ rutas públicas + /g/:slug + redirecciones viejas
├── tenant/                          ★ nuevo
│   ├── tenantActivo.ts              ★ gimnasio fijado para api.ts (sin imports)
│   ├── TenantContext.ts             ★ contexto + useTenant() + rutaDeTenant()
│   ├── TenantProvider.tsx           ★ resuelve :slug
│   └── RedirigirAlPortal.tsx        ★ compatibilidad rutas sin slug
├── lib/
│   ├── slug.ts                      ★ slugify / validarSlug / slugUnico / reservados
│   └── auth.ts                      ✎ login por gimnasio, accesos, tieneAcceso
├── data/
│   └── api.ts                       ✎ slug, migración, porSlug, slugDisponible, gimnasioActivo
├── types/index.ts                   ✎ Gimnasio.slug, GimnasioPublico, Sesion.accesos
├── components/
│   ├── layout/
│   │   ├── Layout.tsx               ✎ guard por gimnasio de la URL
│   │   ├── Sidebar.tsx              ✎ ruta(p.to)
│   │   ├── Topbar.tsx               ✎ nombre desde el contexto; logout → /g/:slug/login
│   │   └── paginas.ts               = sin cambios (rutas relativas al portal)
│   └── plataforma/                  ★ nuevo
│       ├── HeaderPublico.tsx        ★
│       └── SeccionPlanes.tsx        ★ (sale de Landing)
├── pages/
│   ├── Login.tsx                    ✎ login del portal
│   ├── Registro.tsx                 ✎ campo slug + disponibilidad
│   ├── BuscarGimnasio.tsx           ★ /login
│   ├── Planes.tsx                   ★ /planes
│   ├── Contacto.tsx                 ★ /contacto
│   ├── Landing.tsx                  ✎ usa HeaderPublico + SeccionPlanes
│   ├── Dashboard.tsx, Finanzas.tsx, Clientes.tsx,
│   │   ClienteDetalle.tsx, Instructores.tsx,
│   │   InstructorDetalle.tsx        ✎ enlaces con ruta()
│   └── (resto)                      = sin cambios
└── styles/gymbrot.css               ✎ bloque [multitenant-slug] al final
```

★ nuevo · ✎ modificado · = sin cambios

---

## 5. Modelo de datos

```ts
interface Gimnasio {
  gimnasio_id: string;   // llave de FKs (hoy 'gym-centro', mañana uuid)
  slug: string;          // NUEVO: único, kebab-case, 3-40, no reservado
  ...
}
type GimnasioPublico = Pick<Gimnasio, 'gimnasio_id' | 'slug' | 'nombre' | 'ciudad' | 'estado'>;
interface AccesoGimnasio { gimnasio_id: string; slug: string; rol: string }
interface Sesion { gimnasio_id: string; accesos?: AccesoGimnasio[]; ... }  // accesos opcional
```

Seed: `gym-centro → gymbrot-centro`, `gym-titan → titan-fitness`.

Reglas del slug (`lib/slug.ts`, idénticas al `CHECK` de la base): `^[a-z0-9]+(-[a-z0-9]+)*$`, 3–40 caracteres, sin tildes (`Ñandú → nandu`), fuera de la lista de reservados (`admin, api, login, registro, planes, www…`). Duplicados: `registrar()` sin slug propone `iron-house-2`; con slug elegido por el usuario responde error (no le cambia en silencio el enlace que vio).

---

## 6. Código por archivo

### 6.1 `src/lib/slug.ts` (nuevo)
```ts
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
```

### 6.2 `src/tenant/tenantActivo.ts` (nuevo)
```ts
/* [multitenant-slug] Gimnasio activo para la capa de datos.

   Antes api.ts sacaba el gimnasio de la sesion guardada en localStorage. Ahora
   lo fija TenantProvider a partir del slug de la URL, despues de comprobar que
   la sesion tiene acceso a ese gimnasio. api.ts lo lee de aqui con
   gimnasioFijado().

   Es un modulo sin imports a proposito: api.ts y auth.ts lo importan, y si
   este archivo importara a cualquiera de los dos se armaria un ciclo.

   Con Supabase este valor sigue haciendo falta: es el gimnasio_id que se pasa
   en cada .eq("gimnasio_id", ...). RLS no lo reemplaza, lo respalda: si el
   frontend pide filas de un gimnasio al que el usuario no pertenece, la base
   devuelve vacio. */

let actual: string | null = null;

export function fijarGimnasio(gimnasioId: string): void {
  actual = gimnasioId;
}

export function limpiarGimnasio(gimnasioId?: string): void {
  // Con id: solo limpia si sigue siendo el mismo. Evita que el cleanup de un
  // TenantProvider que se desmonta borre el gimnasio que ya fijo el siguiente
  // (pasa al cambiar de /g/a/... a /g/b/... y en el doble montaje de StrictMode).
  if (gimnasioId === undefined || actual === gimnasioId) actual = null;
}

export function gimnasioFijado(): string | null {
  return actual;
}
```

### 6.3 `src/tenant/TenantContext.ts` (nuevo)
```ts
import { createContext, useContext } from "react";
import type { GimnasioPublico } from "../types";

/* [multitenant-slug] Gimnasio de la URL actual (/g/:slug/...).

   Solo existe dentro de TenantProvider, y TenantProvider no pinta a sus hijos
   hasta resolver el slug: por eso `gimnasio` nunca es null aqui y las vistas
   no tienen que preguntar "¿ya cargo?".

   Va en un .ts aparte de TenantProvider.tsx porque react-refresh solo hace
   hot reload de archivos que exportan componentes; mezclar el hook con el
   componente rompe el HMR (regla react-refresh/only-export-components). */

export interface TenantContextValue {
  /* Slug canonico (minusculas), tal como esta en gimnasios.slug. */
  slug: string;
  gimnasio: GimnasioPublico;
  /* Arma rutas del portal: ruta("/clientes/123") -> "/g/iron-house/clientes/123".
     Toda navegacion interna pasa por aqui; un "/clientes" suelto se sale del
     portal (y la ruta vieja lo mandaria al gimnasio de la sesion, que puede
     no ser el que se esta viendo). */
  ruta: (path: string) => string;
}

export const TenantContext = createContext<TenantContextValue | null>(null);

export function rutaDeTenant(slug: string, path = ""): string {
  const limpio = path.startsWith("/") ? path : "/" + path;
  return "/g/" + slug + (limpio === "/" ? "" : limpio);
}

/* Para todo lo que vive bajo /g/:slug. Fuera del provider es un error de
   programacion (una ruta privada que quedo sin /g/:slug en App.tsx), asi que
   falla fuerte en vez de devolver datos de otro gimnasio. */
export function useTenant(): TenantContextValue {
  const valor = useContext(TenantContext);
  if (!valor) {
    throw new Error("useTenant() se llamó fuera de TenantProvider: la ruta debe colgar de /g/:slug.");
  }
  return valor;
}

/* Para componentes compartidos que tambien se pintan fuera del portal. */
export function useTenantOpcional(): TenantContextValue | null {
  return useContext(TenantContext);
}
```

### 6.4 `src/tenant/TenantProvider.tsx` (nuevo)
```tsx
import { useEffect, useMemo, useState } from "react";
import type { ReactNode } from "react";
import { Link, Navigate, useLocation, useParams } from "react-router-dom";
import { api } from "../data/api";
import { normalizarSlugDeUrl } from "../lib/slug";
import type { GimnasioPublico } from "../types";
import { TenantContext, rutaDeTenant } from "./TenantContext";
import type { TenantContextValue } from "./TenantContext";
import { fijarGimnasio, limpiarGimnasio } from "./tenantActivo";

/* [multitenant-slug] Resuelve el gimnasio a partir del :slug de la URL y lo
   deja disponible de dos formas:

   - para la capa de datos: fijarGimnasio(), que api.ts lee en cada
     readTenant/writeTenant (reemplaza a "el gimnasio de la sesion").
   - para las vistas: TenantContext, con el nombre del gimnasio y ruta().

   No decide si la sesion puede entrar: eso es del guard (Layout.tsx), porque
   /g/:slug/login tambien vive dentro del provider y no tiene sesion.

   Orden importante: fijarGimnasio() se llama ANTES de pasar a "listo", y los
   hijos solo se montan en "listo". Asi el primer useEffect de cualquier vista
   ya lee el gimnasio correcto. */

type Resolucion =
  | { slug: string; estado: "no-encontrado" }
  | { slug: string; estado: "inactivo"; gimnasio: GimnasioPublico }
  | { slug: string; estado: "listo"; gimnasio: GimnasioPublico };

export function TenantProvider({ children }: { children: ReactNode }) {
  const { slug: slugUrl } = useParams<{ slug: string }>();
  const location = useLocation();
  const slug = normalizarSlugDeUrl(slugUrl);

  // La resolucion guarda para que slug es. Si no coincide con el actual, se
  // esta cargando: no hace falta un setState("cargando") sincrono en el
  // efecto (la regla react-hooks/set-state-in-effect lo marca).
  const [resolucion, setResolucion] = useState<Resolucion | null>(null);

  useEffect(() => {
    if (!slug) return;
    let cancelado = false;
    let fijado: string | null = null;

    api.gimnasios.porSlug(slug).then((g) => {
      if (cancelado) return;
      if (!g) {
        setResolucion({ slug, estado: "no-encontrado" });
      } else if (g.estado !== "ACTIVO") {
        setResolucion({ slug, estado: "inactivo", gimnasio: g });
      } else {
        fijarGimnasio(g.gimnasio_id);
        fijado = g.gimnasio_id;
        setResolucion({ slug, estado: "listo", gimnasio: g });
      }
    });

    return () => {
      cancelado = true;
      if (fijado) limpiarGimnasio(fijado);
    };
  }, [slug]);

  const listo = resolucion?.slug === slug && resolucion.estado === "listo" ? resolucion.gimnasio : null;

  const valor = useMemo<TenantContextValue | null>(
    () => (listo ? { slug: listo.slug, gimnasio: listo, ruta: (path) => rutaDeTenant(listo.slug, path) } : null),
    [listo],
  );

  // /g/Iron-House/clientes -> /g/iron-house/clientes, una sola forma por gimnasio.
  if (slugUrl && slugUrl !== slug) {
    const resto = location.pathname.slice(("/g/" + slugUrl).length);
    return <Navigate to={rutaDeTenant(slug, resto) + location.search} replace />;
  }

  if (!slug || (resolucion && resolucion.slug === slug && resolucion.estado === "no-encontrado")) {
    return <GimnasioNoEncontrado slug={slug} />;
  }

  if (resolucion && resolucion.slug === slug && resolucion.estado === "inactivo") {
    return <GimnasioInactivo nombre={resolucion.gimnasio.nombre} />;
  }

  if (!valor) return <CargandoGimnasio />;

  return <TenantContext value={valor}>{children}</TenantContext>;
}

function CargandoGimnasio() {
  return (
    <div className="login-wrap" role="status" aria-live="polite">
      <div className="spinner-border text-light" aria-hidden />
      <span className="visually-hidden">Cargando gimnasio…</span>
    </div>
  );
}

function GimnasioNoEncontrado({ slug }: { slug: string }) {
  return (
    <div className="login-wrap">
      <div className="login-card text-center">
        <img className="login-logo" src="/logos/gymbrot-logo.png" alt="GYMBROT" width={348} height={180} />
        <h2>Gimnasio no encontrado</h2>
        <p className="login-hint">
          No hay ningún gimnasio con el enlace <strong>/g/{slug || "…"}</strong>. Revisa la dirección que te dio tu gimnasio.
        </p>
        <Link to="/login" className="btn-neon w-100 d-inline-block text-decoration-none">
          Buscar mi gimnasio
        </Link>
        <p className="login-hint">
          <Link to="/" className="land-link">Ir a GymBrot</Link>
        </p>
      </div>
    </div>
  );
}

function GimnasioInactivo({ nombre }: { nombre: string }) {
  return (
    <div className="login-wrap">
      <div className="login-card text-center">
        <img className="login-logo" src="/logos/gymbrot-logo.png" alt="GYMBROT" width={348} height={180} />
        <h2>{nombre}</h2>
        <p className="login-hint">Este gimnasio no está activo en GymBrot en este momento.</p>
        <Link to="/" className="land-link">Ir a GymBrot</Link>
      </div>
    </div>
  );
}
```

### 6.5 `src/tenant/RedirigirAlPortal.tsx` (nuevo)
```tsx
import { useEffect, useState } from "react";
import { Navigate, useLocation } from "react-router-dom";
import * as auth from "../lib/auth";
import { rutaDeTenant } from "./TenantContext";

/* [multitenant-slug] Compatibilidad con las rutas sin slug (/dashboard,
   /clientes/1000000001, enlaces guardados, marcadores...). Manda al mismo
   path dentro del portal del gimnasio de la sesion:

     /clientes/1000000001  ->  /g/gymbrot-centro/clientes/1000000001

   Sin sesion manda a /login, que pregunta por el gimnasio. Se retira en la
   Fase 4 de docs/MULTITENANT-SLUG.md, cuando ningun enlace interno use ya
   rutas sin slug. */
export function RedirigirAlPortal() {
  const location = useLocation();
  const [sesion] = useState(() => auth.current());
  const [destino, setDestino] = useState<{ slug: string | null } | null>(null);

  useEffect(() => {
    if (!sesion) return;
    let cancelado = false;
    auth.portalDeInicio(sesion).then((slug) => {
      if (cancelado) return;
      // La sesion apunta a un gimnasio que ya no existe: se cierra.
      if (!slug) auth.logout();
      setDestino({ slug });
    });
    return () => {
      cancelado = true;
    };
  }, [sesion]);

  if (!sesion) return <Navigate to="/login" replace />;
  if (!destino) return null; // un tick: el slug se resuelve del mock al instante

  if (!destino.slug) return <Navigate to="/login" replace />;

  return <Navigate to={rutaDeTenant(destino.slug, location.pathname) + location.search} replace />;
}
```

### 6.6 `src/App.tsx` (reemplazo completo)
```tsx
import type { ReactNode } from "react";
import { Routes, Route, Navigate, Outlet } from "react-router-dom";
import { Layout } from "./components/layout/Layout";
import { Dashboard } from "./pages/Dashboard";
import { Clientes } from "./pages/Clientes";
import { ClienteDetalle } from "./pages/ClienteDetalle";
import { Finanzas } from "./pages/Finanzas";          // [P1]
import { Acceso } from "./pages/Acceso";              // [P1]
import { GymbrotAI } from "./pages/GymbrotAI";        // [P1]
import { Login } from "./pages/Login";
import { Instructores } from "./pages/Instructores";          // [P3]
import { InstructorDetalle } from "./pages/InstructorDetalle"; // [P3]
import { Rutinas } from "./pages/Rutinas";                    // [P3]
import { Ejercicios } from "./pages/Ejercicios";              // [P4]
import { Membresias } from "./pages/Membresias";              // [P4]
import { Progreso } from "./pages/Progreso";                  // [P2]
import { Citas } from "./pages/Citas";                        // [P2]
import { Landing } from "./pages/Landing";                    // [P2] plataforma
import { Registro } from "./pages/Registro";                  // [P2] plataforma
import { Planes } from "./pages/Planes";                      // [multitenant-slug]
import { Contacto } from "./pages/Contacto";                  // [multitenant-slug]
import { BuscarGimnasio } from "./pages/BuscarGimnasio";      // [multitenant-slug]
import { TenantProvider } from "./tenant/TenantProvider";     // [multitenant-slug]
import { RedirigirAlPortal } from "./tenant/RedirigirAlPortal"; // [multitenant-slug]

/* [multitenant-slug] Rutas privadas de un gimnasio, relativas a /g/:slug.
   Una sola lista: la usan el portal y las redirecciones de compatibilidad,
   asi que agregar una pagina aqui la deja disponible en los dos lados. */
const RUTAS_PORTAL: { path: string; element: ReactNode }[] = [
  { path: "dashboard", element: <Dashboard /> },
  { path: "clientes", element: <Clientes /> },
  { path: "clientes/:id", element: <ClienteDetalle /> },
  { path: "membresias", element: <Membresias /> },              // [P4]
  { path: "finanzas", element: <Finanzas /> },                  // [P1]
  { path: "rutinas", element: <Rutinas /> },                    // [P3]
  { path: "instructores", element: <Instructores /> },          // [P3]
  { path: "instructores/:id", element: <InstructorDetalle /> }, // [P3]
  { path: "citas", element: <Citas /> },                        // [P2]
  { path: "progreso", element: <Progreso /> },                  // [P2]
  { path: "acceso", element: <Acceso /> },                      // [P1]
  { path: "ejercicios", element: <Ejercicios /> },              // [P4]
  { path: "gymbrot-ai", element: <GymbrotAI /> },               // [P1]
];

function App() {
  return (
    <Routes>
      {/* Sitio publico: sin sesion, sin tenant, sin Layout */}
      <Route path="/" element={<Landing />} />
      <Route path="/planes" element={<Planes />} />
      <Route path="/contacto" element={<Contacto />} />
      <Route path="/registro" element={<Registro />} />
      {/* /login ya no autentica: pregunta por el gimnasio y manda a /g/:slug/login */}
      <Route path="/login" element={<BuscarGimnasio />} />

      {/* Portal de cada gimnasio. TenantProvider resuelve :slug antes de pintar
          nada; Layout es el guard (sesion con acceso a ESE gimnasio). */}
      <Route
        path="/g/:slug"
        element={
          <TenantProvider>
            <Outlet />
          </TenantProvider>
        }
      >
        <Route index element={<Navigate to="dashboard" replace />} />
        <Route path="login" element={<Login />} />
        <Route element={<Layout />}>
          {RUTAS_PORTAL.map((r) => (
            <Route key={r.path} path={r.path} element={r.element} />
          ))}
          <Route path="*" element={<Navigate to="dashboard" replace />} />
        </Route>
      </Route>

      {/* Compatibilidad (Fases 1-3): las rutas viejas sin slug llevan al mismo
          path dentro del portal del gimnasio de la sesion. Se borran en la Fase 4. */}
      {RUTAS_PORTAL.map((r) => (
        <Route key={"legacy-" + r.path} path={"/" + r.path} element={<RedirigirAlPortal />} />
      ))}

      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

export default App;
```

### 6.7 `src/lib/auth.ts` (cambios)
```diff
--- a/frontend-react/src/lib/auth.ts
+++ b/frontend-react/src/lib/auth.ts
@@ -1,3 +1,3 @@
-import type { Sesion, Usuario } from "../types";
+import type { AccesoGimnasio, GimnasioPublico, Sesion, Usuario } from "../types";
 import { api } from "../data/api";
 
@@ -27,7 +27,16 @@ function fallo(motivo: MotivoFallo, mensaje: string): ResultadoLogin {
    esta validacion, leer() la descarta y el usuario vuelve a entrar por el
    login, que ya le asigna su gimnasio. */
+function esAcceso(datos: unknown): datos is AccesoGimnasio {
+  if (datos === null || typeof datos !== "object") return false;
+  const a = datos as Record<string, unknown>;
+  return typeof a.gimnasio_id === "string" && typeof a.slug === "string" && typeof a.rol === "string";
+}
+
 function esSesion(datos: unknown): datos is Sesion {
   if (datos === null || typeof datos !== "object") return false;
   const s = datos as Record<string, unknown>;
+  // [multitenant-slug] accesos es opcional: una sesion de antes del slug no lo
+  // trae y sigue siendo valida. Si viene, debe tener la forma correcta.
+  if (s.accesos !== undefined && !(Array.isArray(s.accesos) && s.accesos.every(esAcceso))) return false;
   return (
     typeof s.gimnasio_id === "string" &&
@@ -65,7 +74,10 @@ function leer(): Sesion | null {
 /* El campo que el usuario escribio se guarda aparte de la sesion: la UI lo
    muestra en el Topbar aunque el nombre real del usuario sea otro. */
-function sesionDe(u: Usuario, escrito: string): Sesion {
+function sesionDe(u: Usuario, escrito: string, slug: string): Sesion {
   return {
     gimnasio_id: u.gimnasio_id,
+    // [multitenant-slug] Hoy un usuario = un gimnasio. Con Supabase esta lista
+    // sale de gym_members y puede traer varios.
+    accesos: [{ gimnasio_id: u.gimnasio_id, slug, rol: u.rol }],
     numero_identificacion: u.numero_identificacion,
     usuario: escrito,
@@ -78,5 +90,15 @@ function sesionDe(u: Usuario, escrito: string): Sesion {
 }
 
-export async function login(identificador: string, contrasena: string): Promise<ResultadoLogin> {
+/* [multitenant-slug] Con gimnasio (login de /g/:slug/login) el usuario se
+   busca solo dentro de ese gimnasio. Sin gimnasio (el /login viejo y el
+   auto-login de /registro) se busca en toda la plataforma como antes; ese
+   camino se retira en la Fase 4 de docs/MULTITENANT-SLUG.md. */
+export type OpcionesLogin = { gimnasio?: GimnasioPublico };
+
+export async function login(
+  identificador: string,
+  contrasena: string,
+  opciones: OpcionesLogin = {},
+): Promise<ResultadoLogin> {
   const escrito = identificador.trim();
   const clave = contrasena.trim();
@@ -89,5 +111,12 @@ export async function login(identificador: string, contrasena: string): Promise<
   if (!clave) return fallo("CAMPOS_VACIOS", "Ingresa tu contraseña.");
 
-  const usuario = await api.usuarios.buscarPorNombreOCorreo(escrito);
+  const { gimnasio } = opciones;
+  if (gimnasio && gimnasio.estado !== "ACTIVO") {
+    return fallo("SIN_ACCESO", `${gimnasio.nombre} no está activo en GymBrot.`);
+  }
+
+  const usuario = gimnasio
+    ? await api.usuarios.buscarEnGimnasio(gimnasio.gimnasio_id, escrito)
+    : await api.usuarios.buscarPorNombreOCorreo(escrito);
 
   // Usuario inexistente y clave erronea se reportan por separado porque el
@@ -110,13 +139,46 @@ export async function login(identificador: string, contrasena: string): Promise<
   }
 
-  const sesion = sesionDe(usuario, escrito);
+  // El slug entra en la sesion para que redirigir las rutas viejas no tenga
+  // que buscarlo. Sin gimnasio en las opciones se resuelve por gimnasio_id.
+  const slug = gimnasio?.slug ?? (await slugDeGimnasio(usuario.gimnasio_id));
+  if (!slug) return fallo("SIN_ACCESO", "Tu gimnasio no está registrado en GymBrot.");
+
+  const sesion = sesionDe(usuario, escrito, slug);
   localStorage.setItem(CLAVE, JSON.stringify(sesion));
   return { ok: true, sesion };
 }
 
+async function slugDeGimnasio(gimnasioId: string): Promise<string | null> {
+  const g = (await api.gimnasios.list()).find((x) => x.gimnasio_id === gimnasioId);
+  return g?.slug ?? null;
+}
+
 export function current(): Sesion | null {
   return leer();
 }
 
+/* [multitenant-slug] Gimnasios a los que puede entrar la sesion. Una sesion
+   de antes del slug no trae accesos: se arma con su gimnasio_id y slug vacio
+   (portalDeInicio() lo completa). */
+export function accesosDe(sesion: Sesion): AccesoGimnasio[] {
+  return sesion.accesos ?? [{ gimnasio_id: sesion.gimnasio_id, slug: "", rol: sesion.rol }];
+}
+
+/* La pregunta que hace el guard de cada ruta privada. En el mock basta con
+   la sesion; con Supabase la respuesta real la da RLS y esto solo evita
+   pintar una pantalla que va a llegar vacia. */
+export function tieneAcceso(sesion: Sesion | null, gimnasioId: string): boolean {
+  if (!sesion) return false;
+  return accesosDe(sesion).some((a) => a.gimnasio_id === gimnasioId);
+}
+
+/* A donde mandar a alguien que entra por una ruta sin slug (/dashboard,
+   /clientes/123...): el portal del gimnasio con el que inicio sesion. */
+export async function portalDeInicio(sesion: Sesion): Promise<string | null> {
+  const primero = accesosDe(sesion).find((a) => a.gimnasio_id === sesion.gimnasio_id) ?? accesosDe(sesion)[0];
+  if (!primero) return null;
+  return primero.slug || (await slugDeGimnasio(primero.gimnasio_id));
+}
+
 export function logout(): void {
   localStorage.removeItem(CLAVE);
```

### 6.8 `src/data/api.ts` (cambios)
Solo toca: imports, 2 líneas del seed, `completarSlugs()`, `gimnasioActivo()`, `api.gimnasios` (`porSlug`, `slugDisponible`, `registrar`) y `api.usuarios.buscarEnGimnasio`. **No toca ninguna colección por gimnasio** (clientes, pagos, citas…): siguen con `readTenant`/`writeTenant`.
```diff
--- a/frontend-react/src/data/api.ts
+++ b/frontend-react/src/data/api.ts
@@ -2,6 +2,9 @@ import { utils } from "../lib/utils";
 import { membresiaVigente } from "../lib/membresias";
 import { notificarCambioDeDatos } from "../lib/datos";
+import { slugUnico, slugify, validarSlug, normalizarSlugDeUrl } from "../lib/slug"; // [multitenant-slug]
+import { gimnasioFijado } from "../tenant/tenantActivo"; // [multitenant-slug]
 import type {
   Gimnasio, // [multitenant]
+  GimnasioPublico, // [multitenant-slug]
   PlanSoftware, // [plataforma]
   PagoSoftware, // [plataforma]
@@ -326,6 +329,6 @@ const SEED: Seed = {
   // otro gimnasio, se nota al instante (DECISIONES.md, convenciones).
   gimnasios: [
-    { gimnasio_id:'gym-centro', nombre:'GymBrot Centro', ciudad:'Valledupar', telefono:'6055700000', estado:'ACTIVO', plan_software:'PREMIUM', fecha_registro:dia(400), vence_suscripcion:dia(-20) },
-    { gimnasio_id:'gym-titan',  nombre:'Titan Fitness',  ciudad:'Valledupar', telefono:'6055711111', estado:'ACTIVO', plan_software:'BASICO',  fecha_registro:dia(25),  vence_suscripcion:dia(-5) },
+    { gimnasio_id:'gym-centro', slug:'gymbrot-centro', nombre:'GymBrot Centro', ciudad:'Valledupar', telefono:'6055700000', estado:'ACTIVO', plan_software:'PREMIUM', fecha_registro:dia(400), vence_suscripcion:dia(-20) },
+    { gimnasio_id:'gym-titan',  slug:'titan-fitness',  nombre:'Titan Fitness',  ciudad:'Valledupar', telefono:'6055711111', estado:'ACTIVO', plan_software:'BASICO',  fecha_registro:dia(25),  vence_suscripcion:dia(-5) },
   ],
 
@@ -509,4 +512,33 @@ function sembrarSiHaceFalta(): void {
 sembrarSiHaceFalta();
 
+/* [multitenant-slug] Migracion sin perdida de datos. No se sube SEED_VERSION:
+   eso reescribiria todas las colecciones y borraria los gimnasios que alguien
+   ya registro desde /registro en su navegador. En cambio, a cada gimnasio
+   guardado sin slug se le genera uno a partir del nombre, sin repetir. Es
+   idempotente: si todos tienen slug no escribe nada. */
+function completarSlugs(): void {
+  const clave = "gymbrot_gimnasios";
+  const raw = localStorage.getItem(clave);
+  if (!raw) return;
+  let gimnasios: Array<Omit<Gimnasio, "slug"> & { slug?: string }>;
+  try {
+    gimnasios = JSON.parse(raw);
+  } catch {
+    return; // un JSON roto lo regenera el siguiente bump del seed
+  }
+  if (gimnasios.every((g) => typeof g.slug === "string" && g.slug)) return;
+
+  const usados = new Set(gimnasios.flatMap((g) => (g.slug ? [g.slug] : [])));
+  const migrados = gimnasios.map((g) => {
+    if (g.slug) return g;
+    const slug = slugUnico(g.nombre, usados);
+    usados.add(slug);
+    return { ...g, slug };
+  });
+  localStorage.setItem(clave, JSON.stringify(migrados));
+}
+
+completarSlugs();
+
 // --- Multitenant ---------------------------------------------------------
 // Misma clave que CLAVE en lib/auth.ts. Se lee directo de localStorage y no
@@ -515,11 +547,18 @@ sembrarSiHaceFalta();
 const CLAVE_SESION = "gymbrot_session";
 
-/* Gimnasio de la sesion abierta, o null si no hay sesion valida. */
-function gimnasioActivo(): string | null {
+/* [multitenant-slug] Fase de transicion. Mientras quede alguna ruta sin
+   /g/:slug (o algun componente que llame al api fuera de TenantProvider), el
+   gimnasio se toma de la sesion como antes. Al terminar la Fase 3 de
+   docs/MULTITENANT-SLUG.md se pone en false: sin slug en la URL, no hay datos. */
+const TENANT_DESDE_SESION = true;
+
+/* Lo que trae la sesion guardada, sin validar el resto de campos (eso lo hace
+   auth.ts). Solo interesa a que gimnasios puede entrar. */
+function sesionGuardada(): { gimnasio_id?: unknown; accesos?: unknown } | null {
   const raw = localStorage.getItem(CLAVE_SESION);
   if (!raw) return null;
   try {
-    const sesion = JSON.parse(raw) as { gimnasio_id?: unknown };
-    return typeof sesion.gimnasio_id === "string" ? sesion.gimnasio_id : null;
+    const sesion = JSON.parse(raw);
+    return sesion !== null && typeof sesion === "object" ? sesion : null;
   } catch {
     return null;
@@ -527,4 +566,33 @@ function gimnasioActivo(): string | null {
 }
 
+/* Simula la politica RLS "solo filas de gimnasios donde soy miembro"
+   (es_miembro() en docs/MULTITENANT-SLUG.md). Con Supabase esta funcion
+   desaparece: la base hace la comprobacion. Mientras tanto, el mock se
+   comporta igual: pedir datos de un gimnasio ajeno devuelve vacio. */
+function sesionTieneAcceso(gimnasioId: string): boolean {
+  const s = sesionGuardada();
+  if (!s) return false;
+  if (Array.isArray(s.accesos)) {
+    return s.accesos.some(
+      (a) => a !== null && typeof a === "object" && (a as { gimnasio_id?: unknown }).gimnasio_id === gimnasioId,
+    );
+  }
+  return s.gimnasio_id === gimnasioId; // sesion anterior al slug
+}
+
+/* Gimnasio cuyos datos se leen y escriben: el del slug de la URL (lo fija
+   TenantProvider), y solo si la sesion tiene acceso a el. null = sin datos. */
+function gimnasioActivo(): string | null {
+  const s = TENANT_DESDE_SESION ? sesionGuardada() : null;
+  const deSesion = s && typeof s.gimnasio_id === "string" ? s.gimnasio_id : null;
+  const gym = gimnasioFijado() ?? deSesion;
+  if (!gym) return null;
+  return sesionTieneAcceso(gym) ? gym : null;
+}
+
+function publico(g: Gimnasio): GimnasioPublico {
+  return { gimnasio_id: g.gimnasio_id, slug: g.slug, nombre: g.nombre, ciudad: g.ciudad, estado: g.estado };
+}
+
 /* Para escribir. Las vistas estan detras del login (Layout.tsx), asi que
    escribir datos de un gimnasio sin sesion es un error de programacion:
@@ -589,5 +657,8 @@ const db = {
 export interface RegistroGimnasio {
   plan: PlanSoftware["id_plan_software"];
-  gimnasio: { nombre: string; ciudad: string; telefono: string };
+  /* slug opcional: si la vista no lo manda, api.ts lo genera desde el nombre.
+     Si lo manda, se valida y debe estar libre (no se le agrega sufijo, porque
+     el usuario ya vio ese enlace exacto en la vista previa). */
+  gimnasio: { nombre: string; ciudad: string; telefono: string; slug?: string };
   admin: {
     numero_identificacion: string;
@@ -770,4 +841,34 @@ export const api = {
     },
 
+    /* [multitenant-slug] Resuelve el tenant de /g/:slug/... Es publico (no
+       pide sesion) porque la pantalla de login del gimnasio lo necesita para
+       mostrar su nombre. Devuelve solo GimnasioPublico, igual que la funcion
+       gimnasio_por_slug() de Supabase (docs/MULTITENANT-SLUG.md). */
+    async porSlug(slug: string): Promise<GimnasioPublico | null> {
+      await api._delay(120);
+      const clave = normalizarSlugDeUrl(slug);
+      if (!clave) return null;
+      const g = db.read<Gimnasio>("gimnasios").find((x) => x.slug === clave);
+      return g ? publico(g) : null;
+    },
+
+    /* [multitenant-slug] Para la vista previa de /registro. Responde ok=false
+       con el motivo (formato, reservado o ya usado) y, si se puede, sugiere
+       uno libre en data. Es solo un aviso: registrar() vuelve a validar. */
+    async slugDisponible(slug: string): Promise<ApiResp<{ slug: string; sugerencia?: string }>> {
+      await api._delay(150);
+      const valido = validarSlug(slug);
+      if (!valido.ok) return { ok: false, mensaje: valido.mensaje, data: { slug } };
+      const usados = new Set(db.read<Gimnasio>("gimnasios").map((g) => g.slug));
+      if (usados.has(slug)) {
+        return {
+          ok: false,
+          mensaje: "Ese enlace ya lo usa otro gimnasio.",
+          data: { slug, sugerencia: slugUnico(slug, usados) },
+        };
+      }
+      return { ok: true, mensaje: "Disponible", data: { slug } };
+    },
+
     // [plataforma] Lo que muestra la pagina de planes.
     async planesSoftware(): Promise<PlanSoftware[]> {
@@ -790,4 +891,5 @@ export const api = {
         ciudad: datos.gimnasio.ciudad.trim(),
         telefono: datos.gimnasio.telefono.trim(),
+        slug: datos.gimnasio.slug?.trim().toLowerCase() ?? "", // [multitenant-slug]
       };
       const a = {
@@ -822,6 +924,21 @@ export const api = {
       const hoy = utils.isoDate();
 
+      // [multitenant-slug] Unico en toda la plataforma. Con Supabase lo
+      // garantiza el indice UNIQUE de gimnasios.slug; esta comprobacion queda
+      // solo para dar un mensaje claro antes de intentar el INSERT.
+      const usados = new Set(gimnasios.map((x) => x.slug));
+      let slug: string;
+      if (g.slug) {
+        const valido = validarSlug(g.slug);
+        if (!valido.ok) return { ok: false, mensaje: valido.mensaje };
+        if (usados.has(g.slug)) return { ok: false, mensaje: "Ese enlace ya lo usa otro gimnasio. Elige otro." };
+        slug = g.slug;
+      } else {
+        slug = slugUnico(slugify(g.nombre), usados);
+      }
+
       const gimnasio: Gimnasio = {
         gimnasio_id: idDeGimnasio(g.nombre, gimnasios),
+        slug,
         nombre: g.nombre,
         ciudad: g.ciudad,
@@ -888,4 +1005,23 @@ export const api = {
     },
 
+    /* [multitenant-slug] Login de /g/:slug/login: el gimnasio ya lo dice la
+       URL, asi que el usuario se busca solo dentro de el. Con esto el nombre
+       de usuario deja de tener que ser unico en toda la plataforma (basta con
+       que lo sea en su gimnasio). Lee la tabla completa y filtra a mano porque
+       todavia no hay sesion, y readTenant devolveria vacio.
+       En Supabase: signInWithPassword(correo) + comprobar gym_members. */
+    async buscarEnGimnasio(gimnasioId: string, texto: string): Promise<Usuario | null> {
+      await api._delay();
+      const clave = texto.trim().toLowerCase();
+      if (!clave || !gimnasioId) return null;
+      return (
+        db.read<Usuario>("usuarios").find(
+          (u) =>
+            u.gimnasio_id === gimnasioId &&
+            (u.nombre.toLowerCase() === clave || u.correo.toLowerCase() === clave),
+        ) ?? null
+      );
+    },
+
     // El modo manual de control de acceso busca por el numero de documento,
     // no por nombre ni correo: es lo que escribe el socio en la puerta
```

### 6.9 `src/types/index.ts` (cambios)
```diff
--- a/frontend-react/src/types/index.ts
+++ b/frontend-react/src/types/index.ts
@@ -16,4 +16,9 @@ export interface PlanSoftware {
 export interface Gimnasio {
   gimnasio_id: string;
+  /* [multitenant-slug] Identificador publico en la URL (/g/:slug/...).
+     Unico en toda la plataforma y estable: gimnasio_id sigue siendo la llave
+     de todas las FKs, el slug solo sirve para encontrar al tenant. Reglas en
+     lib/slug.ts. */
+  slug: string;
   nombre: string;
   ciudad: string;
@@ -25,4 +30,11 @@ export interface Gimnasio {
 }
 
+/* [multitenant-slug] Lo que cualquiera puede saber de un gimnasio a partir
+   de su slug, sin sesion: lo necesita /g/:slug/login para mostrar el nombre.
+   En Supabase lo devuelve la funcion gimnasio_por_slug(): la tabla gimnasios
+   no se expone a anon, y una funcion que responde por un slug exacto no
+   permite listar todos los gimnasios como lo haria una vista. */
+export type GimnasioPublico = Pick<Gimnasio, 'gimnasio_id' | 'slug' | 'nombre' | 'ciudad' | 'estado'>;
+
 /* Pago de la suscripcion de un gimnasio a la plataforma. Simulado: no hay
    pasarela, y por eso no guarda ningun dato de tarjeta. */
@@ -178,6 +190,22 @@ export interface ApiResp<T = unknown> {
    (loginController.java:156), pero viene preparado para que cada rol entre
    a su propio dashboard. */
+/* [multitenant-slug] Un gimnasio al que la sesion puede entrar. Hoy hay uno
+   solo (cada Usuario pertenece a un gimnasio); con Supabase sale de
+   gym_members y una persona puede tener varios. */
+export interface AccesoGimnasio {
+  gimnasio_id: Gimnasio['gimnasio_id'];
+  slug: Gimnasio['slug'];
+  rol: string;
+}
+
 export interface Sesion {
+  /* Gimnasio con el que se inicio sesion. Ya NO decide que datos se leen: eso
+     lo hace el slug de la URL (TenantProvider). Se conserva para redirigir
+     las rutas viejas (/dashboard) y por compatibilidad con sesiones guardadas
+     antes del slug. */
   gimnasio_id: Gimnasio['gimnasio_id'];
+  /* Opcional: las sesiones guardadas antes del slug no lo traen y siguen
+     siendo validas; auth.accesosDe() lo completa con gimnasio_id. */
+  accesos?: AccesoGimnasio[];
   numero_identificacion: string;
   usuario: string;
```

### 6.10 `src/pages/Login.tsx` (cambios)
```diff
--- a/frontend-react/src/pages/Login.tsx
+++ b/frontend-react/src/pages/Login.tsx
@@ -1,10 +1,31 @@
 import { useEffect, useState } from "react";
 import type { FormEvent } from "react";
-import { Link, Navigate, useNavigate } from "react-router-dom";
+import { Link, Navigate, useLocation, useNavigate } from "react-router-dom";
 import * as auth from "../lib/auth";
 import { api } from "../data/api";
+import { useTenant } from "../tenant/TenantContext";
+
+/* [multitenant-slug] Login del portal de un gimnasio: /g/:slug/login. El
+   gimnasio lo dice la URL (TenantProvider ya lo resolvio), asi que el
+   usuario se busca solo dentro de el. */
+
+// Credenciales de demo del seed, por gimnasio. Solo ayuda visual.
+const DEMO: Record<string, string> = {
+  "gymbrot-centro": "admin / admin  o  admin@gymbrot.com / admin",
+  "titan-fitness": "titan / titan  o  admin@titanfitness.com / titan",
+};
+
+type EstadoLogin = { desde?: string; otroGimnasio?: boolean } | null;
 
 export function Login() {
   const navigate = useNavigate();
+  const location = useLocation();
+  const { slug, gimnasio, ruta } = useTenant();
+  const estado = location.state as EstadoLogin;
+
+  // Solo se vuelve a rutas de este mismo portal: un `desde` armado a mano no
+  // puede sacar al usuario a otro gimnasio ni a otro sitio.
+  const destino =
+    estado?.desde && estado.desde.startsWith(ruta("/") + "/") ? estado.desde : ruta("/dashboard");
   const [usuario, setUsuario] = useState("");
   const [clave, setClave] = useState("");
@@ -21,7 +42,10 @@ export function Login() {
   }, []);
 
-  if (auth.current()) {
-    return <Navigate to="/dashboard" replace />;
+  const sesion = auth.current();
+  if (auth.tieneAcceso(sesion, gimnasio.gimnasio_id)) {
+    return <Navigate to={destino} replace />;
   }
+  // Hay sesion, pero de otro gimnasio: entrar aqui la reemplaza.
+  const sesionAjena = sesion !== null || estado?.otroGimnasio === true;
 
   function alternarLector() {
@@ -38,7 +62,7 @@ export function Login() {
     setEntrando(true);
     try {
-      const res = await auth.login(usuario, clave);
+      const res = await auth.login(usuario, clave, { gimnasio });
       if (res.ok) {
-        navigate("/dashboard", { replace: true });
+        navigate(destino, { replace: true });
         return;
       }
@@ -60,4 +84,8 @@ export function Login() {
         />
         <h2>Iniciar sesión</h2>
+        <p className="login-gym">
+          <i className="bi bi-building me-1" aria-hidden />
+          {gimnasio.nombre}
+        </p>
 
         <span
@@ -70,4 +98,10 @@ export function Login() {
         </span>
 
+        {sesionAjena && !error && (
+          <div className="alert-g alert-aviso show" role="status">
+            Tienes una sesión abierta en otro gimnasio. Si entras aquí, esa sesión se cierra.
+          </div>
+        )}
+
         {error && (
           <div className="alert-g alert-error show" role="alert">
@@ -108,7 +142,5 @@ export function Login() {
         </button>
 
-        <p className="login-hint">
-          Ingreso: admin / admin &nbsp;o&nbsp; admin@gymbrot.com / admin
-        </p>
+        {DEMO[slug] && <p className="login-hint">Demo: {DEMO[slug]}</p>}
 
         <button type="button" className="reader-toggle" onClick={alternarLector}>
@@ -118,5 +150,5 @@ export function Login() {
         {/* [P2] plataforma */}
         <p className="login-hint">
-          <Link to="/" className="land-link">¿Tu gimnasio aún no usa GymBrot? Conoce los planes</Link>
+          <Link to="/login" className="land-link">¿No es tu gimnasio? Busca el tuyo</Link>
         </p>
       </form>
```

### 6.11 `src/pages/Registro.tsx` (cambios)
```diff
--- a/frontend-react/src/pages/Registro.tsx
+++ b/frontend-react/src/pages/Registro.tsx
@@ -6,4 +6,6 @@ import type { RegistroGimnasio } from "../data/api";
 import * as auth from "../lib/auth";
 import { utils } from "../lib/utils";
+import { slugify, validarSlug, SLUG_MAX } from "../lib/slug"; // [multitenant-slug]
+import { rutaDeTenant } from "../tenant/TenantContext"; // [multitenant-slug]
 import type { PagoSoftware, PlanSoftware } from "../types";
 
@@ -34,4 +36,14 @@ const METODOS: { valor: PagoSoftware["metodo_pago"]; etiqueta: string; icono: st
 const NOMBRES_PASO = ["Plan", "Datos", "Pago"];
 
+/* [multitenant-slug] Mientras se escribe no se usa slugify(): quitaria el
+   guion final y no dejaria escribir "iron-" para seguir con "house". Esto
+   solo pasa a minusculas y cambia lo invalido por guiones; slugify() se
+   aplica al salir del campo. */
+function slugMientrasSeEscribe(texto: string): string {
+  return texto.toLowerCase().replace(/[^a-z0-9-]+/g, "-").replace(/-{2,}/g, "-").replace(/^-+/, "").slice(0, SLUG_MAX);
+}
+
+type Disponibilidad = { slug: string; ok: boolean; mensaje: string; sugerencia?: string };
+
 function planDeUrl(valor: string | null): IdPlan {
   return valor === "BASICO" || valor === "PRO" || valor === "PREMIUM" ? valor : "PRO";
@@ -49,4 +61,29 @@ export function Registro() {
   const [procesando, setProcesando] = useState(false);
   const [referencia, setReferencia] = useState("");
+  // [multitenant-slug] null = se genera solo desde el nombre del gimnasio.
+  const [slugManual, setSlugManual] = useState<string | null>(null);
+  const [disponibilidad, setDisponibilidad] = useState<Disponibilidad | null>(null);
+  const [portal, setPortal] = useState("");
+
+  const slug = slugManual ?? slugify(form.gimnasio.nombre);
+  const formatoSlug = slug ? validarSlug(slug) : null;
+  // La respuesta guarda para que slug era: si no coincide, se esta verificando.
+  const estadoSlug = disponibilidad?.slug === slug ? disponibilidad : null;
+
+  /* Disponibilidad con espera de 350 ms: no se consulta el api en cada tecla.
+     Es solo un aviso; api.gimnasios.registrar vuelve a validar al pagar. */
+  useEffect(() => {
+    if (!slug || !validarSlug(slug).ok) return;
+    let cancelado = false;
+    const t = setTimeout(() => {
+      api.gimnasios.slugDisponible(slug).then((r) => {
+        if (!cancelado) setDisponibilidad({ slug, ok: r.ok, mensaje: r.mensaje, sugerencia: r.data?.sugerencia });
+      });
+    }, 350);
+    return () => {
+      cancelado = true;
+      clearTimeout(t);
+    };
+  }, [slug]);
 
   useEffect(() => {
@@ -75,4 +112,8 @@ export function Registro() {
     if (a.contrasena.trim().length < 6) return setError("La contraseña debe tener al menos 6 caracteres.");
     if (a.contrasena !== a.confirmar) return setError("Las contraseñas no coinciden.");
+    // [multitenant-slug]
+    const valido = validarSlug(slug);
+    if (!valido.ok) return setError(valido.mensaje);
+    if (estadoSlug && !estadoSlug.ok) return setError(estadoSlug.mensaje);
     setError("");
     setPaso(3);
@@ -89,5 +130,10 @@ export function Registro() {
       const { numero_identificacion, nombre, apellidos, correo, contrasena } = form.admin;
       const admin = { numero_identificacion, nombre, apellidos, correo, contrasena };
-      const res = await api.gimnasios.registrar({ plan: planId, gimnasio: form.gimnasio, admin, metodo_pago: metodo });
+      const res = await api.gimnasios.registrar({
+        plan: planId,
+        gimnasio: { ...form.gimnasio, slug }, // [multitenant-slug]
+        admin,
+        metodo_pago: metodo,
+      });
       if (!res.ok || !res.data) {
         // Todas las validaciones del api son de los datos del paso 2.
@@ -96,9 +142,12 @@ export function Registro() {
         return;
       }
-      const sesion = await auth.login(admin.correo, admin.contrasena);
+      // [multitenant-slug] Login dentro del gimnasio recien creado, igual que
+      // si hubiera entrado por /g/:slug/login.
+      const sesion = await auth.login(admin.correo, admin.contrasena, { gimnasio: res.data.gimnasio });
       if (!sesion.ok) {
         setError("El gimnasio quedó registrado, pero no se pudo iniciar sesión: " + sesion.mensaje);
         return;
       }
+      setPortal(res.data.gimnasio.slug);
       setReferencia(res.data.pago.referencia);
     } finally {
@@ -117,7 +166,12 @@ export function Registro() {
           </p>
           <p className="card-sub">
-            Para volver a entrar usa tu correo <strong>{form.admin.correo.trim().toLowerCase()}</strong> y tu contraseña.
+            Tu gimnasio entra por <strong>{window.location.origin + rutaDeTenant(portal, "/login")}</strong>
+            {" "}con el correo <strong>{form.admin.correo.trim().toLowerCase()}</strong> y tu contraseña.
           </p>
-          <button className="btn-neon land-btn-lg" type="button" onClick={() => navigate("/dashboard", { replace: true })}>
+          <button
+            className="btn-neon land-btn-lg"
+            type="button"
+            onClick={() => navigate(rutaDeTenant(portal, "/dashboard"), { replace: true })}
+          >
             Ir a mi panel
           </button>
@@ -196,4 +250,51 @@ export function Registro() {
                     onChange={(e) => setGym("nombre", e.target.value)} autoComplete="organization" autoFocus />
                 </div>
+                {/* [multitenant-slug] */}
+                <div className="reg-col-2">
+                  <label className="form-label-g" htmlFor="gym-slug">Enlace de tu gimnasio</label>
+                  <div className="reg-slug">
+                    <span className="reg-slug-prefijo">{window.location.host}/g/</span>
+                    <input
+                      className="form-control-dark"
+                      id="gym-slug"
+                      value={slug}
+                      onChange={(e) => {
+                        const v = slugMientrasSeEscribe(e.target.value);
+                        setSlugManual(v === "" ? null : v);
+                      }}
+                      onBlur={() => slugManual !== null && setSlugManual(slugify(slugManual) || null)}
+                      placeholder="iron-house"
+                      aria-describedby="gym-slug-estado"
+                      spellCheck={false}
+                      autoCapitalize="none"
+                    />
+                  </div>
+                  <p
+                    id="gym-slug-estado"
+                    className={
+                      "reg-slug-estado" +
+                      (formatoSlug && !formatoSlug.ok ? " error" : estadoSlug ? (estadoSlug.ok ? " ok" : " error") : "")
+                    }
+                    aria-live="polite"
+                  >
+                    {!slug
+                      ? "Se arma solo con el nombre del gimnasio; puedes cambiarlo."
+                      : formatoSlug && !formatoSlug.ok
+                        ? formatoSlug.mensaje
+                        : !estadoSlug
+                          ? "Verificando disponibilidad…"
+                          : estadoSlug.ok
+                            ? "Disponible"
+                            : estadoSlug.mensaje}
+                    {estadoSlug?.sugerencia && (
+                      <>
+                        {" "}
+                        <button type="button" onClick={() => setSlugManual(estadoSlug.sugerencia ?? null)}>
+                          Usar {estadoSlug.sugerencia}
+                        </button>
+                      </>
+                    )}
+                  </p>
+                </div>
                 <div>
                   <label className="form-label-g" htmlFor="gym-ciudad">Ciudad</label>
@@ -259,4 +360,5 @@ export function Registro() {
               <div><dt>Plan</dt><dd>{plan.nombre}</dd></div>
               <div><dt>Gimnasio</dt><dd>{form.gimnasio.nombre.trim()}</dd></div>
+              <div><dt>Enlace</dt><dd>/g/{slug}</dd></div>
               <div><dt>Administrador</dt><dd>{form.admin.correo.trim().toLowerCase()}</dd></div>
               <div><dt>Total hoy</dt><dd className="reg-total">{utils.money(plan.precio_mensual)}</dd></div>
```

### 6.12 `src/components/layout/Layout.tsx`, `Sidebar.tsx`, `Topbar.tsx`
```diff
--- a/frontend-react/src/components/layout/Layout.tsx
+++ b/frontend-react/src/components/layout/Layout.tsx
@@ -3,15 +3,29 @@ import { Sidebar } from "./Sidebar";
 import { Topbar } from "./Topbar";
 import { paginas } from "./paginas";
-import { current } from "../../lib/auth";
+import { current, tieneAcceso } from "../../lib/auth";
+import { useTenant } from "../../tenant/TenantContext";
 
+/* [multitenant-slug] Guard de las rutas privadas de /g/:slug/... Vive dentro
+   de TenantProvider, asi que el gimnasio ya esta resuelto. Deja pasar solo si
+   la sesion tiene acceso a ESE gimnasio: tener sesion en otro no alcanza. */
 export function Layout() {
   const location = useLocation();
+  const { slug, gimnasio, ruta } = useTenant();
   const sesion = current();
 
-  if (!sesion) {
-    return <Navigate to="/login" replace />;
+  if (!sesion || !tieneAcceso(sesion, gimnasio.gimnasio_id)) {
+    // `desde` permite volver a la pantalla pedida despues del login.
+    return (
+      <Navigate
+        to={ruta("/login")}
+        replace
+        state={{ desde: location.pathname + location.search, otroGimnasio: sesion !== null }}
+      />
+    );
   }
 
-  const actual = paginas.find((p) => location.pathname.startsWith(p.to));
+  // paginas.ts guarda rutas sin slug ("/clientes"); se compara sin el prefijo.
+  const relativa = location.pathname.slice(("/g/" + slug).length) || "/";
+  const actual = paginas.find((p) => relativa.startsWith(p.to));
   const titulo = actual ? actual.label : "GYMBROT";
```
```diff
--- a/frontend-react/src/components/layout/Sidebar.tsx
+++ b/frontend-react/src/components/layout/Sidebar.tsx
@@ -1,6 +1,10 @@
 import { NavLink } from "react-router-dom";
 import { paginas } from "./paginas";
+import { useTenant } from "../../tenant/TenantContext";
 
 export function Sidebar() {
+  // [multitenant-slug] paginas.ts no conoce el slug: se le pone aqui.
+  const { ruta } = useTenant();
+
   return (
     <aside className="sidebar">
@@ -13,5 +17,5 @@ export function Sidebar() {
           <NavLink
             key={p.to}
-            to={p.to}
+            to={ruta(p.to)}
             title={p.label}
             className={({ isActive }) => "nav-item" + (isActive ? " active" : "")}
```
```diff
--- a/frontend-react/src/components/layout/Topbar.tsx
+++ b/frontend-react/src/components/layout/Topbar.tsx
@@ -1,6 +1,5 @@
-import { useEffect, useState } from "react";
 import { useNavigate } from "react-router-dom";
-import { api } from "../../data/api";
 import { logout } from "../../lib/auth";
+import { useTenant } from "../../tenant/TenantContext";
 
 type TopbarProps = { titulo: string; nombre: string };
@@ -9,15 +8,11 @@ export function Topbar({ titulo, nombre }: TopbarProps) {
   const navigate = useNavigate();
 
-  // Nombre del gimnasio de la sesion, para que siempre se vea en que tenant
-  // se esta trabajando. Lo resuelve api.ts; aqui solo se usa el nombre.
-  const [gimnasio, setGimnasio] = useState("");
-
-  useEffect(() => {
-    api.gimnasios.activo().then((g) => setGimnasio(g?.nombre ?? ""));
-  }, []);
+  // [multitenant-slug] El nombre sale del gimnasio de la URL, que ya resolvio
+  // TenantProvider: no hace falta pedirlo otra vez al api.
+  const { gimnasio, ruta } = useTenant();
 
   function salir() {
     logout();
-    navigate("/login", { replace: true });
+    navigate(ruta("/login"), { replace: true });
   }
 
@@ -26,10 +21,8 @@ export function Topbar({ titulo, nombre }: TopbarProps) {
       <div className="topbar-title">{titulo}</div>
       <div className="topbar-right">
-        {gimnasio && (
-          <span className="badge-g badge-confirmada" title="Gimnasio activo">
-            <i className="bi bi-building me-1" aria-hidden />
-            {gimnasio}
-          </span>
-        )}
+        <span className="badge-g badge-confirmada" title="Gimnasio activo">
+          <i className="bi bi-building me-1" aria-hidden />
+          {gimnasio.nombre}
+        </span>
         <span className="topbar-user">{nombre}</span>
         <div className="avatar">{(nombre.charAt(0) || "A").toUpperCase()}</div>
@@ -41,3 +34,3 @@ export function Topbar({ titulo, nombre }: TopbarProps) {
     </header>
   );
-}
\ No newline at end of file
+}
```

### 6.13 `src/pages/BuscarGimnasio.tsx` (nuevo)
```tsx
import { useState } from "react";
import type { FormEvent } from "react";
import { Link, useNavigate } from "react-router-dom";
import { api } from "../data/api";
import * as auth from "../lib/auth";
import { slugify } from "../lib/slug";
import { rutaDeTenant } from "../tenant/TenantContext";

/* [multitenant-slug] /login sin gimnasio. Antes era el login global; ahora
   cada gimnasio tiene el suyo en /g/:slug/login, y esta pantalla solo
   pregunta a cual ir. Mantiene viva la URL /login (Landing, marcadores,
   enlaces de la Fase 1) sin volver a buscar usuarios en toda la plataforma.

   No lista los gimnasios a proposito: seria regalar el directorio completo
   de clientes de GymBrot a cualquiera que abra la pagina. */

/* Acepta lo que la gente suele pegar: 'iron-house', 'Iron House',
   'gymbrot.com/g/iron-house' o 'https://.../g/iron-house/login'. */
function slugDeEntrada(texto: string): string {
  const t = texto.trim();
  const m = t.match(/\/g\/([^/?#]+)/i);
  return slugify(m ? m[1] : t);
}

export function BuscarGimnasio() {
  const navigate = useNavigate();
  const [texto, setTexto] = useState("");
  const [error, setError] = useState("");
  const [buscando, setBuscando] = useState(false);
  const conSesion = auth.current() !== null;

  async function buscar(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (buscando) return;
    const slug = slugDeEntrada(texto);
    if (!slug) return setError("Escribe el enlace o el nombre de tu gimnasio.");

    setError("");
    setBuscando(true);
    try {
      const g = await api.gimnasios.porSlug(slug);
      if (!g) return setError(`No encontramos ningún gimnasio con el enlace "${slug}".`);
      navigate(rutaDeTenant(g.slug, "/login"));
    } finally {
      setBuscando(false);
    }
  }

  return (
    <div className="login-wrap">
      <form className="login-card" onSubmit={buscar}>
        <img className="login-logo" src="/logos/gymbrot-logo.png" alt="GYMBROT" width={348} height={180} />
        <h2>¿Cuál es tu gimnasio?</h2>
        <p className="login-hint">Cada gimnasio entra por su propio enlace, por ejemplo /g/iron-house.</p>

        {error && (
          <div className="alert-g alert-error show" role="alert">
            {error}
          </div>
        )}

        <label className="form-label-g" htmlFor="gimnasio">Enlace o nombre del gimnasio</label>
        <input
          className="form-control-dark"
          id="gimnasio"
          value={texto}
          onChange={(e) => setTexto(e.target.value)}
          placeholder="iron-house"
          autoComplete="organization"
          autoFocus
        />

        <button className="btn-neon w-100" type="submit" disabled={buscando}>
          {buscando ? "Buscando..." : "Continuar"}
        </button>

        {conSesion && (
          <p className="login-hint">
            <Link to="/dashboard" className="land-link">Volver a mi panel</Link>
          </p>
        )}
        <p className="login-hint">
          Demo: <Link to="/g/gymbrot-centro/login" className="land-link">gymbrot-centro</Link> ·{" "}
          <Link to="/g/titan-fitness/login" className="land-link">titan-fitness</Link>
        </p>
        <p className="login-hint">
          <Link to="/" className="land-link">¿Tu gimnasio aún no usa GymBrot? Conoce los planes</Link>
        </p>
      </form>
    </div>
  );
}
```

### 6.14 Enlaces internos en vistas de P1/P3 (patrón)
Cada `to="/x"` o `navigate("/x")` dentro del portal pasa a `ruta("/x")`. Ejemplo:
```diff
--- a/frontend-react/src/pages/ClienteDetalle.tsx
+++ b/frontend-react/src/pages/ClienteDetalle.tsx
@@ -2,8 +2,10 @@ import { useEffect, useState } from "react";
 import { useParams, Link } from "react-router-dom";
 import { api } from "../data/api";
+import { useTenant } from "../tenant/TenantContext"; // [multitenant-slug]
 import { utils } from "../lib/utils";
 import type { Cliente, Membresia, Pago, Ingreso } from "../types";
 
 export function ClienteDetalle() {
+  const { ruta } = useTenant(); // [multitenant-slug]
   const { id } = useParams();
 
@@ -41,5 +43,5 @@ export function ClienteDetalle() {
     return (
       <div className="card-g">
-        <Link to="/clientes" className="btn-dark" style={{ textDecoration: "none" }}>← Volver</Link>
+        <Link to={ruta("/clientes")} className="btn-dark" style={{ textDecoration: "none" }}>← Volver</Link>
         <p className="empty-state">Cliente no encontrado</p>
       </div>
@@ -50,5 +52,5 @@ export function ClienteDetalle() {
     <>
       <div className="card-g">
-        <Link to="/clientes" className="btn-dark" style={{ textDecoration: "none" }}>← Volver</Link>
+        <Link to={ruta("/clientes")} className="btn-dark" style={{ textDecoration: "none" }}>← Volver</Link>
         <div className="person" style={{ marginTop: 16 }}>
           <div className="person-avatar">{utils.iniciales(cliente.nombre, cliente.apellidos)}</div>
```
Mismo cambio en `Dashboard.tsx` (Demografia, AccionesRapidas), `Finanzas.tsx` (Kpis), `Clientes.tsx`, `Instructores.tsx`, `InstructorDetalle.tsx`.

`Planes.tsx`, `Contacto.tsx`, `HeaderPublico.tsx`, `SeccionPlanes.tsx` y el bloque CSS están en el commit Parte 3.

---

## 7. Supabase + RLS (Fase 5)

```sql
-- Tenants
create table public.gimnasios (
  id                uuid primary key default gen_random_uuid(),
  slug              text not null,
  nombre            text not null,
  ciudad            text not null,
  telefono          text not null,
  estado            text not null default 'ACTIVO' check (estado in ('ACTIVO','INACTIVO')),
  plan_software     text not null,
  fecha_registro    date not null default current_date,
  vence_suscripcion date not null,
  constraint gimnasios_slug_formato check (
    slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$'
    and char_length(slug) between 3 and 40
    and slug not in ('admin','api','app','auth','contacto','dashboard','g','gymbrot','login',
                     'logout','nuevo','planes','plataforma','registro','soporte','static','assets','www')
  )
);
create unique index gimnasios_slug_key on public.gimnasios (slug);

-- Quién entra a qué gimnasio (modelo aprobado: auth.users, profiles, gym_members, clients)
create table public.gym_members (
  gimnasio_id uuid not null references public.gimnasios(id) on delete cascade,
  user_id     uuid not null references auth.users(id)       on delete cascade,
  rol         text not null check (rol in ('OWNER','ADMIN','RECEPCION','INSTRUCTOR')),
  estado      text not null default 'ACTIVO',
  primary key (gimnasio_id, user_id)
);

-- Helper de RLS. security definer para que la política no dependa de que
-- gym_members sea legible por el usuario (evita recursión de políticas).
create or replace function public.es_miembro(gym uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from gym_members m
    where m.gimnasio_id = gym and m.user_id = auth.uid() and m.estado = 'ACTIVO'
  );
$$;

-- Resolver el slug sin sesión. Función y no vista: responde por UN slug
-- exacto, así nadie puede listar todos los gimnasios de la plataforma.
create or replace function public.gimnasio_por_slug(p_slug text)
returns table (gimnasio_id uuid, slug text, nombre text, ciudad text, estado text)
language sql stable security definer set search_path = public as $$
  select g.id, g.slug, g.nombre, g.ciudad, g.estado
  from gimnasios g where g.slug = lower(trim(p_slug));
$$;
grant execute on function public.gimnasio_por_slug(text) to anon, authenticated;

-- RLS en gimnasios y gym_members
alter table public.gimnasios   enable row level security;
alter table public.gym_members enable row level security;
create policy gimnasios_miembros on public.gimnasios
  for select to authenticated using (public.es_miembro(id));
create policy gym_members_propios on public.gym_members
  for select to authenticated using (user_id = auth.uid());

-- Patrón para CADA tabla por gimnasio (clientes, membresias, pagos, citas, progreso…)
alter table public.clientes enable row level security;
create policy clientes_por_gimnasio on public.clientes
  for all to authenticated
  using      (public.es_miembro(gimnasio_id))
  with check (public.es_miembro(gimnasio_id));
create index on public.clientes (gimnasio_id);   -- toda consulta filtra por aquí
```

Alta de gimnasio en una transacción (reemplaza a `api.gimnasios.registrar`; se llama después de `supabase.auth.signUp`):

```sql
create or replace function public.registrar_gimnasio(
  p_nombre text, p_ciudad text, p_telefono text, p_plan text, p_slug text
) returns table (gimnasio_id uuid, slug text)
language plpgsql security definer set search_path = public as $$
declare v_id uuid;
begin
  if auth.uid() is null then raise exception 'Sin sesión'; end if;
  insert into gimnasios (slug, nombre, ciudad, telefono, plan_software, vence_suscripcion)
  values (lower(trim(p_slug)), p_nombre, p_ciudad, p_telefono, p_plan, current_date + 30)
  returning id into v_id;                        -- 23505 si el slug ya existe
  insert into gym_members (gimnasio_id, user_id, rol) values (v_id, auth.uid(), 'OWNER');
  return query select v_id, lower(trim(p_slug));
end $$;
grant execute on function public.registrar_gimnasio(text,text,text,text,text) to authenticated;
```

Cambios en el frontend al conectar Supabase (solo `api.ts` y `auth.ts`, como dice D2):

```ts
// api.ts
async porSlug(slug: string) {
  const { data } = await supabase.rpc("gimnasio_por_slug", { p_slug: slug }).maybeSingle();
  return data ?? null;
}
// readTenant → cada list() de colección por gimnasio
const { data, error } = await supabase.from("clientes").select("*").eq("gimnasio_id", gimnasioActivo());
// gimnasioActivo(): se borra sesionTieneAcceso(); RLS ya la aplica.

// auth.ts
const { data, error } = await supabase.auth.signInWithPassword({ email: correo, password });
const { data: miembro } = await supabase
  .from("gym_members").select("rol")
  .eq("gimnasio_id", gimnasio.gimnasio_id).eq("user_id", data.user.id).maybeSingle();
if (!miembro) { await supabase.auth.signOut(); return fallo("SIN_ACCESO", "No perteneces a este gimnasio."); }
```

---

## 8. Estrategia de migración

| Fase | Qué | Rompe algo | Commit |
|---|---|---|---|
| **0. Coordinar** | Mergear `migracion-react-P1` y `migracion-react-P3` a `developer` **antes**. Avisar al equipo que las rutas cambian. | — | — |
| **1. Base de datos/tenant** | `slug.ts`, `tenantActivo.ts`, tipos, `completarSlugs()`, `porSlug`, `slugDisponible`, `buscarEnGimnasio`, `gimnasioActivo()` con fallback a sesión. | No: sin provider, `gimnasioFijado()` es `null` y todo sigue leyendo de la sesión. | Parte 1 |
| **2. Auth + provider** | `auth.ts` (accesos, `tieneAcceso`, login con `{ gimnasio }`), `TenantContext`, `TenantProvider`, `RedirigirAlPortal`. | No: aún no se montan. | Parte 2 |
| **3. Rutas** | `App.tsx` con `/g/:slug`, guard en `Layout`, `Sidebar`/`Topbar`, `Login` del portal, `/login` buscador, enlaces con `ruta()`, `/planes`, `/contacto`. | No: las rutas viejas redirigen. | Parte 3 |
| **3b. Registro** | Campo slug + disponibilidad; alta entra a `/g/:slug/dashboard`. | No. | Parte 4 |
| **4. Limpieza** | `TENANT_DESDE_SESION = false`; borrar rutas viejas y `RedirigirAlPortal`; borrar `buscarPorNombreOCorreo` y el login global sin `{ gimnasio }`; `Sesion.accesos` obligatorio. Cerrar el punto en DECISIONES.md. | Sí para enlaces viejos: hacerlo cuando ningún `to="/x"` quede fuera de `ruta()`. | aparte |
| **5. Supabase** | SQL de la sección 7; reemplazar implementación de `api.ts`/`auth.ts`; login solo por correo. | No para las vistas. | aparte |

Para encontrar enlaces pendientes antes de la Fase 4:

```bash
grep -rnE '(to|href)="/|navigate\("/|Navigate to="/' frontend-react/src \
  | grep -vE 'pages/(Landing|Planes|Contacto|BuscarGimnasio|Registro)|plataforma/|tenant/'
```

Hoy solo devuelve el `Navigate to="/"` del catch-all de `App.tsx`, que es correcto.

---

## 9. Riesgos y compatibilidad

| Riesgo | Impacto | Mitigación |
|---|---|---|
| **Conflictos con ramas abiertas.** Probado: sobre `migracion-react-P3` aplica limpio; sobre `migracion-react-P1` choca en `App.tsx` y `gymbrot.css`. | Medio | P1 convierte `/acceso` en alias de `/clientes`. Al resolver, en `RUTAS_PORTAL` cambiar la entrada `acceso` por `{ path: "acceso", element: <Navigate to="../clientes" relative="path" replace /> }`, quitar el import de `Acceso`, y en el CSS conservar los dos bloques. Mejor: Fase 0 (mergear P1/P3 primero). |
| Vistas de otros integrantes tocadas (Dashboard, Finanzas, Instructores…) | Bajo | Cambios de 2–3 líneas, marcados `// [multitenant-slug]`. Avisar a P1/P3. |
| Un `to="/clientes"` nuevo sin `ruta()` | Medio | Funciona por la redirección, pero manda al gimnasio **de la sesión**, no al de la URL. Revisar con el `grep` de la sección 8 en cada PR. |
| `useTenant()` fuera del portal | Bajo | Lanza error explícito (no devuelve datos de otro gimnasio). |
| Deep links en hosting (`/g/x/clientes` al recargar da 404) | Alto en deploy | El host debe servir `index.html` para toda ruta. Vercel: `vercel.json` → `{ "rewrites": [{ "source": "/(.*)", "destination": "/" }] }`. Netlify: `public/_redirects` → `/* /index.html 200`. `vite dev/preview` ya lo hacen. |
| localStorage de compañeros con datos v11 | Bajo | `completarSlugs()` rellena slugs sin borrar nada. Probado con un gimnasio registrado a mano. |
| Sesiones guardadas antes del cambio | Bajo | `accesos` es opcional; `accesosDe()` usa `gimnasio_id`. Probado. |
| Cambiar el slug de un gimnasio rompe enlaces | Medio | No se ofrece edición de slug. Si se agrega: tabla `gimnasio_slugs_historicos` y redirección 301 desde el viejo. |
| Enumeración de gimnasios | Bajo | `/login` no lista gimnasios; `gimnasio_por_slug` responde solo por slug exacto. |
| Supabase Auth solo entra por correo | Medio | El login por "nombre de usuario" del legacy desaparece en Fase 5; el formulario debe pedir correo. |
| El login revela si un usuario existe (`USUARIO_DESCONOCIDO` vs `CONTRASENA_INCORRECTA`) | Ya existía | Sigue anotado en `auth.ts`; con backend volver a un solo "Credenciales inválidas". |
| `TenantContext` usa `<Context value>` (React 19) | — | El repo ya está en React 19.2. En React 18 sería `<TenantContext.Provider>`. |

---

## 10. Pruebas (ejecutadas en navegador, 37/37)

1. `/`, `/planes`, `/contacto`, `/registro` cargan sin sesión.
2. `/dashboard` sin sesión → `/login` (buscador).
3. Buscador con "Titan Fitness" → `/g/titan-fitness/login`, muestra el nombre del gimnasio.
4. `/g/no-existe/login` → "Gimnasio no encontrado".
5. `/g/Titan-Fitness/clientes` → forma canónica → login de titan (guard).
6. `admin/admin` (usuario de Centro) **no** entra en Titan.
7. `titan/titan` vuelve a `/g/titan-fitness/clientes`; ve Ana, Sebastián, Mariana; **no** ve a Carlos ni Valentina; sidebar con `/g/titan-fitness/...`; la sesión guarda `accesos`.
8. Detalle de cliente queda en `/g/titan-fitness/clientes/:id`.
9. Con sesión de Titan, `/g/gymbrot-centro/clientes` → login de Centro con aviso "sesión abierta en otro gimnasio".
10. `/clientes/1000000101` (viejo) → `/g/titan-fitness/clientes/1000000101`; `/g/titan-fitness` → `dashboard`.
11. Sesión con formato viejo (sin `accesos`) → `/dashboard` lleva a `/g/gymbrot-centro/dashboard` y ve sus datos.
12. Gimnasios guardados sin slug + dos "Iron House" → `gymbrot-centro`, `titan-fitness`, `iron-house`, `iron-house-2`; `SEED_VERSION` sigue en 11.
13. Registro: "Titan Fitness" → "ya lo usa otro gimnasio · Usar titan-fitness-2"; "Power Gym Ñandú" → `power-gym-nandu`; `admin` → reservado; alta con `power-gym` → pantalla final con la URL → `/g/power-gym/dashboard`.
14. Cerrar sesión → `/g/power-gym/login`; gimnasio nuevo arranca sin clientes de otros.

---

## 11. Checklist de implementación

**Fase 0**
- [ ] Mergear `migracion-react-P1` y `migracion-react-P3` en `developer`
- [ ] Avisar al equipo: rutas privadas pasan a `/g/:slug/...`; enlaces internos con `useTenant().ruta()`

**Fase 1–3 (commits Parte 1–4)**
- [ ] `lib/slug.ts`
- [ ] `tenant/tenantActivo.ts`
- [ ] `types`: `Gimnasio.slug`, `GimnasioPublico`, `AccesoGimnasio`, `Sesion.accesos?`
- [ ] `api.ts`: slugs en el seed, `completarSlugs()`, `gimnasioActivo()`, `porSlug`, `slugDisponible`, slug en `registrar`, `buscarEnGimnasio`
- [ ] `auth.ts`: `login(u, c, { gimnasio })`, `accesos`, `tieneAcceso`, `accesosDe`, `portalDeInicio`
- [ ] `TenantContext.ts`, `TenantProvider.tsx`, `RedirigirAlPortal.tsx`
- [ ] `App.tsx`: públicas + `/g/:slug` + redirecciones viejas
- [ ] `Layout` (guard), `Sidebar`, `Topbar`
- [ ] `Login` del portal, `BuscarGimnasio` en `/login`
- [ ] Enlaces internos con `ruta()` (grep de la sección 8 limpio)
- [ ] `Registro`: campo slug, disponibilidad, alta → `/g/:slug/dashboard`
- [ ] `/planes`, `/contacto`
- [ ] `tsc -b`, `eslint .`, `npm run build`
- [ ] Pruebas de la sección 10
- [ ] Reglas de rewrite en el hosting
- [ ] DECISIONES.md: registrar la decisión del slug y el login por gimnasio

**Fase 4**
- [ ] `TENANT_DESDE_SESION = false`
- [ ] Borrar rutas viejas de `App.tsx` y `RedirigirAlPortal.tsx`
- [ ] Borrar `api.usuarios.buscarPorNombreOCorreo` y el camino sin `{ gimnasio }` en `auth.login`
- [ ] `Sesion.accesos` obligatorio en `esSesion()`

**Fase 5**
- [ ] SQL de la sección 7 + políticas en cada tabla por gimnasio
- [ ] `api.ts` / `auth.ts` con el cliente de Supabase
- [ ] Login por correo
