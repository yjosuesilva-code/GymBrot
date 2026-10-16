import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Modal } from "react-bootstrap";
import { api } from "../data/api";
import { useTenant } from "../tenant/TenantContext"; // [multitenant-slug]
import { utils } from "../lib/utils";
import { membresiaVigente } from "../lib/membresias";
import { useVersionDeDatos } from "../lib/datos";
import { Paginador } from "../components/Paginador";
import { RegistroEntrada } from "../components/RegistroEntrada";
import { ETIQUETA_METODO } from "../components/registro-entrada.const";
import type { ModoRegistro } from "../components/registro-entrada.const";
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

/* Categoria de edad del desktop (colCategoria). El legacy la deriva de la edad
   en anios; aqui se usa la misma segmentacion para que la columna se lea igual. */
function categoriaEdad(edad: number | null): string {
  if (edad == null) return "Sin dato";
  if (edad < 13) return "Niño";
  if (edad < 18) return "Adolescente";
  if (edad < 30) return "Joven";
  if (edad < 60) return "Adulto";
  return "Adulto mayor";
}

export function Clientes() {
  const { ruta } = useTenant(); // [multitenant-slug]
  const [clientes, setClientes] = useState<Cliente[]>([]);
  const [usuarios, setUsuarios] = useState<Usuario[]>([]);
  const [membresias, setMembresias] = useState<Membresia[]>([]);
  const [ingresos, setIngresos] = useState<Ingreso[]>([]);
  const [cargando, setCargando] = useState(true);
  const [filtro, setFiltro] = useState("");

  // Paginación: 10 por página (100 socios en el seed); al buscar se vuelve a la 1
  const POR_PAGINA = 10;
  const [pagina, setPagina] = useState(1);

  const [show, setShow] = useState(false);
  const [editandoId, setEditandoId] = useState<string | null>(null);
  const [form, setForm] = useState<FormCliente>(VACIO);
  const [error, setError] = useState("");
  const [clave, setClave] = useState("");
  const [confirmar, setConfirmar] = useState("");
  const [verClave, setVerClave] = useState(false);

  // Modal unificado de validación de acceso (entrada o salida)
  const [modoRegistro, setModoRegistro] = useState<ModoRegistro | null>(null);
  const [avisoMonitor, setAvisoMonitor] = useState<{ tipo: "ok" | "error"; texto: string } | null>(null);
  const [procesandoSalida, setProcesandoSalida] = useState(false);

  const navigate = useNavigate();

  // El listado se relee cuando db.write avisa: registrar un acceso desde el
  // modal y ver la fila del monitor aparecer no depende de recargar la pagina.
  const version = useVersionDeDatos();
  const hoy = utils.isoDate();

  useEffect(() => {
    Promise.all([
      api.clientes.list(),
      api.usuarios.list(),
      api.membresias.list(),
      api.ingresos.delDia(hoy),
    ]).then(([cs, us, ms, is]) => {
      setClientes(cs);
      setUsuarios(us);
      setMembresias(ms);
      setIngresos(is);
      setCargando(false);
    });
  }, [version, hoy]);

  async function recargar() {
    const [cs, us, ms, is] = await Promise.all([
      api.clientes.list(),
      api.usuarios.list(),
      api.membresias.list(),
      api.ingresos.delDia(hoy),
    ]);
    setClientes(cs);
    setUsuarios(us);
    setMembresias(ms);
    setIngresos(is);
  }

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
  const tieneCodigo = editandoId !== null && conCodigo.has(editandoId);
  const primeraVez = !tieneCodigo;
  const setCampo = (campo: keyof FormCliente, valor: string) =>
    setForm((f) => ({ ...f, [campo]: valor }));

  // KPI del desktop: total de socios activos, cuantos estan dentro ahora mismo
  // (ingresos sin hora de salida) y la tasa de ingreso sobre los activos.
  const activos = clientes.filter((c) => c.estado === "ACTIVO").length;
  const dentro = ingresos.filter((i) => i.hora_salida === null).length;
  const tasa = activos ? Math.round((dentro / activos) * 100) : 0;

  const aseguraIngreso = (c: Cliente) =>
    membresias.some(
      (m) => m.id_cliente === c.numero_identificacion && membresiaVigente(m, hoy, c),
    );

  // Monitor: últimos movimientos del día, del más reciente al más antiguo.
  const log = [...ingresos].sort((a, b) => (a.hora_entrada < b.hora_entrada ? 1 : -1));
  const porId = new Map(clientes.map((c) => [c.numero_identificacion, c]));

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
    await recargar();
  }

  async function cambiarEstado(c: Cliente) {
    const nuevo = c.estado === "ACTIVO" ? "INACTIVO" : "ACTIVO";
    await api.clientes.setEstado(c.numero_identificacion, nuevo);
    await recargar();
  }

  /* Atajo del monitor: cerrar la entrada abierta sin volver a pasar por el modal.
     La API no pide clave aqui a proposito: registrarSalida solo identifica, no
     vuelve a validar las reglas de entrada. */
  async function cerrarSalida(i: Ingreso) {
    if (procesandoSalida) return;
    setProcesandoSalida(true);
    setAvisoMonitor(null);
    try {
      const res = await api.acceso.registrarSalida({ id_cliente: i.id_cliente });
      setAvisoMonitor({ tipo: res.ok ? "ok" : "error", texto: res.mensaje });
    } finally {
      setProcesandoSalida(false);
    }
  }

  return (
    <div className="card-g">
      <div className="card-head">
        <div>
          <h2 className="card-title">Clientes</h2>
          <p className="card-sub">
            Gestiona los clientes del gimnasio y valida su entrada o salida desde
            un mismo panel.
          </p>{" "}
        </div>
      </div>

      {/* ---- KPIs del desktop ---- */}
      <div className="gst-grid">
        <div className="gst-card">
          <span className="gst-label">Clientes activos</span>
          <b className="gst-valor">{activos}</b>
        </div>
        <div className="gst-card">
          <span className="gst-label">
            Dentro del gym <span className="gst-dot" aria-hidden="true" />
          </span>
          <b className="gst-valor">{dentro}</b>
          <span className="gst-nota">En tiempo real</span>
        </div>
        <div className="gst-card">
          <span className="gst-label">Tasa de ingreso</span>
          <b className="gst-valor">{tasa}%</b>
          <span className="gst-nota">sobre los activos</span>
        </div>
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
        <div className="toolbar-acciones">
          <button
            className="btn-acceso btn-acceso-salida"
            onClick={() => setModoRegistro("SALIDA")}
          >
            Validar Salida
          </button>
          <button
            className="btn-acceso btn-acceso-entrada"
            onClick={() => setModoRegistro("ENTRADA")}
          >
            Validar Entrada
          </button>
          <button className="btn-neon" onClick={abrirNuevo}>
            + Agregar Cliente
          </button>
        </div>
      </div>

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
                const seguro = aseguraIngreso(c);
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
                      <div className="person-sub">{c.telefono || "—"}</div>
                      <div className="person-sub">{c.correo || "—"}</div>
                    </td>
                    <td data-label="Categoría de edad">
                      <span className="badge-g badge-categoria">
                        {categoriaEdad(edad)}
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
                      {seguro ? (
                        <span className="badge-g badge-activo">Ingreso seguro</span>
                      ) : (
                        <span className="badge-g badge-sin-ingreso">Sin ingreso</span>
                      )}
                    </td>
                    <td data-label="Acciones">
                      <div className="cell-actions">
                        <button
                          className="btn-icon"
                          title="Ver detalle"
                          onClick={() =>
                            navigate(ruta("/clientes/" + c.numero_identificacion))
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
        <Paginador
          pagina={paginaSegura}
          total={filtrados.length}
          porPagina={POR_PAGINA}
          onCambiar={setPagina}
        />
      </div>

      {/* ---- Monitor de Terminal de Escaneo ---- */}
      <div className="monitor">
        <div className="monitor-head">
          <h3 className="monitor-title">Monitor de Terminal de Escaneo</h3>
          <span className="monitor-dot" aria-hidden="true" />
        </div>

        {avisoMonitor && (
          <div
            className={"alert-g show " + (avisoMonitor.tipo === "ok" ? "alert-ok" : "alert-error")}
            role={avisoMonitor.tipo === "ok" ? "status" : "alert"}
          >
            {avisoMonitor.texto}
          </div>
        )}

        <div className="log-lista">
          {log.length === 0 ? (
            <p className="monitor-vacio">Sin movimientos registrados hoy.</p>
          ) : (
            log.map((i) => {
              const cliente = porId.get(i.id_cliente);
              const abierto = i.hora_salida === null;
              return (
                <div className="log-row" key={i.id_ingreso}>
                  <div className="person-avatar">
                    {cliente
                      ? utils.iniciales(cliente.nombre, cliente.apellidos)
                      : utils.iniciales("", "")}
                  </div>
                  <div className="log-info">
                    <span className="log-nombre">
                      {cliente
                        ? `${cliente.nombre} ${cliente.apellidos}`
                        : "Cliente no encontrado"}
                    </span>
                    <span className="log-detalle">
                      {utils.hora(i.hora_entrada)} · {ETIQUETA_METODO[i.metodo_verificacion]}
                    </span>
                  </div>
                  <span className={"log-estado" + (abierto ? " dentro" : "")}>
                    {abierto ? "Dentro" : "Salida"}
                  </span>
                  {abierto && (
                    <button
                      className="btn-dark log-salida"
                      disabled={procesandoSalida}
                      onClick={() => cerrarSalida(i)}
                    >
                      Registrar salida
                    </button>
                  )}
                </div>
              );
            })
          )}
        </div>
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

      {modoRegistro && (
        <RegistroEntrada
          modo={modoRegistro}
          clientes={clientes}
          onClose={() => setModoRegistro(null)}
          onRegistrado={recargar}
        />
      )}
    </div>
  );
}
