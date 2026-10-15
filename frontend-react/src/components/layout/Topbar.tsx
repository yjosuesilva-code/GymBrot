import { useNavigate } from "react-router-dom";
import { logout } from "../../lib/auth";
import { useTenant } from "../../tenant/TenantContext";

type TopbarProps = { titulo: string; nombre: string };

export function Topbar({ titulo, nombre }: TopbarProps) {
  const navigate = useNavigate();

  // [multitenant-slug] El nombre sale del gimnasio de la URL, que ya resolvio
  // TenantProvider: no hace falta pedirlo otra vez al api.
  const { gimnasio, ruta } = useTenant();

  function salir() {
    logout();
    navigate(ruta("/login"), { replace: true });
  }

  return (
    <header className="topbar">
      <div className="topbar-title">{titulo}</div>
      <div className="topbar-right">
        <span className="badge-g badge-confirmada" title="Gimnasio activo">
          <i className="bi bi-building me-1" aria-hidden />
          {gimnasio.nombre}
        </span>
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
