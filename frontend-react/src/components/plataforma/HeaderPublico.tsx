import { Link, NavLink } from "react-router-dom";
import * as auth from "../../lib/auth";

/* [multitenant-slug] Cabecera del sitio publico (/, /planes, /contacto). */
export function HeaderPublico() {
  const conSesion = auth.current() !== null;

  return (
    <header className="land-header">
      <Link to="/">
        <img className="land-logo" src="/logos/gymbrot-logo.png" alt="GYMBROT" width={348} height={180} />
      </Link>
      <nav className="land-nav">
        <NavLink to="/planes">Planes</NavLink>
        <NavLink to="/contacto">Contacto</NavLink>
        {conSesion ? (
          // /dashboard sin slug: RedirigirAlPortal lo lleva al gimnasio de la sesion.
          <Link className="btn-neon" to="/dashboard">Ir al panel</Link>
        ) : (
          <Link className="btn-dark" to="/login">Iniciar sesión</Link>
        )}
      </nav>
    </header>
  );
}
