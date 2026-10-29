import type { Membresia, Pago, PlanMembresia } from "../../types";
import type { api } from "../../data/api";

export async function cargarDatosMiMembresia(
  fuente: Pick<typeof api, "clientes" | "membresias" | "planes" | "pagos">,
  idCliente: string,
  gimnasioId: string,
) {
  const [cliente, membresias, planes, pagos] = await Promise.all([
    fuente.clientes.get(idCliente),
    fuente.membresias.byCliente(idCliente),
    fuente.planes.list({ incluirInactivos: true }),
    fuente.pagos.byCliente(idCliente),
  ]);
  if (!cliente || cliente.numero_identificacion !== idCliente || cliente.gimnasio_id !== gimnasioId) {
    throw new Error("No pudimos verificar tu cuenta en este gimnasio. Intenta cargar los datos de nuevo.");
  }
  return { cliente, membresias, planes, pagos };
}

export function resolverBeneficiosPlan(
  idPlan: number | null | undefined,
  planes: PlanMembresia[],
): string[] {
  if (idPlan == null || !Array.isArray(planes)) return [];
  const plan = planes.find((p) => p && p.id_plan === idPlan);
  if (!plan || !Array.isArray(plan.beneficios)) return [];
  return plan.beneficios.filter((b) => typeof b === "string" && b.trim().length > 0);
}

export function formatearModalidadPago(
  modalidad: Membresia["modalidad_pago"] | string | null | undefined,
): string {
  switch (modalidad) {
    case "ANUAL":
      return "Plan anual";
    case "SEMESTRAL":
      return "Plan semestral";
    case "MENSUAL":
      return "Plan mensual";
    default:
      return modalidad ? String(modalidad) : "No especificada";
  }
}

export function formatearMetodoPago(
  metodo: Pago["metodo_pago"] | string | null | undefined,
): string {
  switch (metodo) {
    case "EFECTIVO":
      return "Efectivo";
    case "TRANSFERENCIA":
      return "Transferencia";
    case "TARJETA":
      return "Tarjeta";
    case "NEQUI":
      return "Nequi";
    default:
      return metodo ? String(metodo) : "Otro";
  }
}

export function filtrarYOrdenarPagosCliente(
  pagos: Pago[],
  idCliente: string,
  gimnasioId: string,
): Pago[] {
  if (!Array.isArray(pagos) || !idCliente || !gimnasioId) return [];
  return pagos
    .filter((p) => p && p.id_cliente === idCliente && p.gimnasio_id === gimnasioId)
    .sort((a, b) => {
      const cmpFecha = b.fecha_pago.localeCompare(a.fecha_pago);
      if (cmpFecha !== 0) return cmpFecha;
      return b.id_pago - a.id_pago;
    });
}

export function separarMembresiasCliente(
  membresias: Membresia[],
  idCliente: string,
  gimnasioId: string,
  idMembresiaExcluir?: number,
): Membresia[] {
  if (!Array.isArray(membresias) || !idCliente || !gimnasioId) return [];
  return membresias
    .filter(
      (m) =>
        m &&
        m.id_cliente === idCliente &&
        m.gimnasio_id === gimnasioId &&
        (idMembresiaExcluir === undefined || m.id_membresia !== idMembresiaExcluir),
    )
    .sort((a, b) => {
      const cmpVenc = b.fecha_vencimiento.localeCompare(a.fecha_vencimiento);
      if (cmpVenc !== 0) return cmpVenc;
      const cmpInicio = b.fecha_inicio.localeCompare(a.fecha_inicio);
      if (cmpInicio !== 0) return cmpInicio;
      return b.id_membresia - a.id_membresia;
    });
}
