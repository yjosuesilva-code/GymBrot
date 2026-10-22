import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { cambiarContrasena, current, logout, rutaInicioRol } from "../lib/auth";
import { useTenant } from "../tenant/TenantContext";

export function CambiarContrasena() {
  const sesion = current();
  const { ruta } = useTenant();
  const nav = useNavigate();
  const [nueva, setNueva] = useState("");
  const [confirmar, setConfirmar] = useState("");
  const [error, setError] = useState("");
  const [ok, setOk] = useState(false);

  if (!sesion) {
    logout();
    nav("/", { replace: true });
    return null;
  }

  async function guardar(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    if (nueva.trim().length < 6) {
      setError("La contraseña debe tener al menos 6 caracteres");
      return;
    }
    if (nueva.trim() !== confirmar.trim()) {
      setError("Las contraseñas no coinciden");
      return;
    }
    const res = await cambiarContrasena(nueva);
    if (!res.ok) {
      setError(res.mensaje);
      return;
    }
    setOk(true);
    // SUPERADMIN no vive en /g/:slug: usar rutaInicioRol
    if (sesion.tipo_usuario === "SUPERADMIN") {
      window.location.href = rutaInicioRol(res.sesion);
      return;
    }
    nav(ruta(rutaInicioRol(res.sesion)), { replace: true });
  }

  return (
    <div className="card-g" style={{ maxWidth: 420, margin: "40px auto" }}>
      <div className="card-head">
        <h2 className="card-title">Cambiar contraseña</h2>
      </div>
      <form onSubmit={guardar} style={{ display: "grid", gap: 12, padding: 16 }}>
        <p style={{ opacity: 0.8, margin: 0 }}>
          Es tu primer ingreso o se te pidió cambiarla. Debes actualizarla para continuar.
        </p>
        <input
          className="input-g"
          type="password"
          placeholder="Nueva contraseña (mínimo 6 caracteres)"
          value={nueva}
          onChange={(e) => setNueva(e.target.value)}
          autoFocus
        />
        <input
          className="input-g"
          type="password"
          placeholder="Confirmar contraseña"
          value={confirmar}
          onChange={(e) => setConfirmar(e.target.value)}
        />
        {error && <div style={{ color: "#ff6b6b" }}>{error}</div>}
        {ok && <div style={{ color: "#51cf66" }}>Contraseña actualizada</div>}
        <button className="btn-g" type="submit">Guardar</button>
      </form>
    </div>
  );
}
