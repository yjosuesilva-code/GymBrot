import { useEffect, useReducer, useRef, useState } from "react";
import { Modal } from "react-bootstrap";
import { api } from "../data/api";
import { current } from "../lib/auth";
import { formatoPrescripcion, idealAHoy, normalizar, resumenSesion, textoVigencia } from "../lib/rutinas";
import { utils } from "../lib/utils";
import { useTenantOpcional } from "../tenant/TenantContext";
import { AvanceCliente } from "../components/cliente/AvanceCliente";
import {
  buscarBorradorRutina,
  eliminarBorradorPorClave,
  formatearTiempoRelativo,
} from "../components/cliente/borradorEntrenamiento";
import type { AmbitoBorrador } from "../components/cliente/borradorEntrenamiento";
import { BadgeEstadoRutina } from "../components/rutinas/BadgeEstadoRutina";
import { FilaEjercicio } from "../components/rutinas/FilaEjercicio";
import { PestanasSesion } from "../components/rutinas/PestanasSesion";
import { VistaPreviaRecurso } from "../components/ejercicios/VistaPreviaRecurso";
import { EntrenamientoCliente } from "../components/cliente/EntrenamientoCliente";
import type { EstadoEntrenamiento } from "../components/cliente/entrenamiento";
import { obtenerNotaEntrenador, obtenerPasosTecnicos } from "../components/cliente/guiaTecnica";
import type { Ejercicio, LetraSesion, Rutina, RutinaEjercicio } from "../types";

type EjercicioSeleccionado = { fila: RutinaEjercicio; ejercicio: Ejercicio };

type SesionEnEntrenamiento = {
  sesion: LetraSesion;
  borradorInicial: { estado: EstadoEntrenamiento; notas: string } | null;
};

type DatosRutina = {
  rutina: Rutina;
  sesiones: Awaited<ReturnType<typeof api.rutinas.sesiones>>;
  avance: Awaited<ReturnType<typeof api.rutinas.avance>>;
  siguiente: LetraSesion | null;
  catalogo: Awaited<ReturnType<typeof api.ejercicios.list>>;
  instructor: Awaited<ReturnType<typeof api.instructores.get>>;
};

type Consulta =
  | { estado: "cargando" }
  | { estado: "error"; mensaje: string }
  | { estado: "sin-rutina" }
  | { estado: "lista"; datos: DatosRutina };

async function consultarAvance(idRutina: number) {
  const [avance, siguiente] = await Promise.all([
    api.rutinas.avance(idRutina),
    api.rutinas.siguienteSesion(idRutina),
  ]);
  return { avance, siguiente };
}

function limpiarDescripcionRutina(rutina: Rutina): string {
  const desc = (rutina.descripcion ?? "").trim();
  if (!desc) return "";
  const descNorm = normalizar(desc);
  const objNorm = normalizar(rutina.objetivo);
  const nomNorm = normalizar(rutina.nombre);
  if (descNorm === objNorm || descNorm === nomNorm) return "";

  const prefijoPlan = `plan de ${objNorm}`;
  if (objNorm && descNorm.startsWith(prefijoPlan)) {
    const resto = desc.slice(prefijoPlan.length).replace(/^[\s·.,:-]+/, "").trim();
    if (!resto) return "";
    return resto.charAt(0).toUpperCase() + resto.slice(1);
  }
  return desc;
}

export function MiRutina() {
  const [sesion] = useState(current);
  const tenant = useTenantOpcional();
  const cedula = sesion?.numero_identificacion;
  const gimnasioId = tenant?.gimnasio.gimnasio_id ?? sesion?.gimnasio_id;
  const [consulta, setConsulta] = useState<Consulta>({ estado: "cargando" });
  const [activa, setActiva] = useState<LetraSesion>("A");
  const [detalle, setDetalle] = useState<EjercicioSeleccionado | null>(null);
  const [entrenando, setEntrenando] = useState<SesionEnEntrenamiento | null>(null);
  const [sesionRegistrada, setSesionRegistrada] = useState<LetraSesion | null>(null);
  const [actualizacion, setActualizacion] = useState<"lista" | "cargando" | "error">("lista");
  const [, refrescarBorrador] = useReducer((n: number) => n + 1, 0);
  const [modalDescartar, setModalDescartar] = useState(false);
  const [sesionPendienteInicio, setSesionPendienteInicio] = useState<LetraSesion | null>(null);
  const confirmacion = useRef<HTMLDivElement>(null);
  const tituloSesiones = useRef<HTMLHeadingElement>(null);

  useEffect(() => {
    if (sesionRegistrada && entrenando === null) confirmacion.current?.focus();
  }, [sesionRegistrada, entrenando]);

  useEffect(() => {
    if (entrenando !== null) return;
    const intervalo = window.setInterval(() => refrescarBorrador(), 60000);
    return () => window.clearInterval(intervalo);
  }, [entrenando]);

  function cambiarSesion(letra: LetraSesion) {
    setDetalle(null);
    setActiva(letra);
  }

  useEffect(() => {
    let cancelado = false;

    async function cargar() {
      try {
        if (!cedula || !gimnasioId) {
          throw new Error("No hay una sesión activa. Vuelve a iniciar sesión para consultar tu rutina.");
        }

        const vigente = await api.rutinas.vigenteDeCliente(cedula);
        if (cancelado) return;
        // El historial solo se consulta para distinguir una rutina anterior de ninguna asignación.
        const rutina = vigente ?? (await api.rutinas.deCliente(cedula))[0];
        if (cancelado) return;
        if (!rutina) {
          setConsulta({ estado: "sin-rutina" });
          return;
        }
        if (rutina.id_cliente !== cedula || rutina.gimnasio_id !== gimnasioId) {
          throw new Error("La rutina consultada no corresponde a tu cuenta o gimnasio actual.");
        }

        const [sesiones, progreso, catalogo, instructor] = await Promise.all([
          api.rutinas.sesiones(rutina.id_rutina),
          consultarAvance(rutina.id_rutina),
          api.ejercicios.list(),
          api.instructores.get(rutina.id_instructor),
        ]);
        const { avance, siguiente } = progreso;
        if (cancelado) return;
        setActiva(
          siguiente && sesiones.some((s) => s.sesion === siguiente)
            ? siguiente
            : sesiones[0]?.sesion ?? "A",
        );
        setConsulta({ estado: "lista", datos: { rutina, sesiones, avance, siguiente, catalogo, instructor } });
      } catch (error: unknown) {
        if (!cancelado) {
          setConsulta({
            estado: "error",
            mensaje: error instanceof Error ? error.message : "No se pudo cargar tu rutina. Inténtalo de nuevo más tarde.",
          });
        }
      }
    }

    void cargar();
    return () => {
      cancelado = true;
    };
  }, [cedula, gimnasioId]);

  async function actualizarAvance(idRutina: number) {
    setActualizacion("cargando");
    try {
      const progreso = await consultarAvance(idRutina);
      setConsulta((anterior) => anterior.estado === "lista" && anterior.datos.rutina.id_rutina === idRutina
        ? { estado: "lista", datos: { ...anterior.datos, ...progreso } }
        : anterior);
      if (progreso.siguiente) setActiva(progreso.siguiente);
      setActualizacion("lista");
    } catch {
      // El registro ya tuvo éxito. Reintentar aquí solo vuelve a consultar, nunca a guardar.
      setActualizacion("error");
    }
  }

  if (consulta.estado !== "lista") {
    return (
      <section className="card-g" aria-labelledby="mi-rutina-titulo">
        <div className="card-head">
          <h1 className="card-title" id="mi-rutina-titulo">Mi rutina</h1>
        </div>
        {consulta.estado === "cargando" && (
          <div className="loader" role="status">
            <span className="spinner-g" aria-hidden="true" />Cargando tu rutina…
          </div>
        )}
        {consulta.estado === "error" && (
          <div className="alert-g alert-error show" role="alert">{consulta.mensaje}</div>
        )}
        {consulta.estado === "sin-rutina" && (
          <p className="empty-state mb-0">
            Aún no tienes una rutina asignada. Acércate a un instructor para que te arme una.
          </p>
        )}
      </section>
    );
  }

  const { rutina, sesiones, avance, siguiente, catalogo, instructor } = consulta.datos;
  const estado = api.rutinas.estado(rutina);
  const vigente = estado === "VIGENTE" || estado === "POR_VENCER";
  const sesionActiva = sesiones.find((s) => s.sesion === activa);
  const sesionEntrenada = entrenando ? sesiones.find((s) => s.sesion === entrenando.sesion) : undefined;
  const ambitoBorrador: AmbitoBorrador | null =
    gimnasioId && cedula && rutina.id_cliente === cedula && rutina.gimnasio_id === gimnasioId
      ? { gimnasioId, idCliente: cedula, idRutina: rutina.id_rutina }
      : null;

  if (sesionEntrenada && entrenando) {
    return (
      <EntrenamientoCliente
        key={sesionEntrenada.sesion}
        ambitoBorrador={ambitoBorrador}
        borradorInicial={entrenando.borradorInicial}
        nombreRutina={rutina.nombre}
        sesion={sesionEntrenada.sesion}
        filas={sesionEntrenada.ejercicios}
        catalogo={catalogo}
        onSalir={() => {
          setDetalle(null);
          setEntrenando(null);
          refrescarBorrador();
        }}
        onRegistrar={(registro) => {
          const autenticado = current();
          const gymActual = tenant?.gimnasio.gimnasio_id ?? autenticado?.gimnasio_id;
          if (!autenticado || autenticado.rol !== "CLIENTE"
            || autenticado.numero_identificacion !== rutina.id_cliente
            || gymActual !== rutina.gimnasio_id
            || registro.sesion !== sesionEntrenada.sesion) {
            return Promise.resolve({ ok: false, mensaje: "La sesión activa no corresponde a este entrenamiento. Vuelve a iniciar sesión con tu cuenta." });
          }
          return api.rutinas.registrarSesion(rutina.id_rutina, registro);
        }}
        onRegistrado={() => {
          setSesionRegistrada(sesionEntrenada.sesion);
          setDetalle(null);
          setEntrenando(null);
          refrescarBorrador();
          void actualizarAvance(rutina.id_rutina);
        }}
      />
    );
  }

  const resultadoBorrador = ambitoBorrador
    ? buscarBorradorRutina({
        ambito: ambitoBorrador,
        rutina,
        vigente,
        sesiones,
        catalogo,
      })
    : { estado: "ninguno" as const };

  const borradorRestaurable = resultadoBorrador.estado === "restaurable" ? resultadoBorrador : null;
  const borradorObsoleto = resultadoBorrador.estado === "obsoleto" ? resultadoBorrador : null;

  function abrirSesionDesdeCero(letra: LetraSesion) {
    const objetivo = sesiones.find((s) => s.sesion === letra);
    if (!objetivo || objetivo.ejercicios.length === 0) return;
    setDetalle(null);
    setSesionRegistrada(null);
    setActiva(letra);
    setEntrenando({ sesion: letra, borradorInicial: null });
  }

  function continuarBorrador() {
    if (!borradorRestaurable) return;
    setModalDescartar(false);
    setSesionPendienteInicio(null);
    setDetalle(null);
    setSesionRegistrada(null);
    setActiva(borradorRestaurable.sesion);
    setEntrenando({
      sesion: borradorRestaurable.sesion,
      borradorInicial: {
        estado: borradorRestaurable.entrenamiento,
        notas: borradorRestaurable.notas,
      },
    });
  }

  function descartarBorradorActual() {
    const clave = borradorRestaurable?.clave ?? borradorObsoleto?.clave;
    if (clave) eliminarBorradorPorClave(clave);
    setModalDescartar(false);
    setSesionPendienteInicio(null);
    refrescarBorrador();
  }

  function descartarYEmpezarNuevo() {
    const destino = sesionPendienteInicio ?? sesionActiva?.sesion;
    if (borradorRestaurable) eliminarBorradorPorClave(borradorRestaurable.clave);
    if (borradorObsoleto) eliminarBorradorPorClave(borradorObsoleto.clave);
    setSesionPendienteInicio(null);
    setModalDescartar(false);
    refrescarBorrador();
    if (destino) abrirSesionDesdeCero(destino);
  }

  function iniciarEntrenamiento() {
    const actual = api.rutinas.estado(rutina);
    if (actualizacion !== "lista" || (actual !== "VIGENTE" && actual !== "POR_VENCER") || !sesionActiva || sesionActiva.ejercicios.length === 0) {
      return;
    }
    if (borradorRestaurable) {
      setSesionPendienteInicio(sesionActiva.sesion);
      return;
    }
    if (borradorObsoleto) {
      eliminarBorradorPorClave(borradorObsoleto.clave);
    }
    abrirSesionDesdeCero(sesionActiva.sesion);
  }

  const aviso = estado === "VENCIDA"
    ? "Tu última rutina está vencida. Puedes consultarla aquí; acércate a un instructor para renovarla."
    : estado === "FINALIZADA"
      ? "Tu última rutina fue finalizada. Puedes consultarla aquí; acércate a un instructor para una nueva asignación."
      : estado === "POR_VENCER"
        ? "Tu rutina está por vencer. Consulta con tu instructor su próxima renovación."
        : null;
  const mostrarObjetivo = Boolean(rutina.objetivo) && !normalizar(rutina.nombre).includes(normalizar(rutina.objetivo));
  const descripcionRutina = limpiarDescripcionRutina(rutina);
  const detalleVigencia = rutina.fecha_fin !== null && estado !== "FINALIZADA"
    ? textoVigencia(rutina, estado)
    : undefined;

  return (
    <div className="cli-mi-rutina d-flex flex-column gap-3">
      {sesionRegistrada && (
        <div className="cli-registro-exito" role="status" aria-atomic="true" tabIndex={-1} ref={confirmacion}>
          <i className="bi bi-check2-circle" aria-hidden="true" />
          <div>
            <p>Entrenamiento de la sesión {sesionRegistrada} registrado correctamente.</p>
            {actualizacion === "lista" && siguiente && <p className="cli-ent-secundario">Próxima sesión sugerida: {siguiente}.</p>}
          </div>
        </div>
      )}

      {borradorRestaurable && (
        <section className="card-g cli-borrador-aviso" aria-labelledby="cli-borrador-titulo">
          <div className="cli-borrador-cuerpo">
            <div className="cli-borrador-info">
              <span className="badge-g badge-activo">Sesión {borradorRestaurable.sesion} · Borrador guardado</span>
              <h2 className="card-title mb-0" id="cli-borrador-titulo">Tienes un entrenamiento en curso</h2>
              <p className="cli-borrador-resumen">
                <span>
                  {borradorRestaurable.resumen.ejerciciosCompletados} de {borradorRestaurable.resumen.totalEjercicios}{" "}
                  {borradorRestaurable.resumen.totalEjercicios === 1 ? "ejercicio completado" : "ejercicios completados"}
                </span>
                {" · "}
                <span>
                  {borradorRestaurable.resumen.seriesCompletadas} de {borradorRestaurable.resumen.totalSeries}{" "}
                  {borradorRestaurable.resumen.totalSeries === 1 ? "serie realizada" : "series realizadas"}
                </span>
              </p>
              <p className="cli-ent-secundario">
                Última actualización: {formatearTiempoRelativo(borradorRestaurable.updatedAt)}
              </p>
            </div>
            <div className="cli-borrador-acciones">
              <button type="button" className="btn-neon cli-ent-boton" onClick={continuarBorrador}>
                <i className="bi bi-play-fill me-2" aria-hidden="true" />Continuar entrenamiento
              </button>
              <button type="button" className="btn-dark cli-ent-boton cli-ent-boton-peligro" onClick={() => setModalDescartar(true)}>
                <i className="bi bi-trash3 me-2" aria-hidden="true" />Descartar borrador
              </button>
            </div>
          </div>
        </section>
      )}

      {borradorObsoleto && (
        <section className="card-g cli-borrador-obsoleto" aria-labelledby="cli-borrador-obsoleto-titulo" role="status">
          <div className="cli-borrador-cuerpo">
            <div className="cli-borrador-info">
              <h2 className="cli-ej-seccion mb-1" id="cli-borrador-obsoleto-titulo">
                <i className="bi bi-info-circle me-2" aria-hidden="true" />Borrador anterior no disponible
              </h2>
              <p className="cli-ent-secundario">{borradorObsoleto.motivo}</p>
            </div>
            <div className="cli-borrador-acciones">
              <button type="button" className="btn-dark cli-ent-boton" onClick={descartarBorradorActual}>
                Descartar borrador
              </button>
            </div>
          </div>
        </section>
      )}

      <section className="card-g" aria-labelledby="mi-rutina-titulo">
        <div className="card-head">
          <div>
            {mostrarObjetivo && <p className="card-sub">{rutina.objetivo}</p>}
            <h1 className="card-title mb-0" id="mi-rutina-titulo">{rutina.nombre}</h1>
          </div>
          <BadgeEstadoRutina estado={estado} detalle={detalleVigencia} />
        </div>
        {aviso && (
          <div className="alert-g show inst-alerta-info" role="status">
            <i className="bi bi-info-circle me-1" aria-hidden="true" />{aviso}
          </div>
        )}
        {descripcionRutina && <p>{descripcionRutina}</p>}
        <dl className="cli-rutina-meta">
          <div className="cli-rutina-dato">
            <dt>Instructor</dt>
            <dd>
              {instructor ? `${instructor.nombre} ${instructor.apellidos}` : "Instructor no disponible"}
            </dd>
          </div>
          <div className="cli-rutina-dato">
            <dt>Fecha de inicio</dt>
            <dd>{utils.fecha(rutina.fecha_creacion)}</dd>
          </div>
          <div className="cli-rutina-dato">
            <dt>Fecha de fin</dt>
            <dd>{rutina.fecha_fin ? utils.fecha(rutina.fecha_fin) : "Sin fecha de fin"}</dd>
          </div>
        </dl>
      </section>

      <section className="card-g cli-avance-panel" aria-labelledby="mi-rutina-avance">
        <div className="card-head">
          <h2 className="card-title" id="mi-rutina-avance">Mi avance</h2>
        </div>
        {actualizacion === "cargando" ? <p className="cli-ent-secundario" role="status"><i className="bi bi-hourglass-split me-2" aria-hidden="true" />Actualizando avance y próxima sesión…</p>
          : actualizacion === "error" ? (
            <div className="cli-ent-error">
              <p role="alert">Tu entrenamiento está guardado, pero no pudimos actualizar el avance y la próxima sesión.</p>
              <button type="button" className="btn-dark cli-ent-boton" onClick={() => void actualizarAvance(rutina.id_rutina)}>Reintentar actualización</button>
            </div>
          ) : <AvanceCliente
          avance={avance}
          siguiente={vigente ? siguiente : null}
          sesionActiva={activa}
          ideal={vigente && (rutina.sesiones_planeadas ?? 0) > 0 ? idealAHoy(rutina) : null}
          borradorEnCurso={borradorRestaurable ? {
            sesion: borradorRestaurable.sesion,
            ejerciciosCompletados: borradorRestaurable.resumen.ejerciciosCompletados,
            totalEjercicios: borradorRestaurable.resumen.totalEjercicios,
          } : null}
          onVerSesion={(letra) => {
            cambiarSesion(letra);
            tituloSesiones.current?.focus();
          }}
        />}
      </section>

      <section className="card-g" aria-labelledby="mi-rutina-sesiones">
        <div className="card-head">
          <div>
            <h2 className="card-title cli-ent-titulo" id="mi-rutina-sesiones" ref={tituloSesiones} tabIndex={-1}>Sesiones de la rutina</h2>
            {actualizacion === "lista" && vigente && siguiente && activa === siguiente && (
              <p className="card-sub">Sesión {siguiente} sugerida para tu entrenamiento de hoy</p>
            )}
          </div>
          {vigente && sesionActiva && sesionActiva.ejercicios.length > 0 && (
            <div className="cli-sesion-cta">
              <button type="button" className="btn-neon cli-ent-boton" disabled={actualizacion !== "lista"} onClick={iniciarEntrenamiento}>
                <i className="bi bi-play-fill me-2" aria-hidden="true" />Iniciar entrenamiento · Sesión {activa}
              </button>
            </div>
          )}
        </div>
        {sesiones.length === 0 ? (
          <p className="empty-state mb-0">
            Esta rutina aún no tiene sesiones definidas. Consulta con tu instructor.
          </p>
        ) : (
          <>
            <PestanasSesion
              pestanas={sesiones.map((s) => ({ sesion: s.sesion, resumen: resumenSesion(s.ejercicios, catalogo) }))}
              activa={activa}
              onCambiar={cambiarSesion}
            />
            <div role="tabpanel" aria-label={`Ejercicios de la sesión ${activa}`}>
              {!sesionActiva?.ejercicios.length ? (
                <p className="empty-state mb-0">Esta sesión aún no tiene ejercicios asignados. Consulta con tu instructor.</p>
              ) : (
                <div className="inst-lista-ej">
                  {sesionActiva.ejercicios.map((fila) => {
                    const ejercicio = catalogo.find((e) => e.id_ejercicio === fila.id_ejercicio);
                    return (
                      <FilaEjercicio
                        key={fila.id_ejercicio}
                        fila={fila}
                        ejercicio={ejercicio}
                        acciones={ejercicio && (
                          <button
                            type="button"
                            className="btn-dark cli-ej-accion"
                            aria-label={`Ver detalle de ${ejercicio.nombre}`}
                            title={`Ver detalle de ${ejercicio.nombre}`}
                            onClick={() => setDetalle({ fila, ejercicio })}
                          >
                            <i className="bi bi-info-circle" aria-hidden="true" />
                            <span>Ver detalle</span>
                          </button>
                        )}
                      />
                    );
                  })}
                </div>
              )}
            </div>
          </>
        )}
      </section>
      {detalle && <DetalleEjercicio detalle={detalle} onCerrar={() => setDetalle(null)} />}

      <Modal
        show={modalDescartar && borradorRestaurable !== null}
        onHide={() => setModalDescartar(false)}
        centered
        aria-labelledby="cli-modal-descartar-titulo"
        aria-describedby="cli-modal-descartar-desc"
      >
        <Modal.Header>
          <Modal.Title as="h2" id="cli-modal-descartar-titulo">
            ¿Descartar borrador de la sesión {borradorRestaurable?.sesion}?
          </Modal.Title>
        </Modal.Header>
        <Modal.Body id="cli-modal-descartar-desc">
          Este entrenamiento todavía no se ha registrado. Si descartas el borrador, perderás las series y valores guardados.
        </Modal.Body>
        <Modal.Footer className="cli-borrador-modal-acciones">
          <button type="button" className="btn-dark cli-ent-boton" onClick={() => setModalDescartar(false)}>
            Cancelar
          </button>
          <button type="button" className="btn-dark cli-ent-boton cli-ent-boton-peligro" onClick={descartarBorradorActual}>
            Descartar borrador
          </button>
        </Modal.Footer>
      </Modal>

      <Modal
        show={sesionPendienteInicio !== null && borradorRestaurable !== null}
        onHide={() => setSesionPendienteInicio(null)}
        centered
        aria-labelledby="cli-modal-conflicto-titulo"
        aria-describedby="cli-modal-conflicto-desc"
      >
        <Modal.Header>
          <Modal.Title as="h2" id="cli-modal-conflicto-titulo">
            Tienes un entrenamiento en curso
          </Modal.Title>
        </Modal.Header>
        <Modal.Body id="cli-modal-conflicto-desc">
          {borradorRestaurable?.sesion === sesionPendienteInicio ? (
            <p className="mb-0">
              Este entrenamiento todavía no se ha registrado. Ya tienes un borrador guardado para la{" "}
              <strong>Sesión {borradorRestaurable?.sesion}</strong> ({borradorRestaurable?.resumen.ejerciciosCompletados} de{" "}
              {borradorRestaurable?.resumen.totalEjercicios} ejercicios completados). Si descartas el borrador para empezar de nuevo, perderás las series y valores guardados.
            </p>
          ) : (
            <p className="mb-0">
              Tienes un borrador sin registrar en la <strong>Sesión {borradorRestaurable?.sesion}</strong> (
              {borradorRestaurable?.resumen.ejerciciosCompletados} de {borradorRestaurable?.resumen.totalEjercicios} ejercicios completados).
              Solo puedes mantener un entrenamiento en curso a la vez. Si inicias la <strong>Sesión {sesionPendienteInicio}</strong>, se descartará el borrador de la Sesión {borradorRestaurable?.sesion}.
            </p>
          )}
        </Modal.Body>
        <Modal.Footer className="cli-borrador-modal-acciones">
          <button type="button" className="btn-dark cli-ent-boton" onClick={() => setSesionPendienteInicio(null)}>
            Cancelar
          </button>
          <button type="button" className="btn-dark cli-ent-boton cli-ent-boton-peligro" onClick={descartarYEmpezarNuevo}>
            Descartar y empezar de nuevo
          </button>
          <button type="button" className="btn-neon cli-ent-boton" autoFocus onClick={continuarBorrador}>
            Continuar entrenamiento
          </button>
        </Modal.Footer>
      </Modal>
    </div>
  );
}

// Ficha local de T4: combina el catálogo con la indicación de esta rutina, sin consultar ni guardar datos.
function DetalleEjercicio({ detalle, onCerrar }: { detalle: EjercicioSeleccionado; onCerrar: () => void }) {
  const { fila, ejercicio } = detalle;
  const nombre = ejercicio.nombre;
  const porTiempo = ejercicio.tipo_medicion === "TIEMPO";
  const tieneReps = fila.reps_min != null || fila.reps_max != null;
  const repeticiones = tieneReps
    ? formatoPrescripcion({ reps_min: fila.reps_min, reps_max: fila.reps_max })
    : "Sin indicación";
  const duracion = fila.segundos != null ? `${fila.segundos} s` : "Sin indicación";
  const pendiente = fila.agregado_por_cliente === true && fila.revisado_por_instructor !== true;
  const pasosTecnicos = obtenerPasosTecnicos(ejercicio);
  const notaEntrenador = obtenerNotaEntrenador(fila, ejercicio);
  const indicaciones = [
    { etiqueta: "Series", valor: fila.series ?? "Sin indicación" },
    { etiqueta: porTiempo ? "Duración" : "Repeticiones", valor: porTiempo ? duracion : repeticiones },
    ...(!porTiempo && fila.segundos != null ? [{ etiqueta: "Duración", valor: duracion }] : []),
    ...(porTiempo && tieneReps ? [{ etiqueta: "Repeticiones", valor: repeticiones }] : []),
    ...(fila.peso_kg != null ? [{ etiqueta: "Peso asignado", valor: `${fila.peso_kg} kg` }] : []),
    ...(fila.descanso_seg != null ? [{ etiqueta: "Descanso", valor: `${fila.descanso_seg} s entre series` }] : []),
  ];

  return (
    <Modal show onHide={onCerrar} centered scrollable fullscreen="sm-down" contentClassName="cli-ej-detalle" aria-labelledby="cli-ej-titulo">
      <Modal.Header className="cli-ej-cabecera">
        <div className="cli-ej-identidad">
          <Modal.Title as="h2" id="cli-ej-titulo">{nombre}</Modal.Title>
          {ejercicio && (
            <div className="cli-ej-meta">
              <span className="badge-g cli-ej-etiqueta">{ejercicio.grupo_muscular}</span>
              <span className="badge-g cli-ej-etiqueta">{ejercicio.nivel}</span>
              <span className="badge-g cli-ej-etiqueta">{ejercicio.equipo}</span>
            </div>
          )}
        </div>
        <button type="button" className="btn-dark cli-ej-cerrar-icono" onClick={onCerrar} aria-label="Cerrar detalle del ejercicio" title="Cerrar detalle del ejercicio">
          <i className="bi bi-x-lg" aria-hidden="true" />
        </button>
      </Modal.Header>
      <Modal.Body className="cli-ej-cuerpo">
        {ejercicio && (
          <div className="cli-ej-visual">
            <VistaPreviaRecurso key={ejercicio.recurso_url} url={ejercicio.recurso_url} tamano="grande" alt={ejercicio.nombre} grupo={ejercicio.grupo_muscular} />
          </div>
        )}
        <section aria-labelledby="cli-ej-indicacion">
          <h3 className="cli-ej-seccion" id="cli-ej-indicacion">Tu indicación</h3>
          <dl className="cli-ej-prescripcion">
            {indicaciones.map(({ etiqueta, valor }) => (
              <div className="cli-ej-dato" key={etiqueta}>
                <dt>{etiqueta}</dt>
                <dd>{valor}</dd>
              </div>
            ))}
          </dl>
        </section>
        <section aria-labelledby="cli-ej-ejecucion">
          <h3 className="cli-ej-seccion" id="cli-ej-ejecucion">¿Cómo realizarlo?</h3>
          <ul className="cli-ej-pasos">
            {pasosTecnicos.map((paso) => (
              <li className="cli-ej-paso" key={paso.etapa}>
                <strong className="cli-ej-paso-etapa">{paso.etapa}:</strong> {paso.instruccion}
              </li>
            ))}
          </ul>
        </section>
        <section className="cli-ej-nota" aria-labelledby="cli-ej-nota-titulo">
          <h3 className="cli-ej-seccion" id="cli-ej-nota-titulo">
            <i className="bi bi-chat-left-text me-2" aria-hidden="true" />Nota de tu entrenador
          </h3>
          <p className="cli-ej-texto">{notaEntrenador}</p>
        </section>
        {pendiente && (
          <p className="cli-ej-pendiente" role="status">
            <i className="bi bi-clock-history me-2" aria-hidden="true" />Pendiente de revisión por tu instructor
          </p>
        )}
      </Modal.Body>
      <Modal.Footer>
        <button type="button" className="btn-neon cli-ej-cerrar" onClick={onCerrar}>Cerrar</button>
      </Modal.Footer>
    </Modal>
  );
}
