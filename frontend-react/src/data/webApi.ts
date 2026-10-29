import { utils } from "../lib/utils";
import type { ApiResp, Cliente, ClienteNuevo, Ejercicio, EjercicioNuevo } from "../types";

/* [web-api] Cliente HTTP de la Web API en ASP.NET Core (backend/GymBrot.Api).

   Se activa con la variable VITE_API_URL, por ejemplo en
   frontend-react/.env.development.local:
       VITE_API_URL=http://localhost:5107/api
   Sin esa variable la app sigue con el mock de localStorage, asi quien no
   tenga la API corriendo puede seguir trabajando en el resto de modulos.

   Hoy solo Clientes pasa por aqui (api.clientes delega en clientesWebApi).
   Cada modulo que se conecte agrega su seccion siguiendo el mismo patron:
   tipo con la forma de la API (camelCase, ids numericos) + funciones que
   traducen a los tipos del frontend (snake_case, cedula como llave). */

const BASE = ((import.meta.env.VITE_API_URL as string | undefined) ?? "").trim().replace(/\/+$/, "");

export const usaWebApi = BASE !== "";

/* Error con un mensaje listo para mostrar en pantalla. status 0 = no hubo
   respuesta (la API esta apagada o la URL es otra). */
export class ErrorApi extends Error {
  readonly status: number;
  constructor(mensaje: string, status: number) {
    super(mensaje);
    this.status = status;
  }
}

function mensajeDeError(status: number, cuerpo: unknown): string {
  if (cuerpo && typeof cuerpo === "object") {
    const c = cuerpo as { mensaje?: unknown; errors?: Record<string, unknown>; title?: unknown };
    if (typeof c.mensaje === "string") return c.mensaje;
    // Errores de validacion de ASP.NET: { errors: { Campo: ["mensaje"] } }
    if (c.errors) {
      const primero = Object.values(c.errors).flat()[0];
      if (typeof primero === "string") return primero;
    }
    if (typeof c.title === "string") return c.title;
  }
  return `La API respondió con el código ${status}.`;
}

async function pedir<T>(ruta: string, init: RequestInit = {}): Promise<T> {
  let res: Response;
  try {
    res = await fetch(BASE + ruta, {
      ...init,
      headers: { "Content-Type": "application/json", ...(init.headers ?? {}) },
    });
  } catch {
    throw new ErrorApi(`No se pudo conectar con la API (${BASE}). Revisa que esté corriendo.`, 0);
  }
  const texto = await res.text();
  let cuerpo: unknown;
  try {
    cuerpo = texto ? JSON.parse(texto) : undefined;
  } catch {
    cuerpo = texto;
  }
  if (!res.ok) throw new ErrorApi(mensajeDeError(res.status, cuerpo), res.status);
  return cuerpo as T;
}

function aResp<T>(e: unknown): ApiResp<T> {
  return { ok: false, mensaje: e instanceof Error ? e.message : "Error inesperado con la API." };
}

/* ---- Gimnasio: el frontend lo identifica por slug, la API por id numerico ---- */

/* Lo que api.ts sabe del gimnasio abierto: su id del frontend ('gym-centro')
   y su slug ('gymbrot-centro'), que es lo que se busca en la API. */
export interface TenantApi {
  gimnasio_id: string;
  slug: string;
}

interface GimnasioApi {
  id: number;
  slug: string;
}

const idPorSlug = new Map<string, number>();

async function idGimnasio(slug: string): Promise<number> {
  const enCache = idPorSlug.get(slug);
  if (enCache !== undefined) return enCache;
  const lista = await pedir<GimnasioApi[]>("/Gimnasios");
  for (const g of lista) idPorSlug.set(g.slug, g.id);
  const id = idPorSlug.get(slug);
  if (id === undefined) {
    throw new ErrorApi(`El gimnasio "${slug}" no está registrado en la API. Créalo con POST /api/Gimnasios.`, 404);
  }
  return id;
}

/* ---- Clientes ---- */

interface ClienteApi {
  id: number;
  gimnasioId: number;
  numeroIdentificacion: string;
  tipoIdentificacion: string;
  nombre: string;
  apellidos: string;
  telefono: string;
  correo: string;
  direccion: string;
  fechaNacimiento: string | null;
  estado: string;
  fechaRegistro: string;
}

// La API devuelve DateTime ('1998-04-12T00:00:00'); el frontend usa 'YYYY-MM-DD'.
const soloFecha = (v: string | null | undefined) => (v ? v.slice(0, 10) : "");

function aCliente(c: ClienteApi, t: TenantApi): Cliente {
  return {
    gimnasio_id: t.gimnasio_id,
    numero_identificacion: c.numeroIdentificacion,
    tipo_identificacion: c.tipoIdentificacion as Cliente["tipo_identificacion"],
    nombre: c.nombre,
    apellidos: c.apellidos,
    telefono: c.telefono,
    correo: c.correo,
    direccion: c.direccion,
    fecha_nacimiento: soloFecha(c.fechaNacimiento),
    estado: c.estado as Cliente["estado"],
    fecha_registro: soloFecha(c.fechaRegistro),
  };
}

// Mezcla lo que manda la vista (snake_case) sobre una fila de la API.
function conCambios(base: ClienteApi, d: Partial<ClienteNuevo> & { estado?: Cliente["estado"] }): ClienteApi {
  return {
    ...base,
    numeroIdentificacion: d.numero_identificacion ?? base.numeroIdentificacion,
    tipoIdentificacion: d.tipo_identificacion ?? base.tipoIdentificacion,
    nombre: d.nombre ?? base.nombre,
    apellidos: d.apellidos ?? base.apellidos,
    telefono: d.telefono ?? base.telefono,
    correo: d.correo ?? base.correo,
    direccion: d.direccion ?? base.direccion,
    fechaNacimiento: d.fecha_nacimiento !== undefined ? d.fecha_nacimiento || null : base.fechaNacimiento,
    estado: d.estado ?? base.estado,
  };
}

async function listaApi(t: TenantApi): Promise<ClienteApi[]> {
  const id = await idGimnasio(t.slug);
  return pedir<ClienteApi[]>(`/Clientes?gimnasioId=${id}`);
}

async function buscarApi(t: TenantApi, cedula: string): Promise<ClienteApi | undefined> {
  return (await listaApi(t)).find((c) => c.numeroIdentificacion === cedula);
}

export const clientesWebApi = {
  // GET: lanza ErrorApi si la API no responde, para que la vista lo muestre.
  async list(t: TenantApi): Promise<Cliente[]> {
    return (await listaApi(t)).map((c) => aCliente(c, t));
  },

  async get(t: TenantApi, cedula: string): Promise<Cliente | null> {
    const c = await buscarApi(t, cedula);
    return c ? aCliente(c, t) : null;
  },

  async create(t: TenantApi, d: ClienteNuevo): Promise<ApiResp<Cliente>> {
    try {
      const gimnasioId = await idGimnasio(t.slug);
      const vacio: ClienteApi = {
        id: 0,
        gimnasioId,
        numeroIdentificacion: "",
        tipoIdentificacion: "CC",
        nombre: "",
        apellidos: "",
        telefono: "",
        correo: "",
        direccion: "",
        fechaNacimiento: null,
        estado: "ACTIVO",
        fechaRegistro: utils.isoDate(),
      };
      // Sin "id": lo genera la base de datos.
      const { id: _sinId, ...cuerpo } = conCambios(vacio, d);
      void _sinId;
      const creado = await pedir<ClienteApi>("/Clientes", { method: "POST", body: JSON.stringify(cuerpo) });
      return { ok: true, mensaje: "Cliente registrado", data: aCliente(creado, t) };
    } catch (e) {
      return aResp(e);
    }
  },

  async update(
    t: TenantApi,
    cedula: string,
    d: Partial<ClienteNuevo> & { estado?: Cliente["estado"] },
  ): Promise<ApiResp<Cliente>> {
    try {
      const actual = await buscarApi(t, cedula);
      if (!actual) return { ok: false, mensaje: "Cliente no encontrado" };
      const cambiado = conCambios(actual, d);
      // PUT responde 204 sin cuerpo: se devuelve la fila tal como se mando.
      await pedir<void>(`/Clientes/${actual.id}`, { method: "PUT", body: JSON.stringify(cambiado) });
      return { ok: true, mensaje: "Cliente actualizado", data: aCliente(cambiado, t) };
    } catch (e) {
      return aResp(e);
    }
  },
};


/* ---- Ejercicios ---- */

// Así llega un ejercicio desde la API (igual a Models/Ejercicio.cs, pero en camelCase)
interface EjercicioApi {
  id: number;
  gimnasioId: number | null;
  nombre: string;
  descripcion: string;
  grupoMuscular: string;
  nivel: string;
  equipo: string;
  tipoMedicion: string;
  seriesSugeridas: number | null;
  repeticionesMinSugeridas: number | null;
  repeticionesMaxSugeridas: number | null;
  segundosSugeridos: number | null;
  recursoUrl: string;
  estado: string;
}

function aEjercicio(e: EjercicioApi, t: TenantApi): Ejercicio {
  return {
    id_ejercicio: e.id,
    gimnasio_id: e.gimnasioId === null ? null : t.gimnasio_id,
    nombre: e.nombre,
    descripcion: e.descripcion,
    grupo_muscular: e.grupoMuscular as Ejercicio["grupo_muscular"],
    nivel: e.nivel as Ejercicio["nivel"],
    equipo: e.equipo as Ejercicio["equipo"],
    tipo_medicion: e.tipoMedicion as Ejercicio["tipo_medicion"],
    series_sugeridas: e.seriesSugeridas,
    repeticiones_min_sugeridas: e.repeticionesMinSugeridas,
    repeticiones_max_sugeridas: e.repeticionesMaxSugeridas,
    segundos_sugeridos: e.segundosSugeridos,
    recurso_url: e.recursoUrl,
    estado: e.estado as Ejercicio["estado"],
  };
}

export const ejerciciosWebApi = {
  // GET /api/Ejercicios?gimnasioId=1 → base + propios
  async list(t: TenantApi): Promise<Ejercicio[]> {
    const id = await idGimnasio(t.slug);
    const lista = await pedir<EjercicioApi[]>(`/Ejercicios?gimnasioId=${id}`);
    return lista.map((e) => aEjercicio(e, t));
  },

    // POST /api/Ejercicios → 201 con el ejercicio creado
  async create(t: TenantApi, d: EjercicioNuevo): Promise<ApiResp<Ejercicio>> {
    try {
      const gimnasioId = await idGimnasio(t.slug);
      // Sin "id": lo genera la base de datos
      const cuerpo: Omit<EjercicioApi, "id"> = {
        gimnasioId,
        nombre: d.nombre,
        descripcion: d.descripcion,
        grupoMuscular: d.grupo_muscular,
        nivel: d.nivel,
        equipo: d.equipo,
        tipoMedicion: d.tipo_medicion,
        seriesSugeridas: d.series_sugeridas,
        repeticionesMinSugeridas: d.repeticiones_min_sugeridas,
        repeticionesMaxSugeridas: d.repeticiones_max_sugeridas,
        segundosSugeridos: d.segundos_sugeridos,
        recursoUrl: d.recurso_url,
        estado: "ACTIVO",
      };
      const creado = await pedir<EjercicioApi>("/Ejercicios", {
        method: "POST",
        body: JSON.stringify(cuerpo),
      });
      return { ok: true, mensaje: "Ejercicio registrado", data: aEjercicio(creado, t) };
    } catch (e) {
      return aResp(e);
    }
  },
};