import { useState } from "react";

/* [P3] Vista previa del recurso de un ejercicio (KAN-88).
   Si recurso_url es una imagen (png, jpg, gif, webp, svg o data:image) se muestra;
   si no carga, si está vacío o si es otro tipo de enlace (un video, una página),
   se muestra un ícono de respaldo. No sube archivos: solo muestra la URL guardada.

   El estado "fallo" no se reinicia solo al cambiar la URL: quien lo usa le pone
   key={url}, así React crea un componente nuevo por cada URL distinta. */

const IMAGEN = /\.(png|jpe?g|gif|webp|svg|avif)(\?.*)?$/i;

type Props = {
  url: string;
  tamano: "mini" | "grande";
  alt: string;
};

export function VistaPreviaRecurso({ url, tamano, alt }: Props) {
  const [fallo, setFallo] = useState(false);
  const limpia = url.trim();
  const esImagen = limpia.startsWith("data:image/") || IMAGEN.test(limpia);
  const clase = tamano === "mini" ? "inst-ej-mini" : "inst-ej-grande";

  if (limpia && esImagen && !fallo) {
    return <img src={limpia} alt={alt} className={clase} loading="lazy" onError={() => setFallo(true)} />;
  }

  // Respaldo: sin recurso, imagen que no cargó, o enlace que no es imagen (video, página)
  const icono = !limpia ? "bi-image" : fallo ? "bi-file-earmark-x" : "bi-link-45deg";
  const texto = !limpia ? "Sin imagen" : fallo ? "No se pudo cargar la imagen" : "Enlace externo (no es una imagen)";

  return (
    <div className={clase + " inst-ej-respaldo"} title={texto} role="img" aria-label={texto}>
      <i className={"bi " + icono} aria-hidden />
      {tamano === "grande" && <small>{texto}</small>}
    </div>
  );
}
