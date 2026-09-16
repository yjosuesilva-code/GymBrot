layout.render('clientes', 'Gestión de clientes');

const contenido = document.getElementById('app-content');
let clientesCargados = []; 
let editandoId = null;
contenido.innerHTML = `
  <div class="card-g">
    <div class="card-head">
      <div class="card-head-titles">
        <h2 class="card-title">Clientes</h2>
        <p class="card-sub">Gestiona los miembros del gimnasio</p>
      </div>
      <button class="btn-neon" id="btnNuevo">+ Nuevo cliente</button>
    </div>

    <div class="toolbar" style="margin-bottom: 20px;">
      <div class="search-box">
        <span class="search-ico">🔍</span>
        <input type="text" id="txtBuscar" class="form-control-dark" placeholder="Buscar por nombre, identificación o correo...">
      </div>
    </div>

    <div class="table-wrap">
      <table class="table-g">
        <thead>
          <tr>
            <th>Cliente</th>
            <th>Identificación</th>
            <th>Teléfono</th>
            <th>Edad</th>
            <th>Estado</th>
            <th>Acciones</th>
          </tr>
        </thead>
        <tbody id="tbodyClientes">
          <tr><td colspan="6" class="loader"><span class="spinner-g"></span>Cargando...</td></tr>
        </tbody>
      </table>
    </div>
  </div>
`;

document.body.insertAdjacentHTML('beforeend', `
  <div class="modal fade" id="modalCliente" tabindex="-1">
    <div class="modal-dialog modal-lg modal-dialog-centered">
      <div class="modal-content">
        <div class="modal-header">
          <h5 class="modal-title" id="modalTitulo">Nuevo cliente</h5>
          <button type="button" class="btn-close" data-bs-dismiss="modal"></button>
        </div>
        <div class="modal-body">
          <div class="alert-g alert-error" id="modalError"></div>
          <form id="formCliente">
            <div class="row g-3">
              <div class="col-md-4">
                <label class="form-label-g">Tipo</label>
                <select class="form-control-dark" id="fTipo">
                  <option value="CC">CC</option>
                  <option value="TI">TI</option>
                  <option value="CE">CE</option>
                  <option value="PP">PP</option>
                </select>
              </div>
              <div class="col-md-8">
                <label class="form-label-g">Número de identificación</label>
                <input class="form-control-dark" id="fIdentificacion" type="text">
              </div>
              <div class="col-md-6">
                <label class="form-label-g">Nombre</label>
                <input class="form-control-dark" id="fNombre" type="text">
              </div>
              <div class="col-md-6">
                <label class="form-label-g">Apellidos</label>
                <input class="form-control-dark" id="fApellidos" type="text">
              </div>
              <div class="col-md-6">
                <label class="form-label-g">Teléfono</label>
                <input class="form-control-dark" id="fTelefono" type="text">
              </div>
              <div class="col-md-6">
                <label class="form-label-g">Correo</label>
                <input class="form-control-dark" id="fCorreo" type="email">
              </div>
              <div class="col-md-8">
                <label class="form-label-g">Dirección</label>
                <input class="form-control-dark" id="fDireccion" type="text">
              </div>
              <div class="col-md-4">
                <label class="form-label-g">Fecha de nacimiento</label>
                <input class="form-control-dark" id="fNacimiento" type="date">
              </div>
            </div>
          </form>
        </div>
        <div class="modal-footer">
          <button class="btn-dark" data-bs-dismiss="modal">Cancelar</button>
          <button class="btn-neon" id="btnGuardar">Guardar</button>
        </div>
      </div>
    </div>
  </div>
`);
const modalCliente = new bootstrap.Modal(document.getElementById('modalCliente'));


document.getElementById('btnGuardar').addEventListener('click', async function () {
  const data = {
    tipo_identificacion:   document.getElementById('fTipo').value,
    numero_identificacion: document.getElementById('fIdentificacion').value.trim(),
    nombre:                document.getElementById('fNombre').value.trim(),
    apellidos:             document.getElementById('fApellidos').value.trim(),
    telefono:              document.getElementById('fTelefono').value.trim(),
    correo:                document.getElementById('fCorreo').value.trim(),
    direccion:             document.getElementById('fDireccion').value.trim(),
    fecha_nacimiento:      document.getElementById('fNacimiento').value
  };

  if (!data.numero_identificacion || !data.nombre || !data.apellidos) {
    mostrarError('La identificación, el nombre y los apellidos son obligatorios');
    return;
  }

  const res = editandoId
    ? await api.clientes.update(editandoId, data)
    : await api.clientes.create(data);

  if (!res.ok) {
    mostrarError(res.mensaje);
    return;
  }

  modalCliente.hide();
  cargarClientes();
});

function mostrarError(mensaje) {
  const box = document.getElementById('modalError');
  box.textContent = mensaje;
  box.classList.add('show');
}

document.getElementById('btnNuevo').addEventListener('click', function () {
  editandoId = null;                                           
  document.getElementById('formCliente').reset();
  document.getElementById('fIdentificacion').disabled = false; 
  document.getElementById('modalError').classList.remove('show');
  document.getElementById('modalTitulo').textContent = 'Nuevo cliente';
  modalCliente.show();
});

document.getElementById('tbodyClientes').addEventListener('click', async function (e) {
  // Editar
  const btnEditar = e.target.closest('.btn-editar');
  if (btnEditar) { abrirEdicion(btnEditar.dataset.id); return; }

  const btnEstado = e.target.closest('.btn-estado');
  if (btnEstado) {
    const id = btnEstado.dataset.id;
    const nuevo = btnEstado.dataset.estado === 'ACTIVO' ? 'INACTIVO' : 'ACTIVO';  
    await api.clientes.setEstado(id, nuevo);   
    cargarClientes();                
  }
});

async function abrirEdicion(id) {
  const c = await api.clientes.get(id);
  if (!c) return;
  editandoId = id;
  document.getElementById('modalTitulo').textContent = 'Editar cliente';
  document.getElementById('fTipo').value            = c.tipo_identificacion;
  document.getElementById('fIdentificacion').value  = c.numero_identificacion;
  document.getElementById('fIdentificacion').disabled = true;
  document.getElementById('fNombre').value          = c.nombre;
  document.getElementById('fApellidos').value       = c.apellidos;
  document.getElementById('fTelefono').value        = c.telefono;
  document.getElementById('fCorreo').value          = c.correo;
  document.getElementById('fDireccion').value       = c.direccion;
  document.getElementById('fNacimiento').value      = c.fecha_nacimiento;
  document.getElementById('modalError').classList.remove('show');
  modalCliente.show();
}
document.getElementById('txtBuscar').addEventListener('input', function (e) {
  const filtro = e.target.value.trim().toLowerCase();

  const filtrados = clientesCargados.filter(function (c) {
    const texto = (c.nombre + ' ' + c.apellidos + ' ' + c.numero_identificacion + ' ' + c.correo).toLowerCase();
    return texto.includes(filtro);
  });

  pintarClientes(filtrados);
});

async function cargarClientes() {
  clientesCargados = await api.clientes.list();   
  pintarClientes(clientesCargados);
}

function pintarClientes(lista) {
  const tbody = document.getElementById('tbodyClientes');

  if (lista.length === 0) {
    tbody.innerHTML = `<tr><td colspan="6" class="empty-state">No hay clientes registrados</td></tr>`;
    return;
  }

  tbody.innerHTML = lista.map(function (c) {
    const edad = utils.edad(c.fecha_nacimiento);
    return `
      <tr>
        <td>
          <div class="person">
            <div class="person-avatar">${utils.iniciales(c.nombre, c.apellidos)}</div>
            <div>
              <div class="person-name">${utils.esc(c.nombre)} ${utils.esc(c.apellidos)}</div>
              <div class="person-sub">${utils.esc(c.correo)}</div>
            </div>
          </div>
        </td>
        <td>${utils.esc(c.tipo_identificacion)} ${utils.esc(c.numero_identificacion)}</td>
        <td>${utils.esc(c.telefono)}</td>
        <td>${edad != null ? edad + ' años' : '—'}</td>
        <td><span class="badge-g ${utils.badgeClass(c.estado)}">${utils.esc(c.estado)}</span></td>
        <td>
          <div class="cell-actions">
            <button class="btn-icon" title="Ver detalle">👁</button>
            <button class="btn-icon btn-editar" data-id="${c.numero_identificacion}" title="Editar">✏️</button>
            <button class="btn-icon btn-estado" data-id="${c.numero_identificacion}" data-estado="${c.estado}" title="${c.estado === 'ACTIVO' ? 'Desactivar' : 'Activar'}">${c.estado === 'ACTIVO' ? '🚫' : '✅'}</button>
          </div>
        </td>
      </tr>
    `;
  }).join('');
}

cargarClientes();