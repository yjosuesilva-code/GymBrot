import { useEffect, useState } from "react";
import { Modal } from "react-bootstrap";
import { api } from "../data/api";
import { current } from "../lib/auth";
import { formatoPrescripcion, idealAHoy, resumenSesion, textoVigencia } from "../lib/rutinas";
import { utils } from "../lib/utils";
import { AvanceRutina } from "../components/rutinas/AvanceRutina";
import { BadgeEstadoRutina } from "../components/rutinas/BadgeEstadoRutina";
import { FilaEjercicio } from "../components/rutinas/FilaEjercicio";
import { PestanasSesion } from "../components/rutinas/PestanasSesion";
import { VistaPreviaRecurso } from "../components/ejercicios/VistaPreviaRecurso";
import { EntrenamientoCliente } from "../components/cliente/EntrenamientoCliente";
import type { Ejercicio, LetraSesion, Rutina, RutinaEjercicio } from "../types";

type EjercicioSeleccionado = { fila: RutinaEjercicio; ejercicio: Ejercicio };

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

export function MiRutina() {
  const [sesion] = useState(current);
  const cedula = sesion?.numero_identificacion;
  const [consulta, setConsulta] = useState<Consulta>({ estado: "cargando" });
  const [activa, setActiva] = useState<LetraSesion>("A");
  const [detalle, setDetalle] = useState<EjercicioSeleccionado | null>(null);
  const [entrenando, setEntrenando] = useState<LetraSesion | null>(null);

  function cambiarSesion(letra: LetraSesion) {
    setDetalle(null);
    setActiva(letra);
  }

  useEffect(() => {
    let cancelado = false;

    async function cargar() {
      try {
        if (!cedula) throw new Error("No hay una sesión activa. Vuelve a iniciar sesión para consultar tu rutina.");

        const vigente = await api.rutinas.vigenteDeCliente(cedula);
        if (cancelado) return;
        // El historial solo se consulta para distinguir una rutina anterior de ninguna asignación.
        const rutina = vigente ?? (await api.rutinas.deCliente(cedula))[0];
        if (cancelado) return;
        if (!rutina) {
          setConsulta({ estado: "sin-rutina" });
          return;
        }

        const [sesiones, avance, siguiente, catalogo, instructor] = await Promise.all([
          api.rutinas.sesiones(rutina.id_rutina),
          api.rutinas.avance(rutina.id_rutina),
          api.rutinas.siguienteSesion(rutina.id_rutina),
          api.ejercicios.list(),
          api.instructores.get(rutina.id_instructor),
        ]);
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
  }, [cedula]);

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
  const sesionEntrenada = sesiones.find((s) => s.sesion === entrenando);
  if (sesionEntrenada) {
    return (
      <EntrenamientoCliente
        key={sesionEntrenada.sesion}
        nombreRutina={rutina.nombre}
        sesion={sesionEntrenada.sesion}
        filas={sesionEntrenada.ejercicios}
        catalogo={catalogo}
        onSalir={() => { setDetalle(null); setEntrenando(null); }}
      />
    );
  }

  function iniciarEntrenamiento() {
    const actual = api.rutinas.estado(rutina);
    if ((actual === "VIGENTE" || actual === "POR_VENCER") && sesionActiva && sesionActiva.ejercicios.length > 0) {
      setDetalle(null);
      setEntrenando(sesionActiva.sesion);
    }
  }
  const aviso = estado === "VENCIDA"
    ? "Tu última rutina está vencida. Puedes consultarla aquí; acércate a un instructor para renovarla."
    : estado === "FINALIZADA"
      ? "Tu última rutina fue finalizada. Puedes consultarla aquí; acércate a un instructor para una nueva asignación."
      : estado === "POR_VENCER"
        ? "Tu rutina está por vencer. Consulta con tu instructor su próxima renovación."
        : null;

  return (
    <div className="cli-mi-rutina d-flex flex-column gap-3">
      <section className="card-g" aria-labelledby="mi-rutina-titulo">
        <div className="card-head">
          <div>
            <p className="card-sub">Mi rutina</p>
            <h1 className="card-title" id="mi-rutina-titulo">{rutina.nombre}</h1>
            <p className="card-sub">{rutina.objetivo}</p>
          </div>
          <BadgeEstadoRutina estado={estado} detalle={textoVigencia(rutina, estado)} />
        </div>
        {aviso && (
          <div className="alert-g show inst-alerta-info" role="status">
            <i className="bi bi-info-circle me-1" aria-hidden="true" />{aviso}
          </div>
        )}
        {rutina.descripcion && <p>{rutina.descripcion}</p>}
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

      <section className="card-g" aria-labelledby="mi-rutina-avance">
        <div className="card-head">
          <h2 className="card-title" id="mi-rutina-avance">Mi avance</h2>
        </div>
        <AvanceRutina
          avance={avance}
          siguiente={vigente ? siguiente : null}
          ideal={vigente && (rutina.sesiones_planeadas ?? 0) > 0 ? idealAHoy(rutina) : null}
        />
      </section>

      <section className="card-g" aria-labelledby="mi-rutina-sesiones">
        <div className="card-head">
          <div>
            <h2 className="card-title" id="mi-rutina-sesiones">Sesiones de la rutina</h2>
            {vigente && siguiente && activa === siguiente && (
              <p className="card-sub">Sesión {siguiente} sugerida para tu entrenamiento de hoy</p>
            )}
          </div>
          {vigente && sesionActiva && sesionActiva.ejercicios.length > 0 && (
            <div className="cli-sesion-cta">
              <button type="button" className="btn-neon cli-ent-boton" onClick={iniciarEntrenamiento}>
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
          <p className="cli-ej-texto">{ejercicio.descripcion.trim() ? ejercicio.descripcion : "No hay instrucciones adicionales para este ejercicio."}</p>
        </section>
        {fila.notas_instructor.trim() && <section className="cli-ej-nota" aria-labelledby="cli-ej-nota-titulo">
          <h3 className="cli-ej-seccion" id="cli-ej-nota-titulo">
            <i className="bi bi-chat-left-text me-2" aria-hidden="true" />Nota de tu instructor
          </h3>
          <p className="cli-ej-texto">{fila.notas_instructor}</p>
        </section>}
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
