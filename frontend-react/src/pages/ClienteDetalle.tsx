import { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { api } from "../data/api";
import { useTenant } from "../tenant/TenantContext"; // [multitenant-slug]
import { utils } from "../lib/utils";
import type { Cliente, Membresia, Pago, Ingreso, PlanMembresia } from "../types";
import { ModalPago } from "../components/ModalPago";
import type { NuevoPago } from "../data/api";

export function ClienteDetalle() {
  const { ruta } = useTenant(); // [multitenant-slug]
  const { id } = useParams();

  const [cliente, setCliente] = useState<Cliente | null>(null);
  const [membresias, setMembresias] = useState<Membresia[]>([]);
  const [pagos, setPagos] = useState<Pago[]>([]);
  const [ingresos, setIngresos] = useState<Ingreso[]>([]);
  const [planes, setPlanes] = useState<PlanMembresia[]>([]);
  const [todasMembresias, setTodasMembresias] = useState<Membresia[]>([]);
  const [cargando, setCargando] = useState(true);
  const [showPago, setShowPago] = useState(false);
  const [editandoMembresia, setEditandoMembresia] = useState<Membresia | null>(null);
  const [showEdit, setShowEdit] = useState(false);
  const [guardando, setGuardando] = useState(false);
  const [error, setError] = useState("");

  async function cargar() {
    if (!id) return;
    const [c, m, p, i, pl, tm] = await Promise.all([
      api.clientes.get(id),
      api.membresias.byCliente(id),
      api.pagos.byCliente(id),
      api.ingresos.byCliente(id),
      api.planes.list(),
      api.membresias.list(),
    ]);
    setCliente(c);
    setMembresias(m);
    setPagos(p);
    setIngresos(i);
    setPlanes(pl);
    setTodasMembresias(tm);
    setCargando(false);
  }

  useEffect(() => {
    let cancelado = false;
    (async () => {
      if (!id) return;
      const [c, m, p, i, pl, tm] = await Promise.all([
        api.clientes.get(id),
        api.membresias.byCliente(id),
        api.pagos.byCliente(id),
        api.ingresos.byCliente(id),
        api.planes.list(),
        api.membresias.list(),
      ]);
      if (cancelado) return;
      setCliente(c);
      setMembresias(m);
      setPagos(p);
      setIngresos(i);
      setPlanes(pl);
      setTodasMembresias(tm);
      setCargando(false);
    })();
    return () => {
      cancelado = true;
    };
  }, [id]);

  if (cargando) {
    return (
      <div className="card-g">
        <div className="loader"><span className="spinner-g"></span>Cargando...</div>
      </div>
    );
  }

  if (!cliente) {
    return (
      <div className="card-g">
        <Link to={ruta("/clientes")} className="btn-dark" style={{ textDecoration: "none" }}><i className="bi bi-arrow-left me-1" aria-hidden /> Volver</Link>
        <p className="empty-state">Cliente no encontrado</p>
      </div>
    );
  }

  async function registrarPago(input: NuevoPago) {
    setGuardando(true);
    setError("");
    try {
      const resp = await api.pagos.crear(input);
      if (!resp.ok) {
        setError(resp.mensaje);
        return;
      }
      setShowPago(false);
      await cargar();
    } finally {
      setGuardando(false);
    }
  }

  async function cancelarMembresia(m: Membresia) {
    if (!confirm("¿Cancelar esta membresía?")) return;
    const resp = await api.membresias.update(m.id_membresia, { estado: "CANCELADA" });
    if (resp.ok) await cargar();
  }

  return (
    <>
      {error && <div className="alert-g alert-error show">{error}</div>}
      <div className="card-g">
        <div className="d-flex justify-content-between align-items-center">
          <Link to={ruta("/clientes")} className="btn-dark" style={{ textDecoration: "none" }}><i className="bi bi-arrow-left me-1" aria-hidden /> Volver</Link>
          <button className="btn-neon" onClick={() => { setError(""); setShowPago(true); }}>+ Nueva membresía</button>
        </div>
        <div className="person" style={{ marginTop: 16 }}>
          <div className="person-avatar">{utils.iniciales(cliente.nombre, cliente.apellidos)}</div>
          <div>
            <div className="person-name">{cliente.nombre} {cliente.apellidos}</div>
            <div className="person-sub">
              {cliente.tipo_identificacion} {cliente.numero_identificacion} · {cliente.correo}
            </div>
          </div>
          <span className={"badge-g " + utils.badgeClass(cliente.estado)} style={{ marginLeft: "auto" }}>
            {cliente.estado}
          </span>
        </div>
        <p className="card-sub" style={{ marginTop: 12 }}>
          Tel: {cliente.telefono} · {cliente.direccion} · Registrado: {utils.fecha(cliente.fecha_registro)}
        </p>
      </div>

      <div className="card-g">
        <h2 className="card-title">Membresías</h2>
        <div className="table-wrap">
          <table className="table-g">
            <thead>
              <tr><th>Tipo</th><th>Modalidad</th><th>Valor</th><th>Vence</th><th>Estado</th><th>Acciones</th></tr>
            </thead>
            <tbody>
              {membresias.length === 0 ? (
                <tr><td colSpan={6} className="empty-state">Sin membresías</td></tr>
              ) : (
                membresias.map((m) => (
                  <tr key={m.id_membresia}>
                    <td>{m.tipo_membresia}</td>
                    <td>{m.modalidad_pago}</td>
                    <td>{utils.money(m.valor)}</td>
                    <td>{utils.fecha(m.fecha_vencimiento)}</td>
                    <td><span className={"badge-g " + utils.badgeClass(m.estado)}>{m.estado}</span></td>
                    <td>
                      <div className="d-flex gap-2">
                        <button className="btn-dark" onClick={() => { setEditandoMembresia(m); setShowEdit(true); }}>Editar</button>
                        {m.estado === "ACTIVA" && (
                          <button className="btn-dark" onClick={() => cancelarMembresia(m)}>Cancelar</button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      <div className="card-g">
        <h2 className="card-title">Pagos</h2>
        <div className="table-wrap">
          <table className="table-g">
            <thead>
              <tr><th>Fecha</th><th>Valor</th><th>Método</th><th>Estado</th></tr>
            </thead>
            <tbody>
              {pagos.length === 0 ? (
                <tr><td colSpan={4} className="empty-state">Sin pagos</td></tr>
              ) : (
                pagos.map((p) => (
                  <tr key={p.id_pago}>
                    <td>{utils.fecha(p.fecha_pago)}</td>
                    <td>{utils.money(p.valor)}</td>
                    <td>{p.metodo_pago}</td>
                    <td><span className={"badge-g " + utils.badgeClass(p.estado_pago)}>{p.estado_pago}</span></td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      <div className="card-g">
        <h2 className="card-title">Ingresos</h2>
        <div className="table-wrap">
          <table className="table-g">
            <thead>
              <tr><th>Fecha</th><th>Entrada</th><th>Salida</th><th>Método</th></tr>
            </thead>
            <tbody>
              {ingresos.length === 0 ? (
                <tr><td colSpan={4} className="empty-state">Sin ingresos</td></tr>
              ) : (
                ingresos.map((i) => (
                  <tr key={i.id_ingreso}>
                    <td>{utils.fecha(i.fecha)}</td>
                    <td>{utils.hora(i.hora_entrada)}</td>
                    <td>{i.hora_salida ? utils.hora(i.hora_salida) : "En el gym"}</td>
                    <td>{i.metodo_verificacion}</td>
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
        clientes={cliente ? [cliente] : []}
        membresias={todasMembresias}
        bloqueado={guardando}
        alCerrar={() => !guardando && setShowPago(false)}
        alGuardar={registrarPago}
        clienteInicial={cliente?.numero_identificacion}
      />

      {showEdit && editandoMembresia && (
        <div className="modal show" style={{ display: "block" }}>
          <div className="modal-dialog">
            <div className="modal-content" style={{ background: "#12141a", color: "#e8eaed" }}>
              <div className="modal-header">
                <h5 className="modal-title">Editar membresía</h5>
                <button type="button" className="btn-close btn-close-white" onClick={() => setShowEdit(false)} />
              </div>
              <div className="modal-body">
                <div className="mb-2">
                  <label className="form-label-g">Plan</label>
                  <select className="form-control-dark" value={editandoMembresia.id_plan || ""} onChange={(e) => setEditandoMembresia({ ...editandoMembresia, id_plan: e.target.value ? Number(e.target.value) : null })}>
                    {planes.map(p => <option key={p.id_plan} value={p.id_plan}>{p.nombre}</option>)}
                  </select>
                </div>
                <div className="mb-2">
                  <label className="form-label-g">Modalidad</label>
                  <select className="form-control-dark" value={editandoMembresia.modalidad_pago} onChange={(e) => setEditandoMembresia({ ...editandoMembresia, modalidad_pago: e.target.value as Membresia["modalidad_pago"] })}>
                    <option value="MENSUAL">MENSUAL</option>
                    <option value="SEMESTRAL">SEMESTRAL</option>
                    <option value="ANUAL">ANUAL</option>
                  </select>
                </div>
                <div className="mb-2">
                  <label className="form-label-g">Valor</label>
                  <input className="form-control-dark" type="number" value={editandoMembresia.valor} onChange={(e) => setEditandoMembresia({ ...editandoMembresia, valor: Number(e.target.value) })} />
                </div>
                <div className="mb-2">
                  <label className="form-label-g">Fecha inicio</label>
                  <input className="form-control-dark" type="date" value={editandoMembresia.fecha_inicio} onChange={(e) => setEditandoMembresia({ ...editandoMembresia, fecha_inicio: e.target.value })} />
                </div>
                <div className="mb-2">
                  <label className="form-label-g">Fecha vencimiento</label>
                  <input className="form-control-dark" type="date" value={editandoMembresia.fecha_vencimiento} onChange={(e) => setEditandoMembresia({ ...editandoMembresia, fecha_vencimiento: e.target.value })} />
                </div>
                <div className="mb-2">
                  <label className="form-label-g">Estado</label>
                  <select className="form-control-dark" value={editandoMembresia.estado} onChange={(e) => setEditandoMembresia({ ...editandoMembresia, estado: e.target.value as Membresia["estado"] })}>
                    <option value="ACTIVA">ACTIVA</option>
                    <option value="VENCIDA">VENCIDA</option>
                    <option value="CANCELADA">CANCELADA</option>
                  </select>
                </div>
              </div>
              <div className="modal-footer">
                <button className="btn-dark" onClick={() => setShowEdit(false)}>Cancelar</button>
                <button className="btn-neon" onClick={async () => {
                  const resp = await api.membresias.update(editandoMembresia.id_membresia, editandoMembresia);
                  if (resp.ok) { setShowEdit(false); await cargar(); }
                }}>Guardar</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
