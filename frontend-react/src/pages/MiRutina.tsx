import { useEffect, useReducer, useRef, useState } from "react";
import { Modal } from "react-bootstrap";
import { useLocation } from "react-router-dom";
import { api } from "../data/api";
import { current } from "../lib/auth";
import { formatoPrescripcion, gruposDeSesion, idealAHoy, resumenSesion, textoVigencia } from "../lib/rutinas";
import { utils } from "../lib/utils";
import { useTenantOpcional } from "../tenant/TenantContext";
import { AvanceCliente } from "../components/cliente/AvanceCliente";
import {
  buscarBorradorRutina,
  eliminarBorradorPorClave,
  formatearTiempoRelativo,
} from "../components/cliente/borradorEntrenamiento";
import type { AmbitoBorrador } from "../components/cliente/borradorEntrenamiento";
import {
  formatearListaGrupos,
  limpiarDescripcionRutina,
  textoObjetivoPlan,
} from "../components/cliente/dashboardCliente";
import type { NavegacionMiRutinaState } from "../components/cliente/dashboardCliente";
import { BadgeEstadoRutina } from "../components/rutinas/BadgeEstadoRutina";
import { FilaEjercicio } from "../components/rutinas/FilaEjercicio";
import { PestanasSesion } from "../components/rutinas/PestanasSesion";
import { VistaPreviaRecurso } from "../components/ejercicios/VistaPreviaRecurso";
import { EntrenamientoCliente } from "../components/cliente/EntrenamientoCliente";
import type { EstadoEntrenamiento } from "../components/cliente/entrenamiento";
import { HistorialEntrenamientos } from "../components/cliente/HistorialEntrenamientos";
import { ModalCambioEjercicioCliente } from "../components/cliente/ModalCambioEjercicioCliente";
import type { ModoCambioEjercicio } from "../components/cliente/cambioEjercicio";
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
  registros: Awaited<ReturnType<typeof api.rutinas.registros>>;
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

function resumenPestanaCliente(ejercicios: RutinaEjercicio[], catalogo: Ejercicio[]): string {
  if (ejercicios.length === 0) return "Sin ejercicios asignados";
  const grupos = gruposDeSesion(ejercicios, catalogo);
  const base = resumenSesion(ejercicios, catalogo).replace(/\s*·\s*$/, "");
  if (grupos.length === 0) return base;
  const partes = base.split(" · ");
  return [grupos.join(", "), ...partes.slice(0, 2)].join(" · ");
}

export function MiRutina() {
  const [sesion, setSesion] = useState(current);
  const tenant = useTenantOpcional();
  const cedula = sesion?.numero_identificacion;
  const gimnasioId = tenant?.gimnasio.gimnasio_id ?? sesion?.gimnasio_id;

  useEffect(() => {
    const actualizar = () => setSesion(current());
    const alCambiarStorage = (evento: StorageEvent) => {
      if (evento.key === "gymbrot_session" || evento.key === null) actualizar();
    };
    window.addEventListener("storage", alCambiarStorage);
    window.addEventListener("focus", actualizar);
    return () => {
      window.removeEventListener("storage", alCambiarStorage);
      window.removeEventListener("focus", actualizar);
    };
  }, []);

  // Cambiar de cuenta o gimnasio desmonta también modales, entrenamiento y consultas pendientes.
  return <RutinaDelCliente
    key={JSON.stringify([gimnasioId, cedula, sesion?.tipo_usuario])}
    cedula={cedula}
    gimnasioId={gimnasioId}
    esCliente={sesion?.tipo_usuario === "CLIENTE"}
    nombreCliente={sesion?.nombre.trim() ?? ""}
  />;
}

function RutinaDelCliente({ cedula, gimnasioId, esCliente, nombreCliente }: {
  cedula: string | undefined;
  gimnasioId: string | undefined;
  esCliente: boolean;
  nombreCliente: string;
}) {
  const tenant = useTenantOpcional();
  const location = useLocation();
  const intencionInicialRef = useRef<NavegacionMiRutinaState | null>(
    (location.state as NavegacionMiRutinaState | null) ?? null,
  );
  const irAHistorialRef = useRef(false);
  const [consulta, setConsulta] = useState<Consulta>({ estado: "cargando" });
  const [activa, setActiva] = useState<LetraSesion>("A");
  const [detalle, setDetalle] = useState<EjercicioSeleccionado | null>(null);
  const [entrenando, setEntrenando] = useState<SesionEnEntrenamiento | null>(null);
  const [sesionRegistrada, setSesionRegistrada] = useState<LetraSesion | null>(null);
  const [actualizacion, setActualizacion] = useState<"lista" | "cargando" | "error">("lista");
  const [estadoHistorial, setEstadoHistorial] = useState<"lista" | "cargando" | "error">("lista");
  const [, refrescarBorrador] = useReducer((n: number) => n + 1, 0);
  const [modalDescartar, setModalDescartar] = useState(false);
  const [sesionPendienteInicio, setSesionPendienteInicio] = useState<LetraSesion | null>(null);
  const [modoCambio, setModoCambio] = useState<ModoCambioEjercicio | null>(null);
  const [cambioBloqueado, setCambioBloqueado] = useState<ModoCambioEjercicio | null>(null);
  const [avisoCambio, setAvisoCambio] = useState<{ sesion: LetraSesion; titulo: string; detalle: string } | null>(null);
  const confirmacion = useRef<HTMLDivElement>(null);
  const confirmacionCambio = useRef<HTMLDivElement>(null);
  const tituloSesiones = useRef<HTMLHeadingElement>(null);

  useEffect(() => {
    if (sesionRegistrada && entrenando === null) confirmacion.current?.focus();
  }, [sesionRegistrada, entrenando]);

  useEffect(() => {
    if (avisoCambio && entrenando === null) confirmacionCambio.current?.focus();
  }, [avisoCambio, entrenando]);

  useEffect(() => {
    if (!irAHistorialRef.current || consulta.estado !== "lista") return;
    irAHistorialRef.current = false;
    const nodo = document.getElementById("cli-historial-titulo");
    if (nodo instanceof HTMLElement) {
      nodo.focus();
      nodo.scrollIntoView({
        behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches ? "instant" : "smooth",
        block: "start",
      });
    }
  }, [consulta.estado]);

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
        if (!cedula || !gimnasioId || !esCliente) {
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

        const [sesiones, progreso, catalogo, instructor, resultadoRegistros] = await Promise.all([
          api.rutinas.sesiones(rutina.id_rutina),
          consultarAvance(rutina.id_rutina),
          api.ejercicios.list(),
          api.instructores.get(rutina.id_instructor),
          api.rutinas
            .registros(rutina.id_rutina)
            .then((registros) => ({ ok: true as const, registros }))
            .catch(() => ({ ok: false as const, registros: [] })),
        ]);
        const { avance, siguiente } = progreso;
        if (cancelado) return;
        let sesionActivaInicial: LetraSesion =
          siguiente && sesiones.some((s) => s.sesion === siguiente)
            ? siguiente
            : sesiones[0]?.sesion ?? "A";

        const intencion = intencionInicialRef.current;
        intencionInicialRef.current = null;
        if (intencion) {
          try {
            window.history.replaceState({}, "");
          } catch {
            // Ignora errores de historial en entornos sin ventana completa.
          }
          const estadoRutina = api.rutinas.estado(rutina);
          const esVigenteRutina = estadoRutina === "VIGENTE" || estadoRutina === "POR_VENCER";
          const borradorDetectado = buscarBorradorRutina({
            ambito: { gimnasioId, idCliente: cedula, idRutina: rutina.id_rutina },
            rutina,
            vigente: esVigenteRutina,
            sesiones,
            catalogo,
          });

          if (intencion.accionEntrenamiento === "continuar" && borradorDetectado.estado === "restaurable") {
            sesionActivaInicial = borradorDetectado.sesion;
            setEntrenando({
              sesion: borradorDetectado.sesion,
              borradorInicial: {
                estado: borradorDetectado.entrenamiento,
                notas: borradorDetectado.notas,
              },
            });
          } else if (intencion.accionEntrenamiento === "iniciar" && esVigenteRutina) {
            const letraObjetivo = intencion.sesion ?? siguiente;
            const sesionObjetivo = letraObjetivo ? sesiones.find((s) => s.sesion === letraObjetivo) : undefined;
            if (sesionObjetivo && sesionObjetivo.ejercicios.length > 0) {
              sesionActivaInicial = sesionObjetivo.sesion;
              if (borradorDetectado.estado === "restaurable") {
                setSesionPendienteInicio(sesionObjetivo.sesion);
              } else {
                if (borradorDetectado.estado === "obsoleto") {
                  eliminarBorradorPorClave(borradorDetectado.clave);
                }
                setEntrenando({ sesion: sesionObjetivo.sesion, borradorInicial: null });
              }
            }
          } else if (intencion.seccion === "historial") {
            irAHistorialRef.current = true;
          }
        }

        setActiva(sesionActivaInicial);
        setEstadoHistorial(resultadoRegistros.ok ? "lista" : "error");
        setConsulta({
          estado: "lista",
          datos: {
            rutina,
            sesiones,
            avance,
            siguiente,
            catalogo,
            instructor,
            registros: resultadoRegistros.registros,
          },
        });
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
  }, [cedula, gimnasioId, esCliente]);

  async function recargarHistorial(idRutina: number) {
    setEstadoHistorial("cargando");
    try {
      const registros = await api.rutinas.registros(idRutina);
      setConsulta((anterior) =>
        anterior.estado === "lista" && anterior.datos.rutina.id_rutina === idRutina
          ? { estado: "lista", datos: { ...anterior.datos, registros } }
          : anterior,
      );
      setEstadoHistorial("lista");
    } catch {
      setEstadoHistorial("error");
    }
  }

  async function actualizarAvance(idRutina: number) {
    setActualizacion("cargando");
    try {
      const [progreso, registros] = await Promise.all([
        consultarAvance(idRutina),
        api.rutinas.registros(idRutina),
      ]);
      setConsulta((anterior) => anterior.estado === "lista" && anterior.datos.rutina.id_rutina === idRutina
        ? { estado: "lista", datos: { ...anterior.datos, ...progreso, registros } }
        : anterior);
      if (progreso.siguiente) setActiva(progreso.siguiente);
      setEstadoHistorial("lista");
      setActualizacion("lista");
    } catch {
      // El registro ya tuvo éxito. Reintentar aquí solo vuelve a consultar, nunca a guardar.
      setActualizacion("error");
    }
  }

  async function sincronizarSesiones(idRutina: number, modo: ModoCambioEjercicio, actualizado: RutinaEjercicio) {
    setConsulta((anterior) => {
      if (anterior.estado !== "lista" || anterior.datos.rutina.id_rutina !== idRutina) return anterior;
      const nuevasSesiones = anterior.datos.sesiones.map((s) => {
        if (s.sesion !== modo.sesion) return s;
        const ejercicios =
          modo.tipo === "reemplazar"
            ? s.ejercicios.map((e) => (e.id_ejercicio === modo.filaAnterior.id_ejercicio ? actualizado : e))
            : [...s.ejercicios, actualizado].sort((a, b) => a.orden - b.orden);
        return { ...s, ejercicios };
      });
      return { estado: "lista", datos: { ...anterior.datos, sesiones: nuevasSesiones } };
    });
    try {
      const sesionesActualizadas = await api.rutinas.sesiones(idRutina);
      setConsulta((anterior) =>
        anterior.estado === "lista" && anterior.datos.rutina.id_rutina === idRutina
          ? { estado: "lista", datos: { ...anterior.datos, sesiones: sesionesActualizadas } }
          : anterior,
      );
    } catch {
      // El estado local ya se actualizó con la fila devuelta por cambioCliente().
    }
  }

  if (consulta.estado !== "lista") {
    return (
      <section className="card-g cli-mi-rutina" aria-labelledby="mi-rutina-titulo">
        <div className="card-head">
          <h1 className="card-title" id="mi-rutina-titulo">Mi plan</h1>
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

  const { rutina, sesiones, avance, siguiente, catalogo, instructor, registros } = consulta.datos;
  const estado = api.rutinas.estado(rutina);
  const vigente = estado === "VIGENTE" || estado === "POR_VENCER";
  const sesionActiva = sesiones.find((s) => s.sesion === activa);
  const sesionSugerida = sesiones.find((s) => s.sesion === siguiente);
  const gruposSugeridos = gruposDeSesion(sesionSugerida?.ejercicios ?? [], catalogo);
  const textoGruposSugeridos = formatearListaGrupos(gruposSugeridos);
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
  const sesionBorrador = borradorRestaurable
    ? sesiones.find((s) => s.sesion === borradorRestaurable.sesion)
    : undefined;
  const gruposBorrador = gruposDeSesion(sesionBorrador?.ejercicios ?? [], catalogo);
  const textoGruposBorrador = formatearListaGrupos(gruposBorrador);

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
    setCambioBloqueado(null);
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
    setCambioBloqueado(null);
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

  function solicitarModificacionEjercicio(modo: ModoCambioEjercicio) {
    const actual = api.rutinas.estado(rutina);
    if (actual !== "VIGENTE" && actual !== "POR_VENCER") return;
    setAvisoCambio(null);
    if (borradorRestaurable && borradorRestaurable.sesion === modo.sesion) {
      setCambioBloqueado(modo);
      return;
    }
    if (borradorObsoleto && borradorObsoleto.sesion === modo.sesion) {
      eliminarBorradorPorClave(borradorObsoleto.clave);
      refrescarBorrador();
    }
    setModoCambio(modo);
  }

  function descartarBorradorYModificar() {
    const pendiente = cambioBloqueado;
    if (borradorRestaurable) eliminarBorradorPorClave(borradorRestaurable.clave);
    if (borradorObsoleto) eliminarBorradorPorClave(borradorObsoleto.clave);
    setCambioBloqueado(null);
    refrescarBorrador();
    if (pendiente) setModoCambio(pendiente);
  }

  function iniciarEntrenamiento(letra: LetraSesion) {
    const actual = api.rutinas.estado(rutina);
    const sesion = sesiones.find((s) => s.sesion === letra);
    if (actualizacion !== "lista" || (actual !== "VIGENTE" && actual !== "POR_VENCER") || !sesion || sesion.ejercicios.length === 0) {
      return;
    }
    if (borradorRestaurable) {
      setSesionPendienteInicio(sesion.sesion);
      return;
    }
    if (borradorObsoleto) {
      eliminarBorradorPorClave(borradorObsoleto.clave);
    }
    abrirSesionDesdeCero(sesion.sesion);
  }

  const aviso = estado === "VENCIDA"
    ? "Tu última rutina está vencida. Puedes consultarla aquí; acércate a un instructor para renovarla."
    : estado === "FINALIZADA"
      ? "Tu última rutina fue finalizada. Puedes consultarla aquí; acércate a un instructor para una nueva asignación."
      : estado === "POR_VENCER"
        ? "Tu rutina está por vencer. Consulta con tu instructor su próxima renovación."
        : null;
  const descripcionRutina = limpiarDescripcionRutina(rutina);
  const detalleVigencia = rutina.fecha_fin !== null && estado !== "FINALIZADA"
    ? textoVigencia(rutina, estado)
    : undefined;
  const tienePendientesSesion = Boolean(
    sesionActiva?.ejercicios.some((e) => e.agregado_por_cliente === true && e.revisado_por_instructor !== true),
  );

  return (
    <div className="cli-mi-rutina d-flex flex-column gap-3">
      {sesionRegistrada && (
        <div className="cli-registro-exito" role="status" aria-atomic="true" tabIndex={-1} ref={confirmacion}>
          <i className="bi bi-check2-circle" aria-hidden="true" />
          <div>
            <p>Entrenamiento de la sesión {sesionRegistrada} registrado correctamente.</p>
          </div>
        </div>
      )}

      {avisoCambio && (
        <div className="cli-registro-exito cli-cambio-exito" role="status" aria-atomic="true" tabIndex={-1} ref={confirmacionCambio}>
          <i className="bi bi-check2-circle" aria-hidden="true" />
          <div className="cli-cambio-exito-texto">
            <p>{avisoCambio.titulo}</p>
            <p className="cli-ent-secundario">{avisoCambio.detalle}</p>
          </div>
          <button
            type="button"
            className="btn-dark cli-ej-cerrar-icono"
            aria-label="Cerrar confirmación de cambio"
            onClick={() => setAvisoCambio(null)}
          >
            <i className="bi bi-x-lg" aria-hidden="true" />
          </button>
        </div>
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

      <section className="card-g cli-plan-panel" aria-labelledby="mi-rutina-titulo">
        <div className="card-head">
          <div>
            <h1 className="card-title mb-0" id="mi-rutina-titulo">Mi plan</h1>
            <p className="card-sub">Objetivo: {textoObjetivoPlan(rutina.objetivo)}</p>
          </div>
          <BadgeEstadoRutina estado={estado} detalle={detalleVigencia} />
        </div>
        {aviso && (
          <div className="alert-g show inst-alerta-info" role="status">
            <i className="bi bi-info-circle me-1" aria-hidden="true" />{aviso}
          </div>
        )}
        {descripcionRutina && <p className="cli-plan-descripcion">{descripcionRutina}</p>}
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

      <section className="card-g cli-proximo" aria-labelledby="mi-rutina-proximo">
        <div className="card-head mb-2">
          <h2 className="card-title mb-0" id="mi-rutina-proximo">Mi próximo entrenamiento</h2>
        </div>
        {!vigente ? (
          <p className="cli-ent-secundario">
            {estado === "FINALIZADA" ? "Tu plan está finalizado. Consulta con tu instructor para un nuevo plan." : "Tu plan está vencido. Consulta con tu instructor para renovarlo."}
          </p>
        ) : borradorRestaurable ? (
          <div className="cli-proximo-cuerpo">
            <div className="cli-proximo-mensaje">
              <p className="cli-proximo-saludo">{nombreCliente ? `Hola, ${nombreCliente}.` : "Hola."} Retoma tu entrenamiento.</p>
              <p className="cli-proximo-propuesta">
                Tienes un borrador guardado de la <strong>sesión {borradorRestaurable.sesion}</strong>
                {textoGruposBorrador ? ` (${textoGruposBorrador})` : ""}.
              </p>
              <p className="cli-borrador-resumen">
                {borradorRestaurable.resumen.ejerciciosCompletados} de {borradorRestaurable.resumen.totalEjercicios}{" "}
                {borradorRestaurable.resumen.totalEjercicios === 1 ? "ejercicio completado" : "ejercicios completados"}
                {" · "}
                {borradorRestaurable.resumen.seriesCompletadas} de {borradorRestaurable.resumen.totalSeries}{" "}
                {borradorRestaurable.resumen.totalSeries === 1 ? "serie realizada" : "series realizadas"}
              </p>
              <p className="cli-ent-secundario">Última actualización: {formatearTiempoRelativo(borradorRestaurable.updatedAt)}</p>
            </div>
            <div className="cli-proximo-acciones">
              <button type="button" className="btn-neon cli-ent-boton" onClick={continuarBorrador}>
                <i className="bi bi-play-fill me-2" aria-hidden="true" />Continuar entrenamiento
              </button>
              <button type="button" className="btn-dark cli-ent-boton" onClick={() => {
                cambiarSesion(borradorRestaurable.sesion);
                tituloSesiones.current?.focus();
              }}>Ver ejercicios</button>
              <button type="button" className="btn-dark cli-ent-boton cli-ent-boton-peligro" onClick={() => setModalDescartar(true)}>
                <i className="bi bi-trash3 me-2" aria-hidden="true" />Descartar borrador
              </button>
            </div>
          </div>
        ) : actualizacion === "cargando" ? (
          <p className="cli-ent-secundario" role="status">Actualizando la próxima sesión sugerida…</p>
        ) : actualizacion === "error" ? (
          <p className="cli-ent-secundario">No pudimos actualizar la sesión sugerida. Reintenta la actualización en «Mi progreso».</p>
        ) : siguiente && !sesionSugerida?.ejercicios.length ? (
          <p className="cli-ent-secundario">La sesión {siguiente} aún no tiene ejercicios disponibles. Consulta con tu instructor.</p>
        ) : siguiente ? (
          <div className="cli-proximo-cuerpo">
            <div className="cli-proximo-mensaje">
              <p className="cli-proximo-saludo">{nombreCliente ? `Hola, ${nombreCliente}.` : "Hola."} ¿Entrenamos hoy?</p>
              <p className="cli-proximo-propuesta">
                {textoGruposSugeridos ? `Te proponemos trabajar ${textoGruposSugeridos} con tu ` : "Te proponemos continuar con tu "}
                <strong>sesión {siguiente}</strong>.
              </p>
              <p className="cli-ent-secundario">Sugerencia basada en el orden de tu plan; puedes elegir otra sesión en «Mis sesiones».</p>
            </div>
            <div className="cli-proximo-acciones">
              <button type="button" className="btn-neon cli-ent-boton" onClick={() => iniciarEntrenamiento(siguiente)}>
                <i className="bi bi-play-fill me-2" aria-hidden="true" />Iniciar sesión {siguiente}
              </button>
              <button type="button" className="btn-dark cli-ent-boton" onClick={() => {
                cambiarSesion(siguiente);
                tituloSesiones.current?.focus();
              }}>
                Ver ejercicios
              </button>
            </div>
          </div>
        ) : (
          <p className="cli-ent-secundario">No hay una sesión sugerida disponible para este plan.</p>
        )}
      </section>

      <section className="card-g cli-avance-panel" aria-labelledby="mi-rutina-avance">
        <div className="card-head mb-2">
          <h2 className="card-title mb-0" id="mi-rutina-avance">Mi progreso</h2>
        </div>
        {actualizacion === "cargando" ? <p className="cli-ent-secundario" role="status"><i className="bi bi-hourglass-split me-2" aria-hidden="true" />Actualizando progreso y próxima sesión…</p>
          : actualizacion === "error" ? (
            <div className="cli-ent-error">
              <p role="alert">Tu entrenamiento está guardado, pero no pudimos actualizar el progreso y la próxima sesión.</p>
              <button type="button" className="btn-dark cli-ent-boton" onClick={() => void actualizarAvance(rutina.id_rutina)}>Reintentar actualización</button>
            </div>
          ) : <AvanceCliente
          avance={avance}
          ideal={vigente && (rutina.sesiones_planeadas ?? 0) > 0 ? idealAHoy(rutina) : null}
          borradorEnCurso={borradorRestaurable ? {
            sesion: borradorRestaurable.sesion,
            ejerciciosCompletados: borradorRestaurable.resumen.ejerciciosCompletados,
            totalEjercicios: borradorRestaurable.resumen.totalEjercicios,
          } : null}
        />}
      </section>

      <section className="card-g cli-sesiones-panel" aria-labelledby="mi-rutina-sesiones">
        <div className="card-head">
          <div>
            <h2 className="card-title cli-ent-titulo mb-0" id="mi-rutina-sesiones" ref={tituloSesiones} tabIndex={-1}>Mis sesiones</h2>
            <p className="card-sub">Cada letra identifica un grupo de ejercicios que se repite en tu plan, no un día específico.</p>
          </div>
          {vigente && sesionActiva && sesionActiva.ejercicios.length > 0 && activa !== (borradorRestaurable?.sesion ?? siguiente) && (
            <div className="cli-sesion-cta">
              <button type="button" className="btn-dark cli-ent-boton" disabled={actualizacion !== "lista"} onClick={() => iniciarEntrenamiento(activa)}>
                <i className="bi bi-play-fill me-2" aria-hidden="true" />Iniciar sesión {activa}
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
              pestanas={sesiones.map((s) => ({ sesion: s.sesion, resumen: resumenPestanaCliente(s.ejercicios, catalogo) }))}
              activa={activa}
              onCambiar={cambiarSesion}
            />
            <div role="tabpanel" aria-label={`Ejercicios de la sesión ${activa}`}>
              {tienePendientesSesion && (
                <p className="cli-sesion-pendiente-aviso" role="status">
                  <i className="bi bi-clock-history" aria-hidden="true" />
                  <span>
                    Los ejercicios con etiqueta <strong>Pendiente de revisión del instructor</strong> ya forman parte de tu sesión.
                  </span>
                </p>
              )}
              {!sesionActiva?.ejercicios.length ? (
                <p className="empty-state mb-0">Esta sesión aún no tiene ejercicios asignados. Consulta con tu instructor.</p>
              ) : (
                <div className="inst-lista-ej cli-rutina-ejercicios">
                  {sesionActiva.ejercicios.map((fila) => {
                    const ejercicio = catalogo.find((e) => e.id_ejercicio === fila.id_ejercicio);
                    return (
                      <FilaEjercicio
                        key={fila.id_ejercicio}
                        fila={fila}
                        ejercicio={ejercicio}
                        acciones={<div className="cli-ej-opciones">
                          {fila.agregado_por_cliente === true && fila.revisado_por_instructor !== true && (
                            <span className="badge-g badge-pendiente cli-ej-revision">Pendiente de revisión del instructor</span>
                          )}
                          {ejercicio && (
                          <div className="cli-ej-acciones">
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
                            {vigente && (
                              <button
                                type="button"
                                className="btn-dark cli-ej-accion cli-ej-accion-cambiar"
                                aria-label={`Cambiar ${ejercicio.nombre}`}
                                title={`Cambiar ${ejercicio.nombre}`}
                                onClick={() =>
                                  solicitarModificacionEjercicio({
                                    tipo: "reemplazar",
                                    sesion: sesionActiva.sesion,
                                    filaAnterior: fila,
                                    ejercicioAnterior: ejercicio,
                                  })
                                }
                              >
                                <i className="bi bi-arrow-left-right" aria-hidden="true" />
                                <span>Cambiar<span className="cli-ej-accion-contexto"> ejercicio</span></span>
                              </button>
                            )}
                          </div>
                          )}
                        </div>}
                      />
                    );
                  })}
                </div>
              )}
              {vigente && sesionActiva && (
                <div className="cli-sesion-agregar">
                  <div className="cli-sesion-agregar-info">
                    <span className="cli-ent-secundario">
                      ¿Necesitas ajustar la sesión {sesionActiva.sesion}? Los cambios se marcarán como «Pendiente de revisión del instructor».
                    </span>
                  </div>
                  <button
                    type="button"
                    className="btn-dark cli-ent-boton cli-btn-agregar-ej"
                    aria-label={`Agregar ejercicio a la sesión ${sesionActiva.sesion}`}
                    onClick={() =>
                      solicitarModificacionEjercicio({
                        tipo: "agregar",
                        sesion: sesionActiva.sesion,
                      })
                    }
                  >
                    <i className="bi bi-plus-circle me-2" aria-hidden="true" />
                    Agregar ejercicio
                  </button>
                </div>
              )}
            </div>
          </>
        )}
      </section>

      {ambitoBorrador && (
        <HistorialEntrenamientos
          ambito={ambitoBorrador}
          division={rutina.division ?? sesiones.map((s) => s.sesion)}
          registros={registros}
          catalogo={catalogo}
          estadoCarga={estadoHistorial}
          onReintentar={() => void recargarHistorial(rutina.id_rutina)}
        />
      )}

      {detalle && <DetalleEjercicio detalle={detalle} onCerrar={() => setDetalle(null)} />}

      {modoCambio && sesionActiva && (
        <ModalCambioEjercicioCliente
          modo={modoCambio}
          filasSesion={
            (sesiones.find((s) => s.sesion === modoCambio.sesion) ?? sesionActiva).ejercicios
          }
          catalogo={catalogo}
          onConfirmar={(ejercicioNuevo, idEjercicioAnterior) => {
            const autenticado = current();
            const gymActual = tenant?.gimnasio.gimnasio_id ?? autenticado?.gimnasio_id;
            const estadoActual = api.rutinas.estado(rutina);
            if (
              !autenticado ||
              autenticado.rol !== "CLIENTE" ||
              autenticado.numero_identificacion !== rutina.id_cliente ||
              gymActual !== rutina.gimnasio_id
            ) {
              return Promise.resolve({
                ok: false,
                mensaje: "Tu sesión activa no coincide con esta rutina. Vuelve a iniciar sesión con tu cuenta.",
              });
            }
            if (estadoActual !== "VIGENTE" && estadoActual !== "POR_VENCER") {
              return Promise.resolve({
                ok: false,
                mensaje: "Solo se puede cambiar una rutina vigente.",
              });
            }
            return api.rutinas.cambioCliente(rutina.id_rutina, ejercicioNuevo, idEjercicioAnterior);
          }}
          onCerrar={() => setModoCambio(null)}
          onExito={(modoAplicado, actualizado, ejercicioElegido) => {
            setModoCambio(null);
            setActiva(modoAplicado.sesion);
            void sincronizarSesiones(rutina.id_rutina, modoAplicado, actualizado);
            const nombreAnterior =
              modoAplicado.tipo === "reemplazar"
                ? (modoAplicado.ejercicioAnterior?.nombre ?? `Ejercicio ${modoAplicado.filaAnterior.id_ejercicio}`)
                : "";
            setAvisoCambio({
              sesion: modoAplicado.sesion,
              titulo:
                modoAplicado.tipo === "reemplazar"
                  ? `Cambiaste «${nombreAnterior}» por «${ejercicioElegido.nombre}» en la Sesión ${modoAplicado.sesion}.`
                  : `Agregaste «${ejercicioElegido.nombre}» a la Sesión ${modoAplicado.sesion}.`,
              detalle: "El cambio ya está activo en tu sesión con estado «Pendiente de revisión del instructor».",
            });
          }}
        />
      )}

      <Modal
        show={cambioBloqueado !== null && borradorRestaurable !== null}
        onHide={() => setCambioBloqueado(null)}
        centered
        aria-labelledby="cli-modal-bloqueo-cambio-titulo"
        aria-describedby="cli-modal-bloqueo-cambio-desc"
      >
        <Modal.Header>
          <Modal.Title as="h2" id="cli-modal-bloqueo-cambio-titulo">
            Entrenamiento en curso en la Sesión {borradorRestaurable?.sesion}
          </Modal.Title>
        </Modal.Header>
        <Modal.Body id="cli-modal-bloqueo-cambio-desc">
          <p className="mb-0">
            Tienes un entrenamiento en curso para esta sesión. Termínalo o descártalo antes de modificar sus ejercicios.
          </p>
        </Modal.Body>
        <Modal.Footer className="cli-borrador-modal-acciones">
          <button type="button" className="btn-dark cli-ent-boton" onClick={() => setCambioBloqueado(null)}>
            Cancelar
          </button>
          <button type="button" className="btn-dark cli-ent-boton cli-ent-boton-peligro" onClick={descartarBorradorYModificar}>
            Descartar borrador
          </button>
          <button type="button" className="btn-neon cli-ent-boton" autoFocus onClick={continuarBorrador}>
            Continuar entrenamiento
          </button>
        </Modal.Footer>
      </Modal>

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
  const notaEntrenador = obtenerNotaEntrenador(fila);
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
        {pendiente && (
          <p className="cli-ej-pendiente" role="status">
            <i className="bi bi-clock-history me-2" aria-hidden="true" />
            Pendiente de revisión del instructor. Esta pauta es provisional hasta que la valide.
          </p>
        )}
        <section aria-labelledby="cli-ej-indicacion">
          <h3 className="cli-ej-seccion" id="cli-ej-indicacion">
            {pendiente ? "Pauta provisional" : "Tu indicación"}
          </h3>
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
      </Modal.Body>
      <Modal.Footer>
        <button type="button" className="btn-neon cli-ej-cerrar" onClick={onCerrar}>Cerrar</button>
      </Modal.Footer>
    </Modal>
  );
}
