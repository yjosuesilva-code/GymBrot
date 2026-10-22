import { Navigate, NavLink, Outlet, useLocation, useNavigate } from "react-router-dom";
import { current, logout } from "../lib/auth";

/* [plataforma] Shell y guard del panel del SUPERADMIN, fuera de /g/:slug.
   No usa Sidebar/Topbar del portal porque esos dependen de useTenant(), y
   aqui no hay gimnasio activo. */

const CAMBIAR_CONTRASENA = "/plataforma/cambiar-contrasena";

const MENU = [
  { to: "/plataforma/dashboard", label: "Dashboard", icon: "bi-grid-1x2" },
  { to: "/plataforma/gimnasios", label: "Gimnasios", icon: "bi-building" },
  { to: "/plataforma/planes", label: "Planes", icon: "bi-ticket-perforated" },
  { to: "/plataforma/suscripciones", label: "Suscripciones", icon: "bi-receipt" },
];

export function LayoutPlataforma() {
  // Hooks antes de cualquier return: el guard sale temprano.
  const { pathname } = useLocation();
  const navigate = useNavigate();
  const sesion = current();

  if (!sesion) return <Navigate to="/plataforma/login" replace />;
  if (sesion.tipo_usuario !== "SUPERADMIN") return <Navigate to="/" replace />;

  // Cambio obligatorio. La pantalla de cambio vive dentro de este mismo
  // layout: sin excluirla, el guard se redirigiria a si mismo sin fin.
  if (sesion.debe_cambiar_contrasena && pathname !== CAMBIAR_CONTRASENA) {
    return <Navigate to={CAMBIAR_CONTRASENA} replace />;
  }

  function salir() {
    logout();
    navigate("/plataforma/login", { replace: true });
  }

  const actual = MENU.find((m) => pathname.startsWith(m.to));
  const titulo = pathname === CAMBIAR_CONTRASENA ? "Cambiar contraseña" : actual?.label ?? "Plataforma";
  const nombre = sesion.nombre || "Superadmin";

  return (
    <div className="app-shell">
      <aside className="sidebar">
        <div className="sidebar-logo">
          <img className="logo-mini" src="/logos/gymbrot-logo.png" alt="GYMBROT" width={348} height={180} />
          <img className="logo-full" src="/logos/gymbrot-icono.png" alt="" width={160} height={88} />
        </div>
        <nav className="nav-group">
          {MENU.map((m) => (
            <NavLink
              key={m.to}
              to={m.to}
              title={m.label}
              className={({ isActive }) => "nav-item" + (isActive ? " active" : "")}
            >
              <i className={"bi " + m.icon} aria-hidden />
              <span>{m.label}</span>
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
      <div className="main-area">
        <header className="topbar">
          <div className="topbar-title">{titulo}</div>
          <div className="topbar-right">
            <span className="pill-doc" style={{ textTransform: "uppercase", letterSpacing: "0.08em" }}>
              Plataforma
            </span>
            <span className="topbar-user">{nombre}</span>
            <div className="avatar">{nombre.charAt(0).toUpperCase()}</div>
          </div>
        </header>
        <main className="content" id="app-content">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
