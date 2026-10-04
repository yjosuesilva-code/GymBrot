import { utils } from "../lib/utils";
import type { Cliente, Membresia, Pago, Ingreso, Ejercicio, ApiResp } from "../types";
import type { Instructor } from "../types"; // [P3]

interface Seed {
  clientes: Cliente[];
  membresias: Membresia[];
  pagos: Pago[];
  ingresos: Ingreso[];
  ejercicios: Ejercicio[];
  instructores: Instructor[]; // [P3]
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
    { id_pago:6, id_cliente:'1000000003', id_membresia:1, fecha_pago:'2026-09-12', valor:120000,  metodo_pago:'EFECTIVO',      estado_pago:'EXITOSO' }
  ],

  ingresos: [{ id_ingreso:1,  id_cliente:'1000000001', fecha:'2026-09-09', hora_entrada:'2026-09-09T06:30:00', hora_salida:'2026-09-09T08:00:00', metodo_verificacion:'QR' },
    { id_ingreso:2,  id_cliente:'1000000002', fecha:'2026-09-09', hora_entrada:'2026-09-09T18:00:00', hora_salida:'2026-09-09T19:15:00', metodo_verificacion:'MANUAL' },
    { id_ingreso:3,  id_cliente:'1000000005', fecha:'2026-09-10', hora_entrada:'2026-09-10T07:00:00', hora_salida:'2026-09-10T08:30:00', metodo_verificacion:'QR' },
    { id_ingreso:4,  id_cliente:'1000000001', fecha:'2026-09-11', hora_entrada:'2026-09-11T19:00:00', hora_salida:'2026-09-11T20:30:00', metodo_verificacion:'QR' },
    { id_ingreso:5,  id_cliente:'1000000007', fecha:'2026-09-11', hora_entrada:'2026-09-11T06:00:00', hora_salida:'2026-09-11T07:10:00', metodo_verificacion:'MANUAL' },
    { id_ingreso:6,  id_cliente:'1000000002', fecha:'2026-09-12', hora_entrada:'2026-09-12T18:30:00', hora_salida:'2026-09-12T20:00:00', metodo_verificacion:'QR' },
    { id_ingreso:7,  id_cliente:'1000000003', fecha:'2026-09-12', hora_entrada:'2026-09-12T16:00:00', hora_salida:'2026-09-12T17:00:00', metodo_verificacion:'QR' },
    { id_ingreso:8,  id_cliente:'1000000005', fecha:'2026-09-13', hora_entrada:'2026-09-13T07:30:00', hora_salida:'2026-09-13T09:00:00', metodo_verificacion:'MANUAL' },
    { id_ingreso:9,  id_cliente:'1000000001', fecha:'2026-09-13', hora_entrada:'2026-09-13T19:00:00', hora_salida:'2026-09-13T20:15:00', metodo_verificacion:'QR' },
    { id_ingreso:10, id_cliente:'1000000007', fecha:'2026-09-14', hora_entrada:'2026-09-14T06:30:00', hora_salida:'2026-09-14T07:45:00', metodo_verificacion:'QR' },
    { id_ingreso:11, id_cliente:'1000000002', fecha:'2026-09-14', hora_entrada:'2026-09-14T18:00:00', hora_salida:'2026-09-14T19:30:00', metodo_verificacion:'MANUAL' },
    // En el gimnasio AHORA (sin hora_salida) — alimentan "Activos ahora" y "Demografía en vivo"
    { id_ingreso:12, id_cliente:'1000000001', fecha:'2026-09-15', hora_entrada:'2026-09-15T07:00:00', hora_salida:null, metodo_verificacion:'QR' },
    { id_ingreso:13, id_cliente:'1000000003', fecha:'2026-09-15', hora_entrada:'2026-09-15T16:30:00', hora_salida:null, metodo_verificacion:'QR' },
    { id_ingreso:14, id_cliente:'1000000005', fecha:'2026-09-15', hora_entrada:'2026-09-15T08:00:00', hora_salida:null, metodo_verificacion:'MANUAL' },
    { id_ingreso:15, id_cliente:'1000000002', fecha:'2026-09-15', hora_entrada:'2026-09-15T18:00:00', hora_salida:null, metodo_verificacion:'QR' },
    { id_ingreso:16, id_cliente:'1000000007', fecha:'2026-09-15', hora_entrada:'2026-09-15T19:00:00', hora_salida:null, metodo_verificacion:'QR' }
    ],
  ejercicios: [],   // la colección de P4 arranca vacía

  // ===== [P3] Instructores =====
  instructores: [
    { numero_identificacion:'2000000001', tipo_identificacion:'CC', nombre:'Camilo',  apellidos:'Herrera Díaz', telefono:'3101234567', correo:'camilo.herrera@gymbrot.com', especialidad:'Entrenador personal', disponibilidad:'Lun-Vie 6:00-14:00',  fecha_contratacion:'2025-02-03', estado:'ACTIVO' },
    { numero_identificacion:'2000000002', tipo_identificacion:'CC', nombre:'Natalia', apellidos:'Vargas Rojas', telefono:'3112345678', correo:'natalia.vargas@gymbrot.com', especialidad:'Yoga/Pilates',        disponibilidad:'Lun-Mié-Vie 16:00-21:00', fecha_contratacion:'2025-08-18', estado:'ACTIVO' },
    { numero_identificacion:'2000000003', tipo_identificacion:'CE', nombre:'Mateo',   apellidos:'Silva Castro', telefono:'3123456789', correo:'mateo.silva@gymbrot.com',    especialidad:'Nutrición',           disponibilidad:'Mar-Jue 8:00-12:00',  fecha_contratacion:'2026-01-12', estado:'INACTIVO' },
  ],
  // ===== [/P3] Instructores =====
};

const db = {
  _key(col: string) {
    return "gymbrot_" + col;
  },

  read<T>(col: string): T[] {
    const guardado = localStorage.getItem(this._key(col));
    if (guardado) return JSON.parse(guardado) as T[];
    const semilla = ((SEED as unknown as Record<string, unknown[]>)[col] ?? []).slice() as T[];    this.write(col, semilla);
    return semilla;
  },

  write<T>(col: string, arreglo: T[]) {
    localStorage.setItem(this._key(col), JSON.stringify(arreglo));
  },
};

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
  }
};