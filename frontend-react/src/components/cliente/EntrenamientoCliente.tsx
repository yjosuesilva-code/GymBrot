import { useEffect, useReducer, useRef, useState } from "react";
import { Collapse, Modal } from "react-bootstrap";
import { formatoPrescripcion, MAX_PESO_KG, MAX_REPS, MAX_SEGUNDOS } from "../../lib/rutinas";
import { utils } from "../../lib/utils";
import type { ApiResp, RegistroEntrenamiento, RegistroNuevo } from "../../types";
import { VistaPreviaRecurso } from "../ejercicios/VistaPreviaRecurso";
import { ResumenEntrenamiento } from "./ResumenEntrenamiento";
import {
  cantidadObjetivo,
  crearEntrenamiento,
  ejercicioCompleto,
  ejercicioRealizable,
  ejerciciosRealizados,
  errorSerie,
  permitePeso,
  progresoSesion,
  reducirEntrenamiento,
} from "./entrenamiento";
import type { InicioEntrenamiento } from "./entrenamiento";
import { obtenerNotaEntrenador, obtenerPasosTecnicos } from "./guiaTecnica";

type Props = InicioEntrenamiento & {
  nombreRutina: string;
  onSalir: () => void;
  onRegistrar: (registro: RegistroNuevo) => Promise<ApiResp<RegistroEntrenamiento>>;
  onRegistrado: () => void;
};

export function EntrenamientoCliente({ nombreRutina, onSalir, onRegistrar, onRegistrado, ...inicio }: Props) {
  const [estado, enviar] = useReducer(reducirEntrenamiento, inicio, crearEntrenamiento);
  const [confirmarSalida, setConfirmarSalida] = useState(false);
  const [indiceTecnicaAbierta, setIndiceTecnicaAbierta] = useState<number | null>(null);
  const [notasSesion, setNotasSesion] = useState("");
  const titulo = useRef<HTMLHeadingElement>(null);
  const envioEnCurso = useRef(false);
  const [guardando, setGuardando] = useState(false);
  const [errorGuardado, setErrorGuardado] = useState<string | null>(null);
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
  const pasosTecnicos = actual ? obtenerPasosTecnicos(actual.ejercicio) : [];
  const notaEntrenador = actual ? obtenerNotaEntrenador(actual.fila, actual.ejercicio) : "";
  const seriesCompletadas = actual ? actual.series.filter((s) => s.completada).length : 0;
  const serieActual = actual?.series.findIndex((s) => !s.completada) ?? -1;
  const primerPendiente = estado.ejercicios.findIndex((e) => !ejercicioCompleto(e));
  const hayEjerciciosNoRealizables = estado.ejercicios.some((e) => !ejercicioRealizable(e));
  const segundos = estado.descanso.segundosRestantes;
  const reloj = `${String(Math.floor(segundos / 60)).padStart(2, "0")}:${String(segundos % 60).padStart(2, "0")}`;

  function salir() {
    if (envioEnCurso.current) return;
    if (estado.modificado) setConfirmarSalida(true);
    else onSalir();
  }

  async function finalizar() {
    if (envioEnCurso.current) return;
    setErrorGuardado(null);
    if (estado.ejercicios.length === 0 || !estado.ejercicios.every(ejercicioCompleto)) {
      setErrorGuardado("Completa todas las series antes de finalizar el entrenamiento.");
      return;
    }
    let registro: RegistroNuevo;
    try {
      registro = {
        sesion: estado.sesion,
        fecha: utils.isoDate(),
        notas: notasSesion.trim(),
        ejercicios_realizados: ejerciciosRealizados(estado),
      };
    } catch (error: unknown) {
      setErrorGuardado(error instanceof Error ? error.message : "Revisa los datos de las series antes de finalizar.");
      return;
    }
    // El ref bloquea también dos eventos antes del siguiente render de React.
    envioEnCurso.current = true;
    setGuardando(true);
    let respuesta: ApiResp<RegistroEntrenamiento>;
    try {
      respuesta = await onRegistrar(registro);
    } catch {
      setErrorGuardado("No se pudo registrar el entrenamiento. Tus datos se conservan; vuelve a intentarlo.");
      envioEnCurso.current = false;
      setGuardando(false);
      return;
    }
    if (respuesta?.ok !== true) {
      setErrorGuardado(respuesta?.ok === false ? respuesta.mensaje : "No se pudo confirmar el registro. Tus datos se conservan; vuelve a intentarlo.");
      envioEnCurso.current = false;
      setGuardando(false);
      return;
    }
    // Solo un registro exitoso desmonta este componente y elimina su estado y temporizadores.
    onRegistrado();
  }

  function ajustarCantidad(indiceSerie: number, valorActual: string, delta: number) {
    const vacio = valorActual.trim() === "";
    const base = vacio ? (metaCantidad ?? 0) : Number(valorActual) || 0;
    const siguiente = Math.min(porTiempo ? MAX_SEGUNDOS : MAX_REPS,
      vacio && delta > 0 && metaCantidad != null ? metaCantidad : Math.max(0, Math.round(base + delta)));
    enviar({ tipo: "editar", serie: indiceSerie, campo: "cantidad", valor: String(siguiente) });
  }

  function ajustarPeso(indiceSerie: number, valorActual: string, delta: number) {
    const base = valorActual.trim() === "" ? (actual?.fila.peso_kg ?? 0) : Number(valorActual) || 0;
    const siguiente = Math.min(MAX_PESO_KG, Math.max(0, Math.round((base + delta) * 10) / 10));
    enviar({ tipo: "editar", serie: indiceSerie, campo: "peso", valor: String(siguiente) });
  }

  return (
    <div className="cli-entrenamiento">
      <header className="card-g cli-ent-cabecera">
        <div>
          <p className="cli-ent-secundario">{nombreRutina}</p>
          <h1 className="card-title mb-0">Entrenamiento · Sesión {estado.sesion}</h1>
        </div>
        <button type="button" className="btn-dark cli-ent-boton" disabled={guardando} onClick={salir}>Salir</button>
        <div className="cli-ent-progreso">
          <label htmlFor="cli-ent-progreso">{progreso.completados} de {progreso.total} ejercicios completados · {progreso.porcentaje}%</label>
          <progress className="cli-ent-barra" id="cli-ent-progreso" max={Math.max(1, progreso.total)} value={progreso.completados} />
        </div>
        {estado.vista === "ejercicio" && estado.ejercicios.length > 1 && (
          <nav className="cli-ent-pasos-ej" aria-label="Saltar a ejercicio">
            {estado.ejercicios.map((item, idx) => {
              const listo = ejercicioCompleto(item);
              const activo = idx === estado.indice;
              const nombreEj = item.ejercicio?.nombre ?? `Ejercicio ${idx + 1}`;
              return (
                <button
                  key={item.fila.id_ejercicio}
                  type="button"
                  className={`cli-ent-paso-ej${activo ? " cli-ent-paso-ej--activo" : ""}${listo ? " cli-ent-paso-ej--listo" : ""}`}
                  aria-current={activo ? "step" : undefined}
                  aria-label={`Ejercicio ${idx + 1}: ${nombreEj}${listo ? " (completado)" : ""}`}
                  title={`${idx + 1}. ${nombreEj}`}
                  onClick={() => enviar({ tipo: "ir", indice: idx })}
                >
                  <span>{idx + 1}</span>
                  {listo && <i className="bi bi-check2" aria-hidden="true" />}
                </button>
              );
            })}
          </nav>
        )}
      </header>

      {hayEjerciciosNoRealizables && (
        <p className="card-g cli-ent-secundario" role="status">Hay ejercicios sin datos de catálogo o sin series válidas. Puedes realizar los demás, pero esta sesión no estará completa hasta que tu instructor corrija la asignación.</p>
      )}

      {estado.vista === "resumen" ? (
        <ResumenEntrenamiento
          estado={estado}
          notas={notasSesion}
          guardando={guardando}
          error={errorGuardado}
          titulo={titulo}
          onCambiarNotas={setNotasSesion}
          onRevisar={(indice) => enviar({ tipo: "ir", indice })}
          onFinalizar={() => void finalizar()}
        />
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
                      <ul className="cli-ej-pasos">
                        {pasosTecnicos.map((paso) => (
                          <li className="cli-ej-paso" key={paso.etapa}>
                            <strong className="cli-ej-paso-etapa">{paso.etapa}:</strong> {paso.instruccion}
                          </li>
                        ))}
                      </ul>
                    </div>
                  </div>
                </Collapse>
                <div className="cli-ej-nota">
                  <h3 className="cli-ej-seccion"><i className="bi bi-chat-left-text me-2" aria-hidden="true" />Nota de tu entrenador</h3>
                  <p className="cli-ej-texto">{notaEntrenador}</p>
                </div>
              </>
            )}
          </section>

          {estado.descanso.estado !== "inactivo" && (
            <section className="card-g cli-ent-descanso" aria-label="Descanso entre series">
              <h2 className="cli-ej-seccion">Descanso</h2>
              <div className="cli-ent-reloj" role="timer" aria-live="off" aria-label={`${segundos} segundos restantes`}>{reloj}</div>
              <p className="cli-ent-secundario" role="status">
                {descansando
                  ? (serieActual !== -1 ? `Siguiente: Serie ${serieActual + 1}` : "Recupera el aliento")
                  : (serieActual !== -1 ? `¡Listo! Continúa con la serie ${serieActual + 1}.` : "Descanso terminado.")}
              </p>
              <div className="cli-ent-controles">
                {descansando ? (
                  <>
                    <button type="button" className="btn-dark cli-ent-boton" onClick={() => enviar({ tipo: "omitir-descanso" })}>Omitir descanso</button>
                    <button type="button" className="btn-dark cli-ent-boton" onClick={() => enviar({ tipo: "ampliar-descanso", ahora: Date.now() })} aria-label="Añadir 15 segundos al descanso">+15 s</button>
                  </>
                ) : (
                  <button type="button" className="btn-dark cli-ent-boton" onClick={() => enviar({ tipo: "cerrar-descanso" })}>Ocultar aviso</button>
                )}
              </div>
            </section>
          )}

          <section className="card-g cli-ent-panel" aria-labelledby="cli-ent-series">
            <div className="cli-ent-series-encabezado">
              <h2 className="card-title mb-0" id="cli-ent-series">Tus series</h2>
              {actual.ejercicio && actual.series.length > 0 && (
                <span className={`badge-g ${serieActual === -1 ? "badge-completada" : "badge-confirmada"}`} role="status">
                  {serieActual === -1 ? "Completadas" : `${seriesCompletadas} de ${actual.series.length}`}
                </span>
              )}
            </div>
            {!actual.ejercicio || actual.series.length === 0 ? (
              <p className="cli-ent-secundario" role="status">{!actual.ejercicio ? "Este ejercicio ya no está disponible en el catálogo." : "Este ejercicio no tiene una cantidad válida de series asignadas."} Consulta con tu instructor. No se puede completar este ejercicio.</p>
            ) : (
              <div className="cli-ent-series">
                {actual.series.map((serie, indice) => {
                  const prefijo = `cli-serie-${estado.indice}-${indice}`;
                  const error = errorSerie(serie, actual);
                  const valida = error === null;
                  const mostrarError = !serie.completada && !valida && serie.cantidad.trim() !== "";
                  const cantidadInvalida = !serie.completada && serie.cantidad.trim() !== "" && errorSerie({ ...serie, peso: "" }, actual) !== null;
                  const pesoInvalido = !serie.completada && serie.peso.trim() !== "" && errorSerie({ ...serie, cantidad: "0" }, actual) !== null;
                  const esActiva = !serie.completada && serieActual === indice;

                  if (serie.completada) {
                    return (
                      <div
                        role="group"
                        aria-labelledby={`${prefijo}-titulo`}
                        className="cli-ent-serie cli-ent-serie--completada cli-ent-serie--compacta"
                        key={indice}
                      >
                        <div className="cli-ent-serie-resumen">
                          <h3 className="cli-ent-serie-titulo" id={`${prefijo}-titulo`}>
                            <span>Serie {indice + 1}</span>
                            <span className="badge-g badge-completada">Completada</span>
                          </h3>
                          <p className="cli-ent-serie-marca">
                            <strong>{serie.cantidad}</strong> {porTiempo ? "s" : "reps"}
                            {conPeso ? (serie.peso.trim() !== "" ? ` · ${serie.peso} kg` : " · Peso corporal") : ""}
                          </p>
                        </div>
                        <button
                          type="button"
                          className="btn-dark cli-ent-boton cli-ent-desmarcar"
                          aria-pressed={true}
                          onClick={() => enviar({ tipo: "completar", serie: indice, ahora: Date.now() })}
                          aria-label={`Desmarcar serie ${indice + 1} para editar`}
                        >
                          <i className="bi bi-arrow-counterclockwise me-2" aria-hidden="true" />
                          Editar
                        </button>
                      </div>
                    );
                  }

                  return (
                    <div
                      role="group"
                      aria-labelledby={`${prefijo}-titulo`}
                      className={`cli-ent-serie${esActiva ? " cli-ent-serie--activa" : ""}`}
                      key={indice}
                    >
                      <div className="cli-ent-serie-cabecera">
                        <h3 className="cli-ent-serie-titulo" id={`${prefijo}-titulo`}>
                          <span>Serie {indice + 1}</span>
                          {esActiva && <span className="badge-g badge-activo">En turno</span>}
                        </h3>
                        {metaCantidad !== null && serie.cantidad.trim() === "" && (
                          <button
                            type="button"
                            className="cli-ent-atajo"
                            onClick={() => enviar({ tipo: "editar", serie: indice, campo: "cantidad", valor: String(metaCantidad) })}
                          >
                            Usar objetivo ({metaCantidad} {porTiempo ? "s" : "reps"})
                          </button>
                        )}
                      </div>
                      <div className="cli-ent-campos">
                        <div>
                          <label className="cli-ent-label" htmlFor={`${prefijo}-cantidad`}>{porTiempo ? "Segundos" : "Repeticiones"}</label>
                          <div className="cli-ent-control-num">
                            <button
                              type="button"
                              className="btn-dark cli-ent-paso"
                              onClick={() => ajustarCantidad(indice, serie.cantidad, -pasoCantidad)}
                              aria-label={`Restar ${pasoCantidad} a ${porTiempo ? "segundos" : "repeticiones"} de la serie ${indice + 1}`}
                            >
                              −
                            </button>
                            <input
                              id={`${prefijo}-cantidad`} className="form-control-dark" type="number" inputMode={porTiempo ? "decimal" : "numeric"} min="0" max={porTiempo ? MAX_SEGUNDOS : MAX_REPS} step={porTiempo ? "any" : "1"}
                              value={serie.cantidad}
                              placeholder={porTiempo ? (actual.fila.segundos != null ? `Objetivo: ${actual.fila.segundos} s` : "0") : `Objetivo: ${formatoPrescripcion({ reps_min: actual.fila.reps_min, reps_max: actual.fila.reps_max })}`}
                              onChange={(e) => enviar({ tipo: "editar", serie: indice, campo: "cantidad", valor: e.target.value })}
                              aria-describedby={mostrarError ? `${prefijo}-ayuda` : undefined}
                              aria-invalid={cantidadInvalida}
                            />
                            <button
                              type="button"
                              className="btn-dark cli-ent-paso"
                              onClick={() => ajustarCantidad(indice, serie.cantidad, pasoCantidad)}
                              aria-label={`Sumar ${pasoCantidad} a ${porTiempo ? "segundos" : "repeticiones"} de la serie ${indice + 1}`}
                            >
                              +
                            </button>
                          </div>
                        </div>
                        {conPeso && (
                          <div>
                            <label className="cli-ent-label" htmlFor={`${prefijo}-peso`}>Peso (kg)</label>
                            <div className="cli-ent-control-num">
                              <button
                                type="button"
                                className="btn-dark cli-ent-paso"
                                onClick={() => ajustarPeso(indice, serie.peso, -2.5)}
                                aria-label={`Restar 2.5 kg en la serie ${indice + 1}`}
                              >
                                −
                              </button>
                              <input
                                id={`${prefijo}-peso`} className="form-control-dark" type="number" inputMode="decimal" min="0" max={MAX_PESO_KG} step="any"
                                value={serie.peso} placeholder="Opcional (peso corporal)"
                                onChange={(e) => enviar({ tipo: "editar", serie: indice, campo: "peso", valor: e.target.value })}
                                aria-describedby={mostrarError ? `${prefijo}-ayuda` : undefined}
                                aria-invalid={pesoInvalido}
                              />
                              <button
                                type="button"
                                className="btn-dark cli-ent-paso"
                                onClick={() => ajustarPeso(indice, serie.peso, 2.5)}
                                aria-label={`Sumar 2.5 kg en la serie ${indice + 1}`}
                              >
                                +
                              </button>
                            </div>
                          </div>
                        )}
                      </div>
                      {mostrarError && (
                        <p className="cli-ent-ayuda cli-ent-validacion" id={`${prefijo}-ayuda`} role="alert">
                          {error}
                        </p>
                      )}
                      <button
                        type="button" className={`${esActiva ? "btn-neon" : "btn-dark"} cli-ent-boton cli-ent-principal`}
                        disabled={!valida} aria-pressed={false}
                        onClick={() => enviar({ tipo: "completar", serie: indice, ahora: Date.now() })}
                        aria-label={`Completar serie ${indice + 1}`}
                      >
                        <i className="bi bi-check2 me-2" aria-hidden="true" />
                        Completar serie
                      </button>
                    </div>
                  );
                })}
              </div>
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
              <i className="bi bi-check2-all me-2" aria-hidden="true" />Ir al resumen del entrenamiento
            </button>
          )}
          {estado.indice === progreso.total - 1 && primerPendiente !== -1 && (
            <div className="cli-ent-pendientes">
              <p className="cli-ent-secundario">Completa todas las series para revisar y guardar el entrenamiento.</p>
              {primerPendiente !== estado.indice && <button type="button" className="btn-dark cli-ent-boton" onClick={() => enviar({ tipo: "ir", indice: primerPendiente })}>Ir al primer ejercicio pendiente</button>}
            </div>
          )}
        </>
      ) : <p className="card-g">Esta sesión no tiene ejercicios disponibles.</p>}

      <Modal show={confirmarSalida} onHide={() => setConfirmarSalida(false)} centered aria-labelledby="cli-ent-salir-titulo" aria-describedby="cli-ent-salir-mensaje">
        <Modal.Header><Modal.Title as="h2" id="cli-ent-salir-titulo">¿Salir del entrenamiento?</Modal.Title></Modal.Header>
        <Modal.Body id="cli-ent-salir-mensaje">Tu progreso de esta sesión aún no se ha guardado. Si sales ahora, se descartarán las series registradas.</Modal.Body>
        <Modal.Footer>
          <button type="button" className="btn-dark cli-ent-boton cli-ent-boton-peligro" onClick={onSalir}>Salir y descartar</button>
          <button type="button" className="btn-neon cli-ent-boton" autoFocus onClick={() => setConfirmarSalida(false)}>Continuar entrenando</button>
        </Modal.Footer>
      </Modal>
    </div>
  );
}
