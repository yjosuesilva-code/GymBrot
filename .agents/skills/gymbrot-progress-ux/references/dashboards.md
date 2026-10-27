# Dashboards, visualización y estados fitness

## Composición por superficie

Estas son direcciones de diseño condicionadas al alcance. En la inspección, MiRutina está implementada; MiProgreso y DashboardCliente son placeholders.

| Superficie | Pregunta principal | Orden propuesto | Evitar |
| --- | --- | --- | --- |
| MiRutina / Mi avance | ¿Qué completé y qué sesión sigue? | Rutina → completadas/planeadas → barra → restantes → ritmo previsto contextual → siguiente sesión y CTA | Gráficas, XP e historial avanzado al finalizar una etapa acotada |
| MiProgreso | ¿Qué ha cambiado en mis registros? | Periodo y tipo de información → indicador disponible → comparación o gráfico → detalle y cobertura | Mezclar peso corporal, cumplimiento y rendimiento en un índice |
| DashboardCliente | ¿Dónde estoy y qué puedo hacer ahora? | Estado de rutina → próximo paso → resumen breve de cumplimiento → frecuencia observada si procede → acceso a detalle | Todas las estadísticas, todos los módulos o tarjetas vacías de datos inventados |

Reutiliza componentes y rutas disponibles. Si una acción no tiene destino implementado, no muestres un botón operativo ficticio. Un wireframe puede señalar ese destino como propuesta.

Para varios planes, identifica de qué rutina proviene cada cifra. No mezcles registros de rutinas distintas sin una definición explícita del agregado.

## Jerarquía y densidad

- Una cifra principal debe tener nombre y unidad: «12 de 19 sesiones», no «63 %» aislado.
- Un porcentaje de cumplimiento debe decir «de la rutina completada», nunca «tu progreso físico».
- Coloca la siguiente acción cerca del contexto que la explica; evita varios CTA primarios compitiendo.
- Usa detalles por ejercicio para mostrar series, reps, segundos y carga; conserva unidades visibles aunque cambie el orden responsive.
- Prioriza lectura rápida; deja metodología, cobertura y tabla histórica accesibles bajo demanda.
- Mantén tokens oscuros, bordes y acento neón existentes. El neón destaca acción/selección; no es la única señal de éxito o error.
- No agregues animaciones, ilustraciones, tipografías o paquetes para compensar una métrica poco clara.

## Barras y metas

Para cumplimiento usa `progress` u otra semántica equivalente con etiqueta y valor accesibles. La barra se limita a 100; el texto conserva el recuento extra: «21 de 19». No uses ese elemento para una meta inexistente.

Para metas semanales futuras, muestra unidad, periodo, valor objetivo y progreso actual; especifica quién define la meta y cuándo entra en vigor. Si se cambia una meta, no reinterpretes semanas anteriores sin una regla explícita.

Un hito cumplido no debe sugerir que descansar hará perder progreso. El CTA siguiente puede ser consultar la próxima sesión; no presionar a entrenar inmediatamente.

## Elegir gráficos por pregunta

| Pregunta | Visualización útil cuando hay datos | Requisitos |
| --- | --- | --- |
| ¿Cuántas sesiones hubo cada semana? | Barras por intervalos equivalentes | Eje desde cero, semana parcial señalada, sesiones distintas de días activos |
| ¿Cómo cambió una medición? | Puntos/línea temporal simple | Unidad única, fechas reales, huecos por ausencias, sin suavizado que invente valores |
| ¿Qué hice en este ejercicio? | Tabla de series o comparación de dos registros | Carga y reps asociadas; modalidad y fechas visibles |
| ¿Qué días tengo registros? | Calendario derivado | «Sin registro» no «fallo»; varios registros del día consultables |
| ¿Cuánto del plan completé? | Barra + contador | RN-RUT-09; generalmente no necesita gráfico circular |

Usa Chart.js/react-chartjs-2 existentes si se autoriza un gráfico. No añadas librerías por defecto.

Toda visualización debe incluir título, periodo, unidades, cobertura y alternativa textual/tabular. Los tooltips no son el único acceso a valores. Permite teclado/foco para controles y evita depender de hover, color o gestos.

No mezcles kg, porcentaje y segundos en un mismo eje. Para líneas donde un eje recortado sea útil, haz visibles sus límites y evita exagerar cambios. No uses 3D, perspectiva ni suavizado engañoso.

Un punto muestra una medición, no una tendencia. Cero es un punto válido; dato ausente es hueco o «Sin datos», nunca caída a cero.

## Historial y calendario

Cuando estén autorizados, los registros deben conservar fecha, rutina/sesión y acceso a detalle disponible. Ordena de forma determinista, sin inferir hora a partir del ID. Diferencia «no realizó series registradas» de «este registro histórico no incluye detalle».

Un calendario puede resumir por día para navegación; no cambia el conteo RN-RUT-09. Muestra una etiqueta accesible por día, cantidad de registros y selección visible. Evita cuadrículas minúsculas que obliguen a tocar celdas difíciles; ofrece lista equivalente en móvil.

No deduzcas entrenamientos de citas, clases reservadas o entradas al gimnasio. No añadas recuperación de borradores ni seguimiento de actividad por defecto.

## Estados y acciones

| Estado | Mensaje/representación | Acción adecuada |
| --- | --- | --- |
| Cargando | Estado breve y estable, sin números falsos | Evitar saltos y envíos repetidos |
| Sin rutina | Explicar que no hay plan disponible | Canal existente para consultar al instructor, solo si existe |
| Rutina sin registros | «Aún no hay sesiones registradas»; 0 completadas con meta visible | Ver/iniciar sesión disponible |
| Sin meta de sesiones | Contador real, porcentaje no aplicable | No inventar objetivo |
| Sin mediciones | Explicar qué datos faltan, sin prometer métricas | Acción existente para registrar/consultar; no crear formulario implícitamente |
| Un dato comparable | Valor y fecha, sin tendencia | Explicar que hace falta otra observación |
| Datos parciales/legados | Cobertura visible y detalle no disponible | Mostrar lo respaldado, no rellenar |
| Consulta fallida | Error específico, no estado vacío | Reintentar lectura conservando datos válidos si procede |
| Guardando entrenamiento | CTA «Guardando…», estado anunciado y controles deshabilitados pertinentes | Bloquear envíos duplicados |
| Registro rechazado | Mostrar `res.mensaje` intacto; conservar resumen y series | Corregir y reintentar |
| Excepción de guardado | Mensaje comprensible y entrenamiento conservado | Reintentar sin borrar datos |
| Registro exitoso | Confirmación concreta de sesión y siguiente paso | Actualizar avance y sugerencia desde API |
| Guardado exitoso, actualización fallida | Separar ambos hechos; no mostrar fracaso del registro | Reintentar consulta, nunca otro guardado |

## Responsive y accesibilidad

Verifica 375 px, 768 px y escritorio; añade zoom y texto largo. En móvil, apila unidades/resultados sin scroll horizontal de la página. Si una tabla necesita desplazamiento interno, ofrece una alternativa legible; no ocultes columnas que cambian el significado.

Usa botones reales, labels visibles y foco perceptible. Los objetivos táctiles principales deberían aproximarse a 44 × 44 CSS px; comprueba tamaño/espaciado con la skill de accesibilidad, sin trasladar unidades nativas pt/dp a web.

Conserva navegación lógica por teclado y foco al abrir/cerrar detalles. Tras error, conduce al mensaje o campo afectado sin perder contexto; tras éxito, sitúa el foco en el contenido pertinente si se desmontó el control anterior. Una actualización de fondo no debe robar el foco.

Usa `aria-live="polite"` para confirmaciones y estados relevantes; reserva alertas para errores accionables. No anuncies cada tick de temporizador o cada cambio de animación. Combina color con texto/icono y respeta reduced-motion; nunca exijas confeti para entender un logro.

Los campos numéricos necesitan label, unidad, rango compartido, soporte decimal cuando corresponda y error asociado. No bloquees pegado ni sustituyas `null` corporal por cero para simplificar un input.
