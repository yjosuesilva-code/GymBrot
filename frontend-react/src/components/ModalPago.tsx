import { useState } from "react";
import { Modal } from "react-bootstrap";
import type { Cliente, Membresia, Pago, PlanMembresia } from "../types";
import { utils } from "../lib/utils";
import type { NuevoPago } from "../data/api";

const METODOS: Pago["metodo_pago"][] = ["EFECTIVO", "TRANSFERENCIA", "TARJETA", "NEQUI"];
const MODALIDADES: Membresia["modalidad_pago"][] = ["MENSUAL", "SEMESTRAL", "ANUAL"];

function precioDe(plan: PlanMembresia, modalidad: Membresia["modalidad_pago"]): number {
  if (modalidad === "SEMESTRAL") return plan.precio_semestral;
  if (modalidad === "ANUAL") return plan.precio_anual;
  return plan.precio_mensual;
}

export interface ModalPagoProps {
  show: boolean;
  planes: PlanMembresia[];
  clientes: Cliente[];
  membresias: Membresia[];
  bloqueado: boolean;
  alCerrar: () => void;
  alGuardar: (p: NuevoPago) => void;
  planInicial?: number | null;
  clienteInicial?: string | null;
}

export function ModalPago({
  show,
  planes,
  clientes,
  membresias,
  bloqueado,
  alCerrar,
  alGuardar,
  planInicial = null,
  clienteInicial = null,
}: ModalPagoProps) {
  const [busqueda, setBusqueda] = useState("");
  const [idCliente, setIdCliente] = useState("");
  const [idPlan, setIdPlan] = useState<number | null>(null);
  const [modalidad, setModalidad] = useState<Membresia["modalidad_pago"]>("MENSUAL");
  const [montoEditado, setMontoEditado] = useState<string | null>(null);
  const [metodo, setMetodo] = useState<Pago["metodo_pago"] | "">("");
  const [referencia, setReferencia] = useState("");

  const hoy = utils.isoDate();

  // Initialize with props when the modal opens (adjust state during render)
  const [showAnterior, setShowAnterior] = useState(show);
  if (show !== showAnterior) {
    setShowAnterior(show);
    if (show) {
      setIdCliente(clienteInicial || "");
      setIdPlan(planInicial || null);
      setModalidad("MENSUAL");
      if (clienteInicial) {
        const actual = membresias.find(
          (m) => m.id_cliente === clienteInicial && m.estado === "ACTIVA" && m.fecha_vencimiento >= hoy,
        );
        if (actual) {
          setIdPlan(actual.id_plan);
          setModalidad(actual.modalidad_pago);
        }
      }
      setMontoEditado(null);
      setBusqueda("");
    }
  }

  // Membresia vigente del cliente elegido
  const vigente =
    membresias.find(
      (m) => m.id_cliente === idCliente && m.estado === "ACTIVA" && m.fecha_vencimiento >= hoy,
    ) ?? null;
  const tieneVigente = vigente !== null;

  const plan = planes.find((p) => p.id_plan === idPlan) ?? null;

  const monto = montoEditado ?? (plan ? String(precioDe(plan, modalidad)) : "");
  const precioLista = plan ? precioDe(plan, modalidad) : 0;
  const montoDistinto = plan !== null && Number(monto) !== precioLista;

  function elegirCliente(id: string): void {
    setIdCliente(id);
    setMontoEditado(null);
    const actual = membresias.find(
      (m) => m.id_cliente === id && m.estado === "ACTIVA" && m.fecha_vencimiento >= hoy,
    );
    if (actual) {
      setIdPlan(actual.id_plan);
      setModalidad(actual.modalidad_pago);
    } else {
      setIdPlan(null);
      setModalidad("MENSUAL");
    }
  }

  const texto = busqueda.trim().toLowerCase();
  const candidatos = clientes
    .filter((c) => c.estado === "ACTIVO")
    .filter((c) => !texto || (c.nombre + " " + c.apellidos + " " + c.numero_identificacion).toLowerCase().includes(texto))
    .slice(0, 8);

  return (
    <Modal show={show} onHide={alCerrar} centered size="lg">
      <Modal.Header closeButton>
        <Modal.Title>Registrar pago</Modal.Title>
      </Modal.Header>
      <Modal.Body>
        <label className="form-label-g">Cliente</label>
        <input
          className="form-control-dark"
          style={{ marginBottom: 8 }}
          placeholder="Buscar por nombre o identificación"
          value={busqueda}
          onChange={(e) => setBusqueda(e.target.value)}
        />
        <div className="table-wrap" style={{ maxHeight: 180, overflowY: "auto", marginBottom: 16 }}>
          <table className="table-g">
            <tbody>
              {candidatos.map((c) => (
                <tr
                  key={c.numero_identificacion}
                  onClick={() => elegirCliente(c.numero_identificacion)}
                  style={{ cursor: "pointer", background: idCliente === c.numero_identificacion ? "rgba(198,255,0,.08)" : undefined }}
                >
                  <td>{c.nombre} {c.apellidos}</td>
                  <td style={{ color: "var(--muted)" }}>{c.numero_identificacion}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {tieneVigente && vigente && (
          <div className="alert-g alert-ok show" style={{ marginBottom: 16 }}>
            <strong>Renovacion de membresia vigente.</strong> {vigente.tipo_membresia} ·{" "}
            {vigente.modalidad_pago} ·{" "}
            {utils.money(plan ? precioDe(plan, vigente.modalidad_pago) : vigente.valor)} · vence
            el {utils.fecha(vigente.fecha_vencimiento)}.
            <br />
            Plan y modalidad estan bloqueados. Para cambiar alguno, cancela primero la membresia
            vigente en el apartado de Clientes.
          </div>
        )}

        <div className="row g-3">
          <div className="col-md-7">
            <label className="form-label-g">Plan</label>
            <select
              className="form-control-dark"
              disabled={tieneVigente}
              value={idPlan ?? ""}
              onChange={(e) => {
                setIdPlan(e.target.value ? Number(e.target.value) : null);
                setMontoEditado(null);
              }}
            >
              <option value="">Selecciona un plan</option>
              {planes.map((p) => (
                <option key={p.id_plan} value={p.id_plan}>{p.nombre}</option>
              ))}
            </select>
          </div>
          <div className="col-md-5">
            <label className="form-label-g">Modalidad</label>
            <select
              className="form-control-dark"
              disabled={tieneVigente}
              value={modalidad}
              onChange={(e) => {
                setModalidad(e.target.value as Membresia["modalidad_pago"]);
                setMontoEditado(null);
              }}
            >
              {MODALIDADES.map((m) => (
                <option key={m} value={m}>{m}</option>
              ))}
            </select>
          </div>
          <div className="col-md-6">
            <label className="form-label-g">Monto</label>
            <input
              className="form-control-dark"
              type="number"
              min={1}
              value={monto}
              onChange={(e) => setMontoEditado(e.target.value)}
            />
            {montoDistinto && (
              <span className="card-sub" style={{ display: "block", marginTop: 4 }}>
                Precio de lista {utils.money(precioLista)}. Editable por descuento o pago parcial.
              </span>
            )}
          </div>
          <div className="col-md-6">
            <label className="form-label-g">Metodo de pago</label>
            <select className="form-control-dark" value={metodo} onChange={(e) => setMetodo(e.target.value as Pago["metodo_pago"])}>
              <option value="">Selecciona</option>
              {METODOS.map((m) => (
                <option key={m} value={m}>{m}</option>
              ))}
            </select>
          </div>
          <div className="col-md-12">
            <label className="form-label-g">Referencia de transaccion</label>
            <input
              className="form-control-dark"
              placeholder="Opcional, pero evita cobros duplicados si la escribes"
              value={referencia}
              onChange={(e) => setReferencia(e.target.value)}
            />
          </div>
        </div>
      </Modal.Body>
      <Modal.Footer>
        <button className="btn-dark" onClick={alCerrar} disabled={bloqueado}>Cancelar</button>
        <button
          className="btn-neon"
          disabled={bloqueado || !idCliente || !plan || !metodo}
          style={{ opacity: bloqueado || !idCliente || !plan || !metodo ? .5 : 1 }}
          onClick={() =>
            alGuardar({
              id_cliente: idCliente,
              id_plan: idPlan,
              modalidad_pago: modalidad,
              valor: Number(monto),
              metodo_pago: metodo,
              fecha_pago: utils.isoDate(),
              referencia_transaccion: referencia,
              observaciones: "",
            })
          }
        >
          Procesar
        </button>
      </Modal.Footer>
    </Modal>
  );
}
