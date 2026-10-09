import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { api } from "../../data/api";
import { logout } from "../../lib/auth";

type TopbarProps = { titulo: string; nombre: string };

export function Topbar({ titulo, nombre }: TopbarProps) {
  const navigate = useNavigate();

  // Nombre del gimnasio de la sesion, para que siempre se vea en que tenant
  // se esta trabajando. Lo resuelve api.ts; aqui solo se usa el nombre.
  const [gimnasio, setGimnasio] = useState("");

  useEffect(() => {
    api.gimnasios.activo().then((g) => setGimnasio(g?.nombre ?? ""));
  }, []);

  function salir() {
    logout();
    navigate("/login", { replace: true });
  }

  return (
    <header className="topbar">
      <div className="topbar-title">{titulo}</div>
      <div className="topbar-right">
        {gimnasio && (
          <span className="badge-g badge-confirmada" title="Gimnasio activo">
            <i className="bi bi-building me-1" aria-hidden />
            {gimnasio}
          </span>
        )}
        <span className="topbar-user">{nombre}</span>
        <div className="avatar">{(nombre.charAt(0) || "A").toUpperCase()}</div>
        <button type="button" className="topbar-logout" title="Cerrar sesión" onClick={salir}>
          <i className="bi bi-box-arrow-right" aria-hidden />
          <span>Cerrar sesión</span>
        </button>
      </div>
    </header>
  );
}