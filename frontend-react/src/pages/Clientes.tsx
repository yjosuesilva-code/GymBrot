import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Modal } from "react-bootstrap";
import { api } from "../data/api";
import { utils } from "../lib/utils";
import type { Cliente, ClienteNuevo, Usuario } from "../types";

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
  const [usuarios, setUsuarios] = useState<Usuario[]>([]);
  const [clave, setClave] = useState("");
  const [confirmar, setConfirmar] = useState("");
  const [verClave, setVerClave] = useState(false);

  const navigate = useNavigate();

  useEffect(() => {
    Promise.all([api.clientes.list(), api.usuarios.list()]).then(([cs, us]) => {
      setClientes(cs);
      setUsuarios(us);
      setCargando(false);
    });
  }, []);

  const filtrados = clientes.filter((c) => {
    const texto = (c.nombre + " " + c.apellidos + " " + c.numero_identificacion + " " + c.correo).toLowerCase();
    return texto.includes(filtro.toLowerCase());
  });
  const conCodigo = new Set(
    usuarios.filter((u) => u.contrasena).map((u) => u.numero_identificacion)
  );
  const tieneCodigo = editandoId !== null && conCodigo.has(editandoId);
  const primeraVez = !tieneCodigo;
  const setCampo = (campo: keyof FormCliente, valor: string) =>
    setForm((f) => ({ ...f, [campo]: valor }));

  function abrirNuevo() {
    setEditandoId(null);
    setForm(VACIO);
    setError("");
    setClave("");
    setConfirmar("");
    setVerClave(false);
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
    setClave("");
    setConfirmar("");
    setVerClave(false);
    setError("");
    setShow(true);
  }

  async function guardar() {
    if (!form.numero_identificacion || !form.nombre || !form.apellidos) {
      setError("La identificación, el nombre y los apellidos son obligatorios");
      return;
    }

    const sinCodigo = !tieneCodigo;
    if (sinCodigo && !clave.trim()) {
      setError(
        "El código de acceso es obligatorio: es lo que Control de acceso valida en el modo manual",
      );
      return;
    }
    if (sinCodigo && clave.trim() !== confirmar.trim()) {
      setError("Los códigos no coinciden");
      return;
    }

    const res = editandoId
      ? await api.clientes.update(editandoId, form as Partial<ClienteNuevo>)
      : await api.clientes.create(form as ClienteNuevo);
    if (!res.ok) {
      setError(res.mensaje);
      return;
    }

    if (clave.trim()) {
      const id = editandoId ?? form.numero_identificacion;
      const rc = await api.usuarios.asignar(id, clave.trim());
      if (!rc.ok) {
        setError(rc.mensaje);
        return;
      }
    }

    setShow(false);
    setClientes(await api.clientes.list());
    setUsuarios(await api.usuarios.list());
  }

  async function cambiarEstado(c: Cliente) {
    const nuevo = c.estado === "ACTIVO" ? "INACTIVO" : "ACTIVO";
    await api.clientes.setEstado(c.numero_identificacion, nuevo);
    setClientes(await api.clientes.list());
    setUsuarios(await api.usuarios.list());
  }

  return (
    <div className="card-g">
      <div className="card-head">
        <div>
          <h2 className="card-title">Clientes</h2>
          <p className="card-sub">
            Gestiona los clientes del gimnasio y el código de acceso con el que
            Control de acceso valida su entrada manual.
          </p>{" "}
        </div>
        <button className="btn-neon" onClick={abrirNuevo}>
          + Nuevo cliente
        </button>
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
              <th>Cliente</th>
              <th>Identificación</th>
              <th>Teléfono</th>
              <th>Edad</th>
              <th>Código de acceso</th>
              <th>Estado</th>
              <th>Acciones</th>
            </tr>
          </thead>
          <tbody>
            {cargando ? (
              <tr>
                <td colSpan={7} className="loader">
                  <span className="spinner-g"></span>Cargando...
                </td>
              </tr>
            ) : filtrados.length === 0 ? (
              <tr>
                <td colSpan={7} className="empty-state">
                  No hay clientes
                </td>
              </tr>
            ) : (
              filtrados.map((c) => {
                const edad = utils.edad(c.fecha_nacimiento);
                return (
                  <tr key={c.numero_identificacion}>
                    <td>
                      <div className="person">
                        <div className="person-avatar">
                          {utils.iniciales(c.nombre, c.apellidos)}
                        </div>
                        <div>
                          <div className="person-name">
                            {c.nombre} {c.apellidos}
                          </div>
                          <div className="person-sub">{c.correo}</div>
                        </div>
                      </div>
                    </td>
                    <td>
                      {c.tipo_identificacion} {c.numero_identificacion}
                    </td>
                    <td>{c.telefono}</td>
                    <td>{edad != null ? edad + " años" : "—"}</td>
                    <td>
                      {conCodigo.has(c.numero_identificacion) ? (
                        <span className="badge-g badge-activo">Tiene</span>
                      ) : (
                        <span className="badge-g badge-pendiente">
                          Sin código
                        </span>
                      )}
                    </td>
                    <td>
                      <span className={"badge-g " + utils.badgeClass(c.estado)}>
                        {c.estado}
                      </span>
                    </td>
                    <td>
                      <div className="cell-actions">
                        <button
                          className="btn-icon"
                          title="Ver detalle"
                          onClick={() =>
                            navigate("/clientes/" + c.numero_identificacion)
                          }
                        >
                          👁
                        </button>
                        <button
                          className="btn-icon"
                          title="Editar"
                          onClick={() => abrirEdicion(c)}
                        >
                          ✏️
                        </button>
                        <button
                          className="btn-icon"
                          title={
                            c.estado === "ACTIVO" ? "Desactivar" : "Activar"
                          }
                          onClick={() => cambiarEstado(c)}
                        >
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
          <Modal.Title>
            {editandoId ? "Editar cliente" : "Nuevo cliente"}
          </Modal.Title>
        </Modal.Header>
        <Modal.Body>
          {error && <div className="alert-g alert-error show">{error}</div>}
          <div className="row g-3">
            <div className="col-md-6">
              <label className="form-label-g">Tipo</label>
              <select
                className="form-control-dark"
                value={form.tipo_identificacion}
                onChange={(e) =>
                  setCampo("tipo_identificacion", e.target.value)
                }
              >
                <option value="CC">CC</option>
                <option value="TI">TI</option>
                <option value="CE">CE</option>
                <option value="PP">PP</option>
              </select>
            </div>
            <div className="col-md-6">
              <label className="form-label-g">Número de identificación</label>
              <input
                className="form-control-dark"
                value={form.numero_identificacion}
                disabled={editandoId !== null}
                onChange={(e) =>
                  setCampo("numero_identificacion", e.target.value)
                }
              />
            </div>
            <div className="col-md-6">
              <label className="form-label-g">Nombre</label>
              <input
                className="form-control-dark"
                value={form.nombre}
                onChange={(e) => setCampo("nombre", e.target.value)}
              />
            </div>
            <div className="col-md-6">
              <label className="form-label-g">Apellidos</label>
              <input
                className="form-control-dark"
                value={form.apellidos}
                onChange={(e) => setCampo("apellidos", e.target.value)}
              />
            </div>
            <div className="col-md-6">
              <label className="form-label-g">Teléfono</label>
              <input
                className="form-control-dark"
                value={form.telefono}
                onChange={(e) => setCampo("telefono", e.target.value)}
              />
            </div>
            <div className="col-md-6">
              <label className="form-label-g">Correo</label>
              <input
                className="form-control-dark"
                type="email"
                value={form.correo}
                onChange={(e) => setCampo("correo", e.target.value)}
              />
            </div>
            <div className="col-md-6">
              <label className="form-label-g">Dirección</label>
              <input
                className="form-control-dark"
                value={form.direccion}
                onChange={(e) => setCampo("direccion", e.target.value)}
              />
            </div>
            <div className="col-md-6">
              <label className="form-label-g">Fecha de nacimiento</label>
              <input
                className="form-control-dark"
                type="date"
                value={form.fecha_nacimiento}
                onChange={(e) => setCampo("fecha_nacimiento", e.target.value)}
              />
            </div>
            <div className={primeraVez ? "col-md-6" : "col-md-8"}>
              <label className="form-label-g" htmlFor="clave-acceso">
                Código de acceso
              </label>
              <div style={{ display: "flex", gap: 8 }}>
                <input
                  id="clave-acceso"
                  className="form-control-dark"
                  type={verClave ? "text" : "password"}
                  autoComplete="new-password"
                  value={clave}
                  onChange={(e) => setClave(e.target.value)}
                  placeholder={
                    tieneCodigo ? "Déjalo vacío para no cambiarlo" : ""
                  }
                />
                <button
                  type="button"
                  className="btn-dark"
                  onClick={() => setVerClave((v) => !v)}
                >
                  {verClave ? "Ocultar" : "Mostrar"}
                </button>
              </div>
              <p className="card-sub" style={{ marginTop: 6 }}>
                {tieneCodigo
                  ? "Código ya asignado. Déjalo vacío para no cambiarlo."
                  : "Sin código. El modo manual de Control de acceso lo rechazará hasta que asignes uno."}
              </p>
            </div>

            {primeraVez && (
              <div className="col-md-6">
                <label className="form-label-g" htmlFor="clave-acceso-ok">
                  Repite el código
                </label>
                <input
                  id="clave-acceso-ok"
                  className="form-control-dark"
                  type={verClave ? "text" : "password"}
                  autoComplete="new-password"
                  value={confirmar}
                  onChange={(e) => setConfirmar(e.target.value)}
                />
              </div>
            )}
          </div>
        </Modal.Body>
        <Modal.Footer>
          <button className="btn-dark" onClick={() => setShow(false)}>
            Cancelar
          </button>
          <button className="btn-neon" onClick={guardar}>
            Guardar
          </button>
        </Modal.Footer>
      </Modal>
    </div>
  );
}