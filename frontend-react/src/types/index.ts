/* PLANES_SOFTWARE: lo que la plataforma le vende a cada gimnasio. Es un
   catalogo global, distinto de PlanMembresia, que es lo que cada gimnasio le
   vende a sus socios. */
export interface PlanSoftware {
  id_plan_software: 'BASICO' | 'PRO' | 'PREMIUM';
  nombre: string;
  precio_mensual: number;
  max_clientes: number | null;   // null = ilimitados
  incluye: string[];
  destacado: boolean;            // la tarjeta "mas elegido" de la pagina de planes
}

/* GIMNASIOS: el tenant. Cada fila de las tablas por gimnasio lleva su
   gimnasio_id (DECISIONES.md, D1). Hoy el filtro se simula en api.ts; en
   produccion lo hace cumplir RLS en la base. */
export interface Gimnasio {
  gimnasio_id: string;
  /* [multitenant-slug] Identificador publico en la URL (/g/:slug/...).
     Unico en toda la plataforma y estable: gimnasio_id sigue siendo la llave
     de todas las FKs, el slug solo sirve para encontrar al tenant. Reglas en
     lib/slug.ts. */
  slug: string;
  nombre: string;
  ciudad: string;
  telefono: string;
  estado: 'ACTIVO' | 'INACTIVO';
  plan_software: PlanSoftware['id_plan_software'];
  fecha_registro: string;        // 'YYYY-MM-DD'
  vence_suscripcion: string;     // 'YYYY-MM-DD', pagada hasta este dia
}

/* [multitenant-slug] Lo que cualquiera puede saber de un gimnasio a partir
   de su slug, sin sesion: lo necesita /g/:slug/login para mostrar el nombre.
   En Supabase lo devuelve la funcion gimnasio_por_slug(): la tabla gimnasios
   no se expone a anon, y una funcion que responde por un slug exacto no
   permite listar todos los gimnasios como lo haria una vista. */
export type GimnasioPublico = Pick<Gimnasio, 'gimnasio_id' | 'slug' | 'nombre' | 'ciudad' | 'estado'>;

/* Pago de la suscripcion de un gimnasio a la plataforma. Simulado: no hay
   pasarela, y por eso no guarda ningun dato de tarjeta. */
export interface PagoSoftware {
  id_pago_software: number;
  gimnasio_id: Gimnasio['gimnasio_id'];
  id_plan_software: PlanSoftware['id_plan_software'];
  valor: number;
  metodo_pago: 'TARJETA' | 'PSE' | 'NEQUI';
  fecha_pago: string;
  referencia: string;
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
  tipo_usuario: 'SUPERADMIN' | 'ADMINISTRADOR' | 'INSTRUCTOR' | 'CLIENTE';
  rol: string;
  /* true en las cuentas nuevas (instructores y clientes creados por el admin
     con clave automatica): el portal obliga a cambiar la contrasena antes de
     dejar entrar a cualquier otra vista. */
  debe_cambiar_contrasena?: boolean;
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
    beneficios?: string[];
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

// ===== [P3] Ejercicios (antes P4) =====
/* Catálogo MIXTO (DECISIONES.md): los ejercicios base tienen gimnasio_id null y los ven todos los
   gimnasios (solo lectura); los propios llevan el gimnasio_id de quien los creó. */

export type GrupoMuscular =
  | 'Pecho'
  | 'Espalda'
  | 'Hombros'
  | 'Bíceps'
  | 'Tríceps'
  | 'Piernas'
  | 'Glúteos'
  | 'Abdomen'
  | 'Cardio'
  | 'Cuerpo completo';

export type NivelEjercicio = 'Principiante' | 'Intermedio' | 'Avanzado';

export type EquipoEjercicio =
  | 'Máquina'
  | 'Mancuerna'
  | 'Barra'
  | 'Polea'
  | 'Kettlebell'
  | 'Banda elástica'
  | 'Peso corporal';

// Cómo se mide: por repeticiones (ej. 12 sentadillas) o por tiempo (ej. 30 s de plancha)
export type TipoMedicion = 'REPETICIONES' | 'TIEMPO';

export type EstadoEjercicio = 'ACTIVO' | 'INACTIVO';

export interface Ejercicio {
  id_ejercicio: number;                        // llave, global (como un SERIAL)
  gimnasio_id: Gimnasio['gimnasio_id'] | null; // null = catálogo base (de todos, solo lectura)
  nombre: string;
  descripcion: string;
  grupo_muscular: GrupoMuscular;
  nivel: NivelEjercicio;
  equipo: EquipoEjercicio;
  tipo_medicion: TipoMedicion;
  // Valores SUGERIDOS (opcionales): la rutina de cada cliente define los reales
  series_sugeridas: number | null;
  repeticiones_min_sugeridas: number | null;   // rango, si tipo_medicion es REPETICIONES (ej. 10–12)
  repeticiones_max_sugeridas: number | null;
  segundos_sugeridos: number | null;           // si tipo_medicion es TIEMPO
  recurso_url: string;                         // video o imagen de referencia ('' si no hay)
  estado: EstadoEjercicio;
}

// Lo que manda la vista al crear: id, gimnasio y estado los pone api.ejercicios.create
export type EjercicioNuevo = Omit<Ejercicio, 'id_ejercicio' | 'gimnasio_id' | 'estado'>;

// ===== [/P3] Ejercicios =====

export interface Progreso {
  gimnasio_id: Gimnasio['gimnasio_id'];
  id_progreso: number;
  id_cliente: string;
  fecha: string;      // 'YYYY-MM-DD'
  peso: number;       // kg
  altura: number;     // metros
  porcentaje_grasa?: number;
  masa_muscular?: number;
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
/* [multitenant-slug] Un gimnasio al que la sesion puede entrar. Hoy hay uno
   solo (cada Usuario pertenece a un gimnasio); con Supabase sale de
   gym_members y una persona puede tener varios. */
export interface AccesoGimnasio {
  gimnasio_id: Gimnasio['gimnasio_id'];
  slug: Gimnasio['slug'];
  rol: string;
}

export interface Sesion {
  /* Gimnasio con el que se inicio sesion. Ya NO decide que datos se leen: eso
     lo hace el slug de la URL (TenantProvider). Se conserva para redirigir
     las rutas viejas (/dashboard) y por compatibilidad con sesiones guardadas
     antes del slug. */
  /* Opcional desde los roles: el SUPERADMIN es dueno del software y no
     pertenece a ningun gimnasio, asi que su sesion no lo trae. */
  gimnasio_id?: Gimnasio['gimnasio_id'];
  /* Opcional: las sesiones guardadas antes del slug no lo traen y siguen
     siendo validas; auth.accesosDe() lo completa con gimnasio_id. */
  accesos?: AccesoGimnasio[];
  numero_identificacion: string;
  usuario: string;
  nombre: string;
  apellidos: string;
  correo: string;
  rol: string;
  tipo_usuario: Usuario['tipo_usuario'];
  /* Espeja Usuario.debe_cambiar_contrasena: el guard lo lee para forzar el
     cambio antes de dejar pasar a cualquier otra vista. */
  debe_cambiar_contrasena?: boolean;
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

/* Disponibilidad por intervalos: cada día de la semana tiene (opcionalmente)
   una lista de rangos 'HH:MM' inclusive. Sustituye al texto libre anterior. */
export interface IntervaloHorario {
  desde: string; // 'HH:MM'
  hasta: string; // 'HH:MM'
}

export type HorarioInstructor = {
  [key in DiaSemana]?: IntervaloHorario[];
};

export interface Instructor {
  gimnasio_id: Gimnasio['gimnasio_id']; // tenant: lo pone api.ts, la vista no lo conoce
  numero_identificacion: string;   // llave dentro de cada gimnasio (D3)
  tipo_identificacion: TipoIdentificacion;
  nombre: string;
  apellidos: string;
  telefono: string;
  correo: string;
  especialidad: Especialidad;
  horario: HorarioInstructor;      // intervalos por día; el texto legible se deriva con disponibilidadTexto
  fecha_contratacion: string;      // 'YYYY-MM-DD'
  estado: EstadoInstructor;
  /* Ruta a la foto ('/recursos/fotos/instructor-XXXX.jpg') o dataURL base64
     como respaldo si se subio un archivo desde el navegador. */
  foto?: string;
}

// Lo que se envía al crear: gimnasio_id, estado y fecha_contratacion los pone api.instructores.create
export type InstructorNuevo = Omit<Instructor, 'gimnasio_id' | 'estado' | 'fecha_contratacion'>;
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
  gimnasio_id: Gimnasio['gimnasio_id']; // tenant: lo pone api.ts, la vista no lo conoce
  id_rutina: number;               // llave, autoincremental global (como un SERIAL)
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
  gimnasio_id: Gimnasio['gimnasio_id']; // el mismo de su rutina
  id_rutina: number;               // Rutina.id_rutina
  id_ejercicio: number;            // Ejercicio.id_ejercicio (base o propio del mismo gimnasio)
  orden: number;                   // posición dentro del día: 1, 2, 3...
  dia_semana: DiaSemana;
  notas_instructor: string;
  /* El cliente puede adicionar/cambiar ejercicios de su rutina (con aviso de
     que lo consulto con su instructor): esos quedan marcados para que el
     instructor los revise. */
  agregado_por_cliente?: boolean;
  confirmado_instructor?: boolean;
}

// Lo que se envía al crear: gimnasio_id, id_rutina y fecha_creacion los pone api.rutinas.create
export type RutinaNueva = Omit<Rutina, 'gimnasio_id' | 'id_rutina' | 'fecha_creacion'>;
// ===== [/P3] Rutinas =====

// ===== [P2] Citas =====
export type TipoCita = 'EVALUACION' | 'SEGUIMIENTO' | 'NUTRICION' | 'CONSULTA';

export interface Cita {
  gimnasio_id: Gimnasio['gimnasio_id'];
  id_cita: number;
  id_cliente: string;
  id_instructor: string;
  fecha: string;   // 'YYYY-MM-DD'
  hora: string;    // 'HH:MM'
  estado: 'PENDIENTE' | 'CONFIRMADA' | 'COMPLETADA' | 'CANCELADA';
  tipo_cita: TipoCita;
  notas: string;
}
// Lo que se envía al crear: gimnasio_id, el id y el estado los pone api.citas.create
export type CitaNueva = Omit<Cita, 'gimnasio_id' | 'id_cita' | 'estado'>;
// ===== [/P2] Citas =====

// ===== [roles] Clases generales =====
/* Una clase grupal con aforo (rumba terapia, core, zumba...). La crea el
   instructor; los clientes se agendan mientras haya cupo. */
export type TipoClase = 'RUMBA' | 'ZUMBA' | 'CORE' | 'FUNCIONAL' | 'YOGA' | 'OTRA';

export interface Clase {
  gimnasio_id: Gimnasio['gimnasio_id'];
  id_clase: number;             // autoincremental global (lo pone apiClases)
  id_instructor: string;        // Instructor.numero_identificacion
  nombre: string;
  tipo_clase: TipoClase;
  dia_semana: DiaSemana;
  hora: string;                 // 'HH:MM'
  duracion_min: number;         // ej. 60
  aforo_max: number;            // cupos máximos
  inscritos: string[];          // Cliente.numero_identificacion de los agendados
  estado: 'ACTIVA' | 'CANCELADA';
}

// Lo que manda la vista al crear: gimnasio_id, id_clase, inscritos y estado los pone apiClases
export type ClaseNueva = Omit<Clase, 'gimnasio_id' | 'id_clase' | 'inscritos' | 'estado'>;
// ===== [/roles] Clases generales =====
