import { useEffect, useReducer, useState } from "react";
import { Link } from "react-router-dom";
import {
  CategoryScale,
  Chart as ChartJS,
  Legend,
  LinearScale,
  LineElement,
  PointElement,
  Tooltip,
} from "chart.js";
import type { ChartData, ChartOptions } from "chart.js";
import { Line } from "react-chartjs-2";
import { Paginador } from "../components/Paginador";
import { AvanceCliente } from "../components/cliente/AvanceCliente";
import {
  calcularResumenFisico,
  determinarMetricasDisponibles,
  obtenerPuntosGrafico,
  ordenarMedicionesReciente,
} from "../components/cliente/miProgreso";
import type { MetricaProgreso } from "../components/cliente/miProgreso";
import { api } from "../data/api";
import { current } from "../lib/auth";
import { idealAHoy } from "../lib/rutinas";
import { utils } from "../lib/utils";
import { useTenantOpcional } from "../tenant/TenantContext";
import type { AvanceRutina, Progreso as ProgresoRow, Rutina } from "../types";

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, Tooltip, Legend);

const POR_PAGINA_MEDICIONES = 6;

type DatosProgresoCliente = {
  mediciones: ProgresoRow[];
  rutina: Rutina | null;
  avanceRutina: AvanceRutina | null;
  esVigenteRutina: boolean;
};

type EstadoCarga =
  | { estado: "cargando" }
  | { estado: "sin-sesion"; mensaje: string }
  | { estado: "error"; mensaje: string }
  | {
      estado: "listo";
      idCliente: string;
      gimnasioId: string;
      datos: DatosProgresoCliente;
    };

export function MiProgreso() {
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
    <ContenidoMiProgreso
      key={JSON.stringify([gimnasioId, cedula, sesion?.tipo_usuario])}
      cedula={cedula}
      gimnasioId={gimnasioId}
      esCliente={sesion?.tipo_usuario === "CLIENTE"}
    />
  );
}

function ContenidoMiProgreso({
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

  const [consulta, setConsulta] = useState<EstadoCarga>({ estado: "cargando" });
  const [recarga, forzarRecarga] = useReducer((n: number) => n + 1, 0);

  const [metricaGrafico, setMetricaGrafico] = useState<MetricaProgreso>("PESO");
  const [paginaMediciones, setPaginaMediciones] = useState(1);

  const [reducirMovimiento, setReducirMovimiento] = useState(() =>
    typeof window !== "undefined" && typeof window.matchMedia === "function"
      ? window.matchMedia("(prefers-reduced-motion: reduce)").matches
      : false,
  );

  useEffect(() => {
    if (typeof window === "undefined" || typeof window.matchMedia !== "function") return;
    const media = window.matchMedia("(prefers-reduced-motion: reduce)");
    const listener = (e: MediaQueryListEvent) => setReducirMovimiento(e.matches);
    media.addEventListener("change", listener);
    return () => media.removeEventListener("change", listener);
  }, []);

  useEffect(() => {
    let cancelado = false;

    async function cargar() {
      if (!cedula || !gimnasioId || !esCliente) {
        setConsulta({
          estado: "sin-sesion",
          mensaje:
            "No hay una sesión activa de cliente. Vuelve a iniciar sesión para consultar tu progreso.",
        });
        return;
      }

      setConsulta({ estado: "cargando" });

      try {
        const [mediciones, rutinaVigente, rutinasCliente] = await Promise.all([
          api.progreso.byCliente(cedula),
          api.rutinas.vigenteDeCliente(cedula).catch(() => null),
          api.rutinas.deCliente(cedula).catch(() => [] as Rutina[]),
        ]);

        if (cancelado) return;

        const rutina = rutinaVigente ?? rutinasCliente[0] ?? null;
        let avanceRutina: AvanceRutina | null = null;
        let esVigenteRutina = false;

        if (rutina && rutina.gimnasio_id === gimnasioId && rutina.id_cliente === cedula) {
          const estadoRutina = api.rutinas.estado(rutina);
          esVigenteRutina = estadoRutina === "VIGENTE" || estadoRutina === "POR_VENCER";
          try {
            avanceRutina = await api.rutinas.avance(rutina.id_rutina);
          } catch {
            avanceRutina = null;
          }
        }

        const medicionesFiltradas = mediciones.filter(
          (m) => m && m.id_cliente === cedula && m.gimnasio_id === gimnasioId,
        );

        setConsulta({
          estado: "listo",
          idCliente: cedula,
          gimnasioId,
          datos: {
            mediciones: medicionesFiltradas,
            rutina,
            avanceRutina,
            esVigenteRutina,
          },
        });
      } catch (err: unknown) {
        if (cancelado) return;
        setConsulta({
          estado: "error",
          mensaje:
            err instanceof Error
              ? err.message
              : "No pudimos cargar la información de tu progreso. Intenta de nuevo más tarde.",
        });
      }
    }

    void cargar();
    return () => {
      cancelado = true;
    };
  }, [cedula, gimnasioId, esCliente, recarga]);

  if (consulta.estado === "sin-sesion") {
    return (
      <section className="card-g cli-dashboard" aria-labelledby="cli-progreso-titulo">
        <div className="card-head">
          <h1 className="card-title mb-0" id="cli-progreso-titulo">
            Mi progreso
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
      <section className="card-g cli-dashboard" aria-labelledby="cli-progreso-titulo">
        <div className="card-head">
          <h1 className="card-title mb-0" id="cli-progreso-titulo">
            Mi progreso
          </h1>
        </div>
        <div className="loader" role="status">
          <span className="spinner-g" aria-hidden="true" />
          Cargando tus mediciones y avance…
        </div>
      </section>
    );
  }

  if (consulta.estado === "error") {
    return (
      <section className="card-g cli-dashboard" aria-labelledby="cli-progreso-titulo">
        <div className="card-head">
          <h1 className="card-title mb-0" id="cli-progreso-titulo">
            Mi progreso
          </h1>
        </div>
        <div className="cli-ent-error">
          <p role="alert" className="mb-2">
            {consulta.mensaje}
          </p>
          <button type="button" className="btn-dark cli-ent-boton" onClick={forzarRecarga}>
            Reintentar carga
          </button>
        </div>
      </section>
    );
  }

  const { mediciones, rutina, avanceRutina, esVigenteRutina } = consulta.datos;
  const resumenFisico = calcularResumenFisico(mediciones);
  const metricasDisponibles = determinarMetricasDisponibles(mediciones);
  const metricaActiva: MetricaProgreso = metricasDisponibles.includes(metricaGrafico)
    ? metricaGrafico
    : metricasDisponibles[0] ?? "PESO";

  const puntosGrafico = obtenerPuntosGrafico(mediciones, metricaActiva);
  const suficientesParaGrafico = puntosGrafico.length >= 2;

  const medicionesOrdenadas = ordenarMedicionesReciente(mediciones);
  const totalPaginasMediciones = Math.max(
    1,
    Math.ceil(medicionesOrdenadas.length / POR_PAGINA_MEDICIONES),
  );
  const paginaSeguraMediciones = Math.min(paginaMediciones, totalPaginasMediciones);
  const medicionesPaginadas = medicionesOrdenadas.slice(
    (paginaSeguraMediciones - 1) * POR_PAGINA_MEDICIONES,
    paginaSeguraMediciones * POR_PAGINA_MEDICIONES,
  );

  const etiquetaUnidad = metricaActiva === "PESO" ? "kg" : "%";
  const tituloMetrica =
    metricaActiva === "PESO" ? "Peso corporal" : "Porcentaje de grasa corporal";

  const primerPunto = puntosGrafico[0];
  const ultimoPunto = puntosGrafico[puntosGrafico.length - 1];

  const chartData: ChartData<"line"> = {
    labels: puntosGrafico.map((p) => p.etiquetaFecha),
    datasets: [
      {
        label: `${tituloMetrica} (${etiquetaUnidad})`,
        data: puntosGrafico.map((p) => p.valor),
        spanGaps: false,
        borderColor: metricaActiva === "PESO" ? "#c6ff00" : "#ff8a3d",
        backgroundColor:
          metricaActiva === "PESO" ? "rgba(198, 255, 0, 0.2)" : "rgba(255, 138, 61, 0.2)",
        pointBackgroundColor: metricaActiva === "PESO" ? "#c6ff00" : "#ff8a3d",
        pointBorderColor: "#0b0d10",
        pointBorderWidth: 2,
        pointRadius: 5,
        pointHoverRadius: 7,
        tension: 0.2,
      },
    ],
  };

  const chartOpts: ChartOptions<"line"> = {
    responsive: true,
    maintainAspectRatio: false,
    animation: reducirMovimiento ? false : undefined,
    plugins: {
      legend: { display: false },
      tooltip: {
        callbacks: {
          label(ctx) {
            const p = puntosGrafico[ctx.dataIndex];
            return p ? p.etiquetaValor : `${ctx.formattedValue} ${etiquetaUnidad}`;
          },
        },
      },
    },
    scales: {
      x: {
        ticks: { color: "#d5d9de", maxRotation: 0, autoSkip: true },
        grid: { color: "rgba(255, 255, 255, 0.06)" },
      },
      y: {
        beginAtZero: false,
        ticks: {
          color: "#d5d9de",
          callback(value) {
            return `${value} ${etiquetaUnidad}`;
          },
        },
        grid: { color: "rgba(255, 255, 255, 0.06)" },
      },
    },
  };

  return (
    <div className="cli-dashboard d-flex flex-column gap-3">
      {/* 1. ENCABEZADO */}
      <header className="card-g cli-dash-bienvenida" aria-labelledby="cli-progreso-titulo">
        <div className="cli-dash-bienvenida-fila">
          <div>
            <p className="cli-dash-eyebrow mb-1">
              <i className="bi bi-activity me-1" aria-hidden="true" />
              Seguimiento personalizado
            </p>
            <h1 className="card-title cli-dash-saludo mb-1" id="cli-progreso-titulo">
              Mi progreso
            </h1>
            <p className="card-sub mb-0">
              Consulta tus mediciones físicas y el cumplimiento de tu plan de entrenamiento.
            </p>
          </div>

          <div className="d-flex align-items-center gap-2 flex-wrap">
            <Link to={ruta("/mi-dashboard")} className="btn-dark cli-ent-boton">
              <i className="bi bi-arrow-left me-1" aria-hidden="true" />
              Volver al inicio
            </Link>
          </div>
        </div>
      </header>

      {/* 2. RESUMEN FÍSICO */}
      <section className="card-g" aria-labelledby="cli-resumen-fisico-titulo">
        <div className="card-head mb-2">
          <div>
            <h2 className="card-title mb-0" id="cli-resumen-fisico-titulo">
              Resumen físico
            </h2>
            <p className="card-sub mb-0">Últimos valores registrados en tu ficha de control</p>
          </div>
        </div>

        {!resumenFisico ? (
          <p className="empty-state mb-0">
            Aún no tienes mediciones físicas registradas en este gimnasio. Acércate a tu instructor para realizar tu primera valoración.
          </p>
        ) : (
          <dl className="cli-evolucion-hitos">
            <div className="cli-evolucion-hito cli-evolucion-hito--destacado">
              <dt>Último peso registrado</dt>
              <dd>
                <strong>{resumenFisico.ultimoPesoKg.toFixed(1)} kg</strong>
                <span className="cli-evolucion-hito-sub">
                  Control del {utils.fecha(resumenFisico.fechaUltimaMedicion)}
                </span>
              </dd>
            </div>

            <div className="cli-evolucion-hito">
              <dt>Variación de peso</dt>
              <dd>
                <strong>{resumenFisico.etiquetaDiferenciaPeso ?? "—"}</strong>
                <span className="cli-evolucion-hito-sub">
                  {resumenFisico.diferenciaPesoKg !== null
                    ? `Desde la 1.ª medición (${utils.fecha(resumenFisico.primeraMedicion.fecha)})`
                    : "Requiere 2 o más mediciones"}
                </span>
              </dd>
            </div>

            <div className="cli-evolucion-hito">
              <dt>Grasa corporal</dt>
              <dd>
                <strong>
                  {resumenFisico.ultimaGrasaPorcentaje !== null
                    ? `${resumenFisico.ultimaGrasaPorcentaje.toFixed(1)} %`
                    : "No registrada"}
                </strong>
                <span className="cli-evolucion-hito-sub">
                  {resumenFisico.ultimaGrasaPorcentaje !== null
                    ? "Porcentaje de grasa"
                    : "Sin dato en el último control"}
                </span>
              </dd>
            </div>

            <div className="cli-evolucion-hito">
              <dt>Masa muscular</dt>
              <dd>
                <strong>
                  {resumenFisico.ultimaMasaMuscular !== null
                    ? `${resumenFisico.ultimaMasaMuscular.toFixed(1)}`
                    : "No registrada"}
                </strong>
                <span className="cli-evolucion-hito-sub">
                  {resumenFisico.ultimaMasaMuscular !== null
                    ? "Valor registrado (unidad no especificada)"
                    : "Sin dato en el último control"}
                </span>
              </dd>
            </div>
          </dl>
        )}
      </section>

      {/* 3. EVOLUCIÓN FÍSICA (GRÁFICA) */}
      <section className="card-g cli-evolucion-grafico-card" aria-labelledby="cli-evolucion-fisica-titulo">
        <div className="cli-evolucion-grafico-cab mb-2">
          <div>
            <h2 className="card-title mb-0" id="cli-evolucion-fisica-titulo">
              Evolución física
            </h2>
            <p className="card-sub mb-0">Trayectoria de tus mediciones a lo largo del tiempo</p>
          </div>

          {metricasDisponibles.length > 1 && (
            <div className="d-flex align-items-center gap-2">
              <label className="form-label-g mb-0" htmlFor="cli-selector-metrica-progreso">
                Métrica:
              </label>
              <select
                id="cli-selector-metrica-progreso"
                className="form-control-dark"
                value={metricaActiva}
                onChange={(e) => setMetricaGrafico(e.target.value as MetricaProgreso)}
              >
                <option value="PESO">Peso corporal (kg)</option>
                <option value="GRASA">Grasa corporal (%)</option>
              </select>
            </div>
          )}
        </div>

        {puntosGrafico.length === 0 ? (
          <p className="empty-state mb-0">
            No hay mediciones registradas con datos de {tituloMetrica.toLowerCase()}.
          </p>
        ) : !suficientesParaGrafico ? (
          <div className="cli-evolucion-unico-card" role="status">
            <p className="cli-evolucion-unico-etiqueta mb-1">
              <i className="bi bi-info-circle me-1" aria-hidden="true" />
              Medición única registrada
            </p>
            <p className="mb-0">
              Cuentas con <strong>1 registro</strong> de {tituloMetrica.toLowerCase()} ({primerPunto.etiquetaValor} el {utils.fecha(primerPunto.fecha)}).
              Se requieren al menos 2 mediciones en fechas distintas para trazar la curva de evolución.
            </p>
          </div>
        ) : (
          <>
            <div
              className="cli-evolucion-lienzo"
              role="region"
              aria-label={`Gráfica de evolución de ${tituloMetrica.toLowerCase()}`}
            >
              <Line data={chartData} options={chartOpts} />
            </div>

            <p className="cli-ent-secundario mt-2 mb-0">
              Valores ordenados cronológicamente desde el {utils.fecha(primerPunto.fecha)} ({primerPunto.etiquetaValor}) hasta el {utils.fecha(ultimoPunto.fecha)} ({ultimoPunto.etiquetaValor}).
            </p>
          </>
        )}
      </section>

      {/* 4. CUMPLIMIENTO DEL ENTRENAMIENTO */}
      <section className="card-g cli-dash-card" aria-labelledby="cli-cumplimiento-titulo">
        <div className="card-head cli-dash-card-head mb-2">
          <div>
            <h2 className="card-title mb-0" id="cli-cumplimiento-titulo">
              Cumplimiento del entrenamiento
            </h2>
            <p className="card-sub mb-0">Avance de sesiones de tu plan de rutina actual</p>
          </div>

          <Link to={ruta("/mi-rutina")} className="btn-dark cli-ent-boton">
            <i className="bi bi-journal-text me-2" aria-hidden="true" />
            Ir a Mi rutina
          </Link>
        </div>

        <div className="cli-dash-card-body">
          {!rutina || !avanceRutina ? (
            <p className="empty-state mb-0">
              No tienes un plan de rutina asignado actualmente. Acércate a un instructor para que diseñe tu plan.
            </p>
          ) : (
            <AvanceCliente
              avance={avanceRutina}
              ideal={
                esVigenteRutina && (rutina.sesiones_planeadas ?? 0) > 0
                  ? idealAHoy(rutina)
                  : null
              }
            />
          )}
        </div>
      </section>

      {/* 5. HISTORIAL DE MEDICIONES */}
      <section className="card-g cli-dash-card" aria-labelledby="cli-historial-mediciones-titulo">
        <div className="card-head cli-dash-card-head mb-2">
          <div>
            <h2 className="card-title mb-0" id="cli-historial-mediciones-titulo">
              Historial de mediciones
            </h2>
            <p className="card-sub mb-0">
              {medicionesOrdenadas.length === 0
                ? "Registro histórico de tus valoraciones"
                : `${medicionesOrdenadas.length} ${
                    medicionesOrdenadas.length === 1
                      ? "medición registrada"
                      : "mediciones registradas"
                  } · ordenadas de la más reciente a la más antigua`}
            </p>
          </div>
        </div>

        <div className="cli-dash-card-body">
          {medicionesOrdenadas.length === 0 ? (
            <p className="empty-state mb-0">
              Aún no tienes mediciones registradas en el historial.
            </p>
          ) : (
            <>
              <div className="table-wrap">
                <table className="table-g cli-pagos-tabla">
                  <caption className="visually-hidden">Historial de mediciones del cliente</caption>
                  <thead>
                    <tr>
                      <th scope="col">Fecha</th>
                      <th scope="col">Peso</th>
                      <th scope="col">Altura</th>
                      <th scope="col">Grasa corporal</th>
                      <th scope="col">Masa muscular</th>
                      <th scope="col">Notas</th>
                    </tr>
                  </thead>
                  <tbody>
                    {medicionesPaginadas.map((m) => {
                      const alturaTexto =
                        typeof m.altura === "number" && Number.isFinite(m.altura)
                          ? m.altura < 3
                            ? `${(m.altura * 100).toFixed(0)} cm`
                            : `${m.altura} cm`
                          : "—";

                      return (
                        <tr key={m.id_progreso}>
                          <td>
                            <time dateTime={m.fecha}>{utils.fecha(m.fecha)}</time>
                          </td>
                          <td className="fw-bold font-title">
                            {typeof m.peso === "number" && Number.isFinite(m.peso)
                              ? `${m.peso.toFixed(1)} kg`
                              : "—"}
                          </td>
                          <td>{alturaTexto}</td>
                          <td>
                            {typeof m.porcentaje_grasa === "number" &&
                            Number.isFinite(m.porcentaje_grasa)
                              ? `${m.porcentaje_grasa.toFixed(1)} %`
                              : "—"}
                          </td>
                          <td>
                            {typeof m.masa_muscular === "number" &&
                            Number.isFinite(m.masa_muscular)
                              ? `${m.masa_muscular.toFixed(1)}`
                              : "—"}
                          </td>
                          <td className="small text-muted">{m.notas || "—"}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              <Paginador
                pagina={paginaSeguraMediciones}
                total={medicionesOrdenadas.length}
                porPagina={POR_PAGINA_MEDICIONES}
                onCambiar={(p) => setPaginaMediciones(p)}
              />
            </>
          )}
        </div>
      </section>
    </div>
  );
}
