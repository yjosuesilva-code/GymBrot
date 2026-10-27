import type { Cita, EstadoInscripcion, Instructor, InscripcionClase, Clase } from "../../types";
import { NOMBRE_TIPO_CITA } from "../../lib/citas";
import { NOMBRE_TIPO_CLASE, seCruzan } from "../../lib/clases";
import { diaDisponible, slotsPara } from "../../lib/horarios";

export { NOMBRE_TIPO_CITA, NOMBRE_TIPO_CLASE };

export type SeparacionCitas = {
  proximas: Cita[];
  pasadas: Cita[];
};

export type SeparacionInscripciones = {
  activas: { inscripcion: InscripcionClase; clase: Clase }[];
  historial: { inscripcion: InscripcionClase; clase: Clase }[];
};

/**
 * Filtra las citas pertenecientes al cliente y al gimnasio activo,
 * y las divide en próximas (futuras y activas) y pasadas/historial.
 */
export function separarCitasCliente(opciones: {
  citas: Cita[];
  idCliente: string;
  gimnasioId: string;
  hoy: string;
  horaActualTexto: string;
}): SeparacionCitas {
  const { citas, idCliente, gimnasioId, hoy, horaActualTexto } = opciones;
  if (!Array.isArray(citas) || !idCliente || !gimnasioId) {
    return { proximas: [], pasadas: [] };
  }

  const deCliente = citas.filter((c) => c && c.id_cliente === idCliente && c.gimnasio_id === gimnasioId);

  const proximas: Cita[] = [];
  const pasadas: Cita[] = [];

  for (const c of deCliente) {
    const esFutura = c.fecha > hoy || (c.fecha === hoy && c.hora > horaActualTexto);
    const esActiva = c.estado === "PENDIENTE" || c.estado === "CONFIRMADA";

    if (esFutura && esActiva) {
      proximas.push(c);
    } else {
      pasadas.push(c);
    }
  }

  // Próximas: orden ascendente (la más cercana primero)
  proximas.sort((a, b) => `${a.fecha} ${a.hora}`.localeCompare(`${b.fecha} ${b.hora}`));

  // Pasadas: orden descendente (la más reciente primero)
  pasadas.sort((a, b) => `${b.fecha} ${b.hora}`.localeCompare(`${a.fecha} ${a.hora}`));

  return { proximas, pasadas };
}

/**
 * Determina si el cliente tiene permitido cancelar una cita:
 * solo si es una cita futura y está en estado PENDIENTE o CONFIRMADA.
 */
export function puedeCancelarCita(
  cita: Pick<Cita, "estado" | "fecha" | "hora">,
  hoy: string,
  horaActualTexto: string
): boolean {
  if (!cita) return false;
  if (cita.estado !== "PENDIENTE" && cita.estado !== "CONFIRMADA") return false;
  return cita.fecha > hoy || (cita.fecha === hoy && cita.hora > horaActualTexto);
}

/**
 * Franja ocupada de la agenda de un instructor: solo lo necesario para detectar choques
 * (instructor, fecha, hora). No incluye cliente, notas, tipo ni identificador privado.
 */
export type FranjaOcupada = {
  id_instructor: string;
  fecha: string;
  hora: string;
};

/**
 * Reduce una lista de citas a franjas ocupadas activas (excluye CANCELADA y descarta datos privados).
 * Utilizado internamente por la API mock api.citas.franjasOcupadas() antes de responder al cliente.
 */
export function aFranjasOcupadas(citas: Cita[]): FranjaOcupada[] {
  if (!Array.isArray(citas)) return [];
  return citas
    .filter((c) => c && c.estado !== "CANCELADA")
    .map(({ id_instructor, fecha, hora }) => ({ id_instructor, fecha, hora }));
}

/* Misma regla que `choque` de lib/horarios.ts (mismo instructor, fecha y hora),
   aplicada sobre la proyección mínima de franjas activas.
   La validación definitiva la sigue haciendo api.citas.create. */
function franjaOcupada(franjas: FranjaOcupada[], idInstructor: string, fecha: string, hora: string): boolean {
  return franjas.some(
    (f) => f.id_instructor === idInstructor && f.fecha === fecha && f.hora === hora
  );
}

/**
 * Calcula los horarios (franjas 'HH:MM') disponibles para agendar una cita con un instructor en una fecha concreta.
 * Valida disponibilidad según el horario del instructor, que la hora no haya pasado hoy,
 * que no choque con otra cita existente del instructor, y que no choque con las citas activas
 * ni clases grupales reservadas del propio cliente (B3).
 */
export function filtrarHorariosDisponibles(opciones: {
  instructor: Instructor | undefined;
  fecha: string;
  franjasOcupadas: FranjaOcupada[];
  hoy: string;
  horaActualTexto: string;
  citasCliente?: Cita[];
  clasesCliente?: { inscripcion: InscripcionClase; clase: Clase }[];
}): string[] {
  const { instructor, fecha, franjasOcupadas, hoy, horaActualTexto, citasCliente, clasesCliente } = opciones;
  if (!instructor || !fecha) return [];
  if (fecha < hoy) return [];
  if (!diaDisponible(instructor.horario, fecha)) return [];

  const slots = slotsPara(instructor.horario, fecha);
  const franjas = Array.isArray(franjasOcupadas) ? franjasOcupadas : [];
  const citasMias = Array.isArray(citasCliente) ? citasCliente : [];
  const clasesMias = Array.isArray(clasesCliente) ? clasesCliente : [];

  return slots.filter((slot) => {
    // Si la fecha es hoy, no se permiten horarios que ya pasaron
    if (fecha === hoy && slot <= horaActualTexto) return false;
    // No debe haber colisión con otra cita del instructor
    if (franjaOcupada(franjas, instructor.numero_identificacion, fecha, slot)) return false;
    // B3: El cliente no debe tener otra cita activa a esa misma hora
    const tieneCitaPropia = citasMias.some(
      (c) =>
        c.fecha === fecha &&
        c.hora === slot &&
        (c.estado === "PENDIENTE" || c.estado === "CONFIRMADA")
    );
    if (tieneCitaPropia) return false;
    // B3: El cliente no debe tener una clase grupal reservada que se solape con ese horario (asumiendo 30 min de cita)
    const tieneClasePropia = clasesMias.some(
      ({ inscripcion, clase }) =>
        inscripcion.fecha === fecha &&
        inscripcion.estado === "INSCRITA" &&
        seCruzan({ hora: slot, duracion_min: 30 }, { hora: clase.hora, duracion_min: clase.duracion_min })
    );
    if (tieneClasePropia) return false;
    return true;
  });
}

/**
 * Divide las inscripciones a clases grupales del cliente en reservas activas futuras
 * e historial (sesiones que ya pasaron, o donde el cliente se retiró o el gym canceló).
 */
export function separarInscripcionesCliente(opciones: {
  filas: { inscripcion: InscripcionClase; clase: Clase }[];
  hoy: string;
  horaActualTexto: string;
}): SeparacionInscripciones {
  const { filas, hoy, horaActualTexto } = opciones;
  if (!Array.isArray(filas)) return { activas: [], historial: [] };

  const activas: { inscripcion: InscripcionClase; clase: Clase }[] = [];
  const historial: { inscripcion: InscripcionClase; clase: Clase }[] = [];

  for (const f of filas) {
    if (!f || !f.inscripcion || !f.clase) continue;
    const esFutura = f.inscripcion.fecha > hoy || (f.inscripcion.fecha === hoy && f.clase.hora > horaActualTexto);
    if (esFutura && f.inscripcion.estado === "INSCRITA") {
      activas.push(f);
    } else {
      historial.push(f);
    }
  }

  // Activas: la más cercana primero
  activas.sort((a, b) => `${a.inscripcion.fecha} ${a.clase.hora}`.localeCompare(`${b.inscripcion.fecha} ${b.clase.hora}`));

  // Historial: la más reciente primero
  historial.sort((a, b) => `${b.inscripcion.fecha} ${b.clase.hora}`.localeCompare(`${a.inscripcion.fecha} ${a.clase.hora}`));

  return { activas, historial };
}

/**
 * Determina si el cliente puede retirarse de una sesión de clase grupal:
 * la inscripción debe estar INSCRITA y la sesión aún no debe haber empezado.
 */
export function puedeRetirarseClase(
  inscripcion: Pick<InscripcionClase, "estado" | "fecha">,
  horaClase: string,
  hoy: string,
  horaActualTexto: string
): boolean {
  if (!inscripcion || inscripcion.estado !== "INSCRITA") return false;
  return inscripcion.fecha > hoy || (inscripcion.fecha === hoy && horaClase > horaActualTexto);
}

/**
 * Modificador del sistema compartido `.badge-g` (gymbrot.css, sección BASE) para el estado
 * de una cita. Se usa como `badge-g ${className}`; no se crean variantes nuevas.
 */
export function badgeEstadoCita(estado: Cita["estado"]): { label: string; className: string } {
  switch (estado) {
    case "CONFIRMADA":
      return { label: "Confirmada", className: "badge-confirmada" };
    case "PENDIENTE":
      return { label: "Pendiente", className: "badge-pendiente" };
    case "COMPLETADA":
      return { label: "Completada", className: "badge-completada" };
    case "CANCELADA":
      return { label: "Cancelada", className: "badge-cancelada" };
    default:
      return { label: estado, className: "badge-g--plain" };
  }
}

/**
 * Modificador de `.badge-g` para el estado de una inscripción a clase grupal.
 */
export function badgeEstadoInscripcion(estado: EstadoInscripcion): { label: string; className: string } {
  switch (estado) {
    case "INSCRITA":
      return { label: "Reservada", className: "badge-activo" };
    case "RETIRADA":
      return { label: "Retirada", className: "badge-inactivo" };
    case "CANCELADA":
      return { label: "Cancelada por el gimnasio", className: "badge-cancelada" };
    default:
      return { label: estado, className: "badge-g--plain" };
  }
}

/**
 * Formatea una fecha ISO 'YYYY-MM-DD' en formato legible en español.
 */
export function formatearFechaCita(fechaISO: string): string {
  if (!fechaISO || !/^\d{4}-\d{2}-\d{2}$/.test(fechaISO)) return fechaISO || "Fecha no especificada";
  const [anio, mes, dia] = fechaISO.split("-").map(Number);
  const d = new Date(anio, mes - 1, dia);
  const opciones: Intl.DateTimeFormatOptions = {
    weekday: "short",
    year: "numeric",
    month: "short",
    day: "numeric",
  };
  return d.toLocaleDateString("es-ES", opciones);
}
