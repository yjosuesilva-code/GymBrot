// TODO(T2): reemplazar por layout completo del SUPERADMIN
import { Navigate, Outlet } from "react-router-dom";
import { current } from "../lib/auth";

export function LayoutPlataforma() {
  const sesion = current();
  if (!sesion) return <Navigate to="/plataforma/login" replace />;
  if (sesion.tipo_usuario !== "SUPERADMIN") return <Navigate to="/" replace />;
  if (sesion.debe_cambiar_contrasena) return <Navigate to="/plataforma/cambiar-contrasena" replace />;
  return (
    <div className="app-shell">
      <aside className="sidebar">
        <div className="sidebar-logo">
          <span className="sidebar-brand-text">GYMBROT PLATFORM</span>
        </div>
        <nav className="nav-group">
          <a className="nav-item" href="/plataforma/dashboard"><i className="bi bi-grid-1x2" aria-hidden /><span>Dashboard</span></a>
          <a className="nav-item" href="/plataforma/gimnasios"><i className="bi bi-building" aria-hidden /><span>Gimnasios</span></a>
          <a className="nav-item" href="/plataforma/planes"><i className="bi bi-ticket-perforated" aria-hidden /><span>Planes</span></a>
          <a className="nav-item" href="/plataforma/suscripciones"><i className="bi bi-receipt" aria-hidden /><span>Suscripciones</span></a>
        </nav>
      </aside>
      <div className="main-area">
        <main className="content"><Outlet /></main>
      </div>
    </div>
  );
}
