import { utils } from "../lib/utils";
import { membresiaVigente } from "../lib/membresias";
import { notificarCambioDeDatos } from "../lib/datos";
import { OBJETIVOS_RUTINA } from "../lib/rutinas"; // [P3] única lista de objetivos
import { slugUnico, slugify, validarSlug, normalizarSlugDeUrl } from "../lib/slug"; // [multitenant-slug]
import { gimnasioFijado } from "../tenant/tenantActivo"; // [multitenant-slug]
import { migrarDisponibilidadTexto, diaDisponible, horaDisponible, choque, validarHorario } from "../lib/horarios"; // [P3] horario de instructores y citas
import type {
  Gimnasio, // [multitenant]
  GimnasioPublico, // [multitenant-slug]
  PlanSoftware, // [plataforma]
  PagoSoftware, // [plataforma]
  Cliente,
  ClienteNuevo, // [multitenant]
  Membresia,
  MembresiaNueva, // [multitenant]
  Pago,
  Ingreso,
  Ejercicio,
  EjercicioNuevo, // [P3]
  EstadoEjercicio, // [P3]
  Usuario,
  ApiResp,
  PlanMembresia,
  HistorialMembresia,
  Progreso, // [P2]
  ProgresoNuevo, // [P2]
  Cita, // [P2]
  CitaNueva, // [P2]
  Instructor, // [P3]
  InstructorNuevo, // [P3]
  InstructorCreado, // [P3]
  CuentaInicial, // [P3]
  EstadoInstructor, // [P3]
  Especialidad, // [P3]
  Rutina, // [P3]
  RutinaNueva, // [P3]
  RutinaEjercicio, // [P3]
  LetraSesion, // [P3] Rutinas v2
  EstadoRutina, // [P3]
  SesionEjercicioNuevo, // [P3]
  RegistroEntrenamiento, // [P3]
  RegistroNuevo, // [P3]
  AvanceRutina, // [P3]
  ResumenSupervision, // [P3]
  FilaSupervision, // [P3]
} from "../types";

interface Seed {
  planesSoftware: PlanSoftware[];
  gimnasios: Gimnasio[];
  pagosSoftware: PagoSoftware[];
  usuarios: Usuario[];
  clientes: Cliente[];
  planes: PlanMembresia[];
  membresias: Membresia[];
  historialMembresias: HistorialMembresia[];
  pagos: Pago[];
  ingresos: Ingreso[];
  ejercicios: Ejercicio[];
  instructores: Instructor[]; // [P3]
  rutinas: Rutina[]; // [P3]
  rutina_ejercicios: RutinaEjercicio[]; // [P3]
  registros_entrenamiento: RegistroEntrenamiento[]; // [P3] Rutinas v2
  progreso: Progreso[]; // [P2]
  citas: Cita[]; // [P2]
}

// --- Generadores de fechas del seed -------------------------------------
// El seed usa fechas relativas a "hoy" para que el Dashboard nunca quede
// obsoleto: si los datos fueran fijos, en el mes siguiente las graficas
// volverian a mostrar cero.

// dia(0) = hoy, dia(1) = ayer, dia(6) = hace 6 dias
function dia(offset: number): string {
  const d = new Date();
  d.setDate(d.getDate() - offset);
  return utils.isoDate(d);
}

// Suma dias a una fecha 'YYYY-MM-DD' sin pasar por UTC: usar toISOString()
// correria la fecha un dia en zonas a poniente.
function sumarDias(iso: string, dias: number): string {
  const [anio, mes, diaNum] = iso.split("-").map(Number);
  const d = new Date(anio, mes - 1, diaNum + dias);
  return d.getFullYear() + "-" + String(d.getMonth() + 1).padStart(2, "0") + "-" + String(d.getDate()).padStart(2, "0");
}

// Suma minutos a un datetime 'YYYY-MM-DDTHH:MM:SS' usando aritmetica de
// strings. No usar toISOString(): convierte a UTC y correria la hora local,
// moviendo las entradas fuera de las franjas 06-21 de la grafica.
function sumarMinutos(iso: string, minutos: number): string {
  const [fecha, hora] = iso.split("T");
  const [h, m] = hora.split(":").map(Number);
  const total = h * 60 + m + minutos;
  const hh = Math.floor(total / 60) % 24;
  const mm = total % 60;
  return fecha + "T" + String(hh).padStart(2, "0") + ":" + String(mm).padStart(2, "0") + ":00";
}

// Reloj local en 'HH:MM:SS'. Se junta con dia(0) para escribir hora_entrada con
// el mismo criterio que el seed: la fecha en el eje de utils.isoDate (que es el
// que compara Dashboard) y la hora en local, que es la que reparte la grafica
// de horas picos. Usar toISOString() pondria la hora UTC y correria cada
// entrada una franja para atras.
function relojLocal(): string {
  const d = new Date();
  const p = (n: number) => String(n).padStart(2, "0");
  return p(d.getHours()) + ":" + p(d.getMinutes()) + ":" + p(d.getSeconds());
}

// Horarios tipo de un gimnasio: picos temprano (6-8) y en la tarde (18-20).
const HORAS_LABORAL = [6, 7, 7, 8, 8, 9, 12, 13, 17, 18, 18, 19, 19, 20, 21];
const HORAS_DOMINGO = [9, 10, 11, 12, 17, 18];

// Rotacion de clientes para los dias ya cerrados.
const RUTINA = [
  "1000000001",
  "1000000002",
  "1000000003",
  "1000000005",
  "1000000007",
];

// Los dias pasados se generan en bucle: son volumen, no informacion.
function ingresosPasados(): Ingreso[] {
  const lista: Ingreso[] = [];
  let id = 0;

  for (let d = 6; d >= 1; d--) {
    const fecha = dia(d);
    const domingo = new Date(fecha + "T12:00:00").getDay() === 0;
    const completo = domingo ? HORAS_DOMINGO : HORAS_LABORAL;
    // Cada dia cierra con distinto volumen. Sin esto la grafica semanal
    // queda en meseta y como el resaltado neon aplica a todo lo que
    // empata con el maximo, 5 de 7 barras brillarian y no se destacaria
    // ningun pico.
    const horas = completo.slice(0, Math.max(6, completo.length - ((d * 2) % 5)));

    horas.forEach((hora, i) => {
      const minuto = (i * 7) % 60;
      const entrada =
        fecha + "T" + String(hora).padStart(2, "0") + ":" + String(minuto).padStart(2, "0") + ":00";
      lista.push({
        gimnasio_id: "gym-centro",
        id_ingreso: ++id,
        id_cliente: RUTINA[(i + d) % RUTINA.length],
        fecha,
        hora_entrada: entrada,
        hora_salida: sumarMinutos(entrada, 60),
        metodo_verificacion: i % 2 === 0 ? "HUELLA" : "CONTRASENA",
        estado_verificacion: "APROBADO",
      });
    });
  }

  return lista;
}

// El dia de hoy va escrito a mano porque los 5 que siguen dentro sin
// hora_salida alimentan los KPIs "Activos ahora" y "Demografia en vivo",
// y hay que elegir clientes que cubran los tres rangos de edad:
//   Juan David 2009 -> 17 (menor)  |  Diego 1965 -> 61 (senior)
//   Ana 1995, Carlos 1988, Andres 1992 -> adultos
function ingresosDeHoy(): Ingreso[] {
  const fecha = dia(0);
  const base = ingresosPasados().length; // sigue la numeracion de id

  const filas: [string, string, boolean][] = [
    // [hora, id_cliente, sigueDentro]
    ["06:30", "1000000003", true],
    ["06:45", "1000000005", true],
    ["07:10", "1000000001", true],
    ["07:35", "1000000002", true],
    ["09:00", "1000000007", true],
    ["10:15", "1000000001", false],
    ["11:40", "1000000003", false],
    ["12:50", "1000000005", false],
  ];

  return filas.map(([hora, cliente, dentro], i) => {
    const entrada = fecha + "T" + hora + ":00";
    return {
      gimnasio_id: "gym-centro",
      id_ingreso: base + i + 1,
      id_cliente: cliente,
      fecha,
      hora_entrada: entrada,
      hora_salida: dentro ? null : sumarMinutos(entrada, 60),
      metodo_verificacion: i % 2 === 0 ? "HUELLA" : "CONTRASENA",
      estado_verificacion: "APROBADO",
    };
  });
}

// --- Seed de finanzas ------------------------------------------------------
//
// Todo el historial financiero usa fechas relativas a hoy. Escribirlas fijas
// era un error: las membresias.tenian 2026-08-15 y 2026-09-15 hardcodeadas, y
// en cuanto paso la fecha de vencimiento las cuatro quedaron vencidas, Finanzas
// mostro 0 membresias vigentes y el control de acceso dejo entrar a todo el
// mundo porque el historial seguia con activa=true.

let secuenciaPago = 0;

function pago(
  idCliente: string,
  idMembresia: number,
  haceDias: number,
  valor: number,
  metodo: Pago["metodo_pago"],
  estado: Pago["estado_pago"] = "EXITOSO",
  referencia = "",
  observaciones = "",
  fechaExacta?: string,
): Pago {
  return {
    // Todo el historial sembrado es de gym-centro; el pago de Titan lo pisa.
    gimnasio_id: "gym-centro",
    id_pago: ++secuenciaPago,
    id_cliente: idCliente,
    id_membresia: idMembresia,
    fecha_pago: fechaExacta ?? dia(haceDias),
    valor,
    metodo_pago: metodo,
    estado_pago: estado,
    referencia_transaccion: referencia,
    observaciones,
  };
}

// Primer dia del mes 'mesesAtras' meses antes de hoy. Anclar por mes en vez de
// por cantidad de dias es lo que mantiene estable la serie: con offsets fijos
// de 30 dias la cantidad de meses con dato dependia del dia del mes en que se
// corria el seed, y la grafica aparecia con 11 o 13 barras.
function inicioDeMes(mesesAtras: number): string {
  const d = new Date();
  d.setDate(1);
  d.setMonth(d.getMonth() - mesesAtras);
  return utils.isoDate(d);
}

// Un dia dentro del mes 'mesesAtras' atras, recortado al ultimo dia si el mes
// es mas corto. Asi el dia de cobro de cada cliente (Ana el 20, Carlos el 8)
// se mantiene parecido en todos los meses. Nunca devuelve una fecha futura:
// si el dia de cobro todavia no llego en el mes corriente, se recorta a hoy.
function diaDeMes(mesesAtras: number, diaDelMes: number): string {
  const base = inicioDeMes(mesesAtras);
  const [anio, mes] = base.split("-").map(Number);
  const ultimoDelMes = new Date(anio, mes, 0).getDate();
  const fecha = sumarDias(base, Math.min(diaDelMes, ultimoDelMes) - 1);
  const hoy = dia(0);
  return fecha > hoy ? hoy : fecha;
}

// Un pago por mes hacia atras, para que la grafica de ingresos tenga los 12
// meses con dato en vez de solo el corriente.
//
// El pago del mes en curso usa diaDeMes(0, ...) en vez de un offset fijo de
// dias: con offsets, "hace 16 dias" caia en el mes anterior cuando hoy era dia
// 1 o 2, y el dia de cobro caia en el futuro cuando hoy era dia 1. Con anclaje
// por mes la serie tiene siempre los mismos 12 meses, sea cual sea el dia.
function pagosMensuales(
  idCliente: string,
  idMembresia: number,
  valor: number,
  metodos: Pago["metodo_pago"][],
  diaDeCobro: number,
  mesesAtras: number,
  renewalHoy = false,
): Pago[] {
  const lista: Pago[] = [];
  // La renovacion de hoy se ancla al dia actual para que "Recaudado hoy" tenga
  // movimiento; las anteriores, al dia de cobro habitual del cliente.
  const actual = renewalHoy ? dia(0) : diaDeMes(0, diaDeCobro);
  lista.push(pago(idCliente, idMembresia, 0, valor, metodos[0], "EXITOSO", "", "", actual));

  for (let mes = 1; mes <= mesesAtras; mes++) {
    const fecha = diaDeMes(mes, diaDeCobro);
    // Se descarta cualquier cuota que caiga en el mismo mes que la renovacion
    // mas reciente, para no inventar dos cobros en un mismo mes.
    if (fecha >= actual) continue;
    lista.push(
      pago(idCliente, idMembresia, 0, valor, metodos[mes % metodos.length], "EXITOSO", "", "", fecha),
    );
  }
  return lista;
}

// Serie de cada cliente con membresia vigente. Se declaran antes que las
// membresias porque de ellas se derivan fecha_inicio (primer pago) y
// fecha_registro: una membresia no puede empezar antes de que el cliente
// exista, ni antes del primer pago que la financia.
//
// Los dos ultimos argumentos son los meses hacia atras que se cubren (11) y si
// la renovacion mas reciente cae hoy. Carlos y Juan renuevan hoy, que es lo que
// alimenta "Recaudado hoy".
// Los valores de la serie siguen a los planes del catalogo (v12): Premium,
// Estándar y Básico cuestan 110000, 80000 y 50000 al mes. Si cambian los
// planes, esta serie deja de ser coherente con el modal de cobro.
const serieAna    = pagosMensuales('1000000001', 1, 110000, ['TARJETA', 'NEQUI'],    20, 11);
const serieCarlos = pagosMensuales('1000000002', 2, 50000,  ['EFECTIVO', 'NEQUI'],    8, 11, true);
const serieJuan   = pagosMensuales('1000000003', 3, 80000,  ['TARJETA', 'EFECTIVO'], 12, 11, true);
const serieAndres = pagosMensuales('1000000007', 5, 80000,  ['NEQUI', 'TARJETA'],    18, 11);

// El pago anual de Diego cierra la serie de ingresos del mes 11.
const pagoAnualDiego = pago(
  '1000000005', 4, 0, 1100000, 'TRANSFERENCIA', 'EXITOSO', 'TR-2290',
  'Pago anual anticipado', diaDeMes(11, 6),
);

// Pagos sin aplicar: son los unicos estados distintos de EXITOSO, y son la
// razon de que la tabla "Pagos por aplicar" no salga vacia.
const pagosSinAplicar = [
  pago('1000000004', 6, 40, 80000, 'TRANSFERENCIA', 'PENDIENTE', 'TR-2299', 'Transferencia sin aplicar'),
  pago('1000000006', 7, 25, 50000, 'EFECTIVO',      'PENDIENTE', '',          'Cobro en efectivo sin membresia activa'),
];

// gym-titan: el unico pago de la Ana de Titan (membresia 8). Misma cedula que
// la Ana de Centro, que tiene 12 pagos: si su detalle muestra mas de uno, el
// filtro por gimnasio fallo.
const pagoTitanAna: Pago = { ...pago('1000000001', 8, 20, 50000, 'NEQUI'), gimnasio_id: 'gym-titan' };

function inicioDe(serie: Pago[]): string {
  return serie.reduce((menor, p) => (p.fecha_pago < menor ? p.fecha_pago : menor), serie[0].fecha_pago);
}

function finDe(serie: Pago[], diasExtra: number): string {
  const ultimo = serie.reduce((mayor, p) => (p.fecha_pago > mayor ? p.fecha_pago : mayor), serie[0].fecha_pago);
  return sumarDias(ultimo, diasExtra);
}

/* ---------------------------------------------------------------------------
   Seed masivo (v12). Generadores deterministicos: el seed no usa
   Math.random, asi que dos cargas producen exactamente los mismos ids y
   fechas y la UI nunca ve datos que cambian solos. Los numeros inventados
   solo alteran nombres, telefonos y anos de nacimiento; las claves y los
   valores financieros siguen reglas fijas.
   --------------------------------------------------------------------------- */

let semillaGen = 19700101;
// Devuelve un valor en [base, base+mod-1] (inclusivo). El rango base..base+mod
// se elige llamando con azar(1, n) para ids 1..n y con azar(0, n) para 0..n-1;
// el operador % sobre `base+semilla` daria 0 con algunos seeds, y un id 0 de
// ejercicio no existe.
function azar(base: number, mod: number): number {
  semillaGen = (semillaGen * 1103515245 + 12345) & 0x7fffffff;
  return base + (semillaGen % mod);
}

// Primeros meses (fsano) y ultimos nombres para compor socios e instructores.
const NOMBRES_SOCIO = [
  "Santiago", "Valentina", "Mariana", "Sebastián", "Laura", "Andrés", "Camila", "Daniel",
  "Isabella", "Felipe", "Nicole", "Julián", "Sara", "Mateo", "Salomé", "Juan Pablo",
  "María José", "Pedro", "Luisa", "David", "Fernanda", "Gabriel", "Valeria", "Simón",
];
const APELLIDOS_SOCIO = [
  "García", "Rodríguez", "Martínez", "López", "Hernández", "González", "Pérez", "Sánchez",
  "Ramírez", "Torres", "Flores", "Rivera", "Gómez", "Díaz", "Reyes", "Morales", "Castro",
  "Ortiz", "Silva", "Vargas",
];

/* Los tres tipos de plan de v12: Básico 50.000, Estándar 80.000 y Premium
   110.000 al mes. Semestral y anual se calculan con descuento del 5% y 10%
   sobre la mensualidad por 6 y 12 meses, para que el numero "menos por el
   paquete" se entienda solo en el detalle. */
const PLANES_V12: PlanMembresia[] = [
  { id_plan:1, nombre:'Básico',   descripcion:'Acceso a sala de maquinas y area cardio',  precio_mensual:50000,  precio_semestral:285000,  precio_anual:540000,   estado:'ACTIVO', beneficios:['Acceso a sala de máquinas', 'Área de cardio', 'Registro de asistencia'] },
  { id_plan:2, nombre:'Estándar', descripcion:'Básico mas clases grupales',               precio_mensual:80000,  precio_semestral:456000,  precio_anual:864000,   estado:'ACTIVO', beneficios:['Todo lo del Básico', 'Clases grupales', 'Reserva de cupos'] },
  { id_plan:3, nombre:'Premium',  descripcion:'Todo lo anterior mas sauna y entrenador',  precio_mensual:110000, precio_semestral:627000, precio_anual:1188000, estado:'ACTIVO', beneficios:['Todo lo del Estándar', 'Sauna', 'Entrenador personal 2h/mes'] },
];

const CLIENTES_EXTRA: Cliente[] = [];
const USUARIOS_CLIENTES: Usuario[] = [];
const MEMBRESIAS_EXTRA: Membresia[] = [];
const HISTORIAL_EXTRA: HistorialMembresia[] = [];
const PAGOS_EXTRA: Pago[] = [];

// Una membresia por cada socio nuevo que tenga una: 72 de los 93 socios
// generados, con su serie de pagos y su historial coherentes (la misma
// disciplina con la que se escriben las 5 membresias a mano de arriba).
for (let i = 0; i < 72; i++) {
  const idMembresia = 9 + i;
  const idCliente = String(1000000008 + i);
  const plan = PLANES_V12[i % 3];

  // Vencidas de vez en cuando, para que existan casos de cobro pendiente y
  // socios que deben renovar. El resto quedan activas con vencimiento futuro.
  const vencida = i % 11 === 0;
  const modalidad = i % 10 === 7 ? 'SEMESTRAL' : i % 10 === 9 ? 'ANUAL' : 'MENSUAL';
  const metodo: Pago['metodo_pago'] = (['EFECTIVO', 'NEQUI', 'TARJETA', 'TRANSFERENCIA'] as const)[i % 4];

  let serie: Pago[];
  let valor: number;
  let diasVigencia: number;

  switch (modalidad) {
    case 'SEMESTRAL':
      valor = plan.precio_semestral;
      diasVigencia = 180;
      serie = vencida
        ? [pago(idCliente, idMembresia, 200, valor, metodo), pago(idCliente, idMembresia, 150, valor, metodo)]
        : [pago(idCliente, idMembresia, 190, valor, metodo), pago(idCliente, idMembresia, 10, valor, metodo)];
      break;
    case 'ANUAL':
      valor = plan.precio_anual;
      diasVigencia = 365;
      serie = [pago(idCliente, idMembresia, vencida ? 200 : 20, valor, metodo)];
      break;
    default:
      valor = plan.precio_mensual;
      diasVigencia = 30;
      serie = vencida
        ? Array.from({ length: 2 + (i % 3) }, (_, k) => pago(idCliente, idMembresia, 45 + k * 30, valor, metodo))
        : pagosMensuales(idCliente, idMembresia, valor, ['EFECTIVO', 'NEQUI', 'TARJETA'], 2 + (i * 5) % 26, 1 + (i % 8), i % 4 === 0);
      break;
  }

  MEMBRESIAS_EXTRA.push({
    gimnasio_id: 'gym-centro',
    id_membresia: idMembresia,
    id_cliente: idCliente,
    id_plan: plan.id_plan,
    tipo_membresia: plan.nombre,
    modalidad_pago: modalidad,
    valor,
    fecha_inicio: inicioDe(serie),
    // Vencida: el ultimo pago y los dias de vigencia caen en el pasado.
    fecha_vencimiento: vencida ? finDe(serie, 5) : finDe(serie, diasVigencia),
    estado: vencida ? 'VENCIDA' : 'ACTIVA',
  });
  HISTORIAL_EXTRA.push({
    gimnasio_id: 'gym-centro',
    id_historial: 9 + i,
    id_cliente: idCliente,
    id_membresia: idMembresia,
    fecha_asignacion: inicioDe(serie),
    activa: !vencida,
  });
  PAGOS_EXTRA.push(...serie);
}

// Los 93 socios nuevos de gym-centro. Los que tienen membresia heredan su
// fecha_registro del primer pago (una membresia no puede empezar antes de que
// el cliente exista); los que estan sin plan se registran hace unos meses.
// 1 de cada 6 queda sin fila en `usuarios` a proposito, para que el badge
// "Sin codigo" de Clientes siga teniendo quien lo muestre.
for (let i = 0; i < 93; i++) {
  const id = String(1000000008 + i);
  const nombre = NOMBRES_SOCIO[i % NOMBRES_SOCIO.length];
  const apellidos = APELLIDOS_SOCIO[i % APELLIDOS_SOCIO.length] + " " + APELLIDOS_SOCIO[(i * 7) % APELLIDOS_SOCIO.length];
  const anioNac = azar(1945, 68);          // 1945..2012: niños, adultos y senior
  const diaNac = azar(1, 28);
  const mesNac = azar(1, 12);
  const nacimiento = anioNac + "-" + String(mesNac).padStart(2, "0") + "-" + String(diaNac).padStart(2, "0");
  const membresia = MEMBRESIAS_EXTRA.find((m) => m.id_cliente === id);
  // Sin membresia el socio no puede estar ACTIVO: no tiene plan por el cual
  // entrar. Ya vencida (de antes) se mantiene el matiz; los que nunca tuvieron
  // plan quedan INACTIVO. Los otros estados se reparten para que la lista no
  // sea monótona.
  const estado: Cliente['estado'] = !membresia
    ? 'INACTIVO'
    : i % 17 === 0 ? 'SUSPENDIDO' : i % 13 === 0 ? 'INACTIVO' : i % 19 === 0 ? 'BLOQUEADO' : 'ACTIVO';

  CLIENTES_EXTRA.push({
    gimnasio_id: 'gym-centro',
    numero_identificacion: id,
    tipo_identificacion: 'CC',
    nombre,
    apellidos,
    telefono: "30" + String(10000000 + azar(0, 99999999)).padStart(8, "0"),
    correo: "socio" + id + "@mail.com",
    direccion: "Cl " + azar(1, 90) + " #" + azar(1, 40) + "-" + azar(1, 60),
    fecha_nacimiento: nacimiento,
    estado,
    // fecha_inicio ya es el primer pago de la serie: menos trabajo que volver
    // a filtrar PAGOS_EXTRA y sin riesgo de calcular un array vacio.
    fecha_registro: membresia ? membresia.fecha_inicio : dia(30 + azar(0, 200)),
  });

  // 1 de cada 6 sin codigo de acceso: sin fila en `usuarios` el modo manual
  // de control de acceso responde "no tiene codigo", que es justo el caso que
  // se quiere ver en la lista.
  if (i % 6 !== 0) {
    USUARIOS_CLIENTES.push({
      gimnasio_id: 'gym-centro',
      numero_identificacion: id,
      nombre,
      apellidos,
      correo: "socio" + id + "@mail.com",
      contrasena: contrasenaInicial(nombre, id),
      estado,
      tipo_usuario: 'CLIENTE',
      rol: 'CLIENTE',
      debe_cambiar_contrasena: true,
    });
  }
}

// Instructores 2000000004..2000000020 (se suman a los tres que ya habia).
const INSTRUCTORES_EXTRA: Instructor[] = [];
const ESPECIALIDADES: Especialidad[] = [
  'Entrenador personal', 'Nutrición', 'Fisioterapia', 'Yoga/Pilates', 'Cardio', 'Musculación', 'Funcional',
];
const DISPONIBILIDADES = [
  'Lun-Vie 6:00-14:00', 'Lun-Mié-Vie 16:00-21:00', 'Mar-Jue 8:00-12:00', 'Lun-Jue 14:00-20:00', 'Sab 8:00-13:00',
];
for (let i = 0; i < 17; i++) {
  const id = "20000000" + String(4 + i).padStart(2, "0");
  const nombre = NOMBRES_SOCIO[(i * 5) % NOMBRES_SOCIO.length];
  const apellidos = APELLIDOS_SOCIO[(i * 3) % APELLIDOS_SOCIO.length] + " " + APELLIDOS_SOCIO[(i * 9) % APELLIDOS_SOCIO.length];
  INSTRUCTORES_EXTRA.push({
    gimnasio_id: 'gym-centro',
    numero_identificacion: id,
    tipo_identificacion: 'CC',
    nombre,
    apellidos,
    telefono: "31" + String(20000000 + azar(0, 99999999)).padStart(8, "0"),
    correo: "instructor" + id + "@gymbrot.com",
    especialidad: ESPECIALIDADES[i % ESPECIALIDADES.length],
    horario: migrarDisponibilidadTexto(DISPONIBILIDADES[i % DISPONIBILIDADES.length]),
    fecha_contratacion: "20" + (20 + (i % 6)) + "-" + String(1 + (i % 12)).padStart(2, "0") + "-" + String(1 + (i % 26)).padStart(2, "0"),
    estado: i % 7 === 0 ? 'INACTIVO' : 'ACTIVO',
  });
}

// ===== [P3] Rutinas v2: generador de la semilla (KAN-55) =====
/* Reemplaza las rutinas v1 (dias_semana) por rutinas v2: división A, A/B o A/B/C, ejercicios del
   catálogo base por sesión con valores según el nivel, y registros de entrenamiento con avances
   variados. Se ejecuta DESPUÉS de armar el SEED (necesita clientes, instructores y ejercicios) y
   no usa azar(): todo sale del índice de cada cliente, así la semilla es siempre la misma.

   A cada cliente ACTIVO le toca un escenario del CICLO, para que la supervisión tenga los 4
   indicadores: vigentes (al día o atrasadas), por vencer, vencidas sin renovar y sin rutina. */
type EscenarioSemilla = "AL_DIA" | "ATRASADA" | "POR_VENCER" | "VENCIDA" | "RENOVADA" | "SIN_RUTINA";
const CICLO_SEMILLA: EscenarioSemilla[] = [
  "AL_DIA", "ATRASADA", "POR_VENCER", "AL_DIA", "VENCIDA", "RENOVADA", "ATRASADA", "SIN_RUTINA", "AL_DIA", "VENCIDA",
];
type NivelSemilla = Ejercicio["nivel"];
const NIVELES_SEMILLA: NivelSemilla[] = ["Principiante", "Intermedio", "Avanzado"];
// Series, rango de repeticiones, descanso y % del peso base según el nivel
const PRESCRIPCION: Record<NivelSemilla, { series: number; min: number; max: number; descanso: number; factor: number }> = {
  Principiante: { series: 3, min: 12, max: 15, descanso: 60, factor: 0.5 },
  Intermedio: { series: 4, min: 8, max: 12, descanso: 75, factor: 0.75 },
  Avanzado: { series: 4, min: 6, max: 8, descanso: 90, factor: 1 },
};
const PESO_BASE: Record<Ejercicio["equipo"], number | null> = {
  "Barra": 60, "Mancuerna": 16, "Máquina": 50, "Polea": 30, "Kettlebell": 16, "Banda elástica": null, "Peso corporal": null,
};
// Grupos musculares de cada sesión según cuántas sesiones tiene la división
const GRUPOS_POR_DIVISION: Record<number, Ejercicio["grupo_muscular"][][]> = {
  1: [["Piernas", "Pecho", "Espalda", "Abdomen", "Cardio"]],
  2: [["Pecho", "Espalda", "Hombros", "Bíceps", "Tríceps"], ["Piernas", "Glúteos", "Abdomen", "Cardio"]],
  3: [["Pecho", "Tríceps", "Hombros"], ["Espalda", "Bíceps", "Abdomen"], ["Piernas", "Glúteos", "Cardio"]],
};

function generarRutinasV2(seed: Seed): void {
  const base = seed.ejercicios.filter((e) => e.gimnasio_id === null && e.estado === "ACTIVO");
  const rutinas: Rutina[] = [];
  const filas: RutinaEjercicio[] = [];
  const registros: RegistroEntrenamiento[] = [];
  let idRutina = 1;
  let idRegistro = 1;

  // Ejercicios de una sesión: hasta 5, repartidos entre sus grupos y sin pasar del nivel de la rutina
  function ejerciciosDeSesion(grupos: Ejercicio["grupo_muscular"][], nivel: NivelSemilla, k: number): Ejercicio[] {
    const tope = NIVELES_SEMILLA.indexOf(nivel);
    const elegidos: Ejercicio[] = [];
    for (let vuelta = 0; elegidos.length < 5 && vuelta < 3; vuelta++) {
      for (const g of grupos) {
        const opciones = base.filter((e) => e.grupo_muscular === g && NIVELES_SEMILLA.indexOf(e.nivel) <= tope);
        const ej = opciones[(k + vuelta) % Math.max(1, opciones.length)];
        if (ej && !elegidos.includes(ej) && elegidos.length < 5) elegidos.push(ej);
      }
    }
    return elegidos;
  }

  // Crea la rutina, sus ejercicios y "hechas" registros repartidos entre el inicio y "hasta"
  function crear(
    gym: string, cliente: string, instructor: string, k: number,
    inicio: string, fin: string | null, finalizada: string | null, hechas: (planeadas: number, transcurridos: number) => number
  ): void {
    const nSesiones = 1 + (k % 3);                      // A, A/B o A/B/C
    const division = (["A", "B", "C"] as LetraSesion[]).slice(0, nSesiones);
    const nivel = NIVELES_SEMILLA[(k + 1) % 3];
    const objetivo = OBJETIVOS_RUTINA[(k * 3 + Math.floor(k / 5)) % OBJETIVOS_RUTINA.length] // variado entre escenarios;
    const frecuencia = nSesiones + 1;                   // veces por semana
    const duracion = fin === null ? 56 : Math.max(7, Math.round((Date.parse(fin) - Date.parse(inicio)) / 86400000));
    const planeadas = Math.max(4, Math.round((duracion / 7) * frecuencia));
    const id = idRutina++;
    rutinas.push({
      gimnasio_id: gym, id_rutina: id, id_instructor: instructor, id_cliente: cliente,
      nombre: objetivo + " " + division.join("/"),
      descripcion: "Plan de " + objetivo.toLowerCase() + " · nivel " + nivel.toLowerCase() + " · " + frecuencia + " veces por semana.",
      fecha_creacion: inicio, fecha_fin: fin, objetivo,
      sesiones_planeadas: planeadas, division, finalizada_el: finalizada,
    });

    const p = PRESCRIPCION[nivel];
    division.forEach((letra, s) => {
      ejerciciosDeSesion(GRUPOS_POR_DIVISION[nSesiones][s], nivel, k + s).forEach((ej, i) => {
        const pesoBase = PESO_BASE[ej.equipo];
        const porTiempo = ej.tipo_medicion === "TIEMPO";
        filas.push({
          gimnasio_id: gym, id_rutina: id, id_ejercicio: ej.id_ejercicio, orden: i + 1, sesion: letra,
          series: porTiempo ? (ej.series_sugeridas ?? 1) : p.series,
          reps_min: porTiempo ? null : p.min,
          reps_max: porTiempo ? null : p.max,
          segundos: porTiempo ? ej.segundos_sugeridos : null,
          peso_kg: pesoBase === null || porTiempo ? null : Math.max(2, Math.round((pesoBase * p.factor) / 2) * 2),
          descanso_seg: porTiempo ? 30 : p.descanso,
          notas_instructor: i === 0 ? "Calienta 5 minutos antes de la primera serie." : "",
          agregado_por_cliente: false,
          revisado_por_instructor: true,
        });
      });
    });
    // En algunas vigentes el cliente cambió un ejercicio y el instructor aún no lo revisa (para B3 y T4)
    if (k % 5 === 0 && finalizada === null && fin !== null && fin >= utils.isoDate()) {
      const extra = base.find((e) => e.grupo_muscular === "Abdomen" && !filas.some((f) => f.id_rutina === id && f.sesion === "A" && f.id_ejercicio === e.id_ejercicio));
      const enA = filas.filter((f) => f.id_rutina === id && f.sesion === "A").length;
      if (extra) filas.push({
        gimnasio_id: gym, id_rutina: id, id_ejercicio: extra.id_ejercicio, orden: enA + 1, sesion: "A",
        series: 3, reps_min: 15, reps_max: 20, segundos: null, peso_kg: null, descanso_seg: 45,
        notas_instructor: "", agregado_por_cliente: true, revisado_por_instructor: false,
      });
    }

    // Registros: repartidos entre el inicio y el último día entrenado (hoy, la fecha fin o la de finalización)
    const hoy = utils.isoDate();
    const hasta = finalizada ?? (fin !== null && fin < hoy ? fin : hoy);
    const transcurridos = Math.max(0, Math.round((Date.parse(hasta) - Date.parse(inicio)) / 86400000));
    const n = Math.min(planeadas, Math.max(0, hechas(planeadas, transcurridos)));
    for (let i = 0; i < n; i++) {
      registros.push({
        gimnasio_id: gym, id_registro: idRegistro++, id_rutina: id, id_cliente: cliente,
        sesion: division[i % division.length],
        fecha: sumarDias(inicio, Math.floor(((i + 1) * transcurridos) / (n + 1))),
        registrado_por: i % 3 === 2 ? cliente : instructor,
        notas: i % 4 === 3 ? "Buen ritmo, subir carga la próxima." : "",
      });
    }
  }

  // Lo que deberían llevar al día: semanas transcurridas × frecuencia
  const esperado = (k: number, t: number) => Math.floor((t / 7) * (1 + 1 + (k % 3)));

  for (const gym of ["gym-centro", "gym-titan"]) {
    const instructores = seed.instructores
      .filter((i) => i.gimnasio_id === gym && i.estado === "ACTIVO" && !(gym === "gym-titan" && i.numero_identificacion === "2000000002"))
      .sort((a, b) => a.numero_identificacion.localeCompare(b.numero_identificacion));
    const clientes = seed.clientes
      .filter((c) => c.gimnasio_id === gym)
      .sort((a, b) => a.numero_identificacion.localeCompare(b.numero_identificacion));
    let k = 0;
    for (const c of clientes) {
      const inst = instructores[(k * 3) % instructores.length].numero_identificacion;
      const id = c.numero_identificacion;
      if (c.estado !== "ACTIVO") {
        // Historial: cada tercer cliente no activo tiene una rutina vencida (no cuenta en los indicadores)
        if (k % 3 === 0) crear(gym, id, inst, k, dia(120), dia(40), null, (pl) => Math.round(pl * 0.5));
        k++;
        continue;
      }
      // Titan: Ana renovada, Sebastián por vencer, Mariana sin rutina
      const escenario: EscenarioSemilla = gym === "gym-titan"
        ? (["RENOVADA", "POR_VENCER", "SIN_RUTINA"] as EscenarioSemilla[])[clientes.filter((x) => x.estado === "ACTIVO").indexOf(c) % 3]
        : CICLO_SEMILLA[k % CICLO_SEMILLA.length];
      switch (escenario) {
        case "AL_DIA":
          crear(gym, id, inst, k, dia(14 + (k % 30)), k % 4 === 0 ? null : dia(-(25 + (k % 35))), null, (_pl, t) => esperado(k, t));
          break;
        case "ATRASADA":
          crear(gym, id, inst, k, dia(20 + (k % 25)), dia(-(30 + (k % 30))), null, (_pl, t) => Math.round(esperado(k, t) * 0.45));
          break;
        case "POR_VENCER":
          crear(gym, id, inst, k, dia(45 + (k % 15)), dia(-(2 + (k % 11))), null, (_pl, t) => Math.round(esperado(k, t) * 0.85));
          break;
        case "VENCIDA":
          crear(gym, id, inst, k, dia(80 + (k % 20)), dia(4 + (k % 20)), null, (pl) => Math.round(pl * 0.6));
          break;
        case "RENOVADA":
          // Una rutina finalizada a mano (historial) y la vigente que la reemplazó
          crear(gym, id, inst, k, dia(110), dia(51), dia(50), (pl) => Math.round(pl * 0.8));
          crear(gym, id, inst, k + 1, dia(49), dia(-35), null, (_pl, t) => esperado(k + 1, t));
          break;
        case "SIN_RUTINA":
          break;
      }
      k++;
    }
  }

  seed.rutinas = rutinas;
  seed.rutina_ejercicios = filas;
  seed.registros_entrenamiento = registros;

  // Cuentas de instructor sincronizadas con su instructor (KAN-86): nombre, apellidos, correo,
  // estado y contraseña inicial (primer nombre sin tildes + últimos 4 dígitos de la cédula)
  for (const ins of seed.instructores) {
    const u = seed.usuarios.find(
      (x) => x.gimnasio_id === ins.gimnasio_id && x.numero_identificacion === ins.numero_identificacion && x.tipo_usuario === "INSTRUCTOR"
    );
    if (!u) continue;
    u.nombre = ins.nombre;
    u.apellidos = ins.apellidos;
    u.correo = ins.correo;
    u.estado = ins.estado;
    u.contrasena = contrasenaInicial(ins.nombre, ins.numero_identificacion);
  }
}
// ===== [/P3] Rutinas v2: generador de la semilla =====

// ===== [P3] Ejercicios: generadores de la semilla =====
// Para no escribir los 14 campos en cada fila. Orden de los argumentos:
// id, gimnasio (null = base), nombre, grupo, nivel, equipo, series, ...medida, descripción.
function ejReps(
  id: number,
  gimnasio_id: string | null,
  nombre: string,
  grupo_muscular: Ejercicio["grupo_muscular"],
  nivel: Ejercicio["nivel"],
  equipo: Ejercicio["equipo"],
  series: number,
  repsMin: number,
  repsMax: number,
  descripcion: string
): Ejercicio {
  return {
    id_ejercicio: id, gimnasio_id, nombre, descripcion, grupo_muscular, nivel, equipo,
    tipo_medicion: "REPETICIONES",
    series_sugeridas: series,
    repeticiones_min_sugeridas: repsMin,
    repeticiones_max_sugeridas: repsMax,
    segundos_sugeridos: null,
    recurso_url: recursoSemilla(id, gimnasio_id),
    estado: "ACTIVO",
  };
}

// [P3] KAN-96: imágenes del catálogo base (free-exercise-db, dominio público). Están en
// public/recursos/ejercicios/<id>-0.jpg y <id>-1.jpg; se guarda la "-0" y AnimacionEjercicio busca la "-1".
// Los propios de cada gimnasio (gimnasio_id) y los base sin equivalente (38 Burpees) quedan sin imagen.
const BASE_SIN_IMAGEN = [38];
function recursoSemilla(id: number, gimnasio_id: string | null): string {
  return gimnasio_id === null && !BASE_SIN_IMAGEN.includes(id) ? "/recursos/ejercicios/" + id + "-0.jpg" : "";
}

function ejTiempo(
  id: number,
  gimnasio_id: string | null,
  nombre: string,
  grupo_muscular: Ejercicio["grupo_muscular"],
  nivel: Ejercicio["nivel"],
  equipo: Ejercicio["equipo"],
  series: number,
  segundos: number,
  descripcion: string
): Ejercicio {
  return {
    id_ejercicio: id, gimnasio_id, nombre, descripcion, grupo_muscular, nivel, equipo,
    tipo_medicion: "TIEMPO",
    series_sugeridas: series,
    repeticiones_min_sugeridas: null,
    repeticiones_max_sugeridas: null,
    segundos_sugeridos: segundos,
    recurso_url: recursoSemilla(id, gimnasio_id),
    estado: "ACTIVO",
  };
}
// ===== [/P3] Ejercicios: generadores de la semilla =====

const USUARIOS_INSTRUCTORES: Usuario[] = [];
(function poblarUsuariosInstructores(){
  const crear = (
    gimnasio_id: string,
    num: string,
    nombre: string,
    apellidos: string,
    correo: string,
    estado: Usuario["estado"],
  ): Usuario => ({
    gimnasio_id,
    numero_identificacion: num,
    nombre,
    apellidos,
    correo,
    contrasena: contrasenaInicial(nombre, num),
    estado,
    tipo_usuario: 'INSTRUCTOR',
    rol: 'INSTRUCTOR',
    debe_cambiar_contrasena: true,
  });
  USUARIOS_INSTRUCTORES.push(
    crear('gym-centro','2000000001','Camilo','Herrera Díaz','camilo.herrera@gymbrot.com','ACTIVO'),
    crear('gym-centro','2000000002','Natalia','Vargas Rojas','natalia.vargas@gymbrot.com','ACTIVO'),
    crear('gym-centro','2000000003','Mateo','Silva Castro','mateo.silva@gymbrot.com','INACTIVO'),
    crear('gym-titan','2000000002','Natalia','Vargas Rojas','natalia.vargas@titanfitness.com','ACTIVO'),
    crear('gym-titan','2000000101','Jorge','Mendoza Ochoa','jorge.mendoza@titanfitness.com','ACTIVO'),
  );
  // instructores extra
  for(let i=4;i<=20;i++){
    const num = '200000' + String(i).padStart(4,'0');
    const nom = ['Lucía','Andrés','Sofía','Martín','Valeria'][i%5];
    USUARIOS_INSTRUCTORES.push(crear('gym-centro', num, nom, 'Entrenador '+i, nom.toLowerCase()+i+'@gymbrot.com', i%7===0?'INACTIVO':'ACTIVO'));
  }
})();


const SEED: Seed = {
  // Lo que la plataforma vende a los gimnasios (pagina de planes y registro).
  // max_clientes todavia no se hace cumplir: solo se muestra.
  planesSoftware: [
    { id_plan_software:'BASICO',  nombre:'Básico',  precio_mensual:99000,  max_clientes:100,  destacado:false,
      incluye:['Clientes y membresías', 'Control de acceso con huella', 'Registro de pagos'] },
    { id_plan_software:'PRO',     nombre:'Pro',     precio_mensual:189000, max_clientes:500,  destacado:true,
      incluye:['Todo lo del plan Básico', 'Instructores, rutinas y citas', 'Progreso de los socios', 'Finanzas y reportes'] },
    { id_plan_software:'PREMIUM', nombre:'Premium', precio_mensual:299000, max_clientes:null, destacado:false,
      incluye:['Todo lo del plan Pro', 'Gymbrot AI', 'Soporte prioritario'] },
  ],

  // Tenants de la plataforma. gym-titan se solapa a proposito con gym-centro
  // (misma cedula, datos distintos): si alguna pantalla deja pasar filas del
  // otro gimnasio, se nota al instante (DECISIONES.md, convenciones).
  gimnasios: [
    { gimnasio_id:'gym-centro', slug:'gymbrot-centro', nombre:'GymBrot Centro', ciudad:'Valledupar', telefono:'6055700000', estado:'ACTIVO', plan_software:'PREMIUM', fecha_registro:dia(400), vence_suscripcion:dia(-20) },
    { gimnasio_id:'gym-titan',  slug:'titan-fitness',  nombre:'Titan Fitness',  ciudad:'Valledupar', telefono:'6055711111', estado:'ACTIVO', plan_software:'BASICO',  fecha_registro:dia(25),  vence_suscripcion:dia(-5) },
  ],

  // Pagos de suscripcion que hacen los gimnasios nuevos desde /registro.
  pagosSoftware: [],

  // SUPERADMIN dueno del software (fuera del portal /g/:slug).
  // ADMINISTRADORES de gimnasio por rol real. INSTRUCTOR/CLIENTE se generan con
  // contrasena inicial nombre+ultimos4 y cambio obligatorio.
  // Se conserva el caso '1 de cada 6 sin codigo' en los socios masivos: sin
  // fila en usuarios no pueden ingresar.
  usuarios: [
    { gimnasio_id:'gym-centro', numero_identificacion:'1001000001', nombre:'admin', apellidos:'Administrador', correo:'admin@gymbrot.com', contrasena:'admin',      estado:'ACTIVO',     tipo_usuario:'ADMINISTRADOR', rol:'ADMINISTRADOR' },
    { gimnasio_id:'gym-titan',  numero_identificacion:'1001000002', nombre:'titan', apellidos:'Administrador', correo:'admin@titanfitness.com', contrasena:'titan', estado:'ACTIVO', tipo_usuario:'ADMINISTRADOR', rol:'ADMINISTRADOR' },
    // gimnasio_id '' = plataforma: Usuario lo exige y ningun gimnasio real
    // tiene id vacio. sesionDe() lo deja fuera de la sesion.
    { gimnasio_id:'', numero_identificacion:'9000000001', nombre:'superadmin', apellidos:'Plataforma', correo:'dueno@gymbrot.com', contrasena:'gymbrot2026', estado:'ACTIVO', tipo_usuario:'SUPERADMIN', rol:'SUPERADMIN' },
    ...USUARIOS_INSTRUCTORES,
    { gimnasio_id:'gym-titan', numero_identificacion:'1000000001', nombre:'Ana María', apellidos:'Ruiz', correo:'ana.ruiz@mail.com', contrasena: contrasenaInicial('Ana María','1000000001'), estado:'ACTIVO', tipo_usuario:'CLIENTE', rol:'CLIENTE', debe_cambiar_contrasena: true },
    { gimnasio_id:'gym-titan', numero_identificacion:'1000000101', nombre:'Sebastián', apellidos:'Castro', correo:'sebas.castro@mail.com', contrasena: contrasenaInicial('Sebastián','1000000101'), estado:'ACTIVO', tipo_usuario:'CLIENTE', rol:'CLIENTE', debe_cambiar_contrasena: true },
    ...USUARIOS_CLIENTES,
  ],

  clientes: [ 
    { gimnasio_id:'gym-centro', numero_identificacion:'1000000001', tipo_identificacion:'CC', nombre:'Ana María',    apellidos:'Ruiz',     telefono:'3001112233', correo:'ana.ruiz@mail.com',   direccion:'Cra 15 #23-40', fecha_nacimiento:'1995-03-12', estado:'ACTIVO',     fecha_registro:inicioDe(serieAna) },
    { gimnasio_id:'gym-centro', numero_identificacion:'1000000002', tipo_identificacion:'CC', nombre:'Carlos Andrés', apellidos:'Pérez',    telefono:'3012223344', correo:'carlos.perez@mail.com',direccion:'Cl 20 #5-16',   fecha_nacimiento:'1988-11-02', estado:'ACTIVO',     fecha_registro:inicioDe(serieCarlos) },
    { gimnasio_id:'gym-centro', numero_identificacion:'1000000003', tipo_identificacion:'TI', nombre:'Juan David',    apellidos:'Gómez',    telefono:'3023334455', correo:'juan.gomez@mail.com',  direccion:'Cra 9 #10-11',  fecha_nacimiento:'2009-06-25', estado:'ACTIVO',     fecha_registro:inicioDe(serieJuan) },
    { gimnasio_id:'gym-centro', numero_identificacion:'1000000004', tipo_identificacion:'CC', nombre:'Laura Sofía',   apellidos:'Martínez', telefono:'3034445566', correo:'laura.m@mail.com',     direccion:'Cl 8 #1-90',    fecha_nacimiento:'1999-09-14', estado:'SUSPENDIDO', fecha_registro:dia(180) },
    { gimnasio_id:'gym-centro', numero_identificacion:'1000000005', tipo_identificacion:'CE', nombre:'Diego Fernando',apellidos:'Ríos',     telefono:'3045556677', correo:'diego.rios@mail.com',  direccion:'Av 4 #12-30',   fecha_nacimiento:'1965-02-20', estado:'ACTIVO',     fecha_registro:pagoAnualDiego.fecha_pago },
    { gimnasio_id:'gym-centro', numero_identificacion:'1000000006', tipo_identificacion:'CC', nombre:'Valentina',     apellidos:'Torres',   telefono:'3056667788', correo:'valen.torres@mail.com',direccion:'Cra 19 #4-5',   fecha_nacimiento:'2001-12-01', estado:'INACTIVO',   fecha_registro:dia(55) },
    { gimnasio_id:'gym-centro', numero_identificacion:'1000000007', tipo_identificacion:'CC', nombre:'Andrés Felipe', apellidos:'Navarro',  telefono:'3067778899', correo:'andres.nav@mail.com',  direccion:'Cl 44 #7-2',    fecha_nacimiento:'1992-07-19', estado:'ACTIVO',     fecha_registro:inicioDe(serieAndres) },
    // --- gym-titan: Ana (1000000001) repite cedula con gym-centro, con otro telefono y direccion ---
    { gimnasio_id:'gym-titan', numero_identificacion:'1000000001', tipo_identificacion:'CC', nombre:'Ana María', apellidos:'Ruiz', telefono:'3009998877', correo:'ana.ruiz@mail.com', direccion:'Cl 50 #30-12', fecha_nacimiento:'1995-03-12', estado:'ACTIVO', fecha_registro:dia(20) },
    { gimnasio_id:'gym-titan', numero_identificacion:'1000000101', tipo_identificacion:'CC', nombre:'Sebastián', apellidos:'Castro', telefono:'3151112233', correo:'sebas.castro@mail.com', direccion:'Cra 7 #18-40', fecha_nacimiento:'1997-05-08', estado:'ACTIVO', fecha_registro:dia(40) },
    { gimnasio_id:'gym-titan', numero_identificacion:'1000000102', tipo_identificacion:'CC', nombre:'Mariana', apellidos:'López', telefono:'3162223344', correo:'mariana.lopez@mail.com', direccion:'Cl 12 #3-25', fecha_nacimiento:'2000-10-30', estado:'ACTIVO', fecha_registro:dia(10) },
    // --- 93 socios masivos de gym-centro (v12), con y sin plan ---
    ...CLIENTES_EXTRA,
   ],

  // Catalogo de planes. Los tres precios por modalidad son los que lee
  // PagoMembresiaController.java:148 al abrir el cobro.
  planes: PLANES_V12,

  // Una membresia vigente por cada cliente ACTIVO (5 en total), mas dos
  // vencidas para que existan los casos de cobro pendiente.
  //
  // fecha_inicio es el PRIMER pago de la serie, no el ultimo: una membresia
  // mensual renovada no arranca de nuevo en cada renovacion. Y
  // fecha_vencimiento se calcula con la duracion que aplica el cobro real
  // (30 / 365 dias) a partir del ultimo pago, para que el dato nunca contradiga
  // al reloj.
  membresias: [
    { gimnasio_id:'gym-centro', id_membresia:1, id_cliente:'1000000001', id_plan:3, tipo_membresia:'Premium',  modalidad_pago:'MENSUAL', valor:110000,  fecha_inicio:inicioDe(serieAna),    fecha_vencimiento:finDe(serieAna, 30),    estado:'ACTIVA' },
    { gimnasio_id:'gym-centro', id_membresia:2, id_cliente:'1000000002', id_plan:1, tipo_membresia:'Básico',   modalidad_pago:'MENSUAL', valor:50000,   fecha_inicio:inicioDe(serieCarlos), fecha_vencimiento:finDe(serieCarlos, 30), estado:'ACTIVA' },
    { gimnasio_id:'gym-centro', id_membresia:3, id_cliente:'1000000003', id_plan:2, tipo_membresia:'Estándar', modalidad_pago:'MENSUAL', valor:80000,   fecha_inicio:inicioDe(serieJuan),   fecha_vencimiento:finDe(serieJuan, 30),   estado:'ACTIVA' },
    { gimnasio_id:'gym-centro', id_membresia:4, id_cliente:'1000000005', id_plan:3, tipo_membresia:'Premium',  modalidad_pago:'ANUAL',   valor:1100000, fecha_inicio:pagoAnualDiego.fecha_pago, fecha_vencimiento:sumarDias(pagoAnualDiego.fecha_pago, 365), estado:'ACTIVA' },
    { gimnasio_id:'gym-centro', id_membresia:5, id_cliente:'1000000007', id_plan:2, tipo_membresia:'Estándar', modalidad_pago:'MENSUAL', valor:80000,   fecha_inicio:inicioDe(serieAndres), fecha_vencimiento:finDe(serieAndres, 30), estado:'ACTIVA' },
    // Membresias ya vencidas: son las que dejan pagos sin aplicar y las que
    // el control de acceso debe rechazar.
    { gimnasio_id:'gym-centro', id_membresia:6, id_cliente:'1000000004', id_plan:2, tipo_membresia:'Estándar', modalidad_pago:'MENSUAL', valor:80000,   fecha_inicio:dia(70),  fecha_vencimiento:dia(40),  estado:'VENCIDA' },
    { gimnasio_id:'gym-centro', id_membresia:7, id_cliente:'1000000006', id_plan:1, tipo_membresia:'Básico',   modalidad_pago:'MENSUAL', valor:50000,   fecha_inicio:dia(55),  fecha_vencimiento:dia(25),  estado:'VENCIDA' },
    // gym-titan: la Ana de Titan tiene su propia membresia, distinta de la Premium de Centro.
    { gimnasio_id:'gym-titan',  id_membresia:8, id_cliente:'1000000001', id_plan:1, tipo_membresia:'Básico',   modalidad_pago:'MENSUAL', valor:50000,   fecha_inicio:pagoTitanAna.fecha_pago, fecha_vencimiento:sumarDias(pagoTitanAna.fecha_pago, 30), estado:'ACTIVA' },
    ...MEMBRESIAS_EXTRA,
  ],

  // Marca que membresia esta vigente. El control de acceso consulta esta tabla
  // (RegistroEntradaController.java:319), asi que activa=true debe coincidir
  // siempre con una membresia ACTIVA y no vencida: antes tres filas marcaban
  // activa=true sobre membresias vencidas y el acceso las dejaba pasar.
  historialMembresias: [
    { gimnasio_id:'gym-centro', id_historial:1, id_cliente:'1000000001', id_membresia:1, fecha_asignacion:inicioDe(serieAna),    activa:true  },
    { gimnasio_id:'gym-centro', id_historial:2, id_cliente:'1000000002', id_membresia:2, fecha_asignacion:inicioDe(serieCarlos), activa:true  },
    { gimnasio_id:'gym-centro', id_historial:3, id_cliente:'1000000003', id_membresia:3, fecha_asignacion:inicioDe(serieJuan),   activa:true  },
    { gimnasio_id:'gym-centro', id_historial:4, id_cliente:'1000000005', id_membresia:4, fecha_asignacion:pagoAnualDiego.fecha_pago, activa:true },
    { gimnasio_id:'gym-centro', id_historial:5, id_cliente:'1000000007', id_membresia:5, fecha_asignacion:inicioDe(serieAndres), activa:true  },
    { gimnasio_id:'gym-centro', id_historial:6, id_cliente:'1000000004', id_membresia:6, fecha_asignacion:dia(70),  activa:false },
    { gimnasio_id:'gym-centro', id_historial:7, id_cliente:'1000000006', id_membresia:7, fecha_asignacion:dia(55),  activa:false },
    { gimnasio_id:'gym-titan',  id_historial:8, id_cliente:'1000000001', id_membresia:8, fecha_asignacion:pagoTitanAna.fecha_pago, activa:true },
    // --- v12: una fila por cada membresia generada ---
    ...HISTORIAL_EXTRA,
  ],
  
  pagos: serieAna
    .concat(serieCarlos)
    .concat(serieJuan)
    .concat(serieAndres)
    .concat([pagoAnualDiego])
    .concat(pagosSinAplicar)
    .concat([pagoTitanAna])
    .concat(PAGOS_EXTRA),

  ingresos: ingresosPasados().concat(ingresosDeHoy()),
  // ===== [P3] Ejercicios (catálogo mixto, DECISIONES.md D4) =====
  // 1–40: catálogo BASE (gimnasio_id null). 41–45: propios de cada gimnasio, con un "personalizado"
  // en cada uno. Todavía no se usan en rutinas: eso llega con el modelo de Rutinas v2.
  ejercicios: [
    // Pecho
    ejReps(1,  null, 'Press de banca plano',            'Pecho', 'Intermedio',   'Barra',         4, 6, 10,  'Acostado en banco plano, baja la barra al pecho medio y empuja hasta extender los brazos.'),
    ejReps(2,  null, 'Press inclinado con mancuernas',  'Pecho', 'Intermedio',   'Mancuerna',     3, 8, 12,  'Banco a 30–45°. Baja las mancuernas a los lados del pecho y empuja juntándolas arriba.'),
    ejReps(3,  null, 'Flexiones de pecho',              'Pecho', 'Principiante', 'Peso corporal', 3, 8, 15,  'Manos a la altura de los hombros y cuerpo recto. Baja el pecho casi al suelo y sube.'),
    ejReps(4,  null, 'Cruce de poleas',                 'Pecho', 'Intermedio',   'Polea',         3, 12, 15, 'Poleas altas, codos semiflexionados. Junta las manos al frente apretando el pecho.'),
    ejReps(5,  null, 'Press de pecho en máquina',       'Pecho', 'Principiante', 'Máquina',       3, 10, 12, 'Espalda apoyada en el respaldo; empuja las agarraderas sin bloquear los codos.'),
    // Espalda
    ejReps(6,  null, 'Jalón al pecho en polea',         'Espalda', 'Principiante', 'Polea',         3, 10, 12, 'Agarre ancho. Lleva la barra a la parte alta del pecho juntando las escápulas.'),
    ejReps(7,  null, 'Remo con barra',                  'Espalda', 'Intermedio',   'Barra',         4, 8, 10,  'Torso inclinado y espalda neutra. Lleva la barra al abdomen y baja controlado.'),
    ejReps(8,  null, 'Remo con mancuerna a una mano',   'Espalda', 'Principiante', 'Mancuerna',     3, 10, 12, 'Rodilla y mano apoyadas en el banco. Sube la mancuerna hacia la cadera.'),
    ejReps(9,  null, 'Dominadas',                       'Espalda', 'Avanzado',     'Peso corporal', 4, 5, 8,   'Desde brazos extendidos, sube hasta pasar la barbilla sobre la barra.'),
    ejReps(10, null, 'Peso muerto convencional',        'Espalda', 'Avanzado',     'Barra',         4, 4, 6,   'Barra pegada a las piernas y espalda neutra. Empuja el suelo y extiende cadera y rodillas.'),
    // Hombros
    ejReps(11, null, 'Press militar con barra',         'Hombros', 'Intermedio',   'Barra',     4, 6, 8,   'De pie y con el abdomen firme, empuja la barra desde la clavícula hasta arriba de la cabeza.'),
    ejReps(12, null, 'Elevaciones laterales',           'Hombros', 'Principiante', 'Mancuerna', 3, 12, 15, 'Sube las mancuernas a los lados hasta la altura de los hombros, codos apenas flexionados.'),
    ejReps(13, null, 'Face pull en polea',              'Hombros', 'Intermedio',   'Polea',     3, 12, 15, 'Polea alta con cuerda. Tira hacia la cara separando las manos y abriendo los codos.'),
    // Bíceps
    ejReps(14, null, 'Curl con barra',                  'Bíceps', 'Principiante', 'Barra',     3, 8, 12,  'Codos pegados al cuerpo. Sube la barra sin balancear el torso.'),
    ejReps(15, null, 'Curl martillo',                   'Bíceps', 'Principiante', 'Mancuerna', 3, 10, 12, 'Palmas mirándose entre sí. Sube las mancuernas alternando o a la vez.'),
    // Tríceps
    ejReps(16, null, 'Extensión de tríceps en polea',   'Tríceps', 'Principiante', 'Polea',         3, 12, 15, 'Codos fijos a los lados. Empuja la barra o cuerda hacia abajo hasta extender los brazos.'),
    ejReps(17, null, 'Press francés con barra',         'Tríceps', 'Intermedio',   'Barra',         3, 8, 12,  'Acostado, baja la barra hacia la frente doblando solo los codos y vuelve a extender.'),
    ejReps(18, null, 'Fondos en paralelas',             'Tríceps', 'Avanzado',     'Peso corporal', 3, 6, 10,  'Torso erguido. Baja hasta que los codos formen 90° y empuja hacia arriba.'),
    // Piernas
    ejReps(19, null, 'Sentadilla con barra',            'Piernas', 'Intermedio',   'Barra',      4, 6, 10,  'Barra sobre los trapecios. Baja con la espalda neutra hasta que los muslos queden paralelos al suelo.'),
    ejReps(20, null, 'Prensa de piernas',               'Piernas', 'Principiante', 'Máquina',    3, 10, 12, 'Pies al ancho de los hombros. Baja la plataforma sin despegar la zona lumbar del respaldo.'),
    ejReps(21, null, 'Zancadas con mancuernas',         'Piernas', 'Intermedio',   'Mancuerna',  3, 10, 12, 'Paso largo al frente y baja hasta que la rodilla de atrás casi toque el suelo. Repeticiones por pierna.'),
    ejReps(22, null, 'Curl femoral acostado',           'Piernas', 'Principiante', 'Máquina',    3, 10, 12, 'Boca abajo, lleva los talones hacia los glúteos y baja despacio.'),
    ejReps(23, null, 'Sentadilla goblet',               'Piernas', 'Principiante', 'Kettlebell', 3, 10, 12, 'Kettlebell pegada al pecho. Baja manteniendo el torso erguido y los codos entre las rodillas.'),
    ejReps(24, null, 'Elevación de talones de pie',     'Piernas', 'Principiante', 'Máquina',    4, 15, 20, 'Sube en puntas de pie lo más alto posible y baja estirando la pantorrilla.'),
    // Glúteos
    ejReps(25, null, 'Hip thrust con barra',            'Glúteos', 'Intermedio',   'Barra',          4, 8, 12,  'Espalda alta apoyada en el banco. Eleva la cadera apretando los glúteos arriba.'),
    ejReps(26, null, 'Peso muerto rumano con mancuernas','Glúteos', 'Intermedio',  'Mancuerna',      3, 10, 12, 'Rodillas apenas flexionadas. Lleva la cadera hacia atrás bajando las mancuernas pegadas a las piernas.'),
    ejReps(27, null, 'Patada de glúteo en polea',       'Glúteos', 'Principiante', 'Polea',          3, 12, 15, 'Tobillera en la polea baja. Lleva la pierna hacia atrás sin arquear la espalda. Repeticiones por pierna.'),
    ejReps(28, null, 'Puente de glúteo con banda',      'Glúteos', 'Principiante', 'Banda elástica', 3, 15, 20, 'Banda sobre las rodillas. Acostado, eleva la cadera empujando las rodillas hacia afuera.'),
    // Abdomen
    ejTiempo(29, null, 'Plancha frontal',               'Abdomen', 'Principiante', 'Peso corporal', 3, 30, 'Apoyado en antebrazos y puntas de pie, cuerpo recto sin dejar caer la cadera.'),
    ejTiempo(30, null, 'Plancha lateral',               'Abdomen', 'Intermedio',   'Peso corporal', 3, 30, 'Apoyado en un antebrazo, cuerpo alineado de cabeza a pies. Segundos por lado.'),
    ejReps(31, null, 'Crunch abdominal',                'Abdomen', 'Principiante', 'Peso corporal', 3, 15, 20, 'Acostado con rodillas flexionadas, despega los hombros del suelo contrayendo el abdomen.'),
    ejReps(32, null, 'Elevación de piernas colgado',    'Abdomen', 'Avanzado',     'Peso corporal', 3, 8, 12,  'Colgado de la barra, sube las piernas sin balancearte y baja controlado.'),
    ejReps(33, null, 'Press Pallof con banda',          'Abdomen', 'Intermedio',   'Banda elástica', 3, 10, 12, 'De lado al anclaje, empuja la banda al frente sin dejar que el torso gire. Repeticiones por lado.'),
    // Cardio
    ejTiempo(34, null, 'Trote en caminadora',           'Cardio', 'Principiante', 'Máquina', 1, 1200, 'Ritmo cómodo en el que todavía puedas hablar (20 minutos).'),
    ejTiempo(35, null, 'Bicicleta estática',            'Cardio', 'Principiante', 'Máquina', 1, 900,  'Resistencia moderada y cadencia constante (15 minutos).'),
    ejTiempo(36, null, 'Remo en máquina',               'Cardio', 'Intermedio',   'Máquina', 1, 600,  'Empuja con las piernas, luego inclina el torso y termina tirando con los brazos (10 minutos).'),
    // Cuerpo completo
    ejReps(37, null, 'Swing con kettlebell',            'Cuerpo completo', 'Intermedio', 'Kettlebell',    4, 15, 20, 'Bisagra de cadera: impulsa la kettlebell hasta la altura del pecho con la fuerza de la cadera.'),
    ejReps(38, null, 'Burpees',                         'Cuerpo completo', 'Intermedio', 'Peso corporal', 4, 10, 15, 'Baja a cuclillas, lleva los pies atrás a plancha, regresa y salta con los brazos arriba.'),
    ejReps(39, null, 'Thruster con mancuernas',         'Cuerpo completo', 'Avanzado',   'Mancuerna',     4, 8, 10,  'Sentadilla con las mancuernas en los hombros y, al subir, empújalas sobre la cabeza.'),
    ejReps(40, null, 'Levantamiento turco',             'Cuerpo completo', 'Avanzado',   'Kettlebell',    3, 3, 5,   'De acostado a de pie con la kettlebell siempre arriba y el brazo extendido. Repeticiones por lado.'),

    // Propios de GymBrot Centro
    ejTiempo(41, 'gym-centro', 'Circuito funcional del Centro',    'Cuerpo completo', 'Intermedio', 'Peso corporal', 3, 45, 'Circuito de la clase de los sábados: sentadilla, flexión y salto sin pausa.'),
    ejReps(42, 'gym-centro', 'Sentadilla con barra (personalizado)', 'Piernas',       'Avanzado',   'Barra',         5, 5, 5,  'Versión de fuerza del gimnasio: 5×5 con descanso de 3 minutos.'),
    ejReps(43, 'gym-centro', 'Remo en máquina Hammer',             'Espalda',         'Principiante', 'Máquina',     3, 10, 12, 'Máquina de remo con apoyo de pecho de la sala 2.'),
    // Propios de Titan Fitness
    ejReps(44, 'gym-titan', 'Press inclinado con mancuernas (personalizado)', 'Pecho', 'Intermedio', 'Mancuerna', 4, 6, 8, 'Variante de Titan: banco a 30° y bajada lenta de 3 segundos.'),
    ejTiempo(45, 'gym-titan', 'Circuito Titan con kettlebell',   'Cuerpo completo', 'Avanzado', 'Kettlebell', 5, 40, 'Swing, goblet y remo con kettlebell; 40 s por estación.'),
  ],
  // ===== [/P3] Ejercicios =====

  // ===== [P3] Instructores =====
  // Centro tiene los 3 de siempre (las rutinas y citas de Centro los usan). Titan tiene 2 propios;
  // Natalia trabaja en los dos: misma cédula, dos registros (D3), para que una fuga se note.
  instructores: [
    { gimnasio_id:'gym-centro', numero_identificacion:'2000000001', tipo_identificacion:'CC', nombre:'Camilo',  apellidos:'Herrera Díaz', telefono:'3101234567', correo:'camilo.herrera@gymbrot.com', especialidad:'Entrenador personal', horario:migrarDisponibilidadTexto('Lun-Vie 6:00-14:00'),  fecha_contratacion:'2025-02-03', estado:'ACTIVO' },
    { gimnasio_id:'gym-centro', numero_identificacion:'2000000002', tipo_identificacion:'CC', nombre:'Natalia', apellidos:'Vargas Rojas', telefono:'3112345678', correo:'natalia.vargas@gymbrot.com', especialidad:'Yoga/Pilates',        horario:migrarDisponibilidadTexto('Lun-Mié-Vie 16:00-21:00'), fecha_contratacion:'2025-08-18', estado:'ACTIVO' },
    { gimnasio_id:'gym-centro', numero_identificacion:'2000000003', tipo_identificacion:'CE', nombre:'Mateo',   apellidos:'Silva Castro', telefono:'3123456789', correo:'mateo.silva@gymbrot.com',    especialidad:'Nutrición',           horario:migrarDisponibilidadTexto('Mar-Jue 8:00-12:00'),  fecha_contratacion:'2026-01-12', estado:'INACTIVO' },
    { gimnasio_id:'gym-titan',  numero_identificacion:'2000000002', tipo_identificacion:'CC', nombre:'Natalia', apellidos:'Vargas Rojas', telefono:'3112345678', correo:'natalia.vargas@titanfitness.com', especialidad:'Yoga/Pilates', horario:migrarDisponibilidadTexto('Sáb 8:00-12:00'), fecha_contratacion:'2026-09-01', estado:'ACTIVO' },
    { gimnasio_id:'gym-titan',  numero_identificacion:'2000000101', tipo_identificacion:'CC', nombre:'Jorge',   apellidos:'Mendoza Ochoa', telefono:'3134567890', correo:'jorge.mendoza@titanfitness.com', especialidad:'Musculación', horario:migrarDisponibilidadTexto('Lun-Sáb 5:00-11:00'), fecha_contratacion:'2026-08-20', estado:'ACTIVO' },
    // --- seed masivo de P1: 17 instructores mas en gym-centro ---
    ...INSTRUCTORES_EXTRA,
  ],
  // ===== [/P3] Instructores =====

  // ===== [P3] Rutinas =====
  // v2 (KAN-55): las llena generarRutinasV2(SEED) justo después de armar el SEED
  rutinas: [],
  rutina_ejercicios: [],
  registros_entrenamiento: [],
  // ===== [/P3] Rutinas =====

  // ===== [P2] Progreso =====
  progreso: [
    { gimnasio_id:'gym-centro', id_progreso:1, id_cliente:'1000000001', fecha:'2026-07-10', peso:62,   altura:1.65, porcentaje_grasa: 24, masa_muscular: 26.5, notas:'Medición inicial' },
    { gimnasio_id:'gym-centro', id_progreso:2, id_cliente:'1000000001', fecha:'2026-08-10', peso:60.5, altura:1.65, porcentaje_grasa: 22.5, masa_muscular: 27.2, notas:'Bajó 1.5 kg' },
    { gimnasio_id:'gym-centro', id_progreso:3, id_cliente:'1000000002', fecha:'2026-08-01', peso:82,   altura:1.78, porcentaje_grasa: 25, masa_muscular: 30.5, notas:'Control inicial' },
    { gimnasio_id:'gym-centro', id_progreso:4, id_cliente:'1000000005', fecha:'2026-09-01', peso:75,   altura:1.72, porcentaje_grasa: 19, masa_muscular: 32.8, notas:'' },
    // gym-titan: misma cedula que la Ana de gym-centro. Si su medicion aparece
    // en el progreso de la Ana de Centro, el filtro por gimnasio fallo.
    { gimnasio_id:'gym-titan',  id_progreso:5, id_cliente:'1000000001', fecha:'2026-09-20', peso:63,   altura:1.65, porcentaje_grasa: 23, masa_muscular: 27.0, notas:'Medición inicial en Titan' }
  ],
  // ===== [/P2] Progreso =====

  // ===== [P2] Citas =====
  citas: [
    { gimnasio_id:'gym-centro', id_cita:1, id_cliente:'1000000001', id_instructor:'2000000001', fecha:'2026-10-06', hora:'07:00', estado:'CONFIRMADA', tipo_cita:'EVALUACION',  notas:'Rutina de fuerza' },
    { gimnasio_id:'gym-centro', id_cita:2, id_cliente:'1000000002', id_instructor:'2000000002', fecha:'2026-10-07', hora:'17:00', estado:'PENDIENTE',  tipo_cita:'SEGUIMIENTO', notas:'Primera clase de yoga' },
    { gimnasio_id:'gym-centro', id_cita:3, id_cliente:'1000000005', id_instructor:'2000000003', fecha:'2026-10-08', hora:'09:00', estado:'CANCELADA',  tipo_cita:'CONSULTA',    notas:'Reagendar' }
  ],
  // ===== [/P2] Citas =====
};

generarRutinasV2(SEED); // [P3] KAN-55: rutinas v2, sus ejercicios y registros + cuentas de instructor sincronizadas

// Version del seed guardado en localStorage.
//
// Sin esto, cambiar el SEED no se refleja nunca en un navegador que ya
// tenga datos: read() solo siembra cuando la clave no existe, asi que un
// seed nuevo convive con el viejo indefinidamente. Al cambiar este numero
// la siguiente carga regenera todas las colecciones.
// v5 reescribio el seed financiero con fechas relativas, 5 membresias vigentes
// coherentes con sus pagos, y pagos PENDIENTE para que la tabla de pendientes
// no salga vacia. El bump descarta los datos v4 que quedaron inconsistentes.
// v6 da fila en `usuarios` a los 7 clientes con clave propia: sin ella el
// modo manual de control de acceso no tenia con que validar a nadie.
// v7 es la union con P3/P4: instruye el seed de instructores, rutinas,
// progreso y citas a quien venga con el v4 de esas ramas, porque sin el bump
// las colecciones nuevas quedarian vacias en localStorage.
// v8 agrega gimnasios y gimnasio_id en usuarios/clientes (multitenant), con un
// segundo gimnasio que solapa datos para que una fuga de aislamiento se note.
// v9 lleva gimnasio_id a progreso y citas, con una medicion de la Ana de Titan.
// v10 lo lleva a membresias, historial, pagos e ingresos, con una membresia y
// un pago propios de la Ana de Titan.
// v11 agrega planesSoftware y pagosSoftware (pagina de planes y registro de
// gimnasios) y los datos de suscripcion de cada gimnasio.
// v12 lleva gimnasio_id a instructores, rutinas y rutina_ejercicios (con
// instructores y rutinas propios de Titan) y estrena el catalogo mixto de
// ejercicios: 40 base (gimnasio_id null) y 5 propios repartidos entre los dos
// gimnasios. Sin el bump, esas colecciones seguirian sin gimnasio_id y
// readTenant las dejaria vacias.
// v12 baja los 3 planes a 50.000/80.000/110.000 mensuales (semestral y anual
// con 5% y 10% de descuento), alinea las series financieras a esos precios y
// siembra el seed masivo en gym-centro: 93 socios nuevos (100 en total), 17
// instructores mas (20), 100 ejercicios, 36 rutinas mas (40) con sus
// ejercicios, y 72 membresias mas (80) coherentes con sus pagos e historial.
// v13 corrige un matiz de estado: los socios nuevos sin membresia no pueden
// estar ACTIVO (no tienen plan por el cual entrar), asi que quedan INACTIVO.
// v14 une P1 y P3: el seed masivo de P1 con gimnasio_id en instructores y
// rutinas (gym-centro), rutinas masivas desde el id 7 (5 y 6 son de Titan) y
// sus ejercicios tomados del catalogo base de P3. Se retira el generador de
// 100 ejercicios de P1: el catalogo es el mixto de P3.
function quitarAcentos(t:string){ return t.normalize('NFD').replace(/[\u0300-\u036f]/g,''); }
function contrasenaInicial(nombre:string, id:string){
  const pnombre = quitarAcentos(nombre).trim().split(/\s+/)[0].toLowerCase().replace(/[^a-z]/g,'') || 'socio';
  const ult4 = (id.slice(-4)).padStart(4,'0');
  return pnombre + ult4;
}

// v15 (T1, Samuel) agrega roles: superadmin, cuentas de instructor y de cliente con
// cambio de contrasena obligatorio.
// v16 (P3, KAN-55) estrena Rutinas v2: reemplaza las 42 rutinas v1 (dias_semana) por
// rutinas con division A, A/B o A/B/C, ejercicios por sesion con valores segun el
// nivel y registros de entrenamiento, con los 4 casos de la supervision (vigentes,
// por vencer, vencidas sin renovar y clientes activos sin rutina). Solo usa
// instructores ACTIVOS y clientes ACTIVOS (los inactivos solo tienen historial), y
// sincroniza las cuentas de instructor (nombre, correo, estado y contrasena inicial).
const SEED_VERSION = "16";
const CLAVE_VERSION = "gymbrot_seed_version";
const CLAVE_LECTOR = "gymbrot_lector_conectado";

function sembrarSiHaceFalta(): void {
  if (localStorage.getItem(CLAVE_VERSION) === SEED_VERSION) return;

  const registro = SEED as unknown as Record<string, unknown[]>;
  for (const col of Object.keys(SEED)) {
    localStorage.setItem("gymbrot_" + col, JSON.stringify(registro[col] ?? []));
  }
  localStorage.setItem(CLAVE_VERSION, SEED_VERSION);
}

sembrarSiHaceFalta();

/* [multitenant-slug] Migracion sin perdida de datos. No se sube SEED_VERSION:
   eso reescribiria todas las colecciones y borraria los gimnasios que alguien
   ya registro desde /registro en su navegador. En cambio, a cada gimnasio
   guardado sin slug se le genera uno a partir del nombre, sin repetir. Es
   idempotente: si todos tienen slug no escribe nada. */
function completarSlugs(): void {
  const clave = "gymbrot_gimnasios";
  const raw = localStorage.getItem(clave);
  if (!raw) return;
  let gimnasios: Array<Omit<Gimnasio, "slug"> & { slug?: string }>;
  try {
    gimnasios = JSON.parse(raw);
  } catch {
    return; // un JSON roto lo regenera el siguiente bump del seed
  }
  if (gimnasios.every((g) => typeof g.slug === "string" && g.slug)) return;

  const usados = new Set(gimnasios.flatMap((g) => (g.slug ? [g.slug] : [])));
  const migrados = gimnasios.map((g) => {
    if (g.slug) return g;
    const slug = slugUnico(g.nombre, usados);
    usados.add(slug);
    return { ...g, slug };
  });
  localStorage.setItem(clave, JSON.stringify(migrados));
}

completarSlugs();

/* Migracion de la disponibilidad de instructores de texto libre ('Lun-Vie
   6:00-14:00') a intervalos por dia (HorarioInstructor). Idempotente: solo
   toca las filas que todavia traen `disponibilidad` como string y no tienen
   `horario`. No se sube SEED_VERSION (borraria gimnasios registrados); el
   bump de v15 sembraria horarios nuevos, pero esta migracion cubre a quien
   quedo con datos v14. */
function migrarDisponibilidad(): void {
  const clave = "gymbrot_instructores";
  const raw = localStorage.getItem(clave);
  if (!raw) return;
  let instructores: Array<Record<string, unknown>>;
  try {
    instructores = JSON.parse(raw);
  } catch {
    return;
  }
  if (instructores.every((i) => typeof i.horario === "object" && i.horario !== null)) return;
  const migrados = instructores.map((i) => {
    if (i.horario !== null && typeof i.horario === "object") return i;
    const texto = typeof i.disponibilidad === "string" ? i.disponibilidad : "";
    const fila: Record<string, unknown> = { ...i, horario: migrarDisponibilidadTexto(texto) };
    delete fila.disponibilidad;
    return fila;
  });
  localStorage.setItem(clave, JSON.stringify(migrados));
}

migrarDisponibilidad();

/* Migracion de citas: las filas v14 no traen `tipo_cita` (el campo nace en
   P4). Idempotente y con default CONSULTA, que es el tipo mas generico. */
function migrarTipoCita(): void {
  const clave = "gymbrot_citas";
  const raw = localStorage.getItem(clave);
  if (!raw) return;
  let citas: Array<Record<string, unknown>>;
  try {
    citas = JSON.parse(raw);
  } catch {
    return;
  }
  if (citas.every((c) => typeof c.tipo_cita === "string")) return;
  const migradas = citas.map((c) => (typeof c.tipo_cita === "string" ? c : { ...c, tipo_cita: "CONSULTA" }));
  localStorage.setItem(clave, JSON.stringify(migradas));
}

migrarTipoCita();

// --- Multitenant ---------------------------------------------------------
// Misma clave que CLAVE en lib/auth.ts. Se lee directo de localStorage y no
// con auth.current() porque auth.ts importa api: importarlo aqui armaria un
// ciclo db <-> auth.
const CLAVE_SESION = "gymbrot_session";

/* [multitenant-slug] Fase de transicion. Mientras quede alguna ruta sin
   /g/:slug (o algun componente que llame al api fuera de TenantProvider), el
   gimnasio se toma de la sesion como antes. Al terminar la Fase 3 de
   docs/MULTITENANT-SLUG.md se pone en false: sin slug en la URL, no hay datos. */
const TENANT_DESDE_SESION = true;

/* Lo que trae la sesion guardada, sin validar el resto de campos (eso lo hace
   auth.ts). Solo interesa a que gimnasios puede entrar. */
function sesionGuardada(): { gimnasio_id?: unknown; accesos?: unknown } | null {
  const raw = localStorage.getItem(CLAVE_SESION);
  if (!raw) return null;
  try {
    const sesion = JSON.parse(raw);
    return sesion !== null && typeof sesion === "object" ? sesion : null;
  } catch {
    return null;
  }
}

/* Simula la politica RLS "solo filas de gimnasios donde soy miembro"
   (es_miembro() en docs/MULTITENANT-SLUG.md). Con Supabase esta funcion
   desaparece: la base hace la comprobacion. Mientras tanto, el mock se
   comporta igual: pedir datos de un gimnasio ajeno devuelve vacio. */
function sesionTieneAcceso(gimnasioId: string): boolean {
  const s = sesionGuardada();
  if (!s) return false;
  if (Array.isArray(s.accesos)) {
    return s.accesos.some(
      (a) => a !== null && typeof a === "object" && (a as { gimnasio_id?: unknown }).gimnasio_id === gimnasioId,
    );
  }
  return s.gimnasio_id === gimnasioId; // sesion anterior al slug
}

/* Gimnasio cuyos datos se leen y escriben: el del slug de la URL (lo fija
   TenantProvider), y solo si la sesion tiene acceso a el. null = sin datos. */
function gimnasioActivo(): string | null {
  const s = TENANT_DESDE_SESION ? sesionGuardada() : null;
  const deSesion = s && typeof s.gimnasio_id === "string" ? s.gimnasio_id : null;
  const gym = gimnasioFijado() ?? deSesion;
  if (!gym) return null;
  return sesionTieneAcceso(gym) ? gym : null;
}

function publico(g: Gimnasio): GimnasioPublico {
  return { gimnasio_id: g.gimnasio_id, slug: g.slug, nombre: g.nombre, ciudad: g.ciudad, estado: g.estado };
}

/* Para escribir. Las vistas estan detras del login (Layout.tsx), asi que
   escribir datos de un gimnasio sin sesion es un error de programacion:
   falla fuerte en vez de guardar una fila huerfana. */
function gimnasioParaEscribir(): string {
  const gym = gimnasioActivo();
  if (!gym) throw new Error("No hay gimnasio activo: inicia sesion de nuevo.");
  return gym;
}

const db = {
  _key(col: string) {
    return "gymbrot_" + col;
  },

  read<T>(col: string): T[] {
    const guardado = localStorage.getItem(this._key(col));
    return guardado
      ? (JSON.parse(guardado) as T[])
      : (((SEED as unknown as Record<string, unknown[]>)[col] ?? []).slice() as T[]);
  },

  write<T>(col: string, arreglo: T[]) {
    localStorage.setItem(this._key(col), JSON.stringify(arreglo));
    // db.write es el unico punto de escritura del mock: avisar aqui hace que
    // cualquier vista suscrita se refresque sin que tenga que recordarlo.
    notificarCambioDeDatos();
  },

  /* Solo las filas del gimnasio activo. Es el unico punto de filtro del
     multitenant (DECISIONES.md): las colecciones por gimnasio se leen siempre
     por aqui, y cualquier .find() por cedula va DESPUES de este filtro (D3).
     Sin sesion devuelve vacio: mejor una pantalla sin datos que una con los
     de todos los gimnasios. */
  readTenant<T extends { gimnasio_id: string }>(col: string): T[] {
    const gym = gimnasioActivo();
    if (!gym) return [];
    return this.read<T>(col).filter((r) => r.gimnasio_id === gym);
  },

  /* Pareja obligatoria de readTenant: guarda las filas del gimnasio activo
     sin tocar las de los demas. Usar db.write() con un arreglo que salio de
     readTenant borraria a los otros gimnasios. Ademas sella gimnasio_id en
     cada fila, asi un update no puede mover un registro a otro gimnasio. */
  writeTenant<T extends { gimnasio_id: string }>(col: string, filas: T[]): void {
    const gym = gimnasioParaEscribir();
    const otros = this.read<T>(col).filter((r) => r.gimnasio_id !== gym);
    this.write(col, otros.concat(filas.map((r) => ({ ...r, gimnasio_id: gym }))));
  },

  /* Siguiente id numerico de una coleccion. Lee la tabla completa y no
     readTenant: el id es global como un SERIAL en la tabla compartida, asi
     dos gimnasios nunca repiten id. */
  siguienteId<T>(col: string, idDe: (fila: T) => number): number {
    return this.read<T>(col).reduce((max, f) => Math.max(max, idDe(f)), 0) + 1;
  },
};

/* [plataforma] Lo que manda /registro al comprar el software. El
   administrador entra con su correo: por nombre seria ambiguo, porque dos
   personas pueden llamarse igual. */
export interface RegistroGimnasio {
  plan: PlanSoftware["id_plan_software"];
  /* slug opcional: si la vista no lo manda, api.ts lo genera desde el nombre.
     Si lo manda, se valida y debe estar libre (no se le agrega sufijo, porque
     el usuario ya vio ese enlace exacto en la vista previa). */
  gimnasio: { nombre: string; ciudad: string; telefono: string; slug?: string };
  admin: {
    numero_identificacion: string;
    nombre: string;
    apellidos: string;
    correo: string;
    contrasena: string;
  };
  metodo_pago: PagoSoftware["metodo_pago"];
}

/* 'Iron Fit' -> 'gym-iron-fit'. Quita tildes y simbolos para que el id se
   lea bien en localStorage; si ya existe, le suma -2, -3... */
function idDeGimnasio(nombre: string, existentes: Gimnasio[]): string {
  const slug = nombre
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
  const base = "gym-" + (slug || "nuevo");
  const usados = new Set(existentes.map((g) => g.gimnasio_id));
  let id = base;
  for (let n = 2; usados.has(id); n++) id = base + "-" + n;
  return id;
}

/* Datos que pide el modal de cobro. El monto va aparte del precio del plan a
   proposito: el legacy lo deja editable (PagoMembresiaController.java:185) y
   asi se pueden aplicar descuentos o cobros parciales. */
export interface NuevoPago {
  id_cliente: string;
  id_plan: number | null;
  modalidad_pago: Membresia["modalidad_pago"];
  valor: number;
  metodo_pago: Pago["metodo_pago"] | "";
  fecha_pago: string;
  referencia_transaccion: string;
  observaciones: string;
}

/* Fila de la tabla "Pagos pendientes" que arma FinanzasService.pagosVencidos
   (FinanzasService.java:18). El nombre es el del legacy: son pagos que
   quedaron sin aplicar, no necesariamente cuotas vencidas. */
export interface PagoVencido {
  id_pago: number;
  cliente: string;
  plan: string;
  valor: number;
  metodo: string;
  fecha: string;
  estado: string;
}

/* Lo que manda la vista de control de acceso al registrar algo. `metodo` es
   el mismo campo que guarda el registro: HUELLA o CONTRASENA, los dos del
   legacy. `contrasena` solo se usa cuando metodo es CONTRASENA. */
export interface IntentoAcceso {
  id_cliente: string;
  metodo: Ingreso["metodo_verificacion"];
  contrasena?: string;
}

/* Compara la clave que escribe el operador con la del usuario del cliente.
   Devuelve el motivo del rechazo, o null si pasa. Va aparte de
   clienteAceptado() porque la salida tambien la usa: cerrar la sesion de alguien
   exige identificarlo, pero no volver a pasar las reglas de entrada. */
function claveRechazada(id: string, contrasena: string | undefined): string | null {
  const clave = (contrasena ?? "").trim();
  if (!clave) return "Ingresa la contraseña del cliente.";
  const usuario = db.readTenant<Usuario>("usuarios").find((u) => u.numero_identificacion === id);
  // Sin fila no hay con que comparar: reportarlo como clave mala dejaria al
  // operador reintentando algo que nunca va a funcionar.
  if (!usuario) return "Este cliente no tiene código de acceso. Asignale uno para usar el modo manual.";
  if (usuario.contrasena !== clave) return "Contraseña incorrecta.";
  return null;
}

/* Validaciones de la puerta. Devuelve el motivo del rechazo, o el cliente si
   pasa. Se resuelve aqui y no en el componente para que ninguna vista pueda
   dejar entrar a alguien con la membresia vencida o el cliente suspendido. */
function clienteAceptado(
  intento: IntentoAcceso,
): { error: string } | { cliente: Cliente } {
  const id = intento.id_cliente.trim();
  const cliente = db.readTenant<Cliente>("clientes").find((c) => c.numero_identificacion === id);
  if (!cliente) return { error: "No se encontró un cliente con ese número de identificación" };

  // El estado va antes que la clave: no tiene sentido pedirle la contraseña a
  // alguien que ya sabemos que esta suspendido.
  if (cliente.estado !== "ACTIVO") {
    return { error: `El cliente está ${cliente.estado}. Actívalo en Clientes antes de registrar su acceso.` };
  }

  if (intento.metodo === "CONTRASENA") {
    const rechazo = claveRechazada(id, intento.contrasena);
    if (rechazo) return { error: rechazo };
  }

  return { cliente };
}

/* Devuelve los ultimos 'cantidadMeses' meses en orden, desde el mas viejo,
   incluyendo los que no tienen datos con total 0. El legacy devuelve solo los
   meses con filas (FinanzasService.java:23), y en una grafica eso deja huecos
   que parecen Drops en vez de meses sin facturar. */
function agruparPorMes<T>(
  filas: T[],
  fechaDe: (f: T) => string,
  valorDe: (f: T) => number,
  cantidadMeses: number,
): { mes: string; total: number }[] {
  const totales = new Map<string, number>();

  for (const f of filas) {
    const mes = fechaDe(f).slice(0, 7);
    if (!mes) continue;
    totales.set(mes, (totales.get(mes) ?? 0) + valorDe(f));
  }

  const hoy = new Date();
  const salida: { mes: string; total: number }[] = [];
  for (let i = cantidadMeses - 1; i >= 0; i--) {
    const d = new Date(hoy.getFullYear(), hoy.getMonth() - i, 1);
    const mes = d.getFullYear() + "-" + String(d.getMonth() + 1).padStart(2, "0");
    salida.push({ mes, total: totales.get(mes) ?? 0 });
  }

  return salida;
}
// ===== [P3] Instructores: cuenta de usuario (KAN-86) =====
/* Cada instructor tiene un Usuario INSTRUCTOR con su misma cedula en el gimnasio.
   Mismo patron que api.clientes: el estado (y aqui tambien nombre y correo) del
   usuario siempre sigue al del instructor. Todo con readTenant/writeTenant. */

// Crea (o reactiva) la cuenta al dar de alta al instructor. Devuelve la contraseña temporal.
function crearCuentaInstructor(ins: Instructor): { cuenta: CuentaInicial | null; aviso?: string } {
  const usuarios = db.readTenant<Usuario>("usuarios");
  const mismo = usuarios.find((u) => u.numero_identificacion === ins.numero_identificacion);
  // También si es cliente del gimnasio aunque aún no tenga cuenta: su código de acceso
  // (api.usuarios.asignar) se guardaría luego sobre esta misma fila.
  const esCliente = db.readTenant<Cliente>("clientes").some((c) => c.numero_identificacion === ins.numero_identificacion);
  if (!mismo && esCliente)
    return {
      cuenta: null,
      aviso:
        "Esta cédula es de un cliente del gimnasio; no se creó la cuenta de instructor (hoy cada persona tiene " +
        "un solo tipo de usuario).",
    };
  if (mismo && mismo.tipo_usuario !== "INSTRUCTOR")
    return {
      cuenta: null,
      aviso:
        "Esta cédula ya tiene una cuenta de " + mismo.tipo_usuario + " en el gimnasio; no se creó la cuenta de " +
        "instructor (hoy cada persona tiene un solo tipo de usuario).",
    };
  // El login busca por nombre o correo: el correo no puede ser de otra persona del gimnasio
  const correo = ins.correo.trim().toLowerCase();
  const ocupado = usuarios.find(
    (u) => u.numero_identificacion !== ins.numero_identificacion && u.correo.trim().toLowerCase() === correo
  );
  if (ocupado)
    return { cuenta: null, aviso: "El correo ya lo usa otra cuenta del gimnasio; no se creó la cuenta de instructor." };

  const contrasena = contrasenaInicial(ins.nombre, ins.numero_identificacion);
  const datos = {
    nombre: ins.nombre,
    apellidos: ins.apellidos,
    correo: ins.correo,
    contrasena,
    estado: ins.estado,
    debe_cambiar_contrasena: true,
  };
  if (mismo) Object.assign(mismo, datos);
  else
    usuarios.push({
      ...datos,
      gimnasio_id: ins.gimnasio_id,
      numero_identificacion: ins.numero_identificacion,
      tipo_usuario: "INSTRUCTOR",
      rol: "INSTRUCTOR",
    });
  db.writeTenant("usuarios", usuarios);
  return { cuenta: { usuario: ins.correo, contrasena_temporal: contrasena } };
}

// Copia al usuario los datos que cambiaron en el instructor (solo si es su cuenta de INSTRUCTOR)
function sincronizarCuentaInstructor(ins: Instructor): void {
  const usuarios = db.readTenant<Usuario>("usuarios");
  const u = usuarios.find((x) => x.numero_identificacion === ins.numero_identificacion && x.tipo_usuario === "INSTRUCTOR");
  if (!u) return; // instructor sin cuenta (p. ej. creado antes de KAN-86): nada que copiar
  u.nombre = ins.nombre;
  u.apellidos = ins.apellidos;
  u.correo = ins.correo;
  u.estado = ins.estado; // INACTIVO = ya no puede iniciar sesion (auth.login exige ACTIVO)
  db.writeTenant("usuarios", usuarios);
}

// Al eliminar al instructor (solo posible sin rutinas ni citas) se borra su cuenta
function borrarCuentaInstructor(id: string): void {
  const usuarios = db.readTenant<Usuario>("usuarios");
  db.writeTenant(
    "usuarios",
    usuarios.filter((u) => !(u.numero_identificacion === id && u.tipo_usuario === "INSTRUCTOR"))
  );
}
// ===== [/P3] Instructores: cuenta de usuario =====

// ===== [P3] Rutinas: auxiliares =====

// Mensaje de error si el instructor o el cliente no existen; null si ambos existen
function validarReferencias(idInstructor: string, idCliente: string): string | null {
  if (!db.readTenant<Instructor>("instructores").some((i) => i.numero_identificacion === idInstructor))
    return "El instructor no existe";
  if (!db.readTenant<Cliente>("clientes").some((c) => c.numero_identificacion === idCliente))
    return "El cliente no existe";
  return null;
}

// Vigente = sin fecha fin, o con fecha fin de hoy en adelante.
// Las fechas 'YYYY-MM-DD' se pueden comparar como texto: el orden alfabético es el cronológico.
function esVigente(r: Pick<Rutina, "fecha_fin">): boolean {
  return r.fecha_fin === null || r.fecha_fin >= utils.isoDate();
}

// Regla: un cliente solo puede tener UNA rutina vigente. Si la rutina que se guarda es vigente
// y el cliente ya tiene otra vigente (distinta de idPropio), devuelve el mensaje de error.
function validarUnaVigente(idCliente: string, fechaFin: string | null, idPropio: number | null): string | null {
  if (!esVigente({ fecha_fin: fechaFin })) return null;
  // readTenant: la Ana de otro gimnasio (misma cédula) no cuenta
  const otra = db
    .readTenant<Rutina>("rutinas")
    .find((r) => r.id_cliente === idCliente && r.id_rutina !== idPropio && esVigente(r));
  return otra
    ? "El cliente ya tiene la rutina vigente «" + otra.nombre + "». Solo puede tener una vigente a la vez."
    : null;
}

// ---- Rutinas v2 (KAN-54) ----
const LETRAS: LetraSesion[] = ["A", "B", "C", "D"];
const DIAS_AVISO_RUTINA = 15; // con menos días que esto la rutina está POR_VENCER

// Días que faltan desde hoy hasta 'YYYY-MM-DD' (negativo si ya pasó). Date.UTC da días enteros exactos.
function diasHasta(fecha: string): number {
  const [y, m, d] = fecha.split("-").map(Number);
  const [yh, mh, dh] = utils.isoDate().split("-").map(Number);
  return Math.round((Date.UTC(y, m - 1, d) - Date.UTC(yh, mh - 1, dh)) / 86400000);
}

// Estado calculado (no se guarda): FINALIZADA > VENCIDA > POR_VENCER > VIGENTE
function estadoDe(r: Rutina): EstadoRutina {
  if (r.finalizada_el) return "FINALIZADA";
  if (r.fecha_fin === null) return "VIGENTE";
  const restantes = diasHasta(r.fecha_fin);
  if (restantes < 0) return "VENCIDA";
  return restantes < DIAS_AVISO_RUTINA ? "POR_VENCER" : "VIGENTE";
}

// Exigido en rutinas nuevas: sesiones_planeadas entero > 0 y división de 1 a 4 letras sin repetir
function validarPlan(sesiones: number | undefined, division: LetraSesion[] | undefined): string | null {
  if (sesiones === undefined || !Number.isInteger(sesiones) || sesiones <= 0)
    return "Indica cuántas sesiones se planean (número entero mayor que 0)";
  if (!division || division.length < 1 || division.length > 4)
    return "La división debe tener de 1 a 4 sesiones (A, B, C, D)";
  if (division.some((l) => !LETRAS.includes(l))) return "La división solo admite las letras A, B, C y D";
  if (new Set(division).size !== division.length) return "La división no puede repetir letras";
  return null;
}

// Cédula de quien tiene la sesión abierta (para RegistroEntrenamiento.registrado_por)
function cedulaEnSesion(): string {
  const raw = localStorage.getItem(CLAVE_SESION);
  if (!raw) return "";
  try {
    const s = JSON.parse(raw) as { numero_identificacion?: unknown };
    return typeof s.numero_identificacion === "string" ? s.numero_identificacion : "";
  } catch {
    return "";
  }
}

// Valida una lista de ejercicios de sesión contra la división y el catálogo que ve el gimnasio.
// exigirTodas: cada sesión de la división necesita al menos un ejercicio (al guardar la rutina completa).
function validarEjerciciosSesion(division: LetraSesion[], lista: SesionEjercicioNuevo[], exigirTodas: boolean): string | null {
  const catalogo = leerCatalogo();
  const vistos = new Set<string>();
  for (const e of lista) {
    if (!e.sesion || !division.includes(e.sesion)) return "Cada ejercicio debe pertenecer a una sesión de la división";
    const ej = catalogo.find((c) => c.id_ejercicio === e.id_ejercicio);
    if (!ej) return "El ejercicio " + e.id_ejercicio + " no existe en el catálogo";
    const clave = e.sesion + "-" + e.id_ejercicio;
    if (vistos.has(clave)) return "«" + ej.nombre + "» está repetido en la sesión " + e.sesion;
    vistos.add(clave);
    const numeros = [e.series, e.reps_min, e.reps_max, e.segundos, e.peso_kg, e.descanso_seg];
    if (numeros.some((n) => n !== undefined && n !== null && (!Number.isFinite(n) || n < 0)))
      return "Los valores de «" + ej.nombre + "» no pueden ser negativos";
    if (e.series !== undefined && (!Number.isInteger(e.series) || e.series <= 0))
      return "Las series de «" + ej.nombre + "» deben ser un entero mayor que 0";
    if (e.reps_min != null && e.reps_max != null && e.reps_min > e.reps_max)
      return "En «" + ej.nombre + "» las repeticiones mínimas superan a las máximas";
  }
  if (exigirTodas) {
    const vacia = division.find((l) => !lista.some((e) => e.sesion === l));
    if (vacia) return "La sesión " + vacia + " necesita al menos un ejercicio";
  }
  return null;
}

// Renumera "orden" 1, 2, 3… dentro de cada sesión respetando el orden en que llegaron
function numerarPorSesion(lista: SesionEjercicioNuevo[]): SesionEjercicioNuevo[] {
  const contador: Partial<Record<LetraSesion, number>> = {};
  return lista.map((e) => {
    const letra = e.sesion ?? "A";
    const n = (contador[letra] ?? 0) + 1;
    contador[letra] = n;
    return { ...e, orden: n };
  });
}

// Siguiente sesión por rotación: la que sigue a la del último registro (A→B→C→A) o la primera
function siguienteDe(r: Rutina, registros: RegistroEntrenamiento[]): LetraSesion | null {
  const division = r.division ?? [];
  if (division.length === 0) return null;
  const ultimo = registros
    .filter((x) => x.id_rutina === r.id_rutina)
    .sort((a, b) => a.fecha.localeCompare(b.fecha) || a.id_registro - b.id_registro)
    .pop();
  const pos = ultimo ? division.indexOf(ultimo.sesion) : -1;
  return pos === -1 ? division[0] : division[(pos + 1) % division.length];
}

// Avance "12 de 19": registros de la rutina / sesiones planeadas (tope de 100 %)
function avanceDe(r: Rutina, registros: RegistroEntrenamiento[]): AvanceRutina {
  const completadas = registros.filter((x) => x.id_rutina === r.id_rutina).length;
  const planeadas = r.sesiones_planeadas ?? 0;
  const porcentaje = planeadas > 0 ? Math.min(100, Math.round((completadas / planeadas) * 100)) : 0;
  return { completadas, planeadas, porcentaje };
}
// ===== [/P3] Rutinas: auxiliares =====

// ===== [P3] Ejercicios: auxiliares =====
/* Catálogo MIXTO (DECISIONES.md, D4): en la misma tabla viven los ejercicios BASE (gimnasio_id null,
   de todos y de solo lectura) y los PROPIOS de cada gimnasio.

   - Los propios se leen y escriben con readTenant/writeTenant. Para eso se usa el tipo
     EjercicioPropio (gimnasio_id: string), que es lo que piden esos helpers.
   - readTenant compara gimnasio_id === gimnasio activo, así que NUNCA devuelve un base.
   - writeTenant conserva todas las filas con otro gimnasio_id, y null es "otro": las filas base
     quedan intactas siempre que solo le pasemos filas que salieron de readTenant. */
type EjercicioPropio = Ejercicio & { gimnasio_id: string };

// Lo que ve un gimnasio: base + propios. Sin sesión, nada (igual que readTenant).
function leerCatalogo(): Ejercicio[] {
  const gym = gimnasioActivo();
  if (!gym) return [];
  return db.read<Ejercicio>("ejercicios").filter((e) => e.gimnasio_id === null || e.gimnasio_id === gym);
}

// Para comparar nombres sin importar mayúsculas, tildes ni espacios de más
function normalizarNombre(texto: string): string {
  return texto.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().trim();
}

// Mensaje de error si los datos no son válidos; null si están bien
function validarEjercicio(e: EjercicioNuevo): string | null {
  if (!e.nombre.trim()) return "El nombre es obligatorio";
  const numeros = [e.series_sugeridas, e.repeticiones_min_sugeridas, e.repeticiones_max_sugeridas, e.segundos_sugeridos];
  if (numeros.some((n) => n !== null && (!Number.isInteger(n) || n <= 0)))
    return "Los valores sugeridos deben ser números enteros mayores que 0";
  const min = e.repeticiones_min_sugeridas;
  const max = e.repeticiones_max_sugeridas;
  if (min !== null && max !== null && min > max)
    return "Las repeticiones mínimas no pueden ser mayores que las máximas";
  return null;
}

// Un ejercicio de tiempo no lleva repeticiones y uno de repeticiones no lleva segundos
function limpiarSegunMedicion(e: EjercicioNuevo): EjercicioNuevo {
  return e.tipo_medicion === "TIEMPO"
    ? { ...e, repeticiones_min_sugeridas: null, repeticiones_max_sugeridas: null }
    : { ...e, segundos_sugeridos: null };
}

// Nombre repetido dentro de lo que ve el gimnasio (base + propios), sin contar el ejercicio idPropio
function nombreRepetido(nombre: string, idPropio: number | null): Ejercicio | undefined {
  return leerCatalogo().find(
    (e) => e.id_ejercicio !== idPropio && normalizarNombre(e.nombre) === normalizarNombre(nombre)
  );
}

// Mensaje común cuando se intenta cambiar un ejercicio base
const MENSAJE_BASE = "Es un ejercicio del catálogo base: no se puede cambiar. Personalízalo para tener tu propia copia.";
// ===== [/P3] Ejercicios: auxiliares =====

export const api = {
  _delay(ms = 200) {
    return new Promise<void>((res) => setTimeout(res, ms));
  },

  // [multitenant] Catalogo de la plataforma: no pasa por readTenant porque
  // es la tabla que define a los tenants.
  gimnasios: {
    async list(): Promise<Gimnasio[]> {
      await api._delay();
      return db.read<Gimnasio>("gimnasios");
    },

    // El de la sesion abierta, para mostrar su nombre (ej. en el Topbar).
    async activo(): Promise<Gimnasio | null> {
      await api._delay();
      const gym = gimnasioActivo();
      return db.read<Gimnasio>("gimnasios").find((g) => g.gimnasio_id === gym) ?? null;
    },

    /* [multitenant-slug] Resuelve el tenant de /g/:slug/... Es publico (no
       pide sesion) porque la pantalla de login del gimnasio lo necesita para
       mostrar su nombre. Devuelve solo GimnasioPublico, igual que la funcion
       gimnasio_por_slug() de Supabase (docs/MULTITENANT-SLUG.md). */
    async porSlug(slug: string): Promise<GimnasioPublico | null> {
      await api._delay(120);
      const clave = normalizarSlugDeUrl(slug);
      if (!clave) return null;
      const g = db.read<Gimnasio>("gimnasios").find((x) => x.slug === clave);
      return g ? publico(g) : null;
    },

    /* [multitenant-slug] Para la vista previa de /registro. Responde ok=false
       con el motivo (formato, reservado o ya usado) y, si se puede, sugiere
       uno libre en data. Es solo un aviso: registrar() vuelve a validar. */
    async slugDisponible(slug: string): Promise<ApiResp<{ slug: string; sugerencia?: string }>> {
      await api._delay(150);
      const valido = validarSlug(slug);
      if (!valido.ok) return { ok: false, mensaje: valido.mensaje, data: { slug } };
      const usados = new Set(db.read<Gimnasio>("gimnasios").map((g) => g.slug));
      if (usados.has(slug)) {
        return {
          ok: false,
          mensaje: "Ese enlace ya lo usa otro gimnasio.",
          data: { slug, sugerencia: slugUnico(slug, usados) },
        };
      }
      return { ok: true, mensaje: "Disponible", data: { slug } };
    },

    // [plataforma] Lo que muestra la pagina de planes.
    async planesSoftware(): Promise<PlanSoftware[]> {
      await api._delay();
      return db.read<PlanSoftware>("planesSoftware");
    },

    /* [plataforma] Alta de un gimnasio desde /registro: crea el gimnasio, su
       administrador y el pago de la suscripcion. Es una operacion de
       plataforma: todavia no hay sesion, asi que lee y escribe las tablas
       completas con db.read/db.write y no con readTenant, como lo haria el
       superadmin. El pago es simulado: siempre se aprueba. */
    async registrar(
      datos: RegistroGimnasio,
    ): Promise<ApiResp<{ gimnasio: Gimnasio; pago: PagoSoftware }>> {
      await api._delay(1200); // el "Procesando pago..." de la pasarela simulada

      const g = {
        nombre: datos.gimnasio.nombre.trim(),
        ciudad: datos.gimnasio.ciudad.trim(),
        telefono: datos.gimnasio.telefono.trim(),
        slug: datos.gimnasio.slug?.trim().toLowerCase() ?? "", // [multitenant-slug]
      };
      const a = {
        numero_identificacion: datos.admin.numero_identificacion.trim(),
        nombre: datos.admin.nombre.trim(),
        apellidos: datos.admin.apellidos.trim(),
        correo: datos.admin.correo.trim().toLowerCase(),
        // auth.login compara la clave ya recortada, asi que se guarda igual.
        contrasena: datos.admin.contrasena.trim(),
      };

      if (!g.nombre || !g.ciudad || !g.telefono)
        return { ok: false, mensaje: "Completa los datos del gimnasio." };
      if (!a.numero_identificacion || !a.nombre || !a.apellidos || !a.correo)
        return { ok: false, mensaje: "Completa los datos del administrador." };
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(a.correo))
        return { ok: false, mensaje: "El correo no es válido." };
      if (a.contrasena.length < 6)
        return { ok: false, mensaje: "La contraseña debe tener al menos 6 caracteres." };

      const plan = db.read<PlanSoftware>("planesSoftware").find((p) => p.id_plan_software === datos.plan);
      if (!plan) return { ok: false, mensaje: "El plan no existe." };

      // El login busca en toda la plataforma (usuarios.buscarPorNombreOCorreo),
      // asi que el correo del administrador debe ser unico en todos los
      // gimnasios, no solo en el suyo (DECISIONES.md, login por usuario).
      const usuarios = db.read<Usuario>("usuarios");
      if (usuarios.some((u) => u.correo.toLowerCase() === a.correo))
        return { ok: false, mensaje: "Ya hay una cuenta con ese correo. Inicia sesión o usa otro." };

      const gimnasios = db.read<Gimnasio>("gimnasios");
      const hoy = utils.isoDate();

      // [multitenant-slug] Unico en toda la plataforma. Con Supabase lo
      // garantiza el indice UNIQUE de gimnasios.slug; esta comprobacion queda
      // solo para dar un mensaje claro antes de intentar el INSERT.
      const usados = new Set(gimnasios.map((x) => x.slug));
      let slug: string;
      if (g.slug) {
        const valido = validarSlug(g.slug);
        if (!valido.ok) return { ok: false, mensaje: valido.mensaje };
        if (usados.has(g.slug)) return { ok: false, mensaje: "Ese enlace ya lo usa otro gimnasio. Elige otro." };
        slug = g.slug;
      } else {
        slug = slugUnico(slugify(g.nombre), usados);
      }

      const gimnasio: Gimnasio = {
        gimnasio_id: idDeGimnasio(g.nombre, gimnasios),
        slug,
        nombre: g.nombre,
        ciudad: g.ciudad,
        telefono: g.telefono,
        estado: "ACTIVO",
        plan_software: plan.id_plan_software,
        fecha_registro: hoy,
        vence_suscripcion: sumarDias(hoy, 30),
      };

      const admin: Usuario = {
        gimnasio_id: gimnasio.gimnasio_id,
        ...a,
        estado: "ACTIVO",
        tipo_usuario: "ADMINISTRADOR",
        rol: "ADMINISTRADOR",
      };

      const pago: PagoSoftware = {
        id_pago_software: db.siguienteId<PagoSoftware>("pagosSoftware", (p) => p.id_pago_software),
        gimnasio_id: gimnasio.gimnasio_id,
        id_plan_software: plan.id_plan_software,
        valor: plan.precio_mensual,
        metodo_pago: datos.metodo_pago,
        fecha_pago: hoy,
        referencia: "GB-" + Date.now().toString(36).toUpperCase(),
      };

      db.write("gimnasios", gimnasios.concat(gimnasio));
      db.write("usuarios", usuarios.concat(admin));
      db.write("pagosSoftware", db.read<PagoSoftware>("pagosSoftware").concat(pago));

      return { ok: true, mensaje: "Pago aprobado y gimnasio registrado", data: { gimnasio, pago } };
    },
  },

  usuarios: {
    /* Todas las filas del gimnasio, para que Clientes sepa de un vistazo quien
       tiene ya codigo de acceso. byIdentificacion resuelve un solo cliente y
       cuesta un delay por fila: en una tabla de siete socios serian siete
       idas y vueltas para lo que es un conjunto de identificaciones. */
    async list(): Promise<Usuario[]> {
      await api._delay();
      return db.readTenant<Usuario>("usuarios");
    },

    // El legacy busca por nombre o correo en el mismo campo
    // (UsuarioDAO.buscarPorNombreOCorreo, loginController.java:153), asi que
    // 'admin' y 'admin@gymbrot.com' resuelven al mismo usuario.
    //
    // Global a proposito, la unica lectura de usuarios sin readTenant: al
    // iniciar sesion todavia no hay gimnasio activo, y es el usuario que se
    // encuentra aqui el que decide a cual se entra. Por eso el nombre y el
    // correo de quien inicia sesion deben ser unicos en toda la plataforma.
    async buscarPorNombreOCorreo(texto: string): Promise<Usuario | null> {
      await api._delay();
      const clave = texto.trim().toLowerCase();
      if (!clave) return null;
      return (
        db.read<Usuario>("usuarios").find(
          (u) => u.nombre.toLowerCase() === clave || u.correo.toLowerCase() === clave,
        ) ?? null
      );
    },

    /* [multitenant-slug] Login de /g/:slug/login: el gimnasio ya lo dice la
       URL, asi que el usuario se busca solo dentro de el. Con esto el nombre
       de usuario deja de tener que ser unico en toda la plataforma (basta con
       que lo sea en su gimnasio). Lee la tabla completa y filtra a mano porque
       todavia no hay sesion, y readTenant devolveria vacio.
       En Supabase: signInWithPassword(correo) + comprobar gym_members. */
    async buscarEnGimnasio(gimnasioId: string, texto: string): Promise<Usuario | null> {
      await api._delay();
      const clave = texto.trim().toLowerCase();
      if (!clave || !gimnasioId) return null;
      return (
        db.read<Usuario>("usuarios").find(
          (u) =>
            u.gimnasio_id === gimnasioId &&
            (u.nombre.toLowerCase() === clave || u.correo.toLowerCase() === clave),
        ) ?? null
      );
    },

    // El modo manual de control de acceso busca por el numero de documento,
    // no por nombre ni correo: es lo que escribe el socio en la puerta
    // (RegistroEntradaController.handleValidarIngreso, ClienteDAO.buscarPorId).
    async byIdentificacion(id: string): Promise<Usuario | null> {
      await api._delay();
      const clave = id.trim();
      if (!clave) return null;
      return db.readTenant<Usuario>("usuarios").find((u) => u.numero_identificacion === clave) ?? null;
    },

    /* Crea o actualiza la clave de un cliente. Va por `usuarios`, no por
       `clientes`: el password vive en su propia tabla desde el legacy
       (CLIENTE.contrasena_hash), y meterlo en Cliente romperia el esquema
       cuando haya backend. Si el cliente no tenia fila, se crea con los datos
       que ya estan en `clientes`. */
    async asignar(id: string, contrasena: string): Promise<ApiResp<Usuario>> {
      await api._delay();
      const limpia = contrasena.trim();
      if (!limpia) return { ok: false, mensaje: "La contraseña no puede quedar vacía" };

      const cliente = db.readTenant<Cliente>("clientes").find((c) => c.numero_identificacion === id);
      if (!cliente) return { ok: false, mensaje: "El cliente no existe" };

      const usuarios = db.readTenant<Usuario>("usuarios");
      let usuario = usuarios.find((u) => u.numero_identificacion === id);

      if (usuario) {
        usuario.contrasena = limpia;
      } else {
        usuario = {
          gimnasio_id: cliente.gimnasio_id,
          numero_identificacion: id,
          nombre: cliente.nombre,
          apellidos: cliente.apellidos,
          correo: cliente.correo,
          contrasena: limpia,
          estado: cliente.estado,
          tipo_usuario: "CLIENTE",
          rol: "CLIENTE",
        };
        usuarios.push(usuario);
      }

      db.writeTenant("usuarios", usuarios);
      return { ok: true, mensaje: "Contraseña guardada", data: usuario };
    },

    /* Espejo de api.clientes.setEstado: el estado del usuario nunca se decide
       solo, siempre sigue al del cliente. Sin esto, suspender a alguien en
       Clientes dejaria su usuario ACTIVO en `usuarios`, y las dos pantallas
       volarian a contar reglas distintas. */
    async setEstado(id: string, estado: Usuario["estado"]): Promise<ApiResp<Usuario>> {
      await api._delay();
      const usuarios = db.readTenant<Usuario>("usuarios");
      const u = usuarios.find((x) => x.numero_identificacion === id);
      // Un cliente todavia sin fila en `usuarios` no tiene nada que espejar:
      // devolver error dejaria el alta como fallida por un dato cosmético. Y
      // crear la fila aqui sin contraseña haria que el modo manual respondiera
      // "contraseña incorrecta" en vez de "no tiene código de acceso".
      if (!u) return { ok: true, mensaje: "Cliente sin usuario: nada que sincronizar" };
      u.estado = estado;
      db.writeTenant("usuarios", usuarios);
      return { ok: true, mensaje: "Estado actualizado", data: u };
    },

    /* Fase roles: cambio de contrasena desde el portal con flag de primer ingreso. */
    async cambiarContrasena(id: string, contrasena: string): Promise<ApiResp<Usuario>> {
      await api._delay();
      const limpia = contrasena.trim();
      if (limpia.length < 6) return { ok: false, mensaje: "La contraseña debe tener al menos 6 caracteres" };
      const usuarios = db.read<Usuario>("usuarios");
      const u = usuarios.find((x) => x.numero_identificacion === id);
      if (!u) return { ok: false, mensaje: "Usuario no encontrado" };
      u.contrasena = limpia;
      u.debe_cambiar_contrasena = false;
      db.write("usuarios", usuarios);
      return { ok: true, mensaje: "Contraseña actualizada", data: u };
    },
  },

  /* Estado del lector de huella. Va en su propia clave y no en el SEED porque
     describe hardware, no datos de dominio: sembrarlo con el resto lo
     reiniciaria en cada bump de SEED_VERSION, que es justo lo contrario de
     lo que se quiere (el fallo de conexion debe persistir). El legacy lo
     sondea desde HuellaService con su listener de estado
     (HuellaService.java:120-170, loginController.java:59). */
  lector: {
    estaConectado(): boolean {
      const guardado = localStorage.getItem(CLAVE_LECTOR);
      return guardado === null ? true : guardado === "true";
    },

    setConectado(conectado: boolean): void {
      localStorage.setItem(CLAVE_LECTOR, String(conectado));
    },
  },

  /* [multitenant] Implementacion de referencia: toda lectura va por
     db.readTenant y toda escritura por db.writeTenant. Las demas entidades
     por gimnasio copian este patron. */
  clientes: {
    async list(): Promise<Cliente[]> {
      await api._delay();
      return db.readTenant<Cliente>("clientes");
    },

    async get(id: string): Promise<Cliente | null> {
      await api._delay();
      return db.readTenant<Cliente>("clientes").find((c) => c.numero_identificacion === id) ?? null;
    },

    // La cedula es unica dentro de cada gimnasio (D3): la misma persona puede
    // estar registrada en otro gimnasio sin que eso cuente como duplicado.
    async create(data: ClienteNuevo): Promise<ApiResp<Cliente>> {
      await api._delay();
      const arr = db.readTenant<Cliente>("clientes");
      if (arr.some((c) => c.numero_identificacion === data.numero_identificacion))
        return { ok: false, mensaje: "Ya existe un cliente con esa identificación en este gimnasio" };
      const nuevo: Cliente = {
        ...data,
        gimnasio_id: gimnasioParaEscribir(),
        estado: "ACTIVO",
        fecha_registro: utils.isoDate(),
      };
      arr.push(nuevo);
      db.writeTenant("clientes", arr);
      return { ok: true, mensaje: "Cliente registrado", data: nuevo };
    },

    async update(id: string, data: Partial<ClienteNuevo>): Promise<ApiResp<Cliente>> {
      await api._delay();
      const arr = db.readTenant<Cliente>("clientes");
      const c = arr.find((x) => x.numero_identificacion === id);
      if (!c) return { ok: false, mensaje: "Cliente no encontrado" };
      Object.assign(c, data);
      db.writeTenant("clientes", arr);
      return { ok: true, mensaje: "Cliente actualizado", data: c };
    },

    async setEstado(id: string, estado: Cliente["estado"]): Promise<ApiResp<Cliente>> {
      await api._delay();
      const arr = db.readTenant<Cliente>("clientes");
      const c = arr.find((x) => x.numero_identificacion === id);
      if (!c) return { ok: false, mensaje: "Cliente no encontrado" };
      c.estado = estado;
      db.writeTenant("clientes", arr);
      await api.usuarios.setEstado(id, estado); // ← espejo: el estado del usuario sigue al del cliente
      return { ok: true, mensaje: "Estado actualizado", data: c };
    },
  },

  // Catalogo global por ahora: si los planes son de cada gimnasio sigue
  // pendiente en DECISIONES.md (catalogos globales vs por gimnasio).
  planes: {
    async list(): Promise<PlanMembresia[]> {
      await api._delay();
      return db.read<PlanMembresia>("planes").filter((p) => p.estado === "ACTIVO");
    },
  },

  membresias: {
    async list(): Promise<Membresia[]> {
      await api._delay();
      return db.readTenant<Membresia>("membresias");
    },
    async byCliente(id: string): Promise<Membresia[]> {
      await api._delay();
      return db.readTenant<Membresia>("membresias").filter((m) => m.id_cliente === id);
    },

    async create(data: MembresiaNueva): Promise<ApiResp<Membresia>> {
      await api._delay();
      const arr = db.readTenant<Membresia>("membresias");
      const nueva: Membresia = {
        ...data,
        gimnasio_id: gimnasioParaEscribir(),
        id_membresia: db.siguienteId<Membresia>("membresias", (m) => m.id_membresia),
      };
      arr.push(nueva);
      db.writeTenant("membresias", arr);
      return { ok: true, mensaje: "Membresía registrada", data: nueva };
    },

    async update(
      id: number,
      data: Partial<MembresiaNueva>
    ): Promise<ApiResp<Membresia>> {
      await api._delay();
      const arr = db.readTenant<Membresia>("membresias");
      const membresia = arr.find((m) => m.id_membresia === id);
      if (!membresia) return { ok: false, mensaje: "Membresía no encontrada" };
      Object.assign(membresia, data, { id_membresia: id });
      db.writeTenant("membresias", arr);
      return { ok: true, mensaje: "Membresía actualizada", data: membresia };
    },

    async setEstado(id: number, estado: Membresia["estado"]): Promise<ApiResp<Membresia>> {
      await api._delay();
      const arr = db.readTenant<Membresia>("membresias");
      const membresia = arr.find((m) => m.id_membresia === id);
      if (!membresia) return { ok: false, mensaje: "Membresía no encontrada" };
      membresia.estado = estado;
      db.writeTenant("membresias", arr);
      return { ok: true, mensaje: "Estado de membresía actualizado", data: membresia };
    },
  },

  pagos: {
    async  list(): Promise<Pago[]> {
      await api._delay();
      return db.readTenant<Pago>("pagos");
    },
    async byCliente(id: string): Promise<Pago[]> {
      await api._delay();
      return db.readTenant<Pago>("pagos").filter((p) => p.id_cliente === id);
    },

    /* Registra un cobro y activa la membresia. El orden importa y es el que
       sigue PagoMembresiaController.java:205-247: membresia, historial, pago.
       Si algo falla, se revierte lo que se haya escrito en lugar de dejar
       membresia sin historial o sin pago. */
    async crear(input: NuevoPago): Promise<ApiResp<Pago>> {
      await api._delay();

      const idCliente = input.id_cliente.trim();
      const monto = Number(input.valor);

      if (!idCliente) return { ok: false, mensaje: "Selecciona un socio" };
      if (!input.id_plan) return { ok: false, mensaje: "Selecciona un plan" };
      // El legacy solo valida que el monto no este vacio y que se pueda
      // parsear (PagoMembresiaController.java:181-191), asi que acepta 0 y
      // negativos, y queda una membresia activa sin cobrar nada.
      if (!Number.isFinite(monto) || monto <= 0)
        return { ok: false, mensaje: "El monto debe ser mayor que cero" };
      if (!input.metodo_pago) return { ok: false, mensaje: "Selecciona un metodo de pago" };

      const clientes = db.readTenant<Cliente>("clientes");
      const cliente = clientes.find((c) => c.numero_identificacion === idCliente);
      if (!cliente) return { ok: false, mensaje: "El cliente no existe" };
      if (cliente.estado !== "ACTIVO")
        return { ok: false, mensaje: "El cliente no esta activo. Activalo en Clientes antes de cobrarle." };

      const planes = db.read<PlanMembresia>("planes");
      const plan = planes.find((p) => p.id_plan === input.id_plan);
      if (!plan) return { ok: false, mensaje: "El plan no existe" };

      // Idempotencia por referencia: la misma transaccion no se cobra dos
      // veces. El legacy no lo hace, asi que un doble clic en Procesar cobra
      // dos veces y crea dos membresias (PagoMembresiaController.java:215).
      // La referencia se busca dentro del gimnasio: la numeracion de recibos
      // es de cada uno, y un gimnasio no debe enterarse de las del otro.
      const referencia = input.referencia_transaccion.trim().toUpperCase();
      const pagos = db.readTenant<Pago>("pagos");

      if (referencia && pagos.some((p) => p.referencia_transaccion.toUpperCase() === referencia))
        return { ok: false, mensaje: "Esa referencia ya tiene un pago registrado" };

      const hoy = utils.isoDate();
      const gym = gimnasioParaEscribir();
      const membresias = db.readTenant<Membresia>("membresias");
      const historial = db.readTenant<HistorialMembresia>("historialMembresias");

      // El cobro solo renueva la membresia vigente: si el cliente ya tiene una,
      // el plan y la modalidad van dados y cambiar alguno exige cancelar antes
      // en Clientes. Antes se aceptaba el cambio aqui y la renovacion apagaba
      // sola la membresia anterior (linea "anterior.estado = CANCELADA"), con
      // lo que un simple cobro dejaba al cliente sin plan.
      const vigente = membresias.find(
        (m) => m.id_cliente === idCliente && m.estado === "ACTIVA" && m.fecha_vencimiento >= hoy,
      );
      if (vigente) {
        if (vigente.id_plan !== plan.id_plan || vigente.modalidad_pago !== input.modalidad_pago)
          return {
            ok: false,
            mensaje:
              "El cliente ya tiene una membresia vigente " +
              (vigente.tipo_membresia + " " + vigente.modalidad_pago) +
              ". Cancela esa membresia en Clientes antes de activar otra.",
          };
      }

      // Copias para poder deshacer: se escriben todas o ninguna.
      const membresiasPrevias = membresias.map((m) => ({ ...m }));
      const historialPrevio = historial.map((h) => ({ ...h }));

      try {
        // Duracion segun modalidad (PagoMembresiaController.java:198).
        const dias = input.modalidad_pago === "SEMESTRAL" ? 180 : input.modalidad_pago === "ANUAL" ? 365 : 30;

        const membresia: Membresia = {
          gimnasio_id: gym,
          id_membresia: db.siguienteId<Membresia>("membresias", (m) => m.id_membresia),
          id_cliente: idCliente,
          id_plan: plan.id_plan,
          tipo_membresia: plan.nombre,
          modalidad_pago: input.modalidad_pago,
          valor: monto,
          fecha_inicio: hoy,
          fecha_vencimiento: sumarDias(hoy, dias),
          estado: "ACTIVA",
        };

        // Renovar apaga la membresia anterior en vez de dejarla vigente.
        // Es `vigente`, ya resuelto mas arriba: se cancela porque el cobro es
        // su renovacion, nunca porque se este cambiando de plan.
        if (vigente) vigente.estado = "CANCELADA";

        historial.forEach((h) => {
          if (h.id_cliente === idCliente && h.activa) h.activa = false;
        });

        historial.push({
          gimnasio_id: gym,
          id_historial: db.siguienteId<HistorialMembresia>("historialMembresias", (h) => h.id_historial),
          id_cliente: idCliente,
          id_membresia: membresia.id_membresia,
          fecha_asignacion: hoy,
          activa: true,
        });

        const pago: Pago = {
          gimnasio_id: gym,
          id_pago: db.siguienteId<Pago>("pagos", (p) => p.id_pago),
          id_cliente: idCliente,
          id_membresia: membresia.id_membresia,
          fecha_pago: input.fecha_pago || hoy,
          valor: monto,
          metodo_pago: input.metodo_pago,
          estado_pago: "EXITOSO",
          referencia_transaccion: referencia,
          observaciones: input.observaciones.trim(),
        };

        pagos.push(pago);
        membresias.push(membresia);

        db.writeTenant("membresias", membresias);
        db.writeTenant("historialMembresias", historial);
        db.writeTenant("pagos", pagos);

        return { ok: true, mensaje: "Pago registrado y membresia activada", data: pago };
      } catch (e) {
        // Atraso de las tres escrituras: sin esto, un fallo a medias deja
        // una membresia activa sin pago registrado. Va por writeTenant: las
        // copias salieron de readTenant y db.write borraria a los otros
        // gimnasios.
        db.writeTenant("membresias", membresiasPrevias);
        db.writeTenant("historialMembresias", historialPrevio);
        return {
          ok: false,
          mensaje: "No se pudo registrar el pago. Revisa el historial. (" + (e instanceof Error ? e.message : "error") + ")",
        };
      }
    }
  },

  /* Agregados de Finanzas. Cada uno replica el GROUP BY de su consulta en el
     legacy (FinanzasService.java) pero en memoria sobre las colecciones del
     mock. Todos exigen estado_pago = EXITOSO: el legacy lo hace en
     ingresosPorMes (l.23) pero se le olvida en desgloseMetodoPago (l.68), y
     un pago anulado no es ingreso. */
  finanzas: {
    async ingresosPorMes(cantidadMeses = 12): Promise<{ mes: string; total: number }[]> {
      await api._delay();
      const pagos = db.readTenant<Pago>("pagos").filter((p) => p.estado_pago === "EXITOSO");
      return agruparPorMes(pagos, (p) => p.fecha_pago, (p) => p.valor, cantidadMeses);
    },

    async ingresosPorPlan(): Promise<{ plan: string; total: number }[]> {
      await api._delay();
      const membresias = db.readTenant<Membresia>("membresias");
      const porId = new Map(membresias.map((m) => [m.id_membresia, m.tipo_membresia]));
      const totales = new Map<string, number>();

      for (const p of db.readTenant<Pago>("pagos")) {
        if (p.estado_pago !== "EXITOSO") continue;
        const plan = porId.get(p.id_membresia);
        if (!plan) continue;   // pago sin membresia asociada: no se puede atribuir
        totales.set(plan, (totales.get(plan) ?? 0) + p.valor);
      }

      return [...totales].map(([plan, total]) => ({ plan, total })).sort((a, b) => b.total - a.total);
    },

    async porMetodoPago(): Promise<{ metodo: string; total: number; cantidad: number }[]> {
      await api._delay();
      const totales = new Map<string, { total: number; cantidad: number }>();

      for (const p of db.readTenant<Pago>("pagos")) {
        if (p.estado_pago !== "EXITOSO") continue;
        const previo = totales.get(p.metodo_pago) ?? { total: 0, cantidad: 0 };
        totales.set(p.metodo_pago, {
          total: previo.total + p.valor,
          cantidad: previo.cantidad + 1,
        });
      }

      return [...totales]
        .map(([metodo, v]) => ({ metodo, total: v.total, cantidad: v.cantidad }))
        .sort((a, b) => b.total - a.total);
    },

    async nuevosClientes(cantidadMeses = 12): Promise<{ mes: string; cantidad: number }[]> {
      await api._delay();
      const porMes = agruparPorMes(
        db.readTenant<Cliente>("clientes"),
        (c) => c.fecha_registro,
        () => 1,
        cantidadMeses,
      );
      return porMes.map((m) => ({ mes: m.mes, cantidad: m.total }));
    },

    /* Pagos que aun no se aplican: el cliente tiene membresia vencida o sin
       historial vigente. El legacy mira si la membresia sigue ACTIVA
       (FinanzasService.java:112), que ignora que el pago pudo quedar
       PENDIENTE aunque la membresia este bien. */
    async pagosVencidos(): Promise<PagoVencido[]> {
      await api._delay();
      const membresias = db.readTenant<Membresia>("membresias");
      const porId = new Map(membresias.map((m) => [m.id_membresia, m]));
      const clientes = new Map(db.readTenant<Cliente>("clientes").map((c) => [c.numero_identificacion, c]));
      const hoy = utils.isoDate();

      return db
        .readTenant<Pago>("pagos")
        .filter((p) => p.estado_pago !== "EXITOSO")
        .map((p): PagoVencido | null => {
          const m = porId.get(p.id_membresia);
          if (!m) return null;
          const vigente = m.estado === "ACTIVA" && m.fecha_vencimiento >= hoy;
          if (vigente) return null;
          const c = clientes.get(p.id_cliente);
          return {
            id_pago: p.id_pago,
            cliente: c ? c.nombre + " " + c.apellidos : p.id_cliente,
            plan: m.tipo_membresia,
            valor: p.valor,
            metodo: p.metodo_pago,
            fecha: p.fecha_pago,
            estado: p.estado_pago,
          };
        })
        .filter((x): x is PagoVencido => x !== null);
    },
  },

  /* Control de acceso. El legacy delega en SP_REGISTRAR_INGRESO /
     SP_REGISTRAR_SALIDA y la validacion vive en el controller
     (RegistroEntradaController:285-341). Aqui validacion y escritura van
     juntas: registrar una entrada sin pasar por las reglas no deberia ser
     posible desde ninguna vista. */
  acceso: {
    async registrarEntrada(intento: IntentoAcceso): Promise<ApiResp<Ingreso>> {
      await api._delay();

      const revisado = clienteAceptado(intento);
      if ("error" in revisado) return { ok: false, mensaje: revisado.error };
      const { cliente } = revisado;

      // El mismo predicado con el que Finanzas cuenta "Membresías vigentes":
      // si esa tarjeta no lo cuenta, la puerta no lo deja pasar.
      const hoy = utils.isoDate();
      const id = cliente.numero_identificacion;
      const vigente = db.readTenant<Membresia>("membresias").some(
        (m) => m.id_cliente === id && membresiaVigente(m, hoy, cliente),
      );
      if (!vigente) {
        return {
          ok: false,
          mensaje: `${cliente.nombre} ${cliente.apellidos} no tiene una membresía activa. Debe adquirir o renovar su membresía para ingresar.`,
        };
      }

      // Solo cuenta una entrada abierta en este gimnasio: estar dentro de otro
      // con la misma cedula no impide entrar aqui.
      const ingresos = db.readTenant<Ingreso>("ingresos");
      const abierto = ingresos.find(
        (i) => i.id_cliente === id && i.fecha === hoy && i.hora_salida === null,
      );
      if (abierto) {
        return {
          ok: false,
          mensaje: `Ya está dentro del gimnasio desde las ${utils.hora(abierto.hora_entrada)}.`,
        };
      }

      const registro: Ingreso = {
        gimnasio_id: gimnasioParaEscribir(),
        id_ingreso: db.siguienteId<Ingreso>("ingresos", (i) => i.id_ingreso),
        id_cliente: id,
        fecha: hoy,
        hora_entrada: hoy + "T" + relojLocal(),
        hora_salida: null,
        metodo_verificacion: intento.metodo,
        estado_verificacion: "APROBADO",
      };
      ingresos.push(registro);
      db.writeTenant("ingresos", ingresos);

      return {
        ok: true,
        mensaje: `Entrada registrada para ${cliente.nombre} ${cliente.apellidos}`,
        data: registro,
      };
    },

    /* Cierra la entrada abierta del dia.

       A diferencia de la entrada NO exige membresia vigente ni cliente ACTIVO.
       El legacy las pedia en las dos (RegistroEntradaController:307) y el
       resultado es que alguien suspendido o con la membresia vencida no podia
       registrar su salida y quedaba "dentro" para siempre, inflando el KPI
       "Activos ahora" del Dashboard.

       `metodo` es opcional: el panel manual lo manda para identificar al
       socio, el atajo de la fila del listado cierra directo. */
    async registrarSalida(datos: {
      id_cliente: string;
      metodo?: Ingreso["metodo_verificacion"];
      contrasena?: string;
    }): Promise<ApiResp<Ingreso>> {
      await api._delay();

      const id = datos.id_cliente.trim();
      const cliente = db.readTenant<Cliente>("clientes").find((c) => c.numero_identificacion === id);
      if (!cliente) return { ok: false, mensaje: "No se encontró un cliente con ese número de identificación" };

      if (datos.metodo === "CONTRASENA") {
        const rechazo = claveRechazada(id, datos.contrasena);
        if (rechazo) return { ok: false, mensaje: rechazo };
      }

      const hoy = utils.isoDate();
      const ingresos = db.readTenant<Ingreso>("ingresos");
      const abierto = ingresos.find(
        (i) => i.id_cliente === id && i.fecha === hoy && i.hora_salida === null,
      );
      if (!abierto) {
        return { ok: false, mensaje: "No hay una entrada registrada hoy para este cliente." };
      }

      const ahora = hoy + "T" + relojLocal();
      // Las horas del seed de hoy van escritas a mano y no se mueven con el
      // reloj, así que a primera hora puede haber una entrada "futura". Sin
      // este tope saldria un registro con la salida antes que la entrada.
      abierto.hora_salida = ahora < abierto.hora_entrada ? abierto.hora_entrada : ahora;
      db.writeTenant("ingresos", ingresos);

      return {
        ok: true,
        mensaje: `Salida registrada para ${cliente.nombre} ${cliente.apellidos}`,
        data: abierto,
      };
    },
  },

  ingresos: {
    async list(): Promise<Ingreso[]> {
      await api._delay();
      return db.readTenant<Ingreso>("ingresos");
    },
    async byCliente(id: string): Promise<Ingreso[]> {
      await api._delay();
      return db.readTenant<Ingreso>("ingresos").filter((i) => i.id_cliente === id);
    },
    /* Lo que muestra el listado de control de acceso: un solo dia. Dashboard y
       Finanzas usan list() con el historial completo; aqui leer los seis dias
       anteriores solo serviria para filtrarlos en el componente. */
    async delDia(fecha: string): Promise<Ingreso[]> {
      await api._delay();
      return db.readTenant<Ingreso>("ingresos").filter((i) => i.fecha === fecha);
    },
  },

  // ===== [P3] Ejercicios (antes P4) =====
  ejercicios: {
    // Base + propios del gimnasio activo, ordenados por nombre
    async list(): Promise<Ejercicio[]> {
      await api._delay();
      return leerCatalogo().sort((a, b) => a.nombre.localeCompare(b.nombre));
    },

    async get(id: number): Promise<Ejercicio | null> {
      await api._delay();
      return leerCatalogo().find((e) => e.id_ejercicio === id) ?? null;
    },

    // Desde un gimnasio solo se crean ejercicios PROPIOS
    async create(data: EjercicioNuevo): Promise<ApiResp<Ejercicio>> {
      await api._delay();
      const datos = limpiarSegunMedicion({ ...data, nombre: data.nombre.trim() });
      const error = validarEjercicio(datos);
      if (error) return { ok: false, mensaje: error };
      const repetido = nombreRepetido(datos.nombre, null);
      if (repetido)
        return {
          ok: false,
          mensaje:
            repetido.gimnasio_id === null
              ? "Ya existe un ejercicio base con ese nombre. Personalízalo si quieres tu propia versión."
              : "Ya existe un ejercicio con ese nombre en este gimnasio",
        };
      const arr = db.readTenant<EjercicioPropio>("ejercicios");
      const nuevo: EjercicioPropio = {
        ...datos,
        id_ejercicio: db.siguienteId<Ejercicio>("ejercicios", (e) => e.id_ejercicio),
        gimnasio_id: gimnasioParaEscribir(),
        estado: "ACTIVO",
      };
      arr.push(nuevo);
      db.writeTenant("ejercicios", arr);
      return { ok: true, mensaje: "Ejercicio registrado", data: nuevo };
    },

    // Solo propios. Sobre un base responde que es del catálogo base.
    async update(id: number, data: Partial<EjercicioNuevo>): Promise<ApiResp<Ejercicio>> {
      await api._delay();
      const arr = db.readTenant<EjercicioPropio>("ejercicios");
      const ej = arr.find((e) => e.id_ejercicio === id);
      if (!ej) {
        const esBase = leerCatalogo().some((e) => e.id_ejercicio === id && e.gimnasio_id === null);
        return { ok: false, mensaje: esBase ? MENSAJE_BASE : "Ejercicio no encontrado" };
      }
      // Cómo quedaría con los cambios, para validar con los valores finales
      const { id_ejercicio, gimnasio_id, estado, ...actual } = ej;
      const final = limpiarSegunMedicion({ ...actual, ...data, nombre: (data.nombre ?? actual.nombre).trim() });
      const error = validarEjercicio(final);
      if (error) return { ok: false, mensaje: error };
      if (nombreRepetido(final.nombre, id)) return { ok: false, mensaje: "Ya existe otro ejercicio con ese nombre" };
      Object.assign(ej, final, { id_ejercicio, gimnasio_id, estado });
      db.writeTenant("ejercicios", arr);
      return { ok: true, mensaje: "Ejercicio actualizado", data: ej };
    },

    async setEstado(id: number, estado: EstadoEjercicio): Promise<ApiResp<Ejercicio>> {
      await api._delay();
      const arr = db.readTenant<EjercicioPropio>("ejercicios");
      const ej = arr.find((e) => e.id_ejercicio === id);
      if (!ej) {
        const esBase = leerCatalogo().some((e) => e.id_ejercicio === id && e.gimnasio_id === null);
        return { ok: false, mensaje: esBase ? MENSAJE_BASE : "Ejercicio no encontrado" };
      }
      ej.estado = estado;
      db.writeTenant("ejercicios", arr);
      return { ok: true, mensaje: "Estado actualizado", data: ej };
    },

    // Solo propios, y con RESTRICT: no se borra si lo usa alguna rutina de este gimnasio
    async remove(id: number): Promise<ApiResp<Ejercicio>> {
      await api._delay();
      const arr = db.readTenant<EjercicioPropio>("ejercicios");
      const ej = arr.find((e) => e.id_ejercicio === id);
      if (!ej) {
        const esBase = leerCatalogo().some((e) => e.id_ejercicio === id && e.gimnasio_id === null);
        return { ok: false, mensaje: esBase ? MENSAJE_BASE : "Ejercicio no encontrado" };
      }
      const usos = db.readTenant<RutinaEjercicio>("rutina_ejercicios").filter((e) => e.id_ejercicio === id);
      const rutinas = new Set(usos.map((e) => e.id_rutina)).size; // una rutina puede usarlo varias veces
      if (rutinas > 0)
        return {
          ok: false,
          mensaje: "No se puede eliminar: lo usan " + rutinas + " rutina(s). Desactívalo en su lugar.",
        };
      db.writeTenant("ejercicios", arr.filter((e) => e.id_ejercicio !== id));
      return { ok: true, mensaje: "Ejercicio eliminado", data: ej };
    },

    // Copia un ejercicio BASE como propio del gimnasio, para poder editarlo.
    // El nombre lleva "(personalizado)" porque un propio no puede llamarse igual que un base.
    async personalizar(id: number): Promise<ApiResp<Ejercicio>> {
      await api._delay();
      const original = leerCatalogo().find((e) => e.id_ejercicio === id);
      if (!original) return { ok: false, mensaje: "Ejercicio no encontrado" };
      if (original.gimnasio_id !== null)
        return { ok: false, mensaje: "Este ejercicio ya es propio del gimnasio: puedes editarlo directamente" };
      const nombre = original.nombre + " (personalizado)";
      if (nombreRepetido(nombre, null))
        return { ok: false, mensaje: "Ya personalizaste este ejercicio: busca «" + nombre + "»" };
      const arr = db.readTenant<EjercicioPropio>("ejercicios");
      const copia: EjercicioPropio = {
        ...original,
        nombre,
        id_ejercicio: db.siguienteId<Ejercicio>("ejercicios", (e) => e.id_ejercicio),
        gimnasio_id: gimnasioParaEscribir(),
        estado: "ACTIVO",
      };
      arr.push(copia);
      db.writeTenant("ejercicios", arr);
      return { ok: true, mensaje: "Se creó «" + nombre + "» como ejercicio propio", data: copia };
    },
  },
  // ===== [/P3] Ejercicios =====

  // ===== [P3] Instructores =====
  instructores: {
    // Todo se lee con readTenant (solo el gimnasio activo) y se guarda con writeTenant,
    // así el .find() por cédula nunca encuentra al instructor de otro gimnasio (D3).
    async list(): Promise<Instructor[]> {
      await api._delay();
      return db.readTenant<Instructor>("instructores");
    },

    async get(id: string): Promise<Instructor | null> {
      await api._delay();
      return db.readTenant<Instructor>("instructores").find((i) => i.numero_identificacion === id) ?? null;
    },

    // La cédula es única dentro de cada gimnasio (D3): la misma persona puede
    // trabajar en otro gimnasio sin que eso cuente como duplicado.
    // KAN-86: además crea su Usuario INSTRUCTOR y devuelve la contraseña temporal
    async create(data: InstructorNuevo): Promise<ApiResp<InstructorCreado>> {
      await api._delay();
      const arr = db.readTenant<Instructor>("instructores");
      if (arr.some((i) => i.numero_identificacion === data.numero_identificacion))
        return { ok: false, mensaje: "Ya existe un instructor con esa identificación en este gimnasio" };
      // KAN-61: la API es la que manda; la vista valida antes solo para avisar rápido
      const errorHorario = validarHorario(data.horario);
      if (errorHorario) return { ok: false, mensaje: errorHorario };
      const nuevo: Instructor = {
        ...data,
        gimnasio_id: gimnasioParaEscribir(),
        estado: "ACTIVO",
        fecha_contratacion: utils.isoDate(),
      };
      arr.push(nuevo);
      db.writeTenant("instructores", arr);
      const { cuenta, aviso } = crearCuentaInstructor(nuevo);
      return { ok: true, mensaje: "Instructor registrado", data: { instructor: nuevo, cuenta, aviso } };
    },

    // La identificación es la llave: no se deja cambiar al editar (ni el gimnasio)
    async update(
      id: string,
      data: Partial<Omit<Instructor, "numero_identificacion" | "gimnasio_id">>
    ): Promise<ApiResp<Instructor>> {
      await api._delay();
      const arr = db.readTenant<Instructor>("instructores");
      const ins = arr.find((i) => i.numero_identificacion === id);
      if (!ins) return { ok: false, mensaje: "Instructor no encontrado" };
      if (data.horario) {
        const errorHorario = validarHorario(data.horario);
        if (errorHorario) return { ok: false, mensaje: errorHorario };
      }
      Object.assign(ins, data, { numero_identificacion: id });
      db.writeTenant("instructores", arr);
      sincronizarCuentaInstructor(ins);
      return { ok: true, mensaje: "Instructor actualizado", data: ins };
    },

    async remove(id: string): Promise<ApiResp<Instructor>> {
      await api._delay();
      const arr = db.readTenant<Instructor>("instructores");
      const ins = arr.find((i) => i.numero_identificacion === id);
      if (!ins) return { ok: false, mensaje: "Instructor no encontrado" };
      // Como un FK con RESTRICT: no se borra si tiene rutinas que lo referencian.
      // Solo cuentan las rutinas de este gimnasio (la misma cédula puede tener rutinas en otro).
      const rutinas = db.readTenant<Rutina>("rutinas").filter((r) => r.id_instructor === id).length;
      if (rutinas > 0)
        return {
          ok: false,
          mensaje: "No se puede eliminar: tiene " + rutinas + " rutina(s) asignada(s). Desactívalo en su lugar.",
        };
      // RESTRICT también por citas (KAN-60): una cita es historial del instructor y del cliente.
      // Solo se lee la colección de P2; las CANCELADAS no cuentan (no son un hecho que conservar).
      const citas = db
        .readTenant<Cita>("citas")
        .filter((c) => c.id_instructor === id && c.estado !== "CANCELADA").length;
      if (citas > 0)
        return {
          ok: false,
          mensaje: "No se puede eliminar: tiene " + citas + " cita(s) registrada(s). Desactívalo en su lugar.",
        };
      db.writeTenant("instructores", arr.filter((i) => i.numero_identificacion !== id));
      borrarCuentaInstructor(id);
      return { ok: true, mensaje: "Instructor eliminado", data: ins };
    },

    async setEstado(id: string, estado: EstadoInstructor): Promise<ApiResp<Instructor>> {
      await api._delay();
      const arr = db.readTenant<Instructor>("instructores");
      const ins = arr.find((i) => i.numero_identificacion === id);
      if (!ins) return { ok: false, mensaje: "Instructor no encontrado" };
      ins.estado = estado;
      db.writeTenant("instructores", arr);
      sincronizarCuentaInstructor(ins);
      return { ok: true, mensaje: "Estado actualizado", data: ins };
    },
  },
  // ===== [/P3] Instructores =====

  // ===== [P3] Rutinas =====
  rutinas: {
    // Igual que instructores: se lee con readTenant y se guarda con writeTenant.
    async list(): Promise<Rutina[]> {
      await api._delay();
      return db.readTenant<Rutina>("rutinas");
    },

    async get(id: number): Promise<Rutina | null> {
      await api._delay();
      return db.readTenant<Rutina>("rutinas").find((r) => r.id_rutina === id) ?? null;
    },

    // id_rutina = siguiente id de la tabla completa (global, ningún gimnasio lo repite);
    // gimnasio_id = el de la sesión; fecha_creacion = hoy
    // v2: exige sesiones_planeadas y división; cliente e instructor deben estar ACTIVOS
    async create(data: RutinaNueva): Promise<ApiResp<Rutina>> {
      await api._delay();
      const error =
        validarPlan(data.sesiones_planeadas, data.division) ??
        validarReferencias(data.id_instructor, data.id_cliente) ??
        validarUnaVigente(data.id_cliente, data.fecha_fin, null);
      if (error) return { ok: false, mensaje: error };
      const cliente = db.readTenant<Cliente>("clientes").find((c) => c.numero_identificacion === data.id_cliente);
      if (cliente && cliente.estado !== "ACTIVO")
        return { ok: false, mensaje: "El cliente está " + cliente.estado + ": no se le puede asignar una rutina" };
      const instructor = db.readTenant<Instructor>("instructores").find((i) => i.numero_identificacion === data.id_instructor);
      if (instructor && instructor.estado !== "ACTIVO")
        return { ok: false, mensaje: "El instructor está INACTIVO: elige otro" };
      const arr = db.readTenant<Rutina>("rutinas");
      const nueva: Rutina = {
        ...data,
        gimnasio_id: gimnasioParaEscribir(),
        id_rutina: db.siguienteId<Rutina>("rutinas", (r) => r.id_rutina),
        fecha_creacion: utils.isoDate(),
        finalizada_el: null,
      };
      arr.push(nueva);
      db.writeTenant("rutinas", arr);
      return { ok: true, mensaje: "Rutina creada", data: nueva };
    },

    // id_rutina y fecha_creacion no se dejan cambiar al editar (gimnasio_id lo vuelve a sellar writeTenant)
    async update(id: number, data: Partial<RutinaNueva>): Promise<ApiResp<Rutina>> {
      await api._delay();
      const arr = db.readTenant<Rutina>("rutinas");
      const r = arr.find((x) => x.id_rutina === id);
      if (!r) return { ok: false, mensaje: "Rutina no encontrada" };
      // Cómo quedaría la rutina con los cambios, para validar con los valores finales
      const final = { ...r, ...data };
      // v2: si la rutina ya tiene plan (o se le está poniendo), tiene que quedar válido
      const esV2 = final.division !== undefined || final.sesiones_planeadas !== undefined;
      const error =
        (esV2 ? validarPlan(final.sesiones_planeadas, final.division) : null) ??
        validarReferencias(final.id_instructor, final.id_cliente) ??
        validarUnaVigente(final.id_cliente, final.fecha_fin, id);
      if (error) return { ok: false, mensaje: error };
      // id, fecha de creación y finalización no se cambian desde aquí
      Object.assign(r, data, { id_rutina: id, fecha_creacion: r.fecha_creacion, finalizada_el: r.finalizada_el ?? null });
      db.writeTenant("rutinas", arr);
      return { ok: true, mensaje: "Rutina actualizada", data: r };
    },

    // Pasa una rutina vigente al historial poniendo fecha_fin = ayer, así el cliente queda libre hoy.
    // Una rutina creada hoy no se puede finalizar: ayer quedaría antes de su fecha_creacion.
    async finalizar(id: number): Promise<ApiResp<Rutina>> {
      await api._delay();
      const arr = db.readTenant<Rutina>("rutinas");
      const r = arr.find((x) => x.id_rutina === id);
      if (!r) return { ok: false, mensaje: "Rutina no encontrada" };
      if (!esVigente(r)) return { ok: false, mensaje: "La rutina ya está en el historial" };
      const ayer = dia(1);
      if (ayer < r.fecha_creacion)
        return {
          ok: false,
          mensaje: "Esta rutina se creó hoy y no se puede finalizar. Si quieres cambiarla, edítala.",
        };
      r.fecha_fin = ayer;
      r.finalizada_el = utils.isoDate(); // v2: distingue FINALIZADA de VENCIDA
      db.writeTenant("rutinas", arr);
      return { ok: true, mensaje: "Rutina «" + r.nombre + "» finalizada", data: r };
    },

    // Borra la rutina y también sus ejercicios (como un ON DELETE CASCADE), todo dentro del gimnasio
    async remove(id: number): Promise<ApiResp<Rutina>> {
      await api._delay();
      const arr = db.readTenant<Rutina>("rutinas");
      const r = arr.find((x) => x.id_rutina === id);
      if (!r) return { ok: false, mensaje: "Rutina no encontrada" };
      db.writeTenant("rutinas", arr.filter((x) => x.id_rutina !== id));
      const ejercicios = db.readTenant<RutinaEjercicio>("rutina_ejercicios");
      db.writeTenant("rutina_ejercicios", ejercicios.filter((e) => e.id_rutina !== id));
      // v2: también sus registros de entrenamiento (CASCADE)
      const registros = db.readTenant<RegistroEntrenamiento>("registros_entrenamiento");
      db.writeTenant("registros_entrenamiento", registros.filter((x) => x.id_rutina !== id));
      return { ok: true, mensaje: "Rutina eliminada", data: r };
    },

    // ---------------- Rutinas v2 (KAN-54) ----------------

    // Rutina vigente (VIGENTE o POR_VENCER) de un cliente, o null. La usará el portal del cliente.
    async vigenteDeCliente(idCliente: string): Promise<Rutina | null> {
      await api._delay();
      return (
        db
          .readTenant<Rutina>("rutinas")
          .find((r) => r.id_cliente === idCliente && (estadoDe(r) === "VIGENTE" || estadoDe(r) === "POR_VENCER")) ?? null
      );
    },

    // Historial de rutinas de un cliente, de la más reciente a la más antigua
    async deCliente(idCliente: string): Promise<Rutina[]> {
      await api._delay();
      return db
        .readTenant<Rutina>("rutinas")
        .filter((r) => r.id_cliente === idCliente)
        .sort((a, b) => b.fecha_creacion.localeCompare(a.fecha_creacion) || b.id_rutina - a.id_rutina);
    },

    // Estado calculado (no se guarda). Es síncrono porque no lee datos: solo mira las fechas.
    estado(r: Rutina): EstadoRutina {
      return estadoDe(r);
    },

    // Ejercicios agrupados por sesión, en el orden de la división y luego por "orden"
    async sesiones(id: number): Promise<{ sesion: LetraSesion; ejercicios: RutinaEjercicio[] }[]> {
      await api._delay();
      const r = db.readTenant<Rutina>("rutinas").find((x) => x.id_rutina === id);
      if (!r) return [];
      const todos = db.readTenant<RutinaEjercicio>("rutina_ejercicios").filter((e) => e.id_rutina === id);
      return (r.division ?? []).map((sesion) => ({
        sesion,
        ejercicios: todos.filter((e) => e.sesion === sesion).sort((a, b) => a.orden - b.orden),
      }));
    },

    // Reemplaza TODOS los ejercicios de la rutina (lo que manda el constructor). Cada sesión necesita 1 o más.
    async guardarSesiones(id: number, lista: SesionEjercicioNuevo[]): Promise<ApiResp<RutinaEjercicio[]>> {
      await api._delay();
      const r = db.readTenant<Rutina>("rutinas").find((x) => x.id_rutina === id);
      if (!r) return { ok: false, mensaje: "Rutina no encontrada" };
      if (!r.division || r.division.length === 0) return { ok: false, mensaje: "La rutina no tiene división de sesiones" };
      const error = validarEjerciciosSesion(r.division, lista, true);
      if (error) return { ok: false, mensaje: error };
      const gym = gimnasioParaEscribir();
      const filas: RutinaEjercicio[] = numerarPorSesion(lista).map((e) => ({ ...e, gimnasio_id: gym, id_rutina: id }));
      const otros = db.readTenant<RutinaEjercicio>("rutina_ejercicios").filter((e) => e.id_rutina !== id);
      db.writeTenant("rutina_ejercicios", otros.concat(filas));
      return { ok: true, mensaje: "Sesiones guardadas", data: filas };
    },

    // Sesiones registradas de la rutina, de la más reciente a la más antigua
    async registros(id: number): Promise<RegistroEntrenamiento[]> {
      await api._delay();
      return db
        .readTenant<RegistroEntrenamiento>("registros_entrenamiento")
        .filter((x) => x.id_rutina === id)
        .sort((a, b) => b.fecha.localeCompare(a.fecha) || b.id_registro - a.id_registro);
    },

    // Guarda una sesión completada. Solo en rutinas vigentes y con una sesión de su división.
    async registrarSesion(id: number, data: RegistroNuevo): Promise<ApiResp<RegistroEntrenamiento>> {
      await api._delay();
      const r = db.readTenant<Rutina>("rutinas").find((x) => x.id_rutina === id);
      if (!r) return { ok: false, mensaje: "Rutina no encontrada" };
      const estado = estadoDe(r);
      if (estado !== "VIGENTE" && estado !== "POR_VENCER")
        return { ok: false, mensaje: "La rutina está " + estado + ": ya no se le registran sesiones" };
      if (!(r.division ?? []).includes(data.sesion))
        return { ok: false, mensaje: "La sesión " + data.sesion + " no existe en esta rutina" };
      if (!/^\d{4}-\d{2}-\d{2}$/.test(data.fecha)) return { ok: false, mensaje: "La fecha no es válida" };
      if (data.fecha > utils.isoDate()) return { ok: false, mensaje: "No se puede registrar una sesión en el futuro" };
      if (data.fecha < r.fecha_creacion) return { ok: false, mensaje: "La fecha es anterior al inicio de la rutina" };
      const catalogo = leerCatalogo();
      const ajeno = (data.ejercicios_realizados ?? []).find((e) => !catalogo.some((c) => c.id_ejercicio === e.id_ejercicio));
      if (ajeno) return { ok: false, mensaje: "El ejercicio " + ajeno.id_ejercicio + " no existe en el catálogo" };
      const arr = db.readTenant<RegistroEntrenamiento>("registros_entrenamiento");
      const nuevo: RegistroEntrenamiento = {
        gimnasio_id: gimnasioParaEscribir(),
        id_registro: db.siguienteId<RegistroEntrenamiento>("registros_entrenamiento", (x) => x.id_registro),
        id_rutina: id,
        id_cliente: r.id_cliente,
        sesion: data.sesion,
        fecha: data.fecha,
        registrado_por: cedulaEnSesion(),
        notas: data.notas.trim(),
        ejercicios_realizados: data.ejercicios_realizados,
      };
      arr.push(nuevo);
      db.writeTenant("registros_entrenamiento", arr);
      return { ok: true, mensaje: "Sesión " + data.sesion + " registrada", data: nuevo };
    },

    // Siguiente sesión sugerida por rotación (null si la rutina no tiene división)
    async siguienteSesion(id: number): Promise<LetraSesion | null> {
      await api._delay();
      const r = db.readTenant<Rutina>("rutinas").find((x) => x.id_rutina === id);
      if (!r) return null;
      return siguienteDe(r, db.readTenant<RegistroEntrenamiento>("registros_entrenamiento"));
    },

    // Avance "12 de 19"
    async avance(id: number): Promise<AvanceRutina> {
      await api._delay();
      const r = db.readTenant<Rutina>("rutinas").find((x) => x.id_rutina === id);
      if (!r) return { completadas: 0, planeadas: 0, porcentaje: 0 };
      return avanceDe(r, db.readTenant<RegistroEntrenamiento>("registros_entrenamiento"));
    },

    // Copia la rutina (plan y ejercicios) para otro cliente, con la misma duración desde hoy
    async duplicar(id: number, idClienteDestino: string): Promise<ApiResp<Rutina>> {
      await api._delay();
      const r = db.readTenant<Rutina>("rutinas").find((x) => x.id_rutina === id);
      if (!r) return { ok: false, mensaje: "Rutina no encontrada" };
      const duracion = r.fecha_fin === null ? null : Math.max(1, -diasHasta(r.fecha_creacion) + diasHasta(r.fecha_fin));
      const nueva: RutinaNueva = {
        id_instructor: r.id_instructor,
        id_cliente: idClienteDestino,
        nombre: r.nombre,
        descripcion: r.descripcion,
        objetivo: r.objetivo,
        fecha_fin: duracion === null ? null : sumarDias(utils.isoDate(), duracion),
        sesiones_planeadas: r.sesiones_planeadas,
        division: r.division,
      };
      const res = await api.rutinas.create(nueva);
      if (!res.ok || !res.data) return res;
      const copia = res.data;
      // Los ejercicios se copian "limpios": sin marcas de cambios del cliente anterior
      const gym = gimnasioParaEscribir();
      const todos = db.readTenant<RutinaEjercicio>("rutina_ejercicios");
      const copiados: RutinaEjercicio[] = todos
        .filter((e) => e.id_rutina === id)
        .map((e) => ({
          ...e,
          gimnasio_id: gym,
          id_rutina: copia.id_rutina,
          agregado_por_cliente: false,
          revisado_por_instructor: true,
        }));
      db.writeTenant("rutina_ejercicios", todos.concat(copiados));
      return { ok: true, mensaje: "Rutina duplicada para el cliente", data: copia };
    },

    // El cliente cambia o agrega un ejercicio de su rutina vigente. Queda pendiente de revisión del instructor.
    // Con idEjercicioAnterior REEMPLAZA ese ejercicio en la misma sesión (conserva su orden); sin él lo AGREGA al final.
    async cambioCliente(
      id: number,
      ejercicio: SesionEjercicioNuevo,
      idEjercicioAnterior?: number
    ): Promise<ApiResp<RutinaEjercicio>> {
      await api._delay();
      const r = db.readTenant<Rutina>("rutinas").find((x) => x.id_rutina === id);
      if (!r) return { ok: false, mensaje: "Rutina no encontrada" };
      const estado = estadoDe(r);
      if (estado !== "VIGENTE" && estado !== "POR_VENCER")
        return { ok: false, mensaje: "Solo se puede cambiar una rutina vigente" };
      const error = validarEjerciciosSesion(r.division ?? [], [ejercicio], false);
      if (error) return { ok: false, mensaje: error };
      const todos = db.readTenant<RutinaEjercicio>("rutina_ejercicios");
      const deLaSesion = todos.filter((e) => e.id_rutina === id && e.sesion === ejercicio.sesion);
      const yaEsta = deLaSesion.some((e) => e.id_ejercicio === ejercicio.id_ejercicio && e.id_ejercicio !== idEjercicioAnterior);
      if (yaEsta) return { ok: false, mensaje: "Ese ejercicio ya está en la sesión " + ejercicio.sesion };
      const gym = gimnasioParaEscribir();
      const marcas = { agregado_por_cliente: true, revisado_por_instructor: false };
      if (idEjercicioAnterior !== undefined) {
        const anterior = deLaSesion.find((e) => e.id_ejercicio === idEjercicioAnterior);
        if (!anterior) return { ok: false, mensaje: "El ejercicio a reemplazar no está en la sesión " + ejercicio.sesion };
        Object.assign(anterior, ejercicio, marcas, { gimnasio_id: gym, id_rutina: id, orden: anterior.orden });
        db.writeTenant("rutina_ejercicios", todos);
        return { ok: true, mensaje: "Ejercicio reemplazado; tu instructor lo revisará", data: anterior };
      }
      const orden = deLaSesion.reduce((max, e) => Math.max(max, e.orden), 0) + 1;
      const nuevo: RutinaEjercicio = { ...ejercicio, ...marcas, gimnasio_id: gym, id_rutina: id, orden };
      todos.push(nuevo);
      db.writeTenant("rutina_ejercicios", todos);
      return { ok: true, mensaje: "Ejercicio agregado; tu instructor lo revisará", data: nuevo };
    },

    // El instructor revisa un ejercicio que cambió el cliente
    async marcarRevisado(id: number, sesion: LetraSesion, idEjercicio: number): Promise<ApiResp<RutinaEjercicio>> {
      await api._delay();
      const todos = db.readTenant<RutinaEjercicio>("rutina_ejercicios");
      const e = todos.find((x) => x.id_rutina === id && x.sesion === sesion && x.id_ejercicio === idEjercicio);
      if (!e) return { ok: false, mensaje: "Ejercicio no encontrado en la rutina" };
      e.revisado_por_instructor = true;
      db.writeTenant("rutina_ejercicios", todos);
      return { ok: true, mensaje: "Ejercicio marcado como revisado", data: e };
    },

    // Todas las rutinas del gimnasio con su estado, avance, siguiente sesión y cambios del cliente
    // sin revisar, en UNA sola lectura (la tabla de supervisión no tiene que pedir rutina por rutina)
    async listaSupervision(): Promise<FilaSupervision[]> {
      await api._delay();
      const registros = db.readTenant<RegistroEntrenamiento>("registros_entrenamiento");
      const filas = db.readTenant<RutinaEjercicio>("rutina_ejercicios");
      return db.readTenant<Rutina>("rutinas").map((r) => ({
        rutina: r,
        estado: estadoDe(r),
        avance: avanceDe(r, registros),
        siguiente: siguienteDe(r, registros),
        cambios_sin_revisar: filas.filter(
          (f) => f.id_rutina === r.id_rutina && f.agregado_por_cliente === true && f.revisado_por_instructor === false
        ).length,
      }));
    },

    // Indicadores de la supervisión del admin (los 4 grupos son disjuntos) + carga por instructor
    async resumenSupervision(): Promise<ResumenSupervision> {
      await api._delay();
      const rutinas = db.readTenant<Rutina>("rutinas");
      const clientesActivos = db.readTenant<Cliente>("clientes").filter((c) => c.estado === "ACTIVO");
      const estados = new Map(rutinas.map((r) => [r.id_rutina, estadoDe(r)] as const));
      const vigente = (r: Rutina) => estados.get(r.id_rutina) === "VIGENTE" || estados.get(r.id_rutina) === "POR_VENCER";

      const vencidas_sin_renovar: number[] = [];
      const sin_rutina: string[] = [];
      for (const c of clientesActivos) {
        const suyas = rutinas
          .filter((r) => r.id_cliente === c.numero_identificacion)
          .sort((a, b) => b.fecha_creacion.localeCompare(a.fecha_creacion) || b.id_rutina - a.id_rutina);
        if (suyas.some(vigente)) continue;
        const ultima = suyas[0];
        if (ultima && estados.get(ultima.id_rutina) === "VENCIDA") vencidas_sin_renovar.push(ultima.id_rutina);
        else sin_rutina.push(c.numero_identificacion);
      }

      const carga = db
        .readTenant<Instructor>("instructores")
        .filter((i) => i.estado === "ACTIVO")
        .map((i) => ({
          id_instructor: i.numero_identificacion,
          nombre: i.nombre + " " + i.apellidos,
          vigentes: rutinas.filter((r) => r.id_instructor === i.numero_identificacion && vigente(r)).length,
        }))
        .sort((a, b) => b.vigentes - a.vigentes || a.nombre.localeCompare(b.nombre));

      return {
        vigentes: rutinas.filter((r) => estados.get(r.id_rutina) === "VIGENTE").length,
        por_vencer: rutinas.filter((r) => estados.get(r.id_rutina) === "POR_VENCER").length,
        vencidas_sin_renovar,
        sin_rutina,
        carga,
      };
    },
  },
  // ===== [/P3] Rutinas =====

  // ===== [P2] Progreso =====
  progreso: {
    async list(): Promise<Progreso[]> {
      await api._delay();
      return db.readTenant<Progreso>("progreso");
    },
    async byCliente(id: string): Promise<Progreso[]> {
      await api._delay();
      return db.readTenant<Progreso>("progreso").filter((p) => p.id_cliente === id);
    },
    async remove(id: number): Promise<ApiResp<void>> {
      await api._delay();
      const arr = db.readTenant<Progreso>("progreso");
      const idx = arr.findIndex((p) => p.id_progreso === id);
      if (idx === -1) return { ok: false, mensaje: "Medición no encontrada" };
      arr.splice(idx, 1);
      db.writeTenant("progreso", arr);
      return { ok: true, mensaje: "Medición eliminada" };
    },
    async create(data: ProgresoNuevo): Promise<ApiResp<Progreso>> {
      await api._delay();
      const arr = db.readTenant<Progreso>("progreso");
      const nuevoId = db.siguienteId<Progreso>("progreso", (p) => p.id_progreso);
      const nuevo: Progreso = { gimnasio_id: gimnasioParaEscribir(), id_progreso: nuevoId, ...data };
      arr.push(nuevo);
      db.writeTenant("progreso", arr);
      return { ok: true, mensaje: "Medición registrada", data: nuevo };
    },
  },
  // ===== [/P2] Progreso =====

  // ===== [P2] Citas =====
  citas: {
    /* Validaciones compartidas por create y update: el instructor debe existir
       y estar disponible (dia e intervalo) en la fecha/hora pedidas, y no debe
       tener otra cita (distinta de `excluirId`) en el mismo instante. Se
       replica la logica de lib/horarios.ts para que ninguna via del mock
       deje guardar una cita que choque o caiga fuera del horario. */
    _validar(
      data: Pick<CitaNueva, "id_cliente" | "id_instructor" | "fecha" | "hora">,
      excluirId?: number
    ): string | null {
      if (!data.id_cliente || !data.id_instructor || !data.fecha || !data.hora)
        return "Cliente, instructor, fecha y hora son obligatorios";
      const instructor = db
        .readTenant<Instructor>("instructores")
        .find((i) => i.numero_identificacion === data.id_instructor);
      if (!instructor) return "El instructor no existe";
      if (!db.readTenant<Cliente>("clientes").some((c) => c.numero_identificacion === data.id_cliente))
        return "El cliente no existe";
      if (!diaDisponible(instructor.horario, data.fecha))
        return `${instructor.nombre} ${instructor.apellidos} no atiende ese día de la semana`;
      if (!horaDisponible(instructor.horario, data.fecha, data.hora))
        return `${instructor.nombre} ${instructor.apellidos} no está disponible a las ${data.hora} ese día`;
      if (choque(db.readTenant<Cita>("citas"), data.id_instructor, data.fecha, data.hora, excluirId))
        return `${instructor.nombre} ${instructor.apellidos} ya tiene una cita a esa fecha y hora`;
      return null;
    },

    async list(): Promise<Cita[]> {
      await api._delay();
      return db.readTenant<Cita>("citas");
    },
    async byCliente(id: string): Promise<Cita[]> {
      await api._delay();
      return db.readTenant<Cita>("citas").filter((c) => c.id_cliente === id);
    },
    async create(data: CitaNueva): Promise<ApiResp<Cita>> {
      await api._delay();
      const error = api.citas._validar(data);
      if (error) return { ok: false, mensaje: error };
      const arr = db.readTenant<Cita>("citas");
      const nuevoId = db.siguienteId<Cita>("citas", (c) => c.id_cita);
      const nueva: Cita = { gimnasio_id: gimnasioParaEscribir(), id_cita: nuevoId, estado: "PENDIENTE", ...data };
      arr.push(nueva);
      db.writeTenant("citas", arr);
      return { ok: true, mensaje: "Cita registrada", data: nueva };
    },
    async update(id: number, data: Partial<CitaNueva>): Promise<ApiResp<Cita>> {
      await api._delay();
      const arr = db.readTenant<Cita>("citas");
      const cita = arr.find((c) => c.id_cita === id);
      if (!cita) return { ok: false, mensaje: "Cita no encontrada" };
      const final = { ...cita, ...data };
      const error = api.citas._validar(final, id);
      if (error) return { ok: false, mensaje: error };
      Object.assign(cita, data, { id_cita: id });
      db.writeTenant("citas", arr);
      return { ok: true, mensaje: "Cita actualizada", data: cita };
    },
    async setEstado(id: number, estado: Cita["estado"]): Promise<ApiResp<Cita>> {
      await api._delay();
      const arr = db.readTenant<Cita>("citas");
      const cita = arr.find((c) => c.id_cita === id);
      if (!cita) return { ok: false, mensaje: "Cita no encontrada" };
      cita.estado = estado;
      db.writeTenant("citas", arr);
      return { ok: true, mensaje: "Estado actualizado", data: cita };
    },
  },
  // ===== [/P2] Citas =====
};