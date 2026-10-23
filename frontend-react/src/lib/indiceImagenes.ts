import type { EquipoEjercicio, GrupoMuscular } from "../types";
import { normalizar } from "./rutinas";

/* [P3] KAN-97 — Índice de imágenes de referencia (public/recursos/indice-imagenes.json).
   Sale de free-exercise-db (yuhonas, licencia Unlicense = dominio público): 873 ejercicios con
   nombre en inglés y español, palabras clave en español, grupo muscular y equipo ya convertidos
   a nuestras listas. Las imágenes NO están en el proyecto: se enlazan a GitHub (2 por ejercicio). */

export interface EntradaIndice {
  id: string;                        // carpeta en free-exercise-db, ej. "Barbell_Curl"
  en: string;
  es: string;
  claves: string[];                  // sinónimos en español ("vuelos laterales", "pesa rusa"…)
  grupo: GrupoMuscular;
  equipo: EquipoEjercicio | null;    // null = balón, rodillo, "otro"… (no está en nuestra lista)
  cat: "fuerza" | "cardio" | "estiramiento";
}

const URL_INDICE = "/recursos/indice-imagenes.json";
const BASE_IMAGENES = "https://raw.githubusercontent.com/yuhonas/free-exercise-db/main/exercises/";
export const MIN_LETRAS = 3;
const MAX_SUGERENCIAS = 6;

// La promesa se guarda en una variable del módulo: el fetch se hace UNA vez aunque se abra el modal muchas veces
let cargando: Promise<EntradaIndice[]> | null = null;

export function cargarIndice(): Promise<EntradaIndice[]> {
  if (cargando === null) {
    cargando = fetch(URL_INDICE)
      .then((r) => {
        if (!r.ok) throw new Error("No se pudo cargar el índice de imágenes");
        return r.json() as Promise<EntradaIndice[]>;
      })
      .catch((e: unknown) => {
        cargando = null; // si falló, se puede reintentar la próxima vez
        throw e;
      });
  }
  return cargando;
}

// URL de la primera imagen; AnimacionEjercicio deduce la segunda (…/0.jpg → …/1.jpg)
export function urlImagen(id: string): string {
  return BASE_IMAGENES + encodeURIComponent(id) + "/0.jpg";
}

// ¿La URL es una imagen sugerida del índice? (para saber qué opción marcar en el selector)
export function esDelIndice(url: string): boolean {
  return url.startsWith(BASE_IMAGENES);
}

/* Sugerencias para un nombre escrito por el usuario. Puntaje por cada palabra buscada:
   +3 si está en el nombre en español, +2 en las claves, +1 en el nombre en inglés; todas las
   palabras deben aparecer en algún lado. Después: +2 si coincide el grupo muscular elegido y +1 el
   equipo. Los estiramientos bajan PENALIZACION_ESTIRAMIENTO puntos (van después de fuerza y cardio
   aunque su nombre coincida un poco mejor), salvo que el usuario esté buscando un estiramiento. */
const PENALIZACION_ESTIRAMIENTO = 6;
export function buscarSugerencias(
  indice: EntradaIndice[],
  texto: string,
  grupo: GrupoMuscular,
  equipo: EquipoEjercicio
): EntradaIndice[] {
  const consulta = normalizar(texto);
  if (consulta.length < MIN_LETRAS) return [];
  const palabras = consulta.split(/\s+/).filter((p) => p.length >= 2);
  const buscaEstiramiento = consulta.includes("estir");

  const puntuadas: { e: EntradaIndice; puntos: number }[] = [];
  for (const e of indice) {
    const es = normalizar(e.es);
    const claves = normalizar(e.claves.join(" "));
    const en = normalizar(e.en);
    let puntos = 0;
    let todas = true;
    for (const p of palabras) {
      const enEs = es.includes(p);
      const enClaves = claves.includes(p);
      const enIngles = en.includes(p);
      if (!enEs && !enClaves && !enIngles) {
        todas = false;
        break;
      }
      puntos += (enEs ? 3 : 0) + (enClaves ? 2 : 0) + (enIngles ? 1 : 0);
    }
    if (!todas) continue;
    if (es.includes(consulta)) puntos += 4; // la frase completa aparece en el nombre
    if (e.grupo === grupo) puntos += 2;
    if (e.equipo === equipo) puntos += 1;
    if (e.cat === "estiramiento" && !buscaEstiramiento) puntos -= PENALIZACION_ESTIRAMIENTO;
    puntuadas.push({ e, puntos });
  }
  // Mayor puntaje primero; si empatan, el nombre más corto (suele ser el ejercicio "básico")
  return puntuadas
    .sort((a, b) => b.puntos - a.puntos || a.e.es.length - b.e.es.length)
    .slice(0, MAX_SUGERENCIAS)
    .map((x) => x.e);
}

/* Reduce una foto subida a ~400 px de ancho y ~20 KB en JPEG base64 (data:image/jpeg;base64,…).
   Usa un <canvas>: se dibuja la imagen más pequeña y se exporta bajando la calidad hasta que quepa. */
const ANCHO_MAX = 400;
const BYTES_MAX = 20 * 1024;

export function reducirFoto(archivo: File): Promise<string> {
  return new Promise((resolver, rechazar) => {
    if (!archivo.type.startsWith("image/")) {
      rechazar(new Error("El archivo no es una imagen"));
      return;
    }
    const url = URL.createObjectURL(archivo);
    const img = new Image();
    img.onload = () => {
      URL.revokeObjectURL(url);
      let ancho = Math.min(ANCHO_MAX, img.width);
      let resultado = "";
      // Si ni con calidad baja cabe en ~20 KB, se reduce también el ancho
      while (ancho >= 120) {
        const alto = Math.round((img.height * ancho) / img.width);
        const canvas = document.createElement("canvas");
        canvas.width = ancho;
        canvas.height = alto;
        const ctx = canvas.getContext("2d");
        if (!ctx) {
          rechazar(new Error("El navegador no permite procesar la imagen"));
          return;
        }
        ctx.drawImage(img, 0, 0, ancho, alto);
        for (let calidad = 0.8; calidad >= 0.4; calidad -= 0.1) {
          resultado = canvas.toDataURL("image/jpeg", calidad);
          // base64 ocupa ~4/3 de los bytes reales
          if (resultado.length * 0.75 <= BYTES_MAX) {
            resolver(resultado);
            return;
          }
        }
        ancho = Math.round(ancho * 0.8);
      }
      resolver(resultado);
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      rechazar(new Error("No se pudo leer la imagen"));
    };
    img.src = url;
  });
}
