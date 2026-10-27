import type {
  Cliente,
  Ejercicio,
  EjercicioRealizado,
  EstadoRutina,
  FilaSupervision,
  LetraSesion,
  ObjetivoRutina,
  Rutina,
  RutinaEjercicio,
  SerieRealizada,
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

// [B1 · KAN-89] Por qué una rutina necesita al instructor. Una fila puede tener varios motivos.
export type MotivoAtencion = "CAMBIOS" | "ATRASADA" | "POR_VENCER" | "VENCIDA";
export const UMBRAL_ATRASO = 2; // sesiones por debajo del ideal para considerarla atrasada

export const MOTIVO_ATENCION: Record<MotivoAtencion, { texto: string; icono: string }> = {
  CAMBIOS: { texto: "Cambios del cliente", icono: "bi-person-exclamation" },
  ATRASADA: { texto: "Atrasada", icono: "bi-graph-down-arrow" },
  POR_VENCER: { texto: "Por vencer", icono: "bi-hourglass-split" },
  VENCIDA: { texto: "Vencida sin renovar", icono: "bi-x-circle" },
};

// `renovada` = el cliente ya tiene otra rutina vigente (entonces una vencida no es problema)
export function motivosAtencion(f: FilaSupervision, renovada: boolean): MotivoAtencion[] {
  const motivos: MotivoAtencion[] = [];
  const activa = f.estado === "VIGENTE" || f.estado === "POR_VENCER";
  if (activa && f.cambios_sin_revisar > 0) motivos.push("CAMBIOS");
  if (activa && idealAHoy(f.rutina) - f.avance.completadas >= UMBRAL_ATRASO) motivos.push("ATRASADA");
  if (f.estado === "POR_VENCER") motivos.push("POR_VENCER");
  if (f.estado === "VENCIDA" && !renovada) motivos.push("VENCIDA");
  return motivos;
}

// [B2 · KAN-90] Alumnos del instructor (los usan el dashboard y la vista Alumnos)
export interface Alumno {
  fila: FilaSupervision;            // su rutina actual (la mía)
  cliente: Cliente | undefined;
  motivos: MotivoAtencion[];
}

export const esActiva = (f: FilaSupervision) => f.estado === "VIGENTE" || f.estado === "POR_VENCER";

/* Alumnos = clientes cuya rutina ACTUAL es del instructor:
   - si el cliente tiene una rutina vigente (solo puede tener una), esa es la actual;
   - si no, la más reciente, y solo cuenta si VENCIÓ (no si se finalizó a propósito) y el cliente sigue ACTIVO. */
export function alumnosDeInstructor(filas: FilaSupervision[], clientes: Cliente[], idInstructor: string): Alumno[] {
  const porCliente = new Map<string, FilaSupervision[]>();
  for (const f of filas) {
    const lista = porCliente.get(f.rutina.id_cliente) ?? [];
    lista.push(f);
    porCliente.set(f.rutina.id_cliente, lista);
  }
  const alumnos: Alumno[] = [];
  porCliente.forEach((suyas, cedula) => {
    const cliente = clientes.find((c) => c.numero_identificacion === cedula);
    const recientes = [...suyas].sort(
      (a, b) => b.rutina.fecha_creacion.localeCompare(a.rutina.fecha_creacion) || b.rutina.id_rutina - a.rutina.id_rutina
    );
    const actual = recientes.find(esActiva) ?? recientes[0];
    if (actual.rutina.id_instructor !== idInstructor) return;
    if (!esActiva(actual) && (actual.estado !== "VENCIDA" || cliente?.estado !== "ACTIVO")) return;
    // `renovada` es false: la actual es la última del cliente, así que una vencida no fue renovada
    alumnos.push({ fila: actual, cliente, motivos: motivosAtencion(actual, false) });
  });
  // Primero los que más necesitan atención; luego por nombre
  return alumnos.sort(
    (a, b) =>
      b.motivos.length - a.motivos.length ||
      (a.cliente?.nombre ?? "").localeCompare(b.cliente?.nombre ?? "")
  );
}

/* ---------- Series realizadas (KAN-98) ---------- */

export const MAX_REPS = 100;
export const MAX_SEGUNDOS = 3600;
export const MAX_PESO_KG = 500;

type ResumenSeries = Pick<EjercicioRealizado, "series" | "reps" | "segundos" | "peso_kg">;

// Resumen de un ejercicio a partir de sus series: cuántas se hicieron, la de mayor peso
// (si empatan, la de más reps) y el máximo de segundos. Sin peso cuenta como 0 al comparar.
export function resumirSeries(detalle: SerieRealizada[]): ResumenSeries {
  if (detalle.length === 0) return { series: 0, reps: null, segundos: null, peso_kg: null };
  const mejor = detalle.reduce((a, b) => {
    const pesoA = a.peso_kg ?? 0;
    const pesoB = b.peso_kg ?? 0;
    if (pesoB !== pesoA) return pesoB > pesoA ? b : a;
    return (b.reps ?? 0) > (a.reps ?? 0) ? b : a;
  });
  const segundos = detalle.map((s) => s.segundos).filter((s): s is number => s != null);
  return {
    series: detalle.length,
    reps: mejor.reps ?? null,
    segundos: segundos.length > 0 ? Math.max(...segundos) : null,
    peso_kg: mejor.peso_kg ?? null,
  };
}

// Revisa reps / segundos / peso según el tipo de medición. `donde` va al inicio del mensaje.
function errorValores(v: Omit<SerieRealizada, "numero">, ejercicio: Ejercicio, donde: string, obligatorio: boolean): string | null {
  const fuera = (x: number, max: number) => !Number.isFinite(x) || x < 0 || x > max;
  if (ejercicio.tipo_medicion === "REPETICIONES") {
    if (v.segundos != null) return donde + ": es por repeticiones, no lleva segundos";
    if (v.reps == null) return obligatorio ? donde + ": faltan las repeticiones" : null;
    if (!Number.isInteger(v.reps) || fuera(v.reps, MAX_REPS))
      return donde + ": las repeticiones deben ser un entero entre 0 y " + MAX_REPS;
  } else {
    if (v.reps != null) return donde + ": es por tiempo, no lleva repeticiones";
    if (v.segundos == null) return obligatorio ? donde + ": faltan los segundos" : null;
    if (fuera(v.segundos, MAX_SEGUNDOS)) return donde + ": los segundos deben estar entre 0 y " + MAX_SEGUNDOS;
  }
  if (v.peso_kg != null && fuera(v.peso_kg, MAX_PESO_KG)) return donde + ": el peso debe estar entre 0 y " + MAX_PESO_KG + " kg";
  return null;
}

// Valida el detalle de un ejercicio: al menos una serie, números 1..N sin repetir y valores
// según el tipo de medición. Devuelve el mensaje de error o null si todo está bien.
export function validarSeries(detalle: SerieRealizada[], ejercicio: Ejercicio): string | null {
  if (detalle.length === 0) return ejercicio.nombre + ": el detalle no tiene series";
  const numeros = detalle.map((s) => s.numero).sort((a, b) => a - b);
  if (numeros.some((n, i) => n !== i + 1))
    return ejercicio.nombre + ": las series deben numerarse de 1 a " + detalle.length + " sin repetir";
  for (const s of detalle) {
    const error = errorValores(s, ejercicio, ejercicio.nombre + ", serie " + s.numero, true);
    if (error) return error;
  }
  return null;
}

// Valida un resumen que llega sin detalle (todos los campos son opcionales)
export function validarResumen(e: ResumenSeries, ejercicio: Ejercicio): string | null {
  if (e.series != null && (!Number.isInteger(e.series) || e.series < 0 || e.series > MAX_REPS))
    return ejercicio.nombre + ": el número de series no es válido";
  return errorValores(e, ejercicio, ejercicio.nombre, false);
}
