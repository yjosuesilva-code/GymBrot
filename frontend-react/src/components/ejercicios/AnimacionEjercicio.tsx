import { useEffect, useState } from "react";

/* [P3] KAN-96 — Imagen animada de un ejercicio (efecto tipo GIF).
   Las imágenes del catálogo base vienen en pares: <id>-0.jpg (posición inicial) y <id>-1.jpg
   (posición final), en public/recursos/ejercicios. Si la URL es la "-0" de un par, se alternan las dos
   cada INTERVALO_MS. Cualquier otra imagen (un enlace externo, un GIF) se muestra tal cual.
   Si la primera imagen no carga se llama a onFallo (VistaPreviaRecurso pinta el ícono de respaldo);
   si solo falla la segunda, se queda quieta en la primera. */

const INTERVALO_MS = 800;
const PAR = /^(.*)-0\.jpg$/i; // "/recursos/ejercicios/12-0.jpg" → par con "/recursos/ejercicios/12-1.jpg"

type Props = {
  url: string;
  alt: string;
  className: string;
  onFallo: () => void;
};

// Si el usuario pidió menos movimiento en su sistema, no se anima (accesibilidad)
function prefiereSinMovimiento(): boolean {
  return window.matchMedia?.("(prefers-reduced-motion: reduce)").matches ?? false;
}

export function AnimacionEjercicio({ url, alt, className, onFallo }: Props) {
  const coincide = PAR.exec(url);
  const segunda = coincide ? coincide[1] + "-1.jpg" : null;
  const [mostrarSegunda, setMostrarSegunda] = useState(false);
  const [segundaFallo, setSegundaFallo] = useState(false);

  const anima = segunda !== null && !segundaFallo && !prefiereSinMovimiento();

  useEffect(() => {
    if (!anima) return;
    // setInterval devuelve un número; la limpieza lo cancela al desmontar o si deja de animarse
    const id = window.setInterval(() => setMostrarSegunda((v) => !v), INTERVALO_MS);
    return () => window.clearInterval(id);
  }, [anima]);

  // Se pintan las dos imágenes una encima de la otra y solo se oculta/muestra la segunda:
  // así el navegador ya las tiene cargadas y el cambio no parpadea.
  if (!anima || segunda === null) {
    return <img src={url} alt={alt} className={className} loading="lazy" onError={onFallo} />;
  }
  return (
    <span className={className + " inst-anim"} role="img" aria-label={alt}>
      <img src={url} alt="" loading="lazy" onError={onFallo} />
      <img src={segunda} alt="" loading="lazy" className={mostrarSegunda ? "" : "oculta"} onError={() => setSegundaFallo(true)} />
    </span>
  );
}
