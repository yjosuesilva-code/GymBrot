import { useEffect, useState } from "react";
import { api } from "../data/api";
import { utils } from "../lib/utils";
import type { Cliente, Membresia } from "../types";

export function Membresias() {
  const [membresias, setMembresias] = useState<Membresia[]>([]);
  const [clientes, setClientes] = useState<Cliente[]>([]);
  const [busqueda, setBusqueda] = useState("");
  const [filtroEstado, setFiltroEstado] = useState<Membresia["estado"] | "">("");
  const [filtroModalidad, setFiltroModalidad] = useState<Membresia["modalidad_pago"] | "">("");
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState("");
  const [avisoClientes, setAvisoClientes] = useState("");

  useEffect(() => {
    let activo = true;
    Promise.allSettled([api.membresias.list(), api.clientes.list()])
      .then(([resultadoMembresias, resultadoClientes]) => {
        if (!activo) return;
        if (resultadoMembresias.status === "fulfilled") {
          setMembresias(resultadoMembresias.value);
        } else {
          setError("No se pudieron cargar las membres\u00edas. Intenta nuevamente recargando la p\u00e1gina.");
        }
        if (resultadoClientes.status === "fulfilled") {
          setClientes(resultadoClientes.value);
        } else {
          setAvisoClientes("No se pudieron cargar los nombres de los clientes. Se muestran sus identificaciones.");
        }
        setCargando(false);
      });
    return () => { activo = false; };
  }, []);

  const clientesPorId = new Map(clientes.map((cliente) => [cliente.numero_identificacion, cliente]));
  const normalizar = (texto: string) => texto.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
  const consulta = normalizar(busqueda.trim());
  const filtradas = membresias.filter((membresia) => {
    const cliente = clientesPorId.get(membresia.id_cliente);
    const nombreCliente = cliente ? [cliente.nombre, cliente.apellidos].join(" ") : "";
    const coincideBusqueda = [nombreCliente, membresia.id_cliente, membresia.tipo_membresia]
      .some((texto) => normalizar(texto).includes(consulta));
    return coincideBusqueda &&
      (!filtroEstado || membresia.estado === filtroEstado) &&
      (!filtroModalidad || membresia.modalidad_pago === filtroModalidad);
  });
  const hayFiltros = busqueda !== "" || filtroEstado !== "" || filtroModalidad !== "";

  function limpiarFiltros() {
    setBusqueda("");
    setFiltroEstado("");
    setFiltroModalidad("");
  }

  return (
    <section className="card-g">
      <div className="card-head">
        <div>
          <h1 className="card-title">Membresías</h1>
          <p className="card-sub">
            Gestiona las membresías de los clientes del gimnasio
          </p>
        </div>
      </div>
      {avisoClientes && !error && (
        <div className="alert-g alert-error show" role="alert">{avisoClientes}</div>
      )}

      <div className="toolbar mb-3">
        <div className="search-box">
          <span className="search-ico" aria-hidden="true">{"\u{1F50D}"}</span>
          <input
            type="search"
            className="form-control-dark"
            aria-label="Buscar por nombre o identificación del cliente o tipo de membresía"
            placeholder="Buscar por cliente, identificación o tipo de membresía..."
            value={busqueda}
            onChange={(e) => setBusqueda(e.target.value)}
          />
        </div>
        <select
          className="form-control-dark w-auto"
          aria-label="Filtrar por estado"
          value={filtroEstado}
          onChange={(e) => setFiltroEstado(e.target.value as Membresia["estado"] | "")}
        >
          <option value="">Todas (estado)</option>
          <option value="ACTIVA">ACTIVA</option>
          <option value="VENCIDA">VENCIDA</option>
        </select>
        <select
          className="form-control-dark w-auto"
          aria-label="Filtrar por modalidad de pago"
          value={filtroModalidad}
          onChange={(e) => setFiltroModalidad(e.target.value as Membresia["modalidad_pago"] | "")}
        >
          <option value="">Todas (modalidad de pago)</option>
          <option value="MENSUAL">MENSUAL</option>
          <option value="ANUAL">ANUAL</option>
        </select>
        {hayFiltros && <button className="btn-dark" onClick={limpiarFiltros}>Limpiar filtros</button>}
      </div>

      <div className="table-wrap">
        <table className="table-g" aria-label="Listado de membresías" aria-busy={cargando}>
          <thead>
            <tr>
              <th scope="col">ID</th>
              <th scope="col">Cliente</th>
              <th scope="col">Tipo de membresía</th>
              <th scope="col">Modalidad de pago</th>
              <th scope="col">Valor</th>
              <th scope="col">Fecha de inicio</th>
              <th scope="col">Fecha de vencimiento</th>
              <th scope="col">Estado</th>
            </tr>
          </thead>
          <tbody>
            {cargando ? (
              <tr>
                <td colSpan={8} className="loader" role="status">
                  <span className="spinner-g" aria-hidden="true"></span>Cargando...
                </td>
              </tr>
            ) : error ? (
              <tr><td colSpan={8}><div className="alert-g alert-error show" role="alert">{error}</div></td></tr>
            ) : membresias.length === 0 ? (
              <tr><td colSpan={8} className="empty-state">No hay membresías registradas.</td></tr>
            ) : filtradas.length === 0 ? (
              <tr><td colSpan={8} className="empty-state">No hay membresías que coincidan con los filtros.</td></tr>
            ) : (
              filtradas.map((membresia) => {
                const cliente = clientesPorId.get(membresia.id_cliente);
                return (
                  <tr key={membresia.id_membresia}>
                    <td>{membresia.id_membresia}</td>
                    <td>{cliente ? [cliente.nombre, cliente.apellidos].join(" ").trim() || membresia.id_cliente : membresia.id_cliente}</td>
                    <td>{membresia.tipo_membresia}</td>
                    <td>{membresia.modalidad_pago}</td>
                    <td>{utils.money(membresia.valor)}</td>
                    <td>{utils.fecha(membresia.fecha_inicio)}</td>
                    <td>{utils.fecha(membresia.fecha_vencimiento)}</td>
                    <td><span className={"badge-g " + utils.badgeClass(membresia.estado)}>{membresia.estado}</span></td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </section>
  );
}
