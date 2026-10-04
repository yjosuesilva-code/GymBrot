import { Routes, Route, Navigate } from "react-router-dom";
import { Layout } from "./components/layout/Layout";
import { Dashboard } from "./pages/Dashboard";
import { Clientes } from "./pages/Clientes";
import { ClienteDetalle } from "./pages/ClienteDetalle";
import { Login } from "./pages/Login";
import { Pendiente } from "./pages/Pendiente";

function App() {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route element={<Layout />}>
        <Route path="/dashboard" element={<Dashboard />} />
        <Route path="/clientes" element={<Clientes />} />
        <Route path="/clientes/:id" element={<ClienteDetalle />} />
        <Route path="/acceso" element={<Pendiente modulo="acceso" responsable="P1" />} />
        <Route path="/finanzas" element={<Pendiente modulo="finanzas" responsable="P1" />} />
        <Route path="/instructores" element={<Pendiente modulo="instructores" responsable="P3" />} />
        <Route path="/rutinas" element={<Pendiente modulo="rutinas" responsable="P3" />} />
        <Route path="/ejercicios" element={<Pendiente modulo="ejercicios" responsable="P4" />} />
        <Route path="/membresias" element={<Pendiente modulo="membresias" responsable="P4" />} />
        <Route path="/citas" element={<Pendiente modulo="citas" responsable="P2" />} />
        <Route
          path="/notificaciones"
          element={<Pendiente modulo="notificaciones" responsable="sin asignar" />}
        />
        <Route path="/" element={<Navigate to="/dashboard" replace />} />
      </Route>
    </Routes>
  );
}

export default App;
