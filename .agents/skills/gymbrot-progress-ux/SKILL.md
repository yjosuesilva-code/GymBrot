---
name: gymbrot-progress-ux
description: Diseña y revisa la experiencia de progreso fitness de GymBrot en MiProgreso, MiRutina y DashboardCliente. Úsala para cumplimiento de rutinas, constancia, rendimiento por ejercicio, dashboards, metas semanales, gráficos, historial, calendarios o gamificación ética. Contrasta datos y contratos reales, aplica RN-RUT-09 y distingue funciones disponibles de propuestas futuras. No sustituye asesoramiento clínico ni autoriza nuevas funcionalidades o cambios de reglas de negocio.
---

# GymBrot Progress UX

Convierte registros deportivos reales en información comprensible y acciones útiles. Mantén independientes **cumplimiento**, **constancia** y **rendimiento**; nunca los combines en un porcentaje de mejora física.

## Activación y alcance

Activa esta skill cuando el encargo trate del progreso de clientes de GymBrot, incluso si pide solo análisis, wireframes, textos, revisión o criterios de aceptación. Para ajustes genéricos de React, branding o CSS sin semántica fitness, utiliza la skill correspondiente.

La invocación no autoriza construir todas las capacidades descritas aquí. Respeta la etapa, los archivos permitidos y el modo solicitado:

- **Análisis o diseño:** produce decisiones y propuestas trazables; no cambies código.
- **Implementación autorizada:** aplica únicamente el subconjunto solicitado que respalden los contratos actuales. Separa cualquier nuevo requisito antes de implementarlo.

## Invariantes

1. **RN-RUT-09:** cada registro finalizado cuenta como una sesión. Usa el avance de la API; conserva el contador real y limita la barra al 100 %. No deduzcas sesiones de días únicos, letras A/B/C, series, citas o accesos.
2. Una prescripción no demuestra una ejecución. El progreso de una sesión aún en memoria tampoco es cumplimiento definitivo de la rutina.
3. Cero, ausencia, peso corporal `null`, estimación y dato observado tienen significados distintos.
4. No presentes volumen, peso corporal, frecuencia o carga máxima como diagnóstico, recuperación o mejora física global.
5. No inventes metas semanales, XP, insignias, récords, sensores o campos históricos. Descanso y ausencia de registro no son fracasos.
6. Usa la capa API, el cliente autenticado y el gimnasio activo. No mezcles personas por nombre o cédula entre gimnasios, ni uses datos reales en servicios externos para diseñar.

## Método operativo

### 1. Inspeccionar antes de proponer

Lee [reglas y arquitectura de GymBrot](references/gymbrot-rules.md) y [métricas](references/metrics.md). Revalida sus rutas y símbolos contra el código actual: son una fotografía del repositorio, no un contrato inmutable.

Identifica pantalla, tarea principal, alcance autorizado y comportamiento existente. Inspecciona tipos, API, helpers, componentes y tokens relacionados. Ante discrepancias documentales, registra la diferencia; no cambies una regla para hacer encajar un diseño. Si falta un contrato esencial, explica el bloqueo de esa capacidad y continúa solo con trabajo independiente respaldado por evidencia.

### 2. Construir una ficha por indicador

Antes de dibujar o calcular, anota:

| Campo | Decisión necesaria |
| --- | --- |
| Pregunta | Qué necesita entender o decidir el cliente |
| Dimensión | Cumplimiento, constancia, rendimiento o medición corporal independiente |
| Fuente | Tipo, método API y campo reales; ámbito de cliente/gimnasio/rutina |
| Disponibilidad | Existente, derivable o requiere nuevos datos/reglas |
| Definición | Unidad, fórmula si procede, denominador, periodo, orden y cobertura |
| Comparabilidad | Ejercicio/modalidad/contexto; qué datos se excluyen y por qué |
| Vacíos y errores | Diferenciar cero, ausencia, consulta fallida y datos insuficientes |
| Presentación | Texto principal, contexto, visualización y acción siguiente |

Una métrica derivable no es una función ya implementada ni permiso para añadirla. Si faltan datos, diseña un estado honesto; no rellenes con ceros o ejemplos presentados como reales.

### 3. Elegir una composición útil

Consulta [dashboards y estados](references/dashboards.md). Prioriza estado actual, significado y siguiente acción; ofrece detalles bajo demanda. Reutiliza `AvanceCliente` cuando corresponda.

Consulta [patrones fitness](references/fitness-patterns.md) para justificar decisiones. Diferencia lo documentado por otras aplicaciones de la adaptación propuesta para GymBrot. No copies pantallas ni importes funciones por popularidad.

Lee [gamificación](references/gamification.md) si aparecen metas, logros, XP, niveles, rachas o reconocimientos. Sin contratos, presenta una especificación futura con requisitos, nunca un saldo o logro ficticio.

### 4. Componer con las skills existentes

Usa [la matriz de reutilización](references/skills-reuse.md) para seleccionar solo las skills que aporten valor. Lee sus instrucciones al aplicarlas.

- `frontend-design`: jerarquía, cifras, unidades, CTA y feedback coherentes con oscuro/brutalista/neón.
- `ui-ux-pro-max`: interacción, formularios, móvil, foco y estados.
- `design-system`: tokens y consistencia, sin migrar el sistema visual.
- `accessibility` y `web-design-guidelines`: revisión semántica y visual.
- `vercel-react-best-practices`: estado derivado, carga de datos y rendimiento de React/Vite.

No requieren activarse todas. Sus ejemplos, dependencias y recomendaciones no amplían el encargo. Si falta Python, consulta directamente instrucciones y datos de `ui-ux-pro-max`; no instales herramientas por defecto.

### 5. Implementar solo cuando corresponda

Mantén la arquitectura React + TypeScript y la API como autoridad. Reutiliza reglas compartidas; deja formateo y composición en la UI. Para nuevas agregaciones autorizadas, separa funciones puras de selección/cálculo de los componentes y prueba sus casos límite.

Conserva identidad, componentes y propiedad de archivos. No introduzcas rutas, librerías, persistencia, exportaciones, seguimiento personal o cambios de contratos sin alcance explícito. En T4 respeta las restricciones vigentes y el prefijo CSS `.cli-*`.

En flujos de finalización, un error debe conservar el entrenamiento y permitir reintento. Distingue guardar una sesión de refrescar su avance: reintentar la consulta nunca debe crear otro registro.

### 6. Verificar y comunicar

Usa [criterios de validación](references/validation.md). Verifica fórmulas con datos sintéticos, comportamiento, privacidad, estados, teclado y tamaños 375/768/escritorio según el cambio. No afirmes haber probado herramientas o dispositivos que no ejecutaste.

Entrega:

- decisión UX y evidencia del proyecto;
- indicadores con dimensión, fuente, periodo y límites;
- capacidades actuales frente a requisitos futuros;
- cambios realizados, si se autorizaron, y pruebas con sus resultados;
- incertidumbres que afecten interpretación o seguridad.

Para una revisión, prioriza hallazgos accionables con archivo y línea. Para diseño, incluye estados vacíos/error y criterios de aceptación, además del caso ideal.
