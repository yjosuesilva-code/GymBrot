import type { Cita, TipoCita } from "../types";
import { utils } from "./utils";

/* [P3] Ayudas de lectura sobre las citas (la colección y su vista son de P2).
   Las usan el dashboard del instructor (KAN-89) y su perfil (B6 · KAN-62). */

export const NOMBRE_TIPO_CITA: Record<TipoCita, string> = {
  EVALUACION: "Evaluación",
  SEGUIMIENTO: "Seguimiento",
  NUTRICION: "Nutrición",
  CONSULTA: "Consulta",
};

// Hora local actual como 'HH:MM' (las citas guardan la hora así)
export function horaActual(): string {
  const d = new Date();
  return String(d.getHours()).padStart(2, "0") + ":" + String(d.getMinutes()).padStart(2, "0");
}

/* Próximas citas de un instructor: PENDIENTES o CONFIRMADAS desde ahora en adelante,
   de la más cercana a la más lejana. 'YYYY-MM-DD' + 'HH:MM' se comparan bien como texto. */
export function proximasCitas(citas: Cita[], idInstructor: string): Cita[] {
  const ahora = utils.isoDate() + " " + horaActual();
  return citas
    .filter((c) => c.id_instructor === idInstructor)
    .filter((c) => c.estado === "PENDIENTE" || c.estado === "CONFIRMADA")
    .filter((c) => c.fecha + " " + c.hora >= ahora)
    .sort((a, b) => (a.fecha + a.hora).localeCompare(b.fecha + b.hora));
}
