import { useNavigate } from "react-router-dom";
import { logout } from "../../lib/auth";

type TopbarProps = { titulo: string; nombre: string };

export function Topbar({ titulo, nombre }: TopbarProps) {
  const navigate = useNavigate();

  function salir() {
    logout();
    navigate("/login", { replace: true });
  }

  return (
    <header className="topbar">
      <div className="topbar-title">{titulo}</div>
      <div className="topbar-right">
        <span className="topbar-user">{nombre}</span>
        <div className="avatar">{(nombre.charAt(0) || "A").toUpperCase()}</div>
        <button type="button" className="topbar-logout" title="Cerrar sesión" onClick={salir}>
          <i className="bi bi-box-arrow-right" aria-hidden />
          <span>Cerrar sesión</span>
        </button>
      </div>
    </header>
  );
}