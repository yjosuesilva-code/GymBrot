import type { AvanceRutina, LetraSesion } from "../../types";

export type ResumenBorradorAvance = {
  sesion: LetraSesion;
  ejerciciosCompletados: number;
  totalEjercicios: number;
};

type Props = {
  avance: AvanceRutina;
  ideal: number | null;
  borradorEnCurso?: ResumenBorradorAvance | null;
};

export function AvanceCliente({
  avance,
  ideal,
  borradorEnCurso = null,
}: Props) {
  const tieneMeta = avance.planeadas > 0;
  const restantes = tieneMeta ? Math.max(0, avance.planeadas - avance.completadas) : 0;
  const exceso = tieneMeta ? Math.max(0, avance.completadas - avance.planeadas) : 0;
  const subtituloPorcentaje = !tieneMeta
    ? "Sin meta de entrenamientos"
    : exceso > 0
      ? `Meta superada (+${exceso})`
      : avance.completadas >= avance.planeadas
        ? "Meta del plan cumplida"
        : "de los entrenamientos previstos";
  const etiquetaBarra =
    avance.completadas === 0
      ? `Meta del plan: 0 de ${avance.planeadas} entrenamientos previstos`
      : exceso > 0
        ? `Meta del plan: ${avance.planeadas} previstos (${exceso} ${exceso === 1 ? "adicional registrado" : "adicionales registrados"})`
        : avance.completadas === avance.planeadas
          ? `Meta del plan completada: ${avance.planeadas} de ${avance.planeadas} entrenamientos previstos`
          : `Meta del plan: ${avance.completadas} de ${avance.planeadas} entrenamientos previstos`;
  const diferencia = ideal === null ? null : avance.completadas - ideal;
  const distancia = Math.abs(diferencia ?? 0);
  const ritmo = diferencia === 0 ? "Vas al día con el ritmo previsto."
    : `${distancia} ${distancia === 1 ? "entrenamiento" : "entrenamientos"} ${diferencia !== null && diferencia > 0 ? "por encima" : "por debajo"} del ritmo previsto.`;

  return (
    <div className="cli-avance">
      <p className="cli-ent-secundario" id="cli-avance-explicacion">
        Cumplimiento de los entrenamientos previstos en tu plan. No mide ganancia muscular ni resultados físicos.
      </p>
      <div className="cli-avance-cifras">
        <div className="cli-avance-porcentaje">
          <strong>{tieneMeta ? <>{avance.porcentaje}<span>%</span></> : "—"}</strong>
          <span>{subtituloPorcentaje}</span>
        </div>
        <dl className="cli-avance-conteos">
          <div><dt>Entrenamientos registrados</dt><dd>{avance.completadas}</dd></div>
          <div><dt>Meta del plan</dt><dd>{tieneMeta ? avance.planeadas : "Sin meta"}</dd></div>
          <div><dt>Entrenamientos faltantes</dt><dd>{tieneMeta ? restantes : "—"}</dd></div>
        </dl>
      </div>
      {tieneMeta && (
        <div className="cli-ent-progreso">
          <label htmlFor="cli-avance-barra">{etiquetaBarra}</label>
          <progress className="cli-ent-barra" id="cli-avance-barra" max={100} value={avance.porcentaje} aria-describedby="cli-avance-explicacion" />
        </div>
      )}
      {!tieneMeta && (
        <p className="cli-ent-secundario">
          {avance.completadas === 0
            ? "Aún no hay entrenamientos registrados en esta rutina."
            : "Este plan no define una meta numérica de sesiones; aquí se contabilizan tus entrenamientos registrados."}
        </p>
      )}
      {ideal !== null && (
        <p className="cli-avance-ritmo">
          <i className="bi bi-calendar-check" aria-hidden="true" />
          <span>
            {ritmo}{" "}
            <span className="cli-ent-secundario">
              Estimación hasta hoy: {ideal} {ideal === 1 ? "entrenamiento" : "entrenamientos"}. Es una referencia de ritmo, no un calendario confirmado.
            </span>
          </span>
        </p>
      )}
      {borradorEnCurso && (
        <p className="cli-avance-ritmo" role="status">
          <i className="bi bi-clock-history" aria-hidden="true" />
          <span>
            La <strong>Sesión {borradorEnCurso.sesion}</strong> en curso ({borradorEnCurso.ejerciciosCompletados} de {borradorEnCurso.totalEjercicios}{" "}
            {borradorEnCurso.totalEjercicios === 1 ? "ejercicio" : "ejercicios"}) se sumará a los entrenamientos registrados cuando lo guardes.
          </span>
        </p>
      )}
    </div>
  );
}
