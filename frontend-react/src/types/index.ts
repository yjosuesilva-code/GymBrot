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

// ===== [P3] Rutinas =====

export type DiaSemana =
  | 'LUNES'
  | 'MARTES'
  | 'MIERCOLES'
  | 'JUEVES'
  | 'VIERNES'
  | 'SABADO'
  | 'DOMINGO';

export type ObjetivoRutina =
  | 'Pérdida de peso'
  | 'Ganancia muscular'
  | 'Resistencia'
  | 'Tonificación'
  | 'Rehabilitación';

export interface Rutina {
  id_rutina: number;               // llave, autoincremental
  id_instructor: string;           // Instructor.numero_identificacion
  id_cliente: string;              // Cliente.numero_identificacion
  nombre: string;
  descripcion: string;
  fecha_creacion: string;          // 'YYYY-MM-DD'
  fecha_fin: string | null;        // 'YYYY-MM-DD' o null si no tiene fin
  dias_semana: DiaSemana[];        // días en que se entrena
  objetivo: ObjetivoRutina;
}

// Un ejercicio dentro de una rutina (tabla intermedia Rutina <-> Ejercicio del diagrama ER)
export interface RutinaEjercicio {
  id_rutina: number;               // Rutina.id_rutina
  id_ejercicio: number;            // Ejercicio.idEjercicio (P4)
  orden: number;                   // posición dentro del día: 1, 2, 3...
  dia_semana: DiaSemana;
  notas_instructor: string;
}

// Lo que se envía al crear: id_rutina y fecha_creacion los pone api.rutinas.create
export type RutinaNueva = Omit<Rutina, 'id_rutina' | 'fecha_creacion'>;
// ===== [/P3] Rutinas =====
