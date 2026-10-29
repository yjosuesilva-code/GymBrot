import { utils } from "../../lib/utils";
import type { Progreso } from "../../types";

export type MetricaProgreso = "PESO" | "GRASA";

export type PuntoGraficoProgreso = {
  id_progreso: number;
  fecha: string;
  etiquetaFecha: string;
  valor: number;
  etiquetaValor: string;
};

export type ResumenFisicoCliente = {
  totalMediciones: number;
  ultimaMedicion: Progreso;
  primeraMedicion: Progreso;
  ultimoPesoKg: number;
  diferenciaPesoKg: number | null;
  etiquetaDiferenciaPeso: string | null;
  ultimaGrasaPorcentaje: number | null;
  ultimaMasaMuscular: number | null;
  fechaUltimaMedicion: string;
};

export function ordenarMedicionesCronologico(mediciones: Progreso[]): Progreso[] {
  if (!Array.isArray(mediciones)) return [];
  return [...mediciones].sort((a, b) => {
    const cmpFecha = a.fecha.localeCompare(b.fecha);
    if (cmpFecha !== 0) return cmpFecha;
    return a.id_progreso - b.id_progreso;
  });
}

export function ordenarMedicionesReciente(mediciones: Progreso[]): Progreso[] {
  if (!Array.isArray(mediciones)) return [];
  return [...mediciones].sort((a, b) => {
    const cmpFecha = b.fecha.localeCompare(a.fecha);
    if (cmpFecha !== 0) return cmpFecha;
    return b.id_progreso - a.id_progreso;
  });
}

export function calcularResumenFisico(mediciones: Progreso[]): ResumenFisicoCliente | null {
  if (!Array.isArray(mediciones) || mediciones.length === 0) return null;

  const asc = ordenarMedicionesCronologico(mediciones);
  const primera = asc[0];
  const ultima = asc[asc.length - 1];
  if (!primera || !ultima) return null;

  let diferenciaPesoKg: number | null = null;
  let etiquetaDiferenciaPeso: string | null = null;

  if (asc.length > 1 && Number.isFinite(primera.peso) && Number.isFinite(ultima.peso)) {
    const dif = Number((ultima.peso - primera.peso).toFixed(2));
    diferenciaPesoKg = dif;
    if (dif > 0) {
      etiquetaDiferenciaPeso = `+${dif.toFixed(1)} kg`;
    } else if (dif < 0) {
      etiquetaDiferenciaPeso = `${dif.toFixed(1)} kg`;
    } else {
      etiquetaDiferenciaPeso = "0.0 kg";
    }
  }

  const ultimaGrasaPorcentaje =
    typeof ultima.porcentaje_grasa === "number" && Number.isFinite(ultima.porcentaje_grasa)
      ? ultima.porcentaje_grasa
      : null;

  const ultimaMasaMuscular =
    typeof ultima.masa_muscular === "number" && Number.isFinite(ultima.masa_muscular)
      ? ultima.masa_muscular
      : null;

  return {
    totalMediciones: asc.length,
    ultimaMedicion: ultima,
    primeraMedicion: primera,
    ultimoPesoKg: ultima.peso,
    diferenciaPesoKg,
    etiquetaDiferenciaPeso,
    ultimaGrasaPorcentaje,
    ultimaMasaMuscular,
    fechaUltimaMedicion: ultima.fecha,
  };
}

export function determinarMetricasDisponibles(mediciones: Progreso[]): MetricaProgreso[] {
  if (!Array.isArray(mediciones) || mediciones.length === 0) return [];

  const disponibles: MetricaProgreso[] = [];
  const tienePeso = mediciones.some((m) => typeof m.peso === "number" && Number.isFinite(m.peso));
  if (tienePeso) disponibles.push("PESO");

  const tieneGrasa = mediciones.some(
    (m) => typeof m.porcentaje_grasa === "number" && Number.isFinite(m.porcentaje_grasa),
  );
  if (tieneGrasa) disponibles.push("GRASA");

  return disponibles;
}

export function obtenerPuntosGrafico(
  mediciones: Progreso[],
  metrica: MetricaProgreso,
): PuntoGraficoProgreso[] {
  if (!Array.isArray(mediciones) || mediciones.length === 0) return [];

  const asc = ordenarMedicionesCronologico(mediciones);
  const puntos: PuntoGraficoProgreso[] = [];

  // Detectar si hay fechas repetidas para desambiguar la etiqueta en la gráfica
  const fechasVistas = new Set<string>();
  const fechasRepetidas = new Set<string>();
  for (const m of asc) {
    if (fechasVistas.has(m.fecha)) {
      fechasRepetidas.add(m.fecha);
    } else {
      fechasVistas.add(m.fecha);
    }
  }

  for (const m of asc) {
    let valor: number | null = null;
    let unidad = "";

    if (metrica === "PESO") {
      if (typeof m.peso === "number" && Number.isFinite(m.peso)) {
        valor = m.peso;
        unidad = "kg";
      }
    } else if (metrica === "GRASA") {
      if (typeof m.porcentaje_grasa === "number" && Number.isFinite(m.porcentaje_grasa)) {
        valor = m.porcentaje_grasa;
        unidad = "%";
      }
    }

    if (valor !== null) {
      const fechaBase = utils.fecha(m.fecha);
      const etiquetaFecha = fechasRepetidas.has(m.fecha)
        ? `${fechaBase} (#${m.id_progreso})`
        : fechaBase;

      puntos.push({
        id_progreso: m.id_progreso,
        fecha: m.fecha,
        etiquetaFecha,
        valor,
        etiquetaValor: `${valor.toFixed(1)} ${unidad}`,
      });
    }
  }

  return puntos;
}
