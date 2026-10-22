import { utils } from "../../lib/utils";
import { diasParaVencer, estadoSuscripcion } from "../../data/apiPlataforma";
import type { Gimnasio, PlanSoftware } from "../../types";

/* [plataforma] Pastillas que se repiten en el dashboard y en la lista de
   gimnasios. Reutilizan las clases .badge-* del resto de la app. */

export function BadgeEstadoGimnasio({ estado }: { estado: Gimnasio["estado"] }) {
  return estado === "ACTIVO" ? (
    <span className="badge-g badge-activo">Activo</span>
  ) : (
    <span className="badge-g badge-inactivo">Inactivo</span>
  );
}

export function BadgePlan({ plan, planes }: { plan: PlanSoftware["id_plan_software"]; planes: PlanSoftware[] }) {
  const nombre = planes.find((p) => p.id_plan_software === plan)?.nombre ?? plan;
  return <span className="badge-g badge-categoria badge-g--plain">{nombre}</span>;
}

/* Fecha de vencimiento + estado. Un gimnasio inactivo no muestra alerta: ya
   no esta usando la plataforma. */
export function Suscripcion({ gimnasio }: { gimnasio: Gimnasio }) {
  const fecha = <span className="plat-fecha">{utils.fecha(gimnasio.vence_suscripcion)}</span>;
  if (gimnasio.estado !== "ACTIVO") return fecha;

  const dias = diasParaVencer(gimnasio);
  switch (estadoSuscripcion(gimnasio)) {
    case "VENCIDA":
      return (
        <span className="plat-suscripcion">
          {fecha}
          <span className="badge-g badge-vencida">
            Vencida hace {-dias} {-dias === 1 ? "día" : "días"}
          </span>
        </span>
      );
    case "POR_VENCER":
      return (
        <span className="plat-suscripcion">
          {fecha}
          <span className="badge-g badge-pendiente">
            {dias === 0 ? "Vence hoy" : `Vence en ${dias} ${dias === 1 ? "día" : "días"}`}
          </span>
        </span>
      );
    default:
      return (
        <span className="plat-suscripcion">
          {fecha}
          <span className="badge-g badge-activo">Al día</span>
        </span>
      );
  }
}
