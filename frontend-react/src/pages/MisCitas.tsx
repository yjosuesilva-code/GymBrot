import { useEffect, useReducer, useState, useMemo, useRef } from "react";
import { Modal } from "react-bootstrap";
import { Link } from "react-router-dom";
import { Paginador } from "../components/Paginador";
import {
  badgeEstadoCita,
  badgeEstadoInscripcion,
  filtrarHorariosDisponibles,
  formatearFechaCita,
  puedeCancelarCita,
  puedeRetirarseClase,
  separarCitasCliente,
  separarInscripcionesCliente,
  NOMBRE_TIPO_CITA,
  NOMBRE_TIPO_CLASE,
} from "../components/cliente/misCitas";
import type { FranjaOcupada } from "../components/cliente/misCitas";
import { api } from "../data/api";
import {
  apiClases,
  horaFin,
  ultimoDiaReservable,
  TIPOS_CLASE,
} from "../data/apiClases";
import { current } from "../lib/auth";
import { horaActual } from "../lib/citas";
import { disponibilidadTexto } from "../lib/horarios";
import { membresiaVigente } from "../lib/membresias";
import { utils } from "../lib/utils";
import { useTenantOpcional } from "../tenant/TenantContext";
import type {
  Cita,
  Clase,
  Cliente,
  InscripcionClase,
  Instructor,
  Membresia,
  SesionClase,
  TipoCita,
} from "../types";

const TIPOS_CITA_LISTA: TipoCita[] = ["EVALUACION", "SEGUIMIENTO", "NUTRICION", "CONSULTA"];
const POR_PAGINA_HISTORIAL = 5;

type PestanaPrincipal = "citas" | "clases";

type ErroresSeccion = {
  citas?: string;
  instructores?: string;
  franjas?: string;
  clases?: string;
  misClases?: string;
  membresia?: string;
};

type EstadoMembresia = "activa" | "inactiva" | "error_verificacion";

type EstadoCarga =
  | { estado: "cargando" }
  | { estado: "sin-sesion"; mensaje: string }
  | { estado: "error"; mensaje: string }
  | {
      estado: "listo";
      idCliente: string;
      gimnasioId: string;
      citas: Cita[];
      franjasOcupadas: FranjaOcupada[];
      instructores: Instructor[];
      sesionesClases: SesionClase[];
      inscripcionesCliente: { inscripcion: InscripcionClase; clase: Clase }[];
      membresias: Membresia[];
      cliente: Cliente | null;
      estadoMembresia: EstadoMembresia;
      erroresSeccion: ErroresSeccion;
    };

export function MisCitas() {
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

  return (
    <ContenidoMisCitas
      key={JSON.stringify([gimnasioId, cedula, sesion?.tipo_usuario])}
      cedula={cedula}
      gimnasioId={gimnasioId}
      esCliente={sesion?.tipo_usuario === "CLIENTE"}
    />
  );
}

function ContenidoMisCitas({
  cedula,
  gimnasioId,
  esCliente,
}: {
  cedula: string | undefined;
  gimnasioId: string | undefined;
  esCliente: boolean;
}) {
  const tenant = useTenantOpcional();
  const ruta = (path: string) => (tenant ? tenant.ruta(path) : path);

  const [pestana, setPestana] = useState<PestanaPrincipal>("citas");
  const [consulta, setConsulta] = useState<EstadoCarga>({ estado: "cargando" });
  const [actualizando, setActualizando] = useState(false);
  const [recarga, forzarRecarga] = useReducer((n: number) => n + 1, 0);

  const consultaRef = useRef(consulta);
  useEffect(() => {
    consultaRef.current = consulta;
  }, [consulta]);

  // Alertas generales (toasts / feedback)
  const [alerta, setAlerta] = useState<{ tipo: "ok" | "error"; mensaje: string } | null>(null);

  // Paginación de historiales
  const [paginaCitasPasadas, setPaginaCitasPasadas] = useState(1);
  const [paginaClasesPasadas, setPaginaClasesPasadas] = useState(1);

  // Filtros de clases grupales (B7)
  const [filtroTipoClase, setFiltroTipoClase] = useState<string>("TODAS");

  // Modal Solicitar Cita
  const [modalSolicitar, setModalSolicitar] = useState(false);
  const [solicitarTipo, setSolicitarTipo] = useState<TipoCita>("EVALUACION");
  const [solicitarInstructor, setSolicitarInstructor] = useState("");
  const [solicitarFecha, setSolicitarFecha] = useState("");
  const [solicitarHora, setSolicitarHora] = useState("");
  const [solicitarNotas, setSolicitarNotas] = useState("");
  const [errorSolicitar, setErrorSolicitar] = useState("");
  const [guardandoCita, setGuardandoCita] = useState(false);

  // Modal Cancelar Cita
  const [citaACancelar, setCitaACancelar] = useState<Cita | null>(null);
  const [cancelandoCita, setCancelandoCita] = useState(false);

  // Modal Reservar Clase
  const [sesionAReservar, setSesionAReservar] = useState<SesionClase | null>(null);
  const [reservandoClase, setReservandoClase] = useState(false);
  const [errorReservaClase, setErrorReservaClase] = useState("");

  // Modal Retirarse de Clase
  const [inscripcionARetirar, setInscripcionARetirar] = useState<{
    inscripcion: InscripcionClase;
    clase: Clase;
  } | null>(null);
  const [retirandoClase, setRetirandoClase] = useState(false);

  const hoyISO = utils.isoDate();
  const horaActualStr = horaActual();

  // Carga de datos con recarga en segundo plano (B1) y control de fallos parciales (B2)
  useEffect(() => {
    let cancelado = false;

    async function cargar() {
      if (!cedula || !gimnasioId || !esCliente) {
        setConsulta({
          estado: "sin-sesion",
          mensaje: "Inicia sesión con tu cuenta de cliente para consultar tus citas y reservar clases grupales.",
        });
        return;
      }

      // B1: Si ya hay datos en pantalla, no desmontamos el DOM ni mostramos pantalla blanca
      const estadoPrevio = consultaRef.current;
      if (estadoPrevio.estado === "listo") {
        setActualizando(true);
      } else {
        setConsulta({ estado: "cargando" });
      }

      const limiteReserva = ultimoDiaReservable(hoyISO);

      try {
        const [
          rCitas,
          rFranjas,
          rInstructores,
          rSesiones,
          rInscripciones,
          rMembresias,
          rCliente,
        ] = await Promise.allSettled([
          api.citas.byCliente(cedula),
          api.citas.franjasOcupadas(),
          api.instructores.list(),
          apiClases.sesiones(hoyISO, limiteReserva),
          apiClases.deCliente(cedula),
          api.membresias.byCliente(cedula),
          api.clientes.get(cedula),
        ]);

        if (cancelado) return;

        // Si falló la consulta central de citas y no teníamos datos previos, mostramos pantalla de error
        if (rCitas.status === "rejected" && estadoPrevio.estado !== "listo") {
          setConsulta({
            estado: "error",
            mensaje: "No pudimos cargar la información de tus citas. Por favor intenta de nuevo.",
          });
          return;
        }

        const prevListo = estadoPrevio.estado === "listo" ? estadoPrevio : null;

        const citas = rCitas.status === "fulfilled" ? rCitas.value : prevListo?.citas ?? [];
        const franjasOcupadas = rFranjas.status === "fulfilled" ? rFranjas.value : prevListo?.franjasOcupadas ?? [];
        const instructores = rInstructores.status === "fulfilled" ? rInstructores.value : prevListo?.instructores ?? [];
        const sesionesClases = rSesiones.status === "fulfilled" ? rSesiones.value : prevListo?.sesionesClases ?? [];
        const inscripcionesCliente =
          rInscripciones.status === "fulfilled" ? rInscripciones.value : prevListo?.inscripcionesCliente ?? [];
        const membresias = rMembresias.status === "fulfilled" ? rMembresias.value : prevListo?.membresias ?? [];
        const cliente = rCliente.status === "fulfilled" ? rCliente.value : prevListo?.cliente ?? null;

        const erroresSeccion: ErroresSeccion = {
          instructores:
            rInstructores.status === "rejected"
              ? "No se pudo actualizar la lista de instructores disponibles."
              : undefined,
          clases:
            rSesiones.status === "rejected"
              ? "No pudimos cargar las sesiones de clases disponibles en este momento."
              : undefined,
          misClases:
            rInscripciones.status === "rejected"
              ? "No pudimos actualizar la lista de tus reservas de clases."
              : undefined,
        };

        setConsulta({
          estado: "listo",
          idCliente: cedula,
          gimnasioId,
          citas,
          franjasOcupadas,
          instructores,
          sesionesClases,
          inscripcionesCliente,
          membresias,
          cliente,
          erroresSeccion,
        });
        setActualizando(false);
      } catch (err) {
        if (cancelado) return;
        setActualizando(false);
        if (estadoPrevio.estado !== "listo") {
          setConsulta({
            estado: "error",
            mensaje: err instanceof Error ? err.message : "Error al cargar la información de citas y clases.",
          });
        } else {
          setAlerta({
            tipo: "error",
            mensaje: "Hubo un problema al refrescar la información. Intenta nuevamente.",
          });
        }
      }
    }

    void cargar();
    return () => {
      cancelado = true;
    };
  }, [cedula, gimnasioId, esCliente, recarga, hoyISO]);

  // Mapa de instructores para búsqueda rápida
  const instructoresMap = useMemo(() => {
    if (consulta.estado !== "listo") return new Map<string, Instructor>();
    const mapa = new Map<string, Instructor>();
    for (const ins of consulta.instructores) {
      mapa.set(ins.numero_identificacion, ins);
    }
    return mapa;
  }, [consulta]);

  // Verificación temprana de membresía activa (B6)
  const tieneMembresiaVigente = useMemo(() => {
    if (consulta.estado !== "listo") return false;
    const hoy = utils.isoDate();
    return consulta.membresias.some((m) => membresiaVigente(m, hoy, consulta.cliente));
  }, [consulta]);

  // Citas separadas
  const { proximas: citasProximas, pasadas: citasPasadas } = useMemo(() => {
    if (consulta.estado !== "listo") return { proximas: [], pasadas: [] };
    return separarCitasCliente({
      citas: consulta.citas,
      idCliente: consulta.idCliente,
      gimnasioId: consulta.gimnasioId,
      hoy: hoyISO,
      horaActualTexto: horaActualStr,
    });
  }, [consulta, hoyISO, horaActualStr]);

  // Inscripciones separadas
  const { activas: clasesActivas, historial: clasesPasadas } = useMemo(() => {
    if (consulta.estado !== "listo") return { activas: [], historial: [] };
    return separarInscripcionesCliente({
      filas: consulta.inscripcionesCliente,
      hoy: hoyISO,
      horaActualTexto: horaActualStr,
    });
  }, [consulta, hoyISO, horaActualStr]);

  // Slots disponibles para el formulario de cita considerando choques del instructor y del cliente (B3)
  const instructorSeleccionado = useMemo(() => {
    if (!solicitarInstructor) return undefined;
    return instructoresMap.get(solicitarInstructor);
  }, [solicitarInstructor, instructoresMap]);

  const slotsDisponibles = useMemo(() => {
    if (consulta.estado !== "listo" || !instructorSeleccionado || !solicitarFecha) return [];
    return filtrarHorariosDisponibles({
      instructor: instructorSeleccionado,
      fecha: solicitarFecha,
      franjasOcupadas: consulta.franjasOcupadas,
      hoy: hoyISO,
      horaActualTexto: horaActualStr,
      citasCliente: consulta.citas,
      clasesCliente: consulta.inscripcionesCliente,
    });
  }, [consulta, instructorSeleccionado, solicitarFecha, hoyISO, horaActualStr]);

  // Manejo de cambio de instructor en modal cita
  function alCambiarInstructor(id: string) {
    setSolicitarInstructor(id);
    setSolicitarHora("");
    setErrorSolicitar("");
  }

  // Manejo de cambio de fecha en modal cita
  function alCambiarFecha(f: string) {
    setSolicitarFecha(f);
    setSolicitarHora("");
    setErrorSolicitar("");
  }

  // Abrir modal de solicitar cita
  function abrirModalSolicitar() {
    setSolicitarTipo("EVALUACION");
    const activo = consulta.estado === "listo" ? consulta.instructores.find((i) => i.estado === "ACTIVO") : null;
    setSolicitarInstructor(activo ? activo.numero_identificacion : "");
    setSolicitarFecha(hoyISO);
    setSolicitarHora("");
    setSolicitarNotas("");
    setErrorSolicitar("");
    setModalSolicitar(true);
  }

  // Enviar solicitud de cita con validación en tiempo real (B4)
  async function confirmarSolicitudCita() {
    if (!cedula) return;
    if (!solicitarInstructor) {
      setErrorSolicitar("Selecciona un instructor.");
      return;
    }
    if (!solicitarFecha) {
      setErrorSolicitar("Selecciona una fecha.");
      return;
    }

    const hoy = utils.isoDate();
    const ahora = horaActual();

    // B4: Revalidación de fecha y hora antes de enviar
    if (solicitarFecha < hoy) {
      setErrorSolicitar("No puedes agendar una cita en una fecha pasada.");
      return;
    }
    if (!solicitarHora) {
      setErrorSolicitar("Selecciona un horario disponible.");
      return;
    }
    if (solicitarFecha === hoy && solicitarHora <= ahora) {
      setErrorSolicitar("El horario seleccionado ya ha pasado para el día de hoy.");
      return;
    }

    setGuardandoCita(true);
    setErrorSolicitar("");

    try {
      const resp = await api.citas.create({
        id_cliente: cedula,
        id_instructor: solicitarInstructor,
        fecha: solicitarFecha,
        hora: solicitarHora,
        tipo_cita: solicitarTipo,
        notas: solicitarNotas.trim(),
      });

      if (!resp.ok) {
        setErrorSolicitar(resp.mensaje);
        setGuardandoCita(false);
        return;
      }

      setModalSolicitar(false);
      setGuardandoCita(false);
      setAlerta({
        tipo: "ok",
        mensaje: `Cita de ${NOMBRE_TIPO_CITA[solicitarTipo]} agendada para el ${formatearFechaCita(solicitarFecha)} a las ${solicitarHora}.`,
      });
      forzarRecarga();
    } catch (err) {
      setErrorSolicitar(err instanceof Error ? err.message : "Error al registrar la cita.");
      setGuardandoCita(false);
    }
  }

  // Cancelar cita propia con validación en tiempo real (B4)
  async function confirmarCancelacionCita() {
    if (!citaACancelar) return;

    const hoy = utils.isoDate();
    const ahora = horaActual();

    // B4: Revalidación antes de llamar a la API
    if (!puedeCancelarCita(citaACancelar, hoy, ahora)) {
      setAlerta({
        tipo: "error",
        mensaje: "La cita ya empezó o su fecha/horario ha pasado; no es posible cancelarla.",
      });
      setCitaACancelar(null);
      return;
    }

    setCancelandoCita(true);

    try {
      const resp = await api.citas.setEstado(citaACancelar.id_cita, "CANCELADA");
      if (!resp.ok) {
        setAlerta({ tipo: "error", mensaje: resp.mensaje });
        setCancelandoCita(false);
        setCitaACancelar(null);
        return;
      }

      setCitaACancelar(null);
      setCancelandoCita(false);
      setAlerta({
        tipo: "ok",
        mensaje: "Tu cita ha sido cancelada correctamente.",
      });
      forzarRecarga();
    } catch (err) {
      setAlerta({
        tipo: "error",
        mensaje: err instanceof Error ? err.message : "Error al cancelar la cita.",
      });
      setCancelandoCita(false);
      setCitaACancelar(null);
    }
  }

  // Reservar cupo en clase con validación previa de membresía y horario (B4, B6)
  async function ejecutarReservaClase() {
    if (!sesionAReservar || !cedula) return;

    const hoy = utils.isoDate();
    const ahora = horaActual();

    // B4: Revalidar si la clase ya empezó
    if (sesionAReservar.fecha < hoy || (sesionAReservar.fecha === hoy && sesionAReservar.clase.hora <= ahora)) {
      setErrorReservaClase("Esta sesión de clase ya empezó o ha pasado.");
      return;
    }

    // B6: Revalidar membresía activa
    if (!tieneMembresiaVigente) {
      setErrorReservaClase("Necesitas una membresía activa y vigente para reservar clases grupales.");
      return;
    }

    setReservandoClase(true);
    setErrorReservaClase("");

    try {
      const resp = await apiClases.inscribir(sesionAReservar.clase.id_clase, cedula, sesionAReservar.fecha);
      if (!resp.ok) {
        setErrorReservaClase(resp.mensaje);
        setReservandoClase(false);
        return;
      }

      setSesionAReservar(null);
      setReservandoClase(false);
      setAlerta({
        tipo: "ok",
        mensaje: `¡Reserva exitosa! Te esperamos en ${sesionAReservar.clase.nombre} el ${formatearFechaCita(sesionAReservar.fecha)} a las ${sesionAReservar.clase.hora}.`,
      });
      forzarRecarga();
    } catch (err) {
      setErrorReservaClase(err instanceof Error ? err.message : "Error al reservar la clase.");
      setReservandoClase(false);
    }
  }

  // Retirarse de clase con validación de horario (B4)
  async function ejecutarRetiroClase() {
    if (!inscripcionARetirar || !cedula) return;

    const hoy = utils.isoDate();
    const ahora = horaActual();

    // B4: Revalidar que la clase no haya empezado
    if (
      !puedeRetirarseClase(
        inscripcionARetirar.inscripcion,
        inscripcionARetirar.clase.hora,
        hoy,
        ahora
      )
    ) {
      setAlerta({
        tipo: "error",
        mensaje: "La sesión de clase ya empezó o ha pasado; no es posible retirarse.",
      });
      setInscripcionARetirar(null);
      return;
    }

    setRetirandoClase(true);

    try {
      const resp = await apiClases.retirar(inscripcionARetirar.inscripcion.id_inscripcion, cedula);
      if (!resp.ok) {
        setAlerta({ tipo: "error", mensaje: resp.mensaje });
        setRetirandoClase(false);
        setInscripcionARetirar(null);
        return;
      }

      setInscripcionARetirar(null);
      setRetirandoClase(false);
      setAlerta({
        tipo: "ok",
        mensaje: `Te has retirado de la clase «${inscripcionARetirar.clase.nombre}». El cupo ha sido liberado.`,
      });
      forzarRecarga();
    } catch (err) {
      setAlerta({
        tipo: "error",
        mensaje: err instanceof Error ? err.message : "Error al retirarse de la clase.",
      });
      setRetirandoClase(false);
      setInscripcionARetirar(null);
    }
  }

  // Filtrado de sesiones de clase disponibles (B7)
  const sesionesFiltradas = useMemo(() => {
    if (consulta.estado !== "listo") return [];
    return consulta.sesionesClases.filter((s) => {
      if (filtroTipoClase !== "TODAS" && s.clase.tipo_clase !== filtroTipoClase) return false;
      return true;
    });
  }, [consulta, filtroTipoClase]);

  // Set de IDs de sesión ya reservadas por el cliente
  const reservasActivasSet = useMemo(() => {
    const set = new Set<string>();
    for (const f of clasesActivas) {
      set.add(`${f.inscripcion.id_clase}_${f.inscripcion.fecha}`);
    }
    return set;
  }, [clasesActivas]);

  if (consulta.estado === "sin-sesion") {
    return (
      <section className="card-g cli-citas-contenedor" aria-labelledby="cli-citas-titulo">
        <div className="card-head">
          <div>
            <h1 id="cli-citas-titulo" className="card-title">Mis citas y clases</h1>
            <p className="card-sub">Consulta tus citas personalizadas y reserva tus clases grupales</p>
          </div>
        </div>
        <div className="empty-state" role="status">
          <i className="bi bi-person-lock" aria-hidden="true" />
          <p>{consulta.mensaje}</p>
        </div>
      </section>
    );
  }

  if (consulta.estado === "cargando") {
    return (
      <section className="card-g cli-citas-contenedor" aria-labelledby="cli-citas-titulo">
        <div className="card-head">
          <div>
            <h1 id="cli-citas-titulo" className="card-title">Mis citas y clases</h1>
            <p className="card-sub">Consulta tus citas personalizadas y reserva tus clases grupales</p>
          </div>
        </div>
        <div className="loader" role="status" aria-live="polite">
          <span className="spinner-g" aria-hidden="true" />
          <span>Cargando citas y clases...</span>
        </div>
      </section>
    );
  }

  if (consulta.estado === "error") {
    return (
      <section className="card-g cli-citas-contenedor" aria-labelledby="cli-citas-titulo">
        <div className="card-head">
          <div>
            <h1 id="cli-citas-titulo" className="card-title">Mis citas y clases</h1>
            <p className="card-sub">Consulta tus citas personalizadas y reserva tus clases grupales</p>
          </div>
        </div>
        <div className="empty-state" role="alert">
          <i className="bi bi-exclamation-triangle" aria-hidden="true" />
          <p>{consulta.mensaje}</p>
          <button type="button" className="btn-dark cli-ent-boton mt-3" onClick={() => forzarRecarga()}>
            <i className="bi bi-arrow-clockwise" aria-hidden="true" /> Reintentar
          </button>
        </div>
      </section>
    );
  }

  return (
    <section className="card-g cli-citas-contenedor" aria-labelledby="cli-citas-titulo">
      <div className="card-head cli-citas-encabezado">
        <div>
          <h1 id="cli-citas-titulo" className="card-title">
            Mis citas y clases
            {actualizando && (
              <span className="cli-indicador-actualizando" role="status" aria-live="polite">
                <span className="spinner-g" style={{ width: 14, height: 14, borderWidth: 2 }} aria-hidden="true" />
                Actualizando...
              </span>
            )}
          </h1>
          <p className="card-sub">Consulta tus citas personalizadas y reserva tus clases grupales</p>
        </div>

        {/* B7: Pestañas con contadores simétricos (citas activas y reservas activas) */}
        <div className="inst-seg cli-citas-tabs" role="tablist" aria-label="Secciones de citas y clases">
          <button
            type="button"
            role="tab"
            id="tab-btn-citas"
            aria-selected={pestana === "citas"}
            aria-controls="panel-citas"
            className={pestana === "citas" ? "activo" : ""}
            onClick={() => setPestana("citas")}
          >
            <i className="bi bi-calendar-check" aria-hidden="true" /> Mis citas ({citasProximas.length})
          </button>
          <button
            type="button"
            role="tab"
            id="tab-btn-clases"
            aria-selected={pestana === "clases"}
            aria-controls="panel-clases"
            className={pestana === "clases" ? "activo" : ""}
            onClick={() => setPestana("clases")}
          >
            <i className="bi bi-people" aria-hidden="true" /> Clases grupales ({clasesActivas.length})
          </button>
        </div>
      </div>

      {/* Alerta flotante o banner reactivo */}
      {alerta && (
        <div
          className={`cli-citas-alerta ${alerta.tipo === "ok" ? "cli-alerta-ok" : "cli-alerta-err"}`}
          role="status"
          aria-live="polite"
        >
          <i
            className={`bi ${alerta.tipo === "ok" ? "bi-check-circle-fill" : "bi-exclamation-octagon-fill"}`}
            aria-hidden="true"
          />
          <span>{alerta.mensaje}</span>
          <button
            type="button"
            className="cli-alerta-cerrar"
            aria-label="Cerrar notificación"
            onClick={() => setAlerta(null)}
          >
            <i className="bi bi-x" aria-hidden="true" />
          </button>
        </div>
      )}

      {/* PANEL 1: MIS CITAS (1 a 1) */}
      {pestana === "citas" && (
        <div id="panel-citas" role="tabpanel" aria-labelledby="tab-btn-citas" className="cli-citas-panel">
          {/* Barra de acción superior */}
          <div className="cli-citas-top-bar">
            <div>
              <h2 className="cli-seccion-subtitulo">Citas individuales</h2>
              <p className="cli-seccion-desc">
                Sesiones 1 a 1 de evaluación física, seguimiento de rutina, nutrición o consultas generales.
              </p>
            </div>
            <button
              type="button"
              className="btn-neon cli-ent-boton"
              onClick={abrirModalSolicitar}
            >
              <i className="bi bi-calendar-plus" aria-hidden="true" /> Solicitar cita
            </button>
          </div>

          {/* B2: Aviso si falló la carga de instructores */}
          {consulta.erroresSeccion.instructores && (
            <div className="cli-seccion-error" role="alert">
              <span>
                <i className="bi bi-exclamation-circle" aria-hidden="true" /> {consulta.erroresSeccion.instructores}
              </span>
              <button type="button" className="btn-dark cli-ent-boton cli-btn-sm" onClick={() => forzarRecarga()}>
                <i className="bi bi-arrow-clockwise" aria-hidden="true" /> Reintentar
              </button>
            </div>
          )}

          {/* Próximas citas */}
          <div className="cli-seccion-bloque">
            <h3 className="cli-bloque-titulo">
              <i className="bi bi-calendar-event" aria-hidden="true" /> Próximas citas ({citasProximas.length})
            </h3>

            {citasProximas.length === 0 ? (
              <div className="empty-state cli-citas-vacio" role="status">
                <i className="bi bi-calendar-x" aria-hidden="true" />
                <p>No tienes citas programadas próximamente.</p>
                <button
                  type="button"
                  className="btn-neon cli-ent-boton mt-2"
                  onClick={abrirModalSolicitar}
                >
                  <i className="bi bi-calendar-plus" aria-hidden="true" /> Solicitar una cita ahora
                </button>
              </div>
            ) : (
              <div className="cli-citas-grid">
                {citasProximas.map((c) => {
                  const ins = instructoresMap.get(c.id_instructor);
                  const insNombre = ins ? `${ins.nombre} ${ins.apellidos}` : `Instructor #${c.id_instructor}`;
                  const badge = badgeEstadoCita(c.estado);
                  const sePuedeCancelar = puedeCancelarCita(c, hoyISO, horaActualStr);

                  return (
                    <article key={c.id_cita} className="cli-cita-card" aria-label={`Cita de ${NOMBRE_TIPO_CITA[c.tipo_cita]}`}>
                      <div className="cli-cita-card-head">
                        <span className="badge-g badge-categoria">{NOMBRE_TIPO_CITA[c.tipo_cita]}</span>
                        <span className={`badge-g ${badge.className}`}>{badge.label}</span>
                      </div>

                      <div className="cli-cita-card-cuerpo">
                        <div className="cli-cita-fecha-hora">
                          <i className="bi bi-clock" aria-hidden="true" />
                          <strong>{formatearFechaCita(c.fecha)}</strong> a las <strong>{c.hora}</strong>
                        </div>

                        <div className="cli-cita-instructor">
                          <i className="bi bi-person-badge" aria-hidden="true" />
                          <span>Instructor: <strong>{insNombre}</strong></span>
                        </div>

                        {c.notas && (
                          <div className="cli-cita-notas">
                            <i className="bi bi-chat-left-text" aria-hidden="true" />
                            <span>{c.notas}</span>
                          </div>
                        )}
                      </div>

                      <div className="cli-cita-card-pie">
                        {sePuedeCancelar && (
                          <button
                            type="button"
                            className="btn-dark cli-ent-boton cli-ent-boton-peligro cli-btn-sm"
                            onClick={() => setCitaACancelar(c)}
                          >
                            <i className="bi bi-x-circle" aria-hidden="true" /> Cancelar cita
                          </button>
                        )}
                      </div>
                    </article>
                  );
                })}
              </div>
            )}
          </div>

          {/* Historial secundario de citas anteriores */}
          <div className="cli-seccion-bloque mt-4">
            <h3 className="cli-bloque-titulo">
              <i className="bi bi-clock-history" aria-hidden="true" /> Historial de citas anteriores ({citasPasadas.length})
            </h3>

            {citasPasadas.length === 0 ? (
              <p className="cli-texto-neutral">No tienes citas anteriores registradas en tu historial.</p>
            ) : (
              <>
                <div className="table-wrap" tabIndex={0} role="region" aria-label="Historial de citas pasadas">
                  <table className="table-g cli-citas-tabla">
                    <thead>
                      <tr>
                        <th scope="col">Fecha y hora</th>
                        <th scope="col">Tipo de cita</th>
                        <th scope="col">Instructor</th>
                        <th scope="col">Estado</th>
                        <th scope="col">Notas</th>
                      </tr>
                    </thead>
                    <tbody>
                      {citasPasadas
                        .slice(
                          (paginaCitasPasadas - 1) * POR_PAGINA_HISTORIAL,
                          paginaCitasPasadas * POR_PAGINA_HISTORIAL
                        )
                        .map((c) => {
                          const ins = instructoresMap.get(c.id_instructor);
                          const insNombre = ins ? `${ins.nombre} ${ins.apellidos}` : c.id_instructor;
                          const badge = badgeEstadoCita(c.estado);

                          return (
                            <tr key={c.id_cita}>
                              <td>
                                <strong>{c.fecha}</strong> · {c.hora}
                              </td>
                              <td>{NOMBRE_TIPO_CITA[c.tipo_cita]}</td>
                              <td>{insNombre}</td>
                              <td>
                                <span className={`badge-g ${badge.className}`}>{badge.label}</span>
                              </td>
                              <td className="cli-td-notas">{c.notas || "—"}</td>
                            </tr>
                          );
                        })}
                    </tbody>
                  </table>
                </div>

                <Paginador
                  pagina={paginaCitasPasadas}
                  total={citasPasadas.length}
                  porPagina={POR_PAGINA_HISTORIAL}
                  onCambiar={setPaginaCitasPasadas}
                />
              </>
            )}
          </div>
        </div>
      )}

      {/* PANEL 2: CLASES GRUPALES */}
      {pestana === "clases" && (
        <div id="panel-clases" role="tabpanel" aria-labelledby="tab-btn-clases" className="cli-clases-panel">
          {/* Subtítulo */}
          <div className="cli-citas-top-bar">
            <div>
              <h2 className="cli-seccion-subtitulo">Clases grupales con aforo</h2>
              <p className="cli-seccion-desc">
                Reserva tu cupo para las clases disponibles en los próximos 14 días.
              </p>
            </div>
          </div>

          {/* B6: Aviso temprano de membresía si el cliente no tiene una activa */}
          {!tieneMembresiaVigente && (
            <div className="cli-aviso-membresia" role="status">
              <i className="bi bi-info-circle-fill" aria-hidden="true" />
              <div>
                <strong>Membresía requerida para clases grupales:</strong> Para reservar cupos en clases grupales debes
                contar con una membresía activa y vigente en tu gimnasio. Consulta tus planes o solicita tu suscripción
                en{" "}
                <Link to={ruta("/mi-membresia")} className="cli-link-membresia">
                  Mi membresía
                </Link>
                .
              </div>
            </div>
          )}

          {/* Mis reservas activas de clases */}
          <div className="cli-seccion-bloque">
            <h3 className="cli-bloque-titulo">
              <i className="bi bi-bookmark-star" aria-hidden="true" /> Mis reservas próximas ({clasesActivas.length})
            </h3>

            {/* B2: Aviso si falló la carga de inscripciones */}
            {consulta.erroresSeccion.misClases && (
              <div className="cli-seccion-error mb-3" role="alert">
                <span>
                  <i className="bi bi-exclamation-circle" aria-hidden="true" /> {consulta.erroresSeccion.misClases}
                </span>
                <button type="button" className="btn-dark cli-ent-boton cli-btn-sm" onClick={() => forzarRecarga()}>
                  <i className="bi bi-arrow-clockwise" aria-hidden="true" /> Reintentar
                </button>
              </div>
            )}

            {clasesActivas.length === 0 ? (
              <p className="cli-texto-neutral">No tienes reservas activas para clases grupales próximas.</p>
            ) : (
              <div className="cli-citas-grid">
                {clasesActivas.map(({ inscripcion, clase }) => {
                  const ins = instructoresMap.get(clase.id_instructor);
                  const insNombre = ins ? `${ins.nombre} ${ins.apellidos}` : `Instructor #${clase.id_instructor}`;
                  const sePuedeRetirar = puedeRetirarseClase(inscripcion, clase.hora, hoyISO, horaActualStr);

                  return (
                    <article
                      key={inscripcion.id_inscripcion}
                      className="cli-cita-card"
                      aria-label={`Reserva para ${clase.nombre}`}
                    >
                      <div className="cli-cita-card-head">
                        <span className="badge-g badge-categoria">{NOMBRE_TIPO_CLASE[clase.tipo_clase]}</span>
                        <span className="badge-g badge-activo">Reservada</span>
                      </div>

                      <div className="cli-cita-card-cuerpo">
                        <h4 className="cli-clase-titulo">{clase.nombre}</h4>

                        <div className="cli-cita-fecha-hora">
                          <i className="bi bi-calendar3" aria-hidden="true" />
                          <strong>{formatearFechaCita(inscripcion.fecha)}</strong>
                        </div>

                        <div className="cli-cita-fecha-hora">
                          <i className="bi bi-clock" aria-hidden="true" />
                          <span>{clase.hora} – {horaFin(clase)} ({clase.duracion_min} min)</span>
                        </div>

                        <div className="cli-cita-instructor">
                          <i className="bi bi-person-badge" aria-hidden="true" />
                          <span>Instructor: <strong>{insNombre}</strong></span>
                        </div>
                      </div>

                      <div className="cli-cita-card-pie">
                        {sePuedeRetirar && (
                          <button
                            type="button"
                            className="btn-dark cli-ent-boton cli-ent-boton-peligro cli-btn-sm"
                            onClick={() => setInscripcionARetirar({ inscripcion, clase })}
                          >
                            <i className="bi bi-box-arrow-right" aria-hidden="true" /> Retirarme de la clase
                          </button>
                        )}
                      </div>
                    </article>
                  );
                })}
              </div>
            )}
          </div>

          {/* B7: Sesiones programadas disponibles con filtro contextual integrado */}
          <div className="cli-seccion-bloque mt-4">
            <div className="cli-subseccion-header">
              <h3 className="cli-bloque-titulo mb-0">
                <i className="bi bi-calendar-check" aria-hidden="true" /> Sesiones disponibles para reservar ({sesionesFiltradas.length})
              </h3>

              <div className="cli-filtro-tipo">
                <label htmlFor="select-tipo-clase" className="cli-filtro-label">
                  Filtrar por tipo:
                </label>
                <select
                  id="select-tipo-clase"
                  className="form-control-dark"
                  value={filtroTipoClase}
                  onChange={(e) => setFiltroTipoClase(e.target.value)}
                >
                  <option value="TODAS">Todas las clases</option>
                  {TIPOS_CLASE.map((t) => (
                    <option key={t} value={t}>
                      {NOMBRE_TIPO_CLASE[t]}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* B2: Aviso si falló la carga de sesiones */}
            {consulta.erroresSeccion.clases ? (
              <div className="cli-seccion-error" role="alert">
                <span>
                  <i className="bi bi-exclamation-circle" aria-hidden="true" /> {consulta.erroresSeccion.clases}
                </span>
                <button type="button" className="btn-dark cli-ent-boton cli-btn-sm" onClick={() => forzarRecarga()}>
                  <i className="bi bi-arrow-clockwise" aria-hidden="true" /> Reintentar
                </button>
              </div>
            ) : sesionesFiltradas.length === 0 ? (
              <div className="empty-state cli-citas-vacio" role="status">
                <i className="bi bi-calendar-x" aria-hidden="true" />
                <p>No hay sesiones disponibles con el filtro seleccionado.</p>
              </div>
            ) : (
              <div className="cli-citas-grid">
                {sesionesFiltradas.map((s) => {
                  const ins = instructoresMap.get(s.clase.id_instructor);
                  const insNombre = ins ? `${ins.nombre} ${ins.apellidos}` : `Instructor #${s.clase.id_instructor}`;
                  const reservada = reservasActivasSet.has(`${s.clase.id_clase}_${s.fecha}`);
                  const sinCupos = s.cupos_libres <= 0;

                  return (
                    <article
                      key={`${s.clase.id_clase}_${s.fecha}`}
                      className={`cli-cita-card ${s.cancelada ? "cli-card-cancelada" : ""}`}
                      aria-label={`Clase ${s.clase.nombre}`}
                    >
                      <div className="cli-cita-card-head">
                        <span className="badge-g badge-categoria">{NOMBRE_TIPO_CLASE[s.clase.tipo_clase]}</span>
                        {s.cancelada ? (
                          <span className="badge-g badge-cancelada">Sesión cancelada</span>
                        ) : reservada ? (
                          <span className="badge-g badge-activo">Ya reservaste</span>
                        ) : sinCupos ? (
                          <span className="badge-g badge-suspendido">Cupos agotados</span>
                        ) : (
                          <span className="badge-g badge-g--plain">
                            {s.cupos_libres} {s.cupos_libres === 1 ? "cupo libre" : "cupos libres"}
                          </span>
                        )}
                      </div>

                      <div className="cli-cita-card-cuerpo">
                        <h4 className="cli-clase-titulo">{s.clase.nombre}</h4>

                        <div className="cli-cita-fecha-hora">
                          <i className="bi bi-calendar3" aria-hidden="true" />
                          <strong>{formatearFechaCita(s.fecha)}</strong>
                        </div>

                        <div className="cli-cita-fecha-hora">
                          <i className="bi bi-clock" aria-hidden="true" />
                          <span>{s.clase.hora} – {horaFin(s.clase)} ({s.clase.duracion_min} min)</span>
                        </div>

                        <div className="cli-cita-instructor">
                          <i className="bi bi-person-badge" aria-hidden="true" />
                          <span>Instructor: <strong>{insNombre}</strong></span>
                        </div>

                        <div className="cli-aforo-info">
                          <i className="bi bi-people" aria-hidden="true" />
                          <span>Aforo: {s.inscritos} / {s.clase.aforo_max} personas</span>
                        </div>
                      </div>

                      <div className="cli-cita-card-pie">
                        {s.cancelada ? (
                          <span className="cli-texto-aviso-cancelada">Cancelada por el gimnasio</span>
                        ) : reservada ? (
                          <span className="cli-texto-reservado">
                            <i className="bi bi-check-circle" aria-hidden="true" /> Tienes cupo reservado
                          </span>
                        ) : sinCupos ? (
                          <span className="cli-texto-agotado">Sin cupos disponibles</span>
                        ) : !tieneMembresiaVigente ? (
                          <button
                            type="button"
                            className="btn-dark cli-ent-boton cli-btn-sm"
                            disabled
                            title="Requiere una membresía activa en tu gimnasio"
                          >
                            <i className="bi bi-lock-fill" aria-hidden="true" /> Requiere membresía
                          </button>
                        ) : (
                          <button
                            type="button"
                            className="btn-neon cli-ent-boton cli-btn-sm"
                            onClick={() => {
                              setErrorReservaClase("");
                              setSesionAReservar(s);
                            }}
                          >
                            <i className="bi bi-bookmark-plus" aria-hidden="true" /> Reservar cupo
                          </button>
                        )}
                      </div>
                    </article>
                  );
                })}
              </div>
            )}
          </div>

          {/* Historial de clases pasadas y canceladas */}
          <div className="cli-seccion-bloque mt-4">
            <h3 className="cli-bloque-titulo">
              <i className="bi bi-clock-history" aria-hidden="true" /> Historial de reservas anteriores ({clasesPasadas.length})
            </h3>

            {clasesPasadas.length === 0 ? (
              <p className="cli-texto-neutral">No tienes reservas pasadas en el historial.</p>
            ) : (
              <>
                <div className="table-wrap" tabIndex={0} role="region" aria-label="Historial de clases pasadas">
                  <table className="table-g cli-citas-tabla">
                    <thead>
                      <tr>
                        <th scope="col">Fecha</th>
                        <th scope="col">Clase</th>
                        <th scope="col">Tipo</th>
                        <th scope="col">Instructor</th>
                        <th scope="col">Horario</th>
                        <th scope="col">Estado</th>
                      </tr>
                    </thead>
                    <tbody>
                      {clasesPasadas
                        .slice(
                          (paginaClasesPasadas - 1) * POR_PAGINA_HISTORIAL,
                          paginaClasesPasadas * POR_PAGINA_HISTORIAL
                        )
                        .map(({ inscripcion, clase }) => {
                          const ins = instructoresMap.get(clase.id_instructor);
                          const insNombre = ins ? `${ins.nombre} ${ins.apellidos}` : clase.id_instructor;
                          const badge = badgeEstadoInscripcion(inscripcion.estado);

                          return (
                            <tr key={inscripcion.id_inscripcion}>
                              <td><strong>{inscripcion.fecha}</strong></td>
                              <td>{clase.nombre}</td>
                              <td>{NOMBRE_TIPO_CLASE[clase.tipo_clase]}</td>
                              <td>{insNombre}</td>
                              <td>{clase.hora} – {horaFin(clase)}</td>
                              <td>
                                <span className={`badge-g ${badge.className}`}>{badge.label}</span>
                              </td>
                            </tr>
                          );
                        })}
                    </tbody>
                  </table>
                </div>

                <Paginador
                  pagina={paginaClasesPasadas}
                  total={clasesPasadas.length}
                  porPagina={POR_PAGINA_HISTORIAL}
                  onCambiar={setPaginaClasesPasadas}
                />
              </>
            )}
          </div>
        </div>
      )}

      {/* B5: MODAL: SOLICITAR CITA CON WAI-ARIA */}
      <Modal
        show={modalSolicitar}
        onHide={() => !guardandoCita && setModalSolicitar(false)}
        centered
        backdrop="static"
        keyboard={!guardandoCita}
        aria-labelledby="cli-modal-solicitar-titulo"
        aria-describedby="cli-modal-solicitar-desc"
        contentClassName="cli-modal-content"
      >
        <Modal.Header closeButton={!guardandoCita} className="cli-modal-header">
          <Modal.Title as="h2" id="cli-modal-solicitar-titulo" className="cli-modal-title">
            <i className="bi bi-calendar-plus" aria-hidden="true" /> Solicitar cita individual
          </Modal.Title>
        </Modal.Header>
        <Modal.Body id="cli-modal-solicitar-desc" className="cli-modal-body">
          {errorSolicitar && (
            <div className="cli-alerta-err cli-modal-alerta" role="alert">
              <i className="bi bi-exclamation-triangle" aria-hidden="true" />
              <span>{errorSolicitar}</span>
            </div>
          )}

          <div className="cli-form-grupo">
            <label htmlFor="tipo-cita-select" className="form-label-g">
              Tipo de cita
            </label>
            <select
              id="tipo-cita-select"
              className="form-control-dark"
              value={solicitarTipo}
              onChange={(e) => setSolicitarTipo(e.target.value as TipoCita)}
              disabled={guardandoCita}
            >
              {TIPOS_CITA_LISTA.map((t) => (
                <option key={t} value={t}>
                  {NOMBRE_TIPO_CITA[t]}
                </option>
              ))}
            </select>
          </div>

          <div className="cli-form-grupo mt-3">
            <label htmlFor="instructor-cita-select" className="form-label-g">
              Instructor disponible
            </label>
            <select
              id="instructor-cita-select"
              className="form-control-dark"
              value={solicitarInstructor}
              onChange={(e) => alCambiarInstructor(e.target.value)}
              disabled={guardandoCita}
            >
              <option value="">Selecciona un instructor...</option>
              {consulta.estado === "listo" &&
                consulta.instructores
                  .filter((i) => i.estado === "ACTIVO")
                  .map((i) => (
                    <option key={i.numero_identificacion} value={i.numero_identificacion}>
                      {i.nombre} {i.apellidos} ({i.especialidad})
                    </option>
                  ))}
            </select>
            {instructorSeleccionado && (
              <small className="cli-ayuda-horario">
                <i className="bi bi-info-circle" aria-hidden="true" /> Horario habitual:{" "}
                {disponibilidadTexto(instructorSeleccionado.horario) || "Sin horario configurado"}
              </small>
            )}
          </div>

          <div className="cli-form-grupo mt-3">
            <label htmlFor="fecha-cita-input" className="form-label-g">
              Fecha
            </label>
            <input
              id="fecha-cita-input"
              type="date"
              className="form-control-dark"
              value={solicitarFecha}
              min={hoyISO}
              onChange={(e) => alCambiarFecha(e.target.value)}
              disabled={guardandoCita}
            />
          </div>

          <div className="cli-form-grupo mt-3">
            <label htmlFor="hora-cita-select" className="form-label-g">
              Horario disponible
            </label>
            {slotsDisponibles.length === 0 ? (
              <div className="cli-slots-aviso" role="status">
                {solicitarInstructor && solicitarFecha ? (
                  solicitarFecha < hoyISO ? (
                    "La fecha seleccionada ya pasó."
                  ) : (
                    "No hay horarios disponibles para esta fecha con el instructor seleccionado (o coinciden con tus citas y clases reservadas)."
                  )
                ) : (
                  "Selecciona primero un instructor y una fecha para ver los horarios disponibles."
                )}
              </div>
            ) : (
              <select
                id="hora-cita-select"
                className="form-control-dark"
                value={solicitarHora}
                onChange={(e) => setSolicitarHora(e.target.value)}
                disabled={guardandoCita}
              >
                <option value="">Selecciona una hora...</option>
                {slotsDisponibles.map((s) => (
                  <option key={s} value={s}>
                    {s}
                  </option>
                ))}
              </select>
            )}
          </div>

          <div className="cli-form-grupo mt-3">
            <label htmlFor="notas-cita-input" className="form-label-g">
              Notas u observaciones (opcional)
            </label>
            <textarea
              id="notas-cita-input"
              className="form-control-dark"
              rows={2}
              maxLength={200}
              placeholder="Indica cualquier detalle relevante previo a la cita..."
              value={solicitarNotas}
              onChange={(e) => setSolicitarNotas(e.target.value)}
              disabled={guardandoCita}
            />
          </div>
        </Modal.Body>
        <Modal.Footer className="cli-modal-footer">
          <button
            type="button"
            className="btn-dark cli-ent-boton"
            onClick={() => setModalSolicitar(false)}
            disabled={guardandoCita}
          >
            Cancelar
          </button>
          <button
            type="button"
            className="btn-neon cli-ent-boton"
            onClick={confirmarSolicitudCita}
            disabled={guardandoCita || !solicitarInstructor || !solicitarFecha || !solicitarHora}
          >
            {guardandoCita ? "Agendando..." : "Confirmar cita"}
          </button>
        </Modal.Footer>
      </Modal>

      {/* B5: MODAL: CONFIRMAR CANCELACIÓN DE CITA CON WAI-ARIA */}
      <Modal
        show={Boolean(citaACancelar)}
        onHide={() => !cancelandoCita && setCitaACancelar(null)}
        centered
        aria-labelledby="cli-modal-cancelar-titulo"
        aria-describedby="cli-modal-cancelar-desc"
        contentClassName="cli-modal-content"
      >
        <Modal.Header closeButton={!cancelandoCita} className="cli-modal-header">
          <Modal.Title as="h2" id="cli-modal-cancelar-titulo" className="cli-modal-title">
            <i className="bi bi-exclamation-triangle" aria-hidden="true" /> Cancelar cita
          </Modal.Title>
        </Modal.Header>
        <Modal.Body id="cli-modal-cancelar-desc" className="cli-modal-body">
          {citaACancelar && (
            <div>
              <p>¿Estás seguro de que deseas cancelar la siguiente cita?</p>
              <div className="cli-resumen-cancelacion">
                <div><strong>Tipo:</strong> {NOMBRE_TIPO_CITA[citaACancelar.tipo_cita]}</div>
                <div><strong>Fecha:</strong> {formatearFechaCita(citaACancelar.fecha)}</div>
                <div><strong>Hora:</strong> {citaACancelar.hora}</div>
                <div>
                  <strong>Instructor:</strong>{" "}
                  {instructoresMap.get(citaACancelar.id_instructor)?.nombre ?? citaACancelar.id_instructor}
                </div>
              </div>
              <p className="cli-aviso-advertencia mt-3">
                <i className="bi bi-info-circle" aria-hidden="true" /> Al cancelar, ese horario quedará libre en la
                agenda del instructor. Esta acción no se puede deshacer; si cambias de opinión, solicita una cita nueva.
              </p>
            </div>
          )}
        </Modal.Body>
        <Modal.Footer className="cli-modal-footer">
          <button
            type="button"
            className="btn-dark cli-ent-boton"
            onClick={() => setCitaACancelar(null)}
            disabled={cancelandoCita}
          >
            Mantener cita
          </button>
          <button
            type="button"
            className="btn-dark cli-ent-boton cli-ent-boton-peligro"
            onClick={confirmarCancelacionCita}
            disabled={cancelandoCita}
          >
            {cancelandoCita ? "Cancelando..." : "Sí, cancelar cita"}
          </button>
        </Modal.Footer>
      </Modal>

      {/* B5: MODAL: RESERVAR CLASE GRUPAL CON WAI-ARIA Y VERIFICACIÓN DE MEMBRESÍA (B6) */}
      <Modal
        show={Boolean(sesionAReservar)}
        onHide={() => !reservandoClase && setSesionAReservar(null)}
        centered
        aria-labelledby="cli-modal-reservar-titulo"
        aria-describedby="cli-modal-reservar-desc"
        contentClassName="cli-modal-content"
      >
        <Modal.Header closeButton={!reservandoClase} className="cli-modal-header">
          <Modal.Title as="h2" id="cli-modal-reservar-titulo" className="cli-modal-title">
            <i className="bi bi-bookmark-plus" aria-hidden="true" /> Reservar cupo en clase grupal
          </Modal.Title>
        </Modal.Header>
        <Modal.Body id="cli-modal-reservar-desc" className="cli-modal-body">
          {errorReservaClase && (
            <div className="cli-alerta-err cli-modal-alerta" role="alert">
              <i className="bi bi-exclamation-octagon" aria-hidden="true" />
              <span>{errorReservaClase}</span>
            </div>
          )}

          {sesionAReservar && (
            <div>
              <p>Confirma tu reserva para la siguiente sesión grupal:</p>
              <div className="cli-resumen-cancelacion">
                <div><strong>Clase:</strong> {sesionAReservar.clase.nombre}</div>
                <div><strong>Tipo:</strong> {NOMBRE_TIPO_CLASE[sesionAReservar.clase.tipo_clase]}</div>
                <div><strong>Fecha:</strong> {formatearFechaCita(sesionAReservar.fecha)}</div>
                <div>
                  <strong>Horario:</strong> {sesionAReservar.clase.hora} – {horaFin(sesionAReservar.clase)} (
                  {sesionAReservar.clase.duracion_min} min)
                </div>
                <div>
                  <strong>Instructor:</strong>{" "}
                  {instructoresMap.get(sesionAReservar.clase.id_instructor)?.nombre ??
                    sesionAReservar.clase.id_instructor}
                </div>
                <div>
                  <strong>Cupos restantes:</strong> {sesionAReservar.cupos_libres} de{" "}
                  {sesionAReservar.clase.aforo_max}
                </div>
              </div>

              {!tieneMembresiaVigente ? (
                <p className="cli-aviso-advertencia mt-3 text-warning">
                  <i className="bi bi-exclamation-triangle-fill" aria-hidden="true" /> No cuentas con una membresía activa
                  vigente para completar esta reserva.
                </p>
              ) : (
                <p className="cli-aviso-advertencia mt-3">
                  <i className="bi bi-shield-check" aria-hidden="true" /> Recuerda que para asistir debes contar con tu
                  membresía vigente en tu gimnasio.
                </p>
              )}
            </div>
          )}
        </Modal.Body>
        <Modal.Footer className="cli-modal-footer">
          <button
            type="button"
            className="btn-dark cli-ent-boton"
            onClick={() => setSesionAReservar(null)}
            disabled={reservandoClase}
          >
            Volver
          </button>
          <button
            type="button"
            className="btn-neon cli-ent-boton"
            onClick={ejecutarReservaClase}
            disabled={reservandoClase || !tieneMembresiaVigente}
          >
            {reservandoClase ? "Reservando..." : "Confirmar reserva"}
          </button>
        </Modal.Footer>
      </Modal>

      {/* B5: MODAL: RETIRARSE DE CLASE GRUPAL CON WAI-ARIA */}
      <Modal
        show={Boolean(inscripcionARetirar)}
        onHide={() => !retirandoClase && setInscripcionARetirar(null)}
        centered
        aria-labelledby="cli-modal-retirar-titulo"
        aria-describedby="cli-modal-retirar-desc"
        contentClassName="cli-modal-content"
      >
        <Modal.Header closeButton={!retirandoClase} className="cli-modal-header">
          <Modal.Title as="h2" id="cli-modal-retirar-titulo" className="cli-modal-title">
            <i className="bi bi-box-arrow-right" aria-hidden="true" /> Retirarme de la clase
          </Modal.Title>
        </Modal.Header>
        <Modal.Body id="cli-modal-retirar-desc" className="cli-modal-body">
          {inscripcionARetirar && (
            <div>
              <p>¿Seguro que deseas retirarte de esta clase grupal?</p>
              <div className="cli-resumen-cancelacion">
                <div><strong>Clase:</strong> {inscripcionARetirar.clase.nombre}</div>
                <div><strong>Fecha:</strong> {formatearFechaCita(inscripcionARetirar.inscripcion.fecha)}</div>
                <div><strong>Horario:</strong> {inscripcionARetirar.clase.hora}</div>
              </div>
              <p className="cli-aviso-advertencia mt-3">
                <i className="bi bi-info-circle" aria-hidden="true" /> Tu cupo se liberará automáticamente para que otro
                compañero pueda aprovecharlo.
              </p>
            </div>
          )}
        </Modal.Body>
        <Modal.Footer className="cli-modal-footer">
          <button
            type="button"
            className="btn-dark cli-ent-boton"
            onClick={() => setInscripcionARetirar(null)}
            disabled={retirandoClase}
          >
            No, mantener mi cupo
          </button>
          <button
            type="button"
            className="btn-dark cli-ent-boton cli-ent-boton-peligro"
            onClick={ejecutarRetiroClase}
            disabled={retirandoClase}
          >
            {retirandoClase ? "Retirando..." : "Sí, retirarme"}
          </button>
        </Modal.Footer>
      </Modal>
    </section>
  );
}
