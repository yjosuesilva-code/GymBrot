import { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { api } from "../data/api";
import { utils } from "../lib/utils";
import type { Cliente, Membresia, Pago, Ingreso } from "../types";

export function ClienteDetalle() {
  const { id } = useParams();

  const [cliente, setCliente] = useState<Cliente | null>(null);
  const [membresias, setMembresias] = useState<Membresia[]>([]);
  const [pagos, setPagos] = useState<Pago[]>([]);
  const [ingresos, setIngresos] = useState<Ingreso[]>([]);
  const [cargando, setCargando] = useState(true);

  useEffect(() => {
    if (!id) return;
    Promise.all([
      api.clientes.get(id),
      api.membresias.byCliente(id),
      api.pagos.byCliente(id),
      api.ingresos.byCliente(id),
    ]).then(([c, m, p, i]) => {
      setCliente(c);
      setMembresias(m);
      setPagos(p);
      setIngresos(i);
      setCargando(false);
    });
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
        <Link to="/clientes" className="btn-dark" style={{ textDecoration: "none" }}>← Volver</Link>
        <p className="empty-state">Cliente no encontrado</p>
      </div>
    );
  }

  return (
    <>
      <div className="card-g">
        <Link to="/clientes" className="btn-dark" style={{ textDecoration: "none" }}>← Volver</Link>
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
              <tr><th>Tipo</th><th>Modalidad</th><th>Valor</th><th>Vence</th><th>Estado</th></tr>
            </thead>
            <tbody>
              {membresias.length === 0 ? (
                <tr><td colSpan={5} className="empty-state">Sin membresías</td></tr>
              ) : (
                membresias.map((m) => (
                  <tr key={m.id_membresia}>
                    <td>{m.tipo_membresia}</td>
                    <td>{m.modalidad_pago}</td>
                    <td>{utils.money(m.valor)}</td>
                    <td>{utils.fecha(m.fecha_vencimiento)}</td>
                    <td><span className={"badge-g " + utils.badgeClass(m.estado)}>{m.estado}</span></td>
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
    </>
  );
}
