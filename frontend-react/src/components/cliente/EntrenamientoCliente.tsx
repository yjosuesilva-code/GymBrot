import { useEffect, useReducer, useRef, useState } from "react";
import { Collapse, Modal } from "react-bootstrap";
import { formatoPrescripcion } from "../../lib/rutinas";
import { VistaPreviaRecurso } from "../ejercicios/VistaPreviaRecurso";
import {
  cantidadObjetivo,
  crearEntrenamiento,
  ejercicioCompleto,
  ejercicioRealizable,
  permitePeso,
  progresoSesion,
  reducirEntrenamiento,
  serieValida,
} from "./entrenamiento";
import type { InicioEntrenamiento } from "./entrenamiento";

type Props = InicioEntrenamiento & {
  nombreRutina: string;
  onSalir: () => void;
};

export function EntrenamientoCliente({ nombreRutina, onSalir, ...inicio }: Props) {
  const [estado, enviar] = useReducer(reducirEntrenamiento, inicio, crearEntrenamiento);
  const [confirmarSalida, setConfirmarSalida] = useState(false);
  const [indiceTecnicaAbierta, setIndiceTecnicaAbierta] = useState<number | null>(null);
  const titulo = useRef<HTMLHeadingElement>(null);
  const descansando = estado.descanso.estado === "activo";
  const mostrarTecnica = indiceTecnicaAbierta === estado.indice;
  const idPanelTecnica = `cli-ent-tecnica-${estado.indice}`;

  useEffect(() => {
    if (!descansando) return;
    // Una fecha límite evita acumular retraso si la pestaña estuvo en segundo plano.
    const intervalo = window.setInterval(() => enviar({ tipo: "tick", ahora: Date.now() }), 1000);
    return () => window.clearInterval(intervalo);
  }, [descansando]);

  useEffect(() => {
    titulo.current?.focus();
  }, [estado.indice, estado.vista]);

  useEffect(() => {
    if (!estado.modificado) return;
    const avisar = (e: BeforeUnloadEvent) => {
      e.preventDefault();
    };
    window.addEventListener("beforeunload", avisar);
    return () => window.removeEventListener("beforeunload", avisar);
  }, [estado.modificado]);

  const progreso = progresoSesion(estado);
  const actual = estado.ejercicios[estado.indice];
  const porTiempo = actual?.ejercicio?.tipo_medicion === "TIEMPO";
  const conPeso = actual ? permitePeso(actual) : false;
  const metaCantidad = actual ? cantidadObjetivo(actual) : null;
  const pasoCantidad = porTiempo ? 5 : 1;
  const serieActual = actual?.series.findIndex((s) => !s.completada) ?? -1;
  const primerPendiente = estado.ejercicios.findIndex((e) => !ejercicioCompleto(e));
  const hayEjerciciosNoRealizables = estado.ejercicios.some((e) => !ejercicioRealizable(e));
  const segundos = estado.descanso.segundosRestantes;
  const reloj = `${String(Math.floor(segundos / 60)).padStart(2, "0")}:${String(segundos % 60).padStart(2, "0")}`;

  function salir() {
    if (estado.modificado) setConfirmarSalida(true);
    else onSalir();
  }

  function ajustarCantidad(indiceSerie: number, valorActual: string, delta: number) {
    const vacio = valorActual.trim() === "";
    const base = vacio ? (metaCantidad ?? 0) : Number(valorActual) || 0;
    const siguiente = vacio && delta > 0 && metaCantidad != null ? metaCantidad : Math.max(1, Math.round(base + delta));
    enviar({ tipo: "editar", serie: indiceSerie, campo: "cantidad", valor: String(siguiente) });
  }

  function ajustarPeso(indiceSerie: number, valorActual: string, delta: number) {
    const base = valorActual.trim() === "" ? (actual?.fila.peso_kg ?? 0) : Number(valorActual) || 0;
    const siguiente = Math.max(0, Math.round((base + delta) * 10) / 10);
    enviar({ tipo: "editar", serie: indiceSerie, campo: "peso", valor: String(siguiente) });
  }

  return (
    <div className="cli-entrenamiento">
      <header className="card-g cli-ent-cabecera">
        <div>
          <p className="cli-ent-secundario">{nombreRutina}</p>
          <h1 className="card-title">Entrenamiento · Sesión {estado.sesion}</h1>
          <p className="cli-ent-secundario">El progreso se conserva mientras permanezcas en este entrenamiento. Aún no está guardado.</p>
        </div>
        <button type="button" className="btn-dark cli-ent-boton" onClick={salir}>Salir del entrenamiento</button>
        <div className="cli-ent-progreso">
          <label htmlFor="cli-ent-progreso">{progreso.completados} de {progreso.total} ejercicios completados · {progreso.porcentaje}%</label>
          <progress className="cli-ent-barra" id="cli-ent-progreso" max={Math.max(1, progreso.total)} value={progreso.completados} />
        </div>
      </header>

      {hayEjerciciosNoRealizables && (
        <p className="card-g cli-ent-secundario" role="status">Hay ejercicios sin datos de catálogo o sin series válidas. Puedes realizar los demás, pero esta sesión no estará completa hasta que tu instructor corrija la asignación.</p>
      )}

      {estado.vista === "resumen" ? (
        <section className="card-g cli-ent-panel" aria-labelledby="cli-ent-resumen">
          <h2 className="card-title cli-ent-titulo" id="cli-ent-resumen" ref={titulo} tabIndex={-1}>Revisión de la sesión {estado.sesion}</h2>
          <p className="cli-ent-secundario">Todas las series están completadas. Revisa lo que realizaste.</p>
          <ol className="cli-ent-resumen">
            {estado.ejercicios.map((e, indice) => (
              <li className="cli-ent-serie" key={e.fila.id_ejercicio}>
                <h3 className="cli-ej-seccion">{e.ejercicio?.nombre ?? "Ejercicio no disponible"}</h3>
                <p>{e.series.length} series completadas</p>
                <ul className="cli-ent-resultados">
                  {e.series.map((s, n) => (
                    <li key={n}>Serie {n + 1}: {s.cantidad} {e.ejercicio?.tipo_medicion === "TIEMPO" ? "s" : "repeticiones"}{permitePeso(e) && s.peso.trim() !== "" ? ` · ${s.peso} kg` : ""}</li>
                  ))}
                </ul>
                <button type="button" className="btn-dark cli-ent-boton" onClick={() => enviar({ tipo: "ir", indice })} aria-label={`Revisar series de ${e.ejercicio?.nombre ?? "este ejercicio"}`}>Revisar series</button>
              </li>
            ))}
          </ol>
          {/* ETAPA 4: conectar aquí la finalización usando el estado por serie, sin perder valores diferentes entre series. */}
          <p className="cli-ent-secundario" id="cli-ent-sin-guardar">Tu sesión aún no se ha guardado. La opción de finalizar y registrar estará disponible próximamente.</p>
          <button type="button" className="btn-neon cli-ent-boton cli-ent-principal" disabled aria-describedby="cli-ent-sin-guardar">Sesión lista para finalizar</button>
        </section>
      ) : actual ? (
        <>
          <section className="card-g cli-ent-panel" aria-labelledby="cli-ent-ejercicio">
            <p className="cli-ent-secundario">Ejercicio {estado.indice + 1} de {progreso.total}</p>
            <h2 className="card-title cli-ent-titulo" id="cli-ent-ejercicio" ref={titulo} tabIndex={-1}>{actual.ejercicio?.nombre ?? "Ejercicio no disponible"}</h2>
            {actual.ejercicio && (
              <>
                <div className="cli-ej-meta">
                  <span className="badge-g cli-ej-etiqueta">{actual.ejercicio.grupo_muscular}</span>
                  <span className="badge-g cli-ej-etiqueta">{actual.ejercicio.nivel}</span>
                  <span className="badge-g cli-ej-etiqueta">{actual.ejercicio.equipo}</span>
                </div>
                <VistaPreviaRecurso key={actual.ejercicio.recurso_url} url={actual.ejercicio.recurso_url} tamano="grande" alt={actual.ejercicio.nombre} grupo={actual.ejercicio.grupo_muscular} />
                <div className="cli-ent-objetivo">
                  <div>
                    <h3 className="cli-ej-seccion mb-1">Objetivo asignado</h3>
                    <p className="cli-ent-objetivo-valor">
                      {formatoPrescripcion({
                        ...actual.fila,
                        descanso_seg: null,
                        segundos: porTiempo ? actual.fila.segundos : null,
                        reps_min: porTiempo ? null : actual.fila.reps_min,
                        reps_max: porTiempo ? null : actual.fila.reps_max,
                      })}
                    </p>
                    <span className="cli-ent-secundario">
                      {porTiempo ? "Duración por serie" : "Repeticiones por serie"}
                      {actual.fila.descanso_seg != null ? ` · Descanso: ${actual.fila.descanso_seg} s entre series` : ""}
                    </span>
                  </div>
                  <button
                    type="button"
                    className={`btn-dark cli-ent-boton cli-ent-toggle-tecnica${mostrarTecnica ? " cli-ent-toggle-tecnica--activo" : ""}`}
                    aria-expanded={mostrarTecnica}
                    aria-controls={idPanelTecnica}
                    onClick={() => setIndiceTecnicaAbierta((prev) => (prev === estado.indice ? null : estado.indice))}
                  >
                    <i className="bi bi-info-circle me-2" aria-hidden="true" />
                    <span>{mostrarTecnica ? "Ocultar técnica" : "Ver técnica"}</span>
                    <i className={`bi ${mostrarTecnica ? "bi-chevron-up" : "bi-chevron-down"} ms-2`} aria-hidden="true" />
                  </button>
                </div>
                <Collapse in={mostrarTecnica}>
                  <div id={idPanelTecnica}>
                    <div className="cli-ent-tecnica" role="region" aria-label={`Técnica de ${actual.ejercicio.nombre}`}>
                      <h3 className="cli-ej-seccion mb-0">
                        <i className="bi bi-lightning-charge me-2" aria-hidden="true" />¿Cómo realizarlo?
                      </h3>
                      <p className="cli-ej-texto">{actual.ejercicio.descripcion.trim() ? actual.ejercicio.descripcion : "No hay instrucciones adicionales para este ejercicio."}</p>
                    </div>
                  </div>
                </Collapse>
                {actual.fila.notas_instructor.trim() && (
                  <div className="cli-ej-nota">
                    <h3 className="cli-ej-seccion"><i className="bi bi-chat-left-text me-2" aria-hidden="true" />Nota de tu instructor</h3>
                    <p className="cli-ej-texto">{actual.fila.notas_instructor}</p>
                  </div>
                )}
              </>
            )}
          </section>

          {estado.descanso.estado !== "inactivo" && (
            <section className="card-g cli-ent-descanso" aria-label="Descanso entre series">
              <h2 className="cli-ej-seccion">Descanso</h2>
              <div className="cli-ent-reloj" role="timer" aria-live="off" aria-label={`${segundos} segundos restantes`}>{reloj}</div>
              <p className="cli-ent-secundario" role="status">{descansando ? "Descanso en curso" : "Descanso terminado. Puedes iniciar la siguiente serie."}</p>
              {descansando && (
                <div className="cli-ent-controles">
                  <button type="button" className="btn-dark cli-ent-boton" onClick={() => enviar({ tipo: "omitir-descanso" })}>Omitir descanso</button>
                  <button type="button" className="btn-dark cli-ent-boton" onClick={() => enviar({ tipo: "ampliar-descanso", ahora: Date.now() })} aria-label="Añadir 15 segundos al descanso">+15 s</button>
                </div>
              )}
            </section>
          )}

          <section className="card-g cli-ent-panel" aria-labelledby="cli-ent-series">
            <h2 className="card-title" id="cli-ent-series">Tus series</h2>
            {!actual.ejercicio || actual.series.length === 0 ? (
              <p className="cli-ent-secundario" role="status">{!actual.ejercicio ? "Este ejercicio ya no está disponible en el catálogo." : "Este ejercicio no tiene una cantidad válida de series asignadas."} Consulta con tu instructor. No se puede completar este ejercicio.</p>
            ) : (
              <>
                <p className="cli-ent-secundario" role="status">{serieActual === -1 ? "Todas las series de este ejercicio están completadas." : `Siguiente pendiente: serie ${serieActual + 1} de ${actual.series.length}.`}</p>
                <div className="cli-ent-series">
                  {actual.series.map((serie, indice) => {
                    const prefijo = `cli-serie-${estado.indice}-${indice}`;
                    const valida = serieValida(serie, conPeso);
                    const esActiva = !serie.completada && serieActual === indice;
                    return (
                      <div
                        role="group"
                        aria-labelledby={`${prefijo}-titulo`}
                        className={`cli-ent-serie${esActiva ? " cli-ent-serie--activa" : ""}${serie.completada ? " cli-ent-serie--completada" : ""}`}
                        key={indice}
                      >
                        <div className="cli-ent-serie-cabecera">
                          <h3 className="cli-ent-serie-titulo" id={`${prefijo}-titulo`}>
                            <span>Serie {indice + 1}</span>
                            {esActiva && <span className="badge-g badge-activo">En turno</span>}
                          </h3>
                          {serie.completada ? (
                            <span className="badge-g badge-completada">Completada</span>
                          ) : metaCantidad !== null && serie.cantidad.trim() === "" ? (
                            <button
                              type="button"
                              className="cli-ent-atajo"
                              onClick={() => enviar({ tipo: "editar", serie: indice, campo: "cantidad", valor: String(metaCantidad) })}
                            >
                              Usar objetivo ({metaCantidad} {porTiempo ? "s" : "reps"})
                            </button>
                          ) : null}
                        </div>
                        <div className="cli-ent-campos">
                          <div>
                            <label className="cli-ent-label" htmlFor={`${prefijo}-cantidad`}>{porTiempo ? "Segundos realizados" : "Repeticiones realizadas"}</label>
                            <div className="cli-ent-control-num">
                              <button
                                type="button"
                                className="btn-dark cli-ent-paso"
                                disabled={serie.completada}
                                onClick={() => ajustarCantidad(indice, serie.cantidad, -pasoCantidad)}
                                aria-label={`Restar ${pasoCantidad} a ${porTiempo ? "segundos" : "repeticiones"} de la serie ${indice + 1}`}
                              >
                                −
                              </button>
                              <input
                                id={`${prefijo}-cantidad`} className="form-control-dark" type="number" inputMode="numeric" min="1" step="1"
                                value={serie.cantidad} disabled={serie.completada}
                                placeholder={porTiempo ? (actual.fila.segundos != null ? `Objetivo: ${actual.fila.segundos} s` : "Sin objetivo indicado") : `Objetivo: ${formatoPrescripcion({ reps_min: actual.fila.reps_min, reps_max: actual.fila.reps_max })}`}
                                onChange={(e) => enviar({ tipo: "editar", serie: indice, campo: "cantidad", valor: e.target.value })}
                                aria-describedby={!serie.completada && !valida ? `${prefijo}-ayuda` : undefined}
                              />
                              <button
                                type="button"
                                className="btn-dark cli-ent-paso"
                                disabled={serie.completada}
                                onClick={() => ajustarCantidad(indice, serie.cantidad, pasoCantidad)}
                                aria-label={`Sumar ${pasoCantidad} a ${porTiempo ? "segundos" : "repeticiones"} de la serie ${indice + 1}`}
                              >
                                +
                              </button>
                            </div>
                          </div>
                          {conPeso && (
                            <div>
                              <label className="cli-ent-label" htmlFor={`${prefijo}-peso`}>Peso utilizado (kg, opcional)</label>
                              <div className="cli-ent-control-num">
                                <button
                                  type="button"
                                  className="btn-dark cli-ent-paso"
                                  disabled={serie.completada}
                                  onClick={() => ajustarPeso(indice, serie.peso, -2.5)}
                                  aria-label={`Restar 2.5 kg en la serie ${indice + 1}`}
                                >
                                  −
                                </button>
                                <input
                                  id={`${prefijo}-peso`} className="form-control-dark" type="number" inputMode="decimal" min="0" step="any"
                                  value={serie.peso} disabled={serie.completada} placeholder="Sin peso registrado"
                                  onChange={(e) => enviar({ tipo: "editar", serie: indice, campo: "peso", valor: e.target.value })}
                                />
                                <button
                                  type="button"
                                  className="btn-dark cli-ent-paso"
                                  disabled={serie.completada}
                                  onClick={() => ajustarPeso(indice, serie.peso, 2.5)}
                                  aria-label={`Sumar 2.5 kg en la serie ${indice + 1}`}
                                >
                                  +
                                </button>
                              </div>
                            </div>
                          )}
                        </div>
                        {!serie.completada && !valida && <p className="cli-ent-ayuda" id={`${prefijo}-ayuda`}>Introduce {porTiempo ? "segundos" : "repeticiones"} en un entero mayor que cero y, si registras peso, un valor no negativo.</p>}
                        <button
                          type="button" className={`${esActiva ? "btn-neon" : "btn-dark"} cli-ent-boton cli-ent-principal`}
                          disabled={!serie.completada && !valida} aria-pressed={serie.completada}
                          onClick={() => enviar({ tipo: "completar", serie: indice, ahora: Date.now() })}
                          aria-label={`${serie.completada ? "Desmarcar" : "Completar"} serie ${indice + 1}`}
                        >
                          <i className={`bi ${serie.completada ? "bi-arrow-counterclockwise" : "bi-check2"} me-2`} aria-hidden="true" />
                          {serie.completada ? "Desmarcar serie" : "Completar serie"}
                        </button>
                      </div>
                    );
                  })}
                </div>
              </>
            )}
          </section>

          <nav className="cli-ent-navegacion" aria-label="Ejercicios del entrenamiento">
            <button type="button" className="btn-dark cli-ent-boton" disabled={estado.indice === 0} onClick={() => enviar({ tipo: "ir", indice: estado.indice - 1 })}><i className="bi bi-arrow-left me-2" aria-hidden="true" />Anterior</button>
            {estado.indice < progreso.total - 1 ? (
              <button type="button" className="btn-dark cli-ent-boton" onClick={() => enviar({ tipo: "ir", indice: estado.indice + 1 })}>Siguiente<i className="bi bi-arrow-right ms-2" aria-hidden="true" /></button>
            ) : (
              <button type="button" className="btn-neon cli-ent-boton" disabled={estado.estado !== "lista-para-finalizar"} onClick={() => enviar({ tipo: "revisar" })}>Revisar entrenamiento</button>
            )}
          </nav>
          {estado.estado === "lista-para-finalizar" && estado.indice < progreso.total - 1 && (
            <button type="button" className="btn-neon cli-ent-boton cli-ent-principal" onClick={() => enviar({ tipo: "revisar" })}>
              <i className="bi bi-check2-all me-2" aria-hidden="true" />Ir a la revisión del entrenamiento
            </button>
          )}
          {estado.indice === progreso.total - 1 && primerPendiente !== -1 && (
            <div className="cli-ent-pendientes">
              <p className="cli-ent-secundario">Completa todas las series para revisar el entrenamiento.</p>
              {primerPendiente !== estado.indice && <button type="button" className="btn-dark cli-ent-boton" onClick={() => enviar({ tipo: "ir", indice: primerPendiente })}>Volver al primer ejercicio pendiente</button>}
            </div>
          )}
        </>
      ) : <p className="card-g">Esta sesión no tiene ejercicios disponibles.</p>}

      <Modal show={confirmarSalida} onHide={() => setConfirmarSalida(false)} centered aria-labelledby="cli-ent-salir-titulo" aria-describedby="cli-ent-salir-mensaje">
        <Modal.Header><Modal.Title as="h2" id="cli-ent-salir-titulo">¿Salir del entrenamiento?</Modal.Title></Modal.Header>
        <Modal.Body id="cli-ent-salir-mensaje">Tu progreso de este entrenamiento todavía no se ha guardado. Si sales ahora, se perderán los datos registrados.</Modal.Body>
        <Modal.Footer>
          <button type="button" className="btn-dark cli-ent-boton" onClick={onSalir}>Salir y descartar</button>
          <button type="button" className="btn-neon cli-ent-boton" autoFocus onClick={() => setConfirmarSalida(false)}>Continuar entrenando</button>
        </Modal.Footer>
      </Modal>
    </div>
  );
}
