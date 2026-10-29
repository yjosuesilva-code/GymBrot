// Genera los scripts 01..20 de datos de prueba y 00_ejecutar_todo_pgadmin.sql.
// Uso, desde esta carpeta:  node generar_datos.mjs [AAAA-MM-DD]
// Las fechas se calculan respecto a HOY: la fecha de ejecución, o la que se pase
// como argumento (ej. el día de la presentación). Así siempre hay membresías
// vigentes, citas próximas e ingresos recientes respecto a CURRENT_DATE.
// La semilla es fija: con la misma fecha, cada ejecución produce los mismos datos.
import { writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const CARPETA = dirname(fileURLToPath(import.meta.url));
// Las fechas fijas de este script están escritas para el 2026-10-29 y se desplazan
// los mismos días que haya entre esa fecha y HOY.
const REFERENCIA = fecha('2026-10-29');
const argumento = process.argv[2];
if (argumento && !/^\d{4}-\d{2}-\d{2}$/.test(argumento)) {
  throw new Error(`Fecha inválida "${argumento}": usa el formato AAAA-MM-DD`);
}
const HOY = fecha(argumento ?? fechaLocalDeHoy());
const DESFASE = Math.round((HOY - REFERENCIA) / 86400000);
const fechaRel = (texto) => new Date(fecha(texto).getTime() + DESFASE * 86400000);

// ---------------------------------------------------------------------------
// Utilidades
// ---------------------------------------------------------------------------
let semilla = 20261029;
function azar() {
  semilla = (semilla + 0x6d2b79f5) | 0;
  let t = Math.imul(semilla ^ (semilla >>> 15), 1 | semilla);
  t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
}
const entero = (min, max) => min + Math.floor(azar() * (max - min + 1));
const elegir = (lista) => lista[Math.floor(azar() * lista.length)];
const probabilidad = (p) => azar() < p;
function mezclar(lista) {
  const copia = [...lista];
  for (let i = copia.length - 1; i > 0; i--) {
    const j = Math.floor(azar() * (i + 1));
    [copia[i], copia[j]] = [copia[j], copia[i]];
  }
  return copia;
}
function tomar(lista, n) {
  return mezclar(lista).slice(0, n);
}

function fecha(texto) {
  return new Date(texto + 'T00:00:00Z');
}
function fechaLocalDeHoy() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}
function sumarDias(d, dias) {
  return new Date(d.getTime() + dias * 86400000);
}
function sumarMeses(d, meses) {
  const r = new Date(d);
  r.setUTCMonth(r.getUTCMonth() + meses);
  return r;
}
const dias = (a, b) => Math.round((b - a) / 86400000);
const fechaEntre = (a, b) => sumarDias(a, entero(0, Math.max(0, dias(a, b))));
const maxFecha = (a, b) => (a > b ? a : b);
const minFecha = (a, b) => (a < b ? a : b);
const txtFecha = (d) => d.toISOString().slice(0, 10);
const dosDigitos = (n) => String(n).padStart(2, '0');
const hora = (h, m) => `${dosDigitos(h)}:${dosDigitos(m)}`;
const minutosAHora = (min) => hora(Math.floor(min / 60), min % 60);
const DIAS_SEMANA = ['DOMINGO', 'LUNES', 'MARTES', 'MIERCOLES', 'JUEVES', 'VIERNES', 'SABADO'];

function sinTildes(texto) {
  return texto.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, '.');
}
function redondearMil(valor) {
  return Math.round(valor / 1000) * 1000;
}

// Formato de valores SQL
const CRUDO = Symbol('crudo');
const sqlCrudo = (texto) => ({ [CRUDO]: texto });
function sql(valor) {
  if (valor === null || valor === undefined) return 'NULL';
  if (typeof valor === 'object' && CRUDO in valor) return valor[CRUDO];
  if (valor instanceof Date) return `'${txtFecha(valor)}'`;
  if (typeof valor === 'boolean') return valor ? 'TRUE' : 'FALSE';
  if (typeof valor === 'number') return String(valor);
  return `'${String(valor).replace(/'/g, "''")}'`;
}

function escribir(archivo, tabla, comentario, columnas, filas, columnaId) {
  const lineas = [`-- ${tabla.toUpperCase()}: ${comentario} (${filas.length} registros)`];
  // Lotes de 200 filas para que cada INSERT sea legible y no demasiado largo
  for (let i = 0; i < filas.length; i += 200) {
    const lote = filas.slice(i, i + 200);
    lineas.push(`INSERT INTO ${tabla} (${columnas.join(', ')}) VALUES`);
    lineas.push(lote.map((f) => `(${columnas.map((c) => sql(f[c])).join(', ')})`).join(',\n') + ';');
    lineas.push('');
  }
  if (columnaId) {
    lineas.push(`SELECT setval(pg_get_serial_sequence('${tabla}', '${columnaId}'), (SELECT MAX(${columnaId}) FROM ${tabla}));`);
  }
  const texto = lineas.join('\n') + '\n';
  writeFileSync(join(CARPETA, archivo), texto, 'utf8');
  generados.push({ archivo, texto });
  console.log(`${archivo.padEnd(28)} ${filas.length}`);
}
const generados = [];

// ---------------------------------------------------------------------------
// Catálogos de nombres
// ---------------------------------------------------------------------------
const NOMBRES_M = ['Andrés', 'Carlos', 'Juan Pablo', 'Luis Ángel', 'Mateo', 'Sebastián', 'Santiago', 'Daniel', 'Jorge', 'Alejandro', 'Camilo', 'David', 'Felipe', 'Gabriel', 'Hernán', 'Iván', 'José', 'Julián', 'Kevin', 'Manuel', 'Miguel', 'Nicolás', 'Óscar', 'Ricardo', 'Samuel', 'Tomás', 'Víctor', 'Esteban', 'Emiliano', 'Rafael'];
const NOMBRES_F = ['María Fernanda', 'Valentina', 'Sofía', 'Daniela', 'Isabella', 'Camila', 'Laura', 'Diana', 'Andrea', 'Carolina', 'Natalia', 'Paula', 'Juliana', 'Mariana', 'Gabriela', 'Luisa', 'Ana María', 'Sara', 'Lucía', 'Melissa', 'Paola', 'Tatiana', 'Verónica', 'Ximena', 'Yuliana', 'Angélica', 'Catalina', 'Elena', 'Manuela', 'Salomé'];
const APELLIDOS = ['López', 'Martínez', 'Herrera', 'Torres', 'Romero', 'Quintero', 'Maestre', 'Gutiérrez', 'Ochoa', 'Daza', 'Arzuaga', 'Ríos', 'Pérez', 'Castro', 'Méndez', 'Cuello', 'Fragozo', 'Mejía', 'Baute', 'Zuleta', 'Araujo', 'Oñate', 'Pumarejo', 'Villazón', 'Pineda', 'Navarro', 'Rojas', 'Molina', 'Castilla', 'Mendoza', 'Gómez', 'Díaz', 'Suárez', 'Vega', 'Orozco', 'Barros', 'Brito', 'Carrillo', 'Durán', 'Escobar', 'Florez', 'Guerra', 'Lacouture', 'Montero', 'Núñez', 'Palmera', 'Redondo', 'Sierra', 'Trespalacios', 'Zabaleta'];
const CALLES = ['Calle', 'Carrera', 'Diagonal', 'Transversal', 'Avenida'];

function persona() {
  const femenino = probabilidad(0.5);
  return {
    nombre: elegir(femenino ? NOMBRES_F : NOMBRES_M),
    apellidos: `${elegir(APELLIDOS)} ${elegir(APELLIDOS)}`,
  };
}
const telefono = () => `3${elegir(['00', '01', '02', '04', '05', '10', '11', '12', '13', '15', '16', '17', '18', '20', '21'])}${entero(1000000, 9999999)}`;

// ---------------------------------------------------------------------------
// 01 GIMNASIOS
// ---------------------------------------------------------------------------
const gimnasios = [
  { id_gimnasio: 1, slug: 'iron-gym-valledupar', nombre: 'Iron Gym Valledupar', ciudad: 'Valledupar', telefono: '3001234567', plan_software: 'PRO', estado: 'ACTIVO', fecha_registro: fechaRel('2025-01-15'), vence_suscripcion: fechaRel('2027-01-15'), dominio: 'irongym.co', factor: 1.0, clientes: 30, instructores: 6 },
  { id_gimnasio: 2, slug: 'titan-fit', nombre: 'Titan Fit', ciudad: 'Valledupar', telefono: '3012345678', plan_software: 'BASICO', estado: 'ACTIVO', fecha_registro: fechaRel('2025-03-01'), vence_suscripcion: fechaRel('2026-12-01'), dominio: 'titanfit.co', factor: 0.85, clientes: 25, instructores: 5 },
  { id_gimnasio: 3, slug: 'pulso-gym', nombre: 'Pulso Gym', ciudad: 'Aguachica', telefono: '3023456789', plan_software: 'PREMIUM', estado: 'ACTIVO', fecha_registro: fechaRel('2025-04-10'), vence_suscripcion: fechaRel('2027-04-10'), dominio: 'pulsogym.co', factor: 0.9, clientes: 20, instructores: 4 },
  { id_gimnasio: 4, slug: 'cuerpo-activo', nombre: 'Cuerpo Activo', ciudad: 'Santa Marta', telefono: '3034567890', plan_software: 'PRO', estado: 'ACTIVO', fecha_registro: fechaRel('2025-05-20'), vence_suscripcion: fechaRel('2026-11-20'), dominio: 'cuerpoactivo.co', factor: 1.1, clientes: 15, instructores: 3 },
  { id_gimnasio: 5, slug: 'zona-fit', nombre: 'Zona Fit', ciudad: 'Barranquilla', telefono: '3045678901', plan_software: 'BASICO', estado: 'SUSPENDIDO', fecha_registro: fechaRel('2025-06-01'), vence_suscripcion: fechaRel('2026-09-30'), dominio: 'zonafit.co', factor: 0.8, clientes: 10, instructores: 2 },
];
escribir('01_gimnasios.sql', 'gimnasios', 'tenants', ['id_gimnasio', 'slug', 'nombre', 'ciudad', 'telefono', 'plan_software', 'estado', 'fecha_registro', 'vence_suscripcion'], gimnasios, 'id_gimnasio');

// ---------------------------------------------------------------------------
// 03 ESPECIALIDADES
// ---------------------------------------------------------------------------
const especialidades = ['Entrenamiento funcional', 'Musculación', 'Cardio y resistencia', 'Nutrición deportiva', 'Yoga y movilidad', 'CrossFit', 'Rehabilitación física', 'Entrenamiento de fuerza']
  .map((nombre, i) => ({ id_especialidad: i + 1, nombre }));

// ---------------------------------------------------------------------------
// 07 PLANES_MEMBRESIAS (3 por gimnasio)
// ---------------------------------------------------------------------------
const BASE_PLANES = [
  { nombre: 'Básico', descripcion: 'Acceso a sala de máquinas en horario regular', mensual: 80000, beneficios: 'Sala de máquinas; casillero' },
  { nombre: 'Plus', descripcion: 'Acceso total con clases grupales', mensual: 120000, beneficios: 'Sala de máquinas; clases grupales; valoración mensual' },
  { nombre: 'Full', descripcion: 'Acceso total con asesoría personalizada', mensual: 160000, beneficios: 'Sala de máquinas; clases; asesoría nutricional; rutina personalizada' },
];
const planes = [];
for (const g of gimnasios) {
  for (const base of BASE_PLANES) {
    const mensual = redondearMil(base.mensual * g.factor);
    planes.push({
      id_plan: planes.length + 1, id_gimnasio: g.id_gimnasio, nombre: base.nombre, descripcion: base.descripcion,
      precio_mensual: mensual, precio_semestral: redondearMil(mensual * 5.5), precio_anual: redondearMil(mensual * 10),
      beneficios: base.beneficios,
    });
  }
}

// ---------------------------------------------------------------------------
// 08 EJERCICIOS (100: 60 del catálogo base y 40 propios de los gimnasios)
// ---------------------------------------------------------------------------
// [nombre, grupo, nivel, tipo (R = repeticiones, D = duración), variantes]
const MOVIMIENTOS = [
  ['Sentadilla', 'Piernas', 'INTERMEDIO', 'R', ['con barra', 'goblet', 'búlgara', 'frontal', 'en máquina Smith']],
  ['Prensa de piernas', 'Piernas', 'PRINCIPIANTE', 'R', ['a 45°', 'horizontal']],
  ['Zancada', 'Piernas', 'PRINCIPIANTE', 'R', ['con mancuernas', 'caminando', 'inversa']],
  ['Peso muerto rumano', 'Piernas', 'INTERMEDIO', 'R', ['con barra', 'con mancuernas']],
  ['Extensión de cuádriceps', 'Piernas', 'PRINCIPIANTE', 'R', ['']],
  ['Curl femoral', 'Piernas', 'PRINCIPIANTE', 'R', ['acostado', 'sentado']],
  ['Elevación de talones', 'Piernas', 'PRINCIPIANTE', 'R', ['de pie', 'sentado']],
  ['Hip thrust', 'Glúteos', 'INTERMEDIO', 'R', ['con barra', 'en máquina']],
  ['Step-up', 'Glúteos', 'PRINCIPIANTE', 'R', ['con mancuernas']],
  ['Press de banca', 'Pecho', 'INTERMEDIO', 'R', ['con barra', 'con mancuernas', 'inclinado', 'declinado']],
  ['Aperturas', 'Pecho', 'PRINCIPIANTE', 'R', ['con mancuernas', 'en polea', 'en máquina']],
  ['Fondos', 'Pecho', 'AVANZADO', 'R', ['en paralelas']],
  ['Flexiones de pecho', 'Pecho', 'PRINCIPIANTE', 'R', ['clásicas', 'diamante', 'inclinadas']],
  ['Cruce de poleas', 'Pecho', 'INTERMEDIO', 'R', ['alto', 'bajo']],
  ['Dominadas', 'Espalda', 'AVANZADO', 'R', ['pronas', 'supinas', 'asistidas']],
  ['Jalón al pecho', 'Espalda', 'PRINCIPIANTE', 'R', ['agarre ancho', 'agarre estrecho']],
  ['Remo', 'Espalda', 'INTERMEDIO', 'R', ['con barra', 'con mancuerna', 'en polea baja', 'en máquina', 'en T']],
  ['Peso muerto', 'Espalda', 'AVANZADO', 'R', ['convencional', 'sumo']],
  ['Pullover', 'Espalda', 'INTERMEDIO', 'R', ['con mancuerna', 'en polea']],
  ['Hiperextensiones', 'Espalda', 'PRINCIPIANTE', 'R', ['en banco romano']],
  ['Press militar', 'Hombros', 'INTERMEDIO', 'R', ['con barra', 'con mancuernas', 'en máquina']],
  ['Elevaciones laterales', 'Hombros', 'PRINCIPIANTE', 'R', ['con mancuernas', 'en polea']],
  ['Elevaciones frontales', 'Hombros', 'PRINCIPIANTE', 'R', ['con disco', 'con mancuernas']],
  ['Pájaros', 'Hombros', 'INTERMEDIO', 'R', ['con mancuernas', 'en máquina']],
  ['Face pull', 'Hombros', 'INTERMEDIO', 'R', ['en polea']],
  ['Encogimientos', 'Trapecio', 'PRINCIPIANTE', 'R', ['con barra', 'con mancuernas']],
  ['Curl de bíceps', 'Brazos', 'PRINCIPIANTE', 'R', ['con barra', 'con mancuernas', 'martillo', 'concentrado', 'en polea', 'en banco predicador']],
  ['Extensión de tríceps', 'Brazos', 'PRINCIPIANTE', 'R', ['en polea', 'sobre la cabeza', 'con barra Z']],
  ['Press francés', 'Brazos', 'INTERMEDIO', 'R', ['con barra Z']],
  ['Patada de tríceps', 'Brazos', 'PRINCIPIANTE', 'R', ['con mancuerna']],
  ['Plancha', 'Core', 'PRINCIPIANTE', 'D', ['frontal', 'lateral', 'con toque de hombro']],
  ['Crunch', 'Core', 'PRINCIPIANTE', 'R', ['abdominal', 'en polea', 'bicicleta']],
  ['Elevación de piernas', 'Core', 'INTERMEDIO', 'R', ['colgado', 'en banco']],
  ['Russian twist', 'Core', 'INTERMEDIO', 'R', ['con disco']],
  ['Rueda abdominal', 'Core', 'AVANZADO', 'R', ['']],
  ['Dead bug', 'Core', 'PRINCIPIANTE', 'R', ['']],
  ['Mountain climbers', 'Core', 'INTERMEDIO', 'D', ['']],
  ['Caminadora', 'Cardio', 'PRINCIPIANTE', 'D', ['caminata inclinada', 'trote', 'intervalos']],
  ['Bicicleta estática', 'Cardio', 'PRINCIPIANTE', 'D', ['ritmo moderado', 'intervalos']],
  ['Elíptica', 'Cardio', 'PRINCIPIANTE', 'D', ['']],
  ['Remo ergómetro', 'Cardio', 'INTERMEDIO', 'D', ['']],
  ['Escaladora', 'Cardio', 'INTERMEDIO', 'D', ['']],
  ['Salto de cuerda', 'Cardio', 'INTERMEDIO', 'D', ['']],
  ['Burpees', 'Full body', 'AVANZADO', 'R', ['']],
  ['Jumping jacks', 'Cardio', 'PRINCIPIANTE', 'D', ['']],
  ['Kettlebell swing', 'Full body', 'INTERMEDIO', 'R', ['']],
  ['Clean', 'Full body', 'AVANZADO', 'R', ['con barra']],
  ['Thruster', 'Full body', 'AVANZADO', 'R', ['con barra', 'con mancuernas']],
  ['Battle ropes', 'Full body', 'INTERMEDIO', 'D', ['']],
  ['Saltos al cajón', 'Full body', 'INTERMEDIO', 'R', ['']],
  ['Farmer walk', 'Full body', 'INTERMEDIO', 'D', ['']],
  ['Turkish get-up', 'Full body', 'AVANZADO', 'R', ['']],
  ['Estiramiento', 'Movilidad', 'PRINCIPIANTE', 'D', ['de isquiotibiales', 'de cadera', 'de pectoral']],
  ['Movilidad de hombros', 'Movilidad', 'PRINCIPIANTE', 'D', ['con banda']],
  ['Yoga', 'Movilidad', 'PRINCIPIANTE', 'D', ['saludo al sol', 'postura del guerrero']],
  ['Foam roller', 'Movilidad', 'PRINCIPIANTE', 'D', ['piernas', 'espalda']],
];
const candidatosEjercicio = MOVIMIENTOS.flatMap(([nombre, grupo, nivel, tipo, variantes]) =>
  variantes.map((v) => ({ nombre: v ? `${nombre} ${v}` : nombre, grupo, nivel, tipo })));
const ejercicios = tomar(candidatosEjercicio, 100).map((e, i) => {
  // Los 60 primeros son del catálogo base; los 40 restantes se reparten entre los gimnasios
  const idGimnasio = i < 60 ? null : gimnasios[(i - 60) % gimnasios.length].id_gimnasio;
  const esDuracion = e.tipo === 'D';
  return {
    id_ejercicio: i + 1,
    id_gimnasio: idGimnasio,
    nombre: e.nombre,
    descripcion: `${e.nombre}: ejecutar con técnica controlada${esDuracion ? ' manteniendo un ritmo constante' : ' en todo el rango de movimiento'}.`,
    grupo_muscular: e.grupo,
    series: esDuracion ? (e.grupo === 'Cardio' ? null : entero(2, 4)) : entero(3, 5),
    repeticiones: esDuracion ? null : elegir([6, 8, 10, 12, 15]),
    duracion_minutos: esDuracion ? (e.grupo === 'Cardio' ? elegir([10, 15, 20, 25, 30]) : entero(1, 5)) : null,
    nivel: e.nivel,
    recurso_url: idGimnasio === null ? `/recursos/ejercicios/${sinTildes(e.nombre).replace(/\./g, '-')}.gif` : null,
  };
});
const ejerciciosDeGimnasio = (idGimnasio) => ejercicios.filter((e) => e.id_gimnasio === null || e.id_gimnasio === idGimnasio);

// ---------------------------------------------------------------------------
// 02/04/05/06 USUARIOS y subtipos
// ---------------------------------------------------------------------------
const usuarios = [];
const administradores = [];
const instructores = [];
const clientes = [];

usuarios.push({ numero_identificacion: '1000000001', id_gimnasio: null, tipo_identificacion: 'CC', nombre: 'Laura', apellidos: 'Méndez Rojas', telefono: '3100000001', correo: 'laura.mendez@gymbrot.co', contrasena_hash: 'hash-prueba-superadmin', foto_url: null, estado: 'ACTIVO', fecha_registro: fechaRel('2025-01-01'), tipo_usuario: 'SUPERADMIN' });
administradores.push({ numero_identificacion: '1000000001', rol: 'PLATAFORMA' });

// Administradores: un gerente por gimnasio y recepción en los tres más grandes
let consecutivoAdmin = 1;
for (const g of gimnasios) {
  for (const rol of g.id_gimnasio <= 3 ? ['GERENTE', 'RECEPCION'] : ['GERENTE']) {
    const p = persona();
    const cedula = `10650000${dosDigitos(consecutivoAdmin)}`;
    usuarios.push({
      numero_identificacion: cedula, id_gimnasio: g.id_gimnasio, tipo_identificacion: 'CC', nombre: p.nombre, apellidos: p.apellidos,
      telefono: telefono(), correo: `${sinTildes(p.nombre.split(' ')[0])}.${sinTildes(p.apellidos.split(' ')[0])}.${dosDigitos(consecutivoAdmin)}@${g.dominio}`,
      contrasena_hash: `hash-prueba-admin-${consecutivoAdmin}`, foto_url: null, estado: 'ACTIVO', fecha_registro: g.fecha_registro, tipo_usuario: 'ADMINISTRADOR',
    });
    administradores.push({ numero_identificacion: cedula, rol });
    consecutivoAdmin++;
  }
}

// Instructores
let consecutivoInstructor = 1;
for (const g of gimnasios) {
  for (let i = 0; i < g.instructores; i++) {
    const p = persona();
    const cedula = `1065200${String(consecutivoInstructor).padStart(3, '0')}`;
    const contratacion = fechaEntre(g.fecha_registro, fechaRel('2026-08-31'));
    usuarios.push({
      numero_identificacion: cedula, id_gimnasio: g.id_gimnasio, tipo_identificacion: probabilidad(0.9) ? 'CC' : 'CE', nombre: p.nombre, apellidos: p.apellidos,
      telefono: telefono(), correo: `${sinTildes(p.nombre.split(' ')[0])}.${sinTildes(p.apellidos.split(' ')[0])}.i${consecutivoInstructor}@${g.dominio}`,
      contrasena_hash: `hash-prueba-instr-${consecutivoInstructor}`,
      foto_url: probabilidad(0.5) ? `/recursos/instructores/${cedula}.jpg` : null,
      estado: consecutivoInstructor === 7 ? 'INACTIVO' : 'ACTIVO', fecha_registro: contratacion, tipo_usuario: 'INSTRUCTOR',
    });
    const inicio = elegir([5, 6, 7, 14, 15, 16]);
    instructores.push({
      numero_identificacion: cedula, id_gimnasio: g.id_gimnasio, activo: consecutivoInstructor !== 7,
      id_especialidad: elegir(especialidades).id_especialidad,
      disponibilidad: `${elegir(['Lunes a viernes', 'Lunes a sábado', 'Martes a sábado', 'Lunes, miércoles y viernes'])} ${inicio}:00-${inicio + 6}:00`,
      fecha_contratacion: contratacion,
    });
    consecutivoInstructor++;
  }
}
const instructoresDeGimnasio = (idGimnasio) => instructores.filter((i) => i.id_gimnasio === idGimnasio && i.activo);
// Instructor del gimnasio que ya estaba contratado en esa fecha (si no hay, el más antiguo)
function instructorEn(idGimnasio, dia) {
  const delGimnasio = instructoresDeGimnasio(idGimnasio);
  const contratados = delGimnasio.filter((i) => i.fecha_contratacion <= dia);
  return contratados.length ? elegir(contratados) : delGimnasio.reduce((a, b) => (a.fecha_contratacion < b.fecha_contratacion ? a : b));
}

// Clientes (100). El registro se ajusta después según su primera membresía.
let consecutivoCliente = 1;
for (const g of gimnasios) {
  for (let i = 0; i < g.clientes; i++) {
    const p = persona();
    const cedula = `1065100${String(consecutivoCliente).padStart(3, '0')}`;
    const menor = probabilidad(0.06);
    const nacimiento = menor ? fechaEntre(fechaRel('2009-01-01'), fechaRel('2011-12-31')) : fechaEntre(fechaRel('1965-01-01'), fechaRel('2006-12-31'));
    clientes.push({
      numero_identificacion: cedula, id_gimnasio: g.id_gimnasio, nombre: p.nombre, apellidos: p.apellidos,
      tipo_identificacion: menor ? 'TI' : elegir(['CC', 'CC', 'CC', 'CC', 'CC', 'CC', 'CC', 'CE', 'PP']),
      direccion: `${elegir(CALLES)} ${entero(1, 60)} # ${entero(1, 50)}-${dosDigitos(entero(1, 99))}, ${g.ciudad}`,
      fecha_nacimiento: nacimiento,
      huella_dactilar: probabilidad(0.5) ? sqlCrudo(`decode('${Array.from({ length: 16 }, () => entero(0, 15).toString(16)).join('')}', 'hex')`) : null,
      fecha_registro: fechaEntre(maxFecha(g.fecha_registro, fechaRel('2025-07-01')), fechaRel('2026-10-20')),
      estado: 'ACTIVO',
      membresias: [],
    });
    consecutivoCliente++;
  }
}

// ---------------------------------------------------------------------------
// 10/11 MEMBRESIAS e HISTORIAL (70 membresías para 60 clientes; 40 sin membresía)
// ---------------------------------------------------------------------------
const MESES = { MENSUAL: 1, SEMESTRAL: 6, ANUAL: 12 };
const PRECIO = { MENSUAL: 'precio_mensual', SEMESTRAL: 'precio_semestral', ANUAL: 'precio_anual' };
const membresias = [];
const historial = [];

function crearMembresia(cliente, plan, modalidad, inicio, estado) {
  const vencimiento = sumarDias(sumarMeses(inicio, MESES[modalidad]), -1);
  const m = {
    id_membresia: membresias.length + 1, id_plan: plan.id_plan, tipo_membresia: plan.nombre, modalidad_pago: modalidad,
    valor: plan[PRECIO[modalidad]], fecha_inicio: inicio, fecha_vencimiento: vencimiento, estado, cliente,
  };
  membresias.push(m);
  cliente.membresias.push(m);
  return m;
}
function modalidadAzar() {
  const r = azar();
  return r < 0.65 ? 'MENSUAL' : r < 0.9 ? 'SEMESTRAL' : 'ANUAL';
}
// Fecha de inicio para que la membresía siga vigente hoy
function inicioVigente(modalidad) {
  return sumarDias(HOY, -entero(0, MESES[modalidad] * 30 - 2));
}

const conMembresia = tomar(clientes, 60);
const renovaciones = new Set(conMembresia.slice(0, 10)); // estos 10 tienen una membresía anterior
conMembresia.forEach((cliente, i) => {
  const planesGimnasio = planes.filter((p) => p.id_gimnasio === cliente.id_gimnasio);
  // La membresía más reciente: 46 vigentes, 10 vencidas sin renovar y 4 canceladas
  const estado = i < 46 ? 'ACTIVA' : i < 56 ? 'VENCIDA' : 'CANCELADA';
  const modalidad = estado === 'ACTIVA' ? modalidadAzar() : 'MENSUAL';
  const inicio = estado === 'ACTIVA' ? inicioVigente(modalidad) : sumarDias(HOY, -entero(35, 200));

  if (renovaciones.has(cliente)) {
    // Membresía anterior que terminó justo el día antes de la actual
    const anteriorModalidad = elegir(['MENSUAL', 'MENSUAL', 'SEMESTRAL']);
    const anteriorInicio = sumarMeses(inicio, -MESES[anteriorModalidad]);
    crearMembresia(cliente, elegir(planesGimnasio), anteriorModalidad, anteriorInicio, 'VENCIDA');
  }
  const actual = crearMembresia(cliente, elegir(planesGimnasio), modalidad, inicio, estado);
  if (estado === 'CANCELADA') {
    actual.fecha_cancelacion = minFecha(sumarDias(inicio, entero(3, 20)), sumarDias(HOY, -1));
  }
});
membresias.sort((a, b) => a.fecha_inicio - b.fecha_inicio).forEach((m, i) => { m.id_membresia = i + 1; });

for (const cliente of clientes) {
  if (cliente.membresias.length) {
    // Se registró antes de su primera membresía
    const primera = cliente.membresias.reduce((a, b) => (a.fecha_inicio < b.fecha_inicio ? a : b));
    cliente.fecha_registro = sumarDias(primera.fecha_inicio, -entero(0, 10));
  }
  const vigente = cliente.membresias.find((m) => m.estado === 'ACTIVA');
  cliente.vigente = vigente ?? null;
  if (!vigente) {
    cliente.estado = cliente.membresias.length ? elegir(['INACTIVO', 'INACTIVO', 'SUSPENDIDO']) : elegir(['ACTIVO', 'ACTIVO', 'ACTIVO', 'INACTIVO']);
  }
}
// Dos clientes bloqueados (sin membresía vigente)
clientes.filter((c) => !c.vigente).slice(0, 2).forEach((c) => { c.estado = 'BLOQUEADO'; });

for (const m of membresias) {
  const fin = m.estado === 'ACTIVA' ? null : m.estado === 'CANCELADA' ? m.fecha_cancelacion : m.fecha_vencimiento;
  historial.push({
    id_historial: historial.length + 1, id_cliente: m.cliente.numero_identificacion, id_membresia: m.id_membresia,
    fecha_asignacion: m.fecha_inicio, fecha_fin: fin, activa: m.estado === 'ACTIVA',
  });
}

for (const c of clientes) {
  usuarios.push({
    numero_identificacion: c.numero_identificacion, id_gimnasio: c.id_gimnasio, tipo_identificacion: c.tipo_identificacion,
    nombre: c.nombre, apellidos: c.apellidos, telefono: telefono(),
    correo: `${sinTildes(c.nombre.split(' ')[0])}.${sinTildes(c.apellidos.split(' ')[0])}.${c.numero_identificacion.slice(-3)}@correo.co`,
    contrasena_hash: `hash-prueba-cliente-${c.numero_identificacion.slice(-3)}`, foto_url: null,
    estado: c.estado, fecha_registro: c.fecha_registro, tipo_usuario: 'CLIENTE',
  });
}

// ---------------------------------------------------------------------------
// 12 PAGOS
// ---------------------------------------------------------------------------
const pagos = [];
const METODOS = ['EFECTIVO', 'EFECTIVO', 'NEQUI', 'DAVIPLATA', 'TARJETA', 'TRANSFERENCIA'];
const referencia = (metodo) => ({ NEQUI: 'NEQ', DAVIPLATA: 'DAV', TARJETA: 'TRX', TRANSFERENCIA: 'BCO' }[metodo]);
function pago(m, fechaPago, metodo, estado, observaciones) {
  const pref = referencia(metodo);
  pagos.push({
    id_pago: pagos.length + 1, id_membresia: m.id_membresia, id_cliente: m.cliente.numero_identificacion, fecha_pago: fechaPago,
    valor: m.valor, metodo_pago: metodo, estado_pago: estado,
    referencia_transaccion: pref ? `${pref}-${entero(100000, 999999)}` : null, observaciones,
  });
}
for (const m of membresias) {
  if (probabilidad(0.12)) {
    // Intento rechazado y pago exitoso al día siguiente
    pago(m, m.fecha_inicio, 'TARJETA', 'RECHAZADO', elegir(['Fondos insuficientes', 'Tarjeta vencida', 'Transacción no autorizada por el banco']));
    pago(m, minFecha(sumarDias(m.fecha_inicio, 1), HOY), elegir(['EFECTIVO', 'NEQUI']), 'EXITOSO', 'Pago tras rechazo de tarjeta');
  } else if (dias(m.fecha_inicio, HOY) <= 3 && probabilidad(0.5)) {
    pago(m, m.fecha_inicio, 'TRANSFERENCIA', 'PENDIENTE', 'Pendiente de confirmación bancaria');
  } else {
    const metodo = elegir(METODOS);
    pago(m, m.fecha_inicio, metodo, 'EXITOSO', m.modalidad_pago === 'MENSUAL' ? null : `Pago ${m.modalidad_pago.toLowerCase()}`);
  }
}
pagos.sort((a, b) => a.fecha_pago - b.fecha_pago).forEach((p, i) => { p.id_pago = i + 1; });

// ---------------------------------------------------------------------------
// 13/14 RUTINAS y RUTINA_EJERCICIOS
// ---------------------------------------------------------------------------
const OBJETIVOS = ['Ganar fuerza', 'Ganar masa muscular', 'Bajar de peso', 'Mejorar condición física', 'Tonificar', 'Mejorar flexibilidad', 'Adaptación al entrenamiento'];
const NOMBRES_RUTINA = { 'Ganar fuerza': 'Fuerza base', 'Ganar masa muscular': 'Hipertrofia', 'Bajar de peso': 'Quema y cardio', 'Mejorar condición física': 'Acondicionamiento', 'Tonificar': 'Tonificación', 'Mejorar flexibilidad': 'Movilidad', 'Adaptación al entrenamiento': 'Iniciación' };
const COMBINACIONES_DIAS = [['LUNES', 'MIERCOLES', 'VIERNES'], ['MARTES', 'JUEVES'], ['LUNES', 'JUEVES'], ['LUNES', 'MARTES', 'JUEVES', 'VIERNES'], ['MARTES', 'JUEVES', 'SABADO'], ['LUNES', 'MIERCOLES'], ['SABADO']];
const NOTAS = ['Calentar 10 minutos antes', 'Cuidar la técnica antes que el peso', 'Descanso de 60 s entre series', 'Descanso de 90 s entre series', 'Subir 2,5 kg cuando completes todas las series', 'Ritmo controlado en la bajada', 'Respirar en la fase de esfuerzo'];
const rutinas = [];
const rutinaEjercicios = [];

const clientesConRutina = tomar(clientes.filter((c) => c.membresias.length), 55);
// Cinco clientes vigentes con más de 60 días en el gimnasio tienen una segunda rutina (la anterior ya terminada)
const antiguedad = (c) => dias(c.membresias.reduce((a, b) => (a.fecha_inicio < b.fecha_inicio ? a : b)).fecha_inicio, HOY);
const conSegundaRutina = new Set(clientesConRutina.filter((c) => c.vigente && antiguedad(c) >= 60).slice(0, 5));
for (const cliente of clientesConRutina) {
  const periodos = [];
  const primera = cliente.membresias.reduce((a, b) => (a.fecha_inicio < b.fecha_inicio ? a : b));
  const ultima = cliente.membresias.reduce((a, b) => (a.fecha_inicio > b.fecha_inicio ? a : b));
  if (conSegundaRutina.has(cliente)) {
    const inicioAnterior = primera.fecha_inicio;
    periodos.push({ inicio: inicioAnterior, fin: sumarDias(inicioAnterior, entero(20, 40)) });
    periodos.push({ inicio: sumarDias(periodos[0].fin, 1), fin: null });
  } else {
    const inicio = sumarDias(ultima.fecha_inicio, entero(0, 5));
    periodos.push({ inicio: minFecha(inicio, HOY), fin: ultima.estado === 'ACTIVA' ? (probabilidad(0.4) ? sumarDias(ultima.fecha_vencimiento, 0) : null) : (ultima.estado === 'CANCELADA' ? ultima.fecha_cancelacion : ultima.fecha_vencimiento) });
  }
  for (const periodo of periodos) {
    const objetivo = elegir(OBJETIVOS);
    const diasRutina = elegir(COMBINACIONES_DIAS);
    const rutina = {
      id_rutina: rutinas.length + 1, id_instructor: instructorEn(cliente.id_gimnasio, periodo.inicio).numero_identificacion, id_cliente: cliente.numero_identificacion,
      nombre: NOMBRES_RUTINA[objetivo], descripcion: `Rutina de ${NOMBRES_RUTINA[objetivo].toLowerCase()} de ${diasRutina.length} día(s) por semana.`,
      fecha_creacion: periodo.inicio, fecha_fin: periodo.fin && periodo.fin < periodo.inicio ? periodo.inicio : periodo.fin,
      dias_semana: diasRutina.join(','), objetivo,
    };
    rutinas.push(rutina);
    const disponibles = ejerciciosDeGimnasio(cliente.id_gimnasio);
    for (const dia of diasRutina) {
      tomar(disponibles, entero(3, 6)).forEach((e, orden) => {
        rutinaEjercicios.push({
          id_rutina_ejercicio: rutinaEjercicios.length + 1, id_rutina: rutina.id_rutina, id_ejercicio: e.id_ejercicio,
          orden: orden + 1, dia_semana: dia, notas_instructor: probabilidad(0.35) ? elegir(NOTAS) : null,
        });
      });
    }
  }
}

// ---------------------------------------------------------------------------
// 15 PROGRESOS (valoraciones mensuales de los clientes con membresía)
// ---------------------------------------------------------------------------
const progresos = [];
for (const cliente of clientes.filter((c) => c.membresias.length)) {
  const primera = cliente.membresias.reduce((a, b) => (a.fecha_inicio < b.fecha_inicio ? a : b));
  const ultimaFecha = cliente.vigente ? HOY : cliente.membresias.reduce((a, b) => (a.fecha_vencimiento > b.fecha_vencimiento ? a : b)).fecha_vencimiento;
  const altura = entero(150, 192) / 100;
  let imc = entero(190, 340) / 10;
  let grasa = entero(15, 38);
  const objetivo = imc > 25 ? 'Bajar de peso' : elegir(['Ganar masa muscular', 'Ganar fuerza', 'Tonificar']);
  const tendencia = objetivo === 'Bajar de peso' ? -1 : 1;
  for (let d = primera.fecha_inicio, n = 0; d <= minFecha(ultimaFecha, HOY) && n < 6; d = sumarDias(d, entero(28, 35)), n++) {
    const peso = Math.round(imc * altura * altura * 100) / 100;
    progresos.push({
      id_progreso: progresos.length + 1, id_cliente: cliente.numero_identificacion, fecha_registro: d,
      peso, altura, imc: Math.round(imc * 100) / 100, porcentaje_grasa: grasa,
      masa_muscular: Math.round(peso * (1 - grasa / 100) * 0.55 * 100) / 100, objetivo,
      observaciones: n === 0 ? 'Valoración inicial' : elegir([null, null, 'Buena adherencia', 'Mejoró resistencia', 'Ajustar alimentación', 'Constancia irregular']),
    });
    imc = Math.max(18, imc + tendencia * (objetivo === 'Bajar de peso' ? entero(2, 7) / 10 : entero(0, 3) / 10));
    grasa = Math.max(8, Math.round((grasa - entero(0, 15) / 10) * 100) / 100);
  }
}
progresos.sort((a, b) => a.fecha_registro - b.fecha_registro).forEach((p, i) => { p.id_progreso = i + 1; });

// ---------------------------------------------------------------------------
// 16 REGISTROS_INGRESOS (últimos 45 días)
// ---------------------------------------------------------------------------
const ingresos = [];
const desdeIngresos = sumarDias(HOY, -45);
function ingreso(cliente, dia, aprobado) {
  const entrada = entero(5 * 60, 20 * 60);
  const sigueAdentro = txtFecha(dia) === txtFecha(HOY) && probabilidad(0.6);
  ingresos.push({
    id_ingreso: 0, id_cliente: cliente.numero_identificacion, fecha: dia,
    hora_entrada: minutosAHora(entrada),
    hora_salida: !aprobado || sigueAdentro ? null : minutosAHora(Math.min(entrada + entero(40, 120), 23 * 60 + 30)),
    metodo_verificacion: cliente.huella_dactilar ? elegir(['HUELLAS', 'HUELLAS', 'HUELLAS', 'MANUAL']) : elegir(['QR', 'QR', 'MANUAL']),
    estado_verificacion: aprobado ? 'APROBADO' : 'RECHAZADO',
  });
}
for (const cliente of clientes) {
  for (const m of cliente.membresias) {
    const desde = maxFecha(m.fecha_inicio, desdeIngresos);
    const hasta = minFecha(m.estado === 'CANCELADA' ? m.fecha_cancelacion : m.fecha_vencimiento, HOY);
    for (let d = desde; d <= hasta; d = sumarDias(d, 1)) {
      if (d.getUTCDay() !== 0 && probabilidad(0.35)) ingreso(cliente, d, true);
    }
  }
  // Clientes sin membresía vigente que intentan entrar
  if (!cliente.vigente && probabilidad(0.3)) {
    for (let i = entero(1, 2); i > 0; i--) ingreso(cliente, fechaEntre(maxFecha(desdeIngresos, cliente.fecha_registro), HOY), false);
  }
}
ingresos.sort((a, b) => a.fecha - b.fecha || a.hora_entrada.localeCompare(b.hora_entrada)).forEach((r, i) => { r.id_ingreso = i + 1; });

// ---------------------------------------------------------------------------
// 17 CITAS (entre 60 días atrás y 30 adelante)
// ---------------------------------------------------------------------------
const TIPOS_CITA = ['VALORACION', 'VALORACION', 'SEGUIMIENTO', 'SEGUIMIENTO', 'ASESORIA', 'NUTRICION'];
const citas = [];
const clientesActivos = clientes.filter((c) => c.estado === 'ACTIVO');
for (let i = 0; i < 120; i++) {
  const cliente = elegir(clientesActivos);
  const dia = fechaEntre(maxFecha(cliente.fecha_registro, sumarDias(HOY, -60)), sumarDias(HOY, 30));
  const instructor = instructorEn(cliente.id_gimnasio, dia);
  const pasada = dia < HOY;
  const estado = pasada ? (probabilidad(0.8) ? 'COMPLETADA' : 'CANCELADA') : elegir(['PENDIENTE', 'PENDIENTE', 'CONFIRMADA', 'CONFIRMADA', 'CANCELADA']);
  citas.push({
    id_cita: 0, id_instructor: instructor.numero_identificacion, id_cliente: cliente.numero_identificacion, fecha: dia,
    hora: hora(entero(6, 20), elegir([0, 30])), tipo_cita: elegir(TIPOS_CITA), estado,
    notas: estado === 'CANCELADA' ? elegir(['El cliente reprogramará', 'Instructor incapacitado', 'Cancelada por el cliente']) : (probabilidad(0.3) ? elegir(['Traer ropa cómoda', 'Control de peso', 'Agendada por GymBrot', 'Revisar rutina']) : null),
  });
}
citas.sort((a, b) => a.fecha - b.fecha || a.hora.localeCompare(b.hora)).forEach((c, i) => { c.id_cita = i + 1; });

// ---------------------------------------------------------------------------
// 18/19 SESIONES y MENSAJES de GymBrot
// ---------------------------------------------------------------------------
const CONVERSACIONES = {
  CONSULTA_RUTINA: [
    ['¿Qué me toca entrenar hoy?', 'Hoy tienes {n} ejercicios en tu rutina. Empieza con un calentamiento de 10 minutos.'],
    ['¿Cuántas series hago?', 'Haz las series que indica tu rutina y descansa entre 60 y 90 segundos.'],
    ['¿Puedo cambiar un ejercicio?', 'Puedes cambiarlo por uno del mismo grupo muscular. Avísale a tu instructor.'],
  ],
  AGENDAR_CITA: [
    ['Quiero agendar una cita con mi instructor', 'Listo, te agendé la cita. Te llegará una confirmación.'],
    ['¿Tengo citas pendientes?', 'Te muestro tus próximas citas en la sección Mis citas.'],
  ],
  CONSULTA_MEMBRESIA: [
    ['¿Cuándo vence mi membresía?', 'Tu membresía vence el {vence}.'],
    ['¿Cómo renuevo mi plan?', 'Puedes renovar en recepción o pagar por Nequi o transferencia.'],
  ],
  CONSULTA_GENERAL: [
    ['¿Qué como antes de entrenar?', 'Una fruta con algo de proteína una hora antes funciona bien.'],
    ['¿A qué hora hay menos gente?', 'Entre las 9:00 y las 11:00 de la mañana suele haber menos gente.'],
    ['Me duele la rodilla, ¿qué hago?', 'Evita cargar la rodilla hoy y coméntaselo a tu instructor antes de entrenar.'],
  ],
};
const sesiones = [];
const mensajes = [];
const clientesVigentes = clientes.filter((c) => c.vigente);
for (let i = 0; i < 90; i++) {
  const cliente = elegir(clientesVigentes);
  const dia = fechaEntre(maxFecha(cliente.vigente.fecha_inicio, sumarDias(HOY, -45)), HOY);
  const inicio = entero(6 * 60, 22 * 60);
  const intencion = elegir(Object.keys(CONVERSACIONES));
  const sesion = {
    id_sesion: 0, id_cliente: cliente.numero_identificacion, fecha: dia, hora_inicio: minutosAHora(inicio), hora_fin: null,
    contexto_activo: { CONSULTA_RUTINA: 'Rutina del día', AGENDAR_CITA: 'Agendar cita', CONSULTA_MEMBRESIA: 'Estado de la membresía', CONSULTA_GENERAL: 'Consulta general' }[intencion],
    cliente, intencion, inicio,
  };
  sesiones.push(sesion);
}
sesiones.sort((a, b) => a.fecha - b.fecha || a.inicio - b.inicio).forEach((s, i) => { s.id_sesion = i + 1; });
for (const s of sesiones) {
  let segundos = s.inicio * 60 + entero(5, 40);
  // Las citas que el bot pudo haber agendado: del mismo cliente, el mismo día o después
  const citaDelCliente = citas.find((c) => c.id_cliente === s.id_cliente && c.fecha >= s.fecha && c.estado !== 'CANCELADA');
  for (const [pregunta, respuesta] of tomar(CONVERSACIONES[s.intencion], entero(1, CONVERSACIONES[s.intencion].length))) {
    for (const [remitente, texto] of [['CLIENTE', pregunta], ['GYMBROT', respuesta]]) {
      const marca = sumarDias(s.fecha, 0);
      marca.setUTCSeconds(segundos);
      const esAgenda = remitente === 'GYMBROT' && texto.startsWith('Listo, te agendé');
      mensajes.push({
        id_mensaje: mensajes.length + 1, id_sesion: s.id_sesion, id_cita: esAgenda && citaDelCliente ? citaDelCliente.id_cita : null,
        remitente, contenido: texto.replace('{n}', entero(3, 6)).replace('{vence}', txtFecha(s.cliente.vigente.fecha_vencimiento)),
        timestamp_msg: marca.toISOString().slice(0, 19).replace('T', ' '), tipo_intencion: s.intencion,
      });
      segundos += entero(3, 90);
    }
  }
  s.hora_fin = minutosAHora(Math.min(Math.ceil(segundos / 60) + 1, 23 * 60 + 59));
}

// ---------------------------------------------------------------------------
// 09/20 PLANTILLAS y NOTIFICACIONES
// ---------------------------------------------------------------------------
const plantillas = [
  { id_gimnasio: null, nombre: 'Bienvenida', tipo: 'EMAIL', asunto: 'Bienvenido a {gimnasio}', cuerpo: 'Hola {nombre}, te damos la bienvenida a {gimnasio}.', variables: '{nombre},{gimnasio}', activa: true },
  { id_gimnasio: null, nombre: 'Recordatorio de vencimiento', tipo: 'EMAIL', asunto: 'Tu membresía vence pronto', cuerpo: '{nombre}, tu plan {plan} vence el {fecha_vencimiento}.', variables: '{nombre},{plan},{fecha_vencimiento}', activa: true },
  { id_gimnasio: null, nombre: 'Confirmación de cita', tipo: 'SMS', asunto: null, cuerpo: 'Hola {nombre}, tu cita es el {fecha} a las {hora} con {instructor}.', variables: '{nombre},{fecha},{hora},{instructor}', activa: true },
  { id_gimnasio: null, nombre: 'Pago recibido', tipo: 'EMAIL', asunto: 'Recibimos tu pago', cuerpo: '{nombre}, recibimos tu pago de {valor}. ¡Gracias!', variables: '{nombre},{valor}', activa: true },
  { id_gimnasio: null, nombre: 'Feliz cumpleaños', tipo: 'SMS', asunto: null, cuerpo: '¡Feliz cumpleaños, {nombre}! Hoy tu entrada es con un invitado.', variables: '{nombre}', activa: false },
  ...gimnasios.map((g) => ({ id_gimnasio: g.id_gimnasio, nombre: `Promoción ${g.nombre}`, tipo: 'EMAIL', asunto: 'Trae a un amigo y gana un mes', cuerpo: '{nombre}, refiere a un amigo y recibe un mes gratis.', variables: '{nombre}', activa: g.estado === 'ACTIVO' })),
].map((p, i) => ({
  id_plantilla: i + 1, id_gimnasio: p.id_gimnasio, nombre: p.nombre, tipo: p.tipo, asunto: p.asunto,
  cuerpo_html: p.tipo === 'EMAIL' ? `<p>${p.cuerpo}</p>` : null, cuerpo_texto: p.cuerpo, variables_disponibles: p.variables, activa: p.activa,
}));

const notificaciones = [];
const gimnasioPorId = Object.fromEntries(gimnasios.map((g) => [g.id_gimnasio, g]));
const clientePorId = Object.fromEntries(clientes.map((c) => [c.numero_identificacion, c]));
const usuarioPorId = Object.fromEntries(usuarios.map((u) => [u.numero_identificacion, u]));
function notificar(cliente, idPlantilla, asunto, contenido, momento, origen) {
  const futuro = momento > HOY;
  const estado = futuro ? 'PENDIENTE' : probabilidad(0.08) ? 'FALLIDO' : 'ENVIADO';
  const plantilla = plantillas[idPlantilla - 1];
  notificaciones.push({
    id_notificacion: 0, id_cliente: cliente.numero_identificacion, id_plantilla: idPlantilla, tipo: plantilla.tipo,
    asunto: plantilla.tipo === 'SMS' ? null : asunto, contenido, estado_envio: estado,
    fecha_envio: estado === 'PENDIENTE' ? null : `${txtFecha(momento)} ${hora(entero(7, 19), entero(0, 59))}:00`, origen,
    orden: momento,
  });
}
for (const c of clientes) {
  const g = gimnasioPorId[c.id_gimnasio];
  notificar(c, 1, `Bienvenido a ${g.nombre}`, `Hola ${c.nombre}, te damos la bienvenida a ${g.nombre}.`, c.fecha_registro, 'SISTEMA');
}
for (const m of membresias) {
  const aviso = sumarDias(m.fecha_vencimiento, -5);
  if (aviso <= sumarDias(HOY, 5) && m.estado !== 'CANCELADA') {
    notificar(m.cliente, 2, 'Tu membresía vence pronto', `${m.cliente.nombre}, tu plan ${m.tipo_membresia} vence el ${txtFecha(m.fecha_vencimiento)}.`, aviso, 'SISTEMA');
  }
}
for (const p of pagos.filter((p) => p.estado_pago === 'EXITOSO')) {
  if (probabilidad(0.4)) notificar(clientePorId[p.id_cliente], 4, 'Recibimos tu pago', `${clientePorId[p.id_cliente].nombre}, recibimos tu pago de $${p.valor.toLocaleString('es-CO')}. ¡Gracias!`, p.fecha_pago, 'SISTEMA');
}
for (const c of citas.filter((c) => c.estado !== 'CANCELADA')) {
  if (probabilidad(0.5)) {
    const instructor = usuarioPorId[c.id_instructor];
    notificar(clientePorId[c.id_cliente], 3, null, `Hola ${clientePorId[c.id_cliente].nombre}, tu cita es el ${txtFecha(c.fecha)} a las ${c.hora} con ${instructor.nombre}.`, sumarDias(c.fecha, -1), elegir(['BOT', 'SISTEMA']));
  }
}
for (const c of tomar(clientes.filter((c) => gimnasioPorId[c.id_gimnasio].estado === 'ACTIVO'), 20)) {
  const idPlantilla = plantillas.find((p) => p.id_gimnasio === c.id_gimnasio).id_plantilla;
  notificar(c, idPlantilla, 'Trae a un amigo y gana un mes', `${c.nombre}, refiere a un amigo y recibe un mes gratis.`, fechaEntre(maxFecha(c.fecha_registro, fechaRel('2026-09-01')), HOY), 'MANUAL');
}
notificaciones.sort((a, b) => a.orden - b.orden).forEach((n, i) => { n.id_notificacion = i + 1; });

// ---------------------------------------------------------------------------
// Escritura de archivos
// ---------------------------------------------------------------------------
escribir('02_usuarios.sql', 'usuarios', 'entidad base; las contraseñas son hashes ficticios', ['numero_identificacion', 'id_gimnasio', 'tipo_identificacion', 'nombre', 'apellidos', 'telefono', 'correo', 'contrasena_hash', 'foto_url', 'estado', 'fecha_registro', 'tipo_usuario'], usuarios);
escribir('03_especialidades.sql', 'especialidades', 'catálogo', ['id_especialidad', 'nombre'], especialidades, 'id_especialidad');
escribir('04_clientes.sql', 'clientes', 'subtipo de USUARIOS; la huella es un valor ficticio', ['numero_identificacion', 'direccion', 'fecha_nacimiento', 'huella_dactilar'], clientes);
escribir('05_instructores.sql', 'instructores', 'subtipo de USUARIOS', ['numero_identificacion', 'id_especialidad', 'disponibilidad', 'fecha_contratacion'], instructores);
escribir('06_administradores.sql', 'administradores', 'subtipo de USUARIOS', ['numero_identificacion', 'rol'], administradores);
escribir('07_planes_membresias.sql', 'planes_membresias', 'tres planes por gimnasio', ['id_plan', 'id_gimnasio', 'nombre', 'descripcion', 'precio_mensual', 'precio_semestral', 'precio_anual', 'beneficios'], planes, 'id_plan');
escribir('08_ejercicios.sql', 'ejercicios', 'id_gimnasio NULL = catálogo base compartido', ['id_ejercicio', 'id_gimnasio', 'nombre', 'descripcion', 'grupo_muscular', 'series', 'repeticiones', 'duracion_minutos', 'nivel', 'recurso_url'], ejercicios, 'id_ejercicio');
escribir('09_plantillas_mensaje.sql', 'plantillas_mensaje', 'id_gimnasio NULL = plantilla del sistema', ['id_plantilla', 'id_gimnasio', 'nombre', 'tipo', 'asunto', 'cuerpo_html', 'cuerpo_texto', 'variables_disponibles', 'activa'], plantillas, 'id_plantilla');
escribir('10_membresias.sql', 'membresias', 'el plan define el gimnasio', ['id_membresia', 'id_plan', 'tipo_membresia', 'modalidad_pago', 'valor', 'fecha_inicio', 'fecha_vencimiento', 'estado'], membresias, 'id_membresia');
escribir('11_historial_membresias.sql', 'historial_membresias', 'asigna cada membresía a un cliente', ['id_historial', 'id_cliente', 'id_membresia', 'fecha_asignacion', 'fecha_fin', 'activa'], historial, 'id_historial');
escribir('12_pagos.sql', 'pagos', 'cada par cliente-membresía existe en HISTORIAL_MEMBRESIAS', ['id_pago', 'id_membresia', 'id_cliente', 'fecha_pago', 'valor', 'metodo_pago', 'estado_pago', 'referencia_transaccion', 'observaciones'], pagos, 'id_pago');
escribir('13_rutinas.sql', 'rutinas', 'instructor y cliente del mismo gimnasio', ['id_rutina', 'id_instructor', 'id_cliente', 'nombre', 'descripcion', 'fecha_creacion', 'fecha_fin', 'dias_semana', 'objetivo'], rutinas, 'id_rutina');
escribir('14_rutina_ejercicios.sql', 'rutina_ejercicios', 'ejercicios del catálogo base o del gimnasio del cliente', ['id_rutina_ejercicio', 'id_rutina', 'id_ejercicio', 'orden', 'dia_semana', 'notas_instructor'], rutinaEjercicios, 'id_rutina_ejercicio');
escribir('15_progresos.sql', 'progresos', 'altura en metros; imc = peso / altura^2', ['id_progreso', 'id_cliente', 'fecha_registro', 'peso', 'altura', 'imc', 'porcentaje_grasa', 'masa_muscular', 'objetivo', 'observaciones'], progresos, 'id_progreso');
escribir('16_registros_ingresos.sql', 'registros_ingresos', 'últimos 45 días', ['id_ingreso', 'id_cliente', 'fecha', 'hora_entrada', 'hora_salida', 'metodo_verificacion', 'estado_verificacion'], ingresos, 'id_ingreso');
escribir('17_citas.sql', 'citas', 'instructor y cliente del mismo gimnasio', ['id_cita', 'id_instructor', 'id_cliente', 'fecha', 'hora', 'tipo_cita', 'estado', 'notas'], citas, 'id_cita');
escribir('18_sesiones_gymbrot.sql', 'sesiones_gymbrot', 'conversaciones con el asistente', ['id_sesion', 'id_cliente', 'fecha', 'hora_inicio', 'hora_fin', 'contexto_activo'], sesiones, 'id_sesion');
escribir('19_mensajes_gymbrot.sql', 'mensajes_gymbrot', 'mensajes de cada sesión', ['id_mensaje', 'id_sesion', 'id_cita', 'remitente', 'contenido', 'timestamp_msg', 'tipo_intencion'], mensajes, 'id_mensaje');
escribir('20_notificaciones.sql', 'notificaciones', 'plantillas del sistema o del gimnasio del cliente', ['id_notificacion', 'id_cliente', 'id_plantilla', 'tipo', 'asunto', 'contenido', 'estado_envio', 'fecha_envio', 'origen'], notificaciones, 'id_notificacion');

// Versión para el Query Tool de pgAdmin: los 20 archivos en orden, sin comandos de psql
const pgadmin = [
  '-- =============================================================================',
  '-- DATOS DE PRUEBA GYMBROT — versión para pgAdmin (Query Tool)',
  '-- Generado por generar_datos.mjs: no editar a mano, regenerar.',
  `-- Fechas calculadas respecto a ${txtFecha(HOY)}.`,
  '-- Requiere haber ejecutado migraciones/001_creacion_esquema.sql en una base vacía.',
  '-- Contiene los archivos 01_ a 20_ en orden, sin \\i ni \\set (solo funcionan en psql).',
  '-- =============================================================================',
  "SET client_encoding = 'UTF8';",
  '',
  'BEGIN;',
  '',
  ...generados.sort((a, b) => a.archivo.localeCompare(b.archivo)).map((g) => `-- ===== ${g.archivo} =====\n${g.texto}`),
  'COMMIT;',
];
writeFileSync(join(CARPETA, '00_ejecutar_todo_pgadmin.sql'), pgadmin.join('\n') + '\n', 'utf8');
console.log(`${'00_ejecutar_todo_pgadmin.sql'.padEnd(28)} ${generados.length} archivos (HOY = ${txtFecha(HOY)})`);
