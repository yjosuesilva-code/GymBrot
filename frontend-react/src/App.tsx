import { Routes, Route, Navigate } from "react-router-dom";
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

function App() {
  return (
    <Routes>
      {/* [P2] Plataforma: paginas publicas, sin sesion ni Layout */}
      <Route path="/" element={<Landing />} />
      <Route path="/registro" element={<Registro />} />
      <Route path="/login" element={<Login />} />
      <Route element={<Layout />}>
        <Route path="/dashboard" element={<Dashboard />} />
        <Route path="/clientes" element={<Clientes />} />
        <Route path="/clientes/:id" element={<ClienteDetalle />} />
        <Route path="/finanzas" element={<Finanzas />} />           {/* [P1] */}
        <Route path="/acceso" element={<Navigate to="/clientes" replace />} />
        <Route path="/gymbrot-ai" element={<GymbrotAI />} />        {/* [P1] */}
        {/* [P3] Instructores */}
        <Route path="/instructores" element={<Instructores />} />
        <Route path="/instructores/:id" element={<InstructorDetalle />} />
        <Route path="/rutinas" element={<Rutinas />} />
        {/* [P4] Ejercicios */}
        <Route path="/ejercicios" element={<Ejercicios />} />
        {/* [P4] Membresias */}
        <Route path="/membresias" element={<Membresias />} />
        {/* [P2] Progreso */}
        <Route path="/progreso" element={<Progreso />} />
        {/* [P2] Citas */}
        <Route path="/citas" element={<Citas />} />
      </Route>
    </Routes>
  );
}

export default App;