import { NavLink, useNavigate } from "react-router-dom";
import { paginas } from "./paginas";
import { logout } from "../../lib/auth";

export function Sidebar() {
  const navigate = useNavigate();

  function salir() {
    logout();
    navigate("/login", { replace: true });
  }

  return (
    <aside className="sidebar">
      <div className="sidebar-logo">
        <img src="/logos/gymbrot-logo.png" alt="GYMBROT" width={348} height={180} />
      </div>
      <nav className="nav-group">
        {paginas.map((p) => (
          <NavLink
            key={p.to}
            to={p.to}
            className={({ isActive }) => "nav-item" + (isActive ? " active" : "")}
          >
            <i className={"bi " + p.icon} aria-hidden />
            <span>{p.label}</span>
          </NavLink>
        ))}
      </nav>

      <hr className="sidebar-sep" />

      <div className="sidebar-footer">
        <button type="button" className="nav-item" onClick={salir}>
          <i className="bi bi-box-arrow-right" aria-hidden />
          <span>Cerrar Sesión</span>
        </button>
      </div>
    </aside>
  );
}