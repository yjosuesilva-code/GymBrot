import { current } from "./auth";

/* [P3] B3 · KAN-92 — ¿Quién está en sesión? Las vistas de Rutinas las comparten el admin y el instructor.
   No hay guard de rutas por rol (KAN-85), así que cada vista decide qué mostrar con esto.
   Devuelve la cédula del instructor en sesión (= Instructor.numero_identificacion) o null si no es instructor. */
export function instructorEnSesion(): string | null {
  const sesion = current();
  return sesion?.tipo_usuario === "INSTRUCTOR" ? sesion.numero_identificacion : null;
}
