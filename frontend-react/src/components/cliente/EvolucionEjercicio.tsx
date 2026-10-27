import { useEffect, useState } from "react";
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
import { utils } from "../../lib/utils";
import type { Ejercicio, RegistroEntrenamiento } from "../../types";
import { VistaPreviaRecurso } from "../ejercicios/VistaPreviaRecurso";
import {
  construirEvolucionEjercicio,
  extraerEjerciciosConHistorial,
} from "./historialEntrenamiento";

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, Tooltip, Legend);

type Props = {
  registros: RegistroEntrenamiento[];
  catalogo: Ejercicio[];
  ejercicioSeleccionadoId?: number | null;
  onSeleccionarEjercicio?: (idEjercicio: number) => void;
};

export function EvolucionEjercicio({
  registros,
  catalogo,
  ejercicioSeleccionadoId,
  onSeleccionarEjercicio,
}: Props) {
  const opciones = extraerEjerciciosConHistorial(registros, catalogo);
  const [idInterno, setIdInterno] = useState<number | null>(null);
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

  if (opciones.length === 0) {
    return (
      <div className="cli-evolucion-vacio" role="status">
        <i className="bi bi-graph-up-arrow" aria-hidden="true" />
        <div>
          <p className="mb-1">
            <strong>Aún no hay datos por ejercicio para comparar.</strong>
          </p>
          <p className="cli-ent-secundario mb-0">
            {registros.length === 0
              ? "Cuando completes y registres tu primer entrenamiento desde Mi rutina, aquí podrás consultar cómo evolucionan tus pesos, repeticiones o tiempos por ejercicio."
              : "Las sesiones anteriores se registraron sin desglose por ejercicio. Al finalizar tu próximo entrenamiento desde Mi rutina, aquí verás la evolución histórica de cada ejercicio."}
          </p>
        </div>
      </div>
    );
  }

  const idValidoExterno =
    ejercicioSeleccionadoId != null &&
    opciones.some((o) => o.info.id_ejercicio === ejercicioSeleccionadoId)
      ? ejercicioSeleccionadoId
      : null;
  const idValidoInterno =
    idInterno != null && opciones.some((o) => o.info.id_ejercicio === idInterno)
      ? idInterno
      : null;
  const idActivo = idValidoExterno ?? idValidoInterno ?? opciones[0].info.id_ejercicio;

  function cambiarEjercicio(nuevoId: number) {
    setIdInterno(nuevoId);
    onSeleccionarEjercicio?.(nuevoId);
  }

  const evolucion = construirEvolucionEjercicio(registros, idActivo, catalogo);
  const { info, puntosAsc, puntosGraficables, puntosDesc, primero, ultimo, maximo } = evolucion;

  const resumenAriaGrafico =
    evolucion.suficientesParaComparar && primero && ultimo && maximo
      ? `Gráfico de ${evolucion.tituloMetrica.toLowerCase()} para ${info.nombre}. Primer registro: ${primero.etiquetaValor} (${utils.fecha(primero.fecha)}). Último registro: ${ultimo.etiquetaValor} (${utils.fecha(ultimo.fecha)}). Máximo en esta rutina: ${maximo.etiquetaValor} (${utils.fecha(maximo.fecha)}).`
      : `Evolución de ${info.nombre}`;

  const chartData: ChartData<"line"> = {
    labels: puntosAsc.map((p) => `${utils.fecha(p.fecha)} (${p.sesion})`),
    datasets: [
      {
        label: `${info.nombre} (${evolucion.unidad})`,
        data: puntosAsc.map((p) => p.valorMetrica),
        spanGaps: false,
        borderColor: "#c6ff00",
        backgroundColor: "rgba(198, 255, 0, 0.2)",
        pointBackgroundColor: "#c6ff00",
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
      legend: {
        display: false,
      },
      tooltip: {
        callbacks: {
          label(ctx) {
            const p = puntosAsc[ctx.dataIndex];
            if (!p) return `${ctx.formattedValue} ${evolucion.unidad}`;
            return p.contextoSecundario
              ? `${p.etiquetaValor} · ${p.contextoSecundario}`
              : p.etiquetaValor;
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
            return `${value} ${evolucion.unidad}`;
          },
        },
        grid: { color: "rgba(255, 255, 255, 0.06)" },
      },
    },
  };

  return (
    <div className="cli-evolucion">
      <div className="cli-evolucion-controles">
        <div className="cli-evolucion-selector-wrap">
          <label className="form-label-g" htmlFor="cli-evolucion-ejercicio">
            Selecciona un ejercicio realizado ({opciones.length})
          </label>
          <select
            id="cli-evolucion-ejercicio"
            className="form-control-dark cli-evolucion-select"
            value={idActivo}
            onChange={(e) => cambiarEjercicio(Number(e.target.value))}
          >
            {opciones.map((op) => (
              <option key={op.info.id_ejercicio} value={op.info.id_ejercicio}>
                {op.info.nombre} · {op.apariciones}{" "}
                {op.apariciones === 1 ? "entrenamiento" : "entrenamientos"} (Sesión{" "}
                {op.sesiones.join("/")})
              </option>
            ))}
          </select>
        </div>

        <div className="cli-evolucion-ficha">
          {info.ejercicio ? (
            <VistaPreviaRecurso
              key={info.ejercicio.recurso_url}
              url={info.ejercicio.recurso_url}
              tamano="mini"
              alt={info.ejercicio.nombre}
              grupo={info.ejercicio.grupo_muscular}
            />
          ) : (
            <span className="cli-hist-ejercicio-fallback" aria-hidden="true">
              <i className="bi bi-activity" />
            </span>
          )}
          <div className="cli-evolucion-ficha-info">
            <div className="cli-hist-ejercicio-titulo">
              <h3 className="cli-hist-ejercicio-nombre mb-0">{info.nombre}</h3>
              {info.grupo_muscular && (
                <span className="badge-g cli-ej-etiqueta">{info.grupo_muscular}</span>
              )}
              {info.equipo && <span className="badge-g cli-ej-etiqueta">{info.equipo}</span>}
              <span className="badge-g badge-activo">
                Sesión {evolucion.sesiones.join(" / ")}
              </span>
            </div>
            <p className="cli-ent-secundario mb-0">{evolucion.explicacionMetrica}</p>
          </div>
        </div>
      </div>

      {evolucion.suficientesParaComparar && primero && ultimo && maximo && (
        <dl className="cli-evolucion-hitos" aria-label={`Resumen histórico de ${info.nombre}`}>
          <div className="cli-evolucion-hito">
            <dt>Primer valor registrado</dt>
            <dd>
              <strong>{primero.etiquetaValor}</strong>
              {primero.contextoSecundario && (
                <span className="cli-evolucion-hito-sub">{primero.contextoSecundario}</span>
              )}
              <small className="cli-ent-secundario">
                {utils.fecha(primero.fecha)} · Sesión {primero.sesion}
              </small>
            </dd>
          </div>

          <div className="cli-evolucion-hito">
            <dt>Último valor registrado</dt>
            <dd>
              <strong>{ultimo.etiquetaValor}</strong>
              {ultimo.contextoSecundario && (
                <span className="cli-evolucion-hito-sub">{ultimo.contextoSecundario}</span>
              )}
              <small className="cli-ent-secundario">
                {utils.fecha(ultimo.fecha)} · Sesión {ultimo.sesion}
              </small>
            </dd>
          </div>

          <div className="cli-evolucion-hito cli-evolucion-hito--destacado">
            <dt>Máximo en esta rutina</dt>
            <dd>
              <strong>{maximo.etiquetaValor}</strong>
              {maximo.contextoSecundario && (
                <span className="cli-evolucion-hito-sub">{maximo.contextoSecundario}</span>
              )}
              <small className="cli-ent-secundario">
                {utils.fecha(maximo.fecha)} · Sesión {maximo.sesion}
              </small>
            </dd>
          </div>
        </dl>
      )}

      {evolucion.suficientesParaComparar ? (
        <div className="cli-evolucion-grafico-card">
          <div className="cli-evolucion-grafico-cab">
            <h4 className="cli-ej-seccion mb-0">{evolucion.tituloMetrica}</h4>
            <span className="cli-ent-secundario">
              {puntosGraficables.length} entrenamientos con datos. Puedes consultar los valores exactos en «Ver registros».
            </span>
          </div>
          <p className="cli-ent-secundario mb-0">
            Las cargas, repeticiones y condiciones pueden variar entre sesiones. Los registros de otra modalidad no se comparan en la curva.
          </p>
          <div
            className="cli-evolucion-lienzo"
            role="img"
            aria-label={resumenAriaGrafico}
          >
            <Line data={chartData} options={chartOpts} />
          </div>
          {evolucion.tieneAlgunoSinCarga && (
            <p className="cli-ent-secundario mb-0">
              <i className="bi bi-info-circle me-1" aria-hidden="true" />
              Las sesiones registradas sin carga numérica no se grafican como 0 kg; consúltalas en el listado inferior.
            </p>
          )}
        </div>
      ) : puntosGraficables.length === 1 && primero ? (
        <div className="cli-evolucion-unico-card" role="status">
          <div className="cli-evolucion-unico-dato">
            <span className="cli-evolucion-unico-etiqueta">Único registro en este plan</span>
            <div className="cli-evolucion-unico-cifra">
              <strong>{primero.etiquetaValor}</strong>
              {primero.contextoSecundario && (
                <span className="cli-evolucion-hito-sub">{primero.contextoSecundario}</span>
              )}
            </div>
            <small className="cli-ent-secundario">
              {utils.fecha(primero.fecha)} · Sesión {primero.sesion}
            </small>
          </div>
          <p className="cli-ent-secundario mb-0">
            <i className="bi bi-info-circle me-2" aria-hidden="true" />
            Se necesitan al menos dos entrenamientos con datos de este ejercicio para mostrar una comparación gráfica.
          </p>
        </div>
      ) : (
        <p className="cli-evolucion-aviso-unico" role="status">
          <i className="bi bi-info-circle me-2" aria-hidden="true" />
          No hay valores numéricos suficientes para trazar una curva en este ejercicio.
        </p>
      )}

      {(puntosDesc.length > 1 || puntosGraficables.length === 0) && (
        <details className="cli-evolucion-registros" key={idActivo}>
          <summary className="cli-evolucion-ver-registros">
            Ver valores por fecha de {info.nombre} ({puntosDesc.length})
          </summary>
          <ol
            className="cli-evolucion-lista"
            aria-label={`Historial cronológico de ${info.nombre}, del más reciente al más antiguo`}
          >
            {puntosDesc.map((punto) => (
              <li key={punto.id_registro} className="cli-evolucion-item">
                <div className="cli-evolucion-item-cab">
                  <div className="cli-evolucion-item-fecha">
                    <span className="cli-evolucion-sesion">Sesión {punto.sesion}</span>
                    <strong>{utils.fecha(punto.fecha)}</strong>
                  </div>
                  <div className="cli-evolucion-item-metrica">
                    <strong className="cli-evolucion-valor-principal">
                      {punto.etiquetaValor}
                    </strong>
                    {punto.contextoSecundario && (
                      <span className="cli-evolucion-contexto">
                        {" · "}
                        {punto.contextoSecundario}
                      </span>
                    )}
                  </div>
                </div>
              </li>
            ))}
          </ol>
        </details>
      )}
    </div>
  );
}
