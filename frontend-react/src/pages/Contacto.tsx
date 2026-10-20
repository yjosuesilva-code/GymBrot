import { Link } from "react-router-dom";
import { HeaderPublico } from "../components/plataforma/HeaderPublico";

/* [multitenant-slug] /contacto. Esqueleto: el canal real de ventas/soporte
   (correo, WhatsApp, formulario con Supabase) lo define el equipo. */
export function Contacto() {
  return (
    <div className="land">
      <HeaderPublico />
      <section className="land-hero">
        <span className="badge-g badge-activo badge-g--plain">Contacto</span>
        <h1>Hablemos de tu gimnasio</h1>
        <p>¿Dudas sobre los planes o sobre cómo migrar tus datos? Escríbenos y te ayudamos a empezar.</p>
        <div className="land-cta">
          <Link className="btn-neon land-btn-lg" to="/registro">Registrar mi gimnasio</Link>
          <Link className="btn-dark land-btn-lg" to="/planes">Ver planes</Link>
        </div>
      </section>
      <footer className="land-footer">
        © {new Date().getFullYear()} GymBrot · Software de gestión para gimnasios
      </footer>
    </div>
  );
}
