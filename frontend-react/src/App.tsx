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
import { Registro } from "./pages/Registro";                  // [P2] plataforma
import { BuscarGimnasio } from "./pages/BuscarGimnasio";      // [multitenant-slug]
import { TenantProvider } from "./tenant/TenantProvider";     // [multitenant-slug]
import { RedirigirAlPortal } from "./tenant/RedirigirAlPortal"; // [multitenant-slug]

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
];

function App() {
  return (
    <Routes>
      {/* Sitio publico: sin sesion, sin tenant, sin Layout */}
      <Route path="/" element={<Landing />} />
      <Route path="/planes" element={<Landing seccion="planes" />} />
      <Route path="/contacto" element={<Landing seccion="contacto" />} />
      <Route path="/registro" element={<Registro />} />
      {/* /login ya no autentica: pregunta por el gimnasio y manda a /g/:slug/login */}
      <Route path="/login" element={<BuscarGimnasio />} />

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
