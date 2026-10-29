import { useState } from "react";
import type { FormEvent } from "react";
import { Link, Navigate, useNavigate } from "react-router-dom";
import * as auth from "../lib/auth";

/* [plataforma] Login del SUPERADMIN: /plataforma/login. Mismo aspecto que el
   login de cada gimnasio (.login-card), pero sin gimnasio: el superadmin no
   pertenece a ninguno. */

export function LoginPlataforma() {
  const navigate = useNavigate();
  const [usuario, setUsuario] = useState("");
  const [clave, setClave] = useState("");
  const [error, setError] = useState("");
  const [entrando, setEntrando] = useState(false);

  const sesion = auth.current();
  // Ya entro: el layout decide si va al dashboard o al cambio de contrasena.
  if (sesion?.tipo_usuario === "SUPERADMIN") {
    return <Navigate to="/plataforma/dashboard" replace />;
  }
  // Hay sesion de un gimnasio en este navegador: entrar aqui la reemplaza.
  const sesionAjena = sesion !== null;

  async function entrar(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (entrando) return;

    setError("");
    setEntrando(true);
    try {
      const res = await auth.login(usuario, clave, {});
      if (!res.ok) {
        setError(res.mensaje);
        return;
      }
      if (res.sesion.tipo_usuario !== "SUPERADMIN") {
        // login() ya guardo la sesion; no se deja abierta la de un usuario
        // de gimnasio que entro por la puerta equivocada.
        auth.logout();
        setError("Este acceso es solo para el administrador de la plataforma. Los gimnasios entran por su propio enlace.");
        return;
      }
      navigate(res.sesion.debe_cambiar_contrasena ? "/plataforma/cambiar-contrasena" : "/plataforma/dashboard", {
        replace: true,
      });
    } finally {
      setEntrando(false);
    }
  }

  return (
    <div className="login-wrap">
      <form className="login-card" onSubmit={entrar}>
        <img className="login-logo" src="/logos/gymbrot-logo.png" alt="GYMBROT" width={348} height={180} />
        <h2>Panel de plataforma</h2>
        <p className="login-gym">
          <i className="bi bi-shield-lock me-1" aria-hidden />
          Solo administrador de GymBrot
        </p>

        {sesionAjena && !error && (
          <div className="alert-g alert-aviso show" role="status">
            Tienes una sesión abierta en un gimnasio. Si entras aquí, esa sesión se cierra.
          </div>
        )}

        {error && (
          <div className="alert-g alert-error show" role="alert">
            {error}
          </div>
        )}

        <label className="form-label-g" htmlFor="plat-usuario">
          Usuario
        </label>
        <input
          className="form-control-dark"
          id="plat-usuario"
          name="usuario"
          type="text"
          value={usuario}
          onChange={(e) => setUsuario(e.target.value)}
          placeholder="Usuario o correo"
          autoComplete="username"
          autoFocus
        />

        <label className="form-label-g" htmlFor="plat-clave">
          Contraseña
        </label>
        <input
          className="form-control-dark"
          id="plat-clave"
          name="clave"
          type="password"
          value={clave}
          onChange={(e) => setClave(e.target.value)}
          autoComplete="current-password"
        />

        <button className="btn-neon w-100" type="submit" disabled={entrando}>
          {entrando ? "Entrando..." : "Entrar"}
        </button>

        <p className="login-hint">Demo: superadmin / gymbrot2026 o dueno@gymbrot.com / gymbrot2026</p>

        <p className="login-hint">
          <Link to="/login" className="land-link">
            ¿Administras un gimnasio? Entra por el tuyo
          </Link>
        </p>
      </form>
    </div>
  );
}
