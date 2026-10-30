import { NavLink, useNavigate } from "react-router-dom";
import { paginasPorRol } from "./paginas";
import { useTenant } from "../../tenant/TenantContext";
import { current, logout } from "../../lib/auth";
import { ID_MENU, type MenuMovil } from "./useMenuMovil";

export function Sidebar({ menu }: { menu: MenuMovil }) {
  // [multitenant-slug] paginas.ts no conoce el slug: se le pone aqui.
  const { ruta } = useTenant();
  const navigate = useNavigate();
  const sesion = current();
  const paginas = (sesion && paginasPorRol[sesion.tipo_usuario]) || [];

  // Cerrar sesión vive al fondo del rail: limpia la sesión y vuelve al login
  // del gimnasio activo.
  function salir() {
    logout();
    navigate(ruta("/login"), { replace: true });
  }

  return (
    <aside id={ID_MENU} className={"sidebar" + (menu.abierto ? " abierto" : "")}>
      <div className="sidebar-logo">
        <img className="logo-mini" src="/logos/gymbrot-logo.png" alt="GYMBROT" width={348} height={180} />
        <img className="logo-full" src="/logos/gymbrot-icono.png" alt="" width={160} height={88} />
      </div>
      <nav className="nav-group">
        {paginas.map((p) => (
          <NavLink
            key={p.to}
            to={ruta(p.to)}
            title={p.label}
            className={({ isActive }) => "nav-item" + (isActive ? " active" : "")}
            end={p.to === "/dashboard" || p.to === "/instructor-dashboard" || p.to === "/mi-dashboard"}
            onClick={menu.cerrar}
          >
            <i className={"bi " + p.icon} aria-hidden />
            <span>{p.label}</span>
          </NavLink>
        ))}
      </nav>
      <div className="sidebar-foot">
        <button type="button" className="nav-item sidebar-logout" title="Cerrar sesión" onClick={salir}>
          <i className="bi bi-box-arrow-right" aria-hidden />
          <span>Cerrar sesión</span>
        </button>
      </div>
    </aside>
  );
}