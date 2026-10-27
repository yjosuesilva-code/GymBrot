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
const { obtenerNotaEntrenador, obtenerPasosTecnicos } = await import("./guiaTecnica.ts");
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
const {
  construirSesionEjercicioCliente,
  ejerciciosExcluidosEnSesion,
  filtrarCatalogoCliente,
  prescripcionInicialCambio,
  validarFormularioPrescripcion,
} = await import("./cambioEjercicio.ts");
const {
  construirEvolucionEjercicio,
  extraerEjerciciosConHistorial,
  filtrarYOrdenarRegistrosRutina,
  formatoRealizado,
  formatoSerieRealizada,
  resolverEjercicioHistorial,
  resumenOficialEjercicioRealizado,
} = await import("./historialEntrenamiento.ts");
const {
  formatearListaGrupos,
  limpiarDescripcionRutina,
  obtenerSaludoCliente,
  resumirUltimaActividad,
  seleccionarMembresiaResumen,
  seleccionarProximaCitaCliente,
  textoObjetivoPlan,
} = await import("./dashboardCliente.ts");
const {
  filtrarYOrdenarPagosCliente,
  formatearMetodoPago,
  formatearModalidadPago,
  resolverBeneficiosPlan,
  separarMembresiasCliente,
} = await import("./miMembresia.ts");
const {
  calcularResumenFisico,
  determinarMetricasDisponibles,
  obtenerPuntosGrafico,
  ordenarMedicionesCronologico,
  ordenarMedicionesReciente,
} = await import("./miProgreso.ts");
const {
  aFranjasOcupadas,
  badgeEstadoCita,
  badgeEstadoInscripcion,
  filtrarHorariosDisponibles,
  puedeCancelarCita,
  puedeRetirarseClase,
  separarCitasCliente,
  separarInscripcionesCliente,
} = await import("./misCitas.ts");
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

test("ETAPA 6: excluye ejercicios ya presentes en la sesión y filtra catálogo por texto, grupo, nivel y equipo", () => {
  const catalogo = [
    {
      id_ejercicio: 10,
      nombre: "Press de banca con barra",
      grupo_muscular: "Pecho",
      equipo: "Barra",
      nivel: "Intermedio",
      estado: "ACTIVO",
      tipo_medicion: "REPETICIONES",
      series_sugeridas: 4,
      repeticiones_min_sugeridas: 8,
      repeticiones_max_sugeridas: 10,
      segundos_sugeridos: null,
    },
    {
      id_ejercicio: 11,
      nombre: "Press inclinado con mancuernas",
      grupo_muscular: "Pecho",
      equipo: "Mancuerna",
      nivel: "Principiante",
      estado: "ACTIVO",
      tipo_medicion: "REPETICIONES",
      series_sugeridas: 3,
      repeticiones_min_sugeridas: 10,
      repeticiones_max_sugeridas: 12,
      segundos_sugeridos: null,
    },
    {
      id_ejercicio: 12,
      nombre: "Plancha abdominal",
      grupo_muscular: "Abdomen",
      equipo: "Peso corporal",
      nivel: "Principiante",
      estado: "ACTIVO",
      tipo_medicion: "TIEMPO",
      series_sugeridas: 3,
      repeticiones_min_sugeridas: null,
      repeticiones_max_sugeridas: null,
      segundos_sugeridos: 45,
    },
    {
      id_ejercicio: 13,
      nombre: "Ejercicio inactivo",
      grupo_muscular: "Pecho",
      equipo: "Barra",
      nivel: "Principiante",
      estado: "INACTIVO",
      tipo_medicion: "REPETICIONES",
      series_sugeridas: 3,
      repeticiones_min_sugeridas: 10,
      repeticiones_max_sugeridas: 12,
      segundos_sugeridos: null,
    },
  ];
  const ejerciciosSesion = [{ id_ejercicio: 10, sesion: "A", orden: 1 }];
  const excluidos = ejerciciosExcluidosEnSesion(ejerciciosSesion, 10);
  assert.equal(excluidos.includes(10), true);

  const disponibles = filtrarCatalogoCliente(catalogo, {
    excluidos,
    busqueda: "",
    grupo: "",
    nivel: "",
    equipo: "",
  });
  assert.deepEqual(disponibles.map((e) => e.id_ejercicio), [11, 12]);

  const soloPecho = filtrarCatalogoCliente(catalogo, {
    excluidos,
    busqueda: "inclinado",
    grupo: "Pecho",
    nivel: "Principiante",
    equipo: "Mancuerna",
  });
  assert.deepEqual(soloPecho.map((e) => e.id_ejercicio), [11]);
});

test("ETAPA 6: conserva pauta al reemplazar mismo tipo de medición y usa sugeridos al agregar o cambiar tipo", () => {
  const filaAnterior = {
    id_rutina: 7,
    sesion: "A",
    id_ejercicio: 10,
    orden: 1,
    series: 4,
    reps_min: 6,
    reps_max: 8,
    segundos: null,
    peso_kg: 60,
    descanso_seg: 120,
    notas_instructor: "Baja controlado",
  };
  const modoReemplazar = {
    tipo: "reemplazar",
    sesion: "A",
    filaAnterior,
  };
  const nuevoMismoTipo = {
    id_ejercicio: 11,
    nombre: "Press con mancuernas",
    grupo_muscular: "Pecho",
    equipo: "Mancuerna",
    nivel: "Intermedio",
    tipo_medicion: "REPETICIONES",
    series_sugeridas: 3,
    repeticiones_min_sugeridas: 10,
    repeticiones_max_sugeridas: 12,
    segundos_sugeridos: null,
  };
  const pautaConservada = prescripcionInicialCambio(modoReemplazar, nuevoMismoTipo);
  assert.equal(pautaConservada.origen, "conservada");
  assert.equal(pautaConservada.series, "4");
  assert.equal(pautaConservada.repsMin, "6");
  assert.equal(pautaConservada.repsMax, "8");
  assert.equal(pautaConservada.pesoKg, "60");
  assert.equal(pautaConservada.descansoSeg, "120");

  const nuevoTiempo = {
    id_ejercicio: 12,
    nombre: "Plancha abdominal",
    grupo_muscular: "Abdomen",
    equipo: "Peso corporal",
    nivel: "Principiante",
    tipo_medicion: "TIEMPO",
    series_sugeridas: 3,
    repeticiones_min_sugeridas: null,
    repeticiones_max_sugeridas: null,
    segundos_sugeridos: 45,
  };
  const pautaSugerida = prescripcionInicialCambio(modoReemplazar, nuevoTiempo);
  assert.equal(pautaSugerida.origen, "sugerida-catalogo");
  assert.equal(pautaSugerida.series, "4");
  assert.equal(pautaSugerida.segundos, "45");
  assert.equal(pautaSugerida.pesoKg, "");

  const pautaAgregar = prescripcionInicialCambio({ tipo: "agregar", sesion: "A" }, nuevoTiempo);
  assert.equal(pautaAgregar.origen, "sugerida-catalogo");
  assert.equal(pautaAgregar.series, "3");
  assert.equal(pautaAgregar.segundos, "45");
});

test("ETAPA 6: construye payload SesionEjercicioNuevo válido, previene duplicados y es entrenable en modo entrenamiento", () => {
  const ejercicioRep = {
    id_ejercicio: 11,
    nombre: "Press con mancuernas",
    grupo_muscular: "Pecho",
    equipo: "Mancuerna",
    nivel: "Intermedio",
    tipo_medicion: "REPETICIONES",
    series_sugeridas: 3,
    repeticiones_min_sugeridas: 10,
    repeticiones_max_sugeridas: 12,
    segundos_sugeridos: null,
  };
  const filaAnterior = {
    id_rutina: 7,
    sesion: "A",
    id_ejercicio: 10,
    orden: 1,
    series: 4,
    reps_min: 8,
    reps_max: 10,
    segundos: null,
    peso_kg: 20,
    descanso_seg: 90,
    notas_instructor: "",
  };
  const modoReemplazar = {
    tipo: "reemplazar",
    sesion: "A",
    filaAnterior,
  };

  // Rechaza reemplazar por el mismo ejercicio
  assert.throws(() =>
    construirSesionEjercicioCliente(
      modoReemplazar,
      { ...ejercicioRep, id_ejercicio: 10 },
      { series: "3", repsMin: "10", repsMax: "12", segundos: "", descansoSeg: "60", pesoKg: "20", origen: "conservada" },
      1,
    ),
  );

  // Rechaza rango inválido reps_min > reps_max
  assert.equal(
    validarFormularioPrescripcion(
      { series: "3", repsMin: "14", repsMax: "10", segundos: "30", descansoSeg: "60", pesoKg: "20", origen: "conservada" },
      ejercicioRep,
    ) !== null,
    true,
  );

  // Construye payload válido para cambioCliente
  const payload = construirSesionEjercicioCliente(
    modoReemplazar,
    ejercicioRep,
    { series: "4", repsMin: "8", repsMax: "10", segundos: "", descansoSeg: "90", pesoKg: "22.5", origen: "conservada" },
    1,
  );
  assert.deepEqual(payload, {
    sesion: "A",
    id_ejercicio: 11,
    orden: 1,
    series: 4,
    reps_min: 8,
    reps_max: 10,
    segundos: null,
    peso_kg: 22.5,
    descanso_seg: 90,
    notas_instructor: "",
  });

  // El ejercicio resultante (con marcas de cliente) es 100% compatible con crearEntrenamiento
  const filaActualizada = {
    gimnasio_id: 1,
    id_rutina: 7,
    ...payload,
    agregado_por_cliente: true,
    revisado_por_instructor: false,
  };
  const entrenamiento = crearEntrenamiento({
    sesion: "A",
    filas: [filaActualizada],
    catalogo: [ejercicioRep],
  });
  assert.equal(entrenamiento.ejercicios.length, 1);
  assert.equal(entrenamiento.ejercicios[0].series.length, 4);
  assert.equal(entrenamiento.ejercicios[0].series[0].cantidad, "");
  assert.equal(entrenamiento.ejercicios[0].series[0].peso, "22.5");
});

test("ETAPA 7: filtra por cliente/gimnasio/rutina, ordena cronológicamente y maneja ejercicio eliminado (#19) y registros sin detalle_series", () => {
  const ambito = { gimnasioId: "gym-centro", idCliente: "1000000001", idRutina: 5 };
  const catalogo = [
    {
      id_ejercicio: 1,
      nombre: "Press de banca",
      grupo_muscular: "Pecho",
      equipo: "Barra",
      nivel: "Intermedio",
      tipo_medicion: "REPETICIONES",
      recurso_url: "",
      estado: "ACTIVO",
    },
  ];

  const registrosDesordenados = [
    {
      gimnasio_id: "gym-centro",
      id_registro: 10,
      id_rutina: 5,
      id_cliente: "1000000001",
      sesion: "A",
      fecha: "2026-10-01",
      registrado_por: "1000000001",
      notas: "Primero",
    },
    {
      gimnasio_id: "gym-titan",
      id_registro: 11,
      id_rutina: 5,
      id_cliente: "1000000001",
      sesion: "A",
      fecha: "2026-10-15",
      registrado_por: "1000000001",
      notas: "Otro gym",
    },
    {
      gimnasio_id: "gym-centro",
      id_registro: 12,
      id_rutina: 99,
      id_cliente: "1000000001",
      sesion: "A",
      fecha: "2026-10-16",
      registrado_por: "1000000001",
      notas: "Otra rutina",
    },
    {
      gimnasio_id: "gym-centro",
      id_registro: 15,
      id_rutina: 5,
      id_cliente: "1000000001",
      sesion: "B",
      fecha: "2026-10-10",
      registrado_por: "1000000001",
      notas: "Más reciente",
      ejercicios_realizados: [
        // Registro antiguo sin detalle_series
        { id_ejercicio: 1, series: 4, reps: 10, segundos: null, peso_kg: 42.5 },
        // Ejercicio eliminado del catálogo (#19) con detalle_series
        {
          id_ejercicio: 19,
          series: 2,
          reps: 12,
          segundos: null,
          peso_kg: null,
          detalle_series: [
            { numero: 2, reps: 12, segundos: null, peso_kg: null },
            { numero: 1, reps: 10, segundos: null, peso_kg: null },
          ],
        },
      ],
    },
  ];

  const filtrados = filtrarYOrdenarRegistrosRutina(registrosDesordenados, ambito);
  assert.deepEqual(filtrados.map((r) => r.id_registro), [15, 10]);

  const infoEliminado = resolverEjercicioHistorial(19, catalogo);
  assert.equal(infoEliminado.enCatalogo, false);
  assert.equal(infoEliminado.nombre, "Ejercicio #19");

  const legado = resumenOficialEjercicioRealizado(filtrados[0].ejercicios_realizados[0]);
  assert.equal(legado.tieneDetalle, false);
  assert.equal(legado.peso_kg, 42.5);
  assert.equal(
    formatoRealizado(filtrados[0].ejercicios_realizados[0], catalogo[0]),
    "4 series · 10 reps · 42.5 kg",
  );

  const conDetalle = resumenOficialEjercicioRealizado(filtrados[0].ejercicios_realizados[1]);
  assert.equal(conDetalle.tieneDetalle, true);
  assert.deepEqual(conDetalle.detalle_series.map((s) => s.numero), [1, 2]);
  assert.equal(formatoSerieRealizada(conDetalle.detalle_series[0]), "10 reps · Peso corporal");
});

test("ETAPA 7: evolución de cargas con peso decimal, peso corporal (reps sin inventar 0 kg), TIEMPO (segundos) y 1 solo registro", () => {
  const catalogo = [
    {
      id_ejercicio: 1,
      nombre: "Press con mancuernas",
      grupo_muscular: "Pecho",
      equipo: "Mancuerna",
      nivel: "Intermedio",
      tipo_medicion: "REPETICIONES",
      recurso_url: "",
      estado: "ACTIVO",
    },
    {
      id_ejercicio: 2,
      nombre: "Flexiones de pecho",
      grupo_muscular: "Pecho",
      equipo: "Peso corporal",
      nivel: "Principiante",
      tipo_medicion: "REPETICIONES",
      recurso_url: "",
      estado: "ACTIVO",
    },
    {
      id_ejercicio: 3,
      nombre: "Plancha abdominal",
      grupo_muscular: "Abdomen",
      equipo: "Peso corporal",
      nivel: "Principiante",
      tipo_medicion: "TIEMPO",
      recurso_url: "",
      estado: "ACTIVO",
    },
  ];

  const registros = [
    {
      gimnasio_id: "gym-centro",
      id_registro: 1,
      id_rutina: 5,
      id_cliente: "1000000001",
      sesion: "A",
      fecha: "2026-10-01",
      registrado_por: "1000000001",
      notas: "",
      ejercicios_realizados: [
        {
          id_ejercicio: 1,
          series: 3,
          reps: 10,
          segundos: null,
          peso_kg: 17.5,
          detalle_series: [
            { numero: 1, reps: 12, segundos: null, peso_kg: 15 },
            { numero: 2, reps: 10, segundos: null, peso_kg: 17.5 },
            { numero: 3, reps: 8, segundos: null, peso_kg: 17.5 },
          ],
        },
        {
          id_ejercicio: 2,
          series: 3,
          reps: 12,
          segundos: null,
          peso_kg: null,
          detalle_series: [
            { numero: 1, reps: 12, segundos: null, peso_kg: null },
            { numero: 2, reps: 12, segundos: null, peso_kg: null },
            { numero: 3, reps: 10, segundos: null, peso_kg: null },
          ],
        },
        {
          id_ejercicio: 3,
          series: 3,
          reps: null,
          segundos: 45,
          peso_kg: null,
          detalle_series: [
            { numero: 1, reps: null, segundos: 40, peso_kg: null },
            { numero: 2, reps: null, segundos: 45, peso_kg: null },
            { numero: 3, reps: null, segundos: 45, peso_kg: null },
          ],
        },
      ],
    },
    {
      gimnasio_id: "gym-centro",
      id_registro: 2,
      id_rutina: 5,
      id_cliente: "1000000001",
      sesion: "B",
      fecha: "2026-10-08",
      registrado_por: "1000000001",
      notas: "",
      ejercicios_realizados: [
        // Registro de Press donde ese día no se anotó peso (null): no debe inventar 0 kg
        {
          id_ejercicio: 1,
          series: 3,
          reps: 12,
          segundos: null,
          peso_kg: null,
        },
        {
          id_ejercicio: 2,
          series: 3,
          reps: 15,
          segundos: null,
          peso_kg: null,
        },
      ],
    },
    {
      gimnasio_id: "gym-centro",
      id_registro: 3,
      id_rutina: 5,
      id_cliente: "1000000001",
      sesion: "A",
      fecha: "2026-10-15",
      registrado_por: "1000000001",
      notas: "",
      ejercicios_realizados: [
        {
          id_ejercicio: 1,
          series: 3,
          reps: 10,
          segundos: null,
          peso_kg: 22.5,
          detalle_series: [
            { numero: 1, reps: 10, segundos: null, peso_kg: 20 },
            { numero: 2, reps: 10, segundos: null, peso_kg: 22.5 },
            { numero: 3, reps: 9, segundos: null, peso_kg: 22.5 },
          ],
        },
      ],
    },
  ];

  const opciones = extraerEjerciciosConHistorial(registros, catalogo);
  assert.deepEqual(opciones.map((o) => o.info.id_ejercicio), [1, 2, 3]);
  assert.deepEqual(opciones[0].sesiones, ["A", "B"]);

  // 1. Ejercicio con peso y peso decimal (+ una sesión con peso null que no se convierte en 0 kg)
  const evPeso = construirEvolucionEjercicio(registros, 1, catalogo);
  assert.equal(evPeso.metrica, "PESO");
  assert.equal(evPeso.suficientesParaComparar, true);
  assert.equal(evPeso.tieneAlgunoSinCarga, true);
  assert.equal(evPeso.puntosAsc.length, 3);
  assert.equal(evPeso.puntosAsc[1].valorMetrica, null);
  assert.equal(evPeso.puntosAsc[1].etiquetaValor, "Sin carga registrada");
  assert.deepEqual(evPeso.puntosGraficables.map((p) => p.valorMetrica), [17.5, 22.5]);
  assert.equal(evPeso.primero?.valorMetrica, 17.5);
  assert.equal(evPeso.ultimo?.valorMetrica, 22.5);
  assert.equal(evPeso.maximo?.valorMetrica, 22.5);

  // 2. Ejercicio de peso corporal (REPETICIONES sin peso): evoluciona por repeticiones sin inventar 0 kg
  const evReps = construirEvolucionEjercicio(registros, 2, catalogo);
  assert.equal(evReps.metrica, "REPETICIONES");
  assert.equal(evReps.suficientesParaComparar, true);
  assert.deepEqual(evReps.puntosGraficables.map((p) => p.valorMetrica), [12, 15]);
  assert.equal(evReps.ultimo?.etiquetaValor, "15 reps");

  // 3. Ejercicio por TIEMPO con un único registro histórico
  const evTiempo = construirEvolucionEjercicio(registros, 3, catalogo);
  assert.equal(evTiempo.metrica, "SEGUNDOS");
  assert.equal(evTiempo.suficientesParaComparar, false);
  assert.equal(evTiempo.puntosGraficables.length, 1);
  assert.equal(evTiempo.ultimo?.etiquetaValor, "45 s");
});

test("AUDITORÍA: restaura valores aceptados por el formulario sin perder las series ya completadas", () => {
  const { ambito, rutina, catalogo, filasB, sesiones } = fixtureBorrador();
  for (const [cantidad, peso, pendiente] of [
    ["1e1", "7.5", "-1"],
    ["10", "7.51234567890123", ""],
  ]) {
    const storage = crearStorageMemoria();
    let estado = crearEntrenamiento({ sesion: "B", filas: filasB, catalogo });
    estado = reducirEntrenamiento(estado, { tipo: "editar", serie: 0, campo: "cantidad", valor: cantidad });
    estado = reducirEntrenamiento(estado, { tipo: "editar", serie: 0, campo: "peso", valor: peso });
    estado = reducirEntrenamiento(estado, { tipo: "completar", serie: 0, ahora: 10_000 });
    estado = reducirEntrenamiento(estado, { tipo: "editar", serie: 1, campo: "cantidad", valor: pendiente });
    guardarBorradorEntrenamiento(ambito, estado, "", { ahora: 10_000, storage });
    const resultado = buscarBorradorRutina({ ambito, rutina, vigente: true, sesiones, catalogo, ahora: 11_000, storage });
    assert.equal(resultado.estado, "restaurable");
    assert.deepEqual(resultado.entrenamiento.ejercicios[0].series, estado.ejercicios[0].series);
    assert.equal(resultado.entrenamiento.ejercicios[0].series[0].completada, true);
  }
});

test("AUDITORÍA: conserva la carga decimal del cambio sin redondear la prescripción", () => {
  const e = ejercicio().ejercicio;
  const modo = { tipo: "agregar", sesion: "A" };
  const form = { ...prescripcionInicialCambio(modo, e), pesoKg: "7.25" };
  assert.equal(construirSesionEjercicioCliente(modo, e, form, 0).peso_kg, 7.25);
});

test("AUDITORÍA: muestra la nota guardada sin sustituirla por una indicación inventada", () => {
  const nota = "Calienta 5 minutos antes de la primera serie.";
  assert.equal(obtenerNotaEntrenador({ notas_instructor: nota }), nota);
  assert.match(obtenerNotaEntrenador({ notas_instructor: "" }), /no ha dejado|no hay|sin nota/i);
});

test("AUDITORÍA: la evolución de tiempo conserva el peso de la serie de mayor duración", () => {
  const e = { ...ejercicio("TIEMPO").ejercicio, id_ejercicio: 900 };
  const detalle = [{ numero: 1, segundos: 60, peso_kg: 10 }, { numero: 2, segundos: 30, peso_kg: 20 }];
  const registros = [{ id_registro: 1, fecha: "2026-10-01", sesion: "A", notas: "", ejercicios_realizados: [{ id_ejercicio: 900, ...resumirSeries(detalle), detalle_series: detalle }] }];
  const ev = construirEvolucionEjercicio(registros, 900, [e]);
  assert.equal(ev.ultimo.valorMetrica, 60);
  assert.match(ev.ultimo.contextoSecundario, /10 kg/);
  assert.doesNotMatch(ev.ultimo.contextoSecundario, /20 kg/);
});

test("AUDITORÍA: no compara como carga una ejecución por tiempo y otra por repeticiones", () => {
  const e = { ...ejercicio().ejercicio, id_ejercicio: 900 };
  const registros = [
    { id_registro: 1, fecha: "2026-10-01", sesion: "A", notas: "", ejercicios_realizados: [{ id_ejercicio: 900, segundos: 60, peso_kg: 10 }] },
    { id_registro: 2, fecha: "2026-10-02", sesion: "A", notas: "", ejercicios_realizados: [{ id_ejercicio: 900, reps: 12, peso_kg: 20 }] },
  ];
  const ev = construirEvolucionEjercicio(registros, 900, [e]);
  assert.equal(ev.suficientesParaComparar, false);
  assert.equal(ev.puntosAsc.length, 2, "ambas ejecuciones siguen en el historial");
  assert.equal(ev.puntosAsc[0].valorMetrica, null);
  assert.equal(ev.puntosAsc[1].valorMetrica, 20);
});

test("AUDITORÍA: distingue peso corporal explícito, cero y carga ausente en registros antiguos", () => {
  const cuerpo = { tipo_medicion: "REPETICIONES", equipo: "Peso corporal" };
  assert.equal(formatoSerieRealizada({ numero: 1, reps: 10, peso_kg: null }), "10 reps · Peso corporal");
  assert.equal(formatoSerieRealizada({ numero: 1, reps: 10, peso_kg: 0 }), "10 reps · 0 kg");
  assert.equal(formatoSerieRealizada({ numero: 1, reps: 10 }, cuerpo), "10 reps · Carga no registrada");
  assert.doesNotMatch(formatoRealizado({ id_ejercicio: 1, reps: 10 }, cuerpo), /Peso corporal/);
});

test("AUDITORÍA: un ejercicio propio editado conserva su descripción actual en la guía", () => {
  const descripcion = "Apoya los antebrazos y mantén el cuerpo alineado.";
  const propio = { ...ejercicio("TIEMPO").ejercicio, id_ejercicio: 42, gimnasio_id: "gym-centro", nombre: "Plancha personalizada", grupo_muscular: "Abdomen", descripcion };
  const texto = obtenerPasosTecnicos(propio).map((p) => p.instruccion).join(" ");
  assert.ok(texto.includes(descripcion));
  assert.doesNotMatch(texto, /barra|trapecios/);
});

test("ETAPA 8: saludo personalizado y mensaje alternativo cuando falta el nombre", () => {
  assert.deepEqual(obtenerSaludoCliente("Valentina"), {
    saludo: "Hola, Valentina",
    tieneNombre: true,
  });
  assert.deepEqual(obtenerSaludoCliente("   "), {
    saludo: "Te damos la bienvenida a tu espacio de entrenamiento",
    tieneNombre: false,
  });
  assert.deepEqual(obtenerSaludoCliente(null), {
    saludo: "Te damos la bienvenida a tu espacio de entrenamiento",
    tieneNombre: false,
  });
  assert.equal(textoObjetivoPlan("Ganancia muscular"), "aumentar masa muscular");
  assert.equal(formatearListaGrupos(["Pecho", "Tríceps", "Hombro"]), "pecho, tríceps y hombro");
  assert.equal(
    limpiarDescripcionRutina({
      id_rutina: 1,
      gimnasio_id: "gym-centro",
      nombre: "Ganancia muscular A/B/C",
      objetivo: "Ganancia muscular",
      descripcion: "Plan de ganancia muscular · énfasis tren superior",
      id_cliente: "1000000001",
      id_instructor: "1020304050",
      duracion_semanas: 8,
      fecha_creacion: "2026-10-01",
      fecha_fin: "2026-11-26",
      division: ["A", "B", "C"],
    }),
    "Énfasis tren superior",
  );
});

test("ETAPA 8: membresía filtra por cliente/gimnasio y clasifica vigencia real", () => {
  const clienteActivo = {
    gimnasio_id: "gym-centro",
    numero_identificacion: "1000000001",
    estado: "ACTIVO",
  };
  const membresias = [
    {
      gimnasio_id: "gym-otro",
      id_membresia: 99,
      id_cliente: "1000000001",
      id_plan: 3,
      tipo_membresia: "Plan Anual",
      modalidad_pago: "ANUAL",
      fecha_inicio: "2026-01-01",
      fecha_vencimiento: "2027-01-01",
      valor: 800000,
      estado: "ACTIVA",
    },
    {
      gimnasio_id: "gym-centro",
      id_membresia: 1,
      id_cliente: "1000000001",
      id_plan: 1,
      tipo_membresia: "Plan Mensual",
      modalidad_pago: "MENSUAL",
      fecha_inicio: "2026-09-01",
      fecha_vencimiento: "2026-10-01",
      valor: 95000,
      estado: "VENCIDA",
    },
    {
      gimnasio_id: "gym-centro",
      id_membresia: 2,
      id_cliente: "1000000001",
      id_plan: 1,
      tipo_membresia: "Plan Mensual",
      modalidad_pago: "MENSUAL",
      fecha_inicio: "2026-10-01",
      fecha_vencimiento: "2026-11-01",
      valor: 95000,
      estado: "ACTIVA",
    },
  ];

  const vigente = seleccionarMembresiaResumen({
    membresias,
    cliente: clienteActivo,
    idCliente: "1000000001",
    gimnasioId: "gym-centro",
    hoy: "2026-10-15",
  });
  assert.ok(vigente);
  assert.equal(vigente.membresia.id_membresia, 2);
  assert.equal(vigente.estadoEfectivo, "VIGENTE");
  assert.equal(vigente.etiquetaEstado, "Activa");
  assert.equal(vigente.diasRestantes, 17);
  assert.match(vigente.modalidadTexto, /Plan Mensual/);

  const porVencer = seleccionarMembresiaResumen({
    membresias,
    cliente: clienteActivo,
    idCliente: "1000000001",
    gimnasioId: "gym-centro",
    hoy: "2026-10-28",
  });
  assert.ok(porVencer);
  assert.equal(porVencer.estadoEfectivo, "POR_VENCER");
  assert.equal(porVencer.textoVigencia, "Vence en 4 días");

  const sinMembresia = seleccionarMembresiaResumen({
    membresias,
    cliente: clienteActivo,
    idCliente: "1000009999",
    gimnasioId: "gym-centro",
    hoy: "2026-10-15",
  });
  assert.equal(sinMembresia, null);
});

test("ETAPA 8: próxima cita ignora citas pasadas, canceladas, completadas o de otro gimnasio", () => {
  const instructores = [
    {
      gimnasio_id: "gym-centro",
      numero_identificacion: "1020304050",
      nombre: "Carlos",
      apellidos: "Méndez",
      especialidad: "Musculación",
    },
  ];
  const citas = [
    {
      gimnasio_id: "gym-centro",
      id_cita: 1,
      id_cliente: "1000000001",
      id_instructor: "1020304050",
      tipo_cita: "EVALUACION",
      fecha: "2026-10-06",
      hora: "09:00",
      estado: "CONFIRMADA",
      notas: "Cita en el pasado",
    },
    {
      gimnasio_id: "gym-centro",
      id_cita: 2,
      id_cliente: "1000000001",
      id_instructor: "1020304050",
      tipo_cita: "NUTRICION",
      fecha: "2026-10-30",
      hora: "10:00",
      estado: "CANCELADA",
      notas: "Cancelada",
    },
    {
      gimnasio_id: "gym-centro",
      id_cita: 3,
      id_cliente: "1000000001",
      id_instructor: "1020304050",
      tipo_cita: "SEGUIMIENTO",
      fecha: "2026-10-28",
      hora: "15:30",
      estado: "PENDIENTE",
      notas: "",
    },
    {
      gimnasio_id: "gym-centro",
      id_cita: 4,
      id_cliente: "1000000001",
      id_instructor: "1020304050",
      tipo_cita: "NUTRICION",
      fecha: "2026-10-27",
      hora: "08:00",
      estado: "CONFIRMADA",
      notas: "",
    },
  ];

  const proxima = seleccionarProximaCitaCliente({
    citas,
    instructores,
    idCliente: "1000000001",
    gimnasioId: "gym-centro",
    hoy: "2026-10-26",
    horaActualTexto: "14:00",
  });
  assert.ok(proxima);
  assert.equal(proxima.cita.id_cita, 4);
  assert.equal(proxima.tipoTexto, "Nutrición");
  assert.equal(proxima.nombreInstructor, "Carlos Méndez");
  assert.equal(proxima.estadoTexto, "Confirmada");

  const ningunaFutura = seleccionarProximaCitaCliente({
    citas,
    instructores,
    idCliente: "1000000001",
    gimnasioId: "gym-centro",
    hoy: "2026-11-01",
    horaActualTexto: "10:00",
  });
  assert.equal(ningunaFutura, null);
});

test("ETAPA 8: última actividad resume el último entrenamiento válido del plan actual", () => {
  const { catalogo } = fixtureBorrador();
  const ambito = { gimnasioId: "gym-centro", idCliente: "1000000001", idRutina: 5 };
  const registros = [
    {
      gimnasio_id: "gym-centro",
      id_registro: 10,
      id_rutina: 5,
      id_cliente: "1000000001",
      sesion: "A",
      fecha: "2026-10-10",
      registrado_por: "1000000001",
      notas: "Primera sesión",
      ejercicios_realizados: [{ id_ejercicio: 1, series: 3 }],
    },
    {
      gimnasio_id: "gym-centro",
      id_registro: 12,
      id_rutina: 5,
      id_cliente: "1000000001",
      sesion: "B",
      fecha: "2026-10-18",
      registrado_por: "1000000001",
      notas: "Excelente energía",
      ejercicios_realizados: [
        {
          id_ejercicio: 1,
          detalle_series: [
            { numero: 1, reps: 10, segundos: null, peso_kg: 17.5 },
            { numero: 2, reps: 10, segundos: null, peso_kg: 17.5 },
          ],
        },
        {
          id_ejercicio: 2,
          detalle_series: [{ numero: 1, reps: null, segundos: 45, peso_kg: null }],
        },
      ],
    },
  ];

  const resumen = resumirUltimaActividad({
    registros,
    ambito,
    catalogo,
    hoy: "2026-10-18",
  });
  assert.ok(resumen);
  assert.equal(resumen.registro.id_registro, 12);
  assert.equal(resumen.esHoy, true);
  assert.equal(resumen.cantidadEjercicios, 2);
  assert.equal(resumen.totalSeries, 3);
  assert.match(resumen.resumenEjerciciosTexto, /Press banca, Plancha abdominal/);
});

test("ETAPA 9: beneficios del plan según catálogo oficial sin inventar datos", () => {
  const planes = [
    {
      id_plan: 1,
      nombre: "Básico",
      descripcion: "Sala de máquinas y cardio",
      precio_mensual: 50000,
      precio_semestral: 285000,
      precio_anual: 540000,
      estado: "ACTIVO",
      beneficios: ["Acceso a sala de máquinas", "Área de cardio", "  "],
    },
    {
      id_plan: 2,
      nombre: "Sin Beneficios",
      descripcion: "Plan sin lista",
      precio_mensual: 40000,
      precio_semestral: 200000,
      precio_anual: 380000,
      estado: "ACTIVO",
    },
  ];

  assert.deepEqual(resolverBeneficiosPlan(1, planes), [
    "Acceso a sala de máquinas",
    "Área de cardio",
  ]);
  assert.deepEqual(resolverBeneficiosPlan(2, planes), []);
  assert.deepEqual(resolverBeneficiosPlan(99, planes), []);
  assert.deepEqual(resolverBeneficiosPlan(null, planes), []);
  assert.deepEqual(resolverBeneficiosPlan(undefined, planes), []);
});

test("ETAPA 9: formato de modalidad y método de pago", () => {
  assert.equal(formatearModalidadPago("ANUAL"), "Plan anual");
  assert.equal(formatearModalidadPago("SEMESTRAL"), "Plan semestral");
  assert.equal(formatearModalidadPago("MENSUAL"), "Plan mensual");
  assert.equal(formatearModalidadPago(undefined), "No especificada");

  assert.equal(formatearMetodoPago("EFECTIVO"), "Efectivo");
  assert.equal(formatearMetodoPago("TRANSFERENCIA"), "Transferencia");
  assert.equal(formatearMetodoPago("TARJETA"), "Tarjeta");
  assert.equal(formatearMetodoPago("NEQUI"), "Nequi");
  assert.equal(formatearMetodoPago(undefined), "Otro");
});

test("ETAPA 9: pagos del cliente filtran por tenant/usuario y se ordenan del más reciente al más antiguo", () => {
  const pagos = [
    {
      gimnasio_id: "gym-otro",
      id_pago: 99,
      id_cliente: "1000000001",
      id_membresia: 1,
      fecha_pago: "2026-10-25",
      valor: 80000,
      metodo_pago: "NEQUI",
      estado_pago: "EXITOSO",
      referencia_transaccion: "REF-OTRO",
      observaciones: "",
    },
    {
      gimnasio_id: "gym-centro",
      id_pago: 1,
      id_cliente: "1000000001",
      id_membresia: 1,
      fecha_pago: "2026-08-01",
      valor: 80000,
      metodo_pago: "EFECTIVO",
      estado_pago: "EXITOSO",
      referencia_transaccion: "REC-001",
      observaciones: "",
    },
    {
      gimnasio_id: "gym-centro",
      id_pago: 2,
      id_cliente: "1000000001",
      id_membresia: 1,
      fecha_pago: "2026-09-01",
      valor: 80000,
      metodo_pago: "TARJETA",
      estado_pago: "EXITOSO",
      referencia_transaccion: "REC-002",
      observaciones: "",
    },
    {
      gimnasio_id: "gym-centro",
      id_pago: 3,
      id_cliente: "1000000002",
      id_membresia: 2,
      fecha_pago: "2026-10-01",
      valor: 80000,
      metodo_pago: "NEQUI",
      estado_pago: "EXITOSO",
      referencia_transaccion: "REC-003",
      observaciones: "",
    },
    {
      gimnasio_id: "gym-centro",
      id_pago: 4,
      id_cliente: "1000000001",
      id_membresia: 1,
      fecha_pago: "2026-10-01",
      valor: 80000,
      metodo_pago: "TRANSFERENCIA",
      estado_pago: "EXITOSO",
      referencia_transaccion: "REC-004",
      observaciones: "Pago mensual",
    },
  ];

  const filtrados = filtrarYOrdenarPagosCliente(pagos, "1000000001", "gym-centro");
  assert.equal(filtrados.length, 3);
  assert.deepEqual(
    filtrados.map((p) => p.id_pago),
    [4, 2, 1],
  );
  assert.equal(filtrados[0].metodo_pago, "TRANSFERENCIA");
  assert.equal(filtrados[0].referencia_transaccion, "REC-004");
});

test("ETAPA 9: historial de membresías excluye la actual y ordena cronológicamente", () => {
  const membresias = [
    {
      gimnasio_id: "gym-centro",
      id_membresia: 1,
      id_cliente: "1000000001",
      id_plan: 1,
      tipo_membresia: "Básico",
      modalidad_pago: "MENSUAL",
      valor: 50000,
      fecha_inicio: "2026-07-01",
      fecha_vencimiento: "2026-08-01",
      estado: "VENCIDA",
    },
    {
      gimnasio_id: "gym-centro",
      id_membresia: 2,
      id_cliente: "1000000001",
      id_plan: 2,
      tipo_membresia: "Estándar",
      modalidad_pago: "MENSUAL",
      valor: 80000,
      fecha_inicio: "2026-08-01",
      fecha_vencimiento: "2026-09-01",
      estado: "CANCELADA",
    },
    {
      gimnasio_id: "gym-centro",
      id_membresia: 3,
      id_cliente: "1000000001",
      id_plan: 3,
      tipo_membresia: "Premium",
      modalidad_pago: "MENSUAL",
      valor: 110000,
      fecha_inicio: "2026-10-01",
      fecha_vencimiento: "2026-11-01",
      estado: "ACTIVA",
    },
    {
      gimnasio_id: "gym-otro",
      id_membresia: 4,
      id_cliente: "1000000001",
      id_plan: 1,
      tipo_membresia: "Básico",
      modalidad_pago: "MENSUAL",
      valor: 50000,
      fecha_inicio: "2026-09-01",
      fecha_vencimiento: "2026-10-01",
      estado: "VENCIDA",
    },
  ];

  const anteriores = separarMembresiasCliente(membresias, "1000000001", "gym-centro", 3);
  assert.equal(anteriores.length, 2);
  assert.deepEqual(
    anteriores.map((m) => m.id_membresia),
    [2, 1],
  );
  assert.equal(anteriores[0].estado, "CANCELADA");
  assert.equal(anteriores[1].estado, "VENCIDA");
});

test("ETAPA 10: resumen físico distingue datos ausentes de cero y calcula deltas neutrales", () => {
  assert.equal(calcularResumenFisico([]), null);

  const unica = [
    {
      gimnasio_id: "gym-centro",
      id_progreso: 1,
      id_cliente: "1000000001",
      fecha: "2026-10-01",
      peso: 72.4,
      altura: 1.75,
      porcentaje_grasa: 18.2,
      masa_muscular: 31.0,
      notas: "Primera",
    },
  ];
  const rUnica = calcularResumenFisico(unica);
  assert.ok(rUnica);
  assert.equal(rUnica.totalMediciones, 1);
  assert.equal(rUnica.ultimoPesoKg, 72.4);
  assert.equal(rUnica.diferenciaPesoKg, null);
  assert.equal(rUnica.etiquetaDiferenciaPeso, null);
  assert.equal(rUnica.ultimaGrasaPorcentaje, 18.2);
  assert.equal(rUnica.ultimaMasaMuscular, 31.0);
  assert.equal(rUnica.fechaUltimaMedicion, "2026-10-01");

  // Múltiples mediciones con delta positivo, negativo y neutro
  const variaciones = [
    {
      gimnasio_id: "gym-centro",
      id_progreso: 1,
      id_cliente: "1000000001",
      fecha: "2026-08-01",
      peso: 70.0,
      altura: 1.75,
      notas: "",
    },
    {
      gimnasio_id: "gym-centro",
      id_progreso: 2,
      id_cliente: "1000000001",
      fecha: "2026-09-01",
      peso: 71.5,
      altura: 1.75,
      porcentaje_grasa: 19.0,
      notas: "",
    },
  ];
  const rPos = calcularResumenFisico(variaciones);
  assert.equal(rPos?.etiquetaDiferenciaPeso, "+1.5 kg");
  assert.equal(rPos?.diferenciaPesoKg, 1.5);
  assert.equal(rPos?.ultimaGrasaPorcentaje, 19.0);
  assert.equal(rPos?.ultimaMasaMuscular, null, "masa ausente es null, no 0");

  const negativa = [
    { ...variaciones[0], peso: 72.0 },
    { ...variaciones[1], peso: 70.0 },
  ];
  assert.equal(calcularResumenFisico(negativa)?.etiquetaDiferenciaPeso, "-2.0 kg");

  const neutra = [
    { ...variaciones[0], peso: 70.0 },
    { ...variaciones[1], peso: 70.0 },
  ];
  assert.equal(calcularResumenFisico(neutra)?.etiquetaDiferenciaPeso, "0.0 kg");
});

test("ETAPA 10: puntos del gráfico respetan orden cronológico y no sustituyen valores ausentes con cero", () => {
  const mediciones = [
    {
      gimnasio_id: "gym-centro",
      id_progreso: 3,
      id_cliente: "1000000001",
      fecha: "2026-10-15",
      peso: 68.5,
      altura: 1.7,
      porcentaje_grasa: 21.0,
      notas: "",
    },
    {
      gimnasio_id: "gym-centro",
      id_progreso: 1,
      id_cliente: "1000000001",
      fecha: "2026-08-10",
      peso: 70.0,
      altura: 1.7,
      notas: "", // Sin porcentaje_grasa
    },
    {
      gimnasio_id: "gym-centro",
      id_progreso: 2,
      id_cliente: "1000000001",
      fecha: "2026-09-10",
      peso: 69.0,
      altura: 1.7,
      porcentaje_grasa: 22.0,
      notas: "",
    },
  ];

  const puntosPeso = obtenerPuntosGrafico(mediciones, "PESO");
  assert.equal(puntosPeso.length, 3);
  assert.deepEqual(
    puntosPeso.map((p) => p.valor),
    [70.0, 69.0, 68.5],
  );
  assert.deepEqual(
    puntosPeso.map((p) => p.fecha),
    ["2026-08-10", "2026-09-10", "2026-10-15"],
  );

  const puntosGrasa = obtenerPuntosGrafico(mediciones, "GRASA");
  assert.equal(puntosGrasa.length, 2, "ignora el registro sin grasa sin inventar 0%");
  assert.deepEqual(
    puntosGrasa.map((p) => p.valor),
    [22.0, 21.0],
  );

  const metricas = determinarMetricasDisponibles(mediciones);
  assert.deepEqual(metricas, ["PESO", "GRASA"]);

  const sinGrasa = [mediciones[1]];
  assert.deepEqual(determinarMetricasDisponibles(sinGrasa), ["PESO"]);
});

test("ETAPA 10: ordenamiento de mediciones y manejo de fechas repetidas", () => {
  const mediciones = [
    {
      gimnasio_id: "gym-centro",
      id_progreso: 10,
      id_cliente: "1000000001",
      fecha: "2026-10-01",
      peso: 70.0,
      altura: 1.7,
      notas: "Mañana",
    },
    {
      gimnasio_id: "gym-centro",
      id_progreso: 11,
      id_cliente: "1000000001",
      fecha: "2026-10-01",
      peso: 70.5,
      altura: 1.7,
      notas: "Tarde",
    },
    {
      gimnasio_id: "gym-centro",
      id_progreso: 12,
      id_cliente: "1000000001",
      fecha: "2026-10-15",
      peso: 69.8,
      altura: 1.7,
      notas: "",
    },
  ];

  const asc = ordenarMedicionesCronologico(mediciones);
  assert.deepEqual(
    asc.map((m) => m.id_progreso),
    [10, 11, 12],
  );

  const desc = ordenarMedicionesReciente(mediciones);
  assert.deepEqual(
    desc.map((m) => m.id_progreso),
    [12, 11, 10],
  );

  const puntos = obtenerPuntosGrafico(mediciones, "PESO");
  assert.equal(puntos.length, 3);
  assert.match(puntos[0].etiquetaFecha, /#10/);
  assert.match(puntos[1].etiquetaFecha, /#11/);
  assert.doesNotMatch(puntos[2].etiquetaFecha, /#12/);
});

test("ETAPA 11: separar citas cliente respeta tenant/usuario y ordena próximas y pasadas", () => {
  const hoy = "2026-10-27";
  const ahora = "10:00";
  const citas = [
    {
      id_cita: 1,
      gimnasio_id: "gym-centro",
      id_cliente: "1000000001",
      id_instructor: "2000000001",
      fecha: "2026-10-27",
      hora: "11:00",
      estado: "CONFIRMADA",
      tipo_cita: "EVALUACION",
      notas: "Cita hoy más tarde",
    },
    {
      id_cita: 2,
      gimnasio_id: "gym-centro",
      id_cliente: "1000000001",
      id_instructor: "2000000002",
      fecha: "2026-10-28",
      hora: "09:00",
      estado: "PENDIENTE",
      tipo_cita: "NUTRICION",
      notas: "Cita mañana",
    },
    {
      id_cita: 3,
      gimnasio_id: "gym-centro",
      id_cliente: "1000000001",
      id_instructor: "2000000001",
      fecha: "2026-10-27",
      hora: "08:30",
      estado: "CONFIRMADA",
      tipo_cita: "CONSULTA",
      notas: "Cita hoy pero hora ya pasada",
    },
    {
      id_cita: 4,
      gimnasio_id: "gym-centro",
      id_cliente: "1000000001",
      id_instructor: "2000000001",
      fecha: "2026-10-20",
      hora: "14:00",
      estado: "COMPLETADA",
      tipo_cita: "EVALUACION",
      notas: "Cita semana pasada completada",
    },
    {
      id_cita: 5,
      gimnasio_id: "gym-centro",
      id_cliente: "1000000001",
      id_instructor: "2000000003",
      fecha: "2026-10-29",
      hora: "16:00",
      estado: "CANCELADA",
      tipo_cita: "SEGUIMIENTO",
      notas: "Cita futura pero cancelada",
    },
    // Cita de otro cliente
    {
      id_cita: 6,
      gimnasio_id: "gym-centro",
      id_cliente: "1000000002",
      id_instructor: "2000000001",
      fecha: "2026-10-28",
      hora: "10:00",
      estado: "CONFIRMADA",
      tipo_cita: "EVALUACION",
      notas: "Otro cliente",
    },
    // Cita en otro gimnasio
    {
      id_cita: 7,
      gimnasio_id: "gym-titan",
      id_cliente: "1000000001",
      id_instructor: "2000000001",
      fecha: "2026-10-28",
      hora: "11:00",
      estado: "CONFIRMADA",
      tipo_cita: "EVALUACION",
      notas: "Otro gym",
    },
  ];

  const res = separarCitasCliente({
    citas,
    idCliente: "1000000001",
    gimnasioId: "gym-centro",
    hoy,
    horaActualTexto: ahora,
  });

  // Próximas: cita 1 (hoy 11:00) y cita 2 (mañana 09:00)
  assert.deepEqual(
    res.proximas.map((c) => c.id_cita),
    [1, 2],
  );
  // Pasadas: cita 5 (cancelada futura 2026-10-29), cita 3 (hoy 08:30 ya pasó), cita 4 (2026-10-20 completada)
  assert.deepEqual(
    res.pasadas.map((c) => c.id_cita),
    [5, 3, 4],
  );
});

test("ETAPA 11: reglas para permitir o rechazar cancelación de cita", () => {
  const hoy = "2026-10-27";
  const ahora = "10:00";

  // Permitida: PENDIENTE futura
  assert.equal(
    puedeCancelarCita({ estado: "PENDIENTE", fecha: "2026-10-28", hora: "08:00" }, hoy, ahora),
    true,
  );
  // Permitida: CONFIRMADA hoy más tarde
  assert.equal(
    puedeCancelarCita({ estado: "CONFIRMADA", fecha: "2026-10-27", hora: "11:00" }, hoy, ahora),
    true,
  );
  // Rechazada: cita hoy que ya pasó
  assert.equal(
    puedeCancelarCita({ estado: "CONFIRMADA", fecha: "2026-10-27", hora: "09:30" }, hoy, ahora),
    false,
  );
  // Rechazada: cita fecha pasada
  assert.equal(
    puedeCancelarCita({ estado: "CONFIRMADA", fecha: "2026-10-26", hora: "15:00" }, hoy, ahora),
    false,
  );
  // Rechazada: estado terminal COMPLETADA o CANCELADA
  assert.equal(
    puedeCancelarCita({ estado: "COMPLETADA", fecha: "2026-10-28", hora: "08:00" }, hoy, ahora),
    false,
  );
  assert.equal(
    puedeCancelarCita({ estado: "CANCELADA", fecha: "2026-10-28", hora: "08:00" }, hoy, ahora),
    false,
  );
});

test("ETAPA 11: filtrado de horarios disponibles con instructor, fecha y choques", () => {
  const hoy = "2026-10-27"; // martes
  const instructor = {
    gimnasio_id: "gym-centro",
    numero_identificacion: "2000000001",
    tipo_identificacion: "CC",
    nombre: "Carlos",
    apellidos: "Gómez",
    telefono: "3001234567",
    correo: "carlos@gym.com",
    especialidad: "FUERZA",
    fecha_contratacion: "2024-01-01",
    estado: "ACTIVO",
    horario: {
      MARTES: [{ desde: "08:00", hasta: "11:00" }],
      MIERCOLES: [{ desde: "09:00", hasta: "12:00" }],
    },
  };

  // Cita existente del instructor a las 09:30 el martes
  const citasGimnasio = [
    {
      id_cita: 99,
      gimnasio_id: "gym-centro",
      id_cliente: "1000000002",
      id_instructor: "2000000001",
      fecha: "2026-10-27",
      hora: "09:30",
      estado: "CONFIRMADA",
      tipo_cita: "EVALUACION",
      notas: "",
    },
  ];

  // Fecha pasada -> vacío
  assert.deepEqual(
    filtrarHorariosDisponibles({
      instructor,
      fecha: "2026-10-26",
      franjasOcupadas: aFranjasOcupadas(citasGimnasio),
      hoy,
      horaActualTexto: "08:00",
    }),
    [],
  );

  // Día que el instructor no atiende (jueves 2026-10-29) -> vacío
  assert.deepEqual(
    filtrarHorariosDisponibles({
      instructor,
      fecha: "2026-10-29",
      franjasOcupadas: aFranjasOcupadas(citasGimnasio),
      hoy,
      horaActualTexto: "08:00",
    }),
    [],
  );

  // Martes hoy a las 08:45: slots en 08:00-11:00 son 08:00, 08:30, 09:00, 09:30, 10:00, 10:30, 11:00
  // Filtra los <= 08:45 (08:00, 08:30 eliminados)
  // Filtra choque en 09:30 (eliminado)
  // Quedan: 09:00, 10:00, 10:30, 11:00
  const slotsHoy = filtrarHorariosDisponibles({
    instructor,
    fecha: "2026-10-27",
    franjasOcupadas: aFranjasOcupadas(citasGimnasio),
    hoy,
    horaActualTexto: "08:45",
  });
  assert.deepEqual(slotsHoy, ["09:00", "10:00", "10:30", "11:00"]);
});

test("ETAPA 11: clases grupales separa activas e historial y valida retiro", () => {
  const hoy = "2026-10-27";
  const ahora = "10:00";
  const claseA = {
    id_clase: 101,
    gimnasio_id: "gym-centro",
    id_instructor: "2000000001",
    nombre: "Rumba Mañana",
    tipo_clase: "RUMBA",
    dia_semana: "MARTES",
    hora: "11:00",
    duracion_min: 60,
    aforo_max: 20,
    inscritos: [],
    estado: "ACTIVA",
  };
  const claseB = {
    id_clase: 102,
    gimnasio_id: "gym-centro",
    id_instructor: "2000000002",
    nombre: "Yoga Relax",
    tipo_clase: "YOGA",
    dia_semana: "MIERCOLES",
    hora: "09:00",
    duracion_min: 45,
    aforo_max: 15,
    inscritos: [],
    estado: "ACTIVA",
  };

  const filas = [
    {
      inscripcion: {
        id_inscripcion: 1,
        gimnasio_id: "gym-centro",
        id_clase: 101,
        id_cliente: "1000000001",
        fecha: "2026-10-27",
        estado: "INSCRITA",
        creada_el: "2026-10-20",
      },
      clase: claseA,
    },
    {
      inscripcion: {
        id_inscripcion: 2,
        gimnasio_id: "gym-centro",
        id_clase: 102,
        id_cliente: "1000000001",
        fecha: "2026-10-28",
        estado: "INSCRITA",
        creada_el: "2026-10-20",
      },
      clase: claseB,
    },
    {
      inscripcion: {
        id_inscripcion: 3,
        gimnasio_id: "gym-centro",
        id_clase: 101,
        id_cliente: "1000000001",
        fecha: "2026-10-20",
        estado: "INSCRITA",
        creada_el: "2026-10-15",
      },
      clase: claseA,
    },
    {
      inscripcion: {
        id_inscripcion: 4,
        gimnasio_id: "gym-centro",
        id_clase: 102,
        id_cliente: "1000000001",
        fecha: "2026-10-28",
        estado: "RETIRADA",
        creada_el: "2026-10-20",
      },
      clase: claseB,
    },
  ];

  const sep = separarInscripcionesCliente({ filas, hoy, horaActualTexto: ahora });
  // Activas: id 1 (hoy 11:00) y id 2 (mañana 09:00)
  assert.deepEqual(
    sep.activas.map((f) => f.inscripcion.id_inscripcion),
    [1, 2],
  );
  // Historial: id 4 (retirada 2026-10-28) e id 3 (pasada 2026-10-20)
  assert.deepEqual(
    sep.historial.map((f) => f.inscripcion.id_inscripcion),
    [4, 3],
  );

  // Retirada permitida: inscripción 2 mañana
  assert.equal(puedeRetirarseClase(filas[1].inscripcion, "09:00", hoy, ahora), true);
  // Retirada permitida: inscripción 1 hoy 11:00 con hora actual 10:00
  assert.equal(puedeRetirarseClase(filas[0].inscripcion, "11:00", hoy, ahora), true);
  // Retirada no permitida si ya pasó o empezó: hoy 11:00 con hora actual 11:15
  assert.equal(puedeRetirarseClase(filas[0].inscripcion, "11:00", hoy, "11:15"), false);
  // Retirada no permitida si ya está retirada o cancelada
  assert.equal(puedeRetirarseClase(filas[3].inscripcion, "09:00", hoy, ahora), false);
});

test("ETAPA 11: insignias usan el sistema compartido badge-g (gymbrot.css)", () => {
  assert.deepEqual(badgeEstadoCita("CONFIRMADA"), { label: "Confirmada", className: "badge-confirmada" });
  assert.deepEqual(badgeEstadoCita("PENDIENTE"), { label: "Pendiente", className: "badge-pendiente" });
  assert.deepEqual(badgeEstadoCita("CANCELADA"), { label: "Cancelada", className: "badge-cancelada" });
  assert.deepEqual(badgeEstadoCita("COMPLETADA"), { label: "Completada", className: "badge-completada" });

  assert.deepEqual(badgeEstadoInscripcion("INSCRITA"), { label: "Reservada", className: "badge-activo" });
  assert.deepEqual(badgeEstadoInscripcion("RETIRADA"), { label: "Retirada", className: "badge-inactivo" });
  assert.deepEqual(badgeEstadoInscripcion("CANCELADA"), { label: "Cancelada por el gimnasio", className: "badge-cancelada" });
});

test("ETAPA 11: franjas ocupadas no conservan cliente ni notas y siguen bloqueando choques", () => {
  const citas = [
    {
      id_cita: 50,
      gimnasio_id: "gym-centro",
      id_cliente: "1000000099",
      id_instructor: "2000000001",
      fecha: "2026-10-28",
      hora: "09:00",
      estado: "PENDIENTE",
      tipo_cita: "NUTRICION",
      notas: "Dato privado de otro cliente",
    },
    {
      id_cita: 51,
      gimnasio_id: "gym-centro",
      id_cliente: "1000000098",
      id_instructor: "2000000001",
      fecha: "2026-10-28",
      hora: "09:30",
      estado: "CANCELADA",
      tipo_cita: "CONSULTA",
      notas: "",
    },
  ];
  const franjas = aFranjasOcupadas(citas);
  // Las canceladas no ocupan; las demás solo guardan instructor, fecha y hora
  assert.deepEqual(franjas, [{ id_instructor: "2000000001", fecha: "2026-10-28", hora: "09:00" }]);
  assert.equal(JSON.stringify(franjas).includes("1000000099"), false);
  assert.equal(JSON.stringify(franjas).includes("privado"), false);
  assert.equal(JSON.stringify(franjas).includes("PENDIENTE"), false);

  const instructor = {
    numero_identificacion: "2000000001",
    estado: "ACTIVO",
    horario: { MIERCOLES: [{ desde: "09:00", hasta: "10:00" }] },
  };
  const slots = filtrarHorariosDisponibles({
    instructor,
    fecha: "2026-10-28",
    franjasOcupadas: franjas,
    hoy: "2026-10-27",
    horaActualTexto: "10:00",
  });
  // 09:00 ocupada; 09:30 libre porque la cita estaba cancelada
  assert.deepEqual(slots, ["09:30", "10:00"]);
});

test("ETAPA 11 (B3): horarios disponibles excluyen colisiones con citas y clases del propio cliente", () => {
  const instructor = {
    numero_identificacion: "2000000001",
    estado: "ACTIVO",
    horario: { LUNES: [{ desde: "08:00", hasta: "12:00" }] },
  };
  const fecha = "2026-11-02"; // Lunes futuro

  // El instructor no tiene citas ocupadas
  const franjasOcupadas = [];

  // El cliente ya tiene una cita activa propia a las 09:00 con otro instructor
  const citasCliente = [
    {
      id_cita: 10,
      gimnasio_id: "gym-centro",
      id_cliente: "1000000001",
      id_instructor: "2000000002",
      fecha,
      hora: "09:00",
      estado: "CONFIRMADA",
      tipo_cita: "EVALUACION",
      notas: "",
    },
    // Cita cancelada a las 11:30 no debe bloquear
    {
      id_cita: 11,
      gimnasio_id: "gym-centro",
      id_cliente: "1000000001",
      id_instructor: "2000000002",
      fecha,
      hora: "11:30",
      estado: "CANCELADA",
      tipo_cita: "CONSULTA",
      notas: "",
    },
  ];

  // El cliente está inscrito a una clase de Rumba de 10:00 a 11:00 (duración 60m: cubre 10:00 y 10:30)
  const clasesCliente = [
    {
      inscripcion: {
        id_inscripcion: 20,
        gimnasio_id: "gym-centro",
        id_clase: 101,
        id_cliente: "1000000001",
        fecha,
        estado: "INSCRITA",
        creada_el: "2026-10-25",
      },
      clase: {
        id_clase: 101,
        gimnasio_id: "gym-centro",
        id_instructor: "2000000003",
        nombre: "Rumba Intensa",
        tipo_clase: "RUMBA",
        dia_semana: "LUNES",
        hora: "10:00",
        duracion_min: 60,
        aforo_max: 20,
        inscritos: [],
        estado: "ACTIVA",
      },
    },
  ];

  const slots = filtrarHorariosDisponibles({
    instructor,
    fecha,
    franjasOcupadas,
    hoy: "2026-10-27",
    horaActualTexto: "08:00",
    citasCliente,
    clasesCliente,
  });

  // Franjas de 08:00 a 12:00 son: 08:00, 08:30, 09:00, 09:30, 10:00, 10:30, 11:00, 11:30, 12:00
  // 09:00 bloqueada por cita propia
  // 10:00 y 10:30 bloqueadas por clase propia de 10:00-11:00
  // 11:30 NO bloqueada porque la cita propia está cancelada
  assert.equal(slots.includes("09:00"), false);
  assert.equal(slots.includes("10:00"), false);
  assert.equal(slots.includes("10:30"), false);
  assert.equal(slots.includes("08:00"), true);
  assert.equal(slots.includes("08:30"), true);
  assert.equal(slots.includes("09:30"), true);
  assert.equal(slots.includes("11:00"), true);
  assert.equal(slots.includes("11:30"), true);
  assert.equal(slots.includes("12:00"), true);
});
