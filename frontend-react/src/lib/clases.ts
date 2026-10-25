import type { Clase, DiaSemana, TipoClase } from "../types";
import { DIAS_ORDEN } from "./horarios";
import { utils } from "./utils";

/* [P3] B7 · KAN-94 — Funciones puras de Clases con aforo (no leen ni escriben datos).
   Las usan api.clases (reglas) y las vistas del instructor (T3) y del cliente (T4). */

// Solo se ven y se reservan sesiones desde hoy hasta este número de días adelante
export const DIAS_MAX_INSCRIPCION = 14;

export const TIPOS_CLASE: TipoClase[] = ["RUMBA", "ZUMBA", "CORE", "FUNCIONAL", "YOGA", "OTRA"];

export const NOMBRE_TIPO_CLASE: Record<TipoClase, string> = {
  RUMBA: "Rumba",
  ZUMBA: "Zumba",
  CORE: "Core",
  FUNCIONAL: "Funcional",
  YOGA: "Yoga",
  OTRA: "Otra",
};

// 'HH:MM' → minutos desde la medianoche
export function aMinutos(hhmm: string): number {
  const [h, m] = hhmm.split(":").map(Number);
  return h * 60 + m;
}

// Minutos → 'HH:MM'
export function aHora(minutos: number): string {
  return String(Math.floor(minutos / 60)).padStart(2, "0") + ":" + String(minutos % 60).padStart(2, "0");
}

// Hora en que termina una clase ('07:00' + 45 min → '07:45')
export function horaFin(c: Pick<Clase, "hora" | "duracion_min">): string {
  return aHora(aMinutos(c.hora) + c.duracion_min);
}

// ¿Se cruzan dos franjas del mismo día? [inicio, fin) — que una termine justo cuando empieza la otra no es choque
export function seCruzan(a: Pick<Clase, "hora" | "duracion_min">, b: Pick<Clase, "hora" | "duracion_min">): boolean {
  const ia = aMinutos(a.hora);
  const ib = aMinutos(b.hora);
  return ia < ib + b.duracion_min && ib < ia + a.duracion_min;
}

// Día de la semana de una fecha 'YYYY-MM-DD' (hora local; getDay() da 0 = domingo)
export function diaSemanaDe(fecha: string): DiaSemana {
  return DIAS_ORDEN[(new Date(fecha + "T00:00:00").getDay() + 6) % 7];
}

// 'YYYY-MM-DD' de hoy + n días (hora local)
export function sumarDias(fecha: string, n: number): string {
  const d = new Date(fecha + "T00:00:00");
  d.setDate(d.getDate() + n);
  return utils.isoDate(d);
}

// Fechas en que hay sesión de una clase dentro de [desde, hasta] (las dos incluidas)
export function fechasDeClase(c: Pick<Clase, "dia_semana">, desde: string, hasta: string): string[] {
  const fechas: string[] = [];
  for (let f = desde; f <= hasta; f = sumarDias(f, 1)) {
    if (diaSemanaDe(f) === c.dia_semana) fechas.push(f);
  }
  return fechas;
}

// Último día que se puede reservar (hoy + DIAS_MAX_INSCRIPCION)
export function ultimoDiaReservable(hoy = utils.isoDate()): string {
  return sumarDias(hoy, DIAS_MAX_INSCRIPCION);
}
