import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Modal } from "react-bootstrap";
import { api } from "../data/api";
import { utils } from "../lib/utils";
import { Paginador } from "../components/Paginador";
import type { Instructor, Especialidad, EstadoInstructor, TipoIdentificacion } from "../types";

// El formulario tiene todos los campos del instructor menos el estado (ese se cambia con activar/desactivar)
type FormInstructor = Omit<Instructor, "estado">;

const TIPOS: TipoIdentificacion[] = ["CC", "CE", "PP", "TI"];

const ESPECIALIDADES: Especialidad[] = [
  "Entrenador personal",
  "Nutrición",
  "Fisioterapia",
  "Yoga/Pilates",
  "Cardio",
  "Musculación",
  "Funcional",
];

const VACIO: FormInstructor = {
  tipo_identificacion: "CC",
  numero_identificacion: "",
  nombre: "",
  apellidos: "",
  telefono: "",
  correo: "",
  especialidad: "Entrenador personal",
  disponibilidad: "",
  fecha_contratacion: "",
};

// Devuelve el primer error encontrado, o "" si el formulario está bien
function validar(f: FormInstructor, editando: boolean): string {
  const soloLetras = /^[A-Za-zÁÉÍÓÚÜÑáéíóúüñ ]{2,}$/;

  if (!f.numero_identificacion || !f.nombre || !f.apellidos || !f.telefono || !f.correo || !f.disponibilidad)
    return "Todos los campos son obligatorios";
  if ((f.tipo_identificacion === "CC" || f.tipo_identificacion === "TI") && !/^\d{6,10}$/.test(f.numero_identificacion))
    return "Para CC o TI la identificación debe tener de 6 a 10 dígitos";
  if (!/^[A-Za-z0-9]{5,12}$/.test(f.numero_identificacion))
    return "La identificación solo admite letras y números (5 a 12 caracteres)";
  if (!soloLetras.test(f.nombre) || !soloLetras.test(f.apellidos))
    return "El nombre y los apellidos solo admiten letras (mínimo 2)";
  if (!/^\d{7,10}$/.test(f.telefono))
    return "El teléfono debe tener de 7 a 10 dígitos";
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(f.correo))
    return "El correo no es válido";
  if (editando && !f.fecha_contratacion)
    return "La fecha de contratación es obligatoria";
  if (editando && f.fecha_contratacion > utils.isoDate())
    return "La fecha de contratación no puede ser futura";
  return "";
}

// Alerta de la parte superior: tipo define el color (alert-ok verde neón, alert-error rojo)
type Alerta = { tipo: "ok" | "error"; mensaje: string };

export function Instructores() {
  const navigate = useNavigate();
  const [instructores, setInstructores] = useState<Instructor[]>([]);
  const [cargando, setCargando] = useState(true);

  // Búsqueda y filtros ("" significa "todas" / "todos")
  const [busqueda, setBusqueda] = useState("");
  const [filtroEspecialidad, setFiltroEspecialidad] = useState<Especialidad | "">("");
  const [filtroEstado, setFiltroEstado] = useState<EstadoInstructor | "">("");

  // Paginación: 10 por página; al cambiar la búsqueda o un filtro se vuelve a la 1
  const POR_PAGINA = 10;
  const [pagina, setPagina] = useState(1);

  const [alerta, setAlerta] = useState<Alerta | null>(null);

  // Estado del modal: show lo abre/cierra; editandoId es null al crear y la cédula al editar
  const [show, setShow] = useState(false);
  const [editandoId, setEditandoId] = useState<string | null>(null);
  const [form, setForm] = useState<FormInstructor>(VACIO);
  const [error, setError] = useState("");
  const [guardando, setGuardando] = useState(false);

  // Modal de confirmación: showEliminar lo abre/cierra; aEliminar guarda a quién se va a borrar
  // (no se limpia al cerrar, para que el nombre no desaparezca durante la animación de salida)
  const [showEliminar, setShowEliminar] = useState(false);
  const [aEliminar, setAEliminar] = useState<Instructor | null>(null);
  const [errorEliminar, setErrorEliminar] = useState("");

  // Carga la lista una sola vez, cuando la vista aparece en pantalla
  useEffect(() => {
    api.instructores.list().then((data) => {
      setInstructores(data);
      setCargando(false);
    });
  }, []);

  // Cada vez que aparece una alerta, se programa que desaparezca a los 4 segundos.
  // La función que se devuelve (cleanup) cancela el temporizador si llega otra alerta antes.
  useEffect(() => {
    if (!alerta) return;
    const t = setTimeout(() => setAlerta(null), 4000);
    return () => clearTimeout(t);
  }, [alerta]);

  // Lista filtrada: se recalcula en cada render a partir de la lista completa y los filtros
  const texto = busqueda.trim().toLowerCase();
  const filtrados = instructores.filter((i) => {
    const datos = (i.nombre + " " + i.apellidos + " " + i.numero_identificacion + " " + i.correo + " " + i.especialidad).toLowerCase();
    return (
      datos.includes(texto) &&
      (filtroEspecialidad === "" || i.especialidad === filtroEspecialidad) &&
      (filtroEstado === "" || i.estado === filtroEstado)
    );
  });
  const hayFiltros = texto !== "" || filtroEspecialidad !== "" || filtroEstado !== "";

  // La página se recorta a un rango válido ("paginaSegura") cuando la lista
  // filtrada es más corta; así al buscar se vuelve solo al rango disponible.
  const totalPaginas = Math.max(1, Math.ceil(filtrados.length / POR_PAGINA));
  const paginaSegura = Math.min(pagina, totalPaginas);
  const paginada = filtrados.slice((paginaSegura - 1) * POR_PAGINA, paginaSegura * POR_PAGINA);

  function limpiarFiltros() {
    setBusqueda("");
    setFiltroEspecialidad("");
    setFiltroEstado("");
  }

  // Cambia un solo campo del formulario; K hace que el valor tenga el tipo correcto de ese campo
  function setCampo<K extends keyof FormInstructor>(campo: K, valor: FormInstructor[K]) {
    setForm((f) => ({ ...f, [campo]: valor }));
  }

  function abrirNuevo() {
    setEditandoId(null);
    setForm(VACIO);
    setError("");
    setShow(true);
  }

  function abrirEdicion(i: Instructor) {
    setEditandoId(i.numero_identificacion);
    setForm({
      tipo_identificacion: i.tipo_identificacion,
      numero_identificacion: i.numero_identificacion,
      nombre: i.nombre,
      apellidos: i.apellidos,
      telefono: i.telefono,
      correo: i.correo,
      especialidad: i.especialidad,
      disponibilidad: i.disponibilidad,
      fecha_contratacion: i.fecha_contratacion,
    });
    setError("");
    setShow(true);
  }

  async function guardar() {
    // Quita espacios al inicio y al final de los textos antes de validar
    const limpio: FormInstructor = {
      ...form,
      numero_identificacion: form.numero_identificacion.trim(),
      nombre: form.nombre.trim(),
      apellidos: form.apellidos.trim(),
      telefono: form.telefono.trim(),
      correo: form.correo.trim().toLowerCase(),
      disponibilidad: form.disponibilidad.trim(),
    };

    const msg = validar(limpio, editandoId !== null);
    if (msg) {
      setError(msg);
      return;
    }

    // Campos que se envían tanto al crear como al editar
    const datos = {
      tipo_identificacion: limpio.tipo_identificacion,
      nombre: limpio.nombre,
      apellidos: limpio.apellidos,
      telefono: limpio.telefono,
      correo: limpio.correo,
      especialidad: limpio.especialidad,
      disponibilidad: limpio.disponibilidad,
    };

    setGuardando(true);
    // Al editar no se envía la cédula (es la llave); al crear, estado y fecha los pone la api
    const res = editandoId
      ? await api.instructores.update(editandoId, { ...datos, fecha_contratacion: limpio.fecha_contratacion })
      : await api.instructores.create({ ...datos, numero_identificacion: limpio.numero_identificacion });
    setGuardando(false);

    if (!res.ok) {
      setError(res.mensaje);
      return;
    }
    setShow(false);
    setAlerta({ tipo: "ok", mensaje: res.mensaje });
    setInstructores(await api.instructores.list());
  }

  async function cambiarEstado(i: Instructor) {
    const nuevo = i.estado === "ACTIVO" ? "INACTIVO" : "ACTIVO";
    const res = await api.instructores.setEstado(i.numero_identificacion, nuevo);
    setAlerta(
      res.ok
        ? { tipo: "ok", mensaje: `${i.nombre} ${i.apellidos} ahora está ${nuevo}` }
        : { tipo: "error", mensaje: res.mensaje }
    );
    setInstructores(await api.instructores.list());
  }

  function pedirEliminar(i: Instructor) {
    setErrorEliminar("");
    setAEliminar(i);
    setShowEliminar(true);
  }

  async function confirmarEliminar() {
    if (!aEliminar) return;
    const res = await api.instructores.remove(aEliminar.numero_identificacion);
    if (!res.ok) {
      setErrorEliminar(res.mensaje);
      return;
    }
    setShowEliminar(false);
    setAlerta({ tipo: "ok", mensaje: res.mensaje });
    setInstructores(await api.instructores.list());
  }

  return (
    <div className="card-g">
      <div className="card-head">
        <div>
          <h2 className="card-title">Instructores</h2>
          <p className="card-sub">Gestiona el equipo de entrenadores del gimnasio</p>
        </div>
        <button className="btn-neon" onClick={abrirNuevo}>+ Nuevo instructor</button>
      </div>

      {alerta && <div className={"alert-g show alert-" + alerta.tipo}>{alerta.mensaje}</div>}

      <div className="toolbar" style={{ marginBottom: 20 }}>
        <div className="search-box">
          <span className="search-ico">🔍</span>
          <input
            type="text"
            className="form-control-dark"
            placeholder="Buscar por nombre, identificación, correo o especialidad..."
            value={busqueda}
            onChange={(e) => setBusqueda(e.target.value)}
          />
        </div>
        <select
          className="form-control-dark"
          style={{ width: "auto" }}
          value={filtroEspecialidad}
          onChange={(e) => setFiltroEspecialidad(e.target.value as Especialidad | "")}
        >
          <option value="">Todas las especialidades</option>
          {ESPECIALIDADES.map((esp) => <option key={esp} value={esp}>{esp}</option>)}
        </select>
        <select
          className="form-control-dark"
          style={{ width: "auto" }}
          value={filtroEstado}
          onChange={(e) => setFiltroEstado(e.target.value as EstadoInstructor | "")}
        >
          <option value="">Todos los estados</option>
          <option value="ACTIVO">Activos</option>
          <option value="INACTIVO">Inactivos</option>
        </select>
        {hayFiltros && <button className="btn-dark" onClick={limpiarFiltros}>Limpiar</button>}
      </div>

      <div className="table-wrap">
        <table className="table-g tabla-stack">
          <thead>
            <tr>
              <th>Instructor</th><th>Identificación</th><th>Teléfono</th><th>Especialidad</th><th>Disponibilidad</th><th>Contratación</th><th>Estado</th><th>Acciones</th>
            </tr>
          </thead>
          <tbody>
            {cargando ? (
              <tr><td colSpan={8} className="loader"><span className="spinner-g"></span>Cargando...</td></tr>
            ) : filtrados.length === 0 ? (
              <tr>
                <td colSpan={8} className="empty-state">
                  {instructores.length === 0
                    ? "No hay instructores registrados. Crea el primero con «+ Nuevo instructor»."
                    : "Ningún instructor coincide con la búsqueda o los filtros."}
                </td>
              </tr>
            ) : (
              paginada.map((i) => (
                <tr key={i.numero_identificacion}>
                  <td data-label="Instructor">
                    <div className="person">
                      <div className="person-avatar">{utils.iniciales(i.nombre, i.apellidos)}</div>
                      <div>
                        <div className="person-name">{i.nombre} {i.apellidos}</div>
                        <div className="person-sub">{i.correo}</div>
                      </div>
                    </div>
                  </td>
                  <td data-label="Identificación">{i.tipo_identificacion} {i.numero_identificacion}</td>
                  <td data-label="Teléfono">{i.telefono}</td>
                  <td data-label="Especialidad">{i.especialidad}</td>
                  <td data-label="Disponibilidad">{i.disponibilidad}</td>
                  <td data-label="Contratación">{utils.fecha(i.fecha_contratacion)}</td>
                  <td data-label="Estado"><span className={"badge-g " + utils.badgeClass(i.estado)}>{i.estado}</span></td>
                  <td data-label="Acciones">
                    <div className="cell-actions">
                      <button className="btn-icon" title="Ver perfil" onClick={() => navigate("/instructores/" + i.numero_identificacion)}>👁</button>
                      <button className="btn-icon" title="Editar" onClick={() => abrirEdicion(i)}>✏️</button>
                      <button className="btn-icon" title={i.estado === "ACTIVO" ? "Desactivar" : "Activar"} onClick={() => cambiarEstado(i)}>
                        {i.estado === "ACTIVO" ? "🚫" : "✅"}
                      </button>
                      <button className="btn-icon" title="Eliminar" onClick={() => pedirEliminar(i)}>🗑️</button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
        <Paginador pagina={pagina} total={filtrados.length} porPagina={POR_PAGINA} onCambiar={setPagina} />
      </div>

      <Modal show={show} onHide={() => setShow(false)} centered size="lg">
        <Modal.Header closeButton>
          <Modal.Title>{editandoId ? "Editar instructor" : "Nuevo instructor"}</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          {error && <div className="alert-g alert-error show">{error}</div>}
          <div className="row g-3">
            <div className="col-md-4">
              <label className="form-label-g">Tipo</label>
              <select
                className="form-control-dark"
                value={form.tipo_identificacion}
                onChange={(e) => setCampo("tipo_identificacion", e.target.value as TipoIdentificacion)}
              >
                {TIPOS.map((t) => <option key={t} value={t}>{t}</option>)}
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
              <input className="form-control-dark" type="tel" value={form.telefono} onChange={(e) => setCampo("telefono", e.target.value)} />
            </div>
            <div className="col-md-6">
              <label className="form-label-g">Correo</label>
              <input className="form-control-dark" type="email" value={form.correo} onChange={(e) => setCampo("correo", e.target.value)} />
            </div>
            <div className="col-md-6">
              <label className="form-label-g">Especialidad</label>
              <select
                className="form-control-dark"
                value={form.especialidad}
                onChange={(e) => setCampo("especialidad", e.target.value as Especialidad)}
              >
                {ESPECIALIDADES.map((esp) => <option key={esp} value={esp}>{esp}</option>)}
              </select>
            </div>
            <div className="col-md-6">
              <label className="form-label-g">Disponibilidad</label>
              <input className="form-control-dark" placeholder="Ej. Lun-Vie 6:00-14:00" value={form.disponibilidad} onChange={(e) => setCampo("disponibilidad", e.target.value)} />
            </div>
            <div className="col-md-6">
              <label className="form-label-g">Fecha de contratación</label>
              {editandoId ? (
                <input className="form-control-dark" type="date" max={utils.isoDate()} value={form.fecha_contratacion} onChange={(e) => setCampo("fecha_contratacion", e.target.value)} />
              ) : (
                <p className="card-sub">Se registra con la fecha de hoy y en estado ACTIVO.</p>
              )}
            </div>
          </div>
        </Modal.Body>
        <Modal.Footer>
          <button className="btn-dark" onClick={() => setShow(false)}>Cancelar</button>
          <button className="btn-neon" onClick={guardar} disabled={guardando}>
            {guardando ? "Guardando..." : "Guardar"}
          </button>
        </Modal.Footer>
      </Modal>

      {/* Confirmación de eliminar */}
      <Modal show={showEliminar} onHide={() => setShowEliminar(false)} centered>
        <Modal.Header closeButton>
          <Modal.Title>Eliminar instructor</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          {errorEliminar && <div className="alert-g alert-error show">{errorEliminar}</div>}
          <p>
            ¿Seguro que quieres eliminar a <strong>{aEliminar?.nombre} {aEliminar?.apellidos}</strong>?
            Esta acción no se puede deshacer. Si solo dejó de trabajar temporalmente, mejor desactívalo.
          </p>
        </Modal.Body>
        <Modal.Footer>
          <button className="btn-dark" onClick={() => setShowEliminar(false)}>Cancelar</button>
          <button className="btn-danger-g" onClick={confirmarEliminar}>Sí, eliminar</button>
        </Modal.Footer>
      </Modal>
    </div>
  );
}
