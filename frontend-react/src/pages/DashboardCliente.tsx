// TODO(T4): reemplazar por dashboard completo del CLIENTE
import { useEffect, useState } from "react";
import { current } from "../lib/auth";

export function DashboardCliente() {
  const [sesion] = useState(current());
  return (
    <div className="card-g">
      <div className="card-head">
        <h2 className="card-title">Mi dashboard</h2>
      </div>
      <div style={{ padding: 16, opacity: 0.8 }}>
        <p>Bienvenido, {sesion?.nombre} {sesion?.apellidos}.</p>
        <p>Este panel lo completa T4. Aquí verás membresía, próxima cita, rutinas activas y progreso.</p>
      </div>
    </div>
  );
}
