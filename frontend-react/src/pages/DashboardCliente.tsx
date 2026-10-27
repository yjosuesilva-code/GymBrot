import { useEffect, useReducer, useState } from "react";
import { Link } from "react-router-dom";
import { AvanceCliente } from "../components/cliente/AvanceCliente";
import {
  buscarBorradorRutina,
  formatearTiempoRelativo,
} from "../components/cliente/borradorEntrenamiento";
import type { AmbitoBorrador } from "../components/cliente/borradorEntrenamiento";
import {
  formatearListaGrupos,
  limpiarDescripcionRutina,
  obtenerSaludoCliente,
  resumirUltimaActividad,
  seleccionarMembresiaResumen,
  seleccionarProximaCitaCliente,
  textoObjetivoPlan,
} from "../components/cliente/dashboardCliente";
import type {
  NavegacionMiRutinaState,
  ResumenMembresiaCliente,
  ResumenProximaCitaCliente,
  ResumenUltimaActividadCliente,
} from "../components/cliente/dashboardCliente";
import { BadgeEstadoRutina } from "../components/rutinas/BadgeEstadoRutina";
import { api } from "../data/api";
import { current } from "../lib/auth";
import { horaActual } from "../lib/citas";
import {
  duracionEstimada,
  gruposDeSesion,
  idealAHoy,
  textoVigencia,
} from "../lib/rutinas";
import { utils } from "../lib/utils";
import { useTenantOpcional } from "../tenant/TenantContext";
import type {
  Ejercicio,
  Instructor,
  LetraSesion,
  Rutina,
} from "../types";

type DatosRutinaDashboard = {
  rutina: Rutina;
  sesiones: Awaited<ReturnType<typeof api.rutinas.sesiones>>;
  avance: Awaited<ReturnType<typeof api.rutinas.avance>> | null;
  siguiente: LetraSesion | null;
  catalogo: Ejercicio[];
  instructor: Instructor | null;
  ultimaActividad: ResumenUltimaActividadCliente | null;
  errorAvance: boolean;
  errorActividad: boolean;
};

type DatosDashboardCliente = {
  datosRutina: DatosRutinaDashboard | null;
  errorRutina: string | null;
  membresiaResumen: ResumenMembresiaCliente | null;
  errorMembresia: boolean;
  proximaCita: ResumenProximaCitaCliente | null;
  errorCitas: boolean;
};

type EstadoCargaDashboard =
  | { estado: "cargando" }
  | { estado: "sin-sesion"; mensaje: string }
  | { estado: "listo"; datos: DatosDashboardCliente };

export function DashboardCliente() {
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
    <ContenidoDashboardCliente
      key={JSON.stringify([gimnasioId, cedula, sesion?.tipo_usuario])}
      cedula={cedula}
      gimnasioId={gimnasioId}
      esCliente={sesion?.tipo_usuario === "CLIENTE"}
      nombreCliente={sesion?.nombre ?? ""}
    />
  );
}

function ContenidoDashboardCliente({
  cedula,
  gimnasioId,
  esCliente,
  nombreCliente,
}: {
  cedula: string | undefined;
  gimnasioId: string | undefined;
  esCliente: boolean;
  nombreCliente: string;
}) {
  const tenant = useTenantOpcional();
  const ruta = (path: string) => (tenant ? tenant.ruta(path) : path);
  const [consulta, setConsulta] = useState<EstadoCargaDashboard>({ estado: "cargando" });
  const [intento, recargar] = useReducer((n: number) => n + 1, 0);
  const [, refrescarReloj] = useReducer((n: number) => n + 1, 0);

  useEffect(() => {
    const intervalo = window.setInterval(() => refrescarReloj(), 60000);
    return () => window.clearInterval(intervalo);
  }, []);

  useEffect(() => {
    let cancelado = false;

    async function cargarDashboard() {
      if (!cedula || !gimnasioId || !esCliente) {
        setConsulta({
          estado: "sin-sesion",
          mensaje: "No hay una sesión activa de cliente. Vuelve a iniciar sesión para ver tu panel.",
        });
        return;
      }

      setConsulta({ estado: "cargando" });
      const hoy = utils.isoDate();

      const promesaMembresia = Promise.all([
        api.membresias.byCliente(cedula),
        api.clientes.get(cedula).catch(() => null),
      ])
        .then(([membresias, cliente]) => ({
          ok: true as const,
          resumen: seleccionarMembresiaResumen({
            membresias,
            cliente,
            idCliente: cedula,
            gimnasioId,
            hoy,
          }),
        }))
        .catch(() => ({ ok: false as const, resumen: null }));

      const promesaCitas = Promise.all([
        api.citas.byCliente(cedula),
        api.instructores.list().catch(() => [] as Instructor[]),
      ])
        .then(([citas, instructores]) => ({
          ok: true as const,
          proxima: seleccionarProximaCitaCliente({
            citas,
            instructores,
            idCliente: cedula,
            gimnasioId,
            hoy,
            horaActualTexto: horaActual(),
          }),
        }))
        .catch(() => ({ ok: false as const, proxima: null }));

      const promesaRutina = (async (): Promise<{
        datos: DatosRutinaDashboard | null;
        error: string | null;
      }> => {
        try {
          const vigente = await api.rutinas.vigenteDeCliente(cedula);
          const rutina = vigente ?? (await api.rutinas.deCliente(cedula))[0];
          if (!rutina) {
            return { datos: null, error: null };
          }
          if (rutina.id_cliente !== cedula || rutina.gimnasio_id !== gimnasioId) {
            return {
              datos: null,
              error: "La rutina consultada no corresponde a tu cuenta o gimnasio actual.",
            };
          }

          const [
            sesiones,
            catalogo,
            instructor,
            resultadoAvance,
            resultadoSiguiente,
            resultadoRegistros,
          ] = await Promise.all([
            api.rutinas.sesiones(rutina.id_rutina),
            api.ejercicios.list(),
            api.instructores.get(rutina.id_instructor).catch(() => null),
            api.rutinas
              .avance(rutina.id_rutina)
              .then((avance) => ({ ok: true as const, avance }))
              .catch(() => ({ ok: false as const, avance: null })),
            api.rutinas
              .siguienteSesion(rutina.id_rutina)
              .then((siguiente) => ({ ok: true as const, siguiente }))
              .catch(() => ({ ok: false as const, siguiente: null })),
            api.rutinas
              .registros(rutina.id_rutina)
              .then((registros) => ({ ok: true as const, registros }))
              .catch(() => ({ ok: false as const, registros: [] })),
          ]);

          const ultimaActividad = resultadoRegistros.ok
            ? resumirUltimaActividad({
                registros: resultadoRegistros.registros,
                ambito: {
                  gimnasioId,
                  idCliente: cedula,
                  idRutina: rutina.id_rutina,
                },
                catalogo,
                hoy,
              })
            : null;

          return {
            datos: {
              rutina,
              sesiones,
              avance: resultadoAvance.avance,
              siguiente: resultadoSiguiente.siguiente,
              catalogo,
              instructor,
              ultimaActividad,
              errorAvance: !resultadoAvance.ok,
              errorActividad: !resultadoRegistros.ok,
            },
            error: null,
          };
        } catch (err: unknown) {
          return {
            datos: null,
            error:
              err instanceof Error
                ? err.message
                : "No pudimos consultar tu plan de entrenamiento en este momento.",
          };
        }
      })();

      const [resRutina, resMembresia, resCitas] = await Promise.all([
        promesaRutina,
        promesaMembresia,
        promesaCitas,
      ]);

      if (cancelado) return;

      setConsulta({
        estado: "listo",
        datos: {
          datosRutina: resRutina.datos,
          errorRutina: resRutina.error,
          membresiaResumen: resMembresia.resumen,
          errorMembresia: !resMembresia.ok,
          proximaCita: resCitas.proxima,
          errorCitas: !resCitas.ok,
        },
      });
    }

    void cargarDashboard();
    return () => {
      cancelado = true;
    };
  }, [cedula, gimnasioId, esCliente, intento]);

  const { saludo, tieneNombre } = obtenerSaludoCliente(nombreCliente);

  if (consulta.estado === "sin-sesion") {
    return (
      <section className="card-g cli-dashboard" aria-labelledby="cli-dash-titulo">
        <div className="card-head">
          <h1 className="card-title mb-0" id="cli-dash-titulo">
            Inicio
          </h1>
        </div>
        <div className="alert-g alert-error show" role="alert">
          {consulta.mensaje}
        </div>
      </section>
    );
  }

  if (consulta.estado === "cargando") {
    return (
      <section className="card-g cli-dashboard" aria-labelledby="cli-dash-titulo">
        <div className="card-head">
          <h1 className="card-title mb-0" id="cli-dash-titulo">
            {saludo}
          </h1>
        </div>
        <div className="loader" role="status">
          <span className="spinner-g" aria-hidden="true" />
          Cargando tu panel principal…
        </div>
      </section>
    );
  }

  const {
    datosRutina,
    errorRutina,
    membresiaResumen,
    errorMembresia,
    proximaCita,
    errorCitas,
  } = consulta.datos;

  const rutina = datosRutina?.rutina ?? null;
  const estadoRutina = rutina ? api.rutinas.estado(rutina) : null;
  const rutinaVigente =
    estadoRutina === "VIGENTE" || estadoRutina === "POR_VENCER";
  const detalleVigenciaRutina =
    rutina && estadoRutina && rutina.fecha_fin !== null && estadoRutina !== "FINALIZADA"
      ? textoVigencia(rutina, estadoRutina)
      : undefined;

  const ambitoBorrador: AmbitoBorrador | null =
    rutina &&
    gimnasioId &&
    cedula &&
    rutina.id_cliente === cedula &&
    rutina.gimnasio_id === gimnasioId
      ? { gimnasioId, idCliente: cedula, idRutina: rutina.id_rutina }
      : null;

  const resultadoBorrador =
    datosRutina && ambitoBorrador
      ? buscarBorradorRutina({
          ambito: ambitoBorrador,
          rutina: datosRutina.rutina,
          vigente: rutinaVigente,
          sesiones: datosRutina.sesiones,
          catalogo: datosRutina.catalogo,
        })
      : { estado: "ninguno" as const };

  const borradorRestaurable =
    resultadoBorrador.estado === "restaurable" ? resultadoBorrador : null;

  const sesionSugerida =
    datosRutina && datosRutina.siguiente
      ? datosRutina.sesiones.find((s) => s.sesion === datosRutina.siguiente)
      : undefined;

  const gruposSugeridos =
    datosRutina && sesionSugerida
      ? gruposDeSesion(sesionSugerida.ejercicios, datosRutina.catalogo)
      : [];
  const textoGruposSugeridos = formatearListaGrupos(gruposSugeridos);
  const minutosSugeridos = sesionSugerida
    ? duracionEstimada(sesionSugerida.ejercicios)
    : 0;

  const sesionBorrador =
    datosRutina && borradorRestaurable
      ? datosRutina.sesiones.find((s) => s.sesion === borradorRestaurable.sesion)
      : undefined;
  const gruposBorrador =
    datosRutina && sesionBorrador
      ? gruposDeSesion(sesionBorrador.ejercicios, datosRutina.catalogo)
      : [];
  const textoGruposBorrador = formatearListaGrupos(gruposBorrador);

  const estadoContinuarBorrador: NavegacionMiRutinaState | undefined =
    borradorRestaurable
      ? { accionEntrenamiento: "continuar", sesion: borradorRestaurable.sesion }
      : undefined;

  const estadoIniciarSesion: NavegacionMiRutinaState | undefined =
    datosRutina?.siguiente
      ? { accionEntrenamiento: "iniciar", sesion: datosRutina.siguiente }
      : undefined;

  const estadoVerHistorial: NavegacionMiRutinaState = {
    seccion: "historial",
  };

  const descripcionPlan = rutina ? limpiarDescripcionRutina(rutina) : "";

  return (
    <div className="cli-dashboard d-flex flex-column gap-3">
      {/* 1. BIENVENIDA PERSONALIZADA */}
      <header className="card-g cli-dash-bienvenida" aria-labelledby="cli-dash-titulo">
        <div className="cli-dash-bienvenida-fila">
          <div>
            <p className="cli-dash-eyebrow mb-1">
              <i className="bi bi-compass me-1" aria-hidden="true" />
              Resumen de tu cuenta
            </p>
            <h1 className="card-title cli-dash-saludo mb-1" id="cli-dash-titulo">
              {saludo}
            </h1>
            <p className="card-sub mb-0">
              {tieneNombre
                ? "Aquí tienes tu siguiente sesión sugerida, el avance de tu plan y el estado de tus servicios."
                : "Consulta tu siguiente sesión sugerida, el avance de tu plan y el estado de tus servicios en un solo lugar."}
            </p>
          </div>

          {rutina && estadoRutina && (
            <div className="cli-dash-plan-pill">
              <span className="cli-dash-plan-objetivo">
                Objetivo: <strong>{textoObjetivoPlan(rutina.objetivo)}</strong>
              </span>
              <BadgeEstadoRutina estado={estadoRutina} detalle={detalleVigenciaRutina} />
            </div>
          )}
        </div>
      </header>

      {/* 2. TU SIGUIENTE ENTRENAMIENTO (TARJETA PRINCIPAL) */}
      <section
        className="card-g cli-proximo cli-dash-entrenamiento"
        aria-labelledby="cli-dash-entrenamiento-titulo"
      >
        <div className="card-head cli-dash-entrenamiento-head mb-2">
          <div>
            <h2 className="card-title mb-0" id="cli-dash-entrenamiento-titulo">
              Tu siguiente entrenamiento
            </h2>
            {rutina && (
              <p className="card-sub mb-0">
                Objetivo de tu plan: {textoObjetivoPlan(rutina.objetivo)}
                {datosRutina?.instructor
                  ? ` · Instructor: ${datosRutina.instructor.nombre} ${datosRutina.instructor.apellidos}`
                  : ""}
              </p>
            )}
          </div>
          {rutina && (
            <Link to={ruta("/mi-rutina")} className="btn-dark cli-ent-boton cli-dash-link-secundario">
              <i className="bi bi-journal-text me-2" aria-hidden="true" />
              Ir a Mi rutina
            </Link>
          )}
        </div>

        {errorRutina ? (
          <div className="cli-ent-error">
            <p role="alert" className="mb-2">
              {errorRutina}
            </p>
            <div className="cli-proximo-acciones">
              <button type="button" className="btn-dark cli-ent-boton" onClick={recargar}>
                Reintentar
              </button>
              <Link to={ruta("/mi-rutina")} className="btn-dark cli-ent-boton">
                Ir a Mi rutina
              </Link>
            </div>
          </div>
        ) : !datosRutina || !rutina ? (
          <div className="cli-proximo-cuerpo">
            <div className="cli-proximo-mensaje">
              <p className="cli-proximo-propuesta mb-1">
                Aún no tienes un plan de entrenamiento asignado.
              </p>
              <p className="cli-ent-secundario">
                Acércate a un instructor en el gimnasio para que diseñe una rutina acorde a tus objetivos.
              </p>
            </div>
            <div className="cli-proximo-acciones">
              <Link to={ruta("/mi-rutina")} className="btn-dark cli-ent-boton">
                Consultar Mi rutina
              </Link>
            </div>
          </div>
        ) : !rutinaVigente ? (
          <div className="cli-proximo-cuerpo">
            <div className="cli-proximo-mensaje">
              <p className="cli-proximo-propuesta mb-1">
                {estadoRutina === "FINALIZADA"
                  ? "Tu último plan de entrenamiento fue finalizado."
                  : "Tu último plan de entrenamiento está vencido."}
              </p>
              <p className="cli-ent-secundario">
                Puedes revisar tus sesiones e historial en «Mi rutina» o solicitar a tu instructor una nueva asignación.
              </p>
            </div>
            <div className="cli-proximo-acciones">
              <Link to={ruta("/mi-rutina")} className="btn-neon cli-ent-boton">
                Revisar mi plan anterior
              </Link>
            </div>
          </div>
        ) : borradorRestaurable ? (
          <div className="cli-proximo-cuerpo">
            <div className="cli-proximo-mensaje">
              <span className="cli-dash-etiqueta-destacada">
                <i className="bi bi-clock-history me-1" aria-hidden="true" />
                Entrenamiento en curso guardado
              </span>
              <p className="cli-proximo-propuesta mt-1">
                Tienes un borrador pendiente de la{" "}
                <strong>sesión {borradorRestaurable.sesion}</strong>
                {textoGruposBorrador ? ` (${textoGruposBorrador})` : ""}.
              </p>
              <p className="cli-borrador-resumen">
                {borradorRestaurable.resumen.ejerciciosCompletados} de{" "}
                {borradorRestaurable.resumen.totalEjercicios}{" "}
                {borradorRestaurable.resumen.totalEjercicios === 1
                  ? "ejercicio completado"
                  : "ejercicios completados"}
                {" · "}
                {borradorRestaurable.resumen.seriesCompletadas} de{" "}
                {borradorRestaurable.resumen.totalSeries}{" "}
                {borradorRestaurable.resumen.totalSeries === 1
                  ? "serie realizada"
                  : "series realizadas"}
              </p>
              <p className="cli-ent-secundario">
                Última actualización: {formatearTiempoRelativo(borradorRestaurable.updatedAt)}
              </p>
            </div>
            <div className="cli-proximo-acciones">
              <Link
                to={ruta("/mi-rutina")}
                state={estadoContinuarBorrador}
                className="btn-neon cli-ent-boton"
              >
                <i className="bi bi-play-fill me-2" aria-hidden="true" />
                Continuar entrenamiento
              </Link>
              <Link to={ruta("/mi-rutina")} className="btn-dark cli-ent-boton">
                Ver ejercicios de la sesión
              </Link>
            </div>
          </div>
        ) : datosRutina.siguiente && sesionSugerida && sesionSugerida.ejercicios.length > 0 ? (
          <div className="cli-proximo-cuerpo">
            <div className="cli-proximo-mensaje">
              <p className="cli-proximo-propuesta">
                {textoGruposSugeridos
                  ? `Te sugerimos trabajar ${textoGruposSugeridos} con tu `
                  : "Te sugerimos continuar con tu "}
                <strong>sesión {datosRutina.siguiente}</strong>.
              </p>
              <div className="cli-dash-chips" aria-label="Resumen de la sesión sugerida">
                <span className="cli-dash-chip">
                  <i className="bi bi-list-check" aria-hidden="true" />
                  {sesionSugerida.ejercicios.length}{" "}
                  {sesionSugerida.ejercicios.length === 1 ? "ejercicio" : "ejercicios"}
                </span>
                {minutosSugeridos > 0 && (
                  <span className="cli-dash-chip">
                    <i className="bi bi-stopwatch" aria-hidden="true" />~{minutosSugeridos} min estimados
                  </span>
                )}
                {gruposSugeridos.length > 0 && (
                  <span className="cli-dash-chip">
                    <i className="bi bi-lightning-charge" aria-hidden="true" />
                    {gruposSugeridos.join(", ")}
                  </span>
                )}
              </div>
              {descripcionPlan && (
                <p className="cli-ent-secundario mt-1">{descripcionPlan}</p>
              )}
              <p className="cli-ent-secundario mt-1">
                Sugerencia basada en el orden de tu plan; puedes elegir otra sesión en «Mi rutina».
              </p>
            </div>
            <div className="cli-proximo-acciones">
              <Link
                to={ruta("/mi-rutina")}
                state={estadoIniciarSesion}
                className="btn-neon cli-ent-boton"
              >
                <i className="bi bi-play-fill me-2" aria-hidden="true" />
                Iniciar sesión {datosRutina.siguiente}
              </Link>
              <Link to={ruta("/mi-rutina")} className="btn-dark cli-ent-boton">
                Ver detalles en Mi rutina
              </Link>
            </div>
          </div>
        ) : datosRutina.siguiente && (!sesionSugerida || sesionSugerida.ejercicios.length === 0) ? (
          <div className="cli-proximo-cuerpo">
            <div className="cli-proximo-mensaje">
              <p className="cli-proximo-propuesta mb-1">
                La <strong>sesión {datosRutina.siguiente}</strong> aún no tiene ejercicios asignados.
              </p>
              <p className="cli-ent-secundario">
                Puedes revisar las demás sesiones en «Mi rutina» o consultar con tu instructor.
              </p>
            </div>
            <div className="cli-proximo-acciones">
              <Link to={ruta("/mi-rutina")} className="btn-dark cli-ent-boton">
                Revisar sesiones en Mi rutina
              </Link>
            </div>
          </div>
        ) : (
          <div className="cli-proximo-cuerpo">
            <div className="cli-proximo-mensaje">
              <p className="cli-ent-secundario">
                No pudimos determinar una sesión sugerida automáticamente. Puedes elegir qué sesión entrenar desde «Mi rutina».
              </p>
            </div>
            <div className="cli-proximo-acciones">
              <Link to={ruta("/mi-rutina")} className="btn-dark cli-ent-boton">
                Ir a Mi rutina
              </Link>
            </div>
          </div>
        )}
      </section>

      {/* FILA 1: MI PROGRESO + ÚLTIMA ACTIVIDAD */}
      <div className="cli-dash-grid">
        {/* 3. MI PROGRESO */}
        <section
          className="card-g cli-dash-card"
          aria-labelledby="cli-dash-progreso-titulo"
        >
          <div className="card-head cli-dash-card-head">
            <div>
              <h2 className="card-title mb-0" id="cli-dash-progreso-titulo">
                Mi progreso
              </h2>
              <p className="card-sub mb-0">Cumplimiento de tu plan actual</p>
            </div>
            <Link to={ruta("/mi-progreso")} className="cli-dash-card-link">
              Ver Mi progreso <i className="bi bi-arrow-right" aria-hidden="true" />
            </Link>
          </div>

          <div className="cli-dash-card-body">
            {!datosRutina || !rutina ? (
              <p className="cli-ent-secundario mb-0">
                Cuando tengas una rutina asignada, verás aquí tu porcentaje de cumplimiento, entrenamientos registrados y meta del plan.
              </p>
            ) : datosRutina.errorAvance || !datosRutina.avance ? (
              <div className="cli-ent-error">
                <p role="alert" className="mb-2">
                  No pudimos calcular el avance de tu plan en este momento.
                </p>
                <button type="button" className="btn-dark cli-ent-boton" onClick={recargar}>
                  Reintentar
                </button>
              </div>
            ) : (
              <AvanceCliente
                avance={datosRutina.avance}
                ideal={
                  rutinaVigente && (rutina.sesiones_planeadas ?? 0) > 0
                    ? idealAHoy(rutina)
                    : null
                }
              />
            )}
          </div>

          <div className="cli-dash-card-footer">
            <Link to={ruta("/mi-progreso")} className="btn-dark cli-ent-boton">
              <i className="bi bi-graph-up-arrow me-2" aria-hidden="true" />
              Ir a Mi progreso
            </Link>
          </div>
        </section>

        {/* 6. ÚLTIMA ACTIVIDAD */}
        <section
          className="card-g cli-dash-card"
          aria-labelledby="cli-dash-actividad-titulo"
        >
          <div className="card-head cli-dash-card-head">
            <div>
              <h2 className="card-title mb-0" id="cli-dash-actividad-titulo">
                Última actividad
              </h2>
              <p className="card-sub mb-0">Último entrenamiento registrado</p>
            </div>
            <Link
              to={ruta("/mi-rutina")}
              state={estadoVerHistorial}
              className="cli-dash-card-link"
            >
              Ver historial <i className="bi bi-arrow-right" aria-hidden="true" />
            </Link>
          </div>

          <div className="cli-dash-card-body">
            {!datosRutina || !rutina ? (
              <p className="cli-ent-secundario mb-0">
                Aún no tienes entrenamientos registrados. Tus sesiones finalizadas aparecerán aquí.
              </p>
            ) : datosRutina.errorActividad ? (
              <div className="cli-ent-error">
                <p role="alert" className="mb-2">
                  No pudimos consultar tu última actividad.
                </p>
                <button type="button" className="btn-dark cli-ent-boton" onClick={recargar}>
                  Reintentar
                </button>
              </div>
            ) : !datosRutina.ultimaActividad ? (
              <p className="cli-ent-secundario mb-0">
                Todavía no has registrado entrenamientos en este plan. Cuando completes tu primera sesión, verás su resumen aquí.
              </p>
            ) : (
              <div className="cli-dash-actividad">
                <div className="cli-dash-actividad-top">
                  <span className="cli-hist-sesion">
                    Sesión <strong>{datosRutina.ultimaActividad.registro.sesion}</strong>
                  </span>
                  <span className="cli-dash-actividad-fecha">
                    <i className="bi bi-calendar3 me-1" aria-hidden="true" />
                    <time dateTime={datosRutina.ultimaActividad.registro.fecha}>
                      {datosRutina.ultimaActividad.esHoy
                        ? `Hoy (${utils.fecha(datosRutina.ultimaActividad.registro.fecha)})`
                        : utils.fecha(datosRutina.ultimaActividad.registro.fecha)}
                    </time>
                  </span>
                </div>

                <dl className="cli-dash-dl">
                  <div className="cli-dash-dl-item">
                    <dt>Ejercicios</dt>
                    <dd>
                      {datosRutina.ultimaActividad.cantidadEjercicios > 0
                        ? `${datosRutina.ultimaActividad.cantidadEjercicios} ${
                            datosRutina.ultimaActividad.cantidadEjercicios === 1
                              ? "ejercicio registrado"
                              : "ejercicios registrados"
                          }`
                        : "Sin desglose de ejercicios"}
                    </dd>
                  </div>
                  {datosRutina.ultimaActividad.totalSeries > 0 && (
                    <div className="cli-dash-dl-item">
                      <dt>Series completadas</dt>
                      <dd>
                        {datosRutina.ultimaActividad.totalSeries}{" "}
                        {datosRutina.ultimaActividad.totalSeries === 1 ? "serie" : "series"}
                      </dd>
                    </div>
                  )}
                </dl>

                {datosRutina.ultimaActividad.resumenEjerciciosTexto && (
                  <p className="cli-dash-actividad-ejercicios mb-0">
                    {datosRutina.ultimaActividad.resumenEjerciciosTexto}
                  </p>
                )}

                {datosRutina.ultimaActividad.registro.notas &&
                  datosRutina.ultimaActividad.registro.notas.trim() !== "" && (
                    <p className="cli-dash-actividad-nota mb-0">
                      <i className="bi bi-chat-left-text me-1" aria-hidden="true" />
                      {datosRutina.ultimaActividad.registro.notas}
                    </p>
                  )}
              </div>
            )}
          </div>

          <div className="cli-dash-card-footer">
            <Link
              to={ruta("/mi-rutina")}
              state={estadoVerHistorial}
              className="btn-dark cli-ent-boton"
            >
              <i className="bi bi-clock-history me-2" aria-hidden="true" />
              Ver historial en Mi rutina
            </Link>
          </div>
        </section>

        {/* 4. MI MEMBRESÍA */}
        <section
          className="card-g cli-dash-card"
          aria-labelledby="cli-dash-membresia-titulo"
        >
          <div className="card-head cli-dash-card-head">
            <div>
              <h2 className="card-title mb-0" id="cli-dash-membresia-titulo">
                Mi membresía
              </h2>
              <p className="card-sub mb-0">Estado y vigencia de tu afiliación</p>
            </div>
            <Link to={ruta("/mi-membresia")} className="cli-dash-card-link">
              Ver Mi membresía <i className="bi bi-arrow-right" aria-hidden="true" />
            </Link>
          </div>

          <div className="cli-dash-card-body">
            {errorMembresia ? (
              <p className="cli-ent-secundario mb-0">
                No pudimos verificar el estado de tu membresía en este momento. Puedes acceder al módulo para más información.
              </p>
            ) : !membresiaResumen ? (
              <p className="cli-ent-secundario mb-0">
                No encontramos una membresía registrada en tu cuenta. Consulta en recepción o accede a «Mi membresía».
              </p>
            ) : (
              <div className="cli-dash-resumen-bloque">
                <div className="cli-dash-resumen-top">
                  <span className="cli-dash-resumen-principal">
                    {membresiaResumen.modalidadTexto}
                  </span>
                  <span
                    className={`badge-g ${
                      membresiaResumen.estadoEfectivo === "VIGENTE"
                        ? "badge-activo"
                        : membresiaResumen.estadoEfectivo === "POR_VENCER"
                          ? "badge-pendiente"
                          : "badge-vencido"
                    }`}
                  >
                    {membresiaResumen.etiquetaEstado}
                  </span>
                </div>

                <dl className="cli-dash-dl">
                  <div className="cli-dash-dl-item">
                    <dt>Vigencia</dt>
                    <dd>{membresiaResumen.textoVigencia}</dd>
                  </div>
                  <div className="cli-dash-dl-item">
                    <dt>Fecha de vencimiento</dt>
                    <dd>
                      <time dateTime={membresiaResumen.membresia.fecha_vencimiento}>
                        {utils.fecha(membresiaResumen.membresia.fecha_vencimiento)}
                      </time>
                    </dd>
                  </div>
                </dl>
              </div>
            )}
          </div>

          <div className="cli-dash-card-footer">
            <Link to={ruta("/mi-membresia")} className="btn-dark cli-ent-boton">
              <i className="bi bi-credit-card me-2" aria-hidden="true" />
              Ir a Mi membresía
            </Link>
          </div>
        </section>

        {/* 5. MIS CITAS */}
        <section
          className="card-g cli-dash-card"
          aria-labelledby="cli-dash-citas-titulo"
        >
          <div className="card-head cli-dash-card-head">
            <div>
              <h2 className="card-title mb-0" id="cli-dash-citas-titulo">
                Mis citas
              </h2>
              <p className="card-sub mb-0">Próxima atención programada</p>
            </div>
            <Link to={ruta("/mis-citas")} className="cli-dash-card-link">
              Ver Mis citas <i className="bi bi-arrow-right" aria-hidden="true" />
            </Link>
          </div>

          <div className="cli-dash-card-body">
            {errorCitas ? (
              <p className="cli-ent-secundario mb-0">
                No pudimos consultar tus citas en este momento. Puedes revisar el módulo de citas directamente.
              </p>
            ) : !proximaCita ? (
              <p className="cli-ent-secundario mb-0">
                No tienes próximas citas programadas. Puedes gestionar o consultar tus reservas en «Mis citas».
              </p>
            ) : (
              <div className="cli-dash-resumen-bloque">
                <div className="cli-dash-resumen-top">
                  <span className="cli-dash-resumen-principal">
                    {proximaCita.tipoTexto}
                  </span>
                  <span
                    className={`badge-g ${
                      proximaCita.cita.estado === "CONFIRMADA"
                        ? "badge-activo"
                        : "badge-pendiente"
                    }`}
                  >
                    {proximaCita.estadoTexto}
                  </span>
                </div>

                <dl className="cli-dash-dl">
                  <div className="cli-dash-dl-item">
                    <dt>Fecha y hora</dt>
                    <dd>
                      {proximaCita.esHoy
                        ? `Hoy (${utils.fecha(proximaCita.cita.fecha)})`
                        : utils.fecha(proximaCita.cita.fecha)}{" "}
                      · {proximaCita.cita.hora}
                    </dd>
                  </div>
                  <div className="cli-dash-dl-item">
                    <dt>Profesional</dt>
                    <dd>{proximaCita.nombreInstructor}</dd>
                  </div>
                </dl>
              </div>
            )}
          </div>

          <div className="cli-dash-card-footer">
            <Link to={ruta("/mis-citas")} className="btn-dark cli-ent-boton">
              <i className="bi bi-calendar-event me-2" aria-hidden="true" />
              Ir a Mis citas
            </Link>
          </div>
        </section>
      </div>
    </div>
  );
}
