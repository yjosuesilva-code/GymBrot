import type { AvanceRutina, LetraSesion } from "../../types";

type Props = {
  avance: AvanceRutina;
  ideal: number | null;
  siguiente: LetraSesion | null;
  onVerSesion: (sesion: LetraSesion) => void;
};

export function AvanceCliente({ avance, ideal, siguiente, onVerSesion }: Props) {
  const restantes = Math.max(0, avance.planeadas - avance.completadas);
  const diferencia = ideal === null ? null : avance.completadas - ideal;
  const distancia = Math.abs(diferencia ?? 0);
  const ritmo = diferencia === 0 ? "Vas al día con tu plan."
    : `${distancia} ${distancia === 1 ? "sesión" : "sesiones"} ${diferencia !== null && diferencia > 0 ? "por encima" : "por debajo"} del ritmo previsto.`;

  return (
    <div className="cli-avance">
      <div className="cli-avance-cifras">
        <div className="cli-avance-porcentaje">
          <strong>{avance.planeadas > 0 ? <>{avance.porcentaje}<span>%</span></> : "—"}</strong>
          <span>{avance.planeadas > 0 ? "de tu rutina completada" : "Sin meta de sesiones"}</span>
        </div>
        <dl className="cli-avance-conteos">
          <div><dt>Sesiones completadas</dt><dd>{avance.completadas}</dd></div>
          <div><dt>Sesiones restantes</dt><dd>{avance.planeadas > 0 ? restantes : "—"}</dd></div>
        </dl>
      </div>
      {avance.planeadas > 0 && (
        <div className="cli-ent-progreso">
          <label htmlFor="cli-avance-barra">{avance.completadas} de {avance.planeadas} sesiones planeadas</label>
          <progress className="cli-ent-barra" id="cli-avance-barra" max={100} value={avance.porcentaje} />
        </div>
      )}
      {ideal !== null && <p className="cli-avance-ritmo"><i className="bi bi-calendar-check" aria-hidden="true" /><span>{ritmo} <span className="cli-ent-secundario">Ideal a hoy: {ideal} {ideal === 1 ? "sesión" : "sesiones"}.</span></span></p>}
      {siguiente && (
        <div className="cli-avance-siguiente">
          <p className="cli-ent-secundario">Próxima sesión sugerida <strong>Sesión {siguiente}</strong></p>
          <button type="button" className="btn-dark cli-ent-boton" onClick={() => onVerSesion(siguiente)}>Ver sesión {siguiente}<i className="bi bi-arrow-right ms-2" aria-hidden="true" /></button>
        </div>
      )}
    </div>
  );
}
