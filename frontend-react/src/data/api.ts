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

const SEED: Seed = {
  // Personal con acceso al panel. El legacy exige tipo_usuario
  // 'ADMINISTRADOR' para iniciar sesion (loginController.java:156), asi que
  // instructor y cliente quedan sembrados para probar ese rechazo, no para
  // entrar. Cuando haya roles reales, estos 3 pasan a ser los perfiles.
  usuarios: [
    { numero_identificacion:'1001000001', nombre:'admin', apellidos:'Administrador', correo:'admin@gymbrot.com', contrasena:'admin',      estado:'ACTIVO',     tipo_usuario:'ADMINISTRADOR', rol:'SUPERADMIN' },
    { numero_identificacion:'2001000001', nombre:'Diego', apellidos:'Morales',       correo:'diego.morales@gymbrot.com', contrasena:'instructor', estado:'ACTIVO',     tipo_usuario:'INSTRUCTOR',   rol:'INSTRUCTOR' },
    { numero_identificacion:'1000000004', nombre:'Laura', apellidos:'Martinez',      correo:'laura.m@mail.com',          contrasena:'cliente',    estado:'SUSPENDIDO', tipo_usuario:'CLIENTE',      rol:'CLIENTE' },
  ],

  clientes: [ 
    { numero_identificacion:'1000000001', tipo_identificacion:'CC', nombre:'Ana María',    apellidos:'Ruiz',     telefono:'3001112233', correo:'ana.ruiz@mail.com',   direccion:'Cra 15 #23-40', fecha_nacimiento:'1995-03-12', estado:'ACTIVO',     fecha_registro:'2026-01-10' },
    { numero_identificacion:'1000000002', tipo_identificacion:'CC', nombre:'Carlos Andrés', apellidos:'Pérez',    telefono:'3012223344', correo:'carlos.perez@mail.com',direccion:'Cl 20 #5-16',   fecha_nacimiento:'1988-11-02', estado:'ACTIVO',     fecha_registro:'2026-01-18' },
    { numero_identificacion:'1000000003', tipo_identificacion:'TI', nombre:'Juan David',    apellidos:'Gómez',    telefono:'3023334455', correo:'juan.gomez@mail.com',  direccion:'Cra 9 #10-11',  fecha_nacimiento:'2009-06-25', estado:'ACTIVO',     fecha_registro:'2026-02-01' },
    { numero_identificacion:'1000000004', tipo_identificacion:'CC', nombre:'Laura Sofía',   apellidos:'Martínez', telefono:'3034445566', correo:'laura.m@mail.com',     direccion:'Cl 8 #1-90',    fecha_nacimiento:'1999-09-14', estado:'SUSPENDIDO', fecha_registro:'2026-02-10' },
    { numero_identificacion:'1000000005', tipo_identificacion:'CE', nombre:'Diego Fernando',apellidos:'Ríos',     telefono:'3045556677', correo:'diego.rios@mail.com',  direccion:'Av 4 #12-30',   fecha_nacimiento:'1965-02-20', estado:'ACTIVO',     fecha_registro:'2026-02-15' },
    { numero_identificacion:'1000000006', tipo_identificacion:'CC', nombre:'Valentina',     apellidos:'Torres',   telefono:'3056667788', correo:'valen.torres@mail.com',direccion:'Cra 19 #4-5',   fecha_nacimiento:'2001-12-01', estado:'INACTIVO',   fecha_registro:'2026-03-01' },
    { numero_identificacion:'1000000007', tipo_identificacion:'CC', nombre:'Andrés Felipe', apellidos:'Navarro',  telefono:'3067778899', correo:'andres.nav@mail.com',  direccion:'Cl 44 #7-2',    fecha_nacimiento:'1992-07-19', estado:'ACTIVO',     fecha_registro:'2026-03-05' }
   ],

  // Catalogo de planes. Los tres precios por modalidad son los que lee
  // PagoMembresiaController.java:148 al abrir el cobro.
  planes: [
    { id_plan:1, nombre:'Básico',   descripcion:'Acceso a sala de maquinas y area cardio',   precio_mensual:120000, precio_semestral:650000,  precio_anual:1200000, estado:'ACTIVO' },
    { id_plan:2, nombre:'Estándar', descripcion:'Básico mas clases grupales',                precio_mensual:180000, precio_semestral:980000,  precio_anual:1900000, estado:'ACTIVO' },
    { id_plan:3, nombre:'Premium',  descripcion:'Todo lo anterior mas sauna y entrenador',  precio_mensual:280000, precio_semestral:1520000, precio_anual:2800000, estado:'ACTIVO' },
  ],

  membresias: [{ id_membresia:1, id_cliente:'1000000001', id_plan:3, tipo_membresia:'Premium',  modalidad_pago:'MENSUAL', valor:280000,  fecha_inicio:'2026-08-15', fecha_vencimiento:'2026-09-15', estado:'ACTIVA' },
    { id_membresia:2, id_cliente:'1000000001', id_plan:2, tipo_membresia:'Estándar', modalidad_pago:'MENSUAL', valor:180000,  fecha_inicio:'2026-07-15', fecha_vencimiento:'2026-08-15', estado:'VENCIDA' },
    { id_membresia:3, id_cliente:'1000000002', id_plan:1, tipo_membresia:'Básico',   modalidad_pago:'MENSUAL', valor:120000,  fecha_inicio:'2026-09-01', fecha_vencimiento:'2026-10-01', estado:'ACTIVA' },
    { id_membresia:4, id_cliente:'1000000005', id_plan:3, tipo_membresia:'Premium',  modalidad_pago:'ANUAL',   valor:2800000, fecha_inicio:'2026-02-15', fecha_vencimiento:'2027-02-15', estado:'ACTIVA' }
  ],

  // Marca la membresia vigente de cada socio. Los suspendidos y quien solo
  // tiene membresia vencida quedan con activa=false, que es como el control
  // de acceso los bloquea (RegistroEntradaController.java:319).
  historialMembresias: [
    { id_historial:1, id_cliente:'1000000001', id_membresia:1, fecha_asignacion:'2026-08-15', activa:true  },
    { id_historial:2, id_cliente:'1000000001', id_membresia:2, fecha_asignacion:'2026-07-15', activa:false },
    { id_historial:3, id_cliente:'1000000002', id_membresia:3, fecha_asignacion:'2026-09-01', activa:true  },
    { id_historial:4, id_cliente:'1000000005', id_membresia:4, fecha_asignacion:'2026-02-15', activa:true  },
  ],
  
  pagos: [{ id_pago:1, id_cliente:'1000000001', id_membresia:1, fecha_pago:'2026-08-15', valor:280000,  metodo_pago:'TARJETA',       estado_pago:'EXITOSO', referencia_transaccion:'TX-8801', observaciones:'' },
    { id_pago:2, id_cliente:'1000000001', id_membresia:2, fecha_pago:'2026-07-15', valor:180000,  metodo_pago:'NEQUI',         estado_pago:'EXITOSO', referencia_transaccion:'N-5521',  observaciones:'' },
    { id_pago:3, id_cliente:'1000000002', id_membresia:3, fecha_pago:'2026-09-01', valor:120000,  metodo_pago:'EFECTIVO',      estado_pago:'EXITOSO', referencia_transaccion:'',        observaciones:'' },
    { id_pago:4, id_cliente:'1000000005', id_membresia:4, fecha_pago:'2026-02-15', valor:2800000, metodo_pago:'TRANSFERENCIA', estado_pago:'EXITOSO', referencia_transaccion:'TR-2290', observaciones:'Pago anual anticipado' },
    { id_pago:5, id_cliente:'1000000007', id_membresia:3, fecha_pago:'2026-09-05', valor:180000,  metodo_pago:'NEQUI',         estado_pago:'EXITOSO', referencia_transaccion:'N-5578',  observaciones:'' },
    { id_pago:6, id_cliente:'1000000003', id_membresia:1, fecha_pago:'2026-09-12', valor:120000,  metodo_pago:'EFECTIVO',      estado_pago:'EXITOSO', referencia_transaccion:'',        observaciones:'' },
    // Pagos del mes en curso (fechas relativas) -> KPI "Ingresos este mes"
    { id_pago:7,  id_cliente:'1000000001', id_membresia:1, fecha_pago:dia(0), valor:280000,  metodo_pago:'TARJETA',       estado_pago:'EXITOSO', referencia_transaccion:'TX-9012', observaciones:'' },
    { id_pago:8,  id_cliente:'1000000002', id_membresia:3, fecha_pago:dia(0), valor:120000,  metodo_pago:'EFECTIVO',      estado_pago:'EXITOSO', referencia_transaccion:'',        observaciones:'' },
    { id_pago:9,  id_cliente:'1000000007', id_membresia:3, fecha_pago:dia(1), valor:180000,  metodo_pago:'NEQUI',         estado_pago:'EXITOSO', referencia_transaccion:'N-5603',  observaciones:'' },
    { id_pago:10, id_cliente:'1000000004', id_membresia:3, fecha_pago:dia(1), valor:180000,  metodo_pago:'TRANSFERENCIA', estado_pago:'EXITOSO', referencia_transaccion:'TR-2310', observaciones:'Transferencia pendiente de aplicar' },
  ],

  ingresos: ingresosPasados().concat(ingresosDeHoy()),
  ejercicios: [],   // la colección de P4 arranca vacía
};

// Version del seed guardado en localStorage.
//
// Sin esto, cambiar el SEED no se refleja nunca en un navegador que ya
// tenga datos: read() solo siembra cuando la clave no existe, asi que un
// seed nuevo convive con el viejo indefinidamente. Al cambiar este numero
// la siguiente carga regenera todas las colecciones.
const SEED_VERSION = "4";
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

    /* Pagos que aun no se aplican: el socio tiene membresia vencida o sin
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