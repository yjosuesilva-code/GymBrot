import { HeaderPublico } from "../components/plataforma/HeaderPublico";
import { SeccionPlanes } from "../components/plataforma/SeccionPlanes";

/* [multitenant-slug] /planes: la misma seccion de la landing, como pagina. */
export function Planes() {
  return (
    <div className="land">
      <HeaderPublico />
      <SeccionPlanes />
      <footer className="land-footer">
        © {new Date().getFullYear()} GymBrot · Software de gestión para gimnasios
      </footer>
    </div>
  );
}
