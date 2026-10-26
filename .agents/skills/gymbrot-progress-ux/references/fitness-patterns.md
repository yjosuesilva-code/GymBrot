# Referencias conceptuales del sector fitness

Fuentes oficiales consultadas el **2026-10-26**. Las funciones pueden variar por región, versión y suscripción. Los hechos describen esas aplicaciones; las adaptaciones son inferencias de diseño para GymBrot, no funcionalidades existentes ni permiso de implementación.

## Strava: métrica y periodo explícitos

**Documentado:** las metas identifican deporte, métrica, valor y periodo; pueden contar actividades. Training Log organiza actividad por semanas y permite consultar detalles.
Fuentes: [Goals on the Strava App](https://support.strava.com/en-us/articles/15401694-goals-on-the-strava-app), [Training Log](https://support.strava.com/en-us/articles/15402077-training-log).

**Adaptación:** mostrar qué se cuenta y en qué intervalo; vincular una cifra a los registros que la respaldan cuando exista esa vista. Separar frecuencia semanal de cumplimiento de rutina.

**Límite:** no importar GPS, distancia, desnivel, suscripciones ni metas configurables. «3 sesiones esta semana» no necesita inventar un objetivo de cuatro.

## Nike Training Club: contexto y acompañamiento

**Documentado:** entrenamientos con propósito, series/reps, demostraciones y programas por fases. Una página regional documenta logros por entrenamientos y frecuencia, junto con recuperación activa.
Fuentes: [What Does the NTC App Offer?](https://www.nike.com/help/a/ntc-info/app), [Time to Move With Nike Training Club](https://www.nike.com/be/en/ntc-time-to-move).

**Adaptación:** explicar el siguiente paso y reconocer acciones verificables. Mantener descanso y recuperación compatibles con la continuidad; no exigir actividad diaria.

**Límite:** la página regional no garantiza disponibilidad universal. No confundir niveles de Nike Run Club con NTC ni añadir planes adaptativos o rachas a GymBrot por analogía.

## Fitbod: evolución por ejercicio

**Documentado:** sus métricas distinguen fuerza estimada, carga, reps y duración según ejercicio. Incluye historial y notas sobre equipos, ajustes o variaciones.
Fuentes: [Fitbod Metrics & Records](https://help.fitbod.me/hc/en-us/articles/12732749777047-Fitbod-Metrics-Records), [Exercise Notes](https://help.fitbod.me/hc/en-us/articles/21486783720087-Exercise-Notes).

**Adaptación:** comparar el mismo ejercicio con unidad y contexto visibles, identificar estimaciones y explicar cobertura insuficiente.

**Límite:** GymBrot no registra todos esos factores. No importar fórmulas propietarias, degradación por inactividad o convenciones sobre el peso de dos implementos. El contrato local determina qué significa la carga.

## Hevy: detalle y comparación contextual

**Documentado:** distingue récord de carga para un número concreto de reps de otros récords; las métricas elegibles dependen del ejercicio. Los valores anteriores pueden limitarse a la misma rutina y se diferencian de los prescritos.
Fuentes: [Set Records vs Personal Records](https://help.hevyapp.com/hc/en-us/articles/38279531346455-Set-Records-vs-Personal-Records), [Previous Workout Values](https://help.hevyapp.com/hc/en-us/articles/36011896355479-How-to-Use-Previous-Workout-Values-to-Improve-Performance-in-Hevy).

**Adaptación:** diferenciar «planificado», «realizado» y «anterior»; conservar los valores particulares de cada serie y el contexto de comparación.

**Límite:** más kg con menos reps no demuestra una mejora general. No introducir PR, 1RM, asistencia o categorías nuevas sin reglas. Peso corporal no se convierte en carga inventada.

## MyFitnessPal: resumen antes del detalle

**Documentado:** Progress Overview resume datos registrados por semana, ofrece tendencias y acceso a informes, y distingue esa vista del registro diario y la configuración de metas.
Fuente: [Introducing Progress Overview](https://support.myfitnesspal.com/hc/en-us/articles/45246617814669-Introducing-Progress-Overview-Your-Progress-Personalized).

**Adaptación:** pocos indicadores esenciales, periodo visible y detalle bajo demanda. Interpretar tendencias con cobertura suficiente; evitar juicios por un día aislado.

**Límite:** no importar nutrición, calorías, metas corporales o consejos personalizados sin datos. La función documentada tiene restricciones de región/idioma/versión y algunos consejos dependen del plan.

## Cómo usar estas referencias

Justifica cada decisión con la pregunta del cliente, los datos de GymBrot y el patrón útil. Por ejemplo: «El contador semanal incluye fechas y acceso al detalle porque el cliente necesita entender qué registros cuenta». Evita argumentos del tipo «esta app lo tiene, por tanto debemos añadirlo».

Prefiere lenguaje descriptivo y concreto: «Registraste 3 sesiones» o «Aún falta otra observación comparable». No uses promesas de transformación física, diagnósticos ni celebraciones de incrementos de carga sin contexto.
