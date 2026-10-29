import { horaActual, NOMBRE_TIPO_CITA } from "../../lib/citas";
import { estadoMembresiaPorFecha, membresiaVigente } from "../../lib/membresias";
import { diasEntre, normalizar } from "../../lib/rutinas";
import type {
  Cita,
  Cliente,
  Ejercicio,
  Instructor,
  LetraSesion,
  Membresia,
  RegistroEntrenamiento,
  Rutina,
} from "../../types";
import {
  filtrarYOrdenarRegistrosRutina,
  resolverEjercicioHistorial,
} from "./historialEntrenamiento";
import type { AmbitoHistorialCliente } from "./historialEntrenamiento";

export type NavegacionMiRutinaState = {
  accionEntrenamiento?: "continuar" | "iniciar";
  sesion?: LetraSesion;
  seccion?: "historial";
};

export function textoObjetivoPlan(objetivo: string | null | undefined): string {
  const texto = objetivo?.trim() ?? "";
  switch (texto) {
    case "Ganancia muscular":
      return "aumentar masa muscular";
    case "Pérdida de peso":
      return "perder peso";
    case "Resistencia":
      return "mejorar la resistencia";
    case "Tonificación":
      return "tonificar";
    case "Rehabilitación":
      return "rehabilitación";
    default:
      return texto || "no especificado";
  }
}

export function limpiarDescripcionRutina(rutina: Rutina): string {
  const desc = (rutina.descripcion ?? "").trim();
  if (!desc) return "";
  const descNorm = normalizar(desc);
  const objNorm = normalizar(rutina.objetivo ?? "");
  const nomNorm = normalizar(rutina.nombre);
  if (descNorm === objNorm || descNorm === nomNorm) return "";

  const prefijoPlan = `plan de ${objNorm}`;
  if (objNorm && descNorm.startsWith(prefijoPlan)) {
    const resto = desc.slice(prefijoPlan.length).replace(/^[\s·.,:-]+/, "").trim();
    if (!resto) return "";
    return resto.charAt(0).toUpperCase() + resto.slice(1);
  }
  return desc;
}

export function formatearListaGrupos(grupos: string[]): string {
  if (!Array.isArray(grupos) || grupos.length === 0) return "";
  return new Intl.ListFormat("es", { type: "conjunction" }).format(
    grupos.map((grupo) => grupo.toLocaleLowerCase("es")),
  );
}

export function obtenerSaludoCliente(nombre: string | null | undefined): {
  saludo: string;
  tieneNombre: boolean;
} {
  const limpio = (nombre ?? "").trim();
  if (!limpio) {
    return {
      saludo: "Te damos la bienvenida a tu espacio de entrenamiento",
      tieneNombre: false,
    };
  }
  return {
    saludo: `Hola, ${limpio}`,
    tieneNombre: true,
  };
}

export type EstadoEfectivoMembresiaCliente =
  | "VIGENTE"
  | "POR_VENCER"
  | "VENCIDA"
  | "CANCELADA"
  | "PROGRAMADA"
  | "SIN_VERIFICAR"
  | "CUENTA_INACTIVA";

export function claseEstadoMembresia(estado: EstadoEfectivoMembresiaCliente): string {
  const clases: Record<EstadoEfectivoMembresiaCliente, string> = {
    VIGENTE: "badge-activo",
    POR_VENCER: "badge-pendiente",
    PROGRAMADA: "badge-pendiente",
    VENCIDA: "badge-vencida",
    CANCELADA: "badge-cancelada",
    CUENTA_INACTIVA: "badge-inactivo",
    SIN_VERIFICAR: "badge-inactivo",
  };
  return clases[estado];
}

export type ResumenMembresiaCliente = {
  membresia: Membresia;
  vigente: boolean;
  estadoEfectivo: EstadoEfectivoMembresiaCliente;
  etiquetaEstado: string;
  modalidadTexto: string;
  diasRestantes: number;
  textoVigencia: string;
};

export function seleccionarMembresiaResumen(opciones: {
  membresias: Membresia[];
  cliente?: Cliente | null;
  idCliente: string;
  gimnasioId: string;
  hoy: string;
}): ResumenMembresiaCliente | null {
  const { membresias, cliente, idCliente, gimnasioId, hoy } = opciones;
  if (!Array.isArray(membresias) || !idCliente || !gimnasioId) return null;

  const delCliente = membresias.filter(
    (m) => m && m.id_cliente === idCliente && m.gimnasio_id === gimnasioId,
  );
  if (delCliente.length === 0) return null;

  const ordenarMasReciente = (a: Membresia, b: Membresia) => {
    const cmpVenc = b.fecha_vencimiento.localeCompare(a.fecha_vencimiento);
    if (cmpVenc !== 0) return cmpVenc;
    const cmpInicio = b.fecha_inicio.localeCompare(a.fecha_inicio);
    if (cmpInicio !== 0) return cmpInicio;
    return b.id_membresia - a.id_membresia;
  };

  const activasVigentes = delCliente
    .filter((m) => estadoMembresiaPorFecha(m, hoy) === "ACTIVA")
    .sort(ordenarMasReciente);

  const programadas = delCliente
    .filter((m) => estadoMembresiaPorFecha(m, hoy) === "PROGRAMADA")
    .sort((a, b) => a.fecha_inicio.localeCompare(b.fecha_inicio) || ordenarMasReciente(a, b));
  const seleccionada = activasVigentes[0] ?? programadas[0] ?? [...delCliente].sort(ordenarMasReciente)[0];
  if (!seleccionada) return null;

  const vigente = membresiaVigente(seleccionada, hoy, cliente);
  const diasRestantes = diasEntre(hoy, seleccionada.fecha_vencimiento);
  const nombreTipo = (seleccionada.tipo_membresia ?? "").trim();
  const modalidadBase =
    seleccionada.modalidad_pago === "ANUAL"
      ? "Plan anual"
      : seleccionada.modalidad_pago === "SEMESTRAL"
        ? "Plan semestral"
        : "Plan mensual";
  const modalidadTexto = nombreTipo ? `${nombreTipo} · ${modalidadBase}` : modalidadBase;

  if (seleccionada.estado === "CANCELADA") {
    return {
      membresia: seleccionada,
      vigente: false,
      estadoEfectivo: "CANCELADA",
      etiquetaEstado: "Cancelada",
      modalidadTexto,
      diasRestantes,
      textoVigencia: "Membresía cancelada",
    };
  }

  if (seleccionada.estado === "VENCIDA" || seleccionada.fecha_vencimiento < hoy) {
    const diasVencida = Math.abs(diasRestantes);
    return {
      membresia: seleccionada,
      vigente: false,
      estadoEfectivo: "VENCIDA",
      etiquetaEstado: "Vencida",
      modalidadTexto,
      diasRestantes,
      textoVigencia:
        seleccionada.fecha_vencimiento >= hoy
          ? "Membresía registrada como vencida"
          : diasVencida === 1 ? "Venció hace 1 día" : `Venció hace ${diasVencida} días`,
    };
  }

  if (seleccionada.fecha_inicio > hoy) {
    const diasParaInicio = diasEntre(hoy, seleccionada.fecha_inicio);
    return {
      membresia: seleccionada,
      vigente: false,
      estadoEfectivo: "PROGRAMADA",
      etiquetaEstado: "Programada",
      modalidadTexto,
      diasRestantes,
      textoVigencia: diasParaInicio === 1 ? "Comienza mañana" : `Comienza en ${diasParaInicio} días`,
    };
  }

  if (!cliente || cliente.numero_identificacion !== idCliente || cliente.gimnasio_id !== gimnasioId) {
    return {
      membresia: seleccionada,
      vigente: false,
      estadoEfectivo: "SIN_VERIFICAR",
      etiquetaEstado: "Sin verificar",
      modalidadTexto,
      diasRestantes,
      textoVigencia: "No pudimos verificar el estado de tu cuenta",
    };
  }

  if (!vigente) {
    return {
      membresia: seleccionada,
      vigente: false,
      estadoEfectivo: "CUENTA_INACTIVA",
      etiquetaEstado: "Cuenta inactiva",
      modalidadTexto,
      diasRestantes,
      textoVigencia: "Consulta en recepción el estado de tu cuenta",
    };
  }

  if (diasRestantes <= 7) {
    return {
      membresia: seleccionada,
      vigente: true,
      estadoEfectivo: "POR_VENCER",
      etiquetaEstado: "Por vencer",
      modalidadTexto,
      diasRestantes,
      textoVigencia:
        diasRestantes === 0
          ? "Vence hoy"
          : diasRestantes === 1
            ? "Vence mañana"
            : `Vence en ${diasRestantes} días`,
    };
  }

  return {
    membresia: seleccionada,
    vigente: true,
    estadoEfectivo: "VIGENTE",
    etiquetaEstado: "Activa",
    modalidadTexto,
    diasRestantes,
    textoVigencia: `${diasRestantes} días restantes`,
  };
}

export type ResumenProximaCitaCliente = {
  cita: Cita;
  tipoTexto: string;
  nombreInstructor: string;
  esHoy: boolean;
  estadoTexto: string;
};

export function seleccionarProximaCitaCliente(opciones: {
  citas: Cita[];
  instructores: Instructor[];
  idCliente: string;
  gimnasioId: string;
  hoy: string;
  horaActualTexto?: string;
}): ResumenProximaCitaCliente | null {
  const {
    citas,
    instructores,
    idCliente,
    gimnasioId,
    hoy,
    horaActualTexto = horaActual(),
  } = opciones;
  if (!Array.isArray(citas) || !idCliente || !gimnasioId) return null;

  const futuras = citas
    .filter((c) => {
      if (!c || c.id_cliente !== idCliente || c.gimnasio_id !== gimnasioId) {
        return false;
      }
      if (c.estado !== "PENDIENTE" && c.estado !== "CONFIRMADA") {
        return false;
      }
      return c.fecha > hoy || (c.fecha === hoy && c.hora >= horaActualTexto);
    })
    .sort((a, b) => `${a.fecha} ${a.hora}`.localeCompare(`${b.fecha} ${b.hora}`));

  const proxima = futuras[0];
  if (!proxima) return null;

  const instructor = Array.isArray(instructores)
    ? instructores.find(
        (i) =>
          i.numero_identificacion === proxima.id_instructor &&
          i.gimnasio_id === gimnasioId,
      )
    : undefined;

  const nombreInstructor = instructor
    ? `${instructor.nombre} ${instructor.apellidos}`.trim()
    : "Instructor por confirmar";

  return {
    cita: proxima,
    tipoTexto: NOMBRE_TIPO_CITA[proxima.tipo_cita] ?? proxima.tipo_cita,
    nombreInstructor,
    esHoy: proxima.fecha === hoy,
    estadoTexto:
      proxima.estado === "CONFIRMADA" ? "Confirmada" : "Pendiente de confirmación",
  };
}

export type ResumenUltimaActividadCliente = {
  registro: RegistroEntrenamiento;
  totalRegistros: number;
  esHoy: boolean;
  cantidadEjercicios: number;
  totalSeries: number;
  nombresEjercicios: string[];
  resumenEjerciciosTexto: string;
};

export function resumirUltimaActividad(opciones: {
  registros: RegistroEntrenamiento[];
  ambito: AmbitoHistorialCliente;
  catalogo: Ejercicio[];
  hoy?: string;
}): ResumenUltimaActividadCliente | null {
  const { registros, ambito, catalogo, hoy } = opciones;
  const ordenados = filtrarYOrdenarRegistrosRutina(registros, ambito);
  const ultimo = ordenados[0];
  if (!ultimo) return null;

  const lista = Array.isArray(ultimo.ejercicios_realizados)
    ? ultimo.ejercicios_realizados
    : [];
  const nombresEjercicios = lista.map(
    (e) => resolverEjercicioHistorial(e.id_ejercicio, catalogo).nombre,
  );
  const primeros = nombresEjercicios.slice(0, 3);
  const restantes = nombresEjercicios.length - primeros.length;
  const resumenEjerciciosTexto =
    primeros.length === 0
      ? ""
      : restantes > 0
        ? `${primeros.join(", ")} y ${restantes} más`
        : primeros.join(", ");

  const totalSeries = lista.reduce((acc, ej) => {
    if (Array.isArray(ej.detalle_series) && ej.detalle_series.length > 0) {
      return acc + ej.detalle_series.length;
    }
    return acc + (ej.series ?? 0);
  }, 0);

  return {
    registro: ultimo,
    totalRegistros: ordenados.length,
    esHoy: Boolean(hoy && ultimo.fecha === hoy),
    cantidadEjercicios: lista.length,
    totalSeries,
    nombresEjercicios,
    resumenEjerciciosTexto,
  };
}
