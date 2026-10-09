import { useEffect, useState } from "react";
import { Modal } from "react-bootstrap";
import { api } from "../data/api";
import { utils } from "../lib/utils";
import type { Cliente, Membresia, MembresiaNueva } from "../types";

type FormMembresia = Omit<MembresiaNueva, "valor" | "estado" | "id_plan"> & { valor: string; id_plan: number | null };

const VACIO: FormMembresia = {
  id_cliente: "",
  tipo_membresia: "",
  modalidad_pago: "MENSUAL",
  valor: "",
  fecha_inicio: "",
  fecha_vencimiento: "",
  id_plan: null,
};

export function Membresias() {
  const [show, setShow] = useState(false);
  const [editandoId, setEditandoId] = useState<number | null>(null);
  const [form, setForm] = useState<FormMembresia>(VACIO);
  const [guardando, setGuardando] = useState(false);
  const [errorForm, setErrorForm] = useState("");
  const [exito, setExito] = useState("");
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

  function abrirNueva() {
    setEditandoId(null);
    setForm(VACIO);
    setErrorForm("");
    setExito("");
    setShow(true);
  }

  function abrirEdicion(membresia: Membresia) {
    setEditandoId(membresia.id_membresia);
    setForm({
      id_cliente: membresia.id_cliente,
      tipo_membresia: membresia.tipo_membresia,
      modalidad_pago: membresia.modalidad_pago,
      valor: String(membresia.valor),
      fecha_inicio: membresia.fecha_inicio,
      fecha_vencimiento: membresia.fecha_vencimiento,
      id_plan: membresia.id_plan,
    });
    setErrorForm("");
    setExito("");
    setShow(true);
  }

  function cerrarModal() {
    if (guardando) return;
    setEditandoId(null);
    setShow(false);
    setForm(VACIO);
    setErrorForm("");
  }

  function setCampo<K extends keyof FormMembresia>(campo: K, valor: FormMembresia[K]) {
    setForm((actual) => ({ ...actual, [campo]: valor }));
  }

  async function guardar() {
    if (guardando) return;
    if (!form.id_cliente || !clientesPorId.has(form.id_cliente)) {
      setErrorForm("Selecciona un cliente existente.");
      return;
    }
    if (!form.tipo_membresia.trim()) {
      setErrorForm("El tipo de membres\u00eda es obligatorio.");
      return;
    }
    const valor = Number(form.valor);
    if (!Number.isFinite(valor) || valor <= 0) {
      setErrorForm("El valor debe ser un n\u00famero mayor que 0.");
      return;
    }
    if (!form.fecha_inicio || !form.fecha_vencimiento) {
      setErrorForm("Completa las fechas de inicio y vencimiento.");
      return;
    }
    if (utils.isoDate(form.fecha_inicio) !== form.fecha_inicio ||
        utils.isoDate(form.fecha_vencimiento) !== form.fecha_vencimiento) {
      setErrorForm("Ingresa fechas v\u00e1lidas.");
      return;
    }
    if (form.fecha_vencimiento <= form.fecha_inicio) {
      setErrorForm("La fecha de vencimiento debe ser posterior a la fecha de inicio.");
      return;
    }

    setGuardando(true);
    setErrorForm("");
    try {
      const estado: Membresia["estado"] = form.fecha_vencimiento < utils.isoDate() ? "VENCIDA" : "ACTIVA";
      const datos = {
        ...form,
        tipo_membresia: form.tipo_membresia.trim(),
        valor,
        estado,
      };
      const respuesta = editandoId === null
        ? await api.membresias.create(datos)
        : await api.membresias.update(editandoId, datos);
      if (!respuesta.ok) {
        setErrorForm(respuesta.mensaje || "No se pudo guardar la membres\u00eda.");
        return;
      }
      if (respuesta.data) {
        const guardada = respuesta.data;
        setMembresias((actuales) => editandoId === null
          ? [...actuales, guardada]
          : actuales.map((membresia) => membresia.id_membresia === editandoId ? guardada : membresia));
      } else {
        setMembresias(await api.membresias.list());
      }
      setError("");
      setShow(false);
      setForm(VACIO);
      setEditandoId(null);
      setExito(respuesta.mensaje || (editandoId === null ? "Membres\u00eda registrada correctamente." : "Membres\u00eda actualizada correctamente."));
    } catch {
      setErrorForm("No se pudo guardar la membres\u00eda. Intenta nuevamente.");
    } finally {
      setGuardando(false);
    }
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
        <button className="btn-neon" onClick={abrirNueva} disabled={cargando}>+ Nueva membresía</button>
      </div>
      {exito && <div className="alert-g alert-ok show" role="status">{exito}</div>}
      {avisoClientes && !error && (
        <div className="alert-g alert-error show" role="alert">{avisoClientes}</div>
      )}

      <div className="toolbar membresias-filtros mb-3">
        <div className="membresias-busqueda">
          <label className="form-label-g" htmlFor="membresias-busqueda">Buscar</label>
          <div className="search-box">
            <span className="search-ico" aria-hidden="true"><i className="bi bi-search"></i></span>
            <input
              id="membresias-busqueda"
              type="search"
              className="form-control-dark"
              aria-label="Buscar por nombre o identificación del cliente o tipo de membresía"
              placeholder="Cliente, identificación o tipo de membresía..."
              value={busqueda}
              onChange={(e) => setBusqueda(e.target.value)}
            />
          </div>
        </div>
        <div className="membresias-filtro">
          <label className="form-label-g" htmlFor="membresias-estado">Estado</label>
          <select
            id="membresias-estado"
            className="form-control-dark"
            value={filtroEstado}
            onChange={(e) => setFiltroEstado(e.target.value as Membresia["estado"] | "")}
          >
            <option value="">Todas</option>
            <option value="ACTIVA">ACTIVA</option>
            <option value="VENCIDA">VENCIDA</option>
          </select>
        </div>
        <div className="membresias-filtro">
          <label className="form-label-g" htmlFor="membresias-modalidad">Modalidad</label>
          <select
            id="membresias-modalidad"
            className="form-control-dark"
            value={filtroModalidad}
            onChange={(e) => setFiltroModalidad(e.target.value as Membresia["modalidad_pago"] | "")}
          >
            <option value="">Todas</option>
            <option value="MENSUAL">MENSUAL</option>
            <option value="ANUAL">ANUAL</option>
          </select>
        </div>
        {hayFiltros && <button className="btn-dark membresias-limpiar" onClick={limpiarFiltros}>Limpiar filtros</button>}
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
              <th scope="col">Acciones</th>
            </tr>
          </thead>
          <tbody>
            {cargando ? (
              <tr>
                <td colSpan={9} className="loader" role="status">
                  <span className="spinner-g" aria-hidden="true"></span>Cargando...
                </td>
              </tr>
            ) : error ? (
              <tr><td colSpan={9}><div className="alert-g alert-error show" role="alert">{error}</div></td></tr>
            ) : membresias.length === 0 ? (
              <tr><td colSpan={9} className="empty-state">No hay membresías registradas.</td></tr>
            ) : filtradas.length === 0 ? (
              <tr><td colSpan={9} className="empty-state">No hay membresías que coincidan con los filtros.</td></tr>
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
                    <td>
                      <div className="cell-actions">
                      <button
                        type="button"
                        className="btn-icon"
                        title="Editar"
                        aria-label={`Editar membresía ${membresia.id_membresia}`}
                        onClick={() => abrirEdicion(membresia)}
                      >
                        <i className="bi bi-pencil" aria-hidden="true"></i>
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
      <Modal show={show} onHide={cerrarModal} backdrop={guardando ? "static" : true} keyboard={!guardando} centered size="lg">
        <Modal.Header closeButton={!guardando}>
          <Modal.Title>{editandoId === null ? "Nueva membresía" : "Editar membresía"}</Modal.Title>
        </Modal.Header>
        <form onSubmit={(e) => { e.preventDefault(); void guardar(); }} noValidate>
          <Modal.Body>
            {errorForm && <div className="alert-g alert-error show" role="alert">{errorForm}</div>}
            <fieldset disabled={guardando} className="border-0 p-0 m-0">
              <div className="row g-3">
            <div className="col-12">
              <label className="form-label-g" htmlFor="nueva-membresia-cliente">Cliente *</label>
              <select id="nueva-membresia-cliente" className="form-control-dark" value={form.id_cliente} onChange={(e) => setCampo("id_cliente", e.target.value)} required>
                <option value="">Selecciona un cliente</option>
                {clientes.map((cliente) => (
                  <option key={cliente.numero_identificacion} value={cliente.numero_identificacion}>
                    {cliente.nombre} {cliente.apellidos} - {cliente.numero_identificacion}
                  </option>
                ))}
              </select>
              {clientes.length === 0 && <p className="card-sub mt-2">{avisoClientes || "No hay clientes disponibles para registrar una membresía."}</p>}
            </div>
            <div className="col-md-6">
              <label className="form-label-g" htmlFor="nueva-membresia-tipo_membresia">Tipo de membresía *</label>
              <input id="nueva-membresia-tipo_membresia" type="text" className="form-control-dark" value={form.tipo_membresia} onChange={(e) => setCampo("tipo_membresia", e.target.value)} required />
            </div>
            <div className="col-md-6">
              <label className="form-label-g" htmlFor="nueva-membresia-modalidad_pago">Modalidad de pago *</label>
              <select id="nueva-membresia-modalidad_pago" className="form-control-dark" value={form.modalidad_pago} onChange={(e) => setCampo("modalidad_pago", e.target.value as Membresia["modalidad_pago"])} required>
                  <option value="MENSUAL">MENSUAL</option>
                  <option value="ANUAL">ANUAL</option>
                </select>
            </div>
            <div className="col-md-6">
              <label className="form-label-g" htmlFor="nueva-membresia-valor">Valor *</label>
              <input id="nueva-membresia-valor" type="number" min="0.01" step="0.01" className="form-control-dark" value={form.valor} onChange={(e) => setCampo("valor", e.target.value)} required />
            </div>
            <div className="col-md-6">
              <label className="form-label-g" htmlFor="nueva-membresia-fecha_inicio">Fecha de inicio *</label>
              <input id="nueva-membresia-fecha_inicio" type="date" className="form-control-dark" value={form.fecha_inicio} onChange={(e) => setCampo("fecha_inicio", e.target.value)} required />
            </div>
            <div className="col-md-6">
              <label className="form-label-g" htmlFor="nueva-membresia-fecha_vencimiento">Fecha de vencimiento *</label>
              <input id="nueva-membresia-fecha_vencimiento" type="date" className="form-control-dark" value={form.fecha_vencimiento} onChange={(e) => setCampo("fecha_vencimiento", e.target.value)} required />
            </div>
              </div>
            </fieldset>
          </Modal.Body>
          <Modal.Footer>
            <button type="button" className="btn-dark" disabled={guardando} onClick={cerrarModal}>Cancelar</button>
            <button type="submit" className="btn-neon" disabled={guardando || clientes.length === 0}>
              {guardando ? "Guardando..." : editandoId === null ? "Guardar membresía" : "Guardar cambios"}
            </button>
          </Modal.Footer>
        </form>
      </Modal>
    </section>
  );
}
