/* [multitenant-slug] Gimnasio activo para la capa de datos.

   Antes api.ts sacaba el gimnasio de la sesion guardada en localStorage. Ahora
   lo fija TenantProvider a partir del slug de la URL, despues de comprobar que
   la sesion tiene acceso a ese gimnasio. api.ts lo lee de aqui con
   gimnasioFijado().

   Es un modulo sin imports a proposito: api.ts y auth.ts lo importan, y si
   este archivo importara a cualquiera de los dos se armaria un ciclo.

   Con Supabase este valor sigue haciendo falta: es el gimnasio_id que se pasa
   en cada .eq("gimnasio_id", ...). RLS no lo reemplaza, lo respalda: si el
   frontend pide filas de un gimnasio al que el usuario no pertenece, la base
   devuelve vacio. */

let actual: string | null = null;

export function fijarGimnasio(gimnasioId: string): void {
  actual = gimnasioId;
}

export function limpiarGimnasio(gimnasioId?: string): void {
  // Con id: solo limpia si sigue siendo el mismo. Evita que el cleanup de un
  // TenantProvider que se desmonta borre el gimnasio que ya fijo el siguiente
  // (pasa al cambiar de /g/a/... a /g/b/... y en el doble montaje de StrictMode).
  if (gimnasioId === undefined || actual === gimnasioId) actual = null;
}

export function gimnasioFijado(): string | null {
  return actual;
}
