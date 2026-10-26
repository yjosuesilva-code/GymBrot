import type { AvanceRutina, LetraSesion } from "../../types";

export type ResumenBorradorAvance = {
  sesion: LetraSesion;
  ejerciciosCompletados: number;
  totalEjercicios: number;
};

type Props = {
  avance: AvanceRutina;
  ideal: number | null;
  siguiente: LetraSesion | null;
  sesionActiva?: LetraSesion;
  borradorEnCurso?: ResumenBorradorAvance | null;
  onVerSesion: (sesion: LetraSesion) => void;
};

export function AvanceCliente({
  avance,
  ideal,
  siguiente,
  sesionActiva,
  borradorEnCurso = null,
  onVerSesion,
}: Props) {
  const restantes = Math.max(0, avance.planeadas - avance.completadas);
  const diferencia = ideal === null ? null : avance.completadas - ideal;
  const distancia = Math.abs(diferencia ?? 0);
  const ritmo = diferencia === 0 ? "Vas al día con el ritmo previsto."
    : `${distancia} ${distancia === 1 ? "entrenamiento" : "entrenamientos"} ${diferencia !== null && diferencia > 0 ? "por encima" : "por debajo"} del ritmo previsto.`;

  return (
    <div className="cli-avance">
      <div className="cli-avance-cifras">
        <div className="cli-avance-porcentaje">
          <strong>{avance.planeadas > 0 ? <>{avance.porcentaje}<span>%</span></> : "—"}</strong>
          <span>{avance.planeadas > 0 ? "de la rutina completada" : "Sin meta de entrenamientos"}</span>
        </div>
        <dl className="cli-avance-conteos">
          <div><dt>Entrenamientos completados</dt><dd>{avance.completadas}</dd></div>
          <div><dt>Entrenamientos restantes</dt><dd>{avance.planeadas > 0 ? restantes : "—"}</dd></div>
        </dl>
      </div>
      {avance.planeadas > 0 && (
        <div className="cli-ent-progreso">
          <label htmlFor="cli-avance-barra">Meta del plan: {avance.completadas} de {avance.planeadas} sesiones</label>
          <progress className="cli-ent-barra" id="cli-avance-barra" max={100} value={avance.porcentaje} />
        </div>
      )}
      {avance.completadas === 0 && avance.planeadas === 0 && (
        <p className="cli-ent-secundario">Aún no hay entrenamientos registrados en esta rutina.</p>
      )}
      {ideal !== null && (
        <p className="cli-avance-ritmo">
          <i className="bi bi-calendar-check" aria-hidden="true" />
          <span>
            {ritmo}{" "}
            <span className="cli-ent-secundario">
              Ideal a hoy: {ideal} {ideal === 1 ? "entrenamiento" : "entrenamientos"}.
            </span>
          </span>
        </p>
      )}
      {borradorEnCurso && (
        <p className="cli-avance-ritmo" role="status">
          <i className="bi bi-clock-history" aria-hidden="true" />
          <span>
            La <strong>Sesión {borradorEnCurso.sesion}</strong> en curso ({borradorEnCurso.ejerciciosCompletados} de {borradorEnCurso.totalEjercicios}{" "}
            {borradorEnCurso.totalEjercicios === 1 ? "ejercicio" : "ejercicios"}) se sumará al avance cuando guardes el entrenamiento.
          </span>
        </p>
      )}
      {siguiente && sesionActiva !== siguiente && (
        <div className="cli-avance-siguiente">
          <p className="cli-ent-secundario">Próxima sesión sugerida <strong>Sesión {siguiente}</strong></p>
          <button type="button" className="btn-dark cli-ent-boton" onClick={() => onVerSesion(siguiente)}>Ver sesión {siguiente}<i className="bi bi-arrow-right ms-2" aria-hidden="true" /></button>
        </div>
      )}
    </div>
  );
}
