import { LETRAS_SESION } from "../../lib/rutinas";
import type { Ejercicio, LetraSesion, Rutina, RutinaEjercicio, TipoMedicion } from "../../types";
import {
  ejercicioCompleto,
  permitePeso,
  serieValida,
} from "./entrenamiento";
import type {
  EjercicioEntrenamiento,
  EstadoEntrenamiento,
  SerieEntrenamiento,
} from "./entrenamiento";

export const PREFIJO_BORRADOR_ENTRENAMIENTO = "gymbrot:cliente:entrenamiento";
export const VERSION_BORRADOR_ENTRENAMIENTO = 1;

// 48 horas (dentro del rango 24-72 h): permite retomar un entrenamiento interrumpido
// por cierre accidental, batería agotada o pausa de un día al otro sin dejar borradores eternos.
export const CADUCIDAD_BORRADOR_MS = 48 * 60 * 60 * 1000;

const MARGEN_RELOJ_FUTURO_MS = 5 * 60 * 1000;
const MAX_LONGITUD_NOTAS = 300;
// Conserva también valores aún por corregir y la notación que admite input[type=number].
// Las series marcadas se validan después con el mismo validador del registro definitivo.
const PATRON_NUMERO_EDITABLE = /^[+-]?\d*(?:\.\d*)?(?:[eE][+-]?\d*)?$/;

export type AlmacenamientoBorrador = Pick<Storage, "getItem" | "setItem" | "removeItem">;

export type AmbitoBorrador = {
  gimnasioId: string;
  idCliente: string;
  idRutina: number;
};

export type SerieBorrador = {
  cantidad: string;
  peso: string;
  completada: boolean;
};

export type EjercicioBorrador = {
  id_ejercicio: number;
  orden: number;
  tipo_medicion: TipoMedicion;
  series: SerieBorrador[];
};

export type BorradorEntrenamientoV1 = {
  version: typeof VERSION_BORRADOR_ENTRENAMIENTO;
  gimnasio_id: string;
  id_cliente: string;
  id_rutina: number;
  sesion: LetraSesion;
  indice: number;
  vista: "ejercicio" | "resumen";
  notas: string;
  descansoHasta: number | null;
  updatedAt: number;
  ejercicios: EjercicioBorrador[];
};

export type ResumenBorrador = {
  ejerciciosCompletados: number;
  totalEjercicios: number;
  seriesCompletadas: number;
  totalSeries: number;
};

export type BorradorRestaurable = {
  estado: "restaurable";
  clave: string;
  sesion: LetraSesion;
  updatedAt: number;
  notas: string;
  entrenamiento: EstadoEntrenamiento;
  resumen: ResumenBorrador;
};

export type BorradorObsoleto = {
  estado: "obsoleto";
  clave: string;
  sesion: LetraSesion;
  updatedAt: number;
  motivo: string;
};

export type ResultadoBorradorRutina =
  | { estado: "ninguno" }
  | BorradorRestaurable
  | BorradorObsoleto;

function storagePorDefecto(storage?: AlmacenamientoBorrador | null): AlmacenamientoBorrador | null {
  if (storage !== undefined) return storage;
  try {
    return typeof window !== "undefined" && window.localStorage ? window.localStorage : null;
  } catch {
    return null;
  }
}

function leerItemSeguro(storage: AlmacenamientoBorrador | null, clave: string): string | null {
  if (!storage) return null;
  try {
    return storage.getItem(clave);
  } catch {
    return null;
  }
}

function escribirItemSeguro(storage: AlmacenamientoBorrador | null, clave: string, valor: string): boolean {
  if (!storage) return false;
  try {
    storage.setItem(clave, valor);
    return true;
  } catch {
    return false;
  }
}

function eliminarItemSeguro(storage: AlmacenamientoBorrador | null, clave: string): void {
  if (!storage) return;
  try {
    storage.removeItem(clave);
  } catch {
    // Si el navegador bloquea el almacenamiento, se ignora sin interrumpir la UI.
  }
}

function ambitoValido(ambito: AmbitoBorrador): boolean {
  return (
    typeof ambito.gimnasioId === "string" &&
    ambito.gimnasioId.trim().length > 0 &&
    typeof ambito.idCliente === "string" &&
    ambito.idCliente.trim().length > 0 &&
    typeof ambito.idRutina === "number" &&
    Number.isInteger(ambito.idRutina) &&
    ambito.idRutina > 0
  );
}

export function claveBorradorEntrenamiento(ambito: AmbitoBorrador, sesion: LetraSesion): string {
  return `${PREFIJO_BORRADOR_ENTRENAMIENTO}:${ambito.gimnasioId.trim()}:${ambito.idCliente.trim()}:${ambito.idRutina}:${sesion}`;
}

export function tieneProgresoEntrenamiento(estado: EstadoEntrenamiento, notas = ""): boolean {
  if (estado.modificado || estado.indice > 0 || estado.vista === "resumen" || notas.trim().length > 0) {
    return true;
  }
  return estado.ejercicios.some((e) =>
    e.series.some((s) => s.completada || s.cantidad.trim() !== ""),
  );
}

// Huella estable para autoguardado: excluye segundosRestantes del reloj para no escribir en cada tick.
export function huellaAutoguardado(estado: EstadoEntrenamiento, notas: string): string {
  const descansoHasta = estado.descanso.estado === "activo" ? estado.descanso.hasta : null;
  return JSON.stringify({
    sesion: estado.sesion,
    indice: estado.indice,
    vista: estado.vista,
    modificado: estado.modificado,
    notas,
    descansoHasta,
    ejercicios: estado.ejercicios.map((e) => ({
      id_ejercicio: e.fila.id_ejercicio,
      orden: e.fila.orden,
      series: e.series.map((s) => ({
        cantidad: s.cantidad,
        peso: s.peso,
        completada: s.completada,
      })),
    })),
  });
}

export function construirBorradorEntrenamiento(
  ambito: AmbitoBorrador,
  estado: EstadoEntrenamiento,
  notas: string,
  ahora = Date.now(),
): BorradorEntrenamientoV1 | null {
  if (!ambitoValido(ambito) || estado.ejercicios.length === 0) return null;
  return {
    version: VERSION_BORRADOR_ENTRENAMIENTO,
    gimnasio_id: ambito.gimnasioId.trim(),
    id_cliente: ambito.idCliente.trim(),
    id_rutina: ambito.idRutina,
    sesion: estado.sesion,
    indice: estado.indice,
    vista: estado.vista,
    notas: notas.slice(0, MAX_LONGITUD_NOTAS),
    descansoHasta: estado.descanso.estado === "activo" ? estado.descanso.hasta : null,
    updatedAt: ahora,
    ejercicios: estado.ejercicios.map((e) => ({
      id_ejercicio: e.fila.id_ejercicio,
      orden: e.fila.orden,
      tipo_medicion: e.ejercicio?.tipo_medicion ?? "REPETICIONES",
      series: e.series.map((s) => ({
        cantidad: s.cantidad,
        peso: permitePeso(e) ? s.peso : "",
        completada: s.completada,
      })),
    })),
  };
}

export function guardarBorradorEntrenamiento(
  ambito: AmbitoBorrador,
  estado: EstadoEntrenamiento,
  notas: string,
  opciones?: { ahora?: number; storage?: AlmacenamientoBorrador | null },
): string | null {
  if (!tieneProgresoEntrenamiento(estado, notas)) return null;
  const storage = storagePorDefecto(opciones?.storage);
  const borrador = construirBorradorEntrenamiento(ambito, estado, notas, opciones?.ahora ?? Date.now());
  if (!storage || !borrador) return null;

  const claveActiva = claveBorradorEntrenamiento(ambito, estado.sesion);
  if (!escribirItemSeguro(storage, claveActiva, JSON.stringify(borrador))) {
    return null;
  }

  // Garantiza un único borrador activo por rutina para evitar sesiones simultáneas inconsistentes.
  for (const letra of LETRAS_SESION) {
    if (letra !== estado.sesion) {
      eliminarItemSeguro(storage, claveBorradorEntrenamiento(ambito, letra));
    }
  }
  return claveActiva;
}

export function eliminarBorradorEntrenamiento(
  ambito: AmbitoBorrador,
  sesion?: LetraSesion,
  storage?: AlmacenamientoBorrador | null,
): void {
  if (!ambitoValido(ambito)) return;
  const destino = storagePorDefecto(storage);
  if (sesion) {
    eliminarItemSeguro(destino, claveBorradorEntrenamiento(ambito, sesion));
    return;
  }
  for (const letra of LETRAS_SESION) {
    eliminarItemSeguro(destino, claveBorradorEntrenamiento(ambito, letra));
  }
}

export function eliminarBorradorPorClave(clave: string, storage?: AlmacenamientoBorrador | null): void {
  eliminarItemSeguro(storagePorDefecto(storage), clave);
}

function esSerieBorradorValida(dato: unknown): dato is SerieBorrador {
  if (dato === null || typeof dato !== "object") return false;
  const s = dato as Record<string, unknown>;
  if (typeof s.completada !== "boolean") return false;
  if (typeof s.cantidad !== "string" || typeof s.peso !== "string") return false;
  if (!PATRON_NUMERO_EDITABLE.test(s.cantidad.trim()) || !PATRON_NUMERO_EDITABLE.test(s.peso.trim())) {
    return false;
  }
  return true;
}

function esEjercicioBorradorValido(dato: unknown): dato is EjercicioBorrador {
  if (dato === null || typeof dato !== "object") return false;
  const e = dato as Record<string, unknown>;
  return (
    typeof e.id_ejercicio === "number" &&
    Number.isInteger(e.id_ejercicio) &&
    e.id_ejercicio > 0 &&
    typeof e.orden === "number" &&
    Number.isInteger(e.orden) &&
    (e.tipo_medicion === "REPETICIONES" || e.tipo_medicion === "TIEMPO") &&
    Array.isArray(e.series) &&
    e.series.length > 0 &&
    e.series.every(esSerieBorradorValida)
  );
}

function validarEstructuraBorrador(
  datos: unknown,
  ambito: AmbitoBorrador,
  sesionEsperada: LetraSesion,
  ahora: number,
): BorradorEntrenamientoV1 | null {
  if (datos === null || typeof datos !== "object") return null;
  const b = datos as Record<string, unknown>;
  if (b.version !== VERSION_BORRADOR_ENTRENAMIENTO) return null;
  if (typeof b.gimnasio_id !== "string" || b.gimnasio_id !== ambito.gimnasioId.trim()) return null;
  if (typeof b.id_cliente !== "string" || b.id_cliente !== ambito.idCliente.trim()) return null;
  if (typeof b.id_rutina !== "number" || b.id_rutina !== ambito.idRutina) return null;
  if (b.sesion !== sesionEsperada || !LETRAS_SESION.includes(b.sesion as LetraSesion)) return null;
  if (typeof b.indice !== "number" || !Number.isInteger(b.indice) || b.indice < 0) return null;
  if (b.vista !== "ejercicio" && b.vista !== "resumen") return null;
  if (typeof b.notas !== "string" || b.notas.length > MAX_LONGITUD_NOTAS) return null;
  if (b.descansoHasta !== null && (typeof b.descansoHasta !== "number" || !Number.isFinite(b.descansoHasta))) {
    return null;
  }
  if (typeof b.updatedAt !== "number" || !Number.isFinite(b.updatedAt) || b.updatedAt <= 0) return null;
  if (b.updatedAt > ahora + MARGEN_RELOJ_FUTURO_MS) return null;
  if (ahora - b.updatedAt > CADUCIDAD_BORRADOR_MS) return null;
  if (!Array.isArray(b.ejercicios) || b.ejercicios.length === 0 || !b.ejercicios.every(esEjercicioBorradorValido)) {
    return null;
  }
  if (b.indice >= b.ejercicios.length) return null;

  return {
    version: VERSION_BORRADOR_ENTRENAMIENTO,
    gimnasio_id: b.gimnasio_id,
    id_cliente: b.id_cliente,
    id_rutina: b.id_rutina,
    sesion: b.sesion as LetraSesion,
    indice: b.indice,
    vista: b.vista,
    notas: b.notas,
    descansoHasta: b.descansoHasta,
    updatedAt: b.updatedAt,
    ejercicios: b.ejercicios,
  };
}

export function buscarBorradorRutina(params: {
  ambito: AmbitoBorrador;
  rutina: Pick<Rutina, "id_rutina" | "id_cliente" | "gimnasio_id">;
  vigente: boolean;
  sesiones: { sesion: LetraSesion; ejercicios: RutinaEjercicio[] }[];
  catalogo: Ejercicio[];
  ahora?: number;
  storage?: AlmacenamientoBorrador | null;
}): ResultadoBorradorRutina {
  const { ambito, rutina, vigente, sesiones, catalogo } = params;
  const ahora = params.ahora ?? Date.now();
  const storage = storagePorDefecto(params.storage);

  if (
    !storage ||
    !ambitoValido(ambito) ||
    rutina.id_rutina !== ambito.idRutina ||
    rutina.id_cliente !== ambito.idCliente.trim() ||
    rutina.gimnasio_id !== ambito.gimnasioId.trim()
  ) {
    return { estado: "ninguno" };
  }

  for (const letra of LETRAS_SESION) {
    const clave = claveBorradorEntrenamiento(ambito, letra);
    const raw = leerItemSeguro(storage, clave);
    if (!raw) continue;

    let parseado: unknown;
    try {
      parseado = JSON.parse(raw);
    } catch {
      eliminarItemSeguro(storage, clave);
      continue;
    }

    const borrador = validarEstructuraBorrador(parseado, ambito, letra, ahora);
    if (!borrador) {
      eliminarItemSeguro(storage, clave);
      continue;
    }

    if (!vigente) {
      return {
        estado: "obsoleto",
        clave,
        sesion: letra,
        updatedAt: borrador.updatedAt,
        motivo: `El borrador guardado de la sesión ${letra} ya no puede restaurarse porque tu rutina no está activa.`,
      };
    }

    const sesionActual = sesiones.find((s) => s.sesion === letra);
    if (!sesionActual || sesionActual.ejercicios.length === 0) {
      return {
        estado: "obsoleto",
        clave,
        sesion: letra,
        updatedAt: borrador.updatedAt,
        motivo: `El borrador guardado de la sesión ${letra} ya no coincide con tu rutina porque esa sesión fue modificada.`,
      };
    }

    const filasOrdenadas = [...sesionActual.ejercicios].sort((a, b) => a.orden - b.orden);
    if (filasOrdenadas.length !== borrador.ejercicios.length) {
      return {
        estado: "obsoleto",
        clave,
        sesion: letra,
        updatedAt: borrador.updatedAt,
        motivo: `El borrador de la sesión ${letra} ya no es compatible porque cambiaron los ejercicios asignados.`,
      };
    }

    const ejerciciosReconstruidos: EjercicioEntrenamiento[] = [];
    let obsoletoMotivo: string | null = null;
    let datosManipulados = false;

    for (let i = 0; i < filasOrdenadas.length; i += 1) {
      const fila = filasOrdenadas[i];
      const guardado = borrador.ejercicios[i];
      const ejercicioCatalogo = catalogo.find((e) => e.id_ejercicio === fila.id_ejercicio);
      const seriesPrescritas = Number.isSafeInteger(fila.series) && (fila.series ?? 0) > 0 ? (fila.series ?? 0) : 0;

      if (
        fila.id_ejercicio !== guardado.id_ejercicio ||
        fila.orden !== guardado.orden ||
        !ejercicioCatalogo ||
        ejercicioCatalogo.tipo_medicion !== guardado.tipo_medicion ||
        seriesPrescritas === 0 ||
        seriesPrescritas !== guardado.series.length
      ) {
        obsoletoMotivo = `El borrador de la sesión ${letra} ya no coincide con los ejercicios o series actuales de tu rutina.`;
        break;
      }

      const baseEjercicio: EjercicioEntrenamiento = {
        fila,
        ejercicio: ejercicioCatalogo,
        series: [],
      };
      const admitePeso = permitePeso(baseEjercicio);

      const seriesReconstruidas: SerieEntrenamiento[] = guardado.series.map((s) => ({
        cantidad: s.cantidad.trim(),
        peso: admitePeso ? s.peso.trim() : "",
        completada: s.completada,
      }));

      const reconstruido: EjercicioEntrenamiento = {
        fila,
        ejercicio: ejercicioCatalogo,
        series: seriesReconstruidas,
      };

      for (const s of seriesReconstruidas) {
        if (s.completada && !serieValida(s, reconstruido)) {
          datosManipulados = true;
          break;
        }
      }

      if (datosManipulados) break;
      ejerciciosReconstruidos.push(reconstruido);
    }

    if (datosManipulados) {
      eliminarItemSeguro(storage, clave);
      continue;
    }

    if (obsoletoMotivo) {
      return {
        estado: "obsoleto",
        clave,
        sesion: letra,
        updatedAt: borrador.updatedAt,
        motivo: obsoletoMotivo,
      };
    }

    const listaParaFinalizar = ejerciciosReconstruidos.length > 0 && ejerciciosReconstruidos.every(ejercicioCompleto);
    const segundosRestantes = borrador.descansoHasta !== null
      ? Math.max(0, Math.ceil((borrador.descansoHasta - ahora) / 1000))
      : 0;

    const entrenamiento: EstadoEntrenamiento = {
      sesion: letra,
      indice: borrador.indice,
      ejercicios: ejerciciosReconstruidos,
      descanso: segundosRestantes > 0 && borrador.descansoHasta !== null
        ? { estado: "activo", segundosRestantes, hasta: borrador.descansoHasta }
        : { estado: "inactivo", segundosRestantes: 0 },
      estado: listaParaFinalizar ? "lista-para-finalizar" : "en-curso",
      vista: borrador.vista === "resumen" && listaParaFinalizar ? "resumen" : "ejercicio",
      modificado: true,
    };

    const ejerciciosCompletados = ejerciciosReconstruidos.filter(ejercicioCompleto).length;
    const seriesCompletadas = ejerciciosReconstruidos.reduce(
      (total, e) => total + e.series.filter((s) => s.completada).length,
      0,
    );
    const totalSeries = ejerciciosReconstruidos.reduce((total, e) => total + e.series.length, 0);

    return {
      estado: "restaurable",
      clave,
      sesion: letra,
      updatedAt: borrador.updatedAt,
      notas: borrador.notas,
      entrenamiento,
      resumen: {
        ejerciciosCompletados,
        totalEjercicios: ejerciciosReconstruidos.length,
        seriesCompletadas,
        totalSeries,
      },
    };
  }

  return { estado: "ninguno" };
}

export function formatearTiempoRelativo(updatedAt: number, ahora = Date.now()): string {
  const diferenciaMs = Math.max(0, ahora - updatedAt);
  const minutos = Math.floor(diferenciaMs / 60000);
  if (minutos < 1) return "hace menos de 1 minuto";
  if (minutos === 1) return "hace 1 minuto";
  if (minutos < 60) return `hace ${minutos} minutos`;
  const horas = Math.floor(minutos / 60);
  if (horas === 1) return "hace 1 hora";
  if (horas < 24) return `hace ${horas} horas`;
  const dias = Math.floor(horas / 24);
  return dias === 1 ? "hace 1 día" : `hace ${dias} días`;
}
