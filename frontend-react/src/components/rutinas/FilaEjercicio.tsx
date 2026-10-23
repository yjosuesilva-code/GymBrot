import type { ReactNode } from "react";
import type { Ejercicio, RutinaEjercicio } from "../../types";
import { formatoPrescripcion } from "../../lib/rutinas";
import { VistaPreviaRecurso } from "../ejercicios/VistaPreviaRecurso";

/* [P3] Un ejercicio de una sesión en modo lectura:
   miniatura · nombre · grupo · "4 × 10–12 · 20 kg · 60 s" · notas.
   Si el cliente lo cambió y nadie lo ha revisado, muestra una marca.
   `acciones` (opcional) se pinta a la derecha, ej. el botón "Marcar revisado".
   Sirve para el admin, el instructor y la vista del cliente (T4). */
type Props = {
  fila: RutinaEjercicio;
  ejercicio: Ejercicio | undefined;
  acciones?: ReactNode;
};

export function FilaEjercicio({ fila, ejercicio, acciones }: Props) {
  const pendiente = fila.agregado_por_cliente === true && fila.revisado_por_instructor === false;
  return (
    <div className="inst-fila-ej">
      <span className="inst-orden">{fila.orden}</span>
      <VistaPreviaRecurso key={ejercicio?.recurso_url ?? ""} url={ejercicio?.recurso_url ?? ""} tamano="mini" alt={ejercicio?.nombre ?? ""} />
      <div className="inst-fila-ej-texto">
        <div className="person-name">
          {ejercicio?.nombre ?? "Ejercicio " + fila.id_ejercicio}
          {pendiente && (
            <span className="badge-g badge-pendiente ms-2" title="El cliente cambió o agregó este ejercicio">
              <i className="bi bi-person-exclamation" aria-hidden /> Cambio del cliente
            </span>
          )}
        </div>
        <div className="person-sub">{ejercicio?.grupo_muscular ?? "—"}</div>
        {fila.notas_instructor && (
          <div className="person-sub">
            <i className="bi bi-chat-left-text me-1" aria-hidden />
            {fila.notas_instructor}
          </div>
        )}
      </div>
      <div className="inst-presc">{formatoPrescripcion(fila)}</div>
      {acciones && <div className="inst-fila-ej-acciones">{acciones}</div>}
    </div>
  );
}
