import { utils } from "../../lib/utils";
import type { Ejercicio, RegistroEntrenamiento } from "../../types";
import { VistaPreviaRecurso } from "../ejercicios/VistaPreviaRecurso";
import {
  formatoRealizado,
  formatoSerieRealizada,
  resolverEjercicioHistorial,
  resumenOficialEjercicioRealizado,
} from "./historialEntrenamiento";

type Props = {
  registro: RegistroEntrenamiento;
  catalogo: Ejercicio[];
  onVerEvolucion?: (idEjercicio: number) => void;
};

export function DetalleEntrenamiento({ registro, catalogo, onVerEvolucion }: Props) {
  const ejercicios = Array.isArray(registro.ejercicios_realizados)
    ? registro.ejercicios_realizados
    : [];

  return (
    <div
      className="cli-hist-detalle"
      role="region"
      aria-label={`Detalle del entrenamiento de la sesión ${registro.sesion} del ${utils.fecha(registro.fecha)}`}
    >
      {ejercicios.length === 0 ? (
        <div className="cli-hist-sin-desglose" role="status">
          <i className="bi bi-info-circle" aria-hidden="true" />
          <div>
            <p className="mb-1">
              <strong>Sesión registrada sin desglose de ejercicios.</strong>
            </p>
            <p className="cli-ent-secundario mb-0">
              Este registro acredita la sesión {registro.sesion} del {utils.fecha(registro.fecha)}, pero no incluye series individuales. Los entrenamientos que finalices desde Mi rutina guardarán cada ejercicio y serie realizada.
            </p>
          </div>
        </div>
      ) : (
        <ul className="cli-hist-ejercicios" aria-label="Ejercicios realizados en esta sesión">
          {ejercicios.map((realizado) => {
            const info = resolverEjercicioHistorial(realizado.id_ejercicio, catalogo);
            const resumen = resumenOficialEjercicioRealizado(realizado);
            const textoResumen = formatoRealizado(realizado, info.ejercicio);

            return (
              <li key={realizado.id_ejercicio} className="cli-hist-ejercicio">
                <div className="cli-hist-ejercicio-cab">
                  <div className="cli-hist-ejercicio-id">
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
                    <div className="cli-hist-ejercicio-textos">
                      <div className="cli-hist-ejercicio-titulo">
                        <h4 className="cli-hist-ejercicio-nombre">{info.nombre}</h4>
                        {info.grupo_muscular && (
                          <span className="badge-g cli-ej-etiqueta">{info.grupo_muscular}</span>
                        )}
                        {info.equipo && (
                          <span className="badge-g cli-ej-etiqueta">{info.equipo}</span>
                        )}
                        {!info.enCatalogo && (
                          <span className="badge-g badge-inactivo">No disponible en catálogo</span>
                        )}
                      </div>
                      <p className="cli-hist-ejercicio-resumen">
                        <span>Resumen:</span> <strong>{textoResumen}</strong>
                      </p>
                    </div>
                  </div>

                  {onVerEvolucion && (
                    <button
                      type="button"
                      className="btn-dark cli-ej-accion cli-hist-btn-evolucion"
                      aria-label={`Ver evolución de ${info.nombre}`}
                      onClick={() => onVerEvolucion(realizado.id_ejercicio)}
                    >
                      <i className="bi bi-graph-up-arrow" aria-hidden="true" />
                      <span>Ver evolución</span>
                    </button>
                  )}
                </div>

                {resumen.tieneDetalle ? (
                  <ol
                    className="cli-hist-series-lista"
                    aria-label={`Series registradas en ${info.nombre}`}
                  >
                    {resumen.detalle_series.map((s) => (
                      <li key={s.numero} className="cli-hist-serie-item">
                        <span className="cli-hist-serie-num">Serie {s.numero}</span>
                        <strong className="cli-hist-serie-val">
                          {formatoSerieRealizada(s, info.ejercicio)}
                        </strong>
                      </li>
                    ))}
                  </ol>
                ) : (
                  <p className="cli-hist-resumen-legado">
                    <i className="bi bi-clock-history me-2" aria-hidden="true" />
                    Registro resumido (sin desglose serie por serie):{" "}
                    <strong>{textoResumen}</strong>
                  </p>
                )}
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
