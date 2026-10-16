import { createContext, useContext } from "react";
import type { GimnasioPublico } from "../types";

/* [multitenant-slug] Gimnasio de la URL actual (/g/:slug/...).

   Solo existe dentro de TenantProvider, y TenantProvider no pinta a sus hijos
   hasta resolver el slug: por eso `gimnasio` nunca es null aqui y las vistas
   no tienen que preguntar "¿ya cargo?".

   Va en un .ts aparte de TenantProvider.tsx porque react-refresh solo hace
   hot reload de archivos que exportan componentes; mezclar el hook con el
   componente rompe el HMR (regla react-refresh/only-export-components). */

export interface TenantContextValue {
  /* Slug canonico (minusculas), tal como esta en gimnasios.slug. */
  slug: string;
  gimnasio: GimnasioPublico;
  /* Arma rutas del portal: ruta("/clientes/123") -> "/g/iron-house/clientes/123".
     Toda navegacion interna pasa por aqui; un "/clientes" suelto se sale del
     portal (y la ruta vieja lo mandaria al gimnasio de la sesion, que puede
     no ser el que se esta viendo). */
  ruta: (path: string) => string;
}

export const TenantContext = createContext<TenantContextValue | null>(null);

export function rutaDeTenant(slug: string, path = ""): string {
  const limpio = path.startsWith("/") ? path : "/" + path;
  return "/g/" + slug + (limpio === "/" ? "" : limpio);
}

/* Para todo lo que vive bajo /g/:slug. Fuera del provider es un error de
   programacion (una ruta privada que quedo sin /g/:slug en App.tsx), asi que
   falla fuerte en vez de devolver datos de otro gimnasio. */
export function useTenant(): TenantContextValue {
  const valor = useContext(TenantContext);
  if (!valor) {
    throw new Error("useTenant() se llamó fuera de TenantProvider: la ruta debe colgar de /g/:slug.");
  }
  return valor;
}

/* Para componentes compartidos que tambien se pintan fuera del portal. */
export function useTenantOpcional(): TenantContextValue | null {
  return useContext(TenantContext);
}
