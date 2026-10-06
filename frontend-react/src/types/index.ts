export interface Cliente {
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

/* USUARIOS del legacy (GYMBROT_COMPLETO.sql). El campo contrasena guarda la
   clave en texto plano solo porque hoy no hay backend que la hashee; en la
   columna real se llama contrasena_hash y va con BCrypt (AuthService.java:29).
   Los socios tambien son usuarios: su contrasena es la que valida el acceso
   con metodo CONTRASENA. */
export interface Usuario {
  numero_identificacion: string;
  nombre: string;
  apellidos: string;
  correo: string;
  contrasena: string;
  estado: 'ACTIVO' | 'INACTIVO' | 'SUSPENDIDO' | 'BLOQUEADO';
  tipo_usuario: 'ADMINISTRADOR' | 'INSTRUCTOR' | 'CLIENTE';
  rol: string;
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
   pero el modelo de React es de un solo gimnasio.

   Guarda tipo_usuario desde ya porque el login solo admite ADMINISTRADOR
   (loginController.java:156), pero viene preparado para que cada rol entre
   a su propio dashboard. */
export interface Sesion {
  numero_identificacion: string;
  usuario: string;
  nombre: string;
  apellidos: string;
  correo: string;
  rol: string;
  tipo_usuario: Usuario['tipo_usuario'];
}