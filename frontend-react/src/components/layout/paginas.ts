export const paginas = [
  { to: "/dashboard", label: "Dashboard", icon: "bi-grid-1x2" },
  { to: "/clientes", label: "Clientes", icon: "bi-people" },
  { to: "/instructores", label: "Instructores", icon: "bi-person-badge" },
  { to: "/membresias", label: "Membresías", icon: "bi-ticket-perforated" },
  { to: "/rutinas", label: "Rutinas", icon: "bi-clipboard2-pulse" },
  // El legacy usa bi-dumbbell, pero ese icono no existe en bootstrap-icons
  // 1.11.3 (no hay ninguna dumbbell en las 2078 del set), asi que salia en
  // blanco. bi-lightning-charge-fill es el equivalente mas cercano.
  { to: "/ejercicios", label: "Ejercicios", icon: "bi-lightning-charge-fill" },
  { to: "/citas", label: "Citas", icon: "bi-calendar-check" },
  { to: "/progreso", label: "Progreso", icon: "bi-activity" },
  { to: "/notificaciones", label: "Notificaciones", icon: "bi-bell" },
  { to: "/finanzas", label: "Finanzas", icon: "bi-graph-up-arrow" },
  { to: "/gymbrot-ai", label: "Gymbrot AI", icon: "bi-stars" },
];
