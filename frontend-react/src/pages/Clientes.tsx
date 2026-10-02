import { useEffect, useState } from "react";
import { Modal } from "react-bootstrap";
import { api } from "../data/api";
import { utils } from "../lib/utils";
import type { Cliente } from "../types";

type FormCliente = {
  tipo_identificacion: string;
  numero_identificacion: string;
  nombre: string;
  apellidos: string;
  telefono: string;
  correo: string;
  direccion: string;
  fecha_nacimiento: string;
};

const VACIO: FormCliente = {
  tipo_identificacion: "CC",
  numero_identificacion: "",
  nombre: "",
  apellidos: "",
  telefono: "",
  correo: "",
  direccion: "",
  fecha_nacimiento: "",
};

export function Clientes() {
  const [clientes, setClientes] = useState<Cliente[]>([]);
  const [cargando, setCargando] = useState(true);
  const [filtro, setFiltro] = useState("");

  const [show, setShow] = useState(false);
  const [editandoId, setEditandoId] = useState<string | null>(null);
  const [form, setForm] = useState<FormCliente>(VACIO);
  const [error, setError] = useState("");

  useEffect(() => {
    api.clientes.list().then((data) => {
      setClientes(data);
      setCargando(false);
    });
  }, []);

  const filtrados = clientes.filter((c) => {
    const texto = (c.nombre + " " + c.apellidos + " " + c.numero_identificacion + " " + c.correo).toLowerCase();
    return texto.includes(filtro.toLowerCase());
  });

  const setCampo = (campo: keyof FormCliente, valor: string) =>
    setForm((f) => ({ ...f, [campo]: valor }));

  function abrirNuevo() {
    setEditandoId(null);
    setForm(VACIO);
    setError("");
    setShow(true);
  }

  function abrirEdicion(c: Cliente) {
    setEditandoId(c.numero_identificacion);
    setForm({
      tipo_identificacion: c.tipo_identificacion,
      numero_identificacion: c.numero_identificacion,
      nombre: c.nombre,
      apellidos: c.apellidos,
      telefono: c.telefono,
      correo: c.correo,
      direccion: c.direccion,
      fecha_nacimiento: c.fecha_nacimiento,
    });
    setError("");
    setShow(true);
  }

  async function guardar() {
    if (!form.numero_identificacion || !form.nombre || !form.apellidos) {
      setError("La identificación, el nombre y los apellidos son obligatorios");
      return;
    }
    const res = editandoId
      ? await api.clientes.update(editandoId, form as Partial<Cliente>)
      : await api.clientes.create(form as Omit<Cliente, "estado" | "fecha_registro">);
    if (!res.ok) {
      setError(res.mensaje);
      return;
    }
    setShow(false);
    setClientes(await api.clientes.list());
  }

  async function cambiarEstado(c: Cliente) {
    const nuevo = c.estado === "ACTIVO" ? "INACTIVO" : "ACTIVO";
    await api.clientes.setEstado(c.numero_identificacion, nuevo);
    setClientes(await api.clientes.list());
  }

  return (
    <div className="card-g">
      <div className="card-head">
        <div>
          <h2 className="card-title">Clientes</h2>
          <p className="card-sub">Gestiona los miembros del gimnasio</p>
        </div>
        <button className="btn-neon" onClick={abrirNuevo}>+ Nuevo cliente</button>
      </div>

      <div className="toolbar" style={{ marginBottom: 20 }}>
        <div className="search-box">
          <span className="search-ico">🔍</span>
          <input
            type="text"
            className="form-control-dark"
            placeholder="Buscar por nombre, identificación o correo..."
            value={filtro}
            onChange={(e) => setFiltro(e.target.value)}
          />
        </div>
      </div>

      <div className="table-wrap">
        <table className="table-g">
          <thead>
            <tr>
              <th>Cliente</th><th>Identificación</th><th>Teléfono</th><th>Edad</th><th>Estado</th><th>Acciones</th>
            </tr>
          </thead>
          <tbody>
            {cargando ? (
              <tr><td colSpan={6} className="loader"><span className="spinner-g"></span>Cargando...</td></tr>
            ) : filtrados.length === 0 ? (
              <tr><td colSpan={6} className="empty-state">No hay clientes</td></tr>
            ) : (
              filtrados.map((c) => {
                const edad = utils.edad(c.fecha_nacimiento);
                return (
                  <tr key={c.numero_identificacion}>
                    <td>
                      <div className="person">
                        <div className="person-avatar">{utils.iniciales(c.nombre, c.apellidos)}</div>
                        <div>
                          <div className="person-name">{c.nombre} {c.apellidos}</div>
                          <div className="person-sub">{c.correo}</div>
                        </div>
                      </div>
                    </td>
                    <td>{c.tipo_identificacion} {c.numero_identificacion}</td>
                    <td>{c.telefono}</td>
                    <td>{edad != null ? edad + " años" : "—"}</td>
                    <td><span className={"badge-g " + utils.badgeClass(c.estado)}>{c.estado}</span></td>
                    <td>
                      <div className="cell-actions">
                        <button className="btn-icon" title="Ver detalle">👁</button>
                        <button className="btn-icon" title="Editar" onClick={() => abrirEdicion(c)}>✏️</button>
                        <button className="btn-icon" title={c.estado === "ACTIVO" ? "Desactivar" : "Activar"} onClick={() => cambiarEstado(c)}>
                          {c.estado === "ACTIVO" ? "🚫" : "✅"}
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      <Modal show={show} onHide={() => setShow(false)} centered size="lg">
        <Modal.Header closeButton>
          <Modal.Title>{editandoId ? "Editar cliente" : "Nuevo cliente"}</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          {error && <div className="alert-g alert-error show">{error}</div>}
          <div className="row g-3">
            <div className="col-md-4">
              <label className="form-label-g">Tipo</label>
              <select className="form-control-dark" value={form.tipo_identificacion} onChange={(e) => setCampo("tipo_identificacion", e.target.value)}>
                <option value="CC">CC</option>
                <option value="TI">TI</option>
                <option value="CE">CE</option>
                <option value="PP">PP</option>
              </select>
            </div>
            <div className="col-md-8">
              <label className="form-label-g">Número de identificación</label>
              <input className="form-control-dark" value={form.numero_identificacion} disabled={editandoId !== null} onChange={(e) => setCampo("numero_identificacion", e.target.value)} />
            </div>
            <div className="col-md-6">
              <label className="form-label-g">Nombre</label>
              <input className="form-control-dark" value={form.nombre} onChange={(e) => setCampo("nombre", e.target.value)} />
            </div>
            <div className="col-md-6">
              <label className="form-label-g">Apellidos</label>
              <input className="form-control-dark" value={form.apellidos} onChange={(e) => setCampo("apellidos", e.target.value)} />
            </div>
            <div className="col-md-6">
              <label className="form-label-g">Teléfono</label>
              <input className="form-control-dark" value={form.telefono} onChange={(e) => setCampo("telefono", e.target.value)} />
            </div>
            <div className="col-md-6">
              <label className="form-label-g">Correo</label>
              <input className="form-control-dark" type="email" value={form.correo} onChange={(e) => setCampo("correo", e.target.value)} />
            </div>
            <div className="col-md-8">
              <label className="form-label-g">Dirección</label>
              <input className="form-control-dark" value={form.direccion} onChange={(e) => setCampo("direccion", e.target.value)} />
            </div>
            <div className="col-md-4">
              <label className="form-label-g">Fecha de nacimiento</label>
              <input className="form-control-dark" type="date" value={form.fecha_nacimiento} onChange={(e) => setCampo("fecha_nacimiento", e.target.value)} />
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