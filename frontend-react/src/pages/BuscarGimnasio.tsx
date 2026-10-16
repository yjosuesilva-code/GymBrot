import { useState } from "react";
import type { FormEvent } from "react";
import { Link, useNavigate } from "react-router-dom";
import { api } from "../data/api";
import * as auth from "../lib/auth";
import { slugify } from "../lib/slug";
import { rutaDeTenant } from "../tenant/TenantContext";

/* [multitenant-slug] /login sin gimnasio. Antes era el login global; ahora
   cada gimnasio tiene el suyo en /g/:slug/login, y esta pantalla solo
   pregunta a cual ir. Mantiene viva la URL /login (Landing, marcadores,
   enlaces de la Fase 1) sin volver a buscar usuarios en toda la plataforma.

   No lista los gimnasios a proposito: seria regalar el directorio completo
   de clientes de GymBrot a cualquiera que abra la pagina. */

/* Acepta lo que la gente suele pegar: 'iron-house', 'Iron House',
   'gymbrot.com/g/iron-house' o 'https://.../g/iron-house/login'. */
function slugDeEntrada(texto: string): string {
  const t = texto.trim();
  const m = t.match(/\/g\/([^/?#]+)/i);
  return slugify(m ? m[1] : t);
}

export function BuscarGimnasio() {
  const navigate = useNavigate();
  const [texto, setTexto] = useState("");
  const [error, setError] = useState("");
  const [buscando, setBuscando] = useState(false);
  const conSesion = auth.current() !== null;

  async function buscar(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (buscando) return;
    const slug = slugDeEntrada(texto);
    if (!slug) return setError("Escribe el enlace o el nombre de tu gimnasio.");

    setError("");
    setBuscando(true);
    try {
      const g = await api.gimnasios.porSlug(slug);
      if (!g) return setError(`No encontramos ningún gimnasio con el enlace "${slug}".`);
      navigate(rutaDeTenant(g.slug, "/login"));
    } finally {
      setBuscando(false);
    }
  }

  return (
    <div className="login-wrap">
      <form className="login-card" onSubmit={buscar}>
        <img className="login-logo" src="/logos/gymbrot-logo.png" alt="GYMBROT" width={348} height={180} />
        <h2>¿Cuál es tu gimnasio?</h2>
        <p className="login-hint">Cada gimnasio entra por su propio enlace, por ejemplo /g/iron-house.</p>

        {error && (
          <div className="alert-g alert-error show" role="alert">
            {error}
          </div>
        )}

        <label className="form-label-g" htmlFor="gimnasio">Enlace o nombre del gimnasio</label>
        <input
          className="form-control-dark"
          id="gimnasio"
          value={texto}
          onChange={(e) => setTexto(e.target.value)}
          placeholder="iron-house"
          autoComplete="organization"
          autoFocus
        />

        <button className="btn-neon w-100" type="submit" disabled={buscando}>
          {buscando ? "Buscando..." : "Continuar"}
        </button>

        {conSesion && (
          <p className="login-hint">
            <Link to="/dashboard" className="land-link">Volver a mi panel</Link>
          </p>
        )}
        <p className="login-hint">
          Demo: <Link to="/g/gymbrot-centro/login" className="land-link">gymbrot-centro</Link> ·{" "}
          <Link to="/g/titan-fitness/login" className="land-link">titan-fitness</Link>
        </p>
        <p className="login-hint">
          <Link to="/" className="land-link">¿Tu gimnasio aún no usa GymBrot? Conoce los planes</Link>
        </p>
      </form>
    </div>
  );
}
