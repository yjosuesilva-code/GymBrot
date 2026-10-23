import type {
  Ejercicio,
  EstadoRutina,
  LetraSesion,
  ObjetivoRutina,
  Rutina,
  RutinaEjercicio,
} from "../types";
import { utils } from "./utils";

/* [P3] Funciones puras de Rutinas v2 (KAN-56/57/58).
   No leen ni escriben datos: reciben lo que necesitan y devuelven texto o números.
   Las usan el admin, el instructor (Fase B) y pueden usarlas las vistas del cliente (T4). */

export const LETRAS_SESION: LetraSesion[] = ["A", "B", "C", "D"];

// Única lista de objetivos de rutina (la usan las vistas y la semilla)
export const OBJETIVOS_RUTINA: ObjetivoRutina[] = [
  "Ganancia muscular",
  "Pérdida de peso",
  "Tonificación",
  "Resistencia",
  "Rehabilitación",
];

// Cuando la rutina no tiene fecha fin, el "ideal a hoy" se calcula sobre 8 semanas
const SEMANAS_SIN_FIN = 8;

// Días enteros entre dos fechas 'YYYY-MM-DD' (b - a). Date.UTC evita horas y cambios de horario.
export function diasEntre(a: string, b: string): number {
  const [ya, ma, da] = a.split("-").map(Number);
  const [yb, mb, db] = b.split("-").map(Number);
  return Math.round((Date.UTC(yb, mb - 1, db) - Date.UTC(ya, ma - 1, da)) / 86400000);
}

// "4 × 10–12 · 20 kg · 60 s" (repeticiones) o "3 × 30 s · 45 s" (tiempo)
export function formatoPrescripcion(e: Pick<RutinaEjercicio, "series" | "reps_min" | "reps_max" | "segundos" | "peso_kg" | "descanso_seg">): string {
  const partes: string[] = [];
  let cantidad = "";
  if (e.segundos != null) cantidad = e.segundos + " s";
  else if (e.reps_min != null && e.reps_max != null) cantidad = e.reps_min === e.reps_max ? String(e.reps_min) : e.reps_min + "–" + e.reps_max;
  else if (e.reps_min != null || e.reps_max != null) cantidad = String(e.reps_min ?? e.reps_max);
  if (e.series != null) partes.push(cantidad ? e.series + " × " + cantidad : e.series + " series");
  else if (cantidad) partes.push(cantidad);
  if (e.peso_kg != null) partes.push(e.peso_kg + " kg");
  if (e.descanso_seg != null) partes.push(e.descanso_seg + " s");
  return partes.join(" · ") || "—";
}

// Minutos aproximados de una sesión: series × (tiempo de la serie + descanso), redondeado a 5.
// Una serie por repeticiones se estima en 3 s por repetición.
export function duracionEstimada(ejercicios: Pick<RutinaEjercicio, "series" | "reps_max" | "reps_min" | "segundos" | "descanso_seg">[]): number {
  const segundos = ejercicios.reduce((total, e) => {
    const series = e.series ?? 1;
    const serie = e.segundos ?? (e.reps_max ?? e.reps_min ?? 10) * 3;
    return total + series * (serie + (e.descanso_seg ?? 60));
  }, 0);
  return Math.max(5, Math.round(segundos / 60 / 5) * 5);
}

// Grupos musculares de una sesión, sin repetir y en el orden de los ejercicios
export function gruposDeSesion(ejercicios: Pick<RutinaEjercicio, "id_ejercicio">[], catalogo: Ejercicio[]): string[] {
  const grupos: string[] = [];
  for (const e of ejercicios) {
    const g = catalogo.find((c) => c.id_ejercicio === e.id_ejercicio)?.grupo_muscular;
    if (g && !grupos.includes(g)) grupos.push(g);
  }
  return grupos;
}

// "6 ejercicios · ~45 min · Pecho, Tríceps"
export function resumenSesion(ejercicios: RutinaEjercicio[], catalogo: Ejercicio[]): string {
  if (ejercicios.length === 0) return "Sin ejercicios";
  const n = ejercicios.length + (ejercicios.length === 1 ? " ejercicio" : " ejercicios");
  return n + " · ~" + duracionEstimada(ejercicios) + " min · " + gruposDeSesion(ejercicios, catalogo).join(", ");
}

// Días que faltan para la fecha fin (negativo si ya pasó; null si no tiene fin)
export function diasRestantes(r: Rutina): number | null {
  return r.fecha_fin === null ? null : diasEntre(utils.isoDate(), r.fecha_fin);
}

// Sesiones que "debería" llevar hoy si fuera al ritmo planeado (para "Ideal a hoy: 14 · vas 2 atrás")
export function idealAHoy(r: Rutina): number {
  const planeadas = r.sesiones_planeadas ?? 0;
  const total = r.fecha_fin === null ? SEMANAS_SIN_FIN * 7 : diasEntre(r.fecha_creacion, r.fecha_fin);
  if (total <= 0) return planeadas;
  const transcurridos = Math.min(total, Math.max(0, diasEntre(r.fecha_creacion, utils.isoDate())));
  return Math.round((planeadas * transcurridos) / total);
}

// Sesiones planeadas sugeridas: semanas entre hoy y la fecha fin × veces por semana
export function sesionesSugeridas(frecuencia: number, inicio: string, fin: string | null): number {
  const dias = fin ? diasEntre(inicio, fin) : SEMANAS_SIN_FIN * 7;
  return Math.max(1, Math.round((Math.max(dias, 7) / 7) * frecuencia));
}

// Texto, clase de badge e ícono de cada estado de rutina
export const ESTADO_RUTINA: Record<EstadoRutina, { texto: string; clase: string; icono: string }> = {
  VIGENTE: { texto: "Vigente", clase: "badge-activo", icono: "bi-check-circle" },
  POR_VENCER: { texto: "Por vencer", clase: "badge-pendiente", icono: "bi-hourglass-split" },
  VENCIDA: { texto: "Vencida", clase: "badge-vencida", icono: "bi-x-circle" },
  FINALIZADA: { texto: "Finalizada", clase: "badge-inactivo", icono: "bi-flag" },
};

// Texto de vigencia para tablas: "Vence en 6 d", "Venció hace 12 d", "Sin fecha fin", "Quedan 40 d"
export function textoVigencia(r: Rutina, estado: EstadoRutina): string {
  const d = diasRestantes(r);
  if (estado === "FINALIZADA") return "Finalizada el " + utils.fecha(r.finalizada_el ?? "");
  if (d === null) return "Sin fecha fin";
  if (d < 0) return "Venció hace " + -d + " d";
  if (d === 0) return "Vence hoy";
  return (estado === "POR_VENCER" ? "Vence en " : "Quedan ") + d + " d";
}

// Normaliza texto para buscar sin tildes ni mayúsculas
export function normalizar(texto: string): string {
  return texto.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().trim();
}
