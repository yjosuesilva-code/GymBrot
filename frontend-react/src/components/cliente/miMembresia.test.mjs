// Node 24: node --test src/components/cliente/miMembresia.test.mjs
import assert from "node:assert/strict";
import { registerHooks } from "node:module";
import { after, beforeEach, test } from "node:test";

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

// La API real del mock se ejecuta contra memoria, nunca contra datos del navegador.
const descriptorStorage = Object.getOwnPropertyDescriptor(globalThis, "localStorage");
const memoria = new Map();
Object.defineProperty(globalThis, "localStorage", {
  configurable: true,
  value: {
    getItem: (key) => memoria.get(key) ?? null,
    setItem: (key, value) => memoria.set(key, String(value)),
    removeItem: (key) => memoria.delete(key),
  },
});

const { api } = await import("../../data/api.ts");
const { fijarGimnasio, limpiarGimnasio } = await import("../../tenant/tenantActivo.ts");
const { estadoMembresiaPorFecha, membresiaVigente } = await import("../../lib/membresias.ts");
const { utils } = await import("../../lib/utils.ts");
const { seleccionarMembresiaResumen, claseEstadoMembresia } = await import("./dashboardCliente.ts");
const {
  cargarDatosMiMembresia,
  resolverBeneficiosPlan,
  filtrarYOrdenarPagosCliente,
  separarMembresiasCliente,
} = await import("./miMembresia.ts");
const delayOriginal = api._delay;
api._delay = async () => {};

after(() => {
  api._delay = delayOriginal;
  limpiarGimnasio();
  if (descriptorStorage) Object.defineProperty(globalThis, "localStorage", descriptorStorage);
  else delete globalThis.localStorage;
});

const hoy = "2026-10-26";
const cliente = { numero_identificacion: "cliente-a", gimnasio_id: "gym-a", estado: "ACTIVO" };
const membresia = {
  gimnasio_id: "gym-a", id_cliente: "cliente-a", id_membresia: 1, id_plan: 1,
  tipo_membresia: "Básico", modalidad_pago: "MENSUAL", valor: 50000,
  fecha_inicio: "2026-10-01", fecha_vencimiento: "2026-11-01", estado: "ACTIVA",
};
const futura = {
  ...membresia, id_membresia: 2, fecha_inicio: "2026-11-02", fecha_vencimiento: "2026-12-02",
};
const pago = {
  gimnasio_id: "gym-a", id_cliente: "cliente-a", id_pago: 1, id_membresia: 1,
  fecha_pago: hoy, valor: 50000, metodo_pago: "EFECTIVO", estado_pago: "EXITOSO",
  referencia_transaccion: "REC-A", observaciones: "",
};
const plan = {
  id_plan: 1, nombre: "Básico", descripcion: "Plan contratado",
  estado: "INACTIVO", beneficios: ["Sala de máquinas"],
  precio_mensual: 50000, precio_semestral: 285000, precio_anual: 540000,
};
const guardar = (clave, valor) => localStorage.setItem(`gymbrot_${clave}`, JSON.stringify(valor));
const resumen = (membresias, cuenta = cliente, fecha = hoy) => seleccionarMembresiaResumen({
  membresias, cliente: cuenta, idCliente: "cliente-a", gimnasioId: "gym-a", hoy: fecha,
});

beforeEach(() => {
  memoria.clear();
  guardar("session", { ...cliente, tipo_usuario: "CLIENTE", accesos: [{ gimnasio_id: "gym-a", rol: "CLIENTE" }] });
  guardar("clientes", [cliente]);
  guardar("membresias", [
    membresia,
    { ...membresia, id_cliente: "cliente-b", id_membresia: 3 },
    { ...membresia, gimnasio_id: "gym-b", id_membresia: 4 },
  ]);
  guardar("pagos", [
    pago,
    { ...pago, id_cliente: "cliente-b", id_pago: 3 },
    { ...pago, gimnasio_id: "gym-b", id_pago: 4 },
  ]);
  guardar("planes", [plan, { ...plan, id_plan: 2, estado: "ACTIVO" }]);
  fijarGimnasio("gym-a");
});

test("la vigente tiene prioridad sobre renovaciones futuras, canceladas y registros ajenos", () => {
  const seleccion = resumen([
    futura, membresia,
    { ...futura, id_membresia: 5, estado: "CANCELADA" },
    { ...futura, id_membresia: 6, gimnasio_id: "gym-b" },
    { ...futura, id_membresia: 7, id_cliente: "cliente-b" },
  ]);
  assert.equal(seleccion.membresia.id_membresia, 1);
  assert.equal(seleccion.vigente, true);
  assert.equal(seleccion.estadoEfectivo, "POR_VENCER");
});

test("sin vigente se muestra la próxima programada; no permite acceso antes de iniciar", () => {
  const posterior = { ...futura, id_membresia: 5, fecha_inicio: "2027-01-01", fecha_vencimiento: "2027-02-01" };
  const seleccion = resumen([posterior, futura]);
  assert.equal(seleccion.membresia.id_membresia, 2);
  assert.equal(seleccion.estadoEfectivo, "PROGRAMADA");
  assert.equal(seleccion.vigente, false);
  assert.equal(membresiaVigente(futura, hoy, cliente), false);
  assert.equal(membresiaVigente(futura, futura.fecha_inicio, cliente), true);
  assert.equal(membresiaVigente(futura, futura.fecha_vencimiento, cliente), true);
  assert.equal(membresiaVigente(futura, "2026-12-03", cliente), false);
  assert.equal(membresiaVigente({ ...membresia, estado: "DESCONOCIDO" }, hoy, cliente), false);
  assert.equal(resumen([futura], cliente, "2026-11-01").textoVigencia, "Comienza mañana");
});

test("el historial calcula vencimiento y programación sin alterar datos ni cancelar estados", () => {
  const vencida = { ...membresia, id_membresia: 6, fecha_vencimiento: "2026-10-25" };
  const cancelada = { ...vencida, id_membresia: 7, estado: "CANCELADA" };
  const filas = [membresia, futura, vencida, cancelada];
  const copia = structuredClone(filas);
  const historial = separarMembresiasCliente(filas, "cliente-a", "gym-a", 1);
  assert.deepEqual(historial.map((m) => estadoMembresiaPorFecha(m, hoy)), ["PROGRAMADA", "CANCELADA", "VENCIDA"]);
  assert.deepEqual(filas, copia);
  assert.equal(resumen([vencida]).textoVigencia, "Venció hace 1 día");
  assert.equal(resumen([cancelada]).estadoEfectivo, "CANCELADA");
});

test("distingue cuenta no verificada, suspendida, ausencia de membresía y vencimiento administrativo", () => {
  assert.equal(resumen([membresia], null).estadoEfectivo, "SIN_VERIFICAR");
  assert.equal(resumen([membresia], { ...cliente, gimnasio_id: "gym-b" }).estadoEfectivo, "SIN_VERIFICAR");
  assert.equal(resumen([membresia], { ...cliente, estado: "SUSPENDIDO" }).estadoEfectivo, "CUENTA_INACTIVA");
  assert.equal(resumen([]), null);
  assert.equal(resumen([{ ...membresia, estado: "VENCIDA" }]).textoVigencia, "Membresía registrada como vencida");
  assert.equal(claseEstadoMembresia("VENCIDA"), "badge-vencida");
  assert.equal(claseEstadoMembresia("CANCELADA"), "badge-cancelada");
  assert.equal(claseEstadoMembresia("PROGRAMADA"), "badge-pendiente");
});

test("API: cliente solo puede leer sus membresías y pagos, tanto por cédula como por listados", async () => {
  assert.deepEqual(await api.membresias.byCliente("cliente-a"), [membresia]);
  assert.deepEqual(await api.pagos.byCliente("cliente-a"), [pago]);
  assert.deepEqual(await api.membresias.byCliente("cliente-b"), []);
  assert.deepEqual(await api.pagos.byCliente("cliente-b"), []);
  assert.deepEqual(await api.membresias.list(), [membresia]);
  assert.deepEqual(await api.pagos.list(), [pago]);
});

test("API: administrador conserva el listado del gimnasio y consulta a otros clientes", async () => {
  guardar("session", { ...cliente, numero_identificacion: "admin", tipo_usuario: "ADMINISTRADOR" });
  assert.deepEqual((await api.membresias.list()).map((m) => m.id_membresia), [1, 3]);
  assert.deepEqual((await api.pagos.list()).map((p) => p.id_pago), [1, 3]);
  assert.equal((await api.membresias.byCliente("cliente-b"))[0].id_membresia, 3);
  assert.equal((await api.pagos.byCliente("cliente-b"))[0].id_pago, 3);
});

test("API: rechaza gimnasio no autorizado, sesión ausente y cliente sin identificación", async () => {
  fijarGimnasio("gym-b");
  assert.deepEqual(await api.membresias.byCliente("cliente-a"), []);
  assert.deepEqual(await api.pagos.list(), []);
  fijarGimnasio("gym-a");
  guardar("session", { gimnasio_id: "gym-a", tipo_usuario: "CLIENTE" });
  assert.deepEqual(await api.membresias.list(), []);
  assert.deepEqual(await api.pagos.byCliente("cliente-a"), []);
  guardar("session", { gimnasio_id: "gym-a", numero_identificacion: "cliente-a" });
  assert.deepEqual(await api.membresias.list(), []);
  assert.deepEqual(await api.pagos.list(), []);
  localStorage.removeItem("gymbrot_session");
  assert.deepEqual(await api.membresias.list(), []);
  assert.deepEqual(await api.pagos.list(), []);
});

test("API: la misma cédula en dos gimnasios conserva datos separados al cambiar de tenant", async () => {
  guardar("session", { ...cliente, tipo_usuario: "CLIENTE", accesos: [{ gimnasio_id: "gym-a" }, { gimnasio_id: "gym-b" }] });
  fijarGimnasio("gym-b");
  assert.deepEqual((await api.membresias.byCliente("cliente-a")).map((m) => m.id_membresia), [4]);
  assert.deepEqual((await api.pagos.byCliente("cliente-a")).map((p) => p.id_pago), [4]);
  fijarGimnasio("gym-a");
  assert.deepEqual(await api.membresias.list(), [membresia]);
});

test("carga beneficios de un plan desactivado sin ofrecerlo en el catálogo de venta", async () => {
  assert.deepEqual((await api.planes.list()).map((p) => p.id_plan), [2]);
  const datos = await cargarDatosMiMembresia(api, "cliente-a", "gym-a");
  assert.deepEqual(resolverBeneficiosPlan(1, datos.planes), ["Sala de máquinas"]);
  assert.deepEqual(datos.pagos, [pago]);
  assert.deepEqual(datos.membresias, [membresia]);
});

test("los errores de cada consulta se propagan y permiten reintentar, nunca simulan datos vacíos", async () => {
  for (const [coleccion, metodo] of [["clientes", "get"], ["planes", "list"], ["membresias", "byCliente"], ["pagos", "byCliente"]]) {
    const fuente = { ...api, [coleccion]: { ...api[coleccion], [metodo]: async () => { throw new Error(`Fallo ${coleccion}`); } } };
    await assert.rejects(cargarDatosMiMembresia(fuente, "cliente-a", "gym-a"), new RegExp(`Fallo ${coleccion}`));
  }
  const datos = await cargarDatosMiMembresia(api, "cliente-a", "gym-a");
  assert.equal(datos.cliente.estado, "ACTIVO");
});

test("un cliente ausente o de otro ámbito produce error de carga, no Cuenta inactiva", async () => {
  for (const cuenta of [null, { ...cliente, gimnasio_id: "gym-b" }, { ...cliente, numero_identificacion: "cliente-b" }]) {
    const fuente = { ...api, clientes: { ...api.clientes, get: async () => cuenta } };
    await assert.rejects(cargarDatosMiMembresia(fuente, "cliente-a", "gym-a"), /verificar tu cuenta/);
  }
});

test("pagos pendientes y fallidos mantienen su estado y se ordenan sin mutar; fechas e importes locales", () => {
  const pagos = [pago, { ...pago, id_pago: 2, estado_pago: "FALLIDO" }, { ...pago, id_pago: 3, estado_pago: "PENDIENTE" }];
  const copia = structuredClone(pagos);
  const resultado = filtrarYOrdenarPagosCliente(pagos, "cliente-a", "gym-a");
  assert.deepEqual(resultado.map((p) => p.estado_pago), ["PENDIENTE", "FALLIDO", "EXITOSO"]);
  assert.deepEqual(pagos, copia);
  assert.equal(utils.isoDate(hoy), hoy);
  assert.match(utils.fecha(hoy), /26/);
  assert.equal(utils.money(50000), "$50.000");
});
