import { utils } from "../lib/utils";
import type { Cliente, Membresia, Pago, Ingreso, Ejercicio, ApiResp } from "../types";
import type { Instructor, InstructorNuevo, EstadoInstructor } from "../types"; // [P3]
import type { Rutina, RutinaNueva, RutinaEjercicio, DiaSemana } from "../types"; // [P3]

interface Seed {
  clientes: Cliente[];
  membresias: Membresia[];
  pagos: Pago[];
  ingresos: Ingreso[];
  ejercicios: Ejercicio[];
  instructores: Instructor[]; // [P3]
  rutinas: Rutina[]; // [P3]
  rutina_ejercicios: RutinaEjercicio[]; // [P3]
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
        metodo_verificacion: i % 2 === 0 ? "QR" : "MANUAL",
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
      metodo_verificacion: i % 2 === 0 ? "QR" : "MANUAL",
    };
  });
}

const SEED: Seed = {
  clientes: [ 
    { numero_identificacion:'1000000001', tipo_identificacion:'CC', nombre:'Ana María',    apellidos:'Ruiz',     telefono:'3001112233', correo:'ana.ruiz@mail.com',   direccion:'Cra 15 #23-40', fecha_nacimiento:'1995-03-12', estado:'ACTIVO',     fecha_registro:'2026-01-10' },
    { numero_identificacion:'1000000002', tipo_identificacion:'CC', nombre:'Carlos Andrés', apellidos:'Pérez',    telefono:'3012223344', correo:'carlos.perez@mail.com',direccion:'Cl 20 #5-16',   fecha_nacimiento:'1988-11-02', estado:'ACTIVO',     fecha_registro:'2026-01-18' },
    { numero_identificacion:'1000000003', tipo_identificacion:'TI', nombre:'Juan David',    apellidos:'Gómez',    telefono:'3023334455', correo:'juan.gomez@mail.com',  direccion:'Cra 9 #10-11',  fecha_nacimiento:'2009-06-25', estado:'ACTIVO',     fecha_registro:'2026-02-01' },
    { numero_identificacion:'1000000004', tipo_identificacion:'CC', nombre:'Laura Sofía',   apellidos:'Martínez', telefono:'3034445566', correo:'laura.m@mail.com',     direccion:'Cl 8 #1-90',    fecha_nacimiento:'1999-09-14', estado:'SUSPENDIDO', fecha_registro:'2026-02-10' },
    { numero_identificacion:'1000000005', tipo_identificacion:'CE', nombre:'Diego Fernando',apellidos:'Ríos',     telefono:'3045556677', correo:'diego.rios@mail.com',  direccion:'Av 4 #12-30',   fecha_nacimiento:'1965-02-20', estado:'ACTIVO',     fecha_registro:'2026-02-15' },
    { numero_identificacion:'1000000006', tipo_identificacion:'CC', nombre:'Valentina',     apellidos:'Torres',   telefono:'3056667788', correo:'valen.torres@mail.com',direccion:'Cra 19 #4-5',   fecha_nacimiento:'2001-12-01', estado:'INACTIVO',   fecha_registro:'2026-03-01' },
    { numero_identificacion:'1000000007', tipo_identificacion:'CC', nombre:'Andrés Felipe', apellidos:'Navarro',  telefono:'3067778899', correo:'andres.nav@mail.com',  direccion:'Cl 44 #7-2',    fecha_nacimiento:'1992-07-19', estado:'ACTIVO',     fecha_registro:'2026-03-05' }
   ],

  membresias: [{ id_membresia:1, id_cliente:'1000000001', tipo_membresia:'Premium',  modalidad_pago:'MENSUAL', valor:280000,  fecha_inicio:'2026-08-15', fecha_vencimiento:'2026-09-15', estado:'ACTIVA' },
    { id_membresia:2, id_cliente:'1000000001', tipo_membresia:'Estándar', modalidad_pago:'MENSUAL', valor:180000,  fecha_inicio:'2026-07-15', fecha_vencimiento:'2026-08-15', estado:'VENCIDA' },
    { id_membresia:3, id_cliente:'1000000002', tipo_membresia:'Básico',   modalidad_pago:'MENSUAL', valor:120000,  fecha_inicio:'2026-09-01', fecha_vencimiento:'2026-10-01', estado:'ACTIVA' },
    { id_membresia:4, id_cliente:'1000000005', tipo_membresia:'Premium',  modalidad_pago:'ANUAL',   valor:2800000, fecha_inicio:'2026-02-15', fecha_vencimiento:'2027-02-15', estado:'ACTIVA' }
  ],
  
  pagos: [{ id_pago:1, id_cliente:'1000000001', id_membresia:1, fecha_pago:'2026-08-15', valor:280000,  metodo_pago:'TARJETA',       estado_pago:'EXITOSO' },
    { id_pago:2, id_cliente:'1000000001', id_membresia:2, fecha_pago:'2026-07-15', valor:180000,  metodo_pago:'NEQUI',         estado_pago:'EXITOSO' },
    { id_pago:3, id_cliente:'1000000002', id_membresia:3, fecha_pago:'2026-09-01', valor:120000,  metodo_pago:'EFECTIVO',      estado_pago:'EXITOSO' },
    { id_pago:4, id_cliente:'1000000005', id_membresia:4, fecha_pago:'2026-02-15', valor:2800000, metodo_pago:'TRANSFERENCIA', estado_pago:'EXITOSO' },
    { id_pago:5, id_cliente:'1000000007', id_membresia:3, fecha_pago:'2026-09-05', valor:180000,  metodo_pago:'NEQUI',         estado_pago:'EXITOSO' },
    { id_pago:6, id_cliente:'1000000003', id_membresia:1, fecha_pago:'2026-09-12', valor:120000,  metodo_pago:'EFECTIVO',      estado_pago:'EXITOSO' },
    // Pagos del mes en curso (fechas relativas) -> KPI "Ingresos este mes"
    { id_pago:7,  id_cliente:'1000000001', id_membresia:1, fecha_pago:dia(0), valor:280000,  metodo_pago:'TARJETA',       estado_pago:'EXITOSO' },
    { id_pago:8,  id_cliente:'1000000002', id_membresia:3, fecha_pago:dia(0), valor:120000,  metodo_pago:'EFECTIVO',      estado_pago:'EXITOSO' },
    { id_pago:9,  id_cliente:'1000000007', id_membresia:3, fecha_pago:dia(1), valor:180000,  metodo_pago:'NEQUI',         estado_pago:'EXITOSO' },
    { id_pago:10, id_cliente:'1000000004', id_membresia:3, fecha_pago:dia(1), valor:180000,  metodo_pago:'TRANSFERENCIA', estado_pago:'EXITOSO' },
  ],

  ingresos: ingresosPasados().concat(ingresosDeHoy()),
  ejercicios: [],   // la colección de P4 arranca vacía

  // ===== [P3] Instructores =====
  instructores: [
    { numero_identificacion:'2000000001', tipo_identificacion:'CC', nombre:'Camilo',  apellidos:'Herrera Díaz', telefono:'3101234567', correo:'camilo.herrera@gymbrot.com', especialidad:'Entrenador personal', disponibilidad:'Lun-Vie 6:00-14:00',  fecha_contratacion:'2025-02-03', estado:'ACTIVO' },
    { numero_identificacion:'2000000002', tipo_identificacion:'CC', nombre:'Natalia', apellidos:'Vargas Rojas', telefono:'3112345678', correo:'natalia.vargas@gymbrot.com', especialidad:'Yoga/Pilates',        disponibilidad:'Lun-Mié-Vie 16:00-21:00', fecha_contratacion:'2025-08-18', estado:'ACTIVO' },
    { numero_identificacion:'2000000003', tipo_identificacion:'CE', nombre:'Mateo',   apellidos:'Silva Castro', telefono:'3123456789', correo:'mateo.silva@gymbrot.com',    especialidad:'Nutrición',           disponibilidad:'Mar-Jue 8:00-12:00',  fecha_contratacion:'2026-01-12', estado:'INACTIVO' },
  ],
  // ===== [/P3] Instructores =====

  // ===== [P3] Rutinas =====
  // Instructores y clientes existen en este SEED. Sin ejercicios a propósito:
  // api.ejercicios (P4) todavía no existe y no queremos referencias falsas.
  rutinas: [
    { id_rutina:1, id_instructor:'2000000001', id_cliente:'1000000001', nombre:'Fuerza tren superior', descripcion:'Fuerza para pecho, espalda y brazos.',     fecha_creacion:'2026-09-01', fecha_fin:'2026-12-01', dias_semana:['LUNES','MIERCOLES','VIERNES'], objetivo:'Ganancia muscular' },
    { id_rutina:2, id_instructor:'2000000001', id_cliente:'1000000002', nombre:'Quema de grasa',       descripcion:'Circuitos de cardio y funcional.',         fecha_creacion:'2026-09-15', fecha_fin:'2026-11-15', dias_semana:['MARTES','JUEVES','SABADO'],    objetivo:'Pérdida de peso' },
    { id_rutina:3, id_instructor:'2000000002', id_cliente:'1000000005', nombre:'Movilidad y espalda',  descripcion:'Estiramientos y fortalecimiento de core.', fecha_creacion:'2026-09-20', fecha_fin:null,         dias_semana:['LUNES','JUEVES'],              objetivo:'Rehabilitación' },
  ],
  rutina_ejercicios: [],
  // ===== [/P3] Rutinas =====
};

// Version del seed guardado en localStorage.
//
// Sin esto, cambiar el SEED no se refleja nunca en un navegador que ya
// tenga datos: read() solo siembra cuando la clave no existe, asi que un
// seed nuevo convive con el viejo indefinidamente. Al cambiar este numero
// la siguiente carga regenera todas las colecciones.
const SEED_VERSION = "2";
const CLAVE_VERSION = "gymbrot_seed_version";

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

// ===== [P3] Rutinas: auxiliares =====
const DIAS: DiaSemana[] = ["LUNES", "MARTES", "MIERCOLES", "JUEVES", "VIERNES", "SABADO", "DOMINGO"];

// Mensaje de error si el instructor o el cliente no existen; null si ambos existen
function validarReferencias(idInstructor: string, idCliente: string): string | null {
  if (!db.read<Instructor>("instructores").some((i) => i.numero_identificacion === idInstructor))
    return "El instructor no existe";
  if (!db.read<Cliente>("clientes").some((c) => c.numero_identificacion === idCliente))
    return "El cliente no existe";
  return null;
}
// ===== [/P3] Rutinas: auxiliares =====

export const api = {
  _delay(ms = 200) {
    return new Promise<void>((res) => setTimeout(res, ms));
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
    }
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
  },

  // ===== [P3] Instructores =====
  instructores: {
    async list(): Promise<Instructor[]> {
      await api._delay();
      return db.read<Instructor>("instructores");
    },

    async get(id: string): Promise<Instructor | null> {
      await api._delay();
      return db.read<Instructor>("instructores").find((i) => i.numero_identificacion === id) ?? null;
    },

    async create(data: InstructorNuevo): Promise<ApiResp<Instructor>> {
      await api._delay();
      const arr = db.read<Instructor>("instructores");
      if (arr.some((i) => i.numero_identificacion === data.numero_identificacion))
        return { ok: false, mensaje: "Ya existe un instructor con esa identificación" };
      const nuevo: Instructor = { ...data, estado: "ACTIVO", fecha_contratacion: utils.isoDate() };
      arr.push(nuevo);
      db.write("instructores", arr);
      return { ok: true, mensaje: "Instructor registrado", data: nuevo };
    },

    // La identificación es la llave: no se deja cambiar al editar
    async update(id: string, data: Partial<Omit<Instructor, "numero_identificacion">>): Promise<ApiResp<Instructor>> {
      await api._delay();
      const arr = db.read<Instructor>("instructores");
      const ins = arr.find((i) => i.numero_identificacion === id);
      if (!ins) return { ok: false, mensaje: "Instructor no encontrado" };
      Object.assign(ins, data, { numero_identificacion: id });
      db.write("instructores", arr);
      return { ok: true, mensaje: "Instructor actualizado", data: ins };
    },

    async remove(id: string): Promise<ApiResp<Instructor>> {
      await api._delay();
      const arr = db.read<Instructor>("instructores");
      const ins = arr.find((i) => i.numero_identificacion === id);
      if (!ins) return { ok: false, mensaje: "Instructor no encontrado" };
      // Como un FK con RESTRICT: no se borra si tiene rutinas que lo referencian
      const rutinas = db.read<Rutina>("rutinas").filter((r) => r.id_instructor === id).length;
      if (rutinas > 0)
        return {
          ok: false,
          mensaje: "No se puede eliminar: tiene " + rutinas + " rutina(s) asignada(s). Desactívalo en su lugar.",
        };
      db.write("instructores", arr.filter((i) => i.numero_identificacion !== id));
      return { ok: true, mensaje: "Instructor eliminado", data: ins };
    },

    async setEstado(id: string, estado: EstadoInstructor): Promise<ApiResp<Instructor>> {
      await api._delay();
      const arr = db.read<Instructor>("instructores");
      const ins = arr.find((i) => i.numero_identificacion === id);
      if (!ins) return { ok: false, mensaje: "Instructor no encontrado" };
      ins.estado = estado;
      db.write("instructores", arr);
      return { ok: true, mensaje: "Estado actualizado", data: ins };
    },
  },
  // ===== [/P3] Instructores =====

  // ===== [P3] Rutinas =====
  rutinas: {
    async list(): Promise<Rutina[]> {
      await api._delay();
      return db.read<Rutina>("rutinas");
    },

    async get(id: number): Promise<Rutina | null> {
      await api._delay();
      return db.read<Rutina>("rutinas").find((r) => r.id_rutina === id) ?? null;
    },

    // id_rutina = el mayor id + 1; fecha_creacion = hoy
    async create(data: RutinaNueva): Promise<ApiResp<Rutina>> {
      await api._delay();
      const error = validarReferencias(data.id_instructor, data.id_cliente);
      if (error) return { ok: false, mensaje: error };
      const arr = db.read<Rutina>("rutinas");
      const id = arr.reduce((max, r) => Math.max(max, r.id_rutina), 0) + 1;
      const nueva: Rutina = { ...data, id_rutina: id, fecha_creacion: utils.isoDate() };
      arr.push(nueva);
      db.write("rutinas", arr);
      return { ok: true, mensaje: "Rutina creada", data: nueva };
    },

    // id_rutina y fecha_creacion no se dejan cambiar al editar
    async update(id: number, data: Partial<RutinaNueva>): Promise<ApiResp<Rutina>> {
      await api._delay();
      const arr = db.read<Rutina>("rutinas");
      const r = arr.find((x) => x.id_rutina === id);
      if (!r) return { ok: false, mensaje: "Rutina no encontrada" };
      const error = validarReferencias(data.id_instructor ?? r.id_instructor, data.id_cliente ?? r.id_cliente);
      if (error) return { ok: false, mensaje: error };
      Object.assign(r, data, { id_rutina: id, fecha_creacion: r.fecha_creacion });
      db.write("rutinas", arr);
      return { ok: true, mensaje: "Rutina actualizada", data: r };
    },

    // Borra la rutina y también sus ejercicios (como un ON DELETE CASCADE)
    async remove(id: number): Promise<ApiResp<Rutina>> {
      await api._delay();
      const arr = db.read<Rutina>("rutinas");
      const r = arr.find((x) => x.id_rutina === id);
      if (!r) return { ok: false, mensaje: "Rutina no encontrada" };
      db.write("rutinas", arr.filter((x) => x.id_rutina !== id));
      const ejercicios = db.read<RutinaEjercicio>("rutina_ejercicios");
      db.write("rutina_ejercicios", ejercicios.filter((e) => e.id_rutina !== id));
      return { ok: true, mensaje: "Rutina eliminada", data: r };
    },

    // Ejercicios de una rutina, ordenados por día y luego por orden
    async ejercicios(id: number): Promise<RutinaEjercicio[]> {
      await api._delay();
      return db
        .read<RutinaEjercicio>("rutina_ejercicios")
        .filter((e) => e.id_rutina === id)
        .sort((a, b) => DIAS.indexOf(a.dia_semana) - DIAS.indexOf(b.dia_semana) || a.orden - b.orden);
    },

    // Reemplaza todos los ejercicios de la rutina por la lista recibida.
    // Solo acepta ejercicios que existan en la colección de P4 ("ejercicios").
    async guardarEjercicios(id: number, lista: Omit<RutinaEjercicio, "id_rutina">[]): Promise<ApiResp<RutinaEjercicio[]>> {
      await api._delay();
      if (!db.read<Rutina>("rutinas").some((r) => r.id_rutina === id))
        return { ok: false, mensaje: "Rutina no encontrada" };
      const catalogo = db.read<Ejercicio>("ejercicios");
      const faltante = lista.find((e) => !catalogo.some((c) => c.idEjercicio === e.id_ejercicio));
      if (faltante) return { ok: false, mensaje: "El ejercicio " + faltante.id_ejercicio + " no existe" };
      const nuevos: RutinaEjercicio[] = lista.map((e) => ({ ...e, id_rutina: id }));
      const otros = db.read<RutinaEjercicio>("rutina_ejercicios").filter((e) => e.id_rutina !== id);
      db.write("rutina_ejercicios", otros.concat(nuevos));
      return { ok: true, mensaje: "Ejercicios guardados", data: nuevos };
    },
  },
  // ===== [/P3] Rutinas =====
};