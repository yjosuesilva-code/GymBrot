// TODO(T3): reemplazar por el dashboard completo del INSTRUCTOR
import { useEffect, useState } from "react";
import { current } from "../lib/auth";

export function DashboardInstructor() {
  const [sesion] = useState(current());
  return (
    <div className="card-g">
      <div className="card-head">
        <h2 className="card-title">Dashboard Instructor</h2>
      </div>
      <div style={{ padding: 16, opacity: 0.8 }}>
        <p>Bienvenido, {sesion?.nombre} {sesion?.apellidos}.</p>
        <p>Este panel lo completa T3. Aquí verás citas de hoy, rutinas activas, alumnos y próxima cita.</p>
      </div>
    </div>
  );
}
