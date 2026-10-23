import type { LetraSesion } from "../../types";

/* [P3] Pestañas grandes de sesión: la letra destacada y un resumen debajo
   ("6 ejercicios · ~45 min · Pecho, Tríceps"). `aviso` marca una pestaña con
   problemas (ej. "vacía") en rojo, como las "premisas" de Smart Fit. */
export type PestanaSesion = { sesion: LetraSesion; resumen: string; aviso?: string };

type Props = {
  pestanas: PestanaSesion[];
  activa: LetraSesion;
  onCambiar: (sesion: LetraSesion) => void;
};

export function PestanasSesion({ pestanas, activa, onCambiar }: Props) {
  return (
    <div className="inst-tabs" role="tablist">
      {pestanas.map((p) => (
        <button
          key={p.sesion}
          type="button"
          role="tab"
          aria-selected={p.sesion === activa}
          className={"inst-tab" + (p.sesion === activa ? " activa" : "") + (p.aviso ? " con-aviso" : "")}
          onClick={() => onCambiar(p.sesion)}
        >
          <span className="inst-letra">{p.sesion}</span>
          <span className="inst-tab-texto">
            <span className="inst-tab-titulo">Sesión {p.sesion}</span>
            <span className="inst-tab-resumen">
              {p.aviso ? (
                <>
                  <i className="bi bi-exclamation-triangle me-1" aria-hidden />
                  {p.aviso}
                </>
              ) : (
                p.resumen
              )}
            </span>
          </span>
        </button>
      ))}
    </div>
  );
}
