import { useEffect, useRef } from "react";
import type { RefObject } from "react";
import { detalleRealizado } from "./entrenamiento";
import type { EstadoEntrenamiento } from "./entrenamiento";

type Props = {
  estado: EstadoEntrenamiento;
  notas: string;
  guardando: boolean;
  error: string | null;
  titulo: RefObject<HTMLHeadingElement | null>;
  onCambiarNotas: (valor: string) => void;
  onRevisar: (indice: number) => void;
  onFinalizar: () => void;
};

export function ResumenEntrenamiento({
  estado,
  notas,
  guardando,
  error,
  titulo,
  onCambiarNotas,
  onRevisar,
  onFinalizar,
}: Props) {
  const avisoError = useRef<HTMLDivElement>(null);
  const realizados = estado.ejercicios.map((ejercicio, indice) => ({
    ejercicio, indice, detalle: detalleRealizado(ejercicio),
  })).filter(({ detalle }) => detalle.length > 0);
  const totalSeries = realizados.reduce((total, e) => total + e.detalle.length, 0);

  useEffect(() => {
    if (error !== null) avisoError.current?.focus();
  }, [error, guardando]);

  return (
    <section className="card-g cli-ent-panel" aria-labelledby="cli-ent-resumen">
      <div className="cli-ent-resumen-intro">
        <h2 className="card-title cli-ent-titulo" id="cli-ent-resumen" ref={titulo} tabIndex={-1}>Resumen de la sesión {estado.sesion}</h2>
        <p className="cli-ent-secundario">Verifica tus marcas antes de guardar el entrenamiento.</p>
        <p className="cli-ent-totales">
          <span><strong>{realizados.length}</strong> {realizados.length === 1 ? "ejercicio" : "ejercicios"}</span>
          <span><strong>{totalSeries}</strong> {totalSeries === 1 ? "serie completada" : "series completadas"}</span>
        </p>
      </div>

      <ol className="cli-ent-resumen" aria-busy={guardando}>
        {realizados.map(({ ejercicio: e, indice, detalle }) => (
          <li className="cli-ent-resumen-ejercicio" key={e.fila.id_ejercicio}>
            <div className="cli-ent-resumen-cabecera">
              <div>
                <h3 className="cli-ej-seccion" id={`cli-resumen-ejercicio-${indice}`}>{e.ejercicio?.nombre ?? "Ejercicio no disponible"}</h3>
                <p className="cli-ent-secundario">{detalle.length} de {e.series.length} series realizadas</p>
              </div>
              <button type="button" className="btn-dark cli-ent-boton" disabled={guardando} onClick={() => onRevisar(indice)} aria-label={`Editar series de ${e.ejercicio?.nombre ?? "este ejercicio"}`}>
                <i className="bi bi-pencil-square me-2" aria-hidden="true" />Editar series
              </button>
            </div>
            <table className="cli-ent-tabla" aria-labelledby={`cli-resumen-ejercicio-${indice}`}>
              <thead><tr><th scope="col">Serie</th><th scope="col">{e.ejercicio?.tipo_medicion === "TIEMPO" ? "Tiempo" : "Reps"}</th><th scope="col">Peso</th></tr></thead>
              <tbody>
                {detalle.map((serie) => (
                  <tr key={serie.numero}>
                    <th scope="row">{serie.numero}</th>
                    <td>{e.ejercicio?.tipo_medicion === "TIEMPO" ? <>{serie.segundos} <span>s</span></> : <>{serie.reps} <span>reps</span></>}</td>
                    <td>{serie.peso_kg === null ? <span>Peso corporal</span> : <>{serie.peso_kg} <span>kg</span></>}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </li>
        ))}
      </ol>

      <div className="cli-ent-notas">
        <label className="cli-ent-label" htmlFor="cli-ent-notas-sesion">Notas para tu entrenador (opcional)</label>
        <textarea
          id="cli-ent-notas-sesion"
          className="form-control-dark"
          rows={2}
          maxLength={300}
          disabled={guardando}
          value={notas}
          placeholder="Ej. Subí peso en la última serie o sentí fatiga al final..."
          onChange={(e) => onCambiarNotas(e.target.value)}
        />
      </div>

      <div className="cli-ent-finalizar">
        {error !== null && (
          <div className="cli-ent-error" role="alert" tabIndex={-1} ref={avisoError} aria-labelledby="cli-ent-error-titulo" aria-describedby="cli-ent-error-mensaje cli-ent-error-ayuda">
            <h3 className="cli-ej-seccion" id="cli-ent-error-titulo"><i className="bi bi-exclamation-triangle me-2" aria-hidden="true" />No se pudo guardar</h3>
            <p className="cli-ent-error-mensaje" id="cli-ent-error-mensaje">{error}</p>
            <p className="cli-ent-secundario" id="cli-ent-error-ayuda">Tus series siguen intactas. Edita algún valor o vuelve a intentarlo.</p>
          </div>
        )}
        {guardando && (
          <p className="cli-ent-secundario" id="cli-ent-estado-guardado" role="status" aria-atomic="true">
            Guardando entrenamiento…
          </p>
        )}
        <button
          type="button"
          className="btn-neon cli-ent-boton cli-ent-principal"
          disabled={guardando}
          aria-describedby={guardando ? "cli-ent-estado-guardado" : undefined}
          onClick={onFinalizar}
        >
          <i className={`bi ${guardando ? "bi-hourglass-split" : "bi-check2-circle"} me-2`} aria-hidden="true" />
          {guardando ? "Guardando entrenamiento…" : "Guardar entrenamiento"}
        </button>
      </div>
    </section>
  );
}
