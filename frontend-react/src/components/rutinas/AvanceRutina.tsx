import type { AvanceRutina as Avance, LetraSesion } from "../../types";

/* [P3] Avance de una rutina como anillo: "12 de 19 sesiones".
   El anillo son dos <circle> de SVG: el de fondo completo y el de avance con
   stroke-dasharray = largo de la circunferencia y stroke-dashoffset = la parte que falta.
   `ideal` (opcional) agrega "Ideal a hoy: 14 · vas 2 atrás"; `siguiente` agrega "Siguiente: B". */
type Props = {
  avance: Avance;
  ideal?: number | null;
  siguiente?: LetraSesion | null;
  tamano?: number;
};

const GROSOR = 10;

export function AvanceRutina({ avance, ideal = null, siguiente = null, tamano = 132 }: Props) {
  const radio = (tamano - GROSOR) / 2;
  const circunferencia = 2 * Math.PI * radio;
  const falta = circunferencia * (1 - avance.porcentaje / 100);

  let ritmo = "";
  if (ideal !== null) {
    const diferencia = avance.completadas - ideal;
    ritmo =
      diferencia === 0 ? "vas al día" : diferencia < 0 ? "vas " + -diferencia + " atrás" : "vas " + diferencia + " adelante";
  }

  return (
    <div className="inst-avance">
      <svg width={tamano} height={tamano} viewBox={`0 0 ${tamano} ${tamano}`} role="img" aria-label={`${avance.completadas} de ${avance.planeadas} sesiones`}>
        <circle className="inst-anillo-fondo" cx={tamano / 2} cy={tamano / 2} r={radio} strokeWidth={GROSOR} fill="none" />
        <circle
          className="inst-anillo-valor"
          cx={tamano / 2}
          cy={tamano / 2}
          r={radio}
          strokeWidth={GROSOR}
          fill="none"
          strokeLinecap="round"
          strokeDasharray={circunferencia}
          strokeDashoffset={falta}
          transform={`rotate(-90 ${tamano / 2} ${tamano / 2})`}
        />
        <text x="50%" y="47%" textAnchor="middle" className="inst-anillo-num">
          {avance.completadas}
        </text>
        <text x="50%" y="64%" textAnchor="middle" className="inst-anillo-sub">
          de {avance.planeadas}
        </text>
      </svg>
      <div className="inst-avance-info">
        <div className="inst-avance-titulo">
          {avance.completadas} de {avance.planeadas} sesiones <span className="card-sub">({avance.porcentaje}%)</span>
        </div>
        {ideal !== null && (
          <div className="card-sub">
            Ideal a hoy: {ideal} · {ritmo}
          </div>
        )}
        {siguiente && (
          <div className="inst-siguiente">
            Siguiente: <span className="inst-letra">{siguiente}</span>
          </div>
        )}
      </div>
    </div>
  );
}
