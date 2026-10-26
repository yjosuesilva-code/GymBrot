import type { Ejercicio, LetraSesion, RutinaEjercicio } from "../../types";

// Estado de UI por serie. EjercicioRealizado resume un ejercicio y no conserva este detalle.
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
  | { tipo: "ampliar-descanso"; ahora: number };

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
            peso: fila.peso_kg != null && Number.isFinite(fila.peso_kg) && fila.peso_kg >= 0 ? String(fila.peso_kg) : "",
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

export function serieValida(serie: SerieEntrenamiento, conPeso: boolean): boolean {
  const cantidad = Number(serie.cantidad);
  const peso = Number(serie.peso);
  return serie.cantidad.trim() !== "" && Number.isSafeInteger(cantidad) && cantidad > 0
    && (!conPeso || serie.peso.trim() === "" || (Number.isFinite(peso) && peso >= 0));
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
      if (marcando && !serieValida(serie, permitePeso(ejercicio))) return estado;
      const actualizado = { ...ejercicio, series: ejercicio.series.map((s, i) => i === accion.serie ? { ...s, completada: marcando } : s) };
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
    case "ampliar-descanso": {
      if (estado.descanso.estado !== "activo") return estado;
      const hasta = Math.max(estado.descanso.hasta, accion.ahora) + 15000;
      return { ...estado, descanso: { estado: "activo", hasta, segundosRestantes: Math.ceil((hasta - accion.ahora) / 1000) } };
    }
  }
}
