# Validación de decisiones y de la skill

## Casos de métricas y estados

Usa datos sintéticos; no publiques registros reales de clientes.

| Caso | Resultado esperado |
| --- | --- |
| 0 registros / 19 planeadas | 0 %, 19 restantes; estado inicial motivador |
| 12 / 19 | 63 % según API; 7 restantes |
| 21 / 19 | Contador 21/19, barra 100 %, restantes 0; no 110 % físico |
| Meta ausente o 0 | «Sin meta de sesiones», contador disponible, porcentaje no aplicable |
| Dos registros mismo día/letra | Dos sesiones para cumplimiento/frecuencia; un día activo |
| Sesión temporal aún no guardada | No aumenta cumplimiento definitivo |
| Semana incompleta | Periodo visible; no comparación engañosa con semana completa |
| Sin objetivo semanal | Frecuencia descriptiva, sin porcentaje de adherencia |
| Una observación | Valor/fecha disponibles; no tendencia ni mejora |
| Carga anterior 0 | Diferencia absoluta; no división por cero |
| Series con valores diferentes y 7.5 kg | Conserva valores; no multiplica resúmenes como si fueran idénticas |
| Peso corporal null / peso 0 / dato ausente | Tres estados distintos; no se inventa carga |
| Histórico sin detalle_series | Cuenta sesión; no reconstruye series ni volumen |
| REPETICIONES frente a TIEMPO | Unidades y campos adecuados; no comparación cruzada |
| Ejercicios distintos con mismo nombre | No se fusionan por nombre |
| Grasa ausente / masa muscular sin unidad | Sin caída a cero; unidad desconocida no graficada |
| Consulta vacía frente a consulta fallida | Estado vacío y error diferenciados |
| API de guardado ok=false | Mensaje intacto, estado y series conservados, reintento posible |
| Excepción de guardado | Entrenamiento conservado; feedback y reintento |
| Doble clic / respuesta lenta | Una solicitud de registro; CTA y controles coherentes |
| Guardado exitoso + fallo al refrescar | Confirmación conservada; reintento solo de lectura |
| Cambio de cliente/gimnasio con consulta pendiente | Sin datos del ámbito anterior ni respuestas tardías aplicadas |
| Propuesta XP/logros sin contratos | Requisitos futuros explícitos; no saldo ni recompensa ficticios |

Al implementar comparaciones o agregaciones nuevas autorizadas, prueba selección de registros, fechas límite, orden, unidades y cobertura. Una fórmula aislada correcta no basta si toma datos del cliente equivocado.

## Revisión visual e interacción

- 375 px, 768 px y escritorio; texto largo y zoom sin pérdida de contenido.
- Cifras con nombres, unidades y periodo; barra y contador coherentes.
- Teclado completo, botones reales, labels, foco visible y restauración de foco pertinente.
- Estados de carga/error/éxito distinguibles sin color; anuncios sin duplicación ni ruido de temporizador.
- Gráfico comprensible sin hover, con alternativa textual/tabular y cobertura de datos.
- Ausentes como huecos; series con diferentes unidades separadas.
- CTA táctil legible, sin paneles desbordados; reduced-motion respetado.
- Sin mensajes de culpa, penalización del descanso ni promesas clínicas.
- Consola sin nuevos errores, solicitudes sin duplicados y aislamiento de datos comprobado.

## Evidencia técnica proporcional al cambio

Para cambios React autorizados, ejecuta los checks del proyecto y los solicitados por el usuario, por ejemplo `npx.cmd tsc -b`, `npx.cmd eslint .` y `npm.cmd run build` desde `frontend-react`; revisa `git diff --check` y `git status`. No instales ni actualices dependencias para satisfacer una recomendación genérica.

Para cambios únicamente en esta skill, valida formato, referencias, descubrimiento y comportamiento de sus instrucciones. No necesitas compilar la aplicación para afirmar que sus fuentes no cambiaron.

Reporta qué se ejecutó y qué no. Las revisiones estáticas no son una prueba de lector de pantalla, un ensayo clínico ni una auditoría de seguridad de producción.

## Mantenimiento y reconocimiento de la skill

La estructura usa el estándar de carpeta con `SKILL.md` y frontmatter YAML `name`/`description`. Las referencias se cargan a demanda. No depende de Python, scripts de instalación ni un manifiesto particular de un solo agente.

Antes de distribuir:
1. Comprueba nombre `gymbrot-progress-ux`, descripción no vacía y YAML válido.
2. Comprueba que todos los enlaces locales del manifiesto existan dentro de la carpeta.
3. Comprueba que el catálogo local encuentre la skill para ambos agentes, si existe una herramienta disponible.
4. Distingue catálogo/formato compatible de activación real en una sesión de cada producto.
5. Ensaya un prompt realista: pide una propuesta basada en registros parciales, metas inexistentes y extras sobre el plan. Verifica que no invente datos ni unifique dimensiones.
6. Al cambiar contratos del proyecto, actualiza evidencia y casos; no conviertas esta fotografía en autoridad superior al código y las reglas aprobadas.

Documentación oficial consultada el 2026-10-26:
- [Codex: Build skills](https://learn.chatgpt.com/docs/build-skills): descubre skills locales en `.agents/skills`; `name` y `description` son obligatorios. Invocación explícita con `$gymbrot-progress-ux` o selector de skills.
- [Google Antigravity: Agent skills](https://www.antigravity.google/docs/skills?tab=ide): App, CLI e IDE admiten `.agents/skills`; manifiesto con descripción y nombre explícito compatible. Puede invocarse por nombre; las superficies documentadas convierten skills en comandos donde corresponda.

No hace falta modificar `skills-lock.json` para esta skill local ni duplicar su carpeta en `.agent`. Si no aparece en una sesión ya abierta, comprueba recarga/reinicio y configuración del host; no reinstales dependencias automáticamente.
