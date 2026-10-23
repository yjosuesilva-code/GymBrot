import type { GrupoMuscular } from "../../types";

/* [P3] KAN-97 — Pictograma de un ejercicio sin imagen: ícono de bootstrap-icons y color según el
   grupo muscular. Es el respaldo de VistaPreviaRecurso y AnimacionEjercicio (sin imagen, o la
   imagen no cargó). `texto` (opcional) se muestra debajo en el tamaño grande. */

const ICONO: Record<GrupoMuscular, string> = {
  Pecho: "bi-shield-shaded",
  Espalda: "bi-arrows-vertical",
  Hombros: "bi-triangle-fill",
  Bíceps: "bi-lightning-fill",
  Tríceps: "bi-lightning-charge-fill",
  Piernas: "bi-person-walking",
  Glúteos: "bi-circle-half",
  Abdomen: "bi-grid-3x3-gap",
  Cardio: "bi-heart-pulse",
  "Cuerpo completo": "bi-person-arms-up",
};

// Clase de color: "Cuerpo completo" → "inst-picto-cuerpo-completo", "Glúteos" → "inst-picto-gluteos"
function claseDe(grupo: GrupoMuscular): string {
  const sinTildes = grupo.normalize("NFD").replace(/[̀-ͯ]/g, "");
  return "inst-picto-" + sinTildes.toLowerCase().replace(/\s+/g, "-");
}

type Props = {
  grupo: GrupoMuscular;
  className: string;      // tamaño: inst-ej-mini o inst-ej-grande
  texto?: string;
};

export function Pictograma({ grupo, className, texto }: Props) {
  const etiqueta = texto ? texto + " (" + grupo + ")" : "Sin imagen: " + grupo;
  return (
    <div className={className + " inst-picto " + claseDe(grupo)} title={etiqueta} role="img" aria-label={etiqueta}>
      <i className={"bi " + ICONO[grupo]} aria-hidden />
      {texto && <small>{texto}</small>}
    </div>
  );
}
