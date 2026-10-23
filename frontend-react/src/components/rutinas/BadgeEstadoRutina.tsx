import type { EstadoRutina } from "../../types";
import { ESTADO_RUTINA } from "../../lib/rutinas";

/* [P3] Badge del estado de una rutina. El ícono lo pone la clase badge-* de gymbrot.css.
   `detalle` agrega texto al lado (ej. "6 d"). */
type Props = { estado: EstadoRutina; detalle?: string };

export function BadgeEstadoRutina({ estado, detalle }: Props) {
  const info = ESTADO_RUTINA[estado];
  return (
    <span className={"badge-g " + info.clase}>
      {info.texto}
      {detalle ? " · " + detalle : ""}
    </span>
  );
}
