const SEED_ENABLED = true;   

const SEED = {
  clientes: [
    { numero_identificacion:'1000000001', tipo_identificacion:'CC', nombre:'Ana María',    apellidos:'Ruiz',     telefono:'3001112233', correo:'ana.ruiz@mail.com',   direccion:'Cra 15 #23-40', fecha_nacimiento:'1995-03-12', estado:'ACTIVO',     fecha_registro:'2026-01-10' },
    { numero_identificacion:'1000000002', tipo_identificacion:'CC', nombre:'Carlos Andrés', apellidos:'Pérez',    telefono:'3012223344', correo:'carlos.perez@mail.com',direccion:'Cl 20 #5-16',   fecha_nacimiento:'1988-11-02', estado:'ACTIVO',     fecha_registro:'2026-01-18' },
    { numero_identificacion:'1000000003', tipo_identificacion:'TI', nombre:'Juan David',    apellidos:'Gómez',    telefono:'3023334455', correo:'juan.gomez@mail.com',  direccion:'Cra 9 #10-11',  fecha_nacimiento:'2009-06-25', estado:'ACTIVO',     fecha_registro:'2026-02-01' },
    { numero_identificacion:'1000000004', tipo_identificacion:'CC', nombre:'Laura Sofía',   apellidos:'Martínez', telefono:'3034445566', correo:'laura.m@mail.com',     direccion:'Cl 8 #1-90',    fecha_nacimiento:'1999-09-14', estado:'SUSPENDIDO', fecha_registro:'2026-02-10' },
    { numero_identificacion:'1000000005', tipo_identificacion:'CE', nombre:'Diego Fernando',apellidos:'Ríos',     telefono:'3045556677', correo:'diego.rios@mail.com',  direccion:'Av 4 #12-30',   fecha_nacimiento:'1965-02-20', estado:'ACTIVO',     fecha_registro:'2026-02-15' },
    { numero_identificacion:'1000000006', tipo_identificacion:'CC', nombre:'Valentina',     apellidos:'Torres',   telefono:'3056667788', correo:'valen.torres@mail.com',direccion:'Cra 19 #4-5',   fecha_nacimiento:'2001-12-01', estado:'INACTIVO',   fecha_registro:'2026-03-01' },
    { numero_identificacion:'1000000007', tipo_identificacion:'CC', nombre:'Andrés Felipe', apellidos:'Navarro',  telefono:'3067778899', correo:'andres.nav@mail.com',  direccion:'Cl 44 #7-2',    fecha_nacimiento:'1992-07-19', estado:'ACTIVO',     fecha_registro:'2026-03-05' }
  ]
};
const db = {
  _key(col) { return 'gymbrot_' + col; },

  read(col) {
    const guardado = localStorage.getItem(this._key(col));
    if (guardado) return JSON.parse(guardado);      
    const semilla = (SEED[col] || []).slice();      
    this.write(col, semilla);
    return semilla;
  },

  write(col, arreglo) {
    localStorage.setItem(this._key(col), JSON.stringify(arreglo));
  }
};

const api = {

  _delay(ms = 200) { return new Promise(res => setTimeout(res, ms)); },

  clientes: {

    async list() {
      await api._delay();
      return db.read('clientes');                   
    },

    async get(id) {
      await api._delay();
      return db.read('clientes').find(c => c.numero_identificacion === id) || null;
    },

    async create(data) {
      await api._delay();
      const arr = db.read('clientes');
      if (arr.some(c => c.numero_identificacion === data.numero_identificacion))
        return { ok: false, mensaje: 'Ya existe un cliente con esa identificación' };
      const nuevo = Object.assign({ estado: 'ACTIVO', fecha_registro: utils.isoDate() }, data);
      arr.push(nuevo);
      db.write('clientes', arr);                     
      return { ok: true, mensaje: 'Cliente registrado', data: nuevo };
    },

    async update(id, data) {
      await api._delay();
      const arr = db.read('clientes');
      const c = arr.find(x => x.numero_identificacion === id);
      if (!c) return { ok: false, mensaje: 'Cliente no encontrado' };
      Object.assign(c, data);
      db.write('clientes', arr);                     
      return { ok: true, mensaje: 'Cliente actualizado', data: c };
    },

    async setEstado(id, estado) {
      await api._delay();
      const arr = db.read('clientes');
      const c = arr.find(x => x.numero_identificacion === id);
      if (!c) return { ok: false, mensaje: 'Cliente no encontrado' };
      c.estado = estado;
      db.write('clientes', arr);                     
      return { ok: true, mensaje: 'Estado actualizado', data: c };
    }
  }
};