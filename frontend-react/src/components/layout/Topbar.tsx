import { useTenant } from "../../tenant/TenantContext";
import { current } from "../../lib/auth";
import { BotonMenu } from "./BotonMenu";
import type { MenuMovil } from "./useMenuMovil";

type TopbarProps = { titulo: string; nombre: string; menu: MenuMovil };

export function Topbar({ titulo, nombre, menu }: TopbarProps) {
  // [multitenant-slug] El nombre sale del gimnasio de la URL, que ya resolvio
  // TenantProvider: no hace falta pedirlo otra vez al api.
  const { gimnasio } = useTenant();
  const sesion = current();
  const rol = sesion?.tipo_usuario;

  return (
    <header className="topbar">
      <BotonMenu menu={menu} />
      <div className="topbar-title">{titulo}</div>
      <div className="topbar-right">
        {rol && (
          <span className="pill-doc topbar-rol" style={{ textTransform: "uppercase", letterSpacing: "0.08em" }}>
            {rol}
          </span>
        )}
        <span className="badge-g badge-confirmada badge-g--plain topbar-gym" title="Gimnasio activo">
          <i className="bi bi-building" aria-hidden />
          {/* En su propio span para poder recortarlo con "…" en movil. */}
          <span>{gimnasio.nombre}</span>
        </span>
        <span className="topbar-user">{nombre}</span>
        <div className="avatar">{(nombre.charAt(0) || "A").toUpperCase()}</div>
      </div>
    </header>
  );
}
