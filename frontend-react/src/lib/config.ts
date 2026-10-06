// Metas del negocio compartidas entre paginas.
//
// Antes Dashboard usaba 1.200.000 y Finanzas 4.500.000 para el mismo KPI de
// ingresos mensuales. El mismo dato salia con dos porcentajes distintos
// (63% y 17%) segun la pantalla, porque cada pagina tenia su propia constante.
// La meta es una sola: la que se usa para calcular ingresos.
export const META_INGRESOS_MENSUAL = 4500000;

// Porcentaje de un numero frente a la meta, acotado a 100 para que la barra
// no desborde el contenedor. Devuelve 0 cuando la meta es 0 o el dato no
// existe, para no pintar barras con NaN.
export function porcentaje(meta: number, valor: number): number {
  if (meta <= 0 || valor <= 0) return 0;
  return Math.min(100, Math.round((valor / meta) * 100));
}