import { Modal } from "react-bootstrap";
import { horaFin } from "../../lib/clases";
import { utils } from "../../lib/utils";
import { PersonaCliente } from "../rutinas/PersonaCliente";
import type { Cliente, SesionClase } from "../../types";

/* [P3] B7 · KAN-94 — Una sesión concreta: quiénes están inscritos y botón para cancelarla.
   No llama a la API: recibe los inscritos ya cargados y avisa con onCancelarSesion. */
type Props = {
  sesion: SesionClase | null;
  inscritos: Cliente[] | null;        // null = cargando
  guardando: boolean;
  error: string;
  onCancelarSesion: () => void;
  onCerrar: () => void;
};

export function ModalSesion({ sesion, inscritos, guardando, error, onCancelarSesion, onCerrar }: Props) {
  return (
    <Modal show={sesion !== null} onHide={onCerrar} centered>
      <Modal.Header closeButton>
        <Modal.Title>{sesion?.clase.nombre}</Modal.Title>
      </Modal.Header>
      <Modal.Body>
        {error && <div className="alert-g alert-error show">{error}</div>}
        {sesion && (
          <p className="card-sub">
            {utils.fecha(sesion.fecha)} · {sesion.clase.hora}–{horaFin(sesion.clase)} · {sesion.inscritos} de {sesion.clase.aforo_max} cupos ocupados
          </p>
        )}
        {sesion?.cancelada && <div className="alert-g show inst-alerta-info">Esta sesión está cancelada.</div>}
        {inscritos === null ? (
          <p className="card-sub">Cargando inscritos…</p>
        ) : inscritos.length === 0 ? (
          <p className="inst-auto-vacio">Todavía nadie se inscribió.</p>
        ) : (
          <div className="inst-lista-inscritos">
            {inscritos.map((c) => <PersonaCliente key={c.numero_identificacion} cliente={c} />)}
          </div>
        )}
      </Modal.Body>
      <Modal.Footer>
        <button className="btn-dark" onClick={onCerrar}>Cerrar</button>
        {sesion && !sesion.cancelada && (
          <button className="btn-danger-g" disabled={guardando} onClick={onCancelarSesion}>
            <i className="bi bi-x-circle me-1" aria-hidden /> Cancelar esta sesión
          </button>
        )}
      </Modal.Footer>
    </Modal>
  );
}
