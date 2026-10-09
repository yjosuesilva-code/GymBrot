import type { Sesion, Usuario } from "../types";
import { api } from "../data/api";

const CLAVE = "gymbrot_session";

/* Sin backend no hay donde hashear, asi que la contrasena viaja en texto
   plano dentro del seed y se compara aqui. Cuando exista API, este archivo se
   reduce a guardar la sesion: el login, el estado y el tipo los resuelve el
   servidor (AuthService.login, que ya valida BCrypt contra contrasena_hash). */

export type MotivoFallo =
  | "CAMPOS_VACIOS"
  | "USUARIO_DESCONOCIDO"
  | "CONTRASENA_INCORRECTA"
  | "ESTADO"
  | "SIN_ACCESO";

export type ResultadoLogin =
  | { ok: true; sesion: Sesion }
  | { ok: false; motivo: MotivoFallo; mensaje: string };

function fallo(motivo: MotivoFallo, mensaje: string): ResultadoLogin {
  return { ok: false, motivo, mensaje };
}

/* Una sesion guardada antes del multitenant no trae gimnasio_id: no pasa
   esta validacion, leer() la descarta y el usuario vuelve a entrar por el
   login, que ya le asigna su gimnasio. */
function esSesion(datos: unknown): datos is Sesion {
  if (datos === null || typeof datos !== "object") return false;
  const s = datos as Record<string, unknown>;
  return (
    typeof s.gimnasio_id === "string" &&
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
    gimnasio_id: u.gimnasio_id,
    numero_identificacion: u.numero_identificacion,
    usuario: escrito,
    nombre: u.nombre,
    apellidos: u.apellidos,
    correo: u.correo,
    rol: u.rol,
    tipo_usuario: u.tipo_usuario,
  };
}

export async function login(identificador: string, contrasena: string): Promise<ResultadoLogin> {
  const escrito = identificador.trim();
  const clave = contrasena.trim();

  // El legacy revisa los dos campos juntos y responde un unico "Campos
  // vacios" (loginController.java:147). Aqui se separan para que el formulario
  // diga cual de los dos falta.
  if (!escrito && !clave) return fallo("CAMPOS_VACIOS", "Ingresa tu usuario y tu contraseña.");
  if (!escrito) return fallo("CAMPOS_VACIOS", "Ingresa tu usuario.");
  if (!clave) return fallo("CAMPOS_VACIOS", "Ingresa tu contraseña.");

  const usuario = await api.usuarios.buscarPorNombreOCorreo(escrito);

  // Usuario inexistente y clave erronea se reportan por separado porque el
  // formulario lo pide, pero OJO: eso revela que correos estan registrados.
  // Cuando exista backend hay que volver al unico "Credenciales invalidas"
  // del legacy (loginController.java:163) y que sea el servidor quien
  // responda, porque en el navegador la distincion es solo de fachada.
  if (!usuario) return fallo("USUARIO_DESCONOCIDO", "No hay ningún usuario con ese nombre o correo.");
  if (usuario.contrasena !== clave) return fallo("CONTRASENA_INCORRECTA", "La contraseña es incorrecta.");

  // AuthService.java:73-74
  if (usuario.estado !== "ACTIVO") return fallo("ESTADO", `El usuario está ${usuario.estado}.`);

  // loginController.java:156-158
  if (usuario.tipo_usuario !== "ADMINISTRADOR") {
    return fallo(
      "SIN_ACCESO",
      "Acceso denegado: solo los administradores pueden iniciar sesión.",
    );
  }

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