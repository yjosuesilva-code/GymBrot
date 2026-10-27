# Reglas y arquitectura de GymBrot

Inspección: **2026-10-26**. Rutas relativas a la raíz del repositorio. Revalida símbolos antes de actuar; no supongas que una propuesta documental ya está implementada.

## Evidencia y autoridad

| Evidencia | Qué establece |
| --- | --- |
| `DECISIONES.md`, D1–D5 | Multitenencia, identidad por gimnasio, API intercambiable, catálogo base/propio y responsabilidades de datos |
| `docs/MULTITENANT-SLUG.md` y resolución de tenant en código | Contexto del gimnasio por URL y control de acceso |
| `frontend-react/src/types/index.ts` | Contratos de rutina, registro, serie, avance y medición corporal |
| `frontend-react/src/data/api.ts` | Lectura/escritura, validación, contexto, avance y siguiente sesión |
| `frontend-react/src/lib/rutinas.ts` | Límites, validadores, resúmenes y ritmo previsto |
| `frontend-react/src/pages/MiRutina.tsx` y `components/cliente/AvanceCliente.tsx` | Experiencia cliente existente de rutina, guardado y avance |
| `frontend-react/src/styles/gymbrot.css` | Identidad, tokens y secciones de estilos |

El identificador literal **RN-RUT-09** no apareció en la documentación inspeccionada. La regla proviene del requisito del proyecto aportado por el usuario y coincide con `AvanceRutina` y `avanceDe` en la implementación. No presentes una ubicación documental inventada.

`DECISIONES.md` conserva textos de propuesta que pueden estar desfasados respecto al código. Registra discrepancias y consulta el contrato vigente, sin redefinir reglas por conveniencia visual.

## RN-RUT-09: cumplimiento

`RegistroEntrenamiento` representa una sesión completada. `avanceDe` cuenta registros de la rutina, usa `sesiones_planeadas ?? 0` y calcula porcentaje redondeado con tope 100 si existe meta positiva. La UI consume `api.rutinas.avance(id)`.

- Dos registros del mismo día o de la misma letra cuentan dos sesiones.
- No deduplicar por fecha/letra; prevenir envíos repetidos es un problema del guardado, no del indicador.
- Mostrar el numerador completo: «21 de 19 sesiones planeadas», barra 100 %, restantes 0.
- Sin meta positiva: «Sin meta de sesiones», contador real y porcentaje no aplicable. El 0 técnico de la API no significa 0 % de mejora física.
- Citas, inscripciones a clases, ingresos y ejercicios marcados en una sesión pendiente no sustituyen registros finalizados.

## Contratos de ejecución

Firmas inspeccionadas:
- `api.rutinas.registrarSesion(id: number, data: RegistroNuevo): Promise<ApiResp<RegistroEntrenamiento>>`.
- `RegistroNuevo = Pick<RegistroEntrenamiento, 'sesion' | 'fecha' | 'notas' | 'ejercicios_realizados'>`.
- `validarSeries(detalle: SerieRealizada[], ejercicio: Ejercicio): string | null`.
- `resumirSeries(detalle: SerieRealizada[])` devuelve campos resumen de `EjercicioRealizado`.

`SerieRealizada` contiene `numero`, `reps?`, `segundos?` y `peso_kg?`. `EjercicioRealizado.detalle_series?` es opcional por compatibilidad histórica. `RutinaEjercicio` es prescripción, no evidencia de ejecución.

Al revisar finalización T4, conserva sus reglas:
- Solo series realizadas; numeración consecutiva 1…N.
- Omitir ejercicios sin series realizadas; nunca enviar `detalle_series: []`.
- Por ejercicio, enviar `id_ejercicio` y `detalle_series`; la API recalcula resúmenes.
- REPETICIONES lleva reps y peso, sin segundos; TIEMPO lleva segundos y peso, sin reps.
- Reutilizar `MAX_REPS = 100`, `MAX_SEGUNDOS = 3600`, `MAX_PESO_KG = 500` y `validarSeries`. Reps enteros; peso decimal permitido; el validador no exige segundos enteros.
- `peso_kg: null` significa corporal en el registro. No sustituirlo por peso medido del cliente.
- Identidad, autor y gimnasio los establece la API, no la vista.

No uses los límites de validación como recomendaciones de entrenamiento.

## Consultas y significado

| Método/helper | Semántica y límite |
| --- | --- |
| `api.rutinas.avance(id)` | Cumplimiento total de la rutina |
| `api.rutinas.registros(id)` | Historial de esa rutina; fecha e id descendentes |
| `api.rutinas.siguienteSesion(id)` | Rotación de letras por último registro, ordenado por fecha y luego id; no agenda semanal |
| `idealAHoy(rutina)` | Ritmo lineal previsto durante la vigencia; usa 8 semanas si no hay fecha final. Referencia, no meta semanal pactada |
| `sesionesSugeridas(frecuencia, inicio, fin)` | Ayuda a calcular un total; no persiste un objetivo semanal |
| `api.progreso.byCliente(id)` | Mediciones de ese cliente; ordenar una copia por fecha antes de graficar |
| `utils.isoDate()` | Fecha civil local; no inferir horas ni duración |
| `progresoSesion` en `components/cliente/entrenamiento.ts` | Ejercicios completados dentro de la sesión temporal; no avance definitivo de la rutina |

Una consulta fallida no equivale a lista vacía. Tras guardar correctamente, un fallo al refrescar avance debe mostrar que el registro tuvo éxito y ofrecer recargar datos, sin volver a registrarlo.

## Arquitectura y privacidad

Stack inspeccionado: React 19, TypeScript, Vite, Bootstrap, Bootstrap Icons, Chart.js y `react-chartjs-2`. Usa la capa `api.ts`; no leas localStorage directamente desde vistas o selectores nuevos. El mock actual usa localStorage; Supabase/RLS está diferido. Los filtros frontend no son garantía de seguridad de producción.

El gimnasio se resuelve desde contexto/URL y acceso de sesión. La misma cédula en dos gimnasios corresponde a registros de cliente independientes, aunque pertenezcan a la misma persona; no autoriza unir historiales. Algunas consultas generales abarcan varios clientes del mismo gimnasio: estar dentro del tenant no basta para una vista personal.

- Deriva cliente y gimnasio del contexto autorizado; verifica propiedad de la rutina.
- Consulta métodos por cliente/rutina autorizados. No combines historiales por nombre o cédula global.
- Si falta identidad/contexto válido, muestra un estado de acceso; no hagas fallback a datos generales.
- Al cambiar cliente o gimnasio, invalida resultados previos; impide que respuestas tardías muestren información del ámbito anterior.
- No expongas notas privadas, identificadores o mediciones de otros clientes en gráficas, logs, capturas o prompts externos.
- No agregues compartición, rankings o exportaciones como consecuencia automática de diseñar progreso.

## Superficies e identidad

`MiRutina` ya contiene la experiencia de entrenamiento y avance; reutiliza `AvanceCliente`. `MiProgreso` y `DashboardCliente` son placeholders en esta inspección: sus textos no prueban contratos ni funcionalidades terminadas.

La estética usa fondo oscuro, brutalismo, neón `--neon`, acento celeste y las familias existentes Lexend, Space Grotesk e Inter. Reutiliza tokens y componentes como `card-g`, `btn-neon`, `form-control-dark` y Bootstrap Icons. Mantén foco visible y reduced-motion.

Para trabajo T4 conserva `.cli-*` y los límites de propiedad indicados por el encargo. Esta skill no otorga permiso para modificar componentes T3, navegación o estilos globales.
