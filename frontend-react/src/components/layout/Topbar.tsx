import { useTenant } from "../../tenant/TenantContext";
import { current } from "../../lib/auth";

type TopbarProps = { titulo: string; nombre: string };

export function Topbar({ titulo, nombre }: TopbarProps) {
  // [multitenant-slug] El nombre sale del gimnasio de la URL, que ya resolvio
  // TenantProvider: no hace falta pedirlo otra vez al api.
  const { gimnasio } = useTenant();
  const sesion = current();
  const rol = sesion?.tipo_usuario;

  return (
    <header className="topbar">
      <div className="topbar-title">{titulo}</div>
      <div className="topbar-right">
        {rol && (
          <span className="pill-doc" style={{ textTransform: "uppercase", letterSpacing: "0.08em" }}>
            {rol}
          </span>
        )}
        <span className="badge-g badge-confirmada badge-g--plain" title="Gimnasio activo">
          <i className="bi bi-building" aria-hidden />
          {gimnasio.nombre}
        </span>
        <span className="topbar-user">{nombre}</span>
        <div className="avatar">{(nombre.charAt(0) || "A").toUpperCase()}</div>
      </div>
    </header>
  );
}
