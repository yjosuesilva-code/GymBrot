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

export interface Progreso {
  id_progreso: number;
  id_cliente: string;
  fecha: string;      // 'YYYY-MM-DD'
  peso: number;       // kg
  altura: number;     // metros
  notas: string;
}

export interface ApiResp<T = unknown> {
  ok: boolean;
  mensaje: string;
  data?: T;
}