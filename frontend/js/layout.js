const layout = {

  paginas: [
    { key: 'dashboard',    label: 'Dashboard',         href: 'dashboard.html' },
    { key: 'clientes',     label: 'Clientes',          href: 'clientes.html' },
    { key: 'instructores', label: 'Instructores',      href: 'instructores.html' },
    { key: 'membresias',   label: 'Membresías',        href: 'membresias.html' },
    { key: 'citas',        label: 'Citas',             href: 'citas.html' },
    { key: 'rutinas',      label: 'Rutinas',           href: 'rutinas.html' },
    { key: 'ejercicios',   label: 'Ejercicios',        href: 'ejercicios.html' },
    { key: 'progreso',     label: 'Progreso',          href: 'progreso.html' },
    { key: 'acceso',       label: 'Control de Acceso', href: 'acceso.html' },
    { key: 'finanzas',     label: 'Finanzas',          href: 'finanzas.html' }
  ],

  render(pagina, titulo) {

    const nav = this.paginas.map(function (p) {
      const activa = (p.key === pagina) ? 'active' : '';
      return `<a href="${p.href}" class="nav-item ${activa}">${p.label}</a>`;
    }).join('');

    const shell = `
      <div class="app-shell">
        <aside class="sidebar">
          <div class="sidebar-logo">GYMBROT</div>
          <nav class="nav-group">${nav}</nav>
        </aside>
        <div class="main-area">
          <header class="topbar">
            <div class="topbar-title">${titulo}</div>
            <div class="topbar-right">
              <span class="topbar-user">Admin</span>
              <div class="avatar">A</div>
            </div>
          </header>
          <main class="content" id="app-content"></main>
        </div>
      </div>`;

    document.getElementById('app').innerHTML = shell;
  }
};