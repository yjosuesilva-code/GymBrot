import { useEffect, useState } from "react";
import { Modal } from "react-bootstrap";
import { api } from "../data/api";
import { utils } from "../lib/utils";
import type { Cliente, Instructor, Cita } from "../types";

type FormCita = {
  id_cliente: string;
  id_instructor: string;
  fecha: string;
  hora: string;
  notas: string;
};

const VACIO: FormCita = { id_cliente: "", id_instructor: "", fecha: "", hora: "", notas: "" };

export function Citas() {
  const [citas, setCitas] = useState<Cita[]>([]);
  const [clientes, setClientes] = useState<Cliente[]>([]);
  const [instructores, setInstructores] = useState<Instructor[]>([]);
  const [cargando, setCargando] = useState(true);
  const [show, setShow] = useState(false);
  const [editandoId, setEditandoId] = useState<number | null>(null);
  const [form, setForm] = useState<FormCita>(VACIO);
  const [error, setError] = useState("");

  useEffect(() => {
    Promise.all([api.citas.list(), api.clientes.list(), api.instructores.list()]).then(
      ([ci, cl, ins]) => {
        setCitas(ci);
        setClientes(cl);
        setInstructores(ins);
        setCargando(false);
      }
    );
  }, []);

  const setCampo = (campo: keyof FormCita, valor: string) =>
    setForm((f) => ({ ...f, [campo]: valor }));

  const nombreCliente = (id: string) => {
    const c = clientes.find((x) => x.numero_identificacion === id);
    return c ? c.nombre + " " + c.apellidos : id;
  };
  const nombreInstructor = (id: string) => {
    const i = instructores.find((x) => x.numero_identificacion === id);
    return i ? i.nombre + " " + i.apellidos : id;
  };

  function abrirNuevo() {
    setEditandoId(null);
    setForm({ ...VACIO, fecha: utils.isoDate() });
    setError("");
    setShow(true);
  }

  function abrirEdicion(c: Cita) {
    setEditandoId(c.id_cita);
    setForm({
      id_cliente: c.id_cliente,
      id_instructor: c.id_instructor,
      fecha: c.fecha,
      hora: c.hora,
      notas: c.notas,
    });
    setError("");
    setShow(true);
  }

  async function guardar() {
    if (!form.id_cliente || !form.id_instructor || !form.fecha || !form.hora) {
      setError("Cliente, instructor, fecha y hora son obligatorios");
      return;
    }
    const res = editandoId
      ? await api.citas.update(editandoId, form)
      : await api.citas.create(form);
    if (!res.ok) {
      setError(res.mensaje);
      return;
    }
    setShow(false);
    setCitas(await api.citas.list());
  }

  async function cambiarEstado(c: Cita, estado: Cita["estado"]) {
    await api.citas.setEstado(c.id_cita, estado);
    setCitas(await api.citas.list());
  }

  return (
    <div className="card-g">
      <div className="card-head">
        <div>
          <h2 className="card-title">Citas</h2>
          <p className="card-sub">Agenda de clientes con instructores</p>
        </div>
        <button className="btn-neon" onClick={abrirNuevo}>+ Nueva cita</button>
      </div>

      <div className="table-wrap">
        <table className="table-g">
          <thead>
            <tr><th>Cliente</th><th>Instructor</th><th>Fecha</th><th>Hora</th><th>Estado</th><th>Acciones</th></tr>
          </thead>
          <tbody>
            {cargando ? (
              <tr><td colSpan={6} className="loader"><span className="spinner-g"></span>Cargando...</td></tr>
            ) : citas.length === 0 ? (
              <tr><td colSpan={6} className="empty-state">No hay citas</td></tr>
            ) : (
              citas.map((c) => (
                <tr key={c.id_cita}>
                  <td>{nombreCliente(c.id_cliente)}</td>
                  <td>{nombreInstructor(c.id_instructor)}</td>
                  <td>{utils.fecha(c.fecha)}</td>
                  <td>{c.hora}</td>
                  <td><span className={"badge-g " + utils.badgeClass(c.estado)}>{c.estado}</span></td>
                  <td>
                    <div className="cell-actions">
                      <button className="btn-icon" title="Editar" onClick={() => abrirEdicion(c)}>✏️</button>
                      <button className="btn-icon" title="Confirmar" onClick={() => cambiarEstado(c, "CONFIRMADA")}>✅</button>
                      <button className="btn-icon" title="Cancelar" onClick={() => cambiarEstado(c, "CANCELADA")}>🚫</button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      <Modal show={show} onHide={() => setShow(false)} centered>
        <Modal.Header closeButton>
          <Modal.Title>{editandoId ? "Editar cita" : "Nueva cita"}</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          {error && <div className="alert-g alert-error show">{error}</div>}
          <div className="row g-3">
            <div className="col-md-6">
              <label className="form-label-g">Cliente</label>
              <select className="form-control-dark" value={form.id_cliente} onChange={(e) => setCampo("id_cliente", e.target.value)}>
                <option value="">— Selecciona —</option>
                {clientes.map((c) => (
                  <option key={c.numero_identificacion} value={c.numero_identificacion}>{c.nombre} {c.apellidos}</option>
                ))}
              </select>
            </div>
            <div className="col-md-6">
              <label className="form-label-g">Instructor</label>
              <select className="form-control-dark" value={form.id_instructor} onChange={(e) => setCampo("id_instructor", e.target.value)}>
                <option value="">— Selecciona —</option>
                {instructores.map((i) => (
                  <option key={i.numero_identificacion} value={i.numero_identificacion}>{i.nombre} {i.apellidos}</option>
                ))}
              </select>
            </div>
            <div className="col-md-6">
              <label className="form-label-g">Fecha</label>
              <input type="date" className="form-control-dark" value={form.fecha} onChange={(e) => setCampo("fecha", e.target.value)} />
            </div>
            <div className="col-md-6">
              <label className="form-label-g">Hora</label>
              <input type="time" className="form-control-dark" value={form.hora} onChange={(e) => setCampo("hora", e.target.value)} />
            </div>
            <div className="col-12">
              <label className="form-label-g">Notas</label>
              <input className="form-control-dark" value={form.notas} onChange={(e) => setCampo("notas", e.target.value)} />
            </div>
          </div>
        </Modal.Body>
        <Modal.Footer>
          <button className="btn-dark" onClick={() => setShow(false)}>Cancelar</button>
          <button className="btn-neon" onClick={guardar}>Guardar</button>
        </Modal.Footer>
      </Modal>
    </div>
  );
}
