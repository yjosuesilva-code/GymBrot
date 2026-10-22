import type { AccesoGimnasio, GimnasioPublico, Sesion, Usuario } from "../types";
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
function esAcceso(datos: unknown): datos is AccesoGimnasio {
  if (datos === null || typeof datos !== "object") return false;
  const a = datos as Record<string, unknown>;
  return typeof a.gimnasio_id === "string" && typeof a.slug === "string" && typeof a.rol === "string";
}

function esSesion(datos: unknown): datos is Sesion {
  if (datos === null || typeof datos !== "object") return false;
  const s = datos as Record<string, unknown>;
  // [multitenant-slug] accesos es opcional: una sesion de antes del slug no lo
  // trae y sigue siendo valida. Si viene, debe tener la forma correcta.
  if (s.accesos !== undefined && !(Array.isArray(s.accesos) && s.accesos.every(esAcceso))) return false;
  // gimnasio_id es opcional: la sesion del SUPERADMIN no pertenece a ningun
  // gimnasio (es el dueno del software). Si viene, debe ser string.
  if (s.gimnasio_id !== undefined && typeof s.gimnasio_id !== "string") return false;
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
function sesionDe(u: Usuario, escrito: string, slug: string): Sesion {
  // El SUPERADMIN es dueno del software: no pertenece a ningun gimnasio, asi
  // que su sesion va sin gimnasio_id ni accesos.
  const esPlataforma = u.tipo_usuario === "SUPERADMIN";
  return {
    gimnasio_id: esPlataforma ? undefined : u.gimnasio_id,
    // [multitenant-slug] Hoy un usuario = un gimnasio. Con Supabase esta lista
    // sale de gym_members y puede traer varios.
    accesos: esPlataforma ? [] : [{ gimnasio_id: u.gimnasio_id, slug, rol: u.rol }],
    numero_identificacion: u.numero_identificacion,
    usuario: escrito,
    nombre: u.nombre,
    apellidos: u.apellidos,
    correo: u.correo,
    rol: u.rol,
    tipo_usuario: u.tipo_usuario,
    debe_cambiar_contrasena: u.debe_cambiar_contrasena ?? false,
  };
}

/* [multitenant-slug] Con gimnasio (login de /g/:slug/login) el usuario se
   busca solo dentro de ese gimnasio. Sin gimnasio (el /login viejo y el
   auto-login de /registro) se busca en toda la plataforma como antes; ese
   camino se retira en la Fase 4 de docs/MULTITENANT-SLUG.md. */
export type OpcionesLogin = { gimnasio?: GimnasioPublico };

export async function login(
  identificador: string,
  contrasena: string,
  opciones: OpcionesLogin = {},
): Promise<ResultadoLogin> {
  const escrito = identificador.trim();
  const clave = contrasena.trim();

  // El legacy revisa los dos campos juntos y responde un unico "Campos
  // vacios" (loginController.java:147). Aqui se separan para que el formulario
  // diga cual de los dos falta.
  if (!escrito && !clave) return fallo("CAMPOS_VACIOS", "Ingresa tu usuario y tu contraseña.");
  if (!escrito) return fallo("CAMPOS_VACIOS", "Ingresa tu usuario.");
  if (!clave) return fallo("CAMPOS_VACIOS", "Ingresa tu contraseña.");

  const { gimnasio } = opciones;
  if (gimnasio && gimnasio.estado !== "ACTIVO") {
    return fallo("SIN_ACCESO", `${gimnasio.nombre} no está activo en GymBrot.`);
  }

  const usuario = gimnasio
    ? await api.usuarios.buscarEnGimnasio(gimnasio.gimnasio_id, escrito)
    : await api.usuarios.buscarPorNombreOCorreo(escrito);

  // Usuario inexistente y clave erronea se reportan por separado porque el
  // formulario lo pide, pero OJO: eso revela que correos estan registrados.
  // Cuando exista backend hay que volver al unico "Credenciales invalidas"
  // del legacy (loginController.java:163) y que sea el servidor quien
  // responda, porque en el navegador la distincion es solo de fachada.
  if (!usuario) return fallo("USUARIO_DESCONOCIDO", "No hay ningún usuario con ese nombre o correo.");
  if (usuario.contrasena !== clave) return fallo("CONTRASENA_INCORRECTA", "La contraseña es incorrecta.");

  // AuthService.java:73-74
  if (usuario.estado !== "ACTIVO") return fallo("ESTADO", `El usuario está ${usuario.estado}.`);

  // Roles reales: cualquier tipo de usuario ACTIVO entra a su propio panel.
  // El SUPERADMIN no pertenece a un gimnasio, asi que no exige slug.
  const esPlataforma = usuario.tipo_usuario === "SUPERADMIN";
  if (gimnasio && esPlataforma) {
    return fallo("SIN_ACCESO", "El superadministrador entra por su propio portal.");
  }

  // El slug entra en la sesion para que redirigir las rutas viejas no tenga
  // que buscarlo. Sin gimnasio en las opciones se resuelve por gimnasio_id.
  const slug = esPlataforma
    ? ""
    : gimnasio?.slug ?? (await slugDeGimnasio(usuario.gimnasio_id));
  if (!esPlataforma && !slug) {
    return fallo("SIN_ACCESO", "Tu gimnasio no está registrado en GymBrot.");
  }

  const sesion = sesionDe(usuario, escrito, slug);
  localStorage.setItem(CLAVE, JSON.stringify(sesion));
  return { ok: true, sesion };
}

async function slugDeGimnasio(gimnasioId: string): Promise<string | null> {
  const g = (await api.gimnasios.list()).find((x) => x.gimnasio_id === gimnasioId);
  return g?.slug ?? null;
}

export function current(): Sesion | null {
  return leer();
}

/* [multitenant-slug] Gimnasios a los que puede entrar la sesion. Una sesion
   de antes del slug no trae accesos: se arma con su gimnasio_id y slug vacio
   (portalDeInicio() lo completa). El SUPERADMIN no tiene gimnasio: lista vacia. */
export function accesosDe(sesion: Sesion): AccesoGimnasio[] {
  if (sesion.accesos) return sesion.accesos;
  if (!sesion.gimnasio_id) return [];
  return [{ gimnasio_id: sesion.gimnasio_id, slug: "", rol: sesion.rol }];
}

/* La pregunta que hace el guard de cada ruta privada. En el mock basta con
   la sesion; con Supabase la respuesta real la da RLS y esto solo evita
   pintar una pantalla que va a llegar vacia. */
export function tieneAcceso(sesion: Sesion | null, gimnasioId: string): boolean {
  if (!sesion) return false;
  return accesosDe(sesion).some((a) => a.gimnasio_id === gimnasioId);
}

/* A donde mandar a alguien que entra por una ruta sin slug (/dashboard,
   /clientes/123...): el portal del gimnasio con el que inicio sesion. El
   SUPERADMIN va al panel de la plataforma. */
export async function portalDeInicio(sesion: Sesion): Promise<string | null> {
  if (sesion.tipo_usuario === "SUPERADMIN") return "plataforma/dashboard";
  const primero = accesosDe(sesion).find((a) => a.gimnasio_id === sesion.gimnasio_id) ?? accesosDe(sesion)[0];
  if (!primero) return null;
  return primero.slug || (await slugDeGimnasio(primero.gimnasio_id));
}

/* Ruta relativa a la que cada rol debe caer al entrar o al pedir una ruta que
   no le corresponde (sin prefijo de slug; lo aplica el llamador). */
export function rutaInicioRol(sesion: Sesion): string {
  switch (sesion.tipo_usuario) {
    case "SUPERADMIN":
      return "/plataforma/dashboard";
    case "INSTRUCTOR":
      return "/instructor-dashboard";
    case "CLIENTE":
      return "/mi-dashboard";
    default:
      return "/dashboard";
  }
}

/* Cambia la contrasena del usuario en sesion y baja el flag de cambio
   obligatorio. Refresca la copia guardada para que el guard deje pasar. */
export async function cambiarContrasena(nueva: string): Promise<ResultadoLogin> {
  const sesion = leer();
  if (!sesion) return fallo("SIN_ACCESO", "No hay sesión activa.");
  const limpia = nueva.trim();
  if (limpia.length < 6) return fallo("CAMPOS_VACIOS", "La contraseña debe tener al menos 6 caracteres.");

  const res = await api.usuarios.cambiarContrasena(sesion.numero_identificacion, limpia);
  if (!res.ok) return fallo("SIN_ACCESO", res.mensaje);

  const actualizada: Sesion = { ...sesion, debe_cambiar_contrasena: false };
  localStorage.setItem(CLAVE, JSON.stringify(actualizada));
  return { ok: true, sesion: actualizada };
}

export function logout(): void {
  localStorage.removeItem(CLAVE);
}