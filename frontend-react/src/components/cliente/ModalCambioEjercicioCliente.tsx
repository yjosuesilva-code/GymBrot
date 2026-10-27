import { useEffect, useRef, useState } from "react";
import { Modal } from "react-bootstrap";
import { formatoPrescripcion, MAX_PESO_KG, MAX_REPS, MAX_SEGUNDOS } from "../../lib/rutinas";
import type {
  ApiResp,
  Ejercicio,
  EquipoEjercicio,
  GrupoMuscular,
  NivelEjercicio,
  RutinaEjercicio,
  SesionEjercicioNuevo,
} from "../../types";
import { VistaPreviaRecurso } from "../ejercicios/VistaPreviaRecurso";
import {
  construirSesionEjercicioCliente,
  ejerciciosExcluidosEnSesion,
  filtrarCatalogoCliente,
  prescripcionInicialCambio,
  validarFormularioPrescripcion,
} from "./cambioEjercicio";
import type { FormularioPrescripcionCliente, ModoCambioEjercicio } from "./cambioEjercicio";

const GRUPOS: GrupoMuscular[] = [
  "Pecho",
  "Espalda",
  "Hombros",
  "Bíceps",
  "Tríceps",
  "Piernas",
  "Glúteos",
  "Abdomen",
  "Cardio",
  "Cuerpo completo",
];

const NIVELES: NivelEjercicio[] = ["Principiante", "Intermedio", "Avanzado"];

const EQUIPOS: EquipoEjercicio[] = [
  "Máquina",
  "Mancuerna",
  "Barra",
  "Polea",
  "Kettlebell",
  "Banda elástica",
  "Peso corporal",
];

const MAX_LISTA = 60;

type Props = {
  modo: ModoCambioEjercicio;
  catalogo: Ejercicio[];
  filasSesion: RutinaEjercicio[];
  onConfirmar: (
    ejercicioNuevo: SesionEjercicioNuevo,
    idEjercicioAnterior?: number,
  ) => Promise<ApiResp<RutinaEjercicio>>;
  onExito: (modo: ModoCambioEjercicio, resultado: RutinaEjercicio, ejercicio: Ejercicio) => void;
  onCerrar: () => void;
};

export function ModalCambioEjercicioCliente({
  modo,
  catalogo,
  filasSesion,
  onConfirmar,
  onExito,
  onCerrar,
}: Props) {
  const esReemplazo = modo.tipo === "reemplazar";
  const grupoInicial = esReemplazo ? (modo.ejercicioAnterior?.grupo_muscular ?? "") : "";
  const [busqueda, setBusqueda] = useState("");
  const [grupo, setGrupo] = useState<GrupoMuscular | "">(grupoInicial);
  const [nivel, setNivel] = useState<NivelEjercicio | "">("");
  const [equipo, setEquipo] = useState<EquipoEjercicio | "">("");
  const [elegido, setElegido] = useState<Ejercicio | null>(null);
  const [form, setForm] = useState<FormularioPrescripcionCliente | null>(null);
  const [guardando, setGuardando] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const envioEnCurso = useRef(false);
  const tituloConfirmacion = useRef<HTMLHeadingElement>(null);
  const alertaError = useRef<HTMLDivElement>(null);

  const idAnterior = esReemplazo ? modo.filaAnterior.id_ejercicio : undefined;
  const nombreAnterior = esReemplazo
    ? (modo.ejercicioAnterior?.nombre ?? `Ejercicio ${modo.filaAnterior.id_ejercicio}`)
    : "";
  const excluidos = ejerciciosExcluidosEnSesion(filasSesion, idAnterior);
  const disponibles = filtrarCatalogoCliente(catalogo, {
    excluidos,
    busqueda,
    grupo,
    nivel,
    equipo,
  });

  useEffect(() => {
    if (elegido !== null) {
      tituloConfirmacion.current?.focus();
    }
  }, [elegido]);

  useEffect(() => {
    if (error !== null) {
      alertaError.current?.focus();
    }
  }, [error]);

  function seleccionarEjercicio(ej: Ejercicio) {
    setElegido(ej);
    setForm(prescripcionInicialCambio(modo, ej));
    setError(null);
  }

  function volverAlSelector() {
    if (envioEnCurso.current) return;
    setElegido(null);
    setForm(null);
    setError(null);
  }

  function cerrarModal() {
    if (envioEnCurso.current) return;
    onCerrar();
  }

  function actualizarCampo(campo: keyof Omit<FormularioPrescripcionCliente, "origen">, valor: string) {
    setForm((prev) => (prev ? { ...prev, [campo]: valor } : prev));
    if (error) setError(null);
  }

  async function confirmar() {
    if (envioEnCurso.current || !elegido || !form) return;
    setError(null);

    const errorValidacion = validarFormularioPrescripcion(form, elegido);
    if (errorValidacion) {
      setError(errorValidacion);
      return;
    }

    let payload: SesionEjercicioNuevo;
    try {
      payload = construirSesionEjercicioCliente(modo, elegido, form, filasSesion.length);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Revisa los valores antes de continuar.");
      return;
    }

    envioEnCurso.current = true;
    setGuardando(true);
    let respuesta: ApiResp<RutinaEjercicio>;
    try {
      respuesta = await onConfirmar(payload, idAnterior);
    } catch {
      setError("No se pudo guardar el cambio en la rutina. Inténtalo de nuevo.");
      envioEnCurso.current = false;
      setGuardando(false);
      return;
    }

    if (!respuesta?.ok || !respuesta.data) {
      setError(respuesta?.mensaje || "No se pudo aplicar el cambio en la sesión.");
      envioEnCurso.current = false;
      setGuardando(false);
      return;
    }

    envioEnCurso.current = false;
    setGuardando(false);
    onExito(modo, respuesta.data, elegido);
  }

  const porTiempo = elegido?.tipo_medicion === "TIEMPO";
  const admitePeso = elegido !== null && elegido.equipo !== "Peso corporal";

  return (
    <Modal
      show
      onHide={cerrarModal}
      size="lg"
      centered
      scrollable
      fullscreen="sm-down"
      contentClassName="cli-cambio-modal"
      aria-labelledby="cli-cambio-modal-titulo"
    >
      <Modal.Header className="cli-ej-cabecera">
        <div className="cli-ej-identidad">
          <Modal.Title as="h2" id="cli-cambio-modal-titulo">
            {elegido
              ? (esReemplazo ? "Confirmar cambio de ejercicio" : `Confirmar nuevo ejercicio · Sesión ${modo.sesion}`)
              : (esReemplazo ? `Cambiar ejercicio · Sesión ${modo.sesion}` : `Agregar ejercicio · Sesión ${modo.sesion}`)}
          </Modal.Title>
          <p className="cli-ent-secundario mt-1">
            {esReemplazo
              ? `Reemplazarás «${nombreAnterior}» en la sesión ${modo.sesion}.`
              : `Incorpora un ejercicio del catálogo a la sesión ${modo.sesion}.`}
          </p>
        </div>
        <button
          type="button"
          className="btn-dark cli-ej-cerrar-icono"
          disabled={guardando}
          onClick={cerrarModal}
          aria-label="Cerrar ventana"
          title="Cerrar ventana"
        >
          <i className="bi bi-x-lg" aria-hidden="true" />
        </button>
      </Modal.Header>

      <Modal.Body className="cli-cambio-cuerpo">
        {!elegido || !form ? (
          <>
            <div className="cli-cambio-filtros">
              <div className="cli-cambio-campo-busqueda">
                <label className="form-label-g" htmlFor="cli-cambio-busqueda">Buscar ejercicio</label>
                <div className="search-box">
                  <span className="search-ico"><i className="bi bi-search" aria-hidden="true" /></span>
                  <input
                    id="cli-cambio-busqueda"
                    type="search"
                    className="form-control-dark"
                    placeholder="Nombre, grupo muscular o equipo…"
                    value={busqueda}
                    autoFocus
                    onChange={(e) => setBusqueda(e.target.value)}
                  />
                </div>
              </div>
              <div className="cli-cambio-selectores">
                <div>
                  <label className="form-label-g" htmlFor="cli-cambio-grupo">Grupo muscular</label>
                  <select
                    id="cli-cambio-grupo"
                    className="form-control-dark"
                    value={grupo}
                    onChange={(e) => setGrupo(e.target.value as GrupoMuscular | "")}
                  >
                    <option value="">Todos los grupos</option>
                    {GRUPOS.map((g) => <option key={g} value={g}>{g}</option>)}
                  </select>
                </div>
                <div>
                  <label className="form-label-g" htmlFor="cli-cambio-nivel">Nivel</label>
                  <select
                    id="cli-cambio-nivel"
                    className="form-control-dark"
                    value={nivel}
                    onChange={(e) => setNivel(e.target.value as NivelEjercicio | "")}
                  >
                    <option value="">Todos los niveles</option>
                    {NIVELES.map((n) => <option key={n} value={n}>{n}</option>)}
                  </select>
                </div>
                <div>
                  <label className="form-label-g" htmlFor="cli-cambio-equipo">Equipo</label>
                  <select
                    id="cli-cambio-equipo"
                    className="form-control-dark"
                    value={equipo}
                    onChange={(e) => setEquipo(e.target.value as EquipoEjercicio | "")}
                  >
                    <option value="">Todo el equipo</option>
                    {EQUIPOS.map((x) => <option key={x} value={x}>{x}</option>)}
                  </select>
                </div>
              </div>
            </div>

            <div className="cli-cambio-encabezado-lista">
              <span className="form-label-g mb-0">
                Catálogo disponible ({disponibles.length})
              </span>
              <span className="cli-ent-secundario">
                Se omiten los ejercicios que ya están en la sesión {modo.sesion}.
              </span>
            </div>

            {disponibles.length === 0 ? (
              <div className="cli-cambio-vacio">
                <p className="empty-state mb-2">Ningún ejercicio coincide con los filtros actuales.</p>
                {(busqueda !== "" || grupo !== "" || nivel !== "" || equipo !== "") && (
                  <button
                    type="button"
                    className="btn-dark cli-ent-boton"
                    onClick={() => {
                      setBusqueda("");
                      setGrupo("");
                      setNivel("");
                      setEquipo("");
                    }}
                  >
                    Limpiar filtros
                  </button>
                )}
              </div>
            ) : (
              <div className="cli-selector-lista" role="list" aria-label="Ejercicios disponibles del catálogo">
                {disponibles.slice(0, MAX_LISTA).map((e) => {
                  const sugerencia = formatoPrescripcion({
                    series: e.series_sugeridas ?? undefined,
                    reps_min: e.tipo_medicion === "TIEMPO" ? null : e.repeticiones_min_sugeridas,
                    reps_max: e.tipo_medicion === "TIEMPO" ? null : e.repeticiones_max_sugeridas,
                    segundos: e.tipo_medicion === "TIEMPO" ? e.segundos_sugeridos : null,
                  });
                  return (
                    <div role="listitem" key={e.id_ejercicio}>
                      <button
                        type="button"
                        className="cli-selector-opcion"
                        aria-label={`Seleccionar ${e.nombre} (${e.grupo_muscular}, ${e.equipo})`}
                        onClick={() => seleccionarEjercicio(e)}
                      >
                        <VistaPreviaRecurso
                          key={e.recurso_url}
                          url={e.recurso_url}
                          tamano="mini"
                          alt={e.nombre}
                          grupo={e.grupo_muscular}
                        />
                        <div className="cli-selector-opcion-info">
                          <div className="cli-selector-opcion-titulo">
                            <span className="person-name">{e.nombre}</span>
                            <span className="badge-g cli-ej-etiqueta">{e.grupo_muscular}</span>
                          </div>
                          <span className="person-sub d-block">
                            {e.nivel} · {e.equipo}
                            {sugerencia !== "—" ? ` · Sugerido: ${sugerencia}` : ""}
                          </span>
                        </div>
                        <span className="cli-selector-opcion-cta" aria-hidden="true">
                          <span>Elegir</span>
                          <i className="bi bi-chevron-right ms-1" />
                        </span>
                      </button>
                    </div>
                  );
                })}
                {disponibles.length > MAX_LISTA && (
                  <p className="cli-ent-secundario mt-1">
                    Mostrando los primeros {MAX_LISTA} resultados. Usa el buscador o los filtros para acotar.
                  </p>
                )}
              </div>
            )}
          </>
        ) : (
          <div className="cli-cambio-confirmacion">
            <div className="cli-cambio-resumen-head">
              <h3
                className="cli-ej-seccion mb-0"
                id="cli-cambio-confirmacion-subtitulo"
                ref={tituloConfirmacion}
                tabIndex={-1}
              >
                Resumen de la solicitud
              </h3>
              <button
                type="button"
                className="btn-dark cli-ent-boton cli-cambio-volver"
                disabled={guardando}
                onClick={volverAlSelector}
              >
                <i className="bi bi-arrow-left me-2" aria-hidden="true" />Elegir otro ejercicio
              </button>
            </div>

            <dl className="cli-cambio-comparacion">
              {esReemplazo && (
                <div className="cli-cambio-dato">
                  <dt>Ejercicio actual</dt>
                  <dd>{nombreAnterior}</dd>
                </div>
              )}
              <div className="cli-cambio-dato cli-cambio-dato--destacado">
                <dt>Nuevo ejercicio</dt>
                <dd>
                  <span>{elegido.nombre}</span>
                  <small className="d-block cli-ent-secundario mt-1">
                    {elegido.grupo_muscular} · {elegido.nivel} · {elegido.equipo}
                  </small>
                </dd>
              </div>
              <div className="cli-cambio-dato">
                <dt>Sesión</dt>
                <dd>Sesión {modo.sesion}</dd>
              </div>
            </dl>

            <p className="cli-ej-pendiente" role="status">
              <i className="bi bi-clock-history me-2" aria-hidden="true" />
              <strong>El cambio se marcará como «Pendiente de revisión del instructor».</strong>
            </p>

            <section className="cli-cambio-pauta" aria-labelledby="cli-cambio-pauta-titulo">
              <div className="cli-cambio-pauta-cab">
                <h3 className="cli-ej-seccion mb-0" id="cli-cambio-pauta-titulo">
                  Pauta provisional de entrenamiento
                </h3>
                <span className="badge-g badge-pendiente">
                  {form.origen === "conservada"
                    ? "Pauta anterior conservada"
                    : "Sugerencia del catálogo"}
                </span>
              </div>
              <p className="cli-ent-secundario">
                {form.origen === "conservada"
                  ? "Se conserva la prescripción base del ejercicio reemplazado para no alterar el volumen de tu sesión. Tu instructor revisará y ajustará estos valores."
                  : "Se proponen los valores sugeridos del catálogo como referencia inicial. No equivalen a una prescripción aprobada por tu instructor."}
              </p>

              <div className="cli-cambio-campos">
                <div>
                  <label className="cli-ent-label" htmlFor="cli-cambio-series">Series</label>
                  <input
                    id="cli-cambio-series"
                    type="number"
                    inputMode="numeric"
                    min="1"
                    max="20"
                    step="1"
                    disabled={guardando}
                    className="form-control-dark"
                    value={form.series}
                    aria-describedby={error ? "cli-cambio-error" : undefined}
                    onChange={(e) => actualizarCampo("series", e.target.value)}
                  />
                </div>

                {porTiempo ? (
                  <div>
                    <label className="cli-ent-label" htmlFor="cli-cambio-segundos">Duración por serie (s)</label>
                    <input
                      id="cli-cambio-segundos"
                      type="number"
                      inputMode="numeric"
                      min="1"
                      max={MAX_SEGUNDOS}
                      step="1"
                      disabled={guardando}
                      className="form-control-dark"
                      value={form.segundos}
                      aria-describedby={error ? "cli-cambio-error" : undefined}
                      onChange={(e) => actualizarCampo("segundos", e.target.value)}
                    />
                  </div>
                ) : (
                  <>
                    <div>
                      <label className="cli-ent-label" htmlFor="cli-cambio-reps-min">Reps mínimas</label>
                      <input
                        id="cli-cambio-reps-min"
                        type="number"
                        inputMode="numeric"
                        min="1"
                        max={MAX_REPS}
                        step="1"
                        disabled={guardando}
                        className="form-control-dark"
                        value={form.repsMin}
                        aria-describedby={error ? "cli-cambio-error" : undefined}
                        onChange={(e) => actualizarCampo("repsMin", e.target.value)}
                      />
                    </div>
                    <div>
                      <label className="cli-ent-label" htmlFor="cli-cambio-reps-max">Reps máximas</label>
                      <input
                        id="cli-cambio-reps-max"
                        type="number"
                        inputMode="numeric"
                        min="1"
                        max={MAX_REPS}
                        step="1"
                        disabled={guardando}
                        className="form-control-dark"
                        value={form.repsMax}
                        aria-describedby={error ? "cli-cambio-error" : undefined}
                        onChange={(e) => actualizarCampo("repsMax", e.target.value)}
                      />
                    </div>
                  </>
                )}

                <div>
                  <label className="cli-ent-label" htmlFor="cli-cambio-descanso">Descanso entre series (s)</label>
                  <input
                    id="cli-cambio-descanso"
                    type="number"
                    inputMode="numeric"
                    min="0"
                    max={MAX_SEGUNDOS}
                    step="5"
                    disabled={guardando}
                    className="form-control-dark"
                    value={form.descansoSeg}
                    aria-describedby={error ? "cli-cambio-error" : undefined}
                    onChange={(e) => actualizarCampo("descansoSeg", e.target.value)}
                  />
                </div>

                {admitePeso && (
                  <div>
                    <label className="cli-ent-label" htmlFor="cli-cambio-peso">Peso sugerido opcional (kg)</label>
                    <input
                      id="cli-cambio-peso"
                      type="number"
                      inputMode="decimal"
                      min="0"
                      max={MAX_PESO_KG}
                      step="any"
                      placeholder="Opcional"
                      disabled={guardando}
                      className="form-control-dark"
                      value={form.pesoKg}
                      aria-describedby={error ? "cli-cambio-error" : undefined}
                      onChange={(e) => actualizarCampo("pesoKg", e.target.value)}
                    />
                  </div>
                )}
              </div>
            </section>

            {error && (
              <div
                className="cli-ent-error"
                id="cli-cambio-error"
                role="alert"
                tabIndex={-1}
                ref={alertaError}
              >
                <p className="cli-ent-error-mensaje mb-0">{error}</p>
              </div>
            )}
          </div>
        )}
      </Modal.Body>

      <Modal.Footer className="cli-borrador-modal-acciones">
        <button
          type="button"
          className="btn-dark cli-ent-boton"
          disabled={guardando}
          onClick={cerrarModal}
        >
          Cancelar
        </button>
        {elegido && form && (
          <button
            type="button"
            className="btn-neon cli-ent-boton"
            disabled={guardando}
            aria-live="polite"
            onClick={() => void confirmar()}
          >
            <i
              className={`bi ${guardando ? "bi-hourglass-split" : "bi-check2-circle"} me-2`}
              aria-hidden="true"
            />
            {guardando
              ? "Guardando…"
              : (esReemplazo ? "Confirmar cambio" : `Agregar a la sesión ${modo.sesion}`)}
          </button>
        )}
      </Modal.Footer>
    </Modal>
  );
}
