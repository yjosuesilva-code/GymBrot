import { useCallback, useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { Modal } from "react-bootstrap";
import { api } from "../data/api";
import { useTenant } from "../tenant/TenantContext"; // [multitenant-slug]
import { utils } from "../lib/utils";
import { estadoMembresiaPorFecha, membresiaVigente } from "../lib/membresias";
import type { Cliente, Membresia, Pago, Ingreso, PlanMembresia } from "../types";
import { ModalPago } from "../components/ModalPago";
import { ETIQUETA_METODO } from "../components/registro-entrada.const";
import type { NuevoPago } from "../data/api";

// Alerta superior (mismo patrón que Clientes.tsx e Instructores.tsx)
type Alerta = { tipo: "ok" | "error"; mensaje: string };

// Cuántos ingresos recientes se muestran; el resto queda en el historial completo
const MAX_INGRESOS = 10;

type Datos = {
  cliente: Cliente | null;
  membresias: Membresia[];
  pagos: Pago[];
  ingresos: Ingreso[];
  planes: PlanMembresia[];
  todasMembresias: Membresia[];
};

// Una sola función de lectura: la usan la carga inicial y las recargas
async function leerDatos(id: string): Promise<Datos> {
  const [cliente, membresias, pagos, ingresos, planes, todasMembresias] = await Promise.all([
    api.clientes.get(id),
    api.membresias.byCliente(id),
    api.pagos.byCliente(id),
    api.ingresos.byCliente(id),
    api.planes.list(),
    api.membresias.list(),
  ]);
  return { cliente, membresias, pagos, ingresos, planes, todasMembresias };
}

export function ClienteDetalle() {
  const { ruta } = useTenant(); // [multitenant-slug]
  const { id } = useParams();
  const hoy = utils.isoDate();

  const [datos, setDatos] = useState<Datos | null>(null);
  const [errorCarga, setErrorCarga] = useState("");
  const [alerta, setAlerta] = useState<Alerta | null>(null);

  // Nueva membresía (ModalPago)
  const [showPago, setShowPago] = useState(false);
  const [guardando, setGuardando] = useState(false);
  const [errorPago, setErrorPago] = useState("");

  // Editar membresía
  const [editandoMembresia, setEditandoMembresia] = useState<Membresia | null>(null);
  const [errorEdicion, setErrorEdicion] = useState("");

  // Cancelar membresía: se confirma en un modal (antes era confirm() del navegador)
  const [porCancelar, setPorCancelar] = useState<Membresia | null>(null);

  const cargar = useCallback(async () => {
    if (!id) return;
    try {
      setDatos(await leerDatos(id));
      setErrorCarga("");
    } catch (e) {
      // Si la API falla se dice en pantalla en vez de quedar "Cargando..." para siempre
      setErrorCarga(e instanceof Error ? e.message : "No se pudo cargar la información del cliente.");
    }
  }, [id]);

  useEffect(() => {
    let cancelado = false;
    if (!id) return;
    leerDatos(id)
      .then((d) => {
        if (!cancelado) {
          setDatos(d);
          setErrorCarga("");
        }
      })
      .catch((e: unknown) => {
        if (!cancelado) {
          setErrorCarga(e instanceof Error ? e.message : "No se pudo cargar la información del cliente.");
        }
      });
    return () => {
      cancelado = true;
    };
  }, [id]);

  // La alerta se oculta sola a los 4 s
  useEffect(() => {
    if (!alerta) return;
    const t = setTimeout(() => setAlerta(null), 4000);
    return () => clearTimeout(t);
  }, [alerta]);

  const volver = (
    <Link to={ruta("/clientes")} className="btn-dark" style={{ textDecoration: "none" }}>
      <i className="bi bi-arrow-left me-1" aria-hidden /> Volver a clientes
    </Link>
  );

  if (!id || errorCarga) {
    return (
      <div className="card-g">
        {volver}
        <p className="empty-state" role="alert">
          {!id ? "No se indicó qué cliente mostrar." : errorCarga}
        </p>
      </div>
    );
  }

  if (!datos) {
    return (
      <div className="card-g">
        <div className="loader" role="status"><span className="spinner-g"></span>Cargando...</div>
      </div>
    );
  }

  const { cliente, membresias, pagos, ingresos, planes, todasMembresias } = datos;

  if (!cliente) {
    return (
      <div className="card-g">
        {volver}
        <p className="empty-state">No existe un cliente con la identificación {id}.</p>
      </div>
    );
  }

  // Vigencia según la regla única de lib/membresias (fecha + estado del cliente)
  const vigente = membresias
    .filter((m) => membresiaVigente(m, hoy, cliente))
    .sort((a, b) => (a.fecha_vencimiento < b.fecha_vencimiento ? 1 : -1))[0];

  const ingresosRecientes = [...ingresos]
    .sort((a, b) => (a.hora_entrada < b.hora_entrada ? 1 : -1))
    .slice(0, MAX_INGRESOS);

  async function registrarPago(input: NuevoPago) {
    setGuardando(true);
    setErrorPago("");
    try {
      const resp = await api.pagos.crear(input);
      if (!resp.ok) {
        setErrorPago(resp.mensaje);
        return;
      }
      setShowPago(false);
      setAlerta({ tipo: "ok", mensaje: resp.mensaje });
      await cargar();
    } finally {
      setGuardando(false);
    }
  }

  async function confirmarCancelacion() {
    if (!porCancelar) return;
    setGuardando(true);
    try {
      const resp = await api.membresias.update(porCancelar.id_membresia, { estado: "CANCELADA" });
      setAlerta(resp.ok ? { tipo: "ok", mensaje: "Membresía cancelada" } : { tipo: "error", mensaje: resp.mensaje });
      if (resp.ok) await cargar();
    } finally {
      setGuardando(false);
      setPorCancelar(null);
    }
  }

  async function guardarEdicion() {
    if (!editandoMembresia) return;
    if (editandoMembresia.fecha_vencimiento < editandoMembresia.fecha_inicio) {
      setErrorEdicion("La fecha de vencimiento no puede ser anterior a la de inicio");
      return;
    }
    setGuardando(true);
    setErrorEdicion("");
    try {
      const resp = await api.membresias.update(editandoMembresia.id_membresia, editandoMembresia);
      if (!resp.ok) {
        setErrorEdicion(resp.mensaje);
        return;
      }
      setEditandoMembresia(null);
      setAlerta({ tipo: "ok", mensaje: resp.mensaje });
      await cargar();
    } finally {
      setGuardando(false);
    }
  }

  return (
    <>
      {/* Error de "Nueva membresía": ModalPago no recibe un prop de error, así que se
          muestra arriba (mismo lugar que antes); queda detrás del modal mientras está abierto */}
      {errorPago && <div className="alert-g alert-error show" role="alert">{errorPago}</div>}
      {alerta && (
        <div
          className={"alert-g show alert-" + alerta.tipo}
          role={alerta.tipo === "ok" ? "status" : "alert"}
        >
          {alerta.mensaje}
        </div>
      )}

      <div className="card-g">
        <div className="d-flex justify-content-between align-items-center flex-wrap gap-2">
          {volver}
          <button className="btn-neon" onClick={() => { setErrorPago(""); setShowPago(true); }}>+ Nueva membresía</button>
        </div>
        <div className="person" style={{ marginTop: 16 }}>
          <div className="person-avatar" aria-hidden="true">{utils.iniciales(cliente.nombre, cliente.apellidos)}</div>
          <div>
            <h2 className="person-name" style={{ margin: 0, fontSize: "inherit" }}>
              {cliente.nombre} {cliente.apellidos}
            </h2>
            <div className="person-sub">
              {cliente.tipo_identificacion} {cliente.numero_identificacion} · {cliente.correo || "Sin correo"}
            </div>
          </div>
          <span className={"badge-g " + utils.badgeClass(cliente.estado)} style={{ marginLeft: "auto" }}>
            {cliente.estado}
          </span>
        </div>
        <p className="card-sub" style={{ marginTop: 12 }}>
          Tel: {cliente.telefono || "—"} · {cliente.direccion || "Sin dirección"} · Registrado: {utils.fecha(cliente.fecha_registro)}
        </p>
        <p className="card-sub" style={{ marginTop: 4 }}>
          {vigente
            ? `Membresía vigente: ${vigente.tipo_membresia} hasta el ${utils.fecha(vigente.fecha_vencimiento)}`
            : "Sin membresía vigente: no puede ingresar al gimnasio"}
        </p>
      </div>

      <div className="card-g">
        <h3 className="card-title">Membresías</h3>
        <div className="table-wrap">
          <table className="table-g tabla-stack">
            <thead>
              <tr><th>Tipo</th><th>Modalidad</th><th>Valor</th><th>Vence</th><th>Estado</th><th>Acciones</th></tr>
            </thead>
            <tbody>
              {membresias.length === 0 ? (
                <tr><td colSpan={6} className="empty-state">Este cliente no tiene membresías registradas</td></tr>
              ) : (
                membresias.map((m) => {
                  // Una ACTIVA cuya fecha ya pasó se muestra como VENCIDA (o PROGRAMADA si aún no inicia)
                  const estadoReal = estadoMembresiaPorFecha(m, hoy);
                  return (
                    <tr key={m.id_membresia}>
                      <td data-label="Tipo">{m.tipo_membresia}</td>
                      <td data-label="Modalidad">{m.modalidad_pago}</td>
                      <td data-label="Valor">{utils.money(m.valor)}</td>
                      <td data-label="Vence">{utils.fecha(m.fecha_vencimiento)}</td>
                      <td data-label="Estado"><span className={"badge-g " + utils.badgeClass(estadoReal)}>{estadoReal}</span></td>
                      <td data-label="Acciones">
                        <div className="d-flex gap-2">
                          <button
                            className="btn-dark"
                            aria-label={`Editar membresía ${m.tipo_membresia} que vence el ${utils.fecha(m.fecha_vencimiento)}`}
                            onClick={() => { setErrorEdicion(""); setEditandoMembresia(m); }}
                          >
                            Editar
                          </button>
                          {m.estado === "ACTIVA" && (
                            <button
                              className="btn-dark"
                              aria-label={`Cancelar membresía ${m.tipo_membresia} que vence el ${utils.fecha(m.fecha_vencimiento)}`}
                              onClick={() => setPorCancelar(m)}
                            >
                              Cancelar
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      <div className="card-g">
        <h3 className="card-title">Pagos</h3>
        <div className="table-wrap">
          <table className="table-g tabla-stack">
            <thead>
              <tr><th>Fecha</th><th>Valor</th><th>Método</th><th>Estado</th></tr>
            </thead>
            <tbody>
              {pagos.length === 0 ? (
                <tr><td colSpan={4} className="empty-state">Este cliente no tiene pagos registrados</td></tr>
              ) : (
                pagos.map((p) => (
                  <tr key={p.id_pago}>
                    <td data-label="Fecha">{utils.fecha(p.fecha_pago)}</td>
                    <td data-label="Valor">{utils.money(p.valor)}</td>
                    <td data-label="Método">{p.metodo_pago}</td>
                    <td data-label="Estado"><span className={"badge-g " + utils.badgeClass(p.estado_pago)}>{p.estado_pago}</span></td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      <div className="card-g">
        <h3 className="card-title">Ingresos recientes</h3>
        <p className="card-sub" style={{ marginBottom: 12 }}>
          {ingresos.length > MAX_INGRESOS
            ? `Últimos ${MAX_INGRESOS} de ${ingresos.length} ingresos`
            : "Registro de entradas y salidas"}
        </p>
        <div className="table-wrap">
          <table className="table-g tabla-stack">
            <thead>
              <tr><th>Fecha</th><th>Entrada</th><th>Salida</th><th>Método</th></tr>
            </thead>
            <tbody>
              {ingresosRecientes.length === 0 ? (
                <tr><td colSpan={4} className="empty-state">Este cliente aún no registra ingresos</td></tr>
              ) : (
                ingresosRecientes.map((i) => (
                  <tr key={i.id_ingreso}>
                    <td data-label="Fecha">{utils.fecha(i.fecha)}</td>
                    <td data-label="Entrada">{utils.hora(i.hora_entrada)}</td>
                    <td data-label="Salida">{i.hora_salida ? utils.hora(i.hora_salida) : "En el gym"}</td>
                    <td data-label="Método">{ETIQUETA_METODO[i.metodo_verificacion] ?? i.metodo_verificacion}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      <ModalPago
        show={showPago}
        planes={planes}
        clientes={[cliente]}
        membresias={todasMembresias}
        bloqueado={guardando}
        alCerrar={() => !guardando && setShowPago(false)}
        alGuardar={registrarPago}
        clienteInicial={cliente.numero_identificacion}
      />

      {/* ---- Editar membresía (react-bootstrap: fondo, Escape y foco como el resto de modales) ---- */}
      <Modal show={editandoMembresia !== null} onHide={() => !guardando && setEditandoMembresia(null)} centered>
        <Modal.Header closeButton>
          <Modal.Title>Editar membresía</Modal.Title>
        </Modal.Header>
        {editandoMembresia && (
          <form
            onSubmit={(e) => {
              e.preventDefault();
              void guardarEdicion();
            }}
          >
            <Modal.Body>
              {errorEdicion && <div className="alert-g alert-error show" role="alert">{errorEdicion}</div>}
              <div className="mb-2">
                <label className="form-label-g" htmlFor="mem-plan">Plan</label>
                <select id="mem-plan" className="form-control-dark" value={editandoMembresia.id_plan || ""} onChange={(e) => setEditandoMembresia({ ...editandoMembresia, id_plan: e.target.value ? Number(e.target.value) : null })}>
                  {planes.map(p => <option key={p.id_plan} value={p.id_plan}>{p.nombre}</option>)}
                </select>
              </div>
              <div className="mb-2">
                <label className="form-label-g" htmlFor="mem-modalidad">Modalidad</label>
                <select id="mem-modalidad" className="form-control-dark" value={editandoMembresia.modalidad_pago} onChange={(e) => setEditandoMembresia({ ...editandoMembresia, modalidad_pago: e.target.value as Membresia["modalidad_pago"] })}>
                  <option value="MENSUAL">MENSUAL</option>
                  <option value="SEMESTRAL">SEMESTRAL</option>
                  <option value="ANUAL">ANUAL</option>
                </select>
              </div>
              <div className="mb-2">
                <label className="form-label-g" htmlFor="mem-valor">Valor</label>
                <input id="mem-valor" className="form-control-dark" type="number" min={0} value={editandoMembresia.valor} onChange={(e) => setEditandoMembresia({ ...editandoMembresia, valor: Number(e.target.value) })} />
              </div>
              <div className="mb-2">
                <label className="form-label-g" htmlFor="mem-inicio">Fecha inicio</label>
                <input id="mem-inicio" className="form-control-dark" type="date" value={editandoMembresia.fecha_inicio} onChange={(e) => setEditandoMembresia({ ...editandoMembresia, fecha_inicio: e.target.value })} />
              </div>
              <div className="mb-2">
                <label className="form-label-g" htmlFor="mem-vencimiento">Fecha vencimiento</label>
                <input id="mem-vencimiento" className="form-control-dark" type="date" value={editandoMembresia.fecha_vencimiento} onChange={(e) => setEditandoMembresia({ ...editandoMembresia, fecha_vencimiento: e.target.value })} />
              </div>
              <div className="mb-2">
                <label className="form-label-g" htmlFor="mem-estado">Estado</label>
                <select id="mem-estado" className="form-control-dark" value={editandoMembresia.estado} onChange={(e) => setEditandoMembresia({ ...editandoMembresia, estado: e.target.value as Membresia["estado"] })}>
                  <option value="ACTIVA">ACTIVA</option>
                  <option value="VENCIDA">VENCIDA</option>
                  <option value="CANCELADA">CANCELADA</option>
                </select>
              </div>
            </Modal.Body>
            <Modal.Footer>
              <button type="button" className="btn-dark" onClick={() => setEditandoMembresia(null)} disabled={guardando}>Cancelar</button>
              <button type="submit" className="btn-neon" disabled={guardando}>
                {guardando ? "Guardando..." : "Guardar"}
              </button>
            </Modal.Footer>
          </form>
        )}
      </Modal>

      {/* ---- Confirmar cancelación de membresía ---- */}
      <Modal show={porCancelar !== null} onHide={() => !guardando && setPorCancelar(null)} centered>
        <Modal.Header closeButton>
          <Modal.Title>Cancelar membresía</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <p style={{ margin: 0 }}>
            ¿Cancelar la membresía <b>{porCancelar?.tipo_membresia}</b> de {cliente.nombre} {cliente.apellidos}?
          </p>
          <p className="card-sub" style={{ marginTop: 8 }}>
            Si no tiene otra membresía vigente, no podrá ingresar al gimnasio.
          </p>
        </Modal.Body>
        <Modal.Footer>
          <button type="button" className="btn-dark" onClick={() => setPorCancelar(null)} disabled={guardando}>Volver</button>
          <button type="button" className="btn-danger-g" onClick={() => void confirmarCancelacion()} disabled={guardando}>
            {guardando ? "Cancelando..." : "Cancelar membresía"}
          </button>
        </Modal.Footer>
      </Modal>
    </>
  );
}
