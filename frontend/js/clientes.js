layout.render('clientes', 'Gestión de clientes');

const contenido = document.getElementById('app-content');
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

async function cargarClientes() {
  const clientes = await api.clientes.list();
  pintarClientes(clientes);
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
            <button class="btn-icon" title="Editar">✏️</button>
          </div>
        </td>
      </tr>
    `;
  }).join('');
}

cargarClientes();