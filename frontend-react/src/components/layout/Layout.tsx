import { Navigate, Outlet, useLocation } from "react-router-dom";
import { Sidebar } from "./Sidebar";
import { Topbar } from "./Topbar";
import { paginas } from "./paginas";
import { current, tieneAcceso, rutaInicioRol } from "../../lib/auth";
import { useTenant } from "../../tenant/TenantContext";

/* [multitenant-slug] Guard de las rutas privadas de /g/:slug/... Vive dentro
   de TenantProvider, asi que el gimnasio ya esta resuelto. Deja pasar solo si
   la sesion tiene acceso a ESE gimnasio: tener sesion en otro no alcanza. */
export function Layout() {
  const location = useLocation();
  const { slug, gimnasio, ruta } = useTenant();
  const sesion = current();

  // El SUPERADMIN es dueno del software: no vive en /g/:slug
  if (sesion?.tipo_usuario === "SUPERADMIN") {
    return <Navigate to="/plataforma/dashboard" replace />;
  }

  if (!sesion || !tieneAcceso(sesion, gimnasio.gimnasio_id)) {
    // `desde` permite volver a la pantalla pedida despues del login.
    return (
      <Navigate
        to={ruta("/login")}
        replace
        state={{ desde: location.pathname + location.search, otroGimnasio: sesion !== null }}
      />
    );
  }

  // Cambio obligatorio antes de seguir.
  if (sesion.debe_cambiar_contrasena && !location.pathname.includes("/cambiar-contrasena")) {
    return <Navigate to={ruta("/cambiar-contrasena")} replace />;
  }

  // paginas.ts guarda rutas sin slug ("/clientes"); se compara sin el prefijo.
  const relativa = location.pathname.slice(("/g/" + slug).length) || "/";
  const actual = paginas.find((p) => relativa.startsWith(p.to));
  const titulo = actual ? actual.label : "GYMBROT";

  return (
    <div className="app-shell">
      <Sidebar />
      <div className="main-area">
        <Topbar titulo={titulo} nombre={sesion.nombre} />
        <main className="content" id="app-content">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
