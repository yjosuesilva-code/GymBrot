import type { Sesion } from "../types";

const CLAVE = "gymbrot_session";

/* Credenciales del mock. Cuando haya backend esto lo valida el servidor y
   esta comparacion desaparece. */
const USUARIO = "admin";
const CLAVE_ACCESO = "admin";

function esSesion(datos: unknown): datos is Sesion {
  if (datos === null || typeof datos !== "object") return false;
  const s = datos as Record<string, unknown>;
  return (
    typeof s.usuario === "string" &&
    typeof s.nombre === "string" &&
    typeof s.rol === "string"
  );
}

/* Un JSON corrupto en localStorage no debe dejar la app sin puerta de entrada:
   se descarta y se trata como sesion ausente. */
function leer(): Sesion | null {
  const raw = localStorage.getItem(CLAVE);
  if (!raw) return null;

  let datos: unknown;
  try {
    datos = JSON.parse(raw);
  } catch {
    localStorage.removeItem(CLAVE);
    return null;
  }

  if (!esSesion(datos)) {
    localStorage.removeItem(CLAVE);
    return null;
  }
  return datos;
}

export function login(usuario: string, clave: string): Sesion | null {
  if (usuario !== USUARIO || clave !== CLAVE_ACCESO) return null;

  const sesion: Sesion = {
    usuario: USUARIO,
    nombre: "Administrador",
    rol: "ADMIN",
  };
  localStorage.setItem(CLAVE, JSON.stringify(sesion));
  return sesion;
}

export function current(): Sesion | null {
  return leer();
}

export function logout(): void {
  localStorage.removeItem(CLAVE);
}