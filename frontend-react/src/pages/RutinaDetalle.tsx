import { Fragment, useEffect, useState } from "react";
import { instructorEnSesion } from "../lib/sesionInstructor";
import { Link, useNavigate, useParams } from "react-router-dom";
import { Modal } from "react-bootstrap";
import { api } from "../data/api";
import { useTenant } from "../tenant/TenantContext";
import { utils } from "../lib/utils";
import { formatoRealizado, idealAHoy, resumenSesion, textoVigencia } from "../lib/rutinas";
import { Paginador } from "../components/Paginador";
import { AvanceRutina } from "../components/rutinas/AvanceRutina";
import { BadgeEstadoRutina } from "../components/rutinas/BadgeEstadoRutina";
import { FilaEjercicio } from "../components/rutinas/FilaEjercicio";
import { PestanasSesion } from "../components/rutinas/PestanasSesion";
import { ModalDuplicar } from "../components/rutinas/ModalDuplicar";
import { ModalRegistrarSesion } from "../components/rutinas/ModalRegistrarSesion";
import type {
  Cliente,
  Ejercicio,
  FilaSupervision,
  Instructor,
  LetraSesion,
  Membresia,
  RegistroEntrenamiento,
  RegistroNuevo,
  RutinaEjercicio,
} from "../types";

/* [P3] Detalle de una rutina (KAN-57): /g/:slug/rutinas/:id.
   Encabezado del cliente, avance "12 de 19", siguiente sesión, sesiones con sus ejercicios,
   historial de sesiones registradas y rutinas anteriores del cliente.
   Acciones: registrar sesión, editar, duplicar, finalizar y eliminar. */

type Datos = {
  fila: FilaSupervision;
  cliente: Cliente | null;
  membresia: Membresia | null;
  instructor: Instructor | null;
  sesiones: { sesion: LetraSesion; ejercicios: RutinaEjercicio[] }[];
  registros: RegistroEntrenamiento[];
  anteriores: FilaSupervision[];
  candidatos: Cliente[];
  instructores: Instructor[];
  catalogo: Ejercicio[];
};

type Alerta = { tipo: "ok" | "error"; mensaje: string };
const POR_PAGINA = 8;

export function RutinaDetalle() {
  const { ruta } = useTenant();
  const navigate = useNavigate();
  const { id } = useParams();
  const idRutina = Number(id);

  const [datos, setDatos] = useState<Datos | null>(null);
  const [cargando, setCargando] = useState(true);
  const [version, setVersion] = useState(0); // subirla vuelve a cargar todo
  const [activa, setActiva] = useState<LetraSesion>("A");
  const [pagina, setPagina] = useState(1);
  const [registroAbierto, setRegistroAbierto] = useState<number | null>(null); // KAN-98: fila del historial expandida
  const [alerta, setAlerta] = useState<Alerta | null>(null);

  // Modales
  const [registrar, setRegistrar] = useState(false);
  const [duplicar, setDuplicar] = useState(false);
  const [finalizar, setFinalizar] = useState(false);
  const [eliminar, setEliminar] = useState(false);
  const [guardando, setGuardando] = useState(false);
  const [errorModal, setErrorModal] = useState("");
  // B3 · KAN-92: un instructor solo modifica sus rutinas; las de otros las ve en solo lectura
  const [miCedula] = useState(instructorEnSesion);

  useEffect(() => {
    let activo = true;
    (async () => {
      const [lista, clientes, instructores, catalogo, membresias] = await Promise.all([
        api.rutinas.listaSupervision(),
        api.clientes.list(),
        api.instructores.list(),
        api.ejercicios.list(),
        api.membresias.list(),
      ]);
      const fila = lista.find((f) => f.rutina.id_rutina === idRutina);
      if (!fila) {
        if (activo) {
          setDatos(null);
          setCargando(false);
        }
        return;
      }
      const r = fila.rutina;
      const [sesiones, registros] = await Promise.all([api.rutinas.sesiones(idRutina), api.rutinas.registros(idRutina)]);
      const hoy = utils.isoDate();
      // Membresía vigente del cliente (la más reciente), o null
      const membresia =
        membresias
          .filter((m) => m.id_cliente === r.id_cliente && m.estado === "ACTIVA" && m.fecha_vencimiento >= hoy)
          .sort((a, b) => b.fecha_vencimiento.localeCompare(a.fecha_vencimiento))[0] ?? null;
      const conVigente = new Set(lista.filter((f) => f.estado === "VIGENTE" || f.estado === "POR_VENCER").map((f) => f.rutina.id_cliente));
      if (!activo) return;
      setDatos({
        fila,
        cliente: clientes.find((c) => c.numero_identificacion === r.id_cliente) ?? null,
        membresia,
        instructor: instructores.find((i) => i.numero_identificacion === r.id_instructor) ?? null,
        sesiones,
        registros,
        anteriores: lista
          .filter((f) => f.rutina.id_cliente === r.id_cliente && f.rutina.id_rutina !== idRutina)
          .sort((a, b) => b.rutina.fecha_creacion.localeCompare(a.rutina.fecha_creacion)),
        candidatos: clientes.filter((c) => c.estado === "ACTIVO" && !conVigente.has(c.numero_identificacion)),
        instructores,
        catalogo,
      });
      setActiva((actual) => (sesiones.some((s) => s.sesion === actual) ? actual : sesiones[0]?.sesion ?? "A"));
      setCargando(false);
    })();
    return () => {
      activo = false;
    };
  }, [idRutina, version]);

  // La alerta se va sola a los 4 segundos
  useEffect(() => {
    if (!alerta) return;
    const t = setTimeout(() => setAlerta(null), 4000);
    return () => clearTimeout(t);
  }, [alerta]);

  if (cargando) {
    return (
      <div className="card-g">
        <div className="loader"><span className="spinner-g"></span>Cargando...</div>
      </div>
    );
  }

  if (!datos) {
    return (
      <div className="card-g">
        <Link to={ruta("/rutinas")} className="btn-dark" style={{ textDecoration: "none" }}><i className="bi bi-arrow-left me-1" aria-hidden /> Rutinas</Link>
        <p className="empty-state">Rutina no encontrada</p>
      </div>
    );
  }

  const { fila, cliente, membresia, instructor, sesiones, registros, anteriores, candidatos, instructores, catalogo } = datos;
  const r = fila.rutina;
  const vigente = fila.estado === "VIGENTE" || fila.estado === "POR_VENCER";
  const soloLectura = miCedula !== null && r.id_instructor !== miCedula;
  const sesionActiva = sesiones.find((s) => s.sesion === activa);
  const nombreDe = (cedula: string) => {
    if (cliente && cedula === cliente.numero_identificacion) return "Cliente";
    const i = instructores.find((x) => x.numero_identificacion === cedula);
    return i ? i.nombre + " " + i.apellidos : cedula ? "Administración" : "—";
  };
  const paginaSegura = Math.min(pagina, Math.max(1, Math.ceil(registros.length / POR_PAGINA)));
  const registrosPagina = registros.slice((paginaSegura - 1) * POR_PAGINA, paginaSegura * POR_PAGINA);

  // Tras una acción: alerta, cerrar modal y recargar
  function terminar(ok: boolean, mensaje: string) {
    setGuardando(false);
    if (!ok) {
      setErrorModal(mensaje);
      return;
    }
    setRegistrar(false);
    setFinalizar(false);
    setErrorModal("");
    setAlerta({ tipo: "ok", mensaje });
    setVersion((v) => v + 1);
  }

  async function confirmarRegistro(registro: RegistroNuevo) {
    setGuardando(true);
    const res = await api.rutinas.registrarSesion(idRutina, registro);
    terminar(res.ok, res.mensaje);
  }

  async function confirmarFinalizar() {
    setGuardando(true);
    const res = await api.rutinas.finalizar(idRutina);
    terminar(res.ok, res.mensaje);
  }

  async function confirmarEliminar() {
    setGuardando(true);
    const res = await api.rutinas.remove(idRutina);
    setGuardando(false);
    if (!res.ok) {
      setErrorModal(res.mensaje);
      return;
    }
    navigate(ruta("/rutinas"));
  }

  async function confirmarDuplicar(idCliente: string) {
    setGuardando(true);
    const res = await api.rutinas.duplicar(idRutina, idCliente);
    setGuardando(false);
    if (!res.ok || !res.data) {
      setErrorModal(res.mensaje);
      return;
    }
    setDuplicar(false);
    navigate(ruta("/rutinas/" + res.data.id_rutina));
  }

  async function revisar(e: RutinaEjercicio) {
    if (!e.sesion) return;
    const res = await api.rutinas.marcarRevisado(idRutina, e.sesion, e.id_ejercicio);
    setAlerta({ tipo: res.ok ? "ok" : "error", mensaje: res.mensaje });
    setVersion((v) => v + 1);
  }

  return (
    <>
      {/* Encabezado: volver + acciones */}
      <div className="inst-encabezado">
        <Link to={ruta("/rutinas")} className="btn-icon" title="Volver a Rutinas"><i className="bi bi-arrow-left" aria-hidden /></Link>
        <div className="flex-grow-1">
          <div className="card-sub">Rutinas</div>
          <h1 className="card-title mb-0">{r.nombre}</h1>
        </div>
        {!soloLectura && (
          <div className="inst-acciones">
            <button className="btn-dark" onClick={() => navigate(ruta("/rutinas/" + idRutina + "/editar"))}>
              <i className="bi bi-pencil me-1" aria-hidden /> Editar
            </button>
            <button className="btn-dark" onClick={() => { setErrorModal(""); setDuplicar(true); }}>
              <i className="bi bi-copy me-1" aria-hidden /> Duplicar
            </button>
            {vigente && (
              <button className="btn-dark" onClick={() => { setErrorModal(""); setFinalizar(true); }}>
                <i className="bi bi-flag me-1" aria-hidden /> Finalizar
              </button>
            )}
            <button className="btn-icon" title="Eliminar rutina" onClick={() => { setErrorModal(""); setEliminar(true); }}>
              <i className="bi bi-trash" aria-hidden />
            </button>
          </div>
        )}
      </div>

      {alerta && <div className={"alert-g show alert-" + alerta.tipo}>{alerta.mensaje}</div>}
      {soloLectura && (
        <div className="alert-g show inst-alerta-info">
          <i className="bi bi-eye me-1" aria-hidden /> Rutina de {instructor ? instructor.nombre + " " + instructor.apellidos : "otro instructor"}: solo lectura.
        </div>
      )}

      {/* Cliente y datos de la rutina */}
      <section className="card-g">
        <div className="inst-cabecera-cliente">
          <div className="person">
            <div className="person-avatar">{cliente ? utils.iniciales(cliente.nombre, cliente.apellidos) : "?"}</div>
            <div>
              <div className="person-name">{cliente ? cliente.nombre + " " + cliente.apellidos : r.id_cliente}</div>
              <div className="person-sub">{cliente?.tipo_identificacion} {r.id_cliente}</div>
            </div>
          </div>
          {membresia ? (
            <span className="badge-g badge-activo">Membresía {membresia.tipo_membresia} · vence {utils.fecha(membresia.fecha_vencimiento)}</span>
          ) : (
            <span className="badge-g badge-vencida">Sin membresía vigente</span>
          )}
          {cliente && miCedula === null && (
            <Link to={ruta("/clientes/" + cliente.numero_identificacion)} className="inst-link">
              Ver ficha del cliente
            </Link>
          )}
        </div>
        <div className="inst-datos-rutina">
          <BadgeEstadoRutina estado={fila.estado} />
          <span>{r.objetivo}</span>
          <span><i className="bi bi-person-badge me-1" aria-hidden />{instructor ? instructor.nombre + " " + instructor.apellidos : r.id_instructor}</span>
          <span><i className="bi bi-calendar-range me-1" aria-hidden />{utils.fecha(r.fecha_creacion)} → {r.fecha_fin ? utils.fecha(r.fecha_fin) : "sin fecha fin"}</span>
          <span className="card-sub">{textoVigencia(r, fila.estado)}</span>
        </div>
        {r.descripcion && <p className="card-sub mt-2 mb-0">{r.descripcion}</p>}
      </section>

      {/* Avance */}
      <section className="card-g inst-bloque-avance">
        <AvanceRutina avance={fila.avance} ideal={vigente ? idealAHoy(r) : null} siguiente={vigente ? fila.siguiente : null} />
        {vigente && soloLectura ? null : vigente ? (
          <button className="btn-neon" onClick={() => { setErrorModal(""); setRegistrar(true); }}>
            <i className="bi bi-check2-circle me-1" aria-hidden /> Registrar sesión completada
          </button>
        ) : (
          <p className="card-sub mb-0">La rutina está {fila.estado === "FINALIZADA" ? "finalizada" : "vencida"}: ya no se registran sesiones.</p>
        )}
      </section>

      {/* Sesiones */}
      <section className="card-g">
        <h2 className="card-title">Sesiones</h2>
        {sesiones.length === 0 ? (
          <p className="empty-state">Esta rutina no tiene sesiones.</p>
        ) : (
          <>
            <PestanasSesion
              pestanas={sesiones.map((s) => ({ sesion: s.sesion, resumen: resumenSesion(s.ejercicios, catalogo) }))}
              activa={activa}
              onCambiar={setActiva}
            />
            <div className="inst-lista-ej">
              {sesionActiva?.ejercicios.map((e) => (
                <FilaEjercicio
                  key={e.sesion + "-" + e.id_ejercicio}
                  fila={e}
                  ejercicio={catalogo.find((c) => c.id_ejercicio === e.id_ejercicio)}
                  acciones={
                    e.agregado_por_cliente && e.revisado_por_instructor === false && !soloLectura ? (
                      <button className="btn-dark" onClick={() => revisar(e)}>
                        <i className="bi bi-check2 me-1" aria-hidden /> Marcar revisado
                      </button>
                    ) : undefined
                  }
                />
              ))}
            </div>
          </>
        )}
      </section>

      {/* Historial de sesiones registradas */}
      <section className="card-g">
        <h2 className="card-title">Sesiones registradas</h2>
        <div className="table-wrap">
          <table className="table-g tabla-stack">
            <thead>
              <tr><th>Fecha</th><th>Sesión</th><th>Registrada por</th><th>Notas</th><th>Ejercicios</th></tr>
            </thead>
            <tbody>
              {registros.length === 0 ? (
                <tr><td colSpan={5} className="empty-state">Todavía no hay sesiones registradas.</td></tr>
              ) : (
                registrosPagina.map((x) => {
                  // KAN-98: fila expandible con lo que hizo en cada ejercicio (solo si lo registró)
                  const hechos = x.ejercicios_realizados ?? [];
                  const abierto = registroAbierto === x.id_registro;
                  return (
                    <Fragment key={x.id_registro}>
                      <tr>
                        <td data-label="Fecha">{utils.fecha(x.fecha)}</td>
                        <td data-label="Sesión"><span className="inst-letra inst-letra-sm">{x.sesion}</span></td>
                        <td data-label="Registrada por">{nombreDe(x.registrado_por)}</td>
                        <td data-label="Notas">{x.notas || "—"}</td>
                        <td data-label="Ejercicios" className="inst-td-ejercicios">
                          {hechos.length === 0 ? (
                            "—"
                          ) : (
                            <button
                              type="button"
                              className="btn-dark"
                              aria-expanded={abierto}
                              onClick={() => setRegistroAbierto(abierto ? null : x.id_registro)}
                            >
                              {hechos.length} <i className={"bi " + (abierto ? "bi-chevron-up" : "bi-chevron-down") + " ms-1"} aria-hidden />
                            </button>
                          )}
                        </td>
                      </tr>
                      {abierto && (
                        <tr className="inst-fila-realizados">
                          <td colSpan={5}>
                            <ul className="inst-realizados">
                              {hechos.map((e) => (
                                <li key={e.id_ejercicio}>
                                  <strong>{catalogo.find((c) => c.id_ejercicio === e.id_ejercicio)?.nombre ?? "Ejercicio " + e.id_ejercicio}:</strong>{" "}
                                  {formatoRealizado(e)}
                                </li>
                              ))}
                            </ul>
                          </td>
                        </tr>
                      )}
                    </Fragment>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
        <Paginador pagina={paginaSegura} total={registros.length} porPagina={POR_PAGINA} onCambiar={setPagina} />
      </section>

      {/* Rutinas anteriores del cliente */}
      <section className="card-g">
        <h2 className="card-title">Otras rutinas de {cliente ? cliente.nombre : "este cliente"}</h2>
        {anteriores.length === 0 ? (
          <p className="empty-state">Es su primera rutina.</p>
        ) : (
          <div className="table-wrap">
            <table className="table-g tabla-stack">
              <thead>
                <tr><th>Rutina</th><th>Fechas</th><th>Estado</th><th>Avance</th><th></th></tr>
              </thead>
              <tbody>
                {anteriores.map((f) => (
                  <tr key={f.rutina.id_rutina}>
                    <td data-label="Rutina">{f.rutina.nombre}</td>
                    <td data-label="Fechas">{utils.fecha(f.rutina.fecha_creacion)} → {f.rutina.fecha_fin ? utils.fecha(f.rutina.fecha_fin) : "—"}</td>
                    <td data-label="Estado"><BadgeEstadoRutina estado={f.estado} /></td>
                    <td data-label="Avance">{f.avance.completadas} de {f.avance.planeadas}</td>
                    <td>
                      <Link to={ruta("/rutinas/" + f.rutina.id_rutina)} className="btn-icon" title="Ver rutina"><i className="bi bi-eye" aria-hidden /></Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {/* Modales */}
      <ModalRegistrarSesion
        key={"reg-" + version + "-" + (registrar ? 1 : 0)}
        show={registrar}
        division={r.division ?? []}
        sugerida={fila.siguiente}
        fechaMinima={r.fecha_creacion}
        guardando={guardando}
        error={errorModal}
        onConfirmar={confirmarRegistro}
        onCerrar={() => setRegistrar(false)}
      />
      <ModalDuplicar
        show={duplicar}
        nombreRutina={r.nombre}
        candidatos={candidatos}
        guardando={guardando}
        error={errorModal}
        onConfirmar={confirmarDuplicar}
        onCerrar={() => setDuplicar(false)}
      />
      <Modal show={finalizar} onHide={() => setFinalizar(false)} centered>
        <Modal.Header closeButton><Modal.Title>Finalizar rutina</Modal.Title></Modal.Header>
        <Modal.Body>
          {errorModal && <div className="alert-g alert-error show">{errorModal}</div>}
          <p>
            ¿Finalizar «{r.nombre}»? Queda en el historial de {cliente?.nombre ?? "el cliente"} con {fila.avance.completadas} de{" "}
            {fila.avance.planeadas} sesiones, y el cliente podrá recibir una rutina nueva hoy mismo.
          </p>
        </Modal.Body>
        <Modal.Footer>
          <button className="btn-dark" onClick={() => setFinalizar(false)}>Cancelar</button>
          <button className="btn-neon" disabled={guardando} onClick={confirmarFinalizar}><i className="bi bi-flag me-1" aria-hidden /> Sí, finalizar</button>
        </Modal.Footer>
      </Modal>
      <Modal show={eliminar} onHide={() => setEliminar(false)} centered>
        <Modal.Header closeButton><Modal.Title>Eliminar rutina</Modal.Title></Modal.Header>
        <Modal.Body>
          {errorModal && <div className="alert-g alert-error show">{errorModal}</div>}
          <p>¿Eliminar «{r.nombre}»? Se borran también sus ejercicios y sus {registros.length} sesiones registradas. No se puede deshacer.</p>
          {vigente && registros.length > 0 && (
            <p className="card-sub">Ya tiene sesiones registradas: si el cliente solo terminó con ella, mejor finalízala y queda en su historial.</p>
          )}
        </Modal.Body>
        <Modal.Footer>
          <button className="btn-dark" onClick={() => setEliminar(false)}>Cancelar</button>
          {vigente && registros.length > 0 && (
            <button className="btn-neon" onClick={() => { setEliminar(false); setFinalizar(true); }}>Finalizar en su lugar</button>
          )}
          <button className="btn-danger-g" disabled={guardando} onClick={confirmarEliminar}>Sí, eliminar</button>
        </Modal.Footer>
      </Modal>
    </>
  );
}
