/* Respuestas del asistente Gymbrot AI.

   La vista #22 del legacy ejecutaba las acciones con un motor de intenciones de
   2000 lineas (crear cliente, agendar cita, asignar membresia...) y le pasaba
   el resultado a Groq solo para redactarlo. Aqui no hay backend y la clave de
   Groq no puede vivir en el navegador, asi que el chat quedo como interfaz:
   reconoce el tema del mensaje y responde con texto fijo, sin leer datos ni
   escribir nada. Los temas que todavia no existen en la version web se
   contestan como no disponibles en vez de inventar una respuesta. */

const SALUDO = "Hola, soy Gymbrot AI.";

const SOLO_INTERFAZ =
  "Esta versión del asistente es solo interfaz: todavía no leo datos del " +
  "gimnasio ni ejecuto acciones, solo muestro la conversación.";

export const BIENVENIDA =
  SALUDO +
  " Bienvenido al chat de Gymbrot. " +
  SOLO_INTERFAZ +
  ' Escribe "ayuda" para ver en qué puedo orientarte.';

/* Temas que el legacy atendia pero cuyos modulos no estan en esta version. */
const NO_DISPONIBLE: [RegExp, string][] = [
  [/\bcitas?\b|\bagendar\b|\breservar\b|\breprogramar\b/, "citas"],
  [/\brutinas?\b/, "rutinas"],
  [/\binstructores?\b|\bentrenadores?\b/, "instructores"],
  [/\bprogreso\b|\bmedidas\b|\bimc\b/, "progreso físico"],
  [/\bnotificaciones?\b|\brecordatorios?\b|\bsms\b|\bcorreos?\b/, "notificaciones"],
];

/* Temas que si tienen su propia seccion en la app. */
const DISPONIBLE: [RegExp, string, string][] = [
  [/\bdashboard\b|\bresumen\b|\bestadisticas?\b|\bingresos?\b|\bfinanzas?\b|\bventas?\b/, "finanzas y el dashboard", "Finanzas / Dashboard"],
  [/\bclientes?\b|\bsocios?\b|\busuarios?\b/, "clientes", "Clientes"],
  [/\bmembresias?\b|\babonos?\b|\bcuotas?\b|\bplanes?\b/, "membresías", "Membresías"],
  [/\bacceso\b|\bentradas?\b|\bsalidas?\b|\bhuella\b|\bcodigos?\b/, "control de acceso", "Control de Acceso"],
];

const GUIA =
  "Puedo orientarte sobre: clientes, membresías, control de acceso y " +
  'finanzas. Prueba con "ayuda", "clientes" o "membresias".';

/* Sin acentos ni mayusculas para que "Membresias" y "membresias" caigan en lo
   mismo. */
function normalizar(texto: string): string {
  return texto
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim();
}

export function respuestaIA(texto: string): string {
  const t = normalizar(texto);
  if (!t) return SOLO_INTERFAZ;

  if (
    /\bhola\b|\bbuenas\b|\bhey\b|\bsaludos\b|\bbuenos dias\b|\bbuenas tardes\b|\bbuenas noches\b/.test(t)
  ) {
    return SALUDO + " " + SOLO_INTERFAZ + " " + GUIA;
  }

  if (/\bayuda\b|\bque puedes hacer\b|\bque sabes hacer\b|\bcomo funcionas\b|\bque haces\b/.test(t)) {
    return (
      "Ahora mismo la interfaz del chat es una demostración, no ejecuto " +
      "acciones. " +
      GUIA
    );
  }

  for (const [patron, nombre] of NO_DISPONIBLE) {
    if (patron.test(t)) {
      return (
        "El módulo de " +
        nombre +
        " todavía no está en la versión web, así que no puedo ayudarte con " +
        "eso por ahora."
      );
    }
  }

  for (const [patron, nombre, seccion] of DISPONIBLE) {
    if (patron.test(t)) {
      return (
        "Lo de " +
        nombre +
        " se maneja desde la sección " +
        seccion +
        " del menú lateral. " +
        SOLO_INTERFAZ
      );
    }
  }

  return 'No sé a qué te refieres con eso. ' + GUIA;
}
