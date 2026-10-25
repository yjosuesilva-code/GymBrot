import type { GrupoMuscular } from "../../types";
import { AnimacionEjercicio } from "./AnimacionEjercicio";
import { Pictograma } from "./Pictograma";

/* [P3] Vista previa del recurso de un ejercicio (KAN-88, KAN-96, KAN-97).
   - Imagen (png, jpg, gif, webp, svg, avif o data:image): AnimacionEjercicio la muestra (y anima
     los pares 0/1). Si no carga, muestra el pictograma.
   - Vacío: pictograma del grupo muscular (si se conoce) o un ícono genérico.
   - Otro enlace (un video, una página): ícono de enlace.
   No sube archivos: solo muestra la URL guardada.

   Quien lo usa le pone key={url}: así React crea un componente nuevo por cada URL distinta
   y el estado "falló la carga" de AnimacionEjercicio empieza de cero. */

const IMAGEN = /\.(png|jpe?g|gif|webp|svg|avif)(\?.*)?$/i;

type Props = {
  url: string;
  tamano: "mini" | "grande";
  alt: string;
  grupo?: GrupoMuscular;
};

export function VistaPreviaRecurso({ url, tamano, alt, grupo }: Props) {
  const limpia = url.trim();
  const esImagen = limpia.startsWith("data:image/") || IMAGEN.test(limpia);
  const clase = tamano === "mini" ? "inst-ej-mini" : "inst-ej-grande";

  if (limpia && esImagen) {
    return <AnimacionEjercicio url={limpia} alt={alt} className={clase} grupo={grupo} />;
  }

  if (!limpia && grupo) {
    return <Pictograma grupo={grupo} className={clase} texto={tamano === "grande" ? "Sin imagen" : undefined} />;
  }

  // Respaldo genérico: sin recurso y sin grupo conocido, o enlace que no es imagen (video, página)
  const icono = !limpia ? "bi-image" : "bi-link-45deg";
  const texto = !limpia ? "Sin imagen" : "Enlace externo (no es una imagen)";

  return (
    <div className={clase + " inst-ej-respaldo"} title={texto} role="img" aria-label={texto}>
      <i className={"bi " + icono} aria-hidden />
      {tamano === "grande" && <small>{texto}</small>}
    </div>
  );
}
