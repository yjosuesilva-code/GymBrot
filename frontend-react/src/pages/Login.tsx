import { useEffect, useState } from "react";
import type { FormEvent } from "react";
import { Link, Navigate, useLocation, useNavigate } from "react-router-dom";
import * as auth from "../lib/auth";
import { api } from "../data/api";
import { useTenant } from "../tenant/TenantContext";

/* [multitenant-slug] Login del portal de un gimnasio: /g/:slug/login. El
   gimnasio lo dice la URL (TenantProvider ya lo resolvio), asi que el
   usuario se busca solo dentro de el. */

// Credenciales de demo del seed, por gimnasio. Solo ayuda visual.
const DEMO: Record<string, string> = {
  "gymbrot-centro": "admin / admin  o  admin@gymbrot.com / admin",
  "titan-fitness": "titan / titan  o  admin@titanfitness.com / titan",
};

type EstadoLogin = { desde?: string; otroGimnasio?: boolean } | null;

export function Login() {
  const navigate = useNavigate();
  const location = useLocation();
  const { slug, gimnasio, ruta } = useTenant();
  const estado = location.state as EstadoLogin;

  // Solo se vuelve a rutas de este mismo portal: un `desde` armado a mano no
  // puede sacar al usuario a otro gimnasio ni a otro sitio.
  const destino =
    estado?.desde && estado.desde.startsWith(ruta("/") + "/") ? estado.desde : ruta("/dashboard");
  const [usuario, setUsuario] = useState("");
  const [clave, setClave] = useState("");
  const [error, setError] = useState("");
  const [entrando, setEntrando] = useState(false);
  const [lectorConectado, setLectorConectado] = useState(() => api.lector.estaConectado());

  // El legacy engancha un listener de HuellaService y actualiza el indicador
  // cuando cambia la conexion (loginController.java:55-71). Aqui se relee el
  // estado del mock cada 2s para que una desconexion se note sin recargar.
  useEffect(() => {
    const t = setInterval(() => setLectorConectado(api.lector.estaConectado()), 2000);
    return () => clearInterval(t);
  }, []);

  const sesion = auth.current();
  if (auth.tieneAcceso(sesion, gimnasio.gimnasio_id)) {
    return <Navigate to={destino} replace />;
  }
  // Hay sesion, pero de otro gimnasio: entrar aqui la reemplaza.
  const sesionAjena = sesion !== null || estado?.otroGimnasio === true;

  function alternarLector() {
    const siguiente = !lectorConectado;
    api.lector.setConectado(siguiente);
    setLectorConectado(siguiente);
  }

  async function entrar(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (entrando) return;

    setError("");
    setEntrando(true);
    try {
      const res = await auth.login(usuario, clave, { gimnasio });
      if (res.ok) {
        navigate(destino, { replace: true });
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
        <p className="login-gym">
          <i className="bi bi-building me-1" aria-hidden />
          {gimnasio.nombre}
        </p>

        <span
          className={"reader-status" + (lectorConectado ? " ok" : " off")}
          role="status"
          aria-live="polite"
        >
          <span className="reader-dot" />
          {lectorConectado ? "LECTOR CONECTADO" : "LECTOR DESCONECTADO"}
        </span>

        {sesionAjena && !error && (
          <div className="alert-g alert-aviso show" role="status">
            Tienes una sesión abierta en otro gimnasio. Si entras aquí, esa sesión se cierra.
          </div>
        )}

        {error && (
          <div className="alert-g alert-error show" role="alert">
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

        {DEMO[slug] && <p className="login-hint">Demo: {DEMO[slug]}</p>}

        <button type="button" className="reader-toggle" onClick={alternarLector}>
          Simular lector {lectorConectado ? "desconectado" : "conectado"}
        </button>

        {/* [P2] plataforma */}
        <p className="login-hint">
          <Link to="/login" className="land-link">¿No es tu gimnasio? Busca el tuyo</Link>
        </p>
      </form>
    </div>
  );
}