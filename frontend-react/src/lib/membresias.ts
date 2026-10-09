import type { Cliente, Membresia } from "../types";

/* Regla unica de "esta membresia cuenta como vigente".

   Una membresia solo es vigente si esta ACTIVA, no ha vencido y ademas su
   cliente sigue ACTIVO. El tercer termino es el que costó un bug: Finanzas
   contaba con estado y vencimiento pero ignoraba al cliente, de modo que
   suspender a alguien en Clientes bajaba "Clientes activos" del Dashboard y
   dejaba "Membresías vigentes" igual. Las dos pantallas contaban lo mismo con
   reglas distintas.

   Vive en su propio archivo para que Finanzas y el control de acceso no
   puedan divergir: el acceso valida con esta misma funcion, asi que no puede
   entrar nadie que Finanzas no este contando. */
export function membresiaVigente(
  m: Membresia,
  hoy: string,
  cliente: Cliente | null | undefined,
): boolean {
  return m.estado === "ACTIVA" && m.fecha_vencimiento >= hoy && cliente?.estado === "ACTIVO";
}
