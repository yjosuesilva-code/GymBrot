import { Outlet, useLocation } from "react-router-dom";
import { Sidebar } from "./Sidebar";
import { Topbar } from "./Topbar";
import { paginas } from "./paginas";

export function Layout() {
  const location = useLocation();
  const actual = paginas.find((p) => location.pathname.startsWith(p.to));
  const titulo = actual ? actual.label : "GYMBROT";

  return (
    <div className="app-shell">
      <Sidebar />
      <div className="main-area">
        <Topbar titulo={titulo} />
        <main className="content" id="app-content">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
