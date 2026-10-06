import { useState } from "react";
import type { FormEvent } from "react";
import { Navigate, useNavigate } from "react-router-dom";
import * as auth from "../lib/auth";

export function Login() {
  const navigate = useNavigate();
  const [usuario, setUsuario] = useState("");
  const [clave, setClave] = useState("");
  const [error, setError] = useState("");
  const [entrando, setEntrando] = useState(false);

  if (auth.current()) {
    return <Navigate to="/dashboard" replace />;
  }

  async function entrar(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (entrando) return;

    setError("");
    setEntrando(true);
    try {
      const res = await auth.login(usuario, clave);
      if (res.ok) {
        navigate("/dashboard", { replace: true });
        return;
      }
      setError(res.mensaje);
    } finally {
      setEntrando(false);
    }
  }

  return (
    <div className="login-wrap">
      <form className="login-card" onSubmit={entrar}>
        <img
          className="login-logo"
          src="/logos/gymbrot-logo.png"
          alt="GYMBROT"
          width={348}
          height={180}
        />
        <h2>Iniciar sesión</h2>

        {error && (
          <div className="alert-g alert-error" role="alert">
            {error}
          </div>
        )}

        <label className="form-label-g" htmlFor="usuario">
          Usuario
        </label>
        <input
          className="form-control-dark"
          id="usuario"
          name="usuario"
          type="text"
          value={usuario}
          onChange={(e) => setUsuario(e.target.value)}
          placeholder="Usuario o correo"
          autoComplete="username"
          autoFocus
        />

        <label className="form-label-g" htmlFor="clave">
          Contraseña
        </label>
        <input
          className="form-control-dark"
          id="clave"
          name="clave"
          type="password"
          value={clave}
          onChange={(e) => setClave(e.target.value)}
          autoComplete="current-password"
        />

        <button className="btn-neon w-100" type="submit" disabled={entrando}>
          {entrando ? "Entrando..." : "Entrar"}
        </button>

        <p className="login-hint">
          Ingreso: admin / admin &nbsp;o&nbsp; admin@gymbrot.com / admin
        </p>
      </form>
    </div>
  );
}