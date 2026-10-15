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
