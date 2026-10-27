# Reutilización de las 15 skills locales

Inventario leído el **2026-10-26** en `.agents/skills`. Esta skill aporta semántica fitness y reglas de GymBrot; no reemplaza manuales visuales, WCAG o React. Lee la skill elegida antes de aplicarla y comprueba su disponibilidad actual.

| Skill exacta | Reutilización útil | Límite en GymBrot |
| --- | --- | --- |
| `frontend-design` | Jerarquía, tipografía, cifras, microcopy y estados | El brief oscuro/brutalista/neón prevalece; no rediseñar identidad para evitar una estética común |
| `ui-ux-pro-max` | Interacción, foco, targets, responsive y selección de gráficos | Python opcional para búsqueda; usar instrucciones/datos directamente si falta. No sustituir Bootstrap Icons ni importar reglas nativas a web |
| `design-system` | Roles de tokens, espaciado, tipografía y consistencia | Reutilizar sistema existente; no imponer Tailwind, nuevas capas o documentación ajena al alcance |
| `web-design-guidelines` | Auditoría de UI con hallazgos archivo:línea | En auditoría real consultar su fuente actual según sus instrucciones. Si no hay red, declarar límite; no fingir revisión vigente |
| `vercel-react-best-practices` | Estado derivado, handlers, consultas independientes y carga eficiente | Aplicar reglas React/Vite; RSC, server actions y APIs Next.js no se trasladan automáticamente |
| `accessibility` | Semántica, teclado, foco, contraste y alternativas a gráficos | Automatización no certifica accesibilidad. Verificar unidades/criterios normativos; no copiar cifras ambiguas de resúmenes |
| `vercel-composition-patterns` | Límites de responsabilidad y componentes reutilizables | Composición proporcional a la complejidad; no crear providers o APIs abstractas innecesarias |
| `webapp-testing` | UI real, capturas, consola y comportamiento | Comprobar disponibilidad de Python/Playwright/browser. Usar herramientas disponibles; no instalar por defecto |
| `verification-before-completion` | Evidencia reciente para afirmaciones y límites de pruebas | Lint/build no prueban fórmulas, seguridad ni experiencia visual |
| `systematic-debugging` | Discrepancias de conteos, series, consultas y estados | Activar ante fallos reproducibles; no exigir skills auxiliares ausentes |
| `brand` | Voz coherente y reconocimientos sin culpa | Verificar archivos de marca referenciados; no presuponer assets o helpers |
| `ui-styling` | Principios de estados, composición y responsive | shadcn/Radix/Tailwind no son requisitos ni autorización para migrar Bootstrap |
| `design` | Orientación hacia especialidades pertinentes | Logos, CIP, Gemini, claves, rutas .claude y generación no son dependencias de un dashboard |
| `banner-design` | Solo piezas de comunicación solicitadas | No activar para la UI funcional por defecto; no asumir skills auxiliares o generación disponibles |
| `slides` | Presentación de propuesta si se pide | Reglas de persuasión/decks no sustituyen componentes de producto |

## Lo que pertenece a gymbrot-progress-ux

- Definiciones independientes de cumplimiento, constancia y rendimiento.
- RN-RUT-09, denominadores, extras, ausencia de metas y periodos.
- Comparabilidad deportiva y diferencia entre detalle, resumen, prescripción y estimación.
- Disponibilidad real frente a propuestas que requieren nuevos datos.
- Motivación sostenible, descanso y condiciones para recompensas.
- Interpretación de estados vacíos, legado, cobertura y falta de evidencia.
- Privacidad de mediciones e historial por cliente y gimnasio.

No ejecutes una cadena completa de skills por defecto. Ejemplo: una revisión de «Mi avance» suele necesitar reglas/métricas de esta skill, `frontend-design` y criterios de interacción de `ui-ux-pro-max`; añade accesibilidad, React o pruebas según los cambios concretos.
