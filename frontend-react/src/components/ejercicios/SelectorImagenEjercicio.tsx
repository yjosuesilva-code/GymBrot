import { useEffect, useState } from "react";
import type { EquipoEjercicio, GrupoMuscular } from "../../types";
import type { EntradaIndice } from "../../lib/indiceImagenes";
import { MIN_LETRAS, buscarSugerencias, esDelIndice, reducirFoto, urlImagen } from "../../lib/indiceImagenes";
import { AnimacionEjercicio } from "./AnimacionEjercicio";
import { VistaPreviaRecurso } from "./VistaPreviaRecurso";

/* [P3] KAN-97 — Imagen de referencia al crear o editar un ejercicio propio.
   Mientras se escribe el nombre (con espera de 300 ms y al menos 3 letras) sugiere hasta 6
   imágenes de free-exercise-db, priorizando el grupo muscular y el equipo elegidos.
   Si ninguna sirve hay tres opciones: "Sin imagen" (por defecto: pictograma), "Subir foto"
   (se reduce a ~400 px y ~20 KB) o "Pegar enlace". La imagen nunca es obligatoria.
   No carga datos: la página le pasa el índice ya cargado (o null mientras carga). */

const ESPERA_MS = 300;

type Modo = "ninguno" | "subir" | "enlace";

type Props = {
  nombre: string;
  grupo: GrupoMuscular;
  equipo: EquipoEjercicio;
  valor: string;                       // recurso_url actual
  indice: EntradaIndice[] | null;
  errorIndice: string | null;
  onCambiar: (url: string) => void;
};

export function SelectorImagenEjercicio({ nombre, grupo, equipo, valor, indice, errorIndice, onCambiar }: Props) {
  // "Debounce": el texto de búsqueda se actualiza 300 ms después de la última tecla
  const [busqueda, setBusqueda] = useState(nombre);
  const [modo, setModo] = useState<Modo>("ninguno");
  const [procesando, setProcesando] = useState(false);
  const [errorFoto, setErrorFoto] = useState<string | null>(null);

  useEffect(() => {
    const id = window.setTimeout(() => setBusqueda(nombre), ESPERA_MS);
    return () => window.clearTimeout(id); // si se escribe otra letra antes, se cancela
  }, [nombre]);

  const sugerencias = indice ? buscarSugerencias(indice, busqueda, grupo, equipo) : [];
  const corto = busqueda.trim().length < MIN_LETRAS;
  const esFoto = valor.startsWith("data:image/");
  const esEnlace = valor !== "" && !esFoto && !esDelIndice(valor);

  async function alElegirArchivo(archivo: File | undefined) {
    if (!archivo) return;
    setProcesando(true);
    setErrorFoto(null);
    try {
      onCambiar(await reducirFoto(archivo));
    } catch (e: unknown) {
      setErrorFoto(e instanceof Error ? e.message : "No se pudo procesar la foto");
    } finally {
      setProcesando(false);
    }
  }

  return (
    <div className="inst-img-selector">
      <label className="form-label-g">Imagen de referencia (opcional)</label>

      {/* Sugerencias según el nombre */}
      <div className="inst-sug">
        {errorIndice ? (
          <p className="inst-auto-vacio"><i className="bi bi-exclamation-triangle" /> {errorIndice}</p>
        ) : indice === null ? (
          <p className="inst-auto-vacio">Cargando sugerencias…</p>
        ) : corto ? (
          <p className="inst-auto-vacio">Escribe al menos {MIN_LETRAS} letras del nombre para ver imágenes sugeridas.</p>
        ) : sugerencias.length === 0 ? (
          <p className="inst-auto-vacio">Sin coincidencias. Puedes dejarlo sin imagen, subir una foto o pegar un enlace.</p>
        ) : (
          <div className="inst-sug-grid">
            {sugerencias.map((s) => {
              const url = urlImagen(s.id);
              const elegida = url === valor;
              return (
                <button
                  type="button"
                  key={s.id}
                  className={"inst-sug-item" + (elegida ? " elegida" : "")}
                  aria-pressed={elegida}
                  title={s.es + " — " + s.en}
                  onClick={() => onCambiar(elegida ? "" : url)}
                >
                  <AnimacionEjercicio url={url} alt={s.es} className="inst-sug-img" grupo={s.grupo} />
                  <span className="inst-sug-nombre">{s.es}</span>
                  {elegida && <i className="bi bi-check-circle-fill inst-sug-check" aria-hidden />}
                </button>
              );
            })}
          </div>
        )}
      </div>

      {/* Si ninguna sirve: sin imagen, subir foto o pegar enlace */}
      <div className="inst-seg mt-2" role="group" aria-label="Otras opciones de imagen">
        <button type="button" className={valor === "" ? "activo" : ""} onClick={() => { setModo("ninguno"); onCambiar(""); }}>
          <i className="bi bi-slash-circle" /> Sin imagen
        </button>
        <button type="button" className={modo === "subir" || esFoto ? "activo" : ""} onClick={() => setModo("subir")}>
          <i className="bi bi-upload" /> Subir foto
        </button>
        <button type="button" className={modo === "enlace" || esEnlace ? "activo" : ""} onClick={() => setModo("enlace")}>
          <i className="bi bi-link-45deg" /> Pegar enlace
        </button>
      </div>

      {modo === "subir" && (
        <div className="mt-2">
          <input type="file" accept="image/*" className="form-control-dark" disabled={procesando} onChange={(e) => alElegirArchivo(e.target.files?.[0])} />
          <small className="card-sub">Se reduce a unos 400 px de ancho y unos 20 KB.</small>
          {procesando && <p className="card-sub">Procesando foto…</p>}
          {errorFoto && <p className="inst-error-fila">{errorFoto}</p>}
        </div>
      )}
      {modo === "enlace" && (
        <input
          className="form-control-dark mt-2"
          placeholder="https://… (imagen o GIF)"
          value={esFoto ? "" : valor}
          onChange={(e) => onCambiar(e.target.value)}
        />
      )}

      {/* Lo que quedará guardado */}
      <VistaPreviaRecurso key={valor} url={valor} tamano="grande" alt="Vista previa de la imagen" grupo={grupo} />
    </div>
  );
}
