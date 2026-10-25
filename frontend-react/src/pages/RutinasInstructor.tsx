import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Modal } from "react-bootstrap";
import { api } from "../data/api";
import { useTenant } from "../tenant/TenantContext";
import { OBJETIVOS_RUTINA, alumnosDeInstructor, diasRestantes, esActiva, normalizar } from "../lib/rutinas";
import { Paginador } from "../components/Paginador";
import { FilaTablaRutina } from "../components/rutinas/FilaTablaRutina";
import { ModalDuplicar } from "../components/rutinas/ModalDuplicar";
import type { Cliente, EstadoRutina, FilaSupervision, ObjetivoRutina } from "../types";

/* [P3] B3 · KAN-92 — "Mis rutinas": /g/:slug/rutinas cuando entra un INSTRUCTOR.
   Solo sus rutinas. Arriba 4 indicadores clicables (vigentes, por vencer, vencidas sin
   renovar y cambios del cliente); por defecto la tabla muestra las ACTIVAS (vigentes, por
   vencer y vencidas sin renovar) y "Historial" agrega las finalizadas y las ya renovadas. */

type Indicador = "" | "VIGENTES" | "POR_VENCER" | "VENCIDAS" | "CAMBIOS";
type FiltroEstado = "" | EstadoRutina;

const POR_PAGINA = 10;

const INDICADORES: { clave: Exclude<Indicador, "">; titulo: string; icono: string; ayuda: string }[] = [
  { clave: "VIGENTES", titulo: "Vigentes", icono: "bi-check-circle", ayuda: "Con más de 14 días por delante" },
  { clave: "POR_VENCER", titulo: "Por vencer", icono: "bi-hourglass-split", ayuda: "Vencen en menos de 15 días" },
  { clave: "VENCIDAS", titulo: "Vencidas sin renovar", icono: "bi-x-circle", ayuda: "Alumnos activos con la rutina vencida" },
  { clave: "CAMBIOS", titulo: "Cambios por revisar", icono: "bi-person-exclamation", ayuda: "Ejercicios que cambió el cliente" },
];

type Props = { miCedula: string };

export function RutinasInstructor({ miCedula }: Props) {
  const { ruta } = useTenant();
  const navigate = useNavigate();

  const [cargando, setCargando] = useState(true);
  const [version, setVersion] = useState(0);
  const [filas, setFilas] = useState<FilaSupervision[]>([]);
  const [clientes, setClientes] = useState<Cliente[]>([]);

  const [indicador, setIndicador] = useState<Indicador>("");
  const [historial, setHistorial] = useState(false);
  const [busqueda, setBusqueda] = useState("");
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
    Promise.all([api.rutinas.listaSupervision(), api.clientes.list()]).then(([f, c]) => {
      if (!activo) return;
      setFilas(f);
      setClientes(c);
      setCargando(false);
    });
    return () => {
      activo = false;
    };
  }, [version]);

  useEffect(() => {
    if (!alerta) return;
    const t = setTimeout(() => setAlerta(null), 4000);
    return () => clearTimeout(t);
  }, [alerta]);

  function conPagina1<T>(set: (v: T) => void) {
    return (v: T) => {
      set(v);
      setPagina(1);
    };
  }

  const clienteDe = (cedula: string) => clientes.find((c) => c.numero_identificacion === cedula);
  const mias = filas.filter((f) => f.rutina.id_instructor === miCedula);
  // Las vencidas que importan son las de alumnos (última rutina, cliente activo): misma regla que Alumnos y el dashboard
  const alumnos = alumnosDeInstructor(filas, clientes, miCedula);
  const vencidas = new Set(alumnos.filter((a) => a.motivos.includes("VENCIDA")).map((a) => a.fila.rutina.id_rutina));

  const grupos: Record<Exclude<Indicador, "">, FilaSupervision[]> = {
    VIGENTES: mias.filter((f) => f.estado === "VIGENTE"),
    POR_VENCER: mias.filter((f) => f.estado === "POR_VENCER"),
    VENCIDAS: mias.filter((f) => vencidas.has(f.rutina.id_rutina)),
    CAMBIOS: mias.filter((f) => esActiva(f) && f.cambios_sin_revisar > 0),
  };

  // 1) Qué grupo se ve: el indicador elegido, las activas (por defecto) o todo el historial
  let base: FilaSupervision[];
  if (indicador !== "") base = grupos[indicador];
  else if (historial || filtroEstado !== "") base = mias;
  else base = mias.filter((f) => esActiva(f) || vencidas.has(f.rutina.id_rutina));

  // 2) Búsqueda y filtros
  const q = normalizar(busqueda);
  const visibles = base.filter((f) => {
    const c = clienteDe(f.rutina.id_cliente);
    if (q && !(c && normalizar(c.nombre + " " + c.apellidos + " " + c.numero_identificacion).includes(q))) return false;
    if (filtroObjetivo && f.rutina.objetivo !== filtroObjetivo) return false;
    return filtroEstado === "" || f.estado === filtroEstado;
  });

  // 3) Orden: por vencer primero (las que vencen antes), luego vencidas, vigentes y el resto
  const prioridad = (f: FilaSupervision) =>
    f.estado === "POR_VENCER" ? 0 : vencidas.has(f.rutina.id_rutina) ? 1 : f.estado === "VIGENTE" ? 2 : 3;
  visibles.sort(
    (a, b) =>
      prioridad(a) - prioridad(b) ||
      (diasRestantes(a.rutina) ?? 9999) - (diasRestantes(b.rutina) ?? 9999) ||
      b.rutina.fecha_creacion.localeCompare(a.rutina.fecha_creacion)
  );

  const totalPaginas = Math.max(1, Math.ceil(visibles.length / POR_PAGINA));
  const paginaSegura = Math.min(pagina, totalPaginas);
  const deLaPagina = visibles.slice((paginaSegura - 1) * POR_PAGINA, paginaSegura * POR_PAGINA);
  const hayFiltros = q !== "" || filtroObjetivo !== "" || filtroEstado !== "" || indicador !== "";

  const conVigente = new Set(filas.filter(esActiva).map((f) => f.rutina.id_cliente));
  const candidatos = clientes.filter((c) => c.estado === "ACTIVO" && !conVigente.has(c.numero_identificacion));

  function limpiar() {
    setBusqueda("");
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
          <h1 className="card-title">Mis rutinas</h1>
          <p className="card-sub">Rutinas que asignaste a tus alumnos</p>
        </div>
        <button className="btn-neon" onClick={() => navigate(ruta("/rutinas/nueva"))}>
          <i className="bi bi-plus-lg me-1" aria-hidden /> Nueva rutina
        </button>
      </div>

      {alerta && <div className={"alert-g show alert-" + alerta.tipo}>{alerta.mensaje}</div>}

      <div className="inst-kpis">
        {INDICADORES.map((k) => (
          <button
            key={k.clave}
            type="button"
            className={"card-g kpi inst-kpi" + (indicador === k.clave ? " activo" : "") + (k.clave !== "VIGENTES" && grupos[k.clave].length > 0 ? " alerta" : "")}
            onClick={() => conPagina1(setIndicador)(indicador === k.clave ? "" : k.clave)}
            aria-pressed={indicador === k.clave}
          >
            <span className="kpi-label"><i className={"bi " + k.icono} aria-hidden /> {k.titulo}</span>
            <span className="kpi-value">{cargando ? "…" : grupos[k.clave].length}</span>
            <span className="kpi-sub">{k.ayuda}</span>
          </button>
        ))}
      </div>

      <section className="card-g">
        <div className="toolbar mb-3">
          {indicador === "" ? (
            <div className="inst-seg" role="group" aria-label="Qué mostrar">
              <button type="button" className={!historial && filtroEstado === "" ? "activo" : ""} onClick={() => conPagina1(setHistorial)(false)}>
                Activas
              </button>
              <button type="button" className={historial || filtroEstado !== "" ? "activo" : ""} onClick={() => conPagina1(setHistorial)(true)}>
                Historial
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
              placeholder="Buscar alumno o cédula…"
              aria-label="Buscar alumno o cédula"
              value={busqueda}
              onChange={(e) => conPagina1(setBusqueda)(e.target.value)}
            />
          </div>
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
          </select>
          {hayFiltros && <button className="btn-dark" onClick={limpiar}>Limpiar</button>}
        </div>

        <div className="table-wrap">
          <table className="table-g tabla-stack inst-tabla-sup">
            <thead>
              <tr>
                <th>Alumno</th><th>Rutina</th><th>Sesiones</th><th>Vigencia</th><th>Avance</th><th></th>
              </tr>
            </thead>
            <tbody>
              {cargando ? (
                <tr><td colSpan={6} className="loader"><span className="spinner-g"></span>Cargando...</td></tr>
              ) : deLaPagina.length === 0 ? (
                <tr>
                  <td colSpan={6} className="empty-state">
                    {mias.length === 0
                      ? "Todavía no has asignado rutinas. Usa «Nueva rutina» para crear la primera."
                      : "Ninguna rutina coincide con la búsqueda o los filtros."}
                  </td>
                </tr>
              ) : (
                deLaPagina.map((f) => (
                  <FilaTablaRutina
                    key={f.rutina.id_rutina}
                    f={f}
                    cliente={clienteDe(f.rutina.id_cliente)}
                    instructor={null}
                    renovable={vencidas.has(f.rutina.id_rutina)}
                    onFinalizar={() => { setErrorModal(""); setAFinalizar(f); }}
                    onRenovar={() => navigate(ruta("/rutinas/nueva?cliente=" + f.rutina.id_cliente))}
                    onDuplicar={() => { setErrorModal(""); setADuplicar(f); }}
                  />
                ))
              )}
            </tbody>
          </table>
        </div>
        <Paginador pagina={paginaSegura} total={visibles.length} porPagina={POR_PAGINA} onCambiar={setPagina} />
      </section>

      <Modal show={aFinalizar !== null} onHide={() => setAFinalizar(null)} centered>
        <Modal.Header closeButton><Modal.Title>Finalizar rutina</Modal.Title></Modal.Header>
        <Modal.Body>
          {errorModal && <div className="alert-g alert-error show">{errorModal}</div>}
          <p>¿Finalizar «{aFinalizar?.rutina.nombre}»? Queda en el historial del alumno y podrá recibir una rutina nueva hoy mismo.</p>
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
