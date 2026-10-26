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
const {
  CADUCIDAD_BORRADOR_MS,
  buscarBorradorRutina,
  claveBorradorEntrenamiento,
  eliminarBorradorEntrenamiento,
  eliminarBorradorPorClave,
  formatearTiempoRelativo,
  guardarBorradorEntrenamiento,
  huellaAutoguardado,
  tieneProgresoEntrenamiento,
} = await import("./borradorEntrenamiento.ts");
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

function crearStorageMemoria() {
  const mapa = new Map();
  return {
    mapa,
    getItem(k) { return mapa.has(k) ? mapa.get(k) : null; },
    setItem(k, v) { mapa.set(k, String(v)); },
    removeItem(k) { mapa.delete(k); },
  };
}

function fixtureBorrador() {
  const ambito = { gimnasioId: "gym-1", idCliente: "1001", idRutina: 42 };
  const rutina = { id_rutina: 42, id_cliente: "1001", gimnasio_id: "gym-1" };
  const catalogo = [
    { id_ejercicio: 1, nombre: "Press banca", tipo_medicion: "REPETICIONES", equipo: "Mancuerna" },
    { id_ejercicio: 2, nombre: "Plancha abdominal", tipo_medicion: "TIEMPO", equipo: "Peso corporal" },
  ];
  const filasB = [
    { id_ejercicio: 1, orden: 1, series: 2, reps_min: 10, reps_max: 12, peso_kg: 12.5, descanso_seg: 60 },
    { id_ejercicio: 2, orden: 2, series: 2, segundos: 45, peso_kg: null, descanso_seg: 30 },
  ];
  const sesiones = [
    { sesion: "A", ejercicios: [{ id_ejercicio: 1, orden: 1, series: 3, reps_min: 8, reps_max: 10, peso_kg: 15, descanso_seg: 60 }] },
    { sesion: "B", ejercicios: filasB },
  ];
  return { ambito, rutina, catalogo, filasB, sesiones };
}

test("ETAPA 5: autoguardado, recarga, detección y continuación conservando reps, peso decimal, segundos, series e índice", () => {
  const storage = crearStorageMemoria();
  const { ambito, rutina, catalogo, filasB, sesiones } = fixtureBorrador();
  let estado = crearEntrenamiento({ sesion: "B", filas: filasB, catalogo });

  assert.equal(tieneProgresoEntrenamiento(estado, ""), false);
  assert.equal(guardarBorradorEntrenamiento(ambito, estado, "", { ahora: 10_000, storage }), null);

  // Completa las 2 series del ejercicio 1 con peso decimal 12.5 y 15.5 kg
  estado = reducirEntrenamiento(estado, { tipo: "editar", serie: 0, campo: "cantidad", valor: "12" });
  estado = reducirEntrenamiento(estado, { tipo: "editar", serie: 0, campo: "peso", valor: "12.5" });
  estado = reducirEntrenamiento(estado, { tipo: "completar", serie: 0, ahora: 10_000 });
  estado = reducirEntrenamiento(estado, { tipo: "editar", serie: 1, campo: "cantidad", valor: "10" });
  estado = reducirEntrenamiento(estado, { tipo: "editar", serie: 1, campo: "peso", valor: "15.5" });
  estado = reducirEntrenamiento(estado, { tipo: "completar", serie: 1, ahora: 15_000 });

  // Avanza al ejercicio 2 (TIEMPO) y completa la primera serie con 45.5 segundos
  estado = reducirEntrenamiento(estado, { tipo: "ir", indice: 1 });
  estado = reducirEntrenamiento(estado, { tipo: "editar", serie: 0, campo: "cantidad", valor: "45.5" });
  estado = reducirEntrenamiento(estado, { tipo: "completar", serie: 0, ahora: 20_000 });
  // Deja la segunda serie parcialmente escrita antes de recargar
  estado = reducirEntrenamiento(estado, { tipo: "editar", serie: 1, campo: "cantidad", valor: "30" });

  // Verifica que el tick del descanso no cambia la huella de autoguardado
  const huellaAntesTick = huellaAutoguardado(estado, "Buena energía");
  const estadoTrasTick = reducirEntrenamiento(estado, { tipo: "tick", ahora: 25_000 });
  assert.equal(huellaAutoguardado(estadoTrasTick, "Buena energía"), huellaAntesTick);

  const clave = guardarBorradorEntrenamiento(ambito, estadoTrasTick, "Buena energía", { ahora: 25_000, storage });
  assert.equal(clave, "gymbrot:cliente:entrenamiento:gym-1:1001:42:B");

  // Simula recarga de página 10 segundos después (ahora = 30_000)
  const detectado = buscarBorradorRutina({
    ambito,
    rutina,
    vigente: true,
    sesiones,
    catalogo,
    ahora: 30_000,
    storage,
  });

  assert.equal(detectado.estado, "restaurable");
  assert.equal(detectado.sesion, "B");
  assert.equal(detectado.notas, "Buena energía");
  assert.deepEqual(detectado.resumen, {
    ejerciciosCompletados: 1,
    totalEjercicios: 2,
    seriesCompletadas: 3,
    totalSeries: 4,
  });

  // Verifica reconstrucción exacta de índice, series, reps, peso decimal, segundos y cronómetro de descanso
  const restaurado = detectado.entrenamiento;
  assert.equal(restaurado.indice, 1);
  assert.equal(restaurado.vista, "ejercicio");
  assert.deepEqual(restaurado.ejercicios[0].series, [
    { cantidad: "12", peso: "12.5", completada: true },
    { cantidad: "10", peso: "15.5", completada: true },
  ]);
  assert.deepEqual(restaurado.ejercicios[1].series, [
    { cantidad: "45.5", peso: "", completada: true },
    { cantidad: "30", peso: "", completada: false },
  ]);
  assert.equal(restaurado.descanso.estado, "activo");
  assert.equal(restaurado.descanso.segundosRestantes, 20);
  assert.equal(formatearTiempoRelativo(detectado.updatedAt, 30_000), "hace menos de 1 minuto");
});

test("ETAPA 5: descarte manual, borrado en ok=true y preservación en ok=false o excepción", () => {
  const storage = crearStorageMemoria();
  const { ambito, rutina, catalogo, filasB, sesiones } = fixtureBorrador();
  let estado = crearEntrenamiento({ sesion: "B", filas: filasB, catalogo });
  estado = reducirEntrenamiento(estado, { tipo: "editar", serie: 0, campo: "cantidad", valor: "12" });
  estado = reducirEntrenamiento(estado, { tipo: "completar", serie: 0, ahora: 1_000 });

  const clave = guardarBorradorEntrenamiento(ambito, estado, "", { ahora: 1_000, storage });
  assert.ok(storage.getItem(clave));

  // Si registrarSesion() devuelve ok=false o lanza excepción, NO se elimina el borrador
  const trasFallo = buscarBorradorRutina({ ambito, rutina, vigente: true, sesiones, catalogo, ahora: 2_000, storage });
  assert.equal(trasFallo.estado, "restaurable");

  // Al descartar el borrador o tras ok=true, se elimina únicamente esa clave
  eliminarBorradorPorClave(clave, storage);
  assert.equal(storage.getItem(clave), null);
  assert.equal(
    buscarBorradorRutina({ ambito, rutina, vigente: true, sesiones, catalogo, ahora: 2_000, storage }).estado,
    "ninguno",
  );

  // Guardado y limpieza por ámbito al registrar con éxito (ok=true)
  guardarBorradorEntrenamiento(ambito, estado, "", { ahora: 3_000, storage });
  eliminarBorradorEntrenamiento(ambito, "B", storage);
  assert.equal(
    buscarBorradorRutina({ ambito, rutina, vigente: true, sesiones, catalogo, ahora: 4_000, storage }).estado,
    "ninguno",
  );
});

test("ETAPA 5: aislamiento por cliente, gimnasio (tenant) y rutina", () => {
  const storage = crearStorageMemoria();
  const { ambito, rutina, catalogo, filasB, sesiones } = fixtureBorrador();
  let estado = crearEntrenamiento({ sesion: "B", filas: filasB, catalogo });
  estado = reducirEntrenamiento(estado, { tipo: "editar", serie: 0, campo: "cantidad", valor: "12" });
  estado = reducirEntrenamiento(estado, { tipo: "completar", serie: 0, ahora: 10_000 });
  guardarBorradorEntrenamiento(ambito, estado, "", { ahora: 10_000, storage });

  // Otro cliente del mismo gimnasio no ve el borrador
  assert.equal(
    buscarBorradorRutina({
      ambito: { ...ambito, idCliente: "2002" },
      rutina: { ...rutina, id_cliente: "2002" },
      vigente: true,
      sesiones,
      catalogo,
      ahora: 11_000,
      storage,
    }).estado,
    "ninguno",
  );

  // Otro tenant (gimnasio) con la misma cédula no ve el borrador
  assert.equal(
    buscarBorradorRutina({
      ambito: { ...ambito, gimnasioId: "gym-2" },
      rutina: { ...rutina, gimnasio_id: "gym-2" },
      vigente: true,
      sesiones,
      catalogo,
      ahora: 11_000,
      storage,
    }).estado,
    "ninguno",
  );

  // Otra rutina del mismo cliente no reutiliza el borrador
  assert.equal(
    buscarBorradorRutina({
      ambito: { ...ambito, idRutina: 99 },
      rutina: { ...rutina, id_rutina: 99 },
      vigente: true,
      sesiones,
      catalogo,
      ahora: 11_000,
      storage,
    }).estado,
    "ninguno",
  );
});

test("ETAPA 5: ignora y limpia JSON corrupto, versión inválida, datos manipulados y borrador expirado", () => {
  const storage = crearStorageMemoria();
  const { ambito, rutina, catalogo, filasB, sesiones } = fixtureBorrador();
  const clave = claveBorradorEntrenamiento(ambito, "B");

  // 14. JSON corrupto
  storage.setItem(clave, "{corrupto");
  assert.equal(
    buscarBorradorRutina({ ambito, rutina, vigente: true, sesiones, catalogo, ahora: 10_000, storage }).estado,
    "ninguno",
  );
  assert.equal(storage.getItem(clave), null);

  // 15. Versión inválida
  let estado = crearEntrenamiento({ sesion: "B", filas: filasB, catalogo });
  estado = reducirEntrenamiento(estado, { tipo: "editar", serie: 0, campo: "cantidad", valor: "12" });
  estado = reducirEntrenamiento(estado, { tipo: "completar", serie: 0, ahora: 10_000 });
  guardarBorradorEntrenamiento(ambito, estado, "", { ahora: 10_000, storage });
  const invalido = JSON.parse(storage.getItem(clave));
  invalido.version = 99;
  storage.setItem(clave, JSON.stringify(invalido));
  assert.equal(
    buscarBorradorRutina({ ambito, rutina, vigente: true, sesiones, catalogo, ahora: 11_000, storage }).estado,
    "ninguno",
  );
  assert.equal(storage.getItem(clave), null);

  // 16. Borrador expirado (> 48 h)
  guardarBorradorEntrenamiento(ambito, estado, "", { ahora: 10_000, storage });
  assert.equal(
    buscarBorradorRutina({
      ambito,
      rutina,
      vigente: true,
      sesiones,
      catalogo,
      ahora: 10_000 + CADUCIDAD_BORRADOR_MS + 1,
      storage,
    }).estado,
    "ninguno",
  );
  assert.equal(storage.getItem(clave), null);

  // Serie completada manipulada fuera de rango (ej. 999 reps)
  guardarBorradorEntrenamiento(ambito, estado, "", { ahora: 20_000, storage });
  const manipulado = JSON.parse(storage.getItem(clave));
  manipulado.ejercicios[0].series[0].cantidad = "999";
  storage.setItem(clave, JSON.stringify(manipulado));
  assert.equal(
    buscarBorradorRutina({ ambito, rutina, vigente: true, sesiones, catalogo, ahora: 21_000, storage }).estado,
    "ninguno",
  );
  assert.equal(storage.getItem(clave), null);
});

test("ETAPA 5: detecta estado obsoleto si el instructor cambia los ejercicios o series de la sesión", () => {
  const storage = crearStorageMemoria();
  const { ambito, rutina, catalogo, filasB, sesiones } = fixtureBorrador();
  let estado = crearEntrenamiento({ sesion: "B", filas: filasB, catalogo });
  estado = reducirEntrenamiento(estado, { tipo: "editar", serie: 0, campo: "cantidad", valor: "12" });
  estado = reducirEntrenamiento(estado, { tipo: "completar", serie: 0, ahora: 10_000 });
  guardarBorradorEntrenamiento(ambito, estado, "", { ahora: 10_000, storage });

  const sesionesModificadas = [
    sesiones[0],
    {
      sesion: "B",
      ejercicios: [
        { ...filasB[0], series: 4 },
        filasB[1],
      ],
    },
  ];
  const obsoleto = buscarBorradorRutina({
    ambito,
    rutina,
    vigente: true,
    sesiones: sesionesModificadas,
    catalogo,
    ahora: 15_000,
    storage,
  });
  assert.equal(obsoleto.estado, "obsoleto");
  assert.equal(obsoleto.sesion, "B");
});
