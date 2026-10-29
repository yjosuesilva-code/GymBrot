# Gamificación ética y motivación sostenible

## Puerta de entrada

GymBrot no tiene contratos inspeccionados de XP, niveles, insignias ni otorgamiento de logros. Distingue:

1. **Feedback factual:** «Entrenamiento registrado» o «Completaste las sesiones planeadas», basado en una respuesta/contador real.
2. **Reconocimiento derivado:** un mensaje sobre un hito verificable dentro del historial disponible; no implica un logro persistido.
3. **Sistema de recompensas:** necesita alcance, reglas, datos y persistencia nuevos. No mostrar saldos, niveles o insignias como si ya existieran.

Esta referencia permite diseñar opciones y requisitos; no autoriza implementarlos.

## Principios

- Reconoce continuidad flexible, comprensión del plan y acciones verificadas. No premies cantidad ilimitada de sesiones, carga, calorías o pérdida de peso.
- No quites puntos/logros por descansar, enfermar, viajar o no abrir la aplicación.
- No conviertas un día sin registro en incumplimiento demostrado.
- No atribuyas valor moral al cuerpo, la intensidad o el rendimiento.
- No uses mensajes culpabilizadores, urgencia artificial o notificaciones insistentes.
- Mantén celebraciones breves, opcionales y compatibles con reduced-motion y lectores de pantalla.
- No incluyas rankings públicos ni comparaciones corporales por defecto. Cualquier opción social requiere consentimiento y límites de exposición.
- Personaliza con datos que existan, no con inferencias de salud, ánimo o condición física.

## Criterios por mecanismo

| Mecanismo | Uso razonable como propuesta | Requisito antes de construir |
| --- | --- | --- |
| Metas semanales | Objetivo acordado, periodo visible, descanso compatible | Objetivo persistido, vigencia, cambios y excepciones; no inferir desde total de rutina |
| Hitos | Reconocer finalizaciones verificables del plan | Definir evento, historial cubierto, elegibilidad y texto |
| Insignias | Reconocimiento opcional de hitos claros | Catálogo, regla verificable, versión y registro de otorgamiento |
| XP | Progresión lúdica explicada como tal | Eventos elegibles, límites, idempotencia y política de cambios; no presentarla como capacidad física |
| Niveles | Navegación motivacional por logros del sistema | Umbrales justificados, transparencia y ausencia de equivalencia clínica/deportiva |
| Rachas | Preferir semanas con metas flexibles a exigencia diaria | Objetivo existente, pausas y reglas acordadas; nunca pérdida punitiva |
| Récords | Máximos de un historial comparable delimitado | Métrica, ejercicio, periodo, elegibilidad, empates/correcciones y cobertura |
| Mensajes personalizados | Describir registro, plan y próximo paso | Datos válidos y lenguaje neutral; no prescribir recuperación o cargas |

No fijes valores de XP o umbrales arbitrarios como reglas definitivas. Si una propuesta los necesita, etiquétalos como decisiones pendientes con su justificación y riesgos.

## Especificación mínima de una recompensa futura

Documenta antes de programar:
- propósito para el cliente y dimensión que reconoce;
- evento autoritativo y condición exacta de elegibilidad;
- ámbito de cliente/gimnasio y periodo;
- fuente de verdad, persistencia e idempotencia por evento;
- política de correcciones, eliminaciones y datos históricos incompletos;
- tratamiento de duplicados, empates, cambios de objetivo y versiones;
- límites a incentivos de volumen/frecuencia y protección del descanso;
- privacidad, visibilidad y posibilidad de ocultar la capa lúdica;
- estados de carga, error y recompensa ya concedida;
- criterios de aceptación con ejemplos válidos e inválidos.

No concedas una recompensa por un clic de finalización ni por una actualización de pantalla: espera el registro exitoso y evita concederla otra vez al reintentar consultas. No cambies RN-RUT-09 para controlar recompensas; sus reglas serían independientes.

## Lenguaje útil

| Preferir | Evitar |
| --- | --- |
| «Registraste 3 sesiones esta semana» | «Solo hiciste 3; vas mal» |
| «Completaste las sesiones de tu plan» | «Estás 100 % en forma» |
| «Tu historial permite comparar estas dos sesiones» | «Tu fuerza mejoró» sin condiciones comparables |
| «Puedes consultar la siguiente sesión» | «Entrena ahora o perderás tu racha» |
| «Todavía no hay suficientes registros» | «Sin actividad» cuando solo falta información |

No prometas resultados clínicos, físicos o emocionales. Ante un periodo sin registros, ofrece orientación neutral y una acción disponible, sin atribuir causas personales.
