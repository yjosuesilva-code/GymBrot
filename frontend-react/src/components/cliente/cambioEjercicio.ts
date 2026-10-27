import { MAX_PESO_KG, MAX_REPS, MAX_SEGUNDOS, normalizar } from "../../lib/rutinas";
import type {
  Ejercicio,
  EquipoEjercicio,
  GrupoMuscular,
  LetraSesion,
  NivelEjercicio,
  RutinaEjercicio,
  SesionEjercicioNuevo,
} from "../../types";

export type ModoCambioEjercicio =
  | { tipo: "reemplazar"; sesion: LetraSesion; filaAnterior: RutinaEjercicio; ejercicioAnterior?: Ejercicio }
  | { tipo: "agregar"; sesion: LetraSesion };

export type OrigenPrescripcionCliente = "conservada" | "sugerida-catalogo";

export type FormularioPrescripcionCliente = {
  series: string;
  repsMin: string;
  repsMax: string;
  segundos: string;
  pesoKg: string;
  descansoSeg: string;
  origen: OrigenPrescripcionCliente;
};

export type FiltrosCatalogoCliente = {
  excluidos: number[];
  busqueda?: string;
  grupo?: GrupoMuscular | "";
  nivel?: NivelEjercicio | "";
  equipo?: EquipoEjercicio | "";
};

export function ejerciciosExcluidosEnSesion(
  filasSesion: Pick<RutinaEjercicio, "id_ejercicio">[],
  idEjercicioAnterior?: number,
): number[] {
  const ids = new Set<number>();
  for (const f of filasSesion) {
    ids.add(f.id_ejercicio);
  }
  if (idEjercicioAnterior !== undefined) {
    ids.add(idEjercicioAnterior);
  }
  return [...ids];
}

export function filtrarCatalogoCliente(
  catalogo: Ejercicio[],
  filtros: FiltrosCatalogoCliente,
): Ejercicio[] {
  const q = normalizar(filtros.busqueda ?? "");
  const grupo = filtros.grupo ?? "";
  const nivel = filtros.nivel ?? "";
  const equipo = filtros.equipo ?? "";
  const excluidos = new Set(filtros.excluidos);

  return catalogo.filter((e) => {
    if (e.estado !== "ACTIVO") return false;
    if (excluidos.has(e.id_ejercicio)) return false;
    if (grupo !== "" && e.grupo_muscular !== grupo) return false;
    if (nivel !== "" && e.nivel !== nivel) return false;
    if (equipo !== "" && e.equipo !== equipo) return false;
    if (q !== "" && !normalizar(`${e.nombre} ${e.grupo_muscular} ${e.equipo} ${e.nivel}`).includes(q)) {
      return false;
    }
    return true;
  });
}

export function prescripcionInicialCambio(
  modo: ModoCambioEjercicio,
  nuevoEjercicio: Ejercicio,
): FormularioPrescripcionCliente {
  const porTiempo = nuevoEjercicio.tipo_medicion === "TIEMPO";
  const admitePeso = nuevoEjercicio.equipo !== "Peso corporal";

  if (modo.tipo === "reemplazar") {
    const ant = modo.filaAnterior;
    const seriesBase = ant.series != null && ant.series > 0 ? ant.series : (nuevoEjercicio.series_sugeridas ?? 3);
    const descansoBase = ant.descanso_seg != null && ant.descanso_seg >= 0
      ? ant.descanso_seg
      : (porTiempo ? 30 : 60);
    const pesoBase = admitePeso && ant.peso_kg != null && ant.peso_kg >= 0 ? String(ant.peso_kg) : "";

    if (porTiempo && ant.segundos != null && ant.segundos > 0) {
      return {
        series: String(seriesBase),
        repsMin: "",
        repsMax: "",
        segundos: String(ant.segundos),
        pesoKg: pesoBase,
        descansoSeg: String(descansoBase),
        origen: "conservada",
      };
    }

    if (!porTiempo && (ant.reps_min != null || ant.reps_max != null)) {
      const min = ant.reps_min ?? ant.reps_max ?? nuevoEjercicio.repeticiones_min_sugeridas ?? 10;
      const max = ant.reps_max ?? ant.reps_min ?? nuevoEjercicio.repeticiones_max_sugeridas ?? min;
      return {
        series: String(seriesBase),
        repsMin: String(min),
        repsMax: String(max),
        segundos: "",
        pesoKg: pesoBase,
        descansoSeg: String(descansoBase),
        origen: "conservada",
      };
    }

    return {
      series: String(seriesBase),
      repsMin: porTiempo ? "" : String(nuevoEjercicio.repeticiones_min_sugeridas ?? 10),
      repsMax: porTiempo ? "" : String(nuevoEjercicio.repeticiones_max_sugeridas ?? nuevoEjercicio.repeticiones_min_sugeridas ?? 12),
      segundos: porTiempo ? String(nuevoEjercicio.segundos_sugeridos ?? 30) : "",
      pesoKg: "",
      descansoSeg: String(descansoBase),
      origen: "sugerida-catalogo",
    };
  }

  const minSug = nuevoEjercicio.repeticiones_min_sugeridas ?? 10;
  const maxSug = nuevoEjercicio.repeticiones_max_sugeridas ?? minSug;
  return {
    series: String(nuevoEjercicio.series_sugeridas ?? 3),
    repsMin: porTiempo ? "" : String(minSug),
    repsMax: porTiempo ? "" : String(Math.max(minSug, maxSug)),
    segundos: porTiempo ? String(nuevoEjercicio.segundos_sugeridos ?? 30) : "",
    pesoKg: "",
    descansoSeg: porTiempo ? "30" : "60",
    origen: "sugerida-catalogo",
  };
}

function esEnteroEnRango(valor: string, min: number, max: number): boolean {
  const limpio = valor.trim();
  if (!/^\d+$/.test(limpio)) return false;
  const n = Number(limpio);
  return Number.isSafeInteger(n) && n >= min && n <= max;
}

export function validarFormularioPrescripcion(
  form: FormularioPrescripcionCliente,
  ejercicio: Ejercicio,
): string | null {
  if (!esEnteroEnRango(form.series, 1, 20)) {
    return "Las series deben ser un número entero entre 1 y 20.";
  }

  if (ejercicio.tipo_medicion === "TIEMPO") {
    if (!esEnteroEnRango(form.segundos, 1, MAX_SEGUNDOS)) {
      return `La duración por serie debe ser un entero entre 1 y ${MAX_SEGUNDOS} segundos.`;
    }
  } else {
    if (!esEnteroEnRango(form.repsMin, 1, MAX_REPS) || !esEnteroEnRango(form.repsMax, 1, MAX_REPS)) {
      return `El rango de repeticiones debe estar entre 1 y ${MAX_REPS}.`;
    }
    if (Number(form.repsMin) > Number(form.repsMax)) {
      return "Las repeticiones mínimas no pueden superar a las máximas.";
    }
  }

  const pesoLimpio = form.pesoKg.trim();
  if (pesoLimpio !== "" && ejercicio.equipo !== "Peso corporal") {
    const peso = Number(pesoLimpio);
    if (!Number.isFinite(peso) || peso < 0 || peso > MAX_PESO_KG) {
      return `El peso debe estar entre 0 y ${MAX_PESO_KG} kg.`;
    }
  }

  const descansoLimpio = form.descansoSeg.trim();
  if (descansoLimpio !== "") {
    if (!esEnteroEnRango(descansoLimpio, 0, MAX_SEGUNDOS)) {
      return `El descanso debe ser un entero entre 0 y ${MAX_SEGUNDOS} segundos.`;
    }
  }

  return null;
}

export function construirSesionEjercicioCliente(
  modo: ModoCambioEjercicio,
  nuevoEjercicio: Ejercicio,
  form: FormularioPrescripcionCliente,
  totalEnSesion: number,
): SesionEjercicioNuevo {
  const error = validarFormularioPrescripcion(form, nuevoEjercicio);
  if (error) throw new Error(error);

  if (modo.tipo === "reemplazar" && modo.filaAnterior.id_ejercicio === nuevoEjercicio.id_ejercicio) {
    throw new Error("Elige un ejercicio diferente al que deseas reemplazar.");
  }

  const porTiempo = nuevoEjercicio.tipo_medicion === "TIEMPO";
  const admitePeso = nuevoEjercicio.equipo !== "Peso corporal";
  const pesoLimpio = form.pesoKg.trim();
  const descansoLimpio = form.descansoSeg.trim();

  return {
    id_ejercicio: nuevoEjercicio.id_ejercicio,
    sesion: modo.sesion,
    orden: modo.tipo === "reemplazar" ? modo.filaAnterior.orden : totalEnSesion + 1,
    series: Number(form.series.trim()),
    reps_min: porTiempo ? null : Number(form.repsMin.trim()),
    reps_max: porTiempo ? null : Number(form.repsMax.trim()),
    segundos: porTiempo ? Number(form.segundos.trim()) : null,
    peso_kg: admitePeso && pesoLimpio !== "" ? Number(pesoLimpio) : null,
    descanso_seg: descansoLimpio !== "" ? Number(descansoLimpio) : null,
    notas_instructor: "",
  };
}
