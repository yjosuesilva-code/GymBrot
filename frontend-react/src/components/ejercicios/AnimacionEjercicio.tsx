import { useEffect, useState } from "react";
import type { GrupoMuscular } from "../../types";
import { Pictograma } from "./Pictograma";

/* [P3] KAN-96/97 — Imagen animada de un ejercicio (efecto tipo GIF).
   Las imágenes de referencia vienen en pares (posición inicial y final):
   - catálogo base:      /recursos/ejercicios/<id>-0.jpg  y  <id>-1.jpg
   - sugerencias (KAN-97): https://raw.githubusercontent.com/.../exercises/<id>/0.jpg  y  /1.jpg
   Si la URL es la "0" de un par, se alternan las dos cada INTERVALO_MS. Cualquier otra imagen
   (un enlace externo, un GIF, una foto subida) se muestra tal cual.
   Si la primera imagen no carga se muestra el Pictograma del grupo muscular;
   si solo falla la segunda, se queda quieta en la primera. */

const INTERVALO_MS = 800;
const PAR = /^(.*[-/])0\.jpg$/i; // "…/12-0.jpg" → "…/12-1.jpg"  ·  "…/Barbell_Curl/0.jpg" → "…/Barbell_Curl/1.jpg"

type Props = {
  url: string;
  alt: string;
  className: string;
  grupo?: GrupoMuscular;   // para el pictograma de respaldo
};

// Si el usuario pidió menos movimiento en su sistema, no se anima (accesibilidad)
function prefiereSinMovimiento(): boolean {
  return window.matchMedia?.("(prefers-reduced-motion: reduce)").matches ?? false;
}

export function AnimacionEjercicio({ url, alt, className, grupo }: Props) {
  const coincide = PAR.exec(url);
  const segunda = coincide ? coincide[1] + "1.jpg" : null;
  const [mostrarSegunda, setMostrarSegunda] = useState(false);
  const [primeraFallo, setPrimeraFallo] = useState(false);
  const [segundaFallo, setSegundaFallo] = useState(false);

  const anima = segunda !== null && !segundaFallo && !primeraFallo && !prefiereSinMovimiento();

  useEffect(() => {
    if (!anima) return;
    // setInterval devuelve un número; la limpieza lo cancela al desmontar o si deja de animarse
    const id = window.setInterval(() => setMostrarSegunda((v) => !v), INTERVALO_MS);
    return () => window.clearInterval(id);
  }, [anima]);

  if (primeraFallo) {
    const texto = className.includes("grande") ? "No se pudo cargar la imagen" : undefined;
    if (grupo) return <Pictograma grupo={grupo} className={className} texto={texto} />;
    return (
      <div className={className + " inst-ej-respaldo"} title="No se pudo cargar la imagen" role="img" aria-label="No se pudo cargar la imagen">
        <i className="bi bi-file-earmark-x" aria-hidden />
        {texto && <small>{texto}</small>}
      </div>
    );
  }

  // Se pintan las dos imágenes una encima de la otra y solo se oculta/muestra la segunda:
  // así el navegador ya las tiene cargadas y el cambio no parpadea.
  if (!anima || segunda === null) {
    return <img src={url} alt={alt} className={className} loading="lazy" onError={() => setPrimeraFallo(true)} />;
  }
  return (
    <span className={className + " inst-anim"} role="img" aria-label={alt}>
      <img src={url} alt="" loading="lazy" onError={() => setPrimeraFallo(true)} />
      <img src={segunda} alt="" loading="lazy" className={mostrarSegunda ? "" : "oculta"} onError={() => setSegundaFallo(true)} />
    </span>
  );
}
