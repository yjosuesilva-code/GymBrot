import { NavLink } from "react-router-dom";
import { paginas } from "./paginas";

export function Sidebar() {
  return (
    <aside className="sidebar">
      <div className="sidebar-logo">GYMBROT</div>
      <nav className="nav-group">
        {paginas.map((p) => (
          <NavLink
            key={p.to}
            to={p.to}
            className={({ isActive }) => "nav-item" + (isActive ? " active" : "")}
          >
            {p.label}
          </NavLink>
        ))}
      </nav>
    </aside>
  );
}
