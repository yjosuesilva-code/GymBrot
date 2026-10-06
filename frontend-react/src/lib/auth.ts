import type { Sesion, Usuario } from "../types";
import { api } from "../data/api";

const CLAVE = "gymbrot_session";

/* Sin backend no hay donde hashear, asi que la contrasena viaja en texto
   plano dentro del seed y se compara aqui. Cuando exista API, este archivo se
   reduce a guardar la sesion: el login, el estado y el tipo los resuelve el
   servidor (AuthService.login, que ya valida BCrypt contra contrasena_hash). */

export type MotivoFallo =
  | "CAMPOS_VACIOS"
  | "CREDENCIALES"
  | "ESTADO"
  | "SIN_ACCESO";

export type ResultadoLogin =
  | { ok: true; sesion: Sesion }
  | { ok: false; motivo: MotivoFallo; mensaje: string };

const MOTIVOS: Record<MotivoFallo, string> = {
  CAMPOS_VACIOS: "Ingresa tu usuario y contraseña.",
  CREDENCIALES: "Usuario o contraseña incorrectos.",
  ESTADO: "El usuario no está activo.",
  // loginController.java:157
  SIN_ACCESO: "Acceso denegado: solo los administradores pueden iniciar sesión.",
};

function esSesion(datos: unknown): datos is Sesion {
  if (datos === null || typeof datos !== "object") return false;
  const s = datos as Record<string, unknown>;
  return (
    typeof s.numero_identificacion === "string" &&
    typeof s.usuario === "string" &&
    typeof s.nombre === "string" &&
    typeof s.apellidos === "string" &&
    typeof s.correo === "string" &&
    typeof s.rol === "string" &&
    typeof s.tipo_usuario === "string"
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

/* El campo que el usuario escribio se guarda aparte de la sesion: la UI lo
   muestra en el Topbar aunque el nombre real del usuario sea otro. */
function sesionDe(u: Usuario, escrito: string): Sesion {
  return {
    numero_identificacion: u.numero_identificacion,
    usuario: escrito,
    nombre: u.nombre,
    apellidos: u.apellidos,
    correo: u.correo,
    rol: u.rol,
    tipo_usuario: u.tipo_usuario,
  };
}

function fallo(motivo: MotivoFallo): ResultadoLogin {
  return { ok: false, motivo, mensaje: MOTIVOS[motivo] };
}

export async function login(identificador: string, contrasena: string): Promise<ResultadoLogin> {
  const escrito = identificador.trim();
  if (!escrito || !contrasena.trim()) return fallo("CAMPOS_VACIOS");

  const usuario = await api.usuarios.buscarPorNombreOCorreo(escrito);
  // El legacy no distingue usuario inexistente de clave erronea: el mismo
  // "Credenciales invalidas" para los dos casos (loginController.java:163).
  if (!usuario || usuario.contrasena !== contrasena) return fallo("CREDENCIALES");

  if (usuario.estado !== "ACTIVO") return fallo("ESTADO");
  if (usuario.tipo_usuario !== "ADMINISTRADOR") return fallo("SIN_ACCESO");

  const sesion = sesionDe(usuario, escrito);
  localStorage.setItem(CLAVE, JSON.stringify(sesion));
  return { ok: true, sesion };
}

export function current(): Sesion | null {
  return leer();
}

export function logout(): void {
  localStorage.removeItem(CLAVE);
}