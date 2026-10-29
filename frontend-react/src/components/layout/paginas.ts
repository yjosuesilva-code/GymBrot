import type { Usuario } from "../../types";

export type Pagina = { to: string; label: string; icon: string };

export const paginas: Pagina[] = [
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
  { to: "/finanzas", label: "Finanzas", icon: "bi-graph-up-arrow" },
  { to: "/gymbrot-ai", label: "Gymbrot AI", icon: "bi-stars" },
];

/* Menú filtrado por rol. SUPERADMIN no usa el sidebar del portal /g/:slug. */
export const paginasPorRol: Record<Usuario["tipo_usuario"], Pagina[] | null> = {
  SUPERADMIN: null,
  ADMINISTRADOR: paginas,
  INSTRUCTOR: [
    { to: "/instructor-dashboard", label: "Dashboard", icon: "bi-grid-1x2" },
    { to: "/citas", label: "Citas", icon: "bi-calendar-check" },
    { to: "/rutinas", label: "Rutinas", icon: "bi-clipboard2-pulse" },
    { to: "/progreso", label: "Progreso", icon: "bi-activity" },
    { to: "/alumnos", label: "Alumnos", icon: "bi-people" },
    { to: "/ejercicios", label: "Ejercicios", icon: "bi-lightning-charge-fill" },
    { to: "/gymbrot-ai", label: "Gymbrot AI", icon: "bi-stars" },
  ],
  CLIENTE: [
    { to: "/mi-dashboard", label: "Inicio", icon: "bi-grid-1x2" },
    { to: "/mi-membresia", label: "Mi membresía", icon: "bi-ticket-perforated" },
    { to: "/mis-citas", label: "Mis citas", icon: "bi-calendar-check" },
    { to: "/mi-progreso", label: "Mi progreso", icon: "bi-activity" },
    { to: "/mi-rutina", label: "Mi rutina", icon: "bi-clipboard2-pulse" },
  ],
};
