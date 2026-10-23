import { useState } from "react";
import { Modal } from "react-bootstrap";
import type { LetraSesion, RegistroNuevo } from "../../types";
import { utils } from "../../lib/utils";

/* [P3] Modal "Registrar sesión completada": la sesión sugerida ya viene marcada (se puede
   cambiar), la fecha de hoy y notas. No llama a la API: devuelve el RegistroNuevo.
   Quien lo usa le pone key para que el estado se reinicie cada vez que se abre. */
type Props = {
  show: boolean;
  division: LetraSesion[];
  sugerida: LetraSesion | null;
  fechaMinima: string;            // inicio de la rutina
  guardando: boolean;
  error: string;
  onConfirmar: (registro: RegistroNuevo) => void;
  onCerrar: () => void;
};

export function ModalRegistrarSesion({ show, division, sugerida, fechaMinima, guardando, error, onConfirmar, onCerrar }: Props) {
  const hoy = utils.isoDate();
  const [sesion, setSesion] = useState<LetraSesion>(sugerida ?? division[0] ?? "A");
  const [fecha, setFecha] = useState(hoy);
  const [notas, setNotas] = useState("");

  return (
    <Modal show={show} onHide={onCerrar} centered>
      <Modal.Header closeButton>
        <Modal.Title>Registrar sesión completada</Modal.Title>
      </Modal.Header>
      <Modal.Body>
        {error && <div className="alert-g alert-error show">{error}</div>}
        <label className="form-label-g">Sesión</label>
        <div className="inst-seg mb-3" role="group" aria-label="Sesión">
          {division.map((l) => (
            <button key={l} type="button" className={sesion === l ? "activo" : ""} onClick={() => setSesion(l)}>
              {l}
              {l === sugerida && <span className="inst-sugerida">sugerida</span>}
            </button>
          ))}
        </div>
        <label className="form-label-g">Fecha</label>
        <input className="form-control-dark mb-3" type="date" min={fechaMinima} max={hoy} value={fecha} onChange={(e) => setFecha(e.target.value)} />
        <label className="form-label-g">Notas</label>
        <textarea className="form-control-dark" rows={2} placeholder="Opcional" value={notas} onChange={(e) => setNotas(e.target.value)} />
      </Modal.Body>
      <Modal.Footer>
        <button type="button" className="btn-dark" onClick={onCerrar}>Cancelar</button>
        <button type="button" className="btn-neon" disabled={guardando} onClick={() => onConfirmar({ sesion, fecha, notas })}>
          <i className="bi bi-check2-circle me-1" aria-hidden />
          {guardando ? "Guardando…" : "Registrar"}
        </button>
      </Modal.Footer>
    </Modal>
  );
}
