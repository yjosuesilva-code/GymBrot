/* [P3] B7 · KAN-94 — Contrato de Clases con aforo (para el instructor T3 y el cliente T4).

   La implementación vive en api.ts como `api.clases` (bloque [P3]): ahí están `db`,
   `readTenant` y `writeTenant`, que no se exportan. Este archivo solo la re-exporta con el
   nombre acordado en Jira, junto con los tipos y las funciones de apoyo.

   Reglas principales:
   - Una Clase es UN día de la semana a una hora fija. Una rumba de lunes, miércoles y viernes
     son 3 clases.
   - El cliente se inscribe a una SESIÓN: la clase en una fecha concreta ('YYYY-MM-DD').
   - Solo se ven y se reservan sesiones desde hoy hasta hoy + DIAS_MAX_INSCRIPCION días.
   - Para inscribirse: cliente ACTIVO con membresía vigente (cualquier plan), cupo libre,
     sesión no cancelada ni empezada, y sin otra inscripción que se cruce en fecha y hora.

   Uso desde la vista del cliente:
     import { apiClases, DIAS_MAX_INSCRIPCION } from "../data/apiClases";
     const sesiones = await apiClases.sesiones(hoy, ultimoDiaReservable());
     const res = await apiClases.inscribir(sesion.clase.id_clase, cedula, sesion.fecha);
     const mias = await apiClases.deCliente(cedula);            // próximas primero
     await apiClases.retirar(mias[0].inscripcion.id_inscripcion, cedula); */
import { api } from "./api";

export const apiClases = api.clases;

export {
  DIAS_MAX_INSCRIPCION,
  NOMBRE_TIPO_CLASE,
  TIPOS_CLASE,
  horaFin,
  ultimoDiaReservable,
} from "../lib/clases";

export type {
  Clase,
  ClaseNueva,
  EstadoInscripcion,
  InscripcionClase,
  SesionClase,
  TipoClase,
} from "../types";
