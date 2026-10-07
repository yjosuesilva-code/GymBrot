import { NavLink } from "react-router-dom";
import { paginas } from "./paginas";

export function Sidebar() {
  return (
    <aside className="sidebar">
      <div className="sidebar-logo">
        <img className="logo-mini" src="/logos/gymbrot-logo.png" alt="GYMBROT" width={348} height={180} />
        <img className="logo-full" src="/logos/gymbrot-icono.png" alt="" width={160} height={88} />
      </div>
      <nav className="nav-group">
        {paginas.map((p) => (
          <NavLink
            key={p.to}
            to={p.to}
            title={p.label}
            className={({ isActive }) => "nav-item" + (isActive ? " active" : "")}
          >
            <i className={"bi " + p.icon} aria-hidden />
            <span>{p.label}</span>
          </NavLink>
        ))}
      </nav>
    </aside>
  );
}