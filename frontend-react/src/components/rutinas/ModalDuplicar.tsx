import { useState } from "react";
import { Modal } from "react-bootstrap";
import type { Cliente } from "../../types";
import { BuscadorCliente } from "./BuscadorCliente";

/* [P3] Modal pequeño para duplicar una rutina a otro cliente: mismo autocompletado del
   constructor con los candidatos (ACTIVOS sin rutina vigente). No llama a la API. */
type Props = {
  show: boolean;
  nombreRutina: string;
  candidatos: Cliente[];
  guardando: boolean;
  error: string;
  onConfirmar: (idCliente: string) => void;
  onCerrar: () => void;
};

export function ModalDuplicar({ show, nombreRutina, candidatos, guardando, error, onConfirmar, onCerrar }: Props) {
  const [cliente, setCliente] = useState<Cliente | null>(null);

  function cerrar() {
    setCliente(null);
    onCerrar();
  }

  return (
    <Modal show={show} onHide={cerrar} centered>
      <Modal.Header closeButton>
        <Modal.Title>Duplicar rutina</Modal.Title>
      </Modal.Header>
      <Modal.Body>
        {error && <div className="alert-g alert-error show">{error}</div>}
        <p className="card-sub">
          Se copia «{nombreRutina}» con sus sesiones y ejercicios, empezando hoy y con la misma duración.
        </p>
        <label className="form-label-g">Cliente destino</label>
        <BuscadorCliente clientes={candidatos} seleccionado={cliente} onSeleccionar={setCliente} autoFocus />
        <div className="card-sub mt-1">Solo clientes activos sin rutina vigente.</div>
      </Modal.Body>
      <Modal.Footer>
        <button type="button" className="btn-dark" onClick={cerrar}>Cancelar</button>
        <button
          type="button"
          className="btn-neon"
          disabled={!cliente || guardando}
          onClick={() => cliente && onConfirmar(cliente.numero_identificacion)}
        >
          <i className="bi bi-copy me-1" aria-hidden />
          {guardando ? "Duplicando…" : "Duplicar"}
        </button>
      </Modal.Footer>
    </Modal>
  );
}
