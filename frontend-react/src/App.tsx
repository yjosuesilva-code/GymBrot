import type { ReactNode } from "react";
import { Routes, Route, Navigate, Outlet } from "react-router-dom";
import { Layout } from "./components/layout/Layout";
import { Dashboard } from "./pages/Dashboard";
import { Clientes } from "./pages/Clientes";
import { ClienteDetalle } from "./pages/ClienteDetalle";
import { Finanzas } from "./pages/Finanzas";          // [P1]
import { GymbrotAI } from "./pages/GymbrotAI";        // [P1]
import { Login } from "./pages/Login";
import { Instructores } from "./pages/Instructores";          // [P3]
import { InstructorDetalle } from "./pages/InstructorDetalle"; // [P3]
import { Rutinas } from "./pages/Rutinas";                    // [P3]
import { Ejercicios } from "./pages/Ejercicios";              // [P4]
import { Membresias } from "./pages/Membresias";              // [P4]
import { Progreso } from "./pages/Progreso";                  // [P2]
import { Citas } from "./pages/Citas";                        // [P2]
import { Landing } from "./pages/Landing";                    // [P2] plataforma
import type { SeccionLanding } from "./pages/Landing";
import { Registro } from "./pages/Registro";                  // [P2] plataforma
import { BuscarGimnasio } from "./pages/BuscarGimnasio";      // [multitenant-slug]
import { TenantProvider } from "./tenant/TenantProvider";     // [multitenant-slug]
import { RedirigirAlPortal } from "./tenant/RedirigirAlPortal"; // [multitenant-slug]
import { CambiarContrasena } from "./pages/CambiarContrasena";
// TODO(T3): reemplazar placeholders por vistas completas
import { DashboardInstructor } from "./pages/DashboardInstructor";
import { Alumnos } from "./pages/Alumnos";
// TODO(T4): reemplazar placeholders por vistas completas
import { DashboardCliente } from "./pages/DashboardCliente";
import { MiMembresia } from "./pages/MiMembresia";
import { MisCitas } from "./pages/MisCitas";
import { MiProgreso } from "./pages/MiProgreso";
import { MiRutina } from "./pages/MiRutina";
// TODO(T2): reemplazar por layout y panel completos de plataforma
import { LayoutPlataforma } from "./pages/LayoutPlataforma";
import { LoginPlataforma } from "./pages/LoginPlataforma";
import { DashboardPlataforma } from "./pages/DashboardPlataforma";

/* [multitenant-slug] Rutas privadas de un gimnasio, relativas a /g/:slug.
   Una sola lista: la usan el portal y las redirecciones de compatibilidad,
   asi que agregar una pagina aqui la deja disponible en los dos lados. */
const RUTAS_PORTAL: { path: string; element: ReactNode }[] = [
  { path: "dashboard", element: <Dashboard /> },
  { path: "clientes", element: <Clientes /> },
  { path: "clientes/:id", element: <ClienteDetalle /> },
  { path: "membresias", element: <Membresias /> },              // [P4]
  { path: "finanzas", element: <Finanzas /> },                  // [P1]
  { path: "rutinas", element: <Rutinas /> },                    // [P3]
  { path: "instructores", element: <Instructores /> },          // [P3]
  { path: "instructores/:id", element: <InstructorDetalle /> }, // [P3]
  { path: "citas", element: <Citas /> },                        // [P2]
  { path: "progreso", element: <Progreso /> },                  // [P2]
  // [P1] El control de acceso vive dentro de Clientes; /acceso queda como
  // alias para no romper enlaces o marcadores viejos.
  { path: "acceso", element: <Navigate to="../clientes" relative="path" replace /> },
  { path: "ejercicios", element: <Ejercicios /> },              // [P4]
  { path: "gymbrot-ai", element: <GymbrotAI /> },               // [P1]
  // TODO(T3): estas rutas se filtran por rol en el sidebar/guard; las vistas son placeholders
  { path: "instructor-dashboard", element: <DashboardInstructor /> },
  { path: "alumnos", element: <Alumnos /> },
  // TODO(T4)
  { path: "mi-dashboard", element: <DashboardCliente /> },
  { path: "mi-membresia", element: <MiMembresia /> },
  { path: "mis-citas", element: <MisCitas /> },
  { path: "mi-progreso", element: <MiProgreso /> },
  { path: "mi-rutina", element: <MiRutina /> },
  { path: "cambiar-contrasena", element: <CambiarContrasena /> },
];

const SECCIONES_LANDING: SeccionLanding[] = ["modulos", "panel", "aislamiento", "planes", "preguntas", "contacto"];

function App() {
  return (
    <Routes>
      {/* Sitio publico: sin sesion, sin tenant, sin Layout */}
      <Route path="/" element={<Landing />} />
      {/* Secciones de la landing: misma pagina, bajando a la seccion */}
      {SECCIONES_LANDING.map((s) => (
        <Route key={s} path={"/" + s} element={<Landing seccion={s} />} />
      ))}
      <Route path="/registro" element={<Registro />} />
      {/* /login ya no autentica: pregunta por el gimnasio y manda a /g/:slug/login */}
      <Route path="/login" element={<BuscarGimnasio />} />

      {/* Plataforma SUPERADMIN (fuera del portal multitenant) */}
      <Route path="/plataforma/login" element={<LoginPlataforma />} />
      <Route path="/plataforma" element={<LayoutPlataforma />}>
        <Route index element={<Navigate to="dashboard" replace />} />
        <Route path="dashboard" element={<DashboardPlataforma />} />
        <Route path="cambiar-contrasena" element={<CambiarContrasena />} />
        {/* TODO(T2): gimnasios, planes, suscripciones */}
      </Route>

      {/* Portal de cada gimnasio. TenantProvider resuelve :slug antes de pintar
          nada; Layout es el guard (sesion con acceso a ESE gimnasio). */}
      <Route
        path="/g/:slug"
        element={
          <TenantProvider>
            <Outlet />
          </TenantProvider>
        }
      >
        <Route index element={<Navigate to="dashboard" replace />} />
        <Route path="login" element={<Login />} />
        <Route element={<Layout />}>
          {RUTAS_PORTAL.map((r) => (
            <Route key={r.path} path={r.path} element={r.element} />
          ))}
          <Route path="*" element={<Navigate to="dashboard" replace />} />
        </Route>
      </Route>

      {/* Compatibilidad (Fases 1-3): las rutas viejas sin slug llevan al mismo
          path dentro del portal del gimnasio de la sesion. Se borran en la Fase 4. */}
      {RUTAS_PORTAL.map((r) => (
        <Route key={"legacy-" + r.path} path={"/" + r.path} element={<RedirigirAlPortal />} />
      ))}

      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

export default App;
