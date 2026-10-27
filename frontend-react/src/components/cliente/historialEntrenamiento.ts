import { resumirSeries } from "../../lib/rutinas";
import type {
  Ejercicio,
  EjercicioRealizado,
  EquipoEjercicio,
  GrupoMuscular,
  LetraSesion,
  NivelEjercicio,
  RegistroEntrenamiento,
  SerieRealizada,
  TipoMedicion,
} from "../../types";

export type AmbitoHistorialCliente = {
  gimnasioId: string;
  idCliente: string;
  idRutina: number;
};

export type ResumenEjercicioRealizadoOficial = {
  series: number | null;
  reps: number | null;
  segundos: number | null;
  peso_kg: number | null;
  tieneDetalle: boolean;
  detalle_series: SerieRealizada[];
};

export type InfoEjercicioHistorial = {
  id_ejercicio: number;
  nombre: string;
  grupo_muscular: GrupoMuscular | null;
  equipo: EquipoEjercicio | null;
  nivel: NivelEjercicio | null;
  tipo_medicion: TipoMedicion | null;
  recurso_url: string;
  enCatalogo: boolean;
  ejercicio?: Ejercicio;
};

export type OpcionEjercicioHistorial = {
  info: InfoEjercicioHistorial;
  apariciones: number;
  ultimaFecha: string;
  sesiones: LetraSesion[];
};

export type MetricaEvolucion = "PESO" | "SEGUNDOS" | "REPETICIONES" | "SIN_DATOS";

export type PuntoEvolucionEjercicio = {
  id_registro: number;
  fecha: string;
  sesion: LetraSesion;
  notasSesion: string;
  series: number | null;
  reps: number | null;
  segundos: number | null;
  peso_kg: number | null;
  tieneDetalle: boolean;
  detalle_series: SerieRealizada[];
  valorMetrica: number | null;
  etiquetaValor: string;
  contextoSecundario: string;
  resumenTexto: string;
};

export type EvolucionEjercicioResultado = {
  info: InfoEjercicioHistorial;
  metrica: MetricaEvolucion;
  unidad: string;
  tituloMetrica: string;
  explicacionMetrica: string;
  sesiones: LetraSesion[];
  puntosAsc: PuntoEvolucionEjercicio[];
  puntosDesc: PuntoEvolucionEjercicio[];
  puntosGraficables: PuntoEvolucionEjercicio[];
  suficientesParaComparar: boolean;
  tieneAlgunoSinDetalle: boolean;
  tieneAlgunoSinCarga: boolean;
  primero: PuntoEvolucionEjercicio | null;
  ultimo: PuntoEvolucionEjercicio | null;
  maximo: PuntoEvolucionEjercicio | null;
};

function formatearNumero(n: number): string {
  return Number.isInteger(n) ? String(n) : String(Math.round(n * 100) / 100);
}

/**
 * Filtra los registros para asegurar que pertenezcan exclusivamente al gimnasio,
 * cliente y rutina autorizados, y los ordena explícitamente del más reciente al más antiguo.
 */
export function filtrarYOrdenarRegistrosRutina(
  registros: RegistroEntrenamiento[],
  ambito: AmbitoHistorialCliente,
): RegistroEntrenamiento[] {
  if (!Array.isArray(registros)) return [];
  return registros
    .filter(
      (r) =>
        r !== null &&
        typeof r === "object" &&
        r.gimnasio_id === ambito.gimnasioId &&
        r.id_cliente === ambito.idCliente &&
        r.id_rutina === ambito.idRutina &&
        typeof r.fecha === "string",
    )
    .slice()
    .sort((a, b) => b.fecha.localeCompare(a.fecha) || b.id_registro - a.id_registro);
}

/**
 * Resuelve la metadata de un ejercicio en el catálogo o devuelve un fallback seguro
 * ("Ejercicio #19") cuando el ejercicio ya no existe en el catálogo.
 */
export function resolverEjercicioHistorial(
  idEjercicio: number,
  catalogo: Ejercicio[],
): InfoEjercicioHistorial {
  const encontrado = catalogo.find((e) => e.id_ejercicio === idEjercicio);
  if (encontrado) {
    return {
      id_ejercicio: encontrado.id_ejercicio,
      nombre: encontrado.nombre,
      grupo_muscular: encontrado.grupo_muscular,
      equipo: encontrado.equipo,
      nivel: encontrado.nivel,
      tipo_medicion: encontrado.tipo_medicion,
      recurso_url: encontrado.recurso_url,
      enCatalogo: true,
      ejercicio: encontrado,
    };
  }
  return {
    id_ejercicio: idEjercicio,
    nombre: `Ejercicio #${idEjercicio}`,
    grupo_muscular: null,
    equipo: null,
    nivel: null,
    tipo_medicion: null,
    recurso_url: "",
    enCatalogo: false,
    ejercicio: undefined,
  };
}

/**
 * Obtiene el resumen oficial de un EjercicioRealizado.
 * Si la API ya guardó los campos resumen (series, reps, segundos, peso_kg), los respeta
 * sin recalcular una fórmula distinta; si solo viene detalle_series, usa resumirSeries().
 */
export function resumenOficialEjercicioRealizado(
  realizado: EjercicioRealizado,
): ResumenEjercicioRealizadoOficial {
  const detalle = Array.isArray(realizado.detalle_series)
    ? realizado.detalle_series
        .filter((s) => s !== null && typeof s === "object" && Number.isFinite(s.numero))
        .slice()
        .sort((a, b) => a.numero - b.numero)
    : [];
  const tieneDetalle = detalle.length > 0;
  const tieneResumenGuardado =
    realizado.series !== undefined ||
    realizado.reps !== undefined ||
    realizado.segundos !== undefined ||
    realizado.peso_kg !== undefined;

  if (tieneResumenGuardado) {
    return {
      series: realizado.series ?? (tieneDetalle ? detalle.length : null),
      reps: realizado.reps ?? null,
      segundos: realizado.segundos ?? null,
      peso_kg: realizado.peso_kg ?? null,
      tieneDetalle,
      detalle_series: detalle,
    };
  }

  if (tieneDetalle) {
    const calculado = resumirSeries(detalle);
    return {
      series: calculado.series ?? detalle.length,
      reps: calculado.reps ?? null,
      segundos: calculado.segundos ?? null,
      peso_kg: calculado.peso_kg ?? null,
      tieneDetalle: true,
      detalle_series: detalle,
    };
  }

  return {
    series: null,
    reps: null,
    segundos: null,
    peso_kg: null,
    tieneDetalle: false,
    detalle_series: [],
  };
}

/**
 * Formatea una serie individual ("12 reps · 20 kg", "45 s · Peso corporal", etc.).
 */
export function formatoSerieRealizada(
  serie: SerieRealizada,
  ejercicio?: Pick<Ejercicio, "tipo_medicion" | "equipo">,
): string {
  const partes: string[] = [];
  const porTiempo =
    ejercicio?.tipo_medicion === "TIEMPO" || (serie.segundos != null && serie.reps == null);

  if (porTiempo && serie.segundos != null) {
    partes.push(`${formatearNumero(serie.segundos)} s`);
  } else if (serie.reps != null) {
    partes.push(`${formatearNumero(serie.reps)} ${serie.reps === 1 ? "rep" : "reps"}`);
  } else if (serie.segundos != null) {
    partes.push(`${formatearNumero(serie.segundos)} s`);
  }

  if (serie.peso_kg != null) {
    partes.push(`${formatearNumero(serie.peso_kg)} kg`);
  } else if (serie.peso_kg === null) {
    partes.push("Peso corporal");
  } else {
    partes.push("Carga no registrada");
  }

  return partes.join(" · ") || "Sin datos";
}

/**
 * Formatea el resumen de un EjercicioRealizado de forma consistente con T3/T4.
 * Nunca convierte peso_kg null en 0 kg.
 */
export function formatoRealizado(
  realizado: EjercicioRealizado,
  ejercicio?: Pick<Ejercicio, "tipo_medicion" | "equipo">,
): string {
  const res = resumenOficialEjercicioRealizado(realizado);
  const partes: string[] = [];

  if (res.series != null && res.series > 0) {
    partes.push(`${res.series} ${res.series === 1 ? "serie" : "series"}`);
  }

  const porTiempo =
    ejercicio?.tipo_medicion === "TIEMPO" || (res.segundos != null && res.reps == null);

  if (porTiempo && res.segundos != null) {
    partes.push(`máx. ${formatearNumero(res.segundos)} s`);
  } else if (res.reps != null) {
    partes.push(`${formatearNumero(res.reps)} ${res.reps === 1 ? "rep" : "reps"}`);
  } else if (res.segundos != null) {
    partes.push(`${formatearNumero(res.segundos)} s`);
  }

  if (res.peso_kg != null) {
    partes.push(`${porTiempo ? "carga resumen: " : ""}${formatearNumero(res.peso_kg)} kg`);
  } else if (realizado.peso_kg === null || (res.tieneDetalle && res.detalle_series.every((s) => s.peso_kg === null))) {
    partes.push("Peso corporal");
  }

  return partes.join(" · ") || "Registro sin valores detallados";
}

/**
 * Extrae la lista de ejercicios realizados al menos una vez en los registros de la rutina.
 */
export function extraerEjerciciosConHistorial(
  registros: RegistroEntrenamiento[],
  catalogo: Ejercicio[],
): OpcionEjercicioHistorial[] {
  const mapa = new Map<
    number,
    { apariciones: number; ultimaFecha: string; sesiones: Set<LetraSesion> }
  >();

  for (const reg of registros) {
    if (!Array.isArray(reg.ejercicios_realizados)) continue;
    for (const ej of reg.ejercicios_realizados) {
      if (!ej || typeof ej.id_ejercicio !== "number") continue;
      const actual = mapa.get(ej.id_ejercicio);
      if (!actual) {
        mapa.set(ej.id_ejercicio, {
          apariciones: 1,
          ultimaFecha: reg.fecha,
          sesiones: new Set([reg.sesion]),
        });
      } else {
        actual.apariciones += 1;
        if (reg.fecha > actual.ultimaFecha) actual.ultimaFecha = reg.fecha;
        actual.sesiones.add(reg.sesion);
      }
    }
  }

  const ordenSesiones: LetraSesion[] = ["A", "B", "C", "D"];
  const lista: OpcionEjercicioHistorial[] = [];
  mapa.forEach((datos, idEjercicio) => {
    const info = resolverEjercicioHistorial(idEjercicio, catalogo);
    const sesiones = ordenSesiones.filter((s) => datos.sesiones.has(s));
    lista.push({
      info,
      apariciones: datos.apariciones,
      ultimaFecha: datos.ultimaFecha,
      sesiones,
    });
  });

  return lista.sort(
    (a, b) =>
      b.apariciones - a.apariciones ||
      b.ultimaFecha.localeCompare(a.ultimaFecha) ||
      a.info.nombre.localeCompare(b.info.nombre),
  );
}

/**
 * Construye la evolución cronológica de un ejercicio específico dentro de la rutina.
 * - Usa peso_kg resumen oficial cuando existe al menos un registro con carga numérica (en ejercicios de repeticiones).
 * - Para ejercicios sin peso (peso_kg null), nunca inventa 0 kg: muestra evolución de repeticiones o segundos.
 * - Para ejercicios por TIEMPO, usa segundos como métrica principal e informa la carga si existe.
 */
export function construirEvolucionEjercicio(
  registros: RegistroEntrenamiento[],
  idEjercicio: number,
  catalogo: Ejercicio[],
): EvolucionEjercicioResultado {
  const info = resolverEjercicioHistorial(idEjercicio, catalogo);
  const registrosAsc = registros
    .slice()
    .sort((a, b) => a.fecha.localeCompare(b.fecha) || a.id_registro - b.id_registro);

  const observaciones: Array<{
    reg: RegistroEntrenamiento;
    res: ResumenEjercicioRealizadoOficial;
    realizado: EjercicioRealizado;
  }> = [];

  const sesionesSet = new Set<LetraSesion>();

  for (const reg of registrosAsc) {
    if (!Array.isArray(reg.ejercicios_realizados)) continue;
    const realizado = reg.ejercicios_realizados.find((e) => e.id_ejercicio === idEjercicio);
    if (!realizado) continue;
    sesionesSet.add(reg.sesion);
    observaciones.push({
      reg,
      res: resumenOficialEjercicioRealizado(realizado),
      realizado,
    });
  }

  const esTiempo =
    info.tipo_medicion === "TIEMPO" ||
    (info.tipo_medicion === null &&
      observaciones.some((o) => o.res.segundos != null && o.res.reps == null));
  const modalidadCompatible = (res: ResumenEjercicioRealizadoOficial) =>
    esTiempo ? res.reps === null : res.segundos === null;
  const compatibles = observaciones.filter((o) => modalidadCompatible(o.res));
  const tieneAlgunPeso = compatibles.some((o) => o.res.peso_kg != null);
  const tieneAlgunSegundo = compatibles.some((o) => o.res.segundos != null);
  const tieneAlgunaRep = compatibles.some((o) => o.res.reps != null);

  let metrica: MetricaEvolucion = "SIN_DATOS";
  let unidad = "";
  let tituloMetrica = "Sin métrica registrada";
  let explicacionMetrica =
    "Los registros de este ejercicio no incluyen valores numéricos de peso, repeticiones ni tiempo.";

  if (esTiempo && tieneAlgunSegundo) {
    metrica = "SEGUNDOS";
    unidad = "s";
    tituloMetrica = "Duración por serie (segundos)";
    explicacionMetrica = tieneAlgunPeso
      ? "Se muestra la serie de mayor duración de cada entrenamiento. El peso se indica cuando está guardado en esa misma serie."
      : "Se muestra la serie de mayor duración de cada entrenamiento, sin carga externa registrada.";
  } else if (tieneAlgunPeso) {
    metrica = "PESO";
    unidad = "kg";
    tituloMetrica = "Peso registrado (kg)";
    explicacionMetrica =
      "Se muestra el peso guardado en el resumen de cada entrenamiento: la serie de mayor carga y sus repeticiones.";
  } else if (tieneAlgunaRep) {
    metrica = "REPETICIONES";
    unidad = "reps";
    tituloMetrica = "Repeticiones registradas";
    explicacionMetrica =
      info.equipo === "Peso corporal"
        ? "Ejercicio de peso corporal, sin carga externa. Se comparan las repeticiones guardadas en el resumen de cada entrenamiento."
        : "No se registró carga en kg para este ejercicio. Se muestra la evolución de repeticiones.";
  } else if (tieneAlgunSegundo) {
    metrica = "SEGUNDOS";
    unidad = "s";
    tituloMetrica = "Duración por serie (segundos)";
    explicacionMetrica = "Se muestra el máximo de segundos registrado en cada sesión.";
  }

  const puntosAsc: PuntoEvolucionEjercicio[] = observaciones.map(({ reg, res, realizado }) => {
    let valorMetrica: number | null = null;
    let etiquetaValor = "Sin dato";
    const partesContexto: string[] = [];

    if (res.series != null && res.series > 0) {
      partesContexto.push(`${res.series} ${res.series === 1 ? "serie" : "series"}`);
    }

    if (!modalidadCompatible(res)) {
      etiquetaValor = "Modalidad distinta";
      partesContexto.push(formatoRealizado(realizado));
    } else if (metrica === "PESO") {
      valorMetrica = res.peso_kg;
      etiquetaValor =
        res.peso_kg != null ? `${formatearNumero(res.peso_kg)} kg` : "Sin carga registrada";
      if (res.reps != null) {
        partesContexto.push(`${formatearNumero(res.reps)} ${res.reps === 1 ? "rep" : "reps"}`);
      } else if (res.segundos != null) {
        partesContexto.push(`${formatearNumero(res.segundos)} s`);
      }
    } else if (metrica === "SEGUNDOS") {
      valorMetrica = res.segundos;
      etiquetaValor =
        res.segundos != null ? `${formatearNumero(res.segundos)} s` : "Sin duración registrada";
      // El máximo de segundos y el máximo de peso del resumen pueden venir de series distintas.
      const serieDuracion = res.detalle_series.find((s) => s.segundos === res.segundos);
      if (serieDuracion) {
        partesContexto.push(serieDuracion.peso_kg != null
          ? `${formatearNumero(serieDuracion.peso_kg)} kg`
          : serieDuracion.peso_kg === null ? "Peso corporal" : "Carga no registrada");
      } else if (res.peso_kg != null) {
        partesContexto.push(`Carga resumen: ${formatearNumero(res.peso_kg)} kg (sin asociación a esta duración)`);
      }
    } else if (metrica === "REPETICIONES") {
      valorMetrica = res.reps;
      etiquetaValor =
        res.reps != null
          ? `${formatearNumero(res.reps)} ${res.reps === 1 ? "rep" : "reps"}`
          : "Sin repeticiones registradas";
      partesContexto.push(
        realizado.peso_kg === null || (res.tieneDetalle && res.detalle_series.every((s) => s.peso_kg === null))
          ? "Peso corporal" : "Sin carga registrada",
      );
    }

    return {
      id_registro: reg.id_registro,
      fecha: reg.fecha,
      sesion: reg.sesion,
      notasSesion: reg.notas ?? "",
      series: res.series,
      reps: res.reps,
      segundos: res.segundos,
      peso_kg: res.peso_kg,
      tieneDetalle: res.tieneDetalle,
      detalle_series: res.detalle_series,
      valorMetrica,
      etiquetaValor,
      contextoSecundario: partesContexto.join(" · "),
      resumenTexto: formatoRealizado(realizado, info.ejercicio),
    };
  });

  const puntosGraficables = puntosAsc.filter((p) => p.valorMetrica !== null);
  const primero = puntosGraficables[0] ?? null;
  const ultimo = puntosGraficables[puntosGraficables.length - 1] ?? null;

  let maximo: PuntoEvolucionEjercicio | null = null;
  for (const p of puntosGraficables) {
    if (!maximo) {
      maximo = p;
      continue;
    }
    const valActual = p.valorMetrica ?? -Infinity;
    const valMax = maximo.valorMetrica ?? -Infinity;
    if (valActual > valMax) {
      maximo = p;
    } else if (valActual === valMax) {
      const desempateActual = metrica === "PESO" ? (p.reps ?? 0) : 0;
      const desempateMax = metrica === "PESO" ? (maximo.reps ?? 0) : 0;
      if (desempateActual >= desempateMax) {
        maximo = p;
      }
    }
  }

  const ordenSesiones: LetraSesion[] = ["A", "B", "C", "D"];
  return {
    info,
    metrica,
    unidad,
    tituloMetrica,
    explicacionMetrica,
    sesiones: ordenSesiones.filter((s) => sesionesSet.has(s)),
    puntosAsc,
    puntosDesc: puntosAsc.slice().reverse(),
    puntosGraficables,
    suficientesParaComparar: puntosGraficables.length >= 2,
    tieneAlgunoSinDetalle: puntosAsc.some((p) => !p.tieneDetalle),
    tieneAlgunoSinCarga: metrica === "PESO" && puntosAsc.some((p) => p.peso_kg === null),
    primero,
    ultimo,
    maximo,
  };
}
