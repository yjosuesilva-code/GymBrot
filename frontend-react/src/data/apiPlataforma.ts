import { api } from "./api";
import { utils } from "../lib/utils";
import type { Gimnasio, PlanSoftware } from "../types";

/* [plataforma] Datos del panel del SUPERADMIN (T2). Va en su propio archivo
   para no tocar api.ts, que es de T1.

   Por ahora solo usa lo que api.ts ya expone y es global (no pasa por
   readTenant): la tabla de gimnasios y el catalogo de planes del software.
   TODO(T2): cuando T1 exporte `db`, agregar aqui
     - resumenDe(id): n_instructores, n_clientes, membresias activas
     - cambiarEstado(id, estado) y cambiarPlan(id, plan)
     - suscripciones.list() con pagosSoftware
   y sumar total_clientes / total_instructores al resumen. */

type IdPlan = PlanSoftware["id_plan_software"];

/* Una suscripcion "por vencer" avisa con esta anticipacion. */
export const DIAS_AVISO_VENCIMIENTO = 7;

export type EstadoSuscripcion = "AL_DIA" | "POR_VENCER" | "VENCIDA";

export interface ResumenPlataforma {
  total_gimnasios: number;
  activos: number;
  inactivos: number;
  por_vencer: number;
  vencidas: number;
  /* Suma del precio mensual del plan de cada gimnasio ACTIVO. Es lo que la
     plataforma deberia facturar al mes, no lo efectivamente cobrado. */
  ingreso_mensual_estimado: number;
  por_plan: Record<IdPlan, number>;
}

/* Dias que faltan para vence_suscripcion (negativo = ya vencio). Compara
   fechas locales a medianoche para no depender de la hora del dia. */
export function diasParaVencer(g: Gimnasio, hoy: string = utils.isoDate()): number {
  const vence = new Date(g.vence_suscripcion + "T00:00:00").getTime();
  const base = new Date(hoy + "T00:00:00").getTime();
  return Math.round((vence - base) / 86_400_000);
}

export function estadoSuscripcion(g: Gimnasio, hoy?: string): EstadoSuscripcion {
  const dias = diasParaVencer(g, hoy);
  if (dias < 0) return "VENCIDA";
  if (dias <= DIAS_AVISO_VENCIMIENTO) return "POR_VENCER";
  return "AL_DIA";
}

export const apiPlataforma = {
  async resumen(): Promise<ResumenPlataforma> {
    const [gimnasios, planes] = await Promise.all([
      api.gimnasios.list(),
      api.gimnasios.planesSoftware(),
    ]);
    const precio = new Map(planes.map((p) => [p.id_plan_software, p.precio_mensual]));
    const activos = gimnasios.filter((g) => g.estado === "ACTIVO");
    const por_plan: Record<IdPlan, number> = { BASICO: 0, PRO: 0, PREMIUM: 0 };
    for (const g of gimnasios) por_plan[g.plan_software] += 1;

    return {
      total_gimnasios: gimnasios.length,
      activos: activos.length,
      inactivos: gimnasios.length - activos.length,
      // Solo cuentan los activos: un gimnasio inactivo no va a renovar.
      por_vencer: activos.filter((g) => estadoSuscripcion(g) === "POR_VENCER").length,
      vencidas: activos.filter((g) => estadoSuscripcion(g) === "VENCIDA").length,
      ingreso_mensual_estimado: activos.reduce((acc, g) => acc + (precio.get(g.plan_software) ?? 0), 0),
      por_plan,
    };
  },

  gimnasios: {
    list(): Promise<Gimnasio[]> {
      return api.gimnasios.list();
    },
    async obtener(id: string): Promise<Gimnasio | null> {
      return (await api.gimnasios.list()).find((g) => g.gimnasio_id === id) ?? null;
    },
  },

  planes: {
    list(): Promise<PlanSoftware[]> {
      return api.gimnasios.planesSoftware();
    },
  },
};
