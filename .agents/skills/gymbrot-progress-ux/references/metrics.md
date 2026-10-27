# Métricas: significado, cobertura y comparabilidad

## Tres dimensiones independientes

| Dimensión | Pregunta | Medida válida | No implica |
| --- | --- | --- | --- |
| Cumplimiento | ¿Cuántas sesiones del plan he finalizado? | Registros completados / sesiones planeadas de una rutina | Mejora física, calidad de técnica o constancia semanal |
| Constancia | ¿Con qué frecuencia entrené durante este periodo? | Sesiones y días activos observados; meta semanal solo si está definida | Recuperación, intensidad o cumplimiento total del plan |
| Rendimiento | ¿Qué cambió en observaciones comparables de un ejercicio? | Peso, reps, series o segundos realmente registrados | Mejora general, diagnóstico o comparación justa entre personas |

Las mediciones corporales son otra información descriptiva, relacionada con objetivos que deben existir. No sumarlas a estas dimensiones ni convertir cambios de peso en un juicio de éxito.

## Cumplimiento

La definición de negocio pertenece a la API. Como criterio de prueba:

```text
C = número de registros finalizados de la rutina
P = sesiones planeadas
porcentaje = P > 0 ? min(100, round(100 × C / P)) : no aplicable en la UI
restantes = P > 0 ? max(0, P − C) : no aplicable
adicionales = P > 0 ? max(0, C − P) : no aplicable
```

No recalcules otra variante del porcentaje en cada componente. No sumes porcentajes de distintas rutinas; un agregado futuro necesitaría definir denominador, rutinas incluidas y periodo. La barra representa la meta, mientras el contador conserva registros adicionales.

Ejemplos sintéticos: 0/19 → 0 %; 12/19 → 63 %; 21/19 → 100 %, 0 restantes, 2 adicionales. Con P ausente/0, usa «Sin meta de sesiones» y conserva C.

## Constancia sin inventar una agenda

- Cuenta registros finalizados dentro de un intervalo explícito. Etiqueta fechas inicial/final.
- Cuenta días activos como fechas distintas dentro de ese intervalo. Dos sesiones el mismo día son dos sesiones y un día activo.
- Define el inicio de semana y criterio temporal de forma consistente; si el producto no los define, propón una convención visible, no una regla ya existente.
- `fecha` es YYYY-MM-DD, sin hora/zona persistida. Trátala como fecha civil; evita convertirla mediante UTC y desplazar un día.
- No compares una semana parcial con una completa como si ambas tuvieran igual exposición. Marca «semana en curso» o compara intervalos equivalentes.
- No infieras descanso planificado, enfermedad o incumplimiento desde días sin registros.
- `sesiones_planeadas` es un total de rutina; `idealAHoy` es una referencia temporal. Ninguno prueba una meta semanal personal.
- Sin objetivo semanal, muestra «3 sesiones registradas esta semana», no «3 de 4» ni «75 % de adherencia».
- Una tasa de adherencia exige denominador acordado, periodo y política de cambios/excepciones. Sin ellos, informa frecuencia observada.

## Rendimiento: seleccionar antes de calcular

Una comparación exige al menos dos observaciones elegibles. Indica historial cubierto, fechas, ejercicio y unidad.

1. Usa el mismo `id_ejercicio`; no fusiones por nombre. Diferentes IDs o variantes no se consideran equivalentes sin regla explícita.
2. Verifica modalidad REPETICIONES/TIEMPO y disponibilidad de campos. Si cambió el catálogo o no hay contexto histórico suficiente, declara la limitación o excluye la comparación.
3. Mantén carga, reps y tiempo asociados a su serie. No fabriques una serie combinando máximos de varias.
4. Para comparar carga, muestra también reps; «12 kg × 6» frente a «10 kg × 10» describe dos resultados, no prueba mejora global.
5. Para comparar reps, identifica una carga comparable. Para tiempo, confirma que sostener más duración tiene sentido en ese ejercicio; no lo supongas universal.
6. Técnica, rango de movimiento, asistencia, equipo, RPE/RIR y esfuerzo no están modelados suficientemente. No afirmes igualdad de condiciones ni prescribas progresión automática.
7. No extrapoles tendencias desde un punto ni predigas fuerza futura. «Sin datos suficientes para comparar» es un resultado válido.
8. Una variación porcentual necesita una base válida mayor que cero. Ante base cero, muestra valores absolutos; evita infinito y porcentajes arbitrarios.

### Series y resúmenes no son intercambiables

`resumirSeries` conserva cantidad de series, reps/peso de la serie de mayor peso (desempate por reps) y máximo de segundos. Las reps resumen **no son suma ni promedio**; los segundos resumen **no son duración total**.

- Históricos sin `detalle_series` pueden acreditar una sesión; no reconstruyas series idénticas a partir del resumen.
- Suma reps o segundos solo desde detalle suficiente; indica cobertura parcial si falta detalle en parte del periodo.
- No calcules volumen multiplicando reps resumen × peso resumen × número de series.
- Un total de segundos ejecutados tampoco equivale al tiempo total del entrenamiento: faltan descansos, transiciones e inicio/fin.
- Mantén `7.5 kg` como decimal, aunque el formato español muestre «7,5 kg». No redondees el dato almacenado para compararlo.
- `null` en peso corporal no es cero kg de trabajo ni permite asignar el peso del cliente. Ausencia de peso tampoco demuestra peso corporal.
- Un cero registrado es un valor, no dato ausente. Preserva su significado y valida con las reglas compartidas.

### Máximos, volumen y estimaciones

«Máximo registrado en este historial» puede ser una derivación si defines ejercicio, métrica, periodo y registros elegibles. No lo llames récord vital ni lo presentes como sistema de PR ya existente.

Volumen de carga externa, si se autoriza, puede definirse como suma de reps × kg de series comparables con carga numérica. Es una derivación nueva, parcial cuando faltan datos, y no mide trabajo corporal total, técnica o beneficio. No mezcles ejercicios asistidos con carga externa sin una convención validada.

1RM, fuerza estimada, recuperación, calorías y puntuaciones compuestas requieren metodología, supuestos y alcance propios. No importar fórmulas de aplicaciones de referencia ni representarlas como observaciones.

## Inventario de disponibilidad

| Indicador/capacidad | Estado inspeccionado | Condiciones |
| --- | --- | --- |
| Cumplimiento, completadas, planeadas | Existente: `api.rutinas.avance` | Rutina del cliente autorizado |
| Restantes y adicionales | Derivable de avance | Meta positiva; no valores negativos |
| Ritmo previsto / próxima sesión | Existentes: helper y API | Etiquetar referencia / sugerencia, no agenda obligatoria |
| Frecuencia semanal / días activos | Derivables de registros | Periodo declarado, historial cubierto |
| Historial y calendario cliente | Registros disponibles; visualizaciones por implementar | Unir solo rutinas autorizadas si se pide alcance total; no contar reservas |
| Comparaciones por ejercicio | Derivables con cobertura suficiente | Mismo ejercicio, modalidad y unidades; detalle vs legado |
| Meta semanal y tasa de adherencia | Requieren objetivo/reglas nuevos | No asumir objetivo a partir del total planeado |
| XP, niveles, insignias, PR persistidos | Requieren contratos y reglas nuevos | Otorgamiento verificable, idempotencia, privacidad |
| Peso/altura/grasa/masa muscular | Tipo `Progreso` y API existentes | Unidades y campos opcionales; pantalla cliente pendiente |
| Sensores, RPE/RIR, calorías, medidas perimetrales | Sin contratos inspeccionados | No dibujar valores reales ni inferirlos |

## Mediciones corporales y gráficos

`Progreso` registra fecha, peso (kg), altura (m), porcentaje de grasa opcional, masa muscular opcional y notas. La unidad de `masa_muscular` no está documentada: no etiquetarla kg/% ni graficarla hasta verificarla.

Ordena una copia de `api.progreso.byCliente` por fecha; no asumas orden de inserción. Varias mediciones del mismo día requieren una política explícita: muestra ambas o declara el criterio de selección; no inventes la hora.

Ausencia de grasa/masa no vale cero. El gráfico administrativo existente en `pages/Progreso.tsx` convierte algunos ausentes a cero: no copies ese comportamiento ni mezcles kg y porcentajes en una escala común.

El helper de IMC existe, pero su disponibilidad no obliga a mostrarlo ni lo convierte en diagnóstico. El cambio de peso no tiene dirección positiva universal. Evita «mejoraste» sin objetivo y evidencia adecuados.
