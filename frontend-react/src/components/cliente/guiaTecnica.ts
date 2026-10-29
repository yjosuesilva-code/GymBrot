import type { Ejercicio, GrupoMuscular, RutinaEjercicio } from "../../types";

export type PasoTecnico = {
  etapa: string;
  instruccion: string;
};

type GuiaEjercicio = {
  pasos: PasoTecnico[];
  nota: (repsTexto: string) => string;
};

function normalizarClave(texto: string): string {
  return texto
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim();
}

const GUIAS_POR_ID: Record<number, GuiaEjercicio> = {
  1: {
    pasos: [
      { etapa: "Posición inicial", instruccion: "Apoya cabeza, escápulas y glúteos en el banco; retrae las escápulas y afirma los pies contra el suelo con agarre ligeramente mayor al ancho de hombros." },
      { etapa: "Descenso controlado", instruccion: "Inhala y baja la barra en 2–3 segundos hacia la línea media del esternón con los codos a unos 45°–60° respecto al torso." },
      { etapa: "Rango y empuje", instruccion: "Toca suavemente el pecho sin rebotar y exhala empujando la barra hacia arriba y levemente atrás hasta extender sin perder la retracción escapular." },
    ],
    nota: (meta) => `Mantén los hombros lejos de las orejas y las muñecas rectas bajo la barra. Si la velocidad cae drásticamente antes de completar ${meta}, reduce un 5–10% la carga para conservar el control excéntrico.`,
  },
  2: {
    pasos: [
      { etapa: "Posición inicial", instruccion: "Ajusta el respaldo a 30°–45°, retrae escápulas contra el banco y sitúa las mancuernas a los lados del pecho con muñecas neutras." },
      { etapa: "Descenso controlado", instruccion: "Inhala y desciende las mancuernas con codos a 45° del torso hasta sentir un estiramiento profundo en la porción clavicular del pectoral." },
      { etapa: "Rango y empuje", instruccion: "Exhala y empuja en arco convergente sin chocar las mancuernas arriba, manteniendo la tensión constante en el pecho." },
    ],
    nota: (meta) => `Evita despegar la espalda alta del respaldo al empujar. Si arqueas en exceso el tórax para completar ${meta}, prioriza un peso que te permita controlar los últimos centímetros del descenso.`,
  },
  3: {
    pasos: [
      { etapa: "Posición inicial", instruccion: "Manos al ancho de los hombros, muñecas alineadas y core/glúteos contraídos en línea recta desde los talones a la cabeza." },
      { etapa: "Descenso controlado", instruccion: "Inhala y baja el cuerpo manteniendo los codos a unos 45° del torso (evitando abrirlos en 90° hacia los lados)." },
      { etapa: "Rango y empuje", instruccion: "Lleva el pecho a 2–3 cm del suelo y exhala mientras empujas con fuerza hasta la extensión completa sin bloquear los codos bruscamente." },
    ],
    nota: () => "Prioriza la técnica y el rango de movimiento sobre la velocidad. Si pierdes la tensión en el abdomen o arqueas la espalda baja antes de completar las 12 reps, apoya las rodillas para terminar la serie manteniendo la forma.",
  },
  4: {
    pasos: [
      { etapa: "Posición inicial", instruccion: "Da un paso al frente para estabilizar la base, inclina levemente el torso (15°) y mantén el core firme con codos semiflexionados fijos." },
      { etapa: "Fase de apertura", instruccion: "Inhala abriendo los brazos de forma controlada hasta que las manos queden alineadas con el plano de los hombros, sin hiperextender la cápsula articular." },
      { etapa: "Aducción y contracción", instruccion: "Exhala cerrando los brazos en un arco amplio como si abrazaras un árbol y sostén 1 segundo de máxima contracción pectoral al centro." },
    ],
    nota: (meta) => `El ángulo del codo no debe cambiar durante el recorrido para no convertir el cruce en un press de tríceps. Sostén 1 segundo en el cierre en cada una de ${meta}.`,
  },
  5: {
    pasos: [
      { etapa: "Posición inicial", instruccion: "Ajusta el asiento para que los agarres queden a la altura media del pecho; pega escápulas y cabeza al respaldo con los pies firmes." },
      { etapa: "Descenso controlado", instruccion: "Inhala permitiendo que los agarres retrocedan en 2 segundos manteniendo los codos ligeramente por debajo de la línea de los hombros." },
      { etapa: "Rango y empuje", instruccion: "Exhala empujando de forma fluida hasta casi extender los codos, evitando que los hombros se adelanten al final del movimiento." },
    ],
    nota: (meta) => `No permitas que las placas choquen entre repeticiones para sostener la tensión mecánica durante todas ${meta}.`,
  },
  6: {
    pasos: [
      { etapa: "Posición inicial", instruccion: "Sujeta la barra un poco más ancho que los hombros, fija los muslos bajo el rodillo, activa el abdomen e inclina el torso apenas 10°–15° atrás." },
      { etapa: "Tracción inicial", instruccion: "Inicia el movimiento deprimiendo las escápulas (hombros abajo) y exhala llevando la barra hacia la clavícula con los codos apuntando al suelo." },
      { etapa: "Retorno controlado", instruccion: "Inhala y extiende los brazos de forma controlada sin columpiar la zona lumbar ni perder la estabilidad de los hombros arriba." },
    ],
    nota: (meta) => `Imagina que tiras desde los codos hacia tus bolsillos y no con las manos. Si necesitas balancear el torso hacia atrás para terminar ${meta}, reduce la carga y prioriza la depresión escapular.`,
  },
  7: {
    pasos: [
      { etapa: "Posición inicial", instruccion: "Pies al ancho de caderas, bisagra de cadera con torso a ~45°, columna neutra, core compacto y mirada diagonal al suelo." },
      { etapa: "Tracción y retracción", instruccion: "Exhala traccionando la barra pegada a los muslos hacia la parte baja de las costillas, juntando las escápulas en el punto alto." },
      { etapa: "Descenso controlado", instruccion: "Inhala bajando la barra en 2 segundos hasta extender los brazos sin redondear la espalda media ni lumbar." },
    ],
    nota: (meta) => `La inclinación del torso debe permanecer fija toda la serie. Si notas que te incorporas dando tirones para alcanzar ${meta}, baja el peso para proteger la zona lumbar.`,
  },
  8: {
    pasos: [
      { etapa: "Posición inicial", instruccion: "Apoya mano y rodilla del mismo lado en el banco con espalda plana horizontal, pelvis neutra y hombro de apoyo activo." },
      { etapa: "Tracción en arco", instruccion: "Exhala llevando la mancuerna en trayectoria curva hacia la cadera (no hacia el hombro), manteniendo el codo cerca de las costillas." },
      { etapa: "Descenso controlado", instruccion: "Inhala descendiendo la mancuerna hasta estirar el dorsal sin rotar el tronco ni dejar caer el hombro." },
    ],
    nota: (meta) => `Lleva el peso hacia el bolsillo del pantalón para maximizar el reclutamiento del dorsal ancho. Completa el mismo número y calidad en ambos lados durante ${meta}.`,
  },
  9: {
    pasos: [
      { etapa: "Posición inicial", instruccion: "Cuelga con agarre prono ligeramente superior al ancho de hombros, piernas cruzadas o extendidas al frente con abdomen y glúteos en tensión." },
      { etapa: "Fase de ascenso", instruccion: "Deprime y retrae las escápulas antes de flexionar los codos; exhala tirando del pecho hacia la barra sin encoger el cuello." },
      { etapa: "Descenso controlado", instruccion: "Inhala bajando en 2–3 segundos hasta la extensión completa de los codos sin dejarte caer de golpe sobre los hombros." },
    ],
    nota: (meta) => `Evita el impulso con las piernas (kipping) para no perder estímulo en el dorsal. Si no logras subir la barbilla limpiamente en ${meta}, utiliza una banda elástica de asistencia.`,
  },
  10: {
    pasos: [
      { etapa: "Posición inicial", instruccion: "Barra sobre la mitad del pie, espinillas tocándola, agarre firme por fuera de las piernas, pecho alto, dorsal compacto y columna neutra." },
      { etapa: "Despegue y empuje", instruccion: "Toma aire en el abdomen (bracing) y empuja el suelo con las piernas manteniendo la barra rozando las espinillas y muslos." },
      { etapa: "Bloqueo y descenso", instruccion: "Extiende cadera y rodillas al unísono contrayendo glúteos arriba (sin hiperextender la espalda) y desciende iniciando con bisagra de cadera." },
    ],
    nota: (meta) => `Reinicia la tensión abdominal y escapular desde el suelo en cada repetición. Si la espalda baja pierde su neutralidad antes de completar ${meta}, detén la serie de inmediato.`,
  },
  11: {
    pasos: [
      { etapa: "Posición inicial", instruccion: "De pie con pies al ancho de caderas, glúteos y abdomen fuertemente contraídos; sujeta la barra sobre la clavícula con codos ligeramente adelantados." },
      { etapa: "Empuje vertical", instruccion: "Exhala empujando la barra en línea recta cerca del rostro y, al pasar la frente, alinea la cabeza debajo de la barra con los brazos extendidos." },
      { etapa: "Descenso controlado", instruccion: "Inhala bajando la barra en 2 segundos hacia la parte alta del pecho sin hiperextender la columna lumbar." },
    ],
    nota: (meta) => `Contrae glúteos y abdomen durante todo el recorrido para blindar la zona lumbar. Si arqueas la espalda baja antes de completar ${meta}, reduce ligeramente la carga.`,
  },
  12: {
    pasos: [
      { etapa: "Posición inicial", instruccion: "De pie con torso levemente inclinado hacia adelante (5°–10°), hombros bajos y codos con una ligera flexión fija de 15°." },
      { etapa: "Elevación en plano escapular", instruccion: "Exhala elevando los brazos unos 30° por delante del torso hasta que los codos alcancen la línea de los hombros." },
      { etapa: "Descenso controlado", instruccion: "Inhala descendiendo en 2–3 segundos sin dejar que las mancuernas descansen pegadas a los muslos al final." },
    ],
    nota: (meta) => `Lidera el movimiento desde los codos y evita encoger los trapecios hacia el cuello. Prioriza un descenso lento sobre el peso bruto en todas ${meta}.`,
  },
  13: {
    pasos: [
      { etapa: "Posición inicial", instruccion: "Polea a la altura del rostro con cuerda en agarre neutro (pulgares hacia atrás), paso atrás para tensar el cable y core firme." },
      { etapa: "Tracción y rotación externa", instruccion: "Exhala tirando de la cuerda hacia la frente mientras separas las manos y rotas los hombros externamente (pose de doble bíceps)." },
      { etapa: "Pausa y retorno", instruccion: "Sostén 1 segundo apretando deltoides posterior y trapecio medio, e inhala extendiendo los brazos sin dejar que el peso te arrastre." },
    ],
    nota: (meta) => `Este ejercicio es de control postural y salud articular, no de carga máxima. Sostén 1 segundo la rotación externa al final de cada una de ${meta}.`,
  },
  14: {
    pasos: [
      { etapa: "Posición inicial", instruccion: "Agarre supino al ancho de hombros, pecho alto, escápulas retraídas y codos pegados a las costillas." },
      { etapa: "Flexión concéntrica", instruccion: "Exhala flexionando los codos para elevar la barra en arco hasta el nivel de los hombros sin adelantar los codos." },
      { etapa: "Descenso excéntrico", instruccion: "Inhala bajando la barra en 2–3 segundos hasta la extensión completa sin balancear la cadera." },
    ],
    nota: (meta) => `Mantén las muñecas firmes y los codos fijos a los costados. Si necesitas impulsar con la espalda baja antes de completar ${meta}, baja el peso y cuida la fase negativa.`,
  },
  15: {
    pasos: [
      { etapa: "Posición inicial", instruccion: "De pie con abdomen firme y mancuernas a los lados en agarre neutro (palmas enfrentadas entre sí)." },
      { etapa: "Flexión controlada", instruccion: "Exhala subiendo las mancuernas con los pulgares apuntando arriba, manteniendo los codos inmóviles junto al torso." },
      { etapa: "Descenso completo", instruccion: "Inhala descendiendo en 2 segundos hasta estirar por completo el bíceps y el braquiorradial sin girar las muñecas." },
    ],
    nota: (meta) => `Evita acortar el rango inferior: extiende el brazo por completo en cada repetición sin balancear el cuerpo durante ${meta}.`,
  },
  16: {
    pasos: [
      { etapa: "Posición inicial", instruccion: "Frente a la polea alta, inclina el torso 10° al frente, activa el core y clava los codos a los costados del cuerpo." },
      { etapa: "Extensión completa", instruccion: "Exhala empujando el agarre hacia abajo hasta extender por completo los codos (abriendo la cuerda al final si usas cuerda)." },
      { etapa: "Retorno controlado", instruccion: "Inhala permitiendo que los antebrazos suban hasta formar unos 90° sin que los codos se separen ni se adelanten." },
    ],
    nota: (meta) => `Si los codos se despegan de las costillas, la carga está pasando al hombro y pectoral. Sostén 1 segundo de bloqueo en el tríceps en cada una de ${meta}.`,
  },
  17: {
    pasos: [
      { etapa: "Posición inicial", instruccion: "Acostado en banco plano, sostén la barra con brazos extendidos e inclinados apenas 10° hacia atrás de la vertical para mantener tensión continua." },
      { etapa: "Flexión controlada", instruccion: "Inhala flexionando únicamente los codos en 2–3 segundos para bajar la barra hacia la frente o ligeramente detrás de la cabeza." },
      { etapa: "Extensión", instruccion: "Exhala extendiendo los antebrazos sin abrir los codos hacia los lados, regresando a la inclinación inicial." },
    ],
    nota: (meta) => `Mantén los codos cerrados apuntando al techo y no hacia afuera. Controla el descenso para proteger el tendón del tríceps durante ${meta}.`,
  },
  18: {
    pasos: [
      { etapa: "Posición inicial", instruccion: "En suspensión sobre las paralelas con brazos extendidos, hombros deprimidos (lejos de las orejas) y core compacto." },
      { etapa: "Descenso controlado", instruccion: "Inhala bajando el cuerpo con codos pegados al torso hasta que los brazos formen un ángulo de 90°." },
      { etapa: "Empuje", instruccion: "Exhala empujando las barras hacia abajo con firmeza hasta volver a la posición inicial sin encoger los hombros." },
    ],
    nota: (meta) => `No bajes más allá de 90° si sientes incomodidad en la cara anterior del hombro. Mantén los codos cerca del cuerpo durante ${meta}.`,
  },
  19: {
    pasos: [
      { etapa: "Posición inicial", instruccion: "Apoya la barra sobre los trapecios, retrae escápulas, pies al ancho de hombros con puntas a 15°–30° y toma aire profundo en el abdomen (bracing)." },
      { etapa: "Descenso controlado", instruccion: "Desciende flexionando cadera y rodillas simultáneamente con columna neutra hasta que el pliegue de la cadera llegue al paralelo." },
      { etapa: "Rango y ascenso", instruccion: "Empuja el suelo con toda la planta del pie (trípode), manteniendo las rodillas alineadas con las puntas de los pies y exhalando en el tramo final." },
    ],
    nota: (meta) => `Refuerza la presión intraabdominal antes de cada bajada y evita que las rodillas colapsen hacia adentro al subir. Mantén la misma profundidad en todas ${meta}.`,
  },
  20: {
    pasos: [
      { etapa: "Posición inicial", instruccion: "Apoya toda la espalda y el sacro contra el respaldo, coloca los pies al ancho de hombros en la mitad de la plataforma y sujeta los agarres laterales." },
      { etapa: "Descenso controlado", instruccion: "Inhala bajando la plataforma en 2–3 segundos con las rodillas en dirección a los pies hasta alcanzar ~90° sin despegar el glúteo ni la zona lumbar." },
      { etapa: "Empuje sin bloqueo", instruccion: "Exhala empujando con talones y mediopié hasta casi extender las piernas, dejando una microflexión de seguridad en las rodillas." },
    ],
    nota: (meta) => `Nunca bloquees las rodillas en hiperextensión al final del empuje ni bajes tanto como para que la pelvis se levante del asiento durante ${meta}.`,
  },
  21: {
    pasos: [
      { etapa: "Posición inicial", instruccion: "De pie con una mancuerna en cada mano, hombros atrás, abdomen firme y da un paso controlado al frente manteniendo el ancho de caderas." },
      { etapa: "Descenso vertical", instruccion: "Inhala bajando la cadera en vertical hasta que ambas rodillas formen ~90° y la rodilla trasera quede a 2–3 cm del suelo." },
      { etapa: "Impulso y retorno", instruccion: "Exhala empujando con el talón y mediopié de la pierna delantera para volver con estabilidad sin que la rodilla oscile hacia adentro." },
    ],
    nota: (meta) => `Camina como sobre dos rieles de tren (no en cuerda floja) para conservar el equilibrio pélvico. Completa ${meta} por cada pierna con el mismo control.`,
  },
  22: {
    pasos: [
      { etapa: "Posición inicial", instruccion: "Alinea el eje de la máquina con tus rodillas, apoya el cojín sobre el tendón de Aquiles y presiona la pelvis contra el banco." },
      { etapa: "Flexión de rodilla", instruccion: "Exhala flexionando las rodillas para llevar el rodillo hacia los glúteos mientras mantienes la cadera pegada al tapiz." },
      { etapa: "Fase excéntrica", instruccion: "Inhala bajando el peso en 3 segundos controlados hasta casi extender por completo las piernas." },
    ],
    nota: (meta) => `Evita despegar la cadera del banco al subir el peso; si se levanta, estás compensando con la zona lumbar. Controla los 3 segundos de bajada en ${meta}.`,
  },
  23: {
    pasos: [
      { etapa: "Posición inicial", instruccion: "Sujeta la kettlebell por los cuernos pegada al esternón con codos apuntando abajo, pies un poco más anchos que los hombros y core firme." },
      { etapa: "Descenso profundo", instruccion: "Inhala bajando con el torso erguido, llevando los codos por dentro de las rodillas sin perder la neutralidad lumbar." },
      { etapa: "Empuje", instruccion: "Exhala empujando el suelo con toda la planta del pie mientras mantienes la pesa pegada al pecho hasta extender." },
    ],
    nota: (meta) => `No dejes que la kettlebell se separe del pecho, ya que tirará de tu espalda alta hacia adelante. Sostén 1 segundo abajo en cada una de ${meta}.`,
  },
  24: {
    pasos: [
      { etapa: "Posición inicial", instruccion: "Apoya el metatarso sobre el borde del escalón, rodillas extendidas sin hiperextender, abdomen activo y hombros bajo las almohadillas." },
      { etapa: "Extensión plantar", instruccion: "Exhala elevando los talones lo más alto posible presionando sobre el dedo gordo y segundo dedo, y sostén 1–2 segundos arriba." },
      { etapa: "Estiramiento controlado", instruccion: "Inhala bajando los talones por debajo del nivel del escalón en 2 segundos hasta sentir el estiramiento completo del gastrocnemio." },
    ],
    nota: (meta) => `El tendón de Aquiles actúa como un resorte si rebotas: haz una pausa de 1 segundo abajo y 1 segundo arriba en cada una de ${meta}.`,
  },
  25: {
    pasos: [
      { etapa: "Posición inicial", instruccion: "Apoya el borde inferior de las escápulas en el banco, barra con almohadilla sobre el pliegue de la cadera y pies a una distancia que deje las espinillas verticales arriba." },
      { etapa: "Extensión de cadera", instruccion: "Inhala abajo y exhala empujando desde los talones; sube en bloque con costillas cerradas y barbilla ligeramente recogida hacia el pecho." },
      { etapa: "Pausa y descenso", instruccion: "Bloquea arriba 1–2 segundos apretando los glúteos al máximo (con pelvis en ligera retroversión) y baja controlado sin arquear la espalda." },
    ],
    nota: (meta) => `Mantén la mirada al frente (no al techo) para evitar hiperextender la zona lumbar. La pausa de 1–2 segundos arriba es obligatoria en todas ${meta}.`,
  },
  26: {
    pasos: [
      { etapa: "Posición inicial", instruccion: "Pies al ancho de caderas, rodillas con una flexión suave y fija (15°–20°), escápulas retraídas y mancuernas pegadas a los muslos." },
      { etapa: "Bisagra de cadera", instruccion: "Inhala proyectando la cadera lejos hacia atrás mientras deslizas las mancuernas rozando las piernas hasta sentir tensión máxima en isquiotibiales." },
      { etapa: "Extensión de cadera", instruccion: "Exhala empujando el suelo y llevando la cadera hacia adelante mediante los glúteos e isquiotibiales sin encorvar la columna." },
    ],
    nota: (meta) => `El rango termina en cuanto tu cadera deja de ir hacia atrás (normalmente a mitad de la espinilla). No bajes más doblando la espalda durante ${meta}.`,
  },
  27: {
    pasos: [
      { etapa: "Posición inicial", instruccion: "Engancha la tobillera en la polea baja, inclina el torso unos 30° al frente sujetándote de la torre y activa el abdomen para fijar la pelvis." },
      { etapa: "Extensión controlada", instruccion: "Exhala llevando la pierna hacia atrás y ligeramente hacia afuera (15°) apretando el glúteo sin arquear la zona lumbar." },
      { etapa: "Retorno", instruccion: "Sostén 1 segundo en el punto de contracción e inhala regresando la pierna despacio hasta la línea del pie de apoyo." },
    ],
    nota: (meta) => `Un rango corto y controlado recluta el glúteo; patear demasiado alto solo arquea la espalda baja. Completa ${meta} por pierna sin impulso.`,
  },
  28: {
    pasos: [
      { etapa: "Posición inicial", instruccion: "Acostado boca arriba con la banda sobre las rodillas, talones cerca de los glúteos al ancho de caderas y zona lumbar apoyada." },
      { etapa: "Elevación y abducción", instruccion: "Exhala elevando la pelvis mientras empujas activamente las rodillas contra la banda para activar el glúteo medio y mayor." },
      { etapa: "Pausa y descenso", instruccion: "Mantén 1–2 segundos la línea recta entre hombros, cadera y rodillas, y baja vértebra por vértebra sin perder la tensión de la banda." },
    ],
    nota: (meta) => `Mantén la tensión constante contra la banda tanto al subir como al bajar durante todas ${meta}.`,
  },
  29: {
    pasos: [
      { etapa: "Posición inicial", instruccion: "Antebrazos en el suelo con codos exactamente bajo los hombros, pies juntos o al ancho de caderas y piernas completamente extendidas." },
      { etapa: "Activación total", instruccion: "Empuja el suelo con los antebrazos para activar el serrato, mete ligeramente la pelvis (retroversión) y contrae abdomen, glúteos y cuádriceps." },
      { etapa: "Respiración isométrica", instruccion: "Sostén la línea recta de cabeza a talones respirando de forma corta y controlada sin hundir la zona lumbar." },
    ],
    nota: (meta) => `No aguantes la respiración ni dejes caer la cadera. Si sientes tensión en la espalda baja antes de cumplir ${meta}, apoya las rodillas manteniendo el abdomen contraído.`,
  },
  30: {
    pasos: [
      { etapa: "Posición inicial", instruccion: "Apoya el codo directamente debajo del hombro, apila un pie sobre el otro (o uno delante del otro) y alinea cabeza, columna y pelvis." },
      { etapa: "Elevación lateral", instruccion: "Eleva la cadera del suelo activando oblicuos y glúteo medio del lado inferior, formando una diagonal firme sin rotar el pecho hacia el piso." },
      { etapa: "Control isométrico", instruccion: "Mantén el hombro de apoyo estable (lejos de la oreja) y respira de manera fluida durante todo el intervalo." },
    ],
    nota: (meta) => `Empuja fuerte el antebrazo contra el suelo para no colapsar sobre la articulación del hombro. Realiza ${meta} por cada lado.`,
  },
  31: {
    pasos: [
      { etapa: "Posición inicial", instruccion: "Acostado boca arriba con rodillas flexionadas, pies apoyados, zona lumbar en contacto con el suelo y manos a los lados de la cabeza sin entrelazar dedos." },
      { etapa: "Flexión torácica", instruccion: "Exhala todo el aire mientras enrollas la parte alta del tronco (acercando las costillas a la pelvis) hasta despegar solo las escápulas." },
      { etapa: "Pausa y descenso", instruccion: "Aprieta el abdomen 1 segundo arriba e inhala bajando despacio sin relajar por completo la tensión abdominal al tocar el suelo." },
    ],
    nota: (meta) => `Deja un espacio del tamaño de un puño entre la barbilla y el pecho para no tirar de las cervicales durante ${meta}.`,
  },
  32: {
    pasos: [
      { etapa: "Posición inicial", instruccion: "Cuelga de la barra con agarre firme, hombros activos (deprimidos) y ligera retroversión pélvica inicial para evitar el balanceo." },
      { etapa: "Elevación pélvica", instruccion: "Exhala subiendo las piernas y enrollando la pelvis hacia arriba (llevando el pubis hacia el esternón) para activar el recto abdominal." },
      { etapa: "Descenso sin péndulo", instruccion: "Inhala bajando las piernas en 2–3 segundos controlados, frenando la inercia antes de iniciar la siguiente repetición." },
    ],
    nota: (meta) => `Si subir con piernas rectas te hace arquear o balancearte antes de completar ${meta}, flexiona las rodillas pero conserva el enrollamiento de la pelvis arriba.`,
  },
  33: {
    pasos: [
      { etapa: "Posición inicial", instruccion: "De pie en postura atlética (rodillas semiflexionadas) perpendicular a la polea o banda a la altura del esternón, sujetándola pegada al pecho." },
      { etapa: "Extensión antirrotación", instruccion: "Exhala extendiendo los brazos completamente al frente mientras resistes con oblicuos y glúteos la tracción lateral de la banda." },
      { etapa: "Pausa y retorno", instruccion: "Sostén 2 segundos con los brazos extendidos sin que los hombros ni la cadera giren un solo grado, e inhala volviendo al pecho." },
    ],
    nota: (meta) => `La clave es la pausa de 2 segundos con brazos extendidos al frente. Completa ${meta} por cada lado manteniendo hombros y caderas cuadrados.`,
  },
  34: {
    pasos: [
      { etapa: "Postura de carrera", instruccion: "Mantén la mirada al frente, hombros relajados, codos a ~90° oscilando de adelante hacia atrás (sin cruzar el pecho) y torso erguido." },
      { etapa: "Pisada y cadencia", instruccion: "Aterriza con el mediopié debajo de tu centro de gravedad dando pasos cortos y ágiles para reducir el impacto en rodillas." },
      { etapa: "Control respiratorio", instruccion: "Coordina un ritmo constante (por ejemplo, inhalar en 3 pasos y exhalar en 2) que te permita sostener el esfuerzo continuo." },
    ],
    nota: (meta) => `No te sujetes de las barras delanteras de la caminadora; usa una inclinación del 1% y un ritmo estable para completar ${meta} con buena mecánica.`,
  },
  35: {
    pasos: [
      { etapa: "Ajuste del sillín", instruccion: "Regula la altura del asiento a la línea de tu cadera para que, en el punto más bajo del pedal, la rodilla conserve una flexión de 25°–30°." },
      { etapa: "Pedaleo redondo", instruccion: "Mantén el abdomen firme, espalda neutra y hombros lejos de las orejas mientras empujas y traccionas de forma fluida a 75–90 RPM." },
      { etapa: "Control de carga", instruccion: "Asegura una resistencia que sientas en los muslos sin que las caderas reboten sobre el sillín." },
    ],
    nota: (meta) => `Mantén las rodillas alineadas hacia el frente sin abrirlas hacia los lados durante ${meta}.`,
  },
  36: {
    pasos: [
      { etapa: "Posición de ataque (Catch)", instruccion: "Espinillas verticales, brazos extendidos, hombros relajados al frente y torso ligeramente inclinado desde la cadera (11 en punto) con espalda plana." },
      { etapa: "Secuencia de empuje (Drive)", instruccion: "Exhala aplicando el 60% de la potencia con las piernas, luego inclina el torso ligeramente atrás (1 en punto) y finaliza llevando el maneral bajo el pecho." },
      { etapa: "Recuperación (Recovery)", instruccion: "Inhala invirtiendo el orden exacto: primero extiende los brazos, luego inclina el torso y por último flexiona las rodillas." },
    ],
    nota: (meta) => `Respeta la secuencia Piernas → Cadera → Brazos al empujar y Brazos → Cadera → Piernas al regresar durante ${meta}.`,
  },
  37: {
    pasos: [
      { etapa: "Posición inicial", instruccion: "Pies algo más anchos que los hombros, kettlebell en el suelo a 30 cm al frente; inclínate en bisagra de cadera con espalda neutra y dorsales activos." },
      { etapa: "Bisagra y carga (Hike)", instruccion: "Inhala llevando la pesa hacia atrás entre los muslos altos (como un pase de fútbol americano) sin bajar las rodillas en sentadilla." },
      { etapa: "Extensión explosiva", instruccion: "Exhala extendiendo cadera y rodillas de golpe (bloqueando glúteos y abdomen en plancha de pie) para que la pesa flote hasta la altura del pecho." },
    ],
    nota: (meta) => `Los brazos actúan solo como cuerdas: nunca levantes la kettlebell con los hombros; toda la potencia nace del latigazo de cadera durante ${meta}.`,
  },
  38: {
    pasos: [
      { etapa: "Descenso y apoyo", instruccion: "Baja en sentadilla apoyando las manos al ancho de los hombros frente a los pies y lleva ambos pies atrás a posición de plancha firme." },
      { etapa: "Fase de suelo", instruccion: "Mantén el abdomen y los glúteos contraídos para que la cadera no se hunda al bajar el pecho al suelo." },
      { etapa: "Recogida y salto", instruccion: "Impulsa los pies de vuelta por fuera de las manos apoyando toda la planta (no solo las puntas) y salta extendiendo cadera y brazos arriba." },
    ],
    nota: (meta) => `Aterriza con los pies planos y anchos al recoger las piernas para proteger rodillas y tendón de Aquiles. Mantén un ritmo constante durante ${meta}.`,
  },
  39: {
    pasos: [
      { etapa: "Posición de rack", instruccion: "Sostén las mancuernas sobre los hombros con codos apuntando al frente y arriba, pies al ancho de hombros y core en máxima tensión." },
      { etapa: "Sentadilla frontal", instruccion: "Inhala descendiendo en sentadilla profunda con el torso erguido sin dejar que los codos caigan hacia abajo." },
      { etapa: "Empuje encadenado", instruccion: "Exhala subiendo con potencia de piernas y aprovecha esa inercia final para empujar las mancuernas en un solo movimiento fluido sobre la cabeza." },
    ],
    nota: (meta) => `No empujes con los brazos antes de terminar de extender la cadera: deja que las piernas lancen el peso hacia arriba en cada una de ${meta}.`,
  },
  40: {
    pasos: [
      { etapa: "Inicio en el suelo", instruccion: "Acostado boca arriba, prensa la kettlebell con muñeca recta y hombro encajado; flexiona la rodilla del mismo lado y apoya el brazo libre a 45°." },
      { etapa: "Incorporación por etapas", instruccion: "Rueda hacia el codo, pasa a la mano, eleva la cadera y desliza la pierna libre hacia atrás para quedar en zancada mirando siempre la pesa." },
      { etapa: "De pie y descenso inverso", instruccion: "Ponte de pie estabilizando el hombro a 90° arriba y desciende deshaciendo exactamente cada paso con control total." },
    ],
    nota: (meta) => `No apartes la vista de la kettlebell hasta estar completamente de pie y mantén el codo bloqueado en todo momento durante ${meta}.`,
  },
  41: {
    pasos: [
      { etapa: "Fase de sentadilla", instruccion: "Inicia con pies al ancho de hombros y baja con columna neutra y rodillas alineadas con las puntas de los pies." },
      { etapa: "Transición a flexión", instruccion: "Apoya las manos con firmeza, pasa a plancha activando abdomen y glúteos, y desciende el pecho con codos a 45°." },
      { etapa: "Recogida y salto", instruccion: "Regresa los pies con planta completa al suelo y despega en salto vertical amortiguando suavemente la caída." },
    ],
    nota: (meta) => `Mantén una cadencia fluida entre las tres estaciones sin sacrificar la alineación lumbar en la plancha durante ${meta}.`,
  },
  42: {
    pasos: [
      { etapa: "Posición inicial y bracing", instruccion: "Encaja la barra sobre los trapecios, retrae escápulas con fuerza y toma aire profundo en 360° antes de destrabar el rack." },
      { etapa: "Descenso de fuerza", instruccion: "Baja controlado en 2–3 segundos manteniendo el pecho firme y las rodillas siguiendo la línea de los pies hasta romper el paralelo." },
      { etapa: "Ascenso explosivo", instruccion: "Empuja el suelo con toda la planta del pie manteniendo la espalda rígida y exhala al superar el punto de estancamiento." },
    ],
    nota: (meta) => `En el protocolo de fuerza 5×5 cada repetición cuenta como una serie pesada: respeta los 3 minutos de descanso para completar ${meta} con máxima velocidad de barra.`,
  },
  43: {
    pasos: [
      { etapa: "Ajuste y apoyo", instruccion: "Regula el asiento para que el cojín quede en la parte media del esternón; apoya el pecho y sujeta los manerales con hombros bajos." },
      { etapa: "Tracción escapular", instruccion: "Exhala iniciando el gesto con la retracción de escápulas y lleva los codos hacia atrás pegados al cuerpo." },
      { etapa: "Fase excéntrica", instruccion: "Sostén 1 segundo la contracción dorsal e inhala extendiendo los brazos sin despegar el pecho del cojín." },
    ],
    nota: (meta) => `Aprovecha la estabilidad del apoyo pectoral para aislar el dorsal: no te impulses separando el torso del cojín durante ${meta}.`,
  },
  44: {
    pasos: [
      { etapa: "Posición inicial (30°)", instruccion: "Apoya escápulas y glúteos en el banco a 30°, pies firmes en el suelo y mancuernas alineadas con la parte alta del pecho." },
      { etapa: "Excéntrica de 3 segundos", instruccion: "Inhala contando 3 segundos reales de bajada con los codos a 45° del torso hasta estirar el pectoral superior." },
      { etapa: "Empuje convergente", instruccion: "Exhala empujando con potencia hacia la vertical de los hombros sin entrechocar las mancuernas arriba." },
    ],
    nota: (meta) => `Respeta estrictamente el tempo de 3 segundos al bajar en cada repetición; si aceleras el descenso para llegar a ${meta}, estás reduciendo el tiempo bajo tensión.`,
  },
  45: {
    pasos: [
      { etapa: "Estación de swing", instruccion: "Ejecuta la bisagra explosiva de cadera proyectando la kettlebell al frente con abdomen y glúteos bloqueados arriba." },
      { etapa: "Estación de goblet", instruccion: "Sujeta la pesa pegada al esternón y desciende en sentadilla profunda con el torso erguido y codos por dentro de las rodillas." },
      { etapa: "Estación de remo", instruccion: "Inclina el torso a 45° con columna neutra y tracciona la kettlebell hacia la cadera manteniendo el hombro lejos de la oreja." },
    ],
    nota: (meta) => `En las transiciones con kettlebell la prioridad es el agarre firme y la neutralidad lumbar: regula tu respiración para sostener la técnica durante ${meta}.`,
  },
};

const GUIAS_POR_GRUPO: Record<GrupoMuscular, GuiaEjercicio> = {
  Pecho: {
    pasos: [
      { etapa: "Posición inicial", instruccion: "Retrae y desciende las escápulas para crear una base estable, activa el core y alinea las muñecas con los antebrazos." },
      { etapa: "Fase excéntrica", instruccion: "Inhala y controla el descenso en 2–3 segundos manteniendo los codos a unos 45°–60° del torso para proteger el hombro." },
      { etapa: "Empuje y control", instruccion: "Exhala empujando con firmeza desde el pectoral hasta extender sin despegar los hombros ni bloquear los codos bruscamente." },
    ],
    nota: (meta) => `Prioriza la estabilidad escapular y un tempo controlado en la bajada. Si pierdes la postura de los hombros antes de terminar ${meta}, reduce ligeramente la carga.`,
  },
  Espalda: {
    pasos: [
      { etapa: "Posición inicial", instruccion: "Columna neutra, pecho proyectado, abdomen firme y hombros alejados de las orejas antes de iniciar la tracción." },
      { etapa: "Tracción activa", instruccion: "Inicia el movimiento juntando y bajando las escápulas; exhala llevando los codos hacia atrás o hacia la cadera." },
      { etapa: "Retorno controlado", instruccion: "Inhala extendiendo los brazos en 2 segundos para estirar el dorsal bajo control sin perder la tensión lumbar ni escapular." },
    ],
    nota: (meta) => `Concéntrate en traccionar desde los codos en lugar de cerrar con los bíceps. Sostén medio segundo de pausa en máxima contracción durante ${meta}.`,
  },
  Hombros: {
    pasos: [
      { etapa: "Posición inicial", instruccion: "Pies al ancho de caderas, glúteos y abdomen contraídos para evitar compensar arqueando la zona lumbar." },
      { etapa: "Elevación o empuje", instruccion: "Exhala desplazando la carga en el plano escapular (unos 30° por delante del torso) sin encoger los trapecios." },
      { etapa: "Descenso controlado", instruccion: "Inhala retornando el peso en 2–3 segundos hasta la posición inicial manteniendo tensión continua en el deltoides." },
    ],
    nota: (meta) => `Mantén el cuello relajado y evita usar impulso de las piernas o la cadera. Si necesitas balancearte para completar ${meta}, ajusta el peso a una carga estricta.`,
  },
  "Bíceps": {
    pasos: [
      { etapa: "Posición inicial", instruccion: "De pie con abdomen activo, escápulas estables y codos pegados a los costados del torso." },
      { etapa: "Flexión concéntrica", instruccion: "Exhala flexionando únicamente el codo sin adelantar los hombros ni balancear la espalda para levantar el peso." },
      { etapa: "Descenso excéntrico", instruccion: "Inhala bajando la carga en 2–3 segundos hasta la extensión completa del brazo para trabajar todo el rango." },
    ],
    nota: (meta) => `Fija los codos a los costados como bisagras inmóviles. Si el torso se inclina hacia atrás antes de llegar a ${meta}, prioriza la fase excéntrica lenta con menor carga.`,
  },
  "Tríceps": {
    pasos: [
      { etapa: "Posición inicial", instruccion: "Estabiliza los hombros hacia abajo y atrás, activa el core y fija los codos apuntando en una dirección constante." },
      { etapa: "Fase de flexión", instruccion: "Inhala doblando solo la articulación del codo de forma controlada hasta alcanzar un estiramiento completo del tríceps." },
      { etapa: "Extensión completa", instruccion: "Exhala extendiendo el antebrazo con firmeza sin separar los codos del cuerpo y sostén 1 segundo la contracción final." },
    ],
    nota: (meta) => `Evita mover los hombros al extender: todo el movimiento debe nacer en el codo. Mantén la pausa de 1 segundo al final de cada repetición durante ${meta}.`,
  },
  Piernas: {
    pasos: [
      { etapa: "Posición inicial", instruccion: "Pies firmes en trípode (talón, base del pulgar y meñique), abdomen compacto (bracing) y columna en posición neutra." },
      { etapa: "Descenso controlado", instruccion: "Inhala flexionando cadera y rodillas de forma controlada, asegurando que las rodillas sigan la dirección de la punta de los pies." },
      { etapa: "Empuje y ascenso", instruccion: "Exhala empujando el suelo con toda la planta del pie hasta extender sin colapsar las rodillas hacia adentro (valgo)." },
    ],
    nota: (meta) => `Mantén las rodillas alineadas con las puntas de los pies en todo el recorrido. Prioriza la profundidad controlada sobre la velocidad durante ${meta}.`,
  },
  "Glúteos": {
    pasos: [
      { etapa: "Posición inicial", instruccion: "Alinea pelvis y costillas activando el abdomen, barbilla ligeramente recogida y apoyo firme sobre los talones." },
      { etapa: "Fase excéntrica", instruccion: "Inhala articulando desde la cadera (bisagra) y manteniendo las espinillas estables sin arquear la espalda baja." },
      { etapa: "Extensión y bloqueo", instruccion: "Exhala extendiendo la cadera mediante una contracción máxima de los glúteos arriba durante 1–2 segundos." },
    ],
    nota: (meta) => `El movimiento debe originarse en la bisagra de cadera y no en la zona lumbar. Mantén la barbilla recogida y sostén 1 segundo de contracción arriba en ${meta}.`,
  },
  Abdomen: {
    pasos: [
      { etapa: "Posición inicial", instruccion: "Alinea la pelvis en ligera retroversión (cerrando el espacio entre costillas y cadera) y activa suelo pélvico y glúteos." },
      { etapa: "Control de tensión", instruccion: "Mantén la respiración fluida mientras sostienes la pared abdominal firme, evitando que la zona lumbar se arquee." },
      { etapa: "Ejecución técnica", instruccion: "Exhala en el punto de mayor esfuerzo concentrando el movimiento en el recto y transverso abdominal sin tirar del cuello." },
    ],
    nota: (meta) => `Si sientes fatiga o tensión en la espalda baja antes de alcanzar ${meta}, detén la serie, reajusta la retroversión pélvica y prioriza la calidad postural.`,
  },
  Cardio: {
    pasos: [
      { etapa: "Postura base", instruccion: "Torso erguido, mirada al frente, hombros relajados lejos de las orejas y core ligeramente activo." },
      { etapa: "Cadencia y respiración", instruccion: "Establece un ritmo constante coordinando inhalaciones nasales profundas y exhalaciones controladas." },
      { etapa: "Progresión y cierre", instruccion: "Mantén una técnica de impacto suave sobre las articulaciones y reserva el último minuto para reducir pulsaciones gradualmente." },
    ],
    nota: (meta) => `Mantén una cadencia sostenible desde el primer minuto para completar ${meta} sin deteriorar la postura ni encorvar los hombros por fatiga.`,
  },
  "Cuerpo completo": {
    pasos: [
      { etapa: "Posición inicial", instruccion: "Activa el core en 360°, apoya los pies con firmeza al ancho de los hombros y mantén la columna neutra." },
      { etapa: "Transición fluida", instruccion: "Coordina la potencia de cadera y piernas antes de transferir la fuerza hacia el tren superior y los brazos." },
      { etapa: "Recepción y control", instruccion: "Amortigua cada fase con rodillas y caderas alineadas, exhalando en el esfuerzo máximo sin perder la estabilidad lumbar." },
    ],
    nota: (meta) => `En ejercicios multiarticulares la fatiga técnica aparece antes que la muscular: mantén transiciones limpias y el abdomen firme durante ${meta}.`,
  },
};

export function obtenerPasosTecnicos(ejercicio: Ejercicio | undefined): PasoTecnico[] {
  if (!ejercicio) return [];
  // Solo el catálogo base es inmutable. Un ejercicio propio puede conservar su ID
  // aunque el gimnasio cambie su nombre, modalidad y técnica.
  const porId = ejercicio.gimnasio_id === null ? GUIAS_POR_ID[ejercicio.id_ejercicio] : undefined;
  if (porId) return porId.pasos;

  const descripcion = ejercicio.descripcion?.trim();
  if (descripcion) return [{ etapa: "Técnica del catálogo", instruccion: descripcion }];
  if (ejercicio.gimnasio_id !== null) {
    return [{ etapa: "Técnica pendiente", instruccion: "Consulta con tu instructor la técnica de este ejercicio." }];
  }

  if (normalizarClave(ejercicio.nombre).includes("flexiones de pecho")) {
    return GUIAS_POR_ID[3].pasos;
  }

  return GUIAS_POR_GRUPO[ejercicio.grupo_muscular]?.pasos ?? GUIAS_POR_GRUPO["Cuerpo completo"].pasos;
}

export function obtenerNotaEntrenador(fila: RutinaEjercicio): string {
  return fila.notas_instructor.trim() || "Tu instructor no ha dejado una nota para este ejercicio.";
}
