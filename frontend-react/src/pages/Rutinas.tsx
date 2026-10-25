import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Modal } from "react-bootstrap";
import { api } from "../data/api";
import { useTenant } from "../tenant/TenantContext";
import { OBJETIVOS_RUTINA, diasRestantes, normalizar } from "../lib/rutinas";
import { instructorEnSesion } from "../lib/sesionInstructor";
import { Paginador } from "../components/Paginador";
import { ModalDuplicar } from "../components/rutinas/ModalDuplicar";
import { PersonaCliente } from "../components/rutinas/PersonaCliente";
import { FilaTablaRutina } from "../components/rutinas/FilaTablaRutina";
import { RutinasInstructor } from "./RutinasInstructor";
import type { Cliente, EstadoRutina, FilaSupervision, Instructor, ObjetivoRutina, ResumenSupervision } from "../types";

/* [P3] Supervisión de rutinas del admin (KAN-58): /g/:slug/rutinas.
   Arriba 4 indicadores clicables; por defecto la tabla muestra solo lo que "requiere
   atención" (por vencer, vencidas sin renovar y clientes activos sin rutina). Tabla compacta
   paginada con búsqueda y filtros, y a un lado la carga de rutinas vigentes por instructor. */

type Indicador = "" | "VIGENTES" | "POR_VENCER" | "SIN_RUTINA" | "VENCIDAS";
type FiltroEstado = "" | EstadoRutina | "CAMBIOS" | "SIN_RUTINA";

// Una fila de la tabla: una rutina, o un cliente activo sin rutina
type Fila =
  | { tipo: "rutina"; f: FilaSupervision; cliente: Cliente | undefined; instructor: Instructor | undefined }
  | { tipo: "sin"; cliente: Cliente };

const POR_PAGINA = 10;

const INDICADORES: { clave: Exclude<Indicador, "">; titulo: string; icono: string; ayuda: string }[] = [
  { clave: "VIGENTES", titulo: "Vigentes", icono: "bi-check-circle", ayuda: "Con más de 14 días por delante" },
  { clave: "POR_VENCER", titulo: "Por vencer", icono: "bi-hourglass-split", ayuda: "Vencen en menos de 15 días" },
  { clave: "SIN_RUTINA", titulo: "Sin rutina", icono: "bi-person-dash", ayuda: "Clientes activos sin rutina" },
  { clave: "VENCIDAS", titulo: "Vencidas sin renovar", icono: "bi-x-circle", ayuda: "Clientes activos con la rutina vencida" },
];

/* /g/:slug/rutinas la comparten dos roles (no hay guard por rol, KAN-85):
   el instructor ve "Mis rutinas" (B3 · KAN-92) y el resto, la supervisión del admin.
   La decisión va en un componente aparte para no llamar hooks dentro de un if. */
export function Rutinas() {
  const [miCedula] = useState(instructorEnSesion);
  return miCedula !== null ? <RutinasInstructor miCedula={miCedula} /> : <SupervisionRutinas />;
}

function SupervisionRutinas() {
  const { ruta } = useTenant();
  const navigate = useNavigate();

  const [cargando, setCargando] = useState(true);
  const [version, setVersion] = useState(0);
  const [filas, setFilas] = useState<FilaSupervision[]>([]);
  const [resumen, setResumen] = useState<ResumenSupervision | null>(null);
  const [clientes, setClientes] = useState<Cliente[]>([]);
  const [instructores, setInstructores] = useState<Instructor[]>([]);

  const [indicador, setIndicador] = useState<Indicador>("");
  const [soloAtencion, setSoloAtencion] = useState(true);
  const [busqueda, setBusqueda] = useState("");
  const [filtroInstructor, setFiltroInstructor] = useState("");
  const [filtroObjetivo, setFiltroObjetivo] = useState<ObjetivoRutina | "">("");
  const [filtroEstado, setFiltroEstado] = useState<FiltroEstado>("");
  const [pagina, setPagina] = useState(1);

  const [alerta, setAlerta] = useState<{ tipo: "ok" | "error"; mensaje: string } | null>(null);
  const [aFinalizar, setAFinalizar] = useState<FilaSupervision | null>(null);
  const [aDuplicar, setADuplicar] = useState<FilaSupervision | null>(null);
  const [guardando, setGuardando] = useState(false);
  const [errorModal, setErrorModal] = useState("");

  useEffect(() => {
    let activo = true;
    Promise.all([api.rutinas.listaSupervision(), api.rutinas.resumenSupervision(), api.clientes.list(), api.instructores.list()]).then(
      ([f, r, c, i]) => {
        if (!activo) return;
        setFilas(f);
        setResumen(r);
        setClientes(c);
        setInstructores(i);
        setCargando(false);
      }
    );
    return () => {
      activo = false;
    };
  }, [version]);

  useEffect(() => {
    if (!alerta) return;
    const t = setTimeout(() => setAlerta(null), 4000);
    return () => clearTimeout(t);
  }, [alerta]);

  // Cualquier cambio de filtro vuelve a la página 1
  function conPagina1<T>(set: (v: T) => void) {
    return (v: T) => {
      set(v);
      setPagina(1);
    };
  }

  const clienteDe = (cedula: string) => clientes.find((c) => c.numero_identificacion === cedula);
  const instructorDe = (cedula: string) => instructores.find((i) => i.numero_identificacion === cedula);
  const filaRutina = (f: FilaSupervision): Fila => ({ tipo: "rutina", f, cliente: clienteDe(f.rutina.id_cliente), instructor: instructorDe(f.rutina.id_instructor) });
  const vencidas = new Set(resumen?.vencidas_sin_renovar ?? []);
  const sinRutina: Fila[] = (resumen?.sin_rutina ?? [])
    .map((cedula) => clienteDe(cedula))
    .filter((c): c is Cliente => c !== undefined)
    .map((c) => ({ tipo: "sin", cliente: c }));

  // 1) Qué grupo se ve: el indicador elegido, "requieren atención" o todas
  let base: Fila[];
  if (indicador === "VIGENTES") base = filas.filter((f) => f.estado === "VIGENTE").map(filaRutina);
  else if (indicador === "POR_VENCER") base = filas.filter((f) => f.estado === "POR_VENCER").map(filaRutina);
  else if (indicador === "VENCIDAS") base = filas.filter((f) => vencidas.has(f.rutina.id_rutina)).map(filaRutina);
  else if (indicador === "SIN_RUTINA") base = sinRutina;
  // "Requieren atención" solo aplica sin filtro de estado: si se elige un estado se busca en todas
  else if (soloAtencion && filtroEstado === "")
    base = [
      ...filas.filter((f) => f.estado === "POR_VENCER").map(filaRutina),
      ...filas.filter((f) => vencidas.has(f.rutina.id_rutina)).map(filaRutina),
      ...sinRutina,
    ];
  else base = [...filas.map(filaRutina), ...sinRutina];

  // 2) Búsqueda y filtros
  const q = normalizar(busqueda);
  const visibles = base.filter((x) => {
    const c = x.cliente;
    if (q && !(c && normalizar(c.nombre + " " + c.apellidos + " " + c.numero_identificacion).includes(q))) return false;
    if (x.tipo === "sin") return filtroInstructor === "" && filtroObjetivo === "" && (filtroEstado === "" || filtroEstado === "SIN_RUTINA");
    if (filtroInstructor && x.f.rutina.id_instructor !== filtroInstructor) return false;
    if (filtroObjetivo && x.f.rutina.objetivo !== filtroObjetivo) return false;
    if (filtroEstado === "SIN_RUTINA") return false;
    if (filtroEstado === "CAMBIOS") return x.f.cambios_sin_revisar > 0;
    return filtroEstado === "" || x.f.estado === filtroEstado;
  });

  // 3) Orden: primero lo más urgente (por vencer, por días), luego vencidas, después el resto por nombre
  const prioridad = (x: Fila) =>
    x.tipo === "sin" ? 3 : x.f.estado === "POR_VENCER" ? 0 : vencidas.has(x.f.rutina.id_rutina) ? 1 : x.f.estado === "VIGENTE" ? 2 : 4;
  const nombreDe = (x: Fila) => (x.cliente ? x.cliente.nombre + " " + x.cliente.apellidos : "");
  visibles.sort(
    (a, b) =>
      prioridad(a) - prioridad(b) ||
      (a.tipo === "rutina" && b.tipo === "rutina" ? (diasRestantes(a.f.rutina) ?? 9999) - (diasRestantes(b.f.rutina) ?? 9999) : 0) ||
      nombreDe(a).localeCompare(nombreDe(b))
  );

  const totalPaginas = Math.max(1, Math.ceil(visibles.length / POR_PAGINA));
  const paginaSegura = Math.min(pagina, totalPaginas);
  const deLaPagina = visibles.slice((paginaSegura - 1) * POR_PAGINA, paginaSegura * POR_PAGINA);
  const hayFiltros = q !== "" || filtroInstructor !== "" || filtroObjetivo !== "" || filtroEstado !== "" || indicador !== "";

  const conteo: Record<Exclude<Indicador, "">, number> = {
    VIGENTES: resumen?.vigentes ?? 0,
    POR_VENCER: resumen?.por_vencer ?? 0,
    SIN_RUTINA: resumen?.sin_rutina.length ?? 0,
    VENCIDAS: resumen?.vencidas_sin_renovar.length ?? 0,
  };
  const maxCarga = Math.max(1, ...(resumen?.carga ?? []).map((c) => c.vigentes));
  const conVigente = new Set(filas.filter((f) => f.estado === "VIGENTE" || f.estado === "POR_VENCER").map((f) => f.rutina.id_cliente));
  const candidatos = clientes.filter((c) => c.estado === "ACTIVO" && !conVigente.has(c.numero_identificacion));

  function limpiar() {
    setBusqueda("");
    setFiltroInstructor("");
    setFiltroObjetivo("");
    setFiltroEstado("");
    setIndicador("");
    setPagina(1);
  }

  async function confirmarFinalizar() {
    if (!aFinalizar) return;
    setGuardando(true);
    const res = await api.rutinas.finalizar(aFinalizar.rutina.id_rutina);
    setGuardando(false);
    if (!res.ok) {
      setErrorModal(res.mensaje);
      return;
    }
    setAFinalizar(null);
    setAlerta({ tipo: "ok", mensaje: res.mensaje });
    setVersion((v) => v + 1);
  }

  async function confirmarDuplicar(idCliente: string) {
    if (!aDuplicar) return;
    setGuardando(true);
    const res = await api.rutinas.duplicar(aDuplicar.rutina.id_rutina, idCliente);
    setGuardando(false);
    if (!res.ok || !res.data) {
      setErrorModal(res.mensaje);
      return;
    }
    setADuplicar(null);
    navigate(ruta("/rutinas/" + res.data.id_rutina));
  }

  return (
    <>
      <div className="card-head inst-sin-margen">
        <div>
          <h1 className="card-title">Rutinas</h1>
          <p className="card-sub">Supervisión de las rutinas de los clientes del gimnasio</p>
        </div>
        <button className="btn-neon" onClick={() => navigate(ruta("/rutinas/nueva"))}>
          <i className="bi bi-plus-lg me-1" aria-hidden /> Nueva rutina
        </button>
      </div>

      {alerta && <div className={"alert-g show alert-" + alerta.tipo}>{alerta.mensaje}</div>}

      {/* Indicadores clicables: filtran la tabla; otro clic quita el filtro */}
      <div className="inst-kpis">
        {INDICADORES.map((k) => (
          <button
            key={k.clave}
            type="button"
            className={"card-g kpi inst-kpi" + (indicador === k.clave ? " activo" : "") + (k.clave !== "VIGENTES" && conteo[k.clave] > 0 ? " alerta" : "")}
            onClick={() => conPagina1(setIndicador)(indicador === k.clave ? "" : k.clave)}
            aria-pressed={indicador === k.clave}
          >
            <span className="kpi-label"><i className={"bi " + k.icono} aria-hidden /> {k.titulo}</span>
            <span className="kpi-value">{cargando ? "…" : conteo[k.clave]}</span>
            <span className="kpi-sub">{k.ayuda}</span>
          </button>
        ))}
      </div>

      <div className="inst-sup">
        <section className="card-g">
          <div className="toolbar mb-3">
            {indicador === "" ? (
              <div className="inst-seg" role="group" aria-label="Qué mostrar">
                <button type="button" className={soloAtencion && filtroEstado === "" ? "activo" : ""} onClick={() => conPagina1(setSoloAtencion)(true)}>
                  Requieren atención
                </button>
                <button type="button" className={!soloAtencion || filtroEstado !== "" ? "activo" : ""} onClick={() => conPagina1(setSoloAtencion)(false)}>
                  Todas
                </button>
              </div>
            ) : (
              <span className="inst-chip">
                {INDICADORES.find((k) => k.clave === indicador)?.titulo}
                <button type="button" title="Quitar" onClick={() => conPagina1(setIndicador)("")}><i className="bi bi-x" aria-hidden /></button>
              </span>
            )}
            <div className="search-box">
              <span className="search-ico"><i className="bi bi-search" aria-hidden /></span>
              <input
                type="search"
                className="form-control-dark"
                placeholder="Buscar cliente o cédula…"
                aria-label="Buscar cliente o cédula"
                value={busqueda}
                onChange={(e) => conPagina1(setBusqueda)(e.target.value)}
              />
            </div>
            <select className="form-control-dark" style={{ width: "auto" }} aria-label="Instructor" value={filtroInstructor} onChange={(e) => conPagina1(setFiltroInstructor)(e.target.value)}>
              <option value="">Todos los instructores</option>
              {instructores.map((i) => (
                <option key={i.numero_identificacion} value={i.numero_identificacion}>{i.nombre} {i.apellidos}</option>
              ))}
            </select>
            <select className="form-control-dark" style={{ width: "auto" }} aria-label="Objetivo" value={filtroObjetivo} onChange={(e) => conPagina1(setFiltroObjetivo)(e.target.value as ObjetivoRutina | "")}>
              <option value="">Todos los objetivos</option>
              {OBJETIVOS_RUTINA.map((o) => <option key={o} value={o}>{o}</option>)}
            </select>
            <select className="form-control-dark" style={{ width: "auto" }} aria-label="Estado" value={filtroEstado} onChange={(e) => conPagina1(setFiltroEstado)(e.target.value as FiltroEstado)}>
              <option value="">Todos los estados</option>
              <option value="VIGENTE">Vigente</option>
              <option value="POR_VENCER">Por vencer</option>
              <option value="VENCIDA">Vencida</option>
              <option value="FINALIZADA">Finalizada</option>
              <option value="CAMBIOS">Cambios por revisar</option>
              <option value="SIN_RUTINA">Sin rutina</option>
            </select>
            {hayFiltros && <button className="btn-dark" onClick={limpiar}>Limpiar</button>}
          </div>

          <div className="table-wrap">
            <table className="table-g tabla-stack inst-tabla-sup">
              <thead>
                <tr>
                  <th>Cliente</th><th>Rutina</th><th>Instructor</th><th>Sesiones</th><th>Vigencia</th><th>Avance</th><th></th>
                </tr>
              </thead>
              <tbody>
                {cargando ? (
                  <tr><td colSpan={7} className="loader"><span className="spinner-g"></span>Cargando...</td></tr>
                ) : deLaPagina.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="empty-state">
                      {filas.length === 0 && sinRutina.length === 0
                        ? "Todavía no hay rutinas ni clientes activos."
                        : soloAtencion && !hayFiltros
                        ? "Nada requiere atención: todas las rutinas están al día."
                        : "Ninguna fila coincide con la búsqueda o los filtros."}
                    </td>
                  </tr>
                ) : (
                  deLaPagina.map((x) =>
                    x.tipo === "sin" ? (
                      <tr key={"sin-" + x.cliente.numero_identificacion}>
                        <td data-label="Cliente"><PersonaCliente cliente={x.cliente} /></td>
                        <td data-label="Rutina" colSpan={5}><span className="card-sub">Sin rutina vigente</span></td>
                        <td>
                          <button className="btn-neon inst-btn-sm" onClick={() => navigate(ruta("/rutinas/nueva?cliente=" + x.cliente.numero_identificacion))}>
                            <i className="bi bi-plus-lg me-1" aria-hidden /> Asignar rutina
                          </button>
                        </td>
                      </tr>
                    ) : (
                      <FilaTablaRutina
                        key={x.f.rutina.id_rutina}
                        f={x.f}
                        cliente={x.cliente}
                        instructor={x.instructor}
                        renovable={vencidas.has(x.f.rutina.id_rutina)}
                        onFinalizar={() => { setErrorModal(""); setAFinalizar(x.f); }}
                        onRenovar={() => navigate(ruta("/rutinas/nueva?cliente=" + x.f.rutina.id_cliente))}
                        onDuplicar={() => { setErrorModal(""); setADuplicar(x.f); }}
                      />
                    )
                  )
                )}
              </tbody>
            </table>
          </div>
          <Paginador pagina={paginaSegura} total={visibles.length} porPagina={POR_PAGINA} onCambiar={setPagina} />
        </section>

        {/* Carga por instructor: clic filtra la tabla por ese instructor */}
        <aside className="card-g inst-carga">
          <h2 className="card-title">Carga por instructor</h2>
          <p className="card-sub">Rutinas vigentes de cada instructor activo</p>
          {(resumen?.carga ?? []).map((c) => (
            <button
              key={c.id_instructor}
              type="button"
              className={"inst-carga-fila" + (filtroInstructor === c.id_instructor ? " activo" : "")}
              onClick={() => conPagina1(setFiltroInstructor)(filtroInstructor === c.id_instructor ? "" : c.id_instructor)}
            >
              <span className="inst-carga-nombre">{c.nombre}</span>
              <span className="kpi-bar"><span style={{ width: (c.vigentes / maxCarga) * 100 + "%" }}></span></span>
              <span className="inst-carga-num">{c.vigentes}</span>
            </button>
          ))}
        </aside>
      </div>

      <Modal show={aFinalizar !== null} onHide={() => setAFinalizar(null)} centered>
        <Modal.Header closeButton><Modal.Title>Finalizar rutina</Modal.Title></Modal.Header>
        <Modal.Body>
          {errorModal && <div className="alert-g alert-error show">{errorModal}</div>}
          <p>¿Finalizar «{aFinalizar?.rutina.nombre}»? Queda en el historial del cliente y podrá recibir una rutina nueva hoy mismo.</p>
        </Modal.Body>
        <Modal.Footer>
          <button className="btn-dark" onClick={() => setAFinalizar(null)}>Cancelar</button>
          <button className="btn-neon" disabled={guardando} onClick={confirmarFinalizar}><i className="bi bi-flag me-1" aria-hidden /> Sí, finalizar</button>
        </Modal.Footer>
      </Modal>
      <ModalDuplicar
        show={aDuplicar !== null}
        nombreRutina={aDuplicar?.rutina.nombre ?? ""}
        candidatos={candidatos}
        guardando={guardando}
        error={errorModal}
        onConfirmar={confirmarDuplicar}
        onCerrar={() => setADuplicar(null)}
      />
    </>
  );
}
