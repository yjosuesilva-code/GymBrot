import { validarSeries } from "../../lib/rutinas";
import type { Ejercicio, EjercicioRealizado, LetraSesion, RutinaEjercicio, SerieRealizada } from "../../types";

// Estado editable de UI; se convierte al contrato T3 únicamente al preparar el registro.
export type SerieEntrenamiento = { cantidad: string; peso: string; completada: boolean };
export type EjercicioEntrenamiento = {
  fila: RutinaEjercicio;
  ejercicio: Ejercicio | undefined;
  series: SerieEntrenamiento[];
};
type Descanso =
  | { estado: "inactivo" | "terminado"; segundosRestantes: 0 }
  | { estado: "activo"; segundosRestantes: number; hasta: number };
export type EstadoEntrenamiento = {
  sesion: LetraSesion;
  indice: number;
  ejercicios: EjercicioEntrenamiento[];
  descanso: Descanso;
  estado: "en-curso" | "lista-para-finalizar";
  vista: "ejercicio" | "resumen";
  modificado: boolean;
};
export type InicioEntrenamiento = { sesion: LetraSesion; filas: RutinaEjercicio[]; catalogo: Ejercicio[] };
export type AccionEntrenamiento =
  | { tipo: "editar"; serie: number; campo: "cantidad" | "peso"; valor: string }
  | { tipo: "completar"; serie: number; ahora: number }
  | { tipo: "ir"; indice: number }
  | { tipo: "revisar" }
  | { tipo: "tick"; ahora: number }
  | { tipo: "omitir-descanso" }
  | { tipo: "cerrar-descanso" }
  | { tipo: "ampliar-descanso"; ahora: number };

function pesoInicial(fila: RutinaEjercicio): string {
  return fila.peso_kg != null && Number.isFinite(fila.peso_kg) && fila.peso_kg >= 0 ? String(fila.peso_kg) : "";
}

export function crearEntrenamiento({ sesion, filas, catalogo }: InicioEntrenamiento): EstadoEntrenamiento {
  return {
    sesion,
    indice: 0,
    ejercicios: [...filas].sort((a, b) => a.orden - b.orden).map((fila) => ({
      fila,
      ejercicio: catalogo.find((e) => e.id_ejercicio === fila.id_ejercicio),
      series: Number.isSafeInteger(fila.series) && (fila.series ?? 0) > 0
        ? Array.from({ length: fila.series ?? 0 }, () => ({
            cantidad: "",
            peso: pesoInicial(fila),
            completada: false,
          }))
        : [],
    })),
    descanso: { estado: "inactivo", segundosRestantes: 0 },
    estado: "en-curso",
    vista: "ejercicio",
    modificado: false,
  };
}

export function ejercicioRealizable(e: EjercicioEntrenamiento): boolean {
  return e.ejercicio !== undefined && e.series.length > 0;
}

export function ejercicioCompleto(e: EjercicioEntrenamiento): boolean {
  return ejercicioRealizable(e) && e.series.every((s) => s.completada);
}

export function cantidadObjetivo(e: EjercicioEntrenamiento): number | null {
  if (!e.ejercicio) return null;
  if (e.ejercicio.tipo_medicion === "TIEMPO") {
    return e.fila.segundos != null && e.fila.segundos > 0 ? e.fila.segundos : null;
  }
  const rep = e.fila.reps_max ?? e.fila.reps_min ?? null;
  return rep != null && rep > 0 ? rep : null;
}

export function permitePeso(e: EjercicioEntrenamiento): boolean {
  return e.fila.peso_kg != null || (e.ejercicio !== undefined && e.ejercicio.equipo !== "Peso corporal");
}

function convertirSerie(serie: SerieEntrenamiento, e: EjercicioEntrenamiento, numero: number): SerieRealizada {
  const cantidad = serie.cantidad.trim() === "" ? null : Number(serie.cantidad);
  const peso_kg = permitePeso(e) && serie.peso.trim() !== "" ? Number(serie.peso) : null;
  return e.ejercicio?.tipo_medicion === "TIEMPO"
    ? { numero, segundos: cantidad, peso_kg }
    : { numero, reps: cantidad, peso_kg };
}

export function serieValida(serie: SerieEntrenamiento, e: EjercicioEntrenamiento): boolean {
  return errorSerie(serie, e) === null;
}

export function errorSerie(serie: SerieEntrenamiento, e: EjercicioEntrenamiento): string | null {
  if (!e.ejercicio) return "El ejercicio no está disponible en el catálogo.";
  const error = validarSeries([convertirSerie(serie, e, 1)], e.ejercicio);
  // El grupo de campos ya identifica la serie real; la validación aislada siempre usa el número 1.
  const prefijo = `${e.ejercicio.nombre}, serie 1: `;
  return error?.startsWith(prefijo) ? error.slice(prefijo.length) : error;
}

export function detalleRealizado(e: EjercicioEntrenamiento): SerieRealizada[] {
  return e.series.filter((s) => s.completada).map((s, i) => convertirSerie(s, e, i + 1));
}

export function ejerciciosRealizados(estado: EstadoEntrenamiento): EjercicioRealizado[] {
  return estado.ejercicios.flatMap((e) => {
    const detalle_series = detalleRealizado(e);
    if (detalle_series.length === 0) return [];
    if (!e.ejercicio) throw new Error("Un ejercicio realizado ya no está disponible en el catálogo.");
    const error = validarSeries(detalle_series, e.ejercicio);
    if (error) throw new Error(error);
    return [{ id_ejercicio: e.fila.id_ejercicio, detalle_series }];
  });
}

export function progresoSesion(estado: EstadoEntrenamiento) {
  const completados = estado.ejercicios.filter(ejercicioCompleto).length;
  const total = estado.ejercicios.length;
  return {
    completados,
    total,
    porcentaje: total ? Math.round((completados / total) * 100) : 0,
  };
}

function sesionListaParaFinalizar(ejercicios: EjercicioEntrenamiento[]): boolean {
  return ejercicios.length > 0 && ejercicios.every(ejercicioCompleto);
}

function conEjercicio(
  estado: EstadoEntrenamiento,
  ejercicio: EjercicioEntrenamiento,
  cambiarVista = false,
): EstadoEntrenamiento {
  const ejercicios = estado.ejercicios.map((e, i) => (i === estado.indice ? ejercicio : e));
  const lista = sesionListaParaFinalizar(ejercicios);
  return {
    ...estado,
    ejercicios,
    modificado: true,
    estado: lista ? "lista-para-finalizar" : "en-curso",
    vista: cambiarVista && lista ? "resumen" : "ejercicio",
  };
}

// Sin efectos ni escrituras: las transiciones también permiten probar el reloj con tiempos controlados.
export function reducirEntrenamiento(estado: EstadoEntrenamiento, accion: AccionEntrenamiento): EstadoEntrenamiento {
  switch (accion.tipo) {
    case "editar": {
      const ejercicio = estado.ejercicios[estado.indice];
      const serie = ejercicio?.series[accion.serie];
      if (!ejercicio?.ejercicio || !serie || serie.completada) return estado;
      if (accion.campo === "peso" && !permitePeso(ejercicio)) return estado;
      return conEjercicio(estado, {
        ...ejercicio,
        series: ejercicio.series.map((s, i) => i === accion.serie ? { ...s, [accion.campo]: accion.valor } : s),
      });
    }
    case "completar": {
      const ejercicio = estado.ejercicios[estado.indice];
      const serie = ejercicio?.series[accion.serie];
      if (!ejercicio?.ejercicio || !serie) return estado;
      const marcando = !serie.completada;
      if (marcando && !serieValida(serie, ejercicio)) return estado;
      const pesoBase = pesoInicial(ejercicio.fila);
      const actualizado = {
        ...ejercicio,
        series: ejercicio.series.map((s, i) => {
          if (i === accion.serie) return { ...s, completada: marcando };
          if (marcando && i === accion.serie + 1 && !s.completada && permitePeso(ejercicio) && s.peso === pesoBase) {
            return { ...s, peso: serie.peso };
          }
          return s;
        }),
      };
      const siguiente = conEjercicio(estado, actualizado, marcando);
      const segundos = ejercicio.fila.descanso_seg;
      const descansar = marcando && accion.serie < ejercicio.series.length - 1 && !ejercicioCompleto(actualizado)
        && segundos != null && Number.isFinite(segundos) && segundos > 0;
      return {
        ...siguiente,
        descanso: descansar
          ? { estado: "activo", segundosRestantes: Math.ceil(segundos), hasta: accion.ahora + segundos * 1000 }
          : { estado: "inactivo", segundosRestantes: 0 },
      };
    }
    case "ir":
      if (!Number.isInteger(accion.indice) || accion.indice < 0 || accion.indice >= estado.ejercicios.length) return estado;
      return { ...estado, indice: accion.indice, vista: "ejercicio", descanso: { estado: "inactivo", segundosRestantes: 0 } };
    case "revisar":
      return estado.estado === "lista-para-finalizar"
        ? { ...estado, vista: "resumen", descanso: { estado: "inactivo", segundosRestantes: 0 } }
        : estado;
    case "tick": {
      if (estado.descanso.estado !== "activo") return estado;
      const segundosRestantes = Math.max(0, Math.ceil((estado.descanso.hasta - accion.ahora) / 1000));
      return {
        ...estado,
        descanso: segundosRestantes > 0
          ? { ...estado.descanso, segundosRestantes }
          : { estado: "terminado", segundosRestantes: 0 },
      };
    }
    case "omitir-descanso":
      return { ...estado, descanso: { estado: "terminado", segundosRestantes: 0 } };
    case "cerrar-descanso":
      return { ...estado, descanso: { estado: "inactivo", segundosRestantes: 0 } };
    case "ampliar-descanso": {
      if (estado.descanso.estado !== "activo") return estado;
      const hasta = Math.max(estado.descanso.hasta, accion.ahora) + 15000;
      return { ...estado, descanso: { estado: "activo", hasta, segundosRestantes: Math.ceil((hasta - accion.ahora) / 1000) } };
    }
  }
}
