/* GIMNASIOS: el tenant. Cada fila de las tablas por gimnasio lleva su
   gimnasio_id (DECISIONES.md, D1). Hoy el filtro se simula en api.ts; en
   produccion lo hace cumplir RLS en la base. */
export interface Gimnasio {
  gimnasio_id: string;
  nombre: string;
  estado: 'ACTIVO' | 'INACTIVO';
}

export interface Cliente {
  gimnasio_id: Gimnasio['gimnasio_id'];
  numero_identificacion: string;
  tipo_identificacion: 'CC' | 'TI' | 'CE' | 'PP';
  nombre: string;
  apellidos: string;
  telefono: string;
  correo: string;
  direccion: string;
  fecha_nacimiento: string;   // 'YYYY-MM-DD'
  estado: 'ACTIVO' | 'INACTIVO' | 'SUSPENDIDO' | 'BLOQUEADO';
  fecha_registro: string;
}

/* Lo que manda la vista al crear. gimnasio_id lo inyecta api.ts desde la
   sesion (las vistas no lo conocen); estado y fecha_registro los pone
   api.clientes.create. */
export type ClienteNuevo = Omit<Cliente, 'gimnasio_id' | 'estado' | 'fecha_registro'>;

/* USUARIOS del legacy (GYMBROT_COMPLETO.sql). El campo contrasena guarda la
   clave en texto plano solo porque hoy no hay backend que la hashee; en la
   columna real se llama contrasena_hash y va con BCrypt (AuthService.java:29).
   Los socios tambien son usuarios: su contrasena es la que valida el acceso
   con metodo CONTRASENA. Cada usuario pertenece a un solo gimnasio
   (D3: la cedula es unica dentro de cada gimnasio). */
export interface Usuario {
  gimnasio_id: Gimnasio['gimnasio_id'];
  numero_identificacion: string;
  nombre: string;
  apellidos: string;
  correo: string;
  contrasena: string;
  estado: 'ACTIVO' | 'INACTIVO' | 'SUSPENDIDO' | 'BLOQUEADO';
  tipo_usuario: 'ADMINISTRADOR' | 'INSTRUCTOR' | 'CLIENTE';
  rol: string;
}

/* PLANES_MEMBRESIAS. id_plan es la clave que el legacy separa del nombre:
   PagoMembresiaController.java:207 guarda el id en la membresia y el nombre
   aparte, asi que renombrar un plan no reescribe el historial. */
export interface PlanMembresia {
    id_plan: number;
    nombre: string;
    descripcion: string;
    precio_mensual: number;
    precio_semestral: number;
    precio_anual: number;
    estado: 'ACTIVO' | 'INACTIVO';
}

export interface Membresia {
    gimnasio_id: Gimnasio['gimnasio_id'];
    id_membresia: number;
    id_cliente: string;
    id_plan: number | null;   // null en las sembradas a mano, que no tienen plan
    tipo_membresia: string;
    modalidad_pago: 'MENSUAL' | 'SEMESTRAL' | 'ANUAL';
    valor: number;
    fecha_inicio: string;
    fecha_vencimiento: string;
    // CANCELADA la agrega el flujo de pago, que es el unico que puede
    // desactivar una membresia vigente al renewarla.
    estado: 'ACTIVA' | 'VENCIDA' | 'CANCELADA';
}

// Lo que se envía al crear: gimnasio_id e id_membresia los pone api.membresias.create
export type MembresiaNueva = Omit<Membresia, 'gimnasio_id' | 'id_membresia'>;

export interface Pago {
    gimnasio_id: Gimnasio['gimnasio_id'];
    id_pago: number;
    id_cliente: string;
    id_membresia: number;
    fecha_pago: string;
    valor: number;
    metodo_pago: 'EFECTIVO' | 'TRANSFERENCIA' | 'TARJETA' | 'NEQUI';
    estado_pago: string;
    referencia_transaccion: string;
    observaciones: string;
}

/* HISTORIAL_MEMBRESIAS. Marca que membresia esta vigente ahora; es lo que
   consulta el control de acceso (RegistroEntradaController.java:319) y la
   consulta de pagos vencidos. */
export interface HistorialMembresia {
    gimnasio_id: Gimnasio['gimnasio_id'];
    id_historial: number;
    id_cliente: string;
    id_membresia: number;
    fecha_asignacion: string;
    activa: boolean;
}

export interface Ingreso {
    gimnasio_id: Gimnasio['gimnasio_id'];
    id_ingreso: number;
    id_cliente: string;
    fecha: string;
    hora_entrada: string;
    hora_salida: string | null;
    metodo_verificacion: 'HUELLA' | 'CONTRASENA';
    estado_verificacion: 'APROBADO' | 'RECHAZADO';
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

export interface Progreso {
  gimnasio_id: Gimnasio['gimnasio_id'];
  id_progreso: number;
  id_cliente: string;
  fecha: string;      // 'YYYY-MM-DD'
  peso: number;       // kg
  altura: number;     // metros
  notas: string;
}

// Lo que se envía al crear: gimnasio_id e id_progreso los pone api.progreso.create
export type ProgresoNuevo = Omit<Progreso, 'gimnasio_id' | 'id_progreso'>;

export interface ApiResp<T = unknown> {
  ok: boolean;
  mensaje: string;
  data?: T;
}

/* Sesion del mock en localStorage. Lleva el gimnasio_id que el login copia
   del Usuario: es el gimnasio activo, y la capa db lo lee para filtrar cada
   lectura. Las vistas no lo usan.

   Guarda tipo_usuario desde ya porque el login solo admite ADMINISTRADOR
   (loginController.java:156), pero viene preparado para que cada rol entre
   a su propio dashboard. */
export interface Sesion {
  gimnasio_id: Gimnasio['gimnasio_id'];
  numero_identificacion: string;
  usuario: string;
  nombre: string;
  apellidos: string;
  correo: string;
  rol: string;
  tipo_usuario: Usuario['tipo_usuario'];
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

// ===== [P2] Citas =====
export interface Cita {
  gimnasio_id: Gimnasio['gimnasio_id'];
  id_cita: number;
  id_cliente: string;
  id_instructor: string;
  fecha: string;   // 'YYYY-MM-DD'
  hora: string;    // 'HH:MM'
  estado: 'PENDIENTE' | 'CONFIRMADA' | 'CANCELADA';
  notas: string;
}
// Lo que se envía al crear: gimnasio_id, el id y el estado los pone api.citas.create
export type CitaNueva = Omit<Cita, 'gimnasio_id' | 'id_cita' | 'estado'>;
// ===== [/P2] Citas =====
