import { utils } from "../lib/utils";
import type {
  Cliente,
  Membresia,
  Pago,
  Ingreso,
  Ejercicio,
  Usuario,
  ApiResp,
  PlanMembresia,
  HistorialMembresia,
} from "../types";

interface Seed {
  usuarios: Usuario[];
  clientes: Cliente[];
  planes: PlanMembresia[];
  membresias: Membresia[];
  historialMembresias: HistorialMembresia[];
  pagos: Pago[];
  ingresos: Ingreso[];
  ejercicios: Ejercicio[];
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
const serieAna    = pagosMensuales('1000000001', 1, 280000, ['TARJETA', 'NEQUI'],    20, 11);
const serieCarlos = pagosMensuales('1000000002', 2, 120000, ['EFECTIVO', 'NEQUI'],    8, 11, true);
const serieJuan   = pagosMensuales('1000000003', 3, 180000, ['TARJETA', 'EFECTIVO'], 12, 11, true);
const serieAndres = pagosMensuales('1000000007', 5, 180000, ['NEQUI', 'TARJETA'],    18, 11);

// El pago anual de Diego cierra la serie de ingresos del mes 11.
const pagoAnualDiego = pago(
  '1000000005', 4, 0, 2800000, 'TRANSFERENCIA', 'EXITOSO', 'TR-2290',
  'Pago anual anticipado', diaDeMes(11, 6),
);

// Pagos sin aplicar: son los unicos estados distintos de EXITOSO, y son la
// razon de que la tabla "Pagos por aplicar" no salga vacia.
const pagosSinAplicar = [
  pago('1000000004', 6, 40, 180000, 'TRANSFERENCIA', 'PENDIENTE', 'TR-2299', 'Transferencia sin aplicar'),
  pago('1000000006', 7, 25, 120000, 'EFECTIVO',      'PENDIENTE', '',          'Cobro en efectivo sin membresia activa'),
];

function inicioDe(serie: Pago[]): string {
  return serie.reduce((menor, p) => (p.fecha_pago < menor ? p.fecha_pago : menor), serie[0].fecha_pago);
}

function finDe(serie: Pago[], diasExtra: number): string {
  const ultimo = serie.reduce((mayor, p) => (p.fecha_pago > mayor ? p.fecha_pago : mayor), serie[0].fecha_pago);
  return sumarDias(ultimo, diasExtra);
}

const SEED: Seed = {
  // Personal con acceso al panel. El legacy exige tipo_usuario
  // 'ADMINISTRADOR' para iniciar sesion (loginController.java:156), asi que
  // instructor y cliente quedan sembrados para probar ese rechazo, no para
  // entrar. Cuando haya roles reales, estos 3 pasan a ser los perfiles.
  //
  // Los 7 clientes tienen fila propia con su clave: es la que compara el modo
  // manual de control de acceso (RegistroEntradaController.handleValidarIngreso
  // -> AuthService.validarContrasena). Sin fila no hay clave y ese socio solo
  // podria entrar por huella. El estado espeja el del cliente, asi que
  // suspenderlo en Clientes lo suspende aqui tambien.
  usuarios: [
    { numero_identificacion:'1001000001', nombre:'admin', apellidos:'Administrador', correo:'admin@gymbrot.com', contrasena:'admin',      estado:'ACTIVO',     tipo_usuario:'ADMINISTRADOR', rol:'SUPERADMIN' },
    { numero_identificacion:'2001000001', nombre:'Diego', apellidos:'Morales',       correo:'diego.morales@gymbrot.com', contrasena:'instructor', estado:'ACTIVO',     tipo_usuario:'INSTRUCTOR',   rol:'INSTRUCTOR' },
    { numero_identificacion:'1000000001', nombre:'Ana María',    apellidos:'Ruiz',     correo:'ana.ruiz@mail.com',   contrasena:'ana123',    estado:'ACTIVO',     tipo_usuario:'CLIENTE',      rol:'CLIENTE' },
    { numero_identificacion:'1000000002', nombre:'Carlos Andrés', apellidos:'Pérez',    correo:'carlos.perez@mail.com', contrasena:'carlos123', estado:'ACTIVO',     tipo_usuario:'CLIENTE',      rol:'CLIENTE' },
    { numero_identificacion:'1000000003', nombre:'Juan David',    apellidos:'Gómez',    correo:'juan.gomez@mail.com',  contrasena:'juan123',   estado:'ACTIVO',     tipo_usuario:'CLIENTE',      rol:'CLIENTE' },
    { numero_identificacion:'1000000004', nombre:'Laura Sofía',   apellidos:'Martínez', correo:'laura.m@mail.com',     contrasena:'laura123',  estado:'SUSPENDIDO', tipo_usuario:'CLIENTE',      rol:'CLIENTE' },
    { numero_identificacion:'1000000005', nombre:'Diego Fernando',apellidos:'Ríos',     correo:'diego.rios@mail.com',  contrasena:'diego123',  estado:'ACTIVO',     tipo_usuario:'CLIENTE',      rol:'CLIENTE' },
    { numero_identificacion:'1000000006', nombre:'Valentina',     apellidos:'Torres',   correo:'valen.torres@mail.com',contrasena:'valen123',  estado:'INACTIVO',   tipo_usuario:'CLIENTE',      rol:'CLIENTE' },
    { numero_identificacion:'1000000007', nombre:'Andrés Felipe', apellidos:'Navarro',  correo:'andres.nav@mail.com',  contrasena:'andres123', estado:'ACTIVO',     tipo_usuario:'CLIENTE',      rol:'CLIENTE' },
  ],

  clientes: [ 
    { numero_identificacion:'1000000001', tipo_identificacion:'CC', nombre:'Ana María',    apellidos:'Ruiz',     telefono:'3001112233', correo:'ana.ruiz@mail.com',   direccion:'Cra 15 #23-40', fecha_nacimiento:'1995-03-12', estado:'ACTIVO',     fecha_registro:inicioDe(serieAna) },
    { numero_identificacion:'1000000002', tipo_identificacion:'CC', nombre:'Carlos Andrés', apellidos:'Pérez',    telefono:'3012223344', correo:'carlos.perez@mail.com',direccion:'Cl 20 #5-16',   fecha_nacimiento:'1988-11-02', estado:'ACTIVO',     fecha_registro:inicioDe(serieCarlos) },
    { numero_identificacion:'1000000003', tipo_identificacion:'TI', nombre:'Juan David',    apellidos:'Gómez',    telefono:'3023334455', correo:'juan.gomez@mail.com',  direccion:'Cra 9 #10-11',  fecha_nacimiento:'2009-06-25', estado:'ACTIVO',     fecha_registro:inicioDe(serieJuan) },
    { numero_identificacion:'1000000004', tipo_identificacion:'CC', nombre:'Laura Sofía',   apellidos:'Martínez', telefono:'3034445566', correo:'laura.m@mail.com',     direccion:'Cl 8 #1-90',    fecha_nacimiento:'1999-09-14', estado:'SUSPENDIDO', fecha_registro:dia(180) },
    { numero_identificacion:'1000000005', tipo_identificacion:'CE', nombre:'Diego Fernando',apellidos:'Ríos',     telefono:'3045556677', correo:'diego.rios@mail.com',  direccion:'Av 4 #12-30',   fecha_nacimiento:'1965-02-20', estado:'ACTIVO',     fecha_registro:pagoAnualDiego.fecha_pago },
    { numero_identificacion:'1000000006', tipo_identificacion:'CC', nombre:'Valentina',     apellidos:'Torres',   telefono:'3056667788', correo:'valen.torres@mail.com',direccion:'Cra 19 #4-5',   fecha_nacimiento:'2001-12-01', estado:'INACTIVO',   fecha_registro:dia(55) },
    { numero_identificacion:'1000000007', tipo_identificacion:'CC', nombre:'Andrés Felipe', apellidos:'Navarro',  telefono:'3067778899', correo:'andres.nav@mail.com',  direccion:'Cl 44 #7-2',    fecha_nacimiento:'1992-07-19', estado:'ACTIVO',     fecha_registro:inicioDe(serieAndres) }
   ],

  // Catalogo de planes. Los tres precios por modalidad son los que lee
  // PagoMembresiaController.java:148 al abrir el cobro.
  planes: [
    { id_plan:1, nombre:'Básico',   descripcion:'Acceso a sala de maquinas y area cardio',   precio_mensual:120000, precio_semestral:650000,  precio_anual:1200000, estado:'ACTIVO' },
    { id_plan:2, nombre:'Estándar', descripcion:'Básico mas clases grupales',                precio_mensual:180000, precio_semestral:980000,  precio_anual:1900000, estado:'ACTIVO' },
    { id_plan:3, nombre:'Premium',  descripcion:'Todo lo anterior mas sauna y entrenador',  precio_mensual:280000, precio_semestral:1520000, precio_anual:2800000, estado:'ACTIVO' },
  ],

  // Una membresia vigente por cada cliente ACTIVO (5 en total), mas dos
  // vencidas para que existan los casos de cobro pendiente.
  //
  // fecha_inicio es el PRIMER pago de la serie, no el ultimo: una membresia
  // mensual renovada no arranca de nuevo en cada renovacion. Y
  // fecha_vencimiento se calcula con la duracion que aplica el cobro real
  // (30 / 365 dias) a partir del ultimo pago, para que el dato nunca contradiga
  // al reloj.
  membresias: [
    { id_membresia:1, id_cliente:'1000000001', id_plan:3, tipo_membresia:'Premium',  modalidad_pago:'MENSUAL', valor:280000,  fecha_inicio:inicioDe(serieAna),    fecha_vencimiento:finDe(serieAna, 30),    estado:'ACTIVA' },
    { id_membresia:2, id_cliente:'1000000002', id_plan:1, tipo_membresia:'Básico',   modalidad_pago:'MENSUAL', valor:120000,  fecha_inicio:inicioDe(serieCarlos), fecha_vencimiento:finDe(serieCarlos, 30), estado:'ACTIVA' },
    { id_membresia:3, id_cliente:'1000000003', id_plan:2, tipo_membresia:'Estándar', modalidad_pago:'MENSUAL', valor:180000,  fecha_inicio:inicioDe(serieJuan),   fecha_vencimiento:finDe(serieJuan, 30),   estado:'ACTIVA' },
    { id_membresia:4, id_cliente:'1000000005', id_plan:3, tipo_membresia:'Premium',  modalidad_pago:'ANUAL',   valor:2800000, fecha_inicio:pagoAnualDiego.fecha_pago, fecha_vencimiento:sumarDias(pagoAnualDiego.fecha_pago, 365), estado:'ACTIVA' },
    { id_membresia:5, id_cliente:'1000000007', id_plan:2, tipo_membresia:'Estándar', modalidad_pago:'MENSUAL', valor:180000,  fecha_inicio:inicioDe(serieAndres), fecha_vencimiento:finDe(serieAndres, 30), estado:'ACTIVA' },
    // Membresias ya vencidas: son las que dejan pagos sin aplicar y las que
    // el control de acceso debe rechazar.
    { id_membresia:6, id_cliente:'1000000004', id_plan:2, tipo_membresia:'Estándar', modalidad_pago:'MENSUAL', valor:180000,  fecha_inicio:dia(70),  fecha_vencimiento:dia(40),  estado:'VENCIDA' },
    { id_membresia:7, id_cliente:'1000000006', id_plan:1, tipo_membresia:'Básico',   modalidad_pago:'MENSUAL', valor:120000,  fecha_inicio:dia(55),  fecha_vencimiento:dia(25),  estado:'VENCIDA' },
  ],

  // Marca que membresia esta vigente. El control de acceso consulta esta tabla
  // (RegistroEntradaController.java:319), asi que activa=true debe coincidir
  // siempre con una membresia ACTIVA y no vencida: antes tres filas marcaban
  // activa=true sobre membresias vencidas y el acceso las dejaba pasar.
  historialMembresias: [
    { id_historial:1, id_cliente:'1000000001', id_membresia:1, fecha_asignacion:inicioDe(serieAna),    activa:true  },
    { id_historial:2, id_cliente:'1000000002', id_membresia:2, fecha_asignacion:inicioDe(serieCarlos), activa:true  },
    { id_historial:3, id_cliente:'1000000003', id_membresia:3, fecha_asignacion:inicioDe(serieJuan),   activa:true  },
    { id_historial:4, id_cliente:'1000000005', id_membresia:4, fecha_asignacion:pagoAnualDiego.fecha_pago, activa:true },
    { id_historial:5, id_cliente:'1000000007', id_membresia:5, fecha_asignacion:inicioDe(serieAndres), activa:true  },
    { id_historial:6, id_cliente:'1000000004', id_membresia:6, fecha_asignacion:dia(70),  activa:false },
    { id_historial:7, id_cliente:'1000000006', id_membresia:7, fecha_asignacion:dia(55),  activa:false },
  ],
  
  pagos: serieAna
    .concat(serieCarlos)
    .concat(serieJuan)
    .concat(serieAndres)
    .concat([pagoAnualDiego])
    .concat(pagosSinAplicar),

  ingresos: ingresosPasados().concat(ingresosDeHoy()),
  ejercicios: [],   // la colección de P4 arranca vacía
};

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
const SEED_VERSION = "6";
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
  },
};

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

export const api = {
  _delay(ms = 200) {
    return new Promise<void>((res) => setTimeout(res, ms));
  },

  usuarios: {
    // El legacy busca por nombre o correo en el mismo campo
    // (UsuarioDAO.buscarPorNombreOCorreo, loginController.java:153), asi que
    // 'admin' y 'admin@gymbrot.com' resuelven al mismo usuario.
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

    // El modo manual de control de acceso busca por el numero de documento,
    // no por nombre ni correo: es lo que escribe el socio en la puerta
    // (RegistroEntradaController.handleValidarIngreso, ClienteDAO.buscarPorId).
    async byIdentificacion(id: string): Promise<Usuario | null> {
      await api._delay();
      const clave = id.trim();
      if (!clave) return null;
      return db.read<Usuario>("usuarios").find((u) => u.numero_identificacion === clave) ?? null;
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

  clientes: {
    async list(): Promise<Cliente[]> {
      await api._delay();
      return db.read<Cliente>("clientes");
    },

    async get(id: string): Promise<Cliente | null> {
      await api._delay();
      return db.read<Cliente>("clientes").find((c) => c.numero_identificacion === id) ?? null;
    },

    async create(data: Omit<Cliente, "estado" | "fecha_registro">): Promise<ApiResp<Cliente>> {
      await api._delay();
      const arr = db.read<Cliente>("clientes");
      if (arr.some((c) => c.numero_identificacion === data.numero_identificacion))
        return { ok: false, mensaje: "Ya existe un cliente con esa identificación" };
      const nuevo: Cliente = { ...data, estado: "ACTIVO", fecha_registro: utils.isoDate() };
      arr.push(nuevo);
      db.write("clientes", arr);
      return { ok: true, mensaje: "Cliente registrado", data: nuevo };
    },

    async update(id: string, data: Partial<Cliente>): Promise<ApiResp<Cliente>> {
      await api._delay();
      const arr = db.read<Cliente>("clientes");
      const c = arr.find((x) => x.numero_identificacion === id);
      if (!c) return { ok: false, mensaje: "Cliente no encontrado" };
      Object.assign(c, data);
      db.write("clientes", arr);
      return { ok: true, mensaje: "Cliente actualizado", data: c };
    },

    async setEstado(id: string, estado: Cliente["estado"]): Promise<ApiResp<Cliente>> {
      await api._delay();
      const arr = db.read<Cliente>("clientes");
      const c = arr.find((x) => x.numero_identificacion === id);
      if (!c) return { ok: false, mensaje: "Cliente no encontrado" };
      c.estado = estado;
      db.write("clientes", arr);
      return { ok: true, mensaje: "Estado actualizado", data: c };
    },
  },

  planes: {
    async list(): Promise<PlanMembresia[]> {
      await api._delay();
      return db.read<PlanMembresia>("planes").filter((p) => p.estado === "ACTIVO");
    },
  },

  membresias: {
    async list(): Promise<Membresia[]> {
      await api._delay();
      return db.read<Membresia>("membresias");
    },
    async byCliente(id: string): Promise<Membresia[]> {
      await api._delay();
      return db.read<Membresia>("membresias").filter((m) => m.id_cliente === id);
    },
  },

  pagos: {
    async  list(): Promise<Pago[]> {
      await api._delay();
      return db.read<Pago>("pagos");
    },
    async byCliente(id: string): Promise<Pago[]> {
      await api._delay();
      return db.read<Pago>("pagos").filter((p) => p.id_cliente === id);
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

      const clientes = db.read<Cliente>("clientes");
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
      const referencia = input.referencia_transaccion.trim().toUpperCase();
      const pagos = db.read<Pago>("pagos");

      if (referencia && pagos.some((p) => p.referencia_transaccion.toUpperCase() === referencia))
        return { ok: false, mensaje: "Esa referencia ya tiene un pago registrado" };

      const hoy = utils.isoDate();
      const membresias = db.read<Membresia>("membresias");
      const historial = db.read<HistorialMembresia>("historialMembresias");

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
          id_membresia: membresias.reduce((max, m) => Math.max(max, m.id_membresia), 0) + 1,
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
          id_historial: historial.reduce((max, h) => Math.max(max, h.id_historial), 0) + 1,
          id_cliente: idCliente,
          id_membresia: membresia.id_membresia,
          fecha_asignacion: hoy,
          activa: true,
        });

        const pago: Pago = {
          id_pago: pagos.reduce((max, p) => Math.max(max, p.id_pago), 0) + 1,
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

        db.write("membresias", membresias);
        db.write("historialMembresias", historial);
        db.write("pagos", pagos);

        return { ok: true, mensaje: "Pago registrado y membresia activada", data: pago };
      } catch (e) {
        // Atraso de las tres escrituras: sin esto, un fallo a medias deja
        // una membresia activa sin pago registrado.
        db.write("membresias", membresiasPrevias);
        db.write("historialMembresias", historialPrevio);
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
      const pagos = db.read<Pago>("pagos").filter((p) => p.estado_pago === "EXITOSO");
      return agruparPorMes(pagos, (p) => p.fecha_pago, (p) => p.valor, cantidadMeses);
    },

    async ingresosPorPlan(): Promise<{ plan: string; total: number }[]> {
      await api._delay();
      const membresias = db.read<Membresia>("membresias");
      const porId = new Map(membresias.map((m) => [m.id_membresia, m.tipo_membresia]));
      const totales = new Map<string, number>();

      for (const p of db.read<Pago>("pagos")) {
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

      for (const p of db.read<Pago>("pagos")) {
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
        db.read<Cliente>("clientes"),
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
      const membresias = db.read<Membresia>("membresias");
      const porId = new Map(membresias.map((m) => [m.id_membresia, m]));
      const clientes = new Map(db.read<Cliente>("clientes").map((c) => [c.numero_identificacion, c]));
      const hoy = utils.isoDate();

      return db
        .read<Pago>("pagos")
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

  ingresos: {
    async list(): Promise<Ingreso[]> {
      await api._delay();
      return db.read<Ingreso>("ingresos");
    },
    async byCliente(id: string): Promise<Ingreso[]> {
      await api._delay();
      return db.read<Ingreso>("ingresos").filter((i) => i.id_cliente === id);
    }
  }
};