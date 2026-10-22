// TODO(T2): reemplazar por login propio del SUPERADMIN con estilo propio
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { login } from "../lib/auth";

export function LoginPlataforma() {
  const nav = useNavigate();
  const [usuario, setUsuario] = useState("");
  const [clave, setClave] = useState("");
  const [error, setError] = useState("");

  async function entrar(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    const res = await login(usuario, clave, {});
    if (!res.ok) {
      setError(res.mensaje);
      return;
    }
    if (res.sesion.tipo_usuario !== "SUPERADMIN") {
      setError("Este acceso es solo para el superadministrador");
      return;
    }
    if (res.sesion.debe_cambiar_contrasena) {
      nav("/plataforma/cambiar-contrasena", { replace: true });
      return;
    }
    nav("/plataforma/dashboard", { replace: true });
  }

  return (
    <div style={{ maxWidth: 420, margin: "80px auto", padding: 24 }}>
      <div className="card-g">
        <div className="card-head"><h2 className="card-title">Acceso Plataforma</h2></div>
        <form onSubmit={entrar} style={{ display: "grid", gap: 12, padding: 16 }}>
          <input className="input-g" placeholder="Usuario o correo" value={usuario} onChange={(e) => setUsuario(e.target.value)} />
          <input className="input-g" type="password" placeholder="Contraseña" value={clave} onChange={(e) => setClave(e.target.value)} />
          {error && <div style={{ color: "#ff6b6b" }}>{error}</div>}
          <button className="btn-g" type="submit">Entrar</button>
        </form>
      </div>
    </div>
  );
}
