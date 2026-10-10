import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Modal } from "react-bootstrap";
import { api } from "../data/api";
import { utils } from "../lib/utils";
import { Paginador } from "../components/Paginador";
import { RegistroEntrada } from "../components/RegistroEntrada";
import type { ModoRegistro } from "../components/RegistroEntrada";
import { ETIQUETA_METODO } from "../components/registro-entrada.const";
import { membresiaVigente } from "../lib/membresias";
import { useVersionDeDatos } from "../lib/datos";
import type { Cliente, ClienteNuevo, Ingreso, Membresia, Usuario } from "../types";

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

/* Categoria de edad del desktop (GestionClientes.fxml, colCATEGORIA): Menor
   de Edad, Adulto o Adulto Mayor segun la regla del controller. */
function categoriaDeEdad(edad: number | null): string {
  if (edad == null) return "—";
  return edad < 18 ? "Menor de Edad" : edad < 65 ? "Adulto" : "Adulto Mayor";
}

export function Clientes() {
  const [clientes, setClientes] = useState<Cliente[]>([]);
  const [usuarios, setUsuarios] = useState<Usuario[]>([]);
  const [membresias, setMembresias] = useState<Membresia[]>([]);
  const [registros, setRegistros] = useState<Ingreso[]>([]);

  const [cargando, setCargando] = useState(true);
  const [filtro, setFiltro] = useState("");

  // Paginación: 10 por página (100 socios en el seed); al buscar se vuelve a la 1
  const POR_PAGINA = 10;
  const [pagina, setPagina] = useState(1);

  // Registro de entrada/salida (overlay de RegistroEntrada.fxml). Se abre con
  // el modo que pida el boton del toolbar, igual que el desktop.
  const [registroAbierto, setRegistroAbierto] = useState(false);
  const [modoRegistro, setModoRegistro] = useState<ModoRegistro>("ENTRADA");
  const [avisoAcceso, setAvisoAcceso] = useState<{ tipo: "ok" | "error"; texto: string } | null>(null);

  const [show, setShow] = useState(false);
  const [editandoId, setEditandoId] = useState<string | null>(null);
  const [form, setForm] = useState<FormCliente>(VACIO);
  const [error, setError] = useState("");
  const [clave, setClave] = useState("");
  const [confirmar, setConfirmar] = useState("");
  const [verClave, setVerClave] = useState(false);
  const [procesandoSalida, setProcesandoSalida] = useState(false);

  const navigate = useNavigate();

  // El listado se relee cuando db.write avisa: registrar una entrada desde el
  // overlay y ver el monitor refrescarse no depende de que el operador
  // recargue. Misma estrategia que Acceso.tsx usaba con el KPI del Dashboard.
  const version = useVersionDeDatos();
  const hoy = utils.isoDate();

  useEffect(() => {
    Promise.all([
      api.clientes.list(),
      api.usuarios.list(),
      api.membresias.list(),
      api.ingresos.delDia(hoy),
    ]).then(([c, u, m, r]) => {
      setClientes(c);
      setUsuarios(u);
      setMembresias(m);
      setRegistros(r);
      setCargando(false);
    });
  }, [version, hoy]);

  const porId = new Map(clientes.map((c) => [c.numero_identificacion, c]));

  const filtrados = clientes.filter((c) => {
    const texto = (c.nombre + " " + c.apellidos + " " + c.numero_identificacion + " " + c.correo).toLowerCase();
    return texto.includes(filtro.toLowerCase());
  });
  // La página se recorta a un rango válido ("paginaSegura") cuando la lista
  // filtrada es más corta; así al buscar se vuelve solo al rango disponible.
  const totalPaginas = Math.max(1, Math.ceil(filtrados.length / POR_PAGINA));
  const paginaSegura = Math.min(pagina, totalPaginas);
  const paginados = filtrados.slice((paginaSegura - 1) * POR_PAGINA, paginaSegura * POR_PAGINA);
  const conCodigo = new Set(
    usuarios.filter((u) => u.contrasena).map((u) => u.numero_identificacion)
  );
  // El estado de ingreso del desktop: cliente ACTIVO y con membresia vigente.
  const ingresoSeguro = new Set(
    membresias
      .filter((m) => membresiaVigente(m, hoy, porId.get(m.id_cliente)))
      .map((m) => m.id_cliente)
  );
  const tieneCodigo = editandoId !== null && conCodigo.has(editandoId);
  const primeraVez = !tieneCodigo;
  const setCampo = (campo: keyof FormCliente, valor: string) =>
    setForm((f) => ({ ...f, [campo]: valor }));

  // Stats iguales al desktop (GestionClientesController.cargarStats):
  // total de clientes ACTIVO, sesiones activas (sin hora_salida hoy) y la
  // tasa de ingreso como cantidad de ingresos del dia.
  const totalActivos = clientes.filter((c) => c.estado === "ACTIVO").length;
  const dentroAhora = new Set(
    registros.filter((r) => r.hora_salida === null).map((r) => r.id_cliente)
  ).size;
  const tasaIngreso = registros.length;

  // Monitor: log del dia, mas reciente primero (maximo 6, como el desktop).
  const logAccesos = [...registros]
    .sort((a, b) => (a.hora_entrada < b.hora_entrada ? 1 : -1))
    .slice(0, 6);

  function abrirRegistro(modo: ModoRegistro) {
    setAvisoAcceso(null);
    setModoRegistro(modo);
    setRegistroAbierto(true);
  }

  /* Atajo del monitor: cerrar la entrada abierta sin pasar por el overlay.
     La API no pide clave aqui a proposito: registrarSalida solo identifica,
     no vuelve a validar las reglas de entrada. */
  async function cerrarSalida(ingreso: Ingreso) {
    if (procesandoSalida) return;
    setProcesandoSalida(true);
    setAvisoAcceso(null);
    try {
      const res = await api.acceso.registrarSalida({ id_cliente: ingreso.id_cliente });
      setAvisoAcceso({ tipo: res.ok ? "ok" : "error", texto: res.mensaje });
    } finally {
      setProcesandoSalida(false);
    }
  }

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
  }

  async function cambiarEstado(c: Cliente) {
    const nuevo = c.estado === "ACTIVO" ? "INACTIVO" : "ACTIVO";
    await api.clientes.setEstado(c.numero_identificacion, nuevo);
  }

  return (
    <div className="card-g">
      <div className="card-head">
        <div>
          <h2 className="card-title">Clientes</h2>
          <p className="card-sub">
            Gestiona los clientes del gimnasio, sus códigos de acceso y el
            registro de entradas y salidas del día.
          </p>
        </div>
      </div>

      {avisoAcceso && (
        <div
          className={"alert-g show " + (avisoAcceso.tipo === "ok" ? "alert-ok" : "alert-error")}
          role={avisoAcceso.tipo === "ok" ? "status" : "alert"}
        >
          {avisoAcceso.texto}
        </div>
      )}

      {/* ── Seccion 1: stats iguales al desktop ── */}
      <div className="gst">
        <div className="gst-card">
          <span className="gst-label">Total de clientes</span>
          <span className="gst-valor neon">{utils.num(totalActivos)}</span>
          <span className="gst-sub">de {utils.num(clientes.length)} registrados</span>
        </div>
        <div className="gst-card gst-card-accent">
          <span className="gst-label">
            <span className="gst-dot"></span> Clientes dentro del gym
          </span>
          <span className="gst-valor">{utils.num(dentroAhora)}</span>
          <span className="gst-sub">En tiempo real</span>
        </div>
        <div className="gst-card">
          <span className="gst-label">Tasa de ingreso</span>
          <span className="gst-valor">{utils.num(tasaIngreso)}</span>
          <span className="gst-sub">ingresos hoy · {utils.fecha(hoy)}</span>
        </div>
      </div>

      {/* ── Seccion 2: toolbar ── */}
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
        <button
          type="button"
          className="btn-acceso btn-acceso-salida"
          onClick={() => abrirRegistro("SALIDA")}
        >
          Validar Salida
        </button>
        <button
          type="button"
          className="btn-acceso btn-acceso-entrada"
          onClick={() => abrirRegistro("ENTRADA")}
        >
          Validar Entrada
        </button>
        <button type="button" className="btn-neon" onClick={abrirNuevo}>
          + Agregar Cliente
        </button>
      </div>

      {/* ── Seccion 3: tabla de clientes ── */}
      <div className="table-wrap">
        <table className="table-g tabla-stack">
          <thead>
            <tr>
              <th>Identidad</th>
              <th>Contacto</th>
              <th>Categoría de edad</th>
              <th>Código de acceso</th>
              <th>Estado</th>
              <th>Ingreso</th>
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
              paginados.map((c) => {
                const edad = utils.edad(c.fecha_nacimiento);
                const estadoIngreso = ingresoSeguro.has(c.numero_identificacion);
                return (
                  <tr key={c.numero_identificacion}>
                    <td data-label="Identidad">
                      <div className="person">
                        <div className="person-avatar">
                          {utils.iniciales(c.nombre, c.apellidos)}
                        </div>
                        <div>
                          <div className="person-name">
                            {c.nombre} {c.apellidos}
                          </div>
                          <div className="person-sub">
                            {c.tipo_identificacion} {c.numero_identificacion}
                          </div>
                        </div>
                      </div>
                    </td>
                    <td data-label="Contacto">
                      <div className="person-name">{c.correo}</div>
                      <div className="person-sub">{c.telefono}</div>
                    </td>
                    <td data-label="Categoría de edad">
                      <span className="badge-g badge-categoria">
                        {categoriaDeEdad(edad)}
                      </span>
                    </td>
                    <td data-label="Código de acceso">
                      {conCodigo.has(c.numero_identificacion) ? (
                        <span className="badge-g badge-activo">Tiene</span>
                      ) : (
                        <span className="badge-g badge-pendiente">
                          Sin código
                        </span>
                      )}
                    </td>
                    <td data-label="Estado">
                      <span className={"badge-g " + utils.badgeClass(c.estado)}>
                        {c.estado}
                      </span>
                    </td>
                    <td data-label="Ingreso">
                      <span
                        className={
                          "badge-g " + (estadoIngreso ? "badge-activo" : "badge-sin-ingreso")
                        }
                      >
                        {estadoIngreso ? "Ingreso seguro" : "Sin ingreso"}
                      </span>
                    </td>
                    <td data-label="Acciones">
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
                          title={c.estado === "ACTIVO" ? "Desactivar" : "Activar"}
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
        <Paginador
          pagina={paginaSegura}
          total={filtrados.length}
          porPagina={POR_PAGINA}
          onCambiar={setPagina}
        />
      </div>

      {/* ── Seccion 4: monitor de terminal de escaneo ── */}
      <div className="monitor">
        <div className="monitor-head">
          <div>
            <h3 className="monitor-titulo">Monitor de Terminal de Escaneo</h3>
            <p className="monitor-sub">Registro de actividad en tiempo real</p>
          </div>
          <span className="monitor-estado">
            <span className="gst-dot"></span> En Línea
          </span>
        </div>

        <div className="monitor-log">
          {cargando ? (
            <div className="loader">
              <span className="spinner-g"></span>Cargando...
            </div>
          ) : logAccesos.length === 0 ? (
            <div className="empty-state">Sin registros de hoy</div>
          ) : (
            logAccesos.map((i) => {
              const cliente = porId.get(i.id_cliente);
              const dentro = i.hora_salida === null;
              return (
                <div className="log-row" key={i.id_ingreso}>
                  <span className={"log-icono" + (dentro ? " log-dentro" : "")}>
                    {i.metodo_verificacion === "HUELLA" ? "H" : "C"}
                  </span>
                  <div className="log-info">
                    <div className="log-nombre">
                      {cliente ? `${cliente.nombre} ${cliente.apellidos}` : i.id_cliente}
                    </div>
                    <div className="log-detalle">
                      {ETIQUETA_METODO[i.metodo_verificacion]} ·{" "}
                      {utils.hora(i.hora_entrada)}
                      {i.hora_salida ? ` → ${utils.hora(i.hora_salida)}` : ""}
                    </div>
                  </div>
                  {dentro ? (
                    <>
                      <span className="log-estado dentro">Dentro</span>
                      <button
                        type="button"
                        className="btn-dark log-salida"
                        disabled={procesandoSalida}
                        onClick={() => cerrarSalida(i)}
                      >
                        Registrar salida
                      </button>
                    </>
                  ) : (
                    <span className="log-estado">Salida</span>
                  )}
                </div>
              );
            })
          )}
        </div>
      </div>

      <RegistroEntrada
        abierto={registroAbierto}
        modo={modoRegistro}
        clientes={clientes}
        onCerrar={() => setRegistroAbierto(false)}
      />

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