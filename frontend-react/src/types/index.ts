export interface Cliente {
  numero_identificacion: string;
  tipo_identificacion: 'CC' | 'TI' | 'CE' | 'PP';
  nombre: string;
  apellidos: string;
  telefono: string;
  correo: string;
  direccion: string;
  fecha_nacimiento: string;   // 'YYYY-MM-DD'
  estado: 'ACTIVO' | 'INACTIVO' | 'SUSPENDIDO';
  fecha_registro: string;
}

export interface Membresia {
    id_membresia: number;
    id_cliente: string;
    tipo_membresia: string;
    modalidad_pago: 'MENSUAL' | 'ANUAL';
    valor: number;
    fecha_inicio: string;
    fecha_vencimiento: string;
    estado: 'ACTIVA' | 'VENCIDA';
}

export interface Pago {
    id_pago: number;
    id_cliente: string;
    id_membresia: number;
    fecha_pago: string;
    valor: number;
    metodo_pago: 'EFECTIVO' | 'TRANSFERENCIA' | 'TARJETA' | 'NEQUI';
    estado_pago: string;
}

export interface Ingreso {
    id_ingreso: number;
    id_cliente: string;
    fecha: string;
    hora_entrada: string;
    hora_salida: string | null;
    metodo_verificacion: 'QR'| 'MANUAL';
}

export interface Ejercicio {
    idEjercicio: number;
    nombre: string;
    descripcion: string;
    grupoMuscular: string;
    nivel: string;
    series: number;
    repeticiones: number;
    recursoUrl: string;
}

export interface ApiResp<T = unknown> {
  ok: boolean;
  mensaje: string;
  data?: T;
}

/* Sesion del mock en localStorage. Sin tenantId: el vanilla lo llevaba,
   pero el modelo de React es de un solo gimnasio. */
export interface Sesion {
  usuario: string;
  nombre: string;
  rol: string;
}

// ===== [P3] Instructores =====

// Mismos tipos de documento que Cliente (se reutiliza su tipo en vez de repetirlo)
export type TipoIdentificacion = Cliente['tipo_identificacion'];

export type Especialidad =
  | 'Entrenador personal'
  | 'Nutrición'
  | 'Fisioterapia'
  | 'Yoga/Pilates'
  | 'Cardio'
  | 'Musculación'
  | 'Funcional';

export type EstadoInstructor = 'ACTIVO' | 'INACTIVO';

export interface Instructor {
  numero_identificacion: string;   // llave
  tipo_identificacion: TipoIdentificacion;
  nombre: string;
  apellidos: string;
  telefono: string;
  correo: string;
  especialidad: Especialidad;
  disponibilidad: string;          // texto libre, ej. 'Lun-Vie 6:00-14:00'
  fecha_contratacion: string;      // 'YYYY-MM-DD'
  estado: EstadoInstructor;
}

// Lo que se envía al crear: estado y fecha_contratacion los pone api.instructores.create
export type InstructorNuevo = Omit<Instructor, 'estado' | 'fecha_contratacion'>;
// ===== [/P3] Instructores =====
