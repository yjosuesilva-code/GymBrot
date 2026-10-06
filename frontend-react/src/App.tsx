import { Routes, Route, Navigate } from "react-router-dom";
import { Layout } from "./components/layout/Layout";
import { Dashboard } from "./pages/Dashboard";
import { Clientes } from "./pages/Clientes";
import { ClienteDetalle } from "./pages/ClienteDetalle";
import { Finanzas } from "./pages/Finanzas";
import { Acceso } from "./pages/Acceso";
import { GymbrotAI } from "./pages/GymbrotAI";
import { Login } from "./pages/Login";
import { Instructores } from "./pages/Instructores"; // [P3]
import { InstructorDetalle } from "./pages/InstructorDetalle"; // [P3]
import { Rutinas } from "./pages/Rutinas"; // [P3]
import { Progreso } from "./pages/Progreso"; // [P2]
import { Citas } from "./pages/Citas"; // [P2]

function App() {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route element={<Layout />}>
        <Route path="/dashboard" element={<Dashboard />} />
        <Route path="/clientes" element={<Clientes />} />
        <Route path="/clientes/:id" element={<ClienteDetalle />} />
        <Route path="/finanzas" element={<Finanzas />} />
        <Route path="/acceso" element={<Acceso />} />
        <Route path="/gymbrot-ai" element={<GymbrotAI />} />
        {/* Las demas secciones de paginas.ts todavia no tienen ruta. Como el
            Layout es una ruta sin path sigue renderizando sidebar y topbar, y
            lo unico que queda vacio es el Outlet. Registrar la ruta en
            cuanto exista la vista. */}
        {/* [P3] Instructores */}
        <Route path="/instructores" element={<Instructores />} />
        <Route path="/instructores/:id" element={<InstructorDetalle />} />
        <Route path="/rutinas" element={<Rutinas />} />
        {/* [P2] Progreso */}
        <Route path="/progreso" element={<Progreso />} />
        {/* [P2] Citas */}
        <Route path="/citas" element={<Citas />} />
        <Route path="/" element={<Navigate to="/dashboard" replace />} />
      </Route>
    </Routes>
  );
}

export default App;
