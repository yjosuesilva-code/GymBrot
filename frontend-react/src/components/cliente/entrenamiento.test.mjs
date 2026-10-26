// Ejecutar con Node 24: node --test src/components/cliente/entrenamiento.test.mjs
import assert from "node:assert/strict";
import { registerHooks } from "node:module";
import { test } from "node:test";

// Los imports del proyecto usan resolución de Vite, sin extensión.
registerHooks({
  resolve(specifier, context, nextResolve) {
    try { return nextResolve(specifier, context); }
    catch (error) {
      if (error.code === "ERR_MODULE_NOT_FOUND" && specifier.startsWith(".") && !/\.[a-z]+$/i.test(specifier)) {
        return nextResolve(`${specifier}.ts`, context);
      }
      throw error;
    }
  },
});

const { crearEntrenamiento, ejerciciosRealizados, reducirEntrenamiento, serieValida, errorSerie } = await import("./entrenamiento.ts");
const { MAX_REPS, MAX_SEGUNDOS, MAX_PESO_KG, resumirSeries, validarSeries } = await import("../../lib/rutinas.ts");

function ejercicio(tipo = "REPETICIONES", equipo = "Mancuernas", peso = 7.5) {
  return {
    fila: { id_ejercicio: 1, peso_kg: peso, descanso_seg: 30 },
    ejercicio: { id_ejercicio: 1, nombre: "Ejercicio de prueba", tipo_medicion: tipo, equipo },
    series: [],
  };
}
const serie = (cantidad, peso = "7.5", completada = true) => ({ cantidad, peso, completada });
const convertir = (...ejercicios) => ejerciciosRealizados({ ejercicios });

test("usa los límites compartidos de T3", () => {
  assert.deepEqual([MAX_REPS, MAX_SEGUNDOS, MAX_PESO_KG], [100, 3600, 500]);
});

test("REPETICIONES: diferentes series, peso decimal, cero y límite; sin resúmenes ni segundos", () => {
  const e = ejercicio();
  e.series = [serie("12"), serie("10", "10"), serie("0", "0"), serie("100", "500")];
  const [realizado] = convertir(e);
  assert.deepEqual(realizado, { id_ejercicio: 1, detalle_series: [
    { numero: 1, reps: 12, peso_kg: 7.5 }, { numero: 2, reps: 10, peso_kg: 10 },
    { numero: 3, reps: 0, peso_kg: 0 }, { numero: 4, reps: 100, peso_kg: 500 },
  ] });
  assert.equal(validarSeries(realizado.detalle_series, e.ejercicio), null);
  assert.deepEqual(resumirSeries(realizado.detalle_series), { series: 4, reps: 100, segundos: null, peso_kg: 500 });
});

test("TIEMPO: cero, decimales y 3600 segundos sin reps", () => {
  const e = ejercicio("TIEMPO");
  e.series = [serie("0", ""), serie("45.5", "7.5"), serie("3600", "500")];
  assert.deepEqual(convertir(e)[0].detalle_series, [
    { numero: 1, segundos: 0, peso_kg: null },
    { numero: 2, segundos: 45.5, peso_kg: 7.5 },
    { numero: 3, segundos: 3600, peso_kg: 500 },
  ]);
});

test("solo series realizadas, numeración consecutiva y sin ejercicios vacíos", () => {
  const e = ejercicio();
  e.series = [serie("", "", false), serie("12"), serie("999", "999", false), serie("8", "10")];
  const vacio = { ...ejercicio(), fila: { id_ejercicio: 2 }, series: [serie("", "", false)] };
  const sinCatalogoNoRealizado = { ...vacio, ejercicio: undefined };
  const copia = structuredClone([e, vacio, sinCatalogoNoRealizado]);
  assert.deepEqual(convertir(e, vacio, sinCatalogoNoRealizado), [{ id_ejercicio: 1, detalle_series: [
    { numero: 1, reps: 12, peso_kg: 7.5 }, { numero: 2, reps: 8, peso_kg: 10 },
  ] }]);
  assert.deepEqual([e, vacio, sinCatalogoNoRealizado], copia, "convertir no altera el estado editable");
  assert.deepEqual(convertir(vacio), []);
});

test("peso corporal sin carga asignada fuerza null; vacío y cero son distintos", () => {
  const corporal = ejercicio("REPETICIONES", "Peso corporal", null);
  corporal.series = [serie("12", "80")];
  assert.equal(convertir(corporal)[0].detalle_series[0].peso_kg, null);
  const carga = ejercicio();
  carga.series = [serie("12", ""), serie("10", "0")];
  assert.deepEqual(convertir(carga)[0].detalle_series.map(s => s.peso_kg), [null, 0]);
  corporal.fila.peso_kg = 7.5;
  corporal.series = [serie("12", "7.5")];
  assert.equal(convertir(corporal)[0].detalle_series[0].peso_kg, 7.5);
});

for (const [tipo, cantidades] of [["REPETICIONES", ["", "-1", "101", "1.5", "NaN", "Infinity"]], ["TIEMPO", ["", "-1", "3601", "NaN", "Infinity"]]]) {
  test(`${tipo}: rechaza cantidades inválidas usando validarSeries`, () => {
    for (const cantidad of cantidades) {
      const e = ejercicio(tipo);
      e.series = [serie(cantidad)];
      assert.equal(serieValida(e.series[0], e), false, cantidad);
      assert.throws(() => convertir(e));
    }
  });
}

test("rechaza peso negativo, mayor de 500 y no finito", () => {
  for (const peso of ["-0.1", "500.1", "NaN", "Infinity"]) {
    const e = ejercicio();
    e.series = [serie("12", peso)];
    assert.throws(() => convertir(e), /peso/);
  }
});

test("un ejercicio realizado sin catálogo no se guarda ni altera", () => {
  const e = { ...ejercicio(), ejercicio: undefined, series: [serie("12")] };
  const original = structuredClone(e);
  assert.throws(() => convertir(e), /catálogo/);
  assert.deepEqual(e, original);
});

test("error de campo identifica el problema sin atribuir todas las series al número 1", () => {
  assert.match(errorSerie(serie("101"), ejercicio()), /repeticiones.*100/);
  assert.doesNotMatch(errorSerie(serie("101"), ejercicio()), /serie 1/);
});

test("revisar, desmarcar, corregir y completar conserva las otras series y vuelve al resumen", () => {
  let estado = crearEntrenamiento({ sesion: "B", filas: [{ ...ejercicio().fila, orden: 1, series: 2 }], catalogo: [ejercicio().ejercicio] });
  const actuar = accion => { estado = reducirEntrenamiento(estado, accion); };
  actuar({ tipo: "editar", serie: 0, campo: "cantidad", valor: "12" });
  actuar({ tipo: "completar", serie: 0, ahora: 1000 });
  assert.equal(estado.descanso.estado, "activo");
  actuar({ tipo: "tick", ahora: 4000 });
  assert.equal(estado.descanso.segundosRestantes, 27);
  actuar({ tipo: "editar", serie: 1, campo: "cantidad", valor: "10" });
  actuar({ tipo: "completar", serie: 1, ahora: 5000 });
  assert.equal(estado.vista, "resumen");
  assert.equal(estado.descanso.estado, "inactivo");
  actuar({ tipo: "ir", indice: 0 });
  actuar({ tipo: "completar", serie: 0, ahora: 6000 });
  actuar({ tipo: "editar", serie: 0, campo: "cantidad", valor: "8" });
  actuar({ tipo: "completar", serie: 0, ahora: 7000 });
  assert.equal(estado.vista, "resumen");
  assert.deepEqual(convertir(...estado.ejercicios)[0].detalle_series.map(s => s.reps), [8, 10]);
});
