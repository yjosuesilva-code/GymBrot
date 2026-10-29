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
