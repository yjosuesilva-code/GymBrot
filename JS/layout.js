const layout = {
  NAV_ITEMS: [
    { id: "dashboard", label: "Dashboard", icon: "bi-grid-1x2", href: "dashboard.html" },
    { id: "clientes", label: "Clientes", icon: "bi-people", href: "clientes.html" },
    { id: "instructores", label: "Instructores", icon: "bi-person-badge", href: "instructores.html" },
    { id: "membresias", label: "Membresías", icon: "bi-ticket-perforated", href: "membresias.html" },
    { id: "acceso", label: "Control de Acceso", icon: "bi-shield-lock", href: "acceso.html" },
    { id: "rutinas", label: "Rutinas", icon: "bi-clipboard2-pulse", href: "rutinas.html" },
    { id: "ejercicios", label: "Ejercicios", icon: "bi-dumbbell", href: "ejercicios.html" },
    { id: "citas", label: "Citas", icon: "bi-calendar-check", href: "citas.html" },
    { id: "notificaciones", label: "Notificaciones", icon: "bi-bell", href: "notificaciones.html" },
    { id: "finanzas", label: "Finanzas", icon: "bi-graph-up-arrow", href: "finanzas.html" },
  ],

  render(activePage, titulo) {
    auth.requireAuth();

    const shell = document.getElementById("app-shell");
    if (!shell) return;
    shell.classList.add("app-shell");

    const session = auth.current();
    const initials = session && session.nombre ? session.nombre.charAt(0) : "A";

    shell.innerHTML = `
      <aside class="sidebar">
        <div class="sidebar-brand"><h1>GYMBROT</h1></div>
        <nav class="nav-group">
          ${this.NAV_ITEMS.map((item) => `
            <a class="nav-item ${item.id === activePage ? "active" : ""}" href="${item.href}">
              <i class="bi ${item.icon}"></i><span>${item.label}</span>
            </a>`).join("")}
        </nav>
        <hr class="sidebar-sep">
        <div class="sidebar-footer">
          <a class="nav-item" href="#" onclick="auth.logout(); return false;">
            <i class="bi bi-box-arrow-right"></i><span>Cerrar Sesión</span>
          </a>
        </div>
      </aside>
      <div class="main">
        <header class="topbar">
          <h2 id="page-title">${titulo}</h2>
          <div class="spacer"></div>
          <div class="topbar-user">
            <span>${session ? session.nombre : ""}</span>
            <span class="avatar">${initials}</span>
          </div>
        </header>
        <main class="content" id="main-content"></main>
      </div>
    `;

    document.body.insertBefore(shell, document.body.firstChild);
    document.title = `${titulo} · Gymbrot`;
  },
};