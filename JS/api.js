const API_URL = "data/db.json";

const DB_PREFIX = "gymbrot_db_";

const api = {
  obtenerClaveDb() {
    const session = auth.current();
    const tenantId = session ? session.tenantId : "t1";
    return DB_PREFIX + tenantId;
  },

  leerLocal() {
    const raw = localStorage.getItem(this.obtenerClaveDb());
    return raw ? JSON.parse(raw) : null;
  },

  guardarLocal(db) {
    localStorage.setItem(this.obtenerClaveDb(), JSON.stringify(db));
  },

  async iniciar() {
    let db = this.leerLocal();
    if (db) return db;

    try {
      const respuesta = await fetch(API_URL);
      if (!respuesta.ok) throw new Error("HTTP " + respuesta.status);
      db = await respuesta.json();
      this.guardarLocal(db);
      console.log("Datos sembrados desde " + API_URL);
    } catch (error) {
      console.warn("No se pudo cargar " + API_URL + ", iniciando vacío:", error.message);
      db = this.crearDbVacia();
      this.guardarLocal(db);
    }
    return db;
  },

  crearDbVacia() {
    const colecciones = ["clientes", "especialidades", "instructores", "planes", "pagos", "ingresos", "ejercicios", "rutinas", "membresias", "progresos", "citas", "notificaciones", "plantillas"];
    const db = { tenant: { metaIngresosMensual: 15000000 } };
    colecciones.forEach((c) => (db[c] = []));
    return db;
  },

  async obtener(endpoint) {
    const clave = endpoint.replace(/^\//, "");
    const db = this.leerLocal();
    if (!db || !db[clave]) throw new Error("Colección inexistente: " + endpoint);
    await this.delay(100);
    return JSON.parse(JSON.stringify(db[clave]));
  },

  async borrarSeed() {
    localStorage.removeItem(this.obtenerClaveDb());
  },
};

Object.assign(api, {
  async get(endpoint) {
    return api.obtener(endpoint);
  },

  delay(ms) {
    return new Promise((res) => setTimeout(res, ms));
  },
});