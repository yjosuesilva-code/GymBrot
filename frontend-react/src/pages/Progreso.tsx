import { useEffect, useState } from "react";
import { Modal } from "react-bootstrap";
import { api } from "../data/api";
import { utils } from "../lib/utils";
import type { Cliente, Progreso as ProgresoRow } from "../types";

type FormProgreso = {
  id_cliente: string;
  fecha: string;
  peso: string;
  altura: string;
  notas: string;
};

const VACIO: FormProgreso = { id_cliente: "", fecha: "", peso: "", altura: "", notas: "" };

export function Progreso() {
  const [progreso, setProgreso] = useState<ProgresoRow[]>([]);
  const [clientes, setClientes] = useState<Cliente[]>([]);
  const [cargando, setCargando] = useState(true);
  const [show, setShow] = useState(false);
  const [form, setForm] = useState<FormProgreso>(VACIO);
  const [error, setError] = useState("");

  useEffect(() => {
    Promise.all([api.progreso.list(), api.clientes.list()]).then(([p, c]) => {
      setProgreso(p);
      setClientes(c);
      setCargando(false);
    });
  }, []);

  const setCampo = (campo: keyof FormProgreso, valor: string) =>
    setForm((f) => ({ ...f, [campo]: valor }));

  const nombreCliente = (id: string) => {
    const c = clientes.find((x) => x.numero_identificacion === id);
    return c ? c.nombre + " " + c.apellidos : id;
  };

  function abrirNuevo() {
    setForm({ ...VACIO, fecha: utils.isoDate() });
    setError("");
    setShow(true);
  }

  async function guardar() {
    if (!form.id_cliente || !form.fecha || !form.peso || !form.altura) {
      setError("Cliente, fecha, peso y altura son obligatorios");
      return;
    }
    const res = await api.progreso.create({
      id_cliente: form.id_cliente,
      fecha: form.fecha,
      peso: Number(form.peso),
      altura: Number(form.altura),
      notas: form.notas,
    });
    if (!res.ok) {
      setError(res.mensaje);
      return;
    }
    setShow(false);
    setProgreso(await api.progreso.list());
  }

  return (
    <div className="card-g">
      <div className="card-head">
        <div>
          <h2 className="card-title">Progreso</h2>
          <p className="card-sub">Mediciones físicas de los miembros</p>
        </div>
        <button className="btn-neon" onClick={abrirNuevo}>+ Nueva medición</button>
      </div>

      <div className="table-wrap">
        <table className="table-g">
          <thead>
            <tr><th>Cliente</th><th>Fecha</th><th>Peso</th><th>Altura</th><th>IMC</th><th>Notas</th></tr>
          </thead>
          <tbody>
            {cargando ? (
              <tr><td colSpan={6} className="loader"><span className="spinner-g"></span>Cargando...</td></tr>
            ) : progreso.length === 0 ? (
              <tr><td colSpan={6} className="empty-state">Sin mediciones</td></tr>
            ) : (
              progreso.map((p) => (
                <tr key={p.id_progreso}>
                  <td>{nombreCliente(p.id_cliente)}</td>
                  <td>{utils.fecha(p.fecha)}</td>
                  <td>{p.peso} kg</td>
                  <td>{p.altura} m</td>
                  <td>{utils.imc(p.peso, p.altura) ?? "—"}</td>
                  <td>{p.notas || "—"}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      <Modal show={show} onHide={() => setShow(false)} centered>
        <Modal.Header closeButton>
          <Modal.Title>Nueva medición</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          {error && <div className="alert-g alert-error show">{error}</div>}
          <div className="row g-3">
            <div className="col-12">
              <label className="form-label-g">Cliente</label>
              <select className="form-control-dark" value={form.id_cliente} onChange={(e) => setCampo("id_cliente", e.target.value)}>
                <option value="">— Selecciona —</option>
                {clientes.map((c) => (
                  <option key={c.numero_identificacion} value={c.numero_identificacion}>
                    {c.nombre} {c.apellidos}
                  </option>
                ))}
              </select>
            </div>
            <div className="col-md-4">
              <label className="form-label-g">Fecha</label>
              <input type="date" className="form-control-dark" value={form.fecha} onChange={(e) => setCampo("fecha", e.target.value)} />
            </div>
            <div className="col-md-4">
              <label className="form-label-g">Peso (kg)</label>
              <input type="number" className="form-control-dark" value={form.peso} onChange={(e) => setCampo("peso", e.target.value)} />
            </div>
            <div className="col-md-4">
              <label className="form-label-g">Altura (m)</label>
              <input type="number" step="0.01" className="form-control-dark" value={form.altura} onChange={(e) => setCampo("altura", e.target.value)} />
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