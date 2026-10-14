import { useEffect, useState } from "react";
import { Modal } from "react-bootstrap";
import { api } from "../data/api";
import type {
  Ejercicio,
  EjercicioNuevo,
  GrupoMuscular,
  NivelEjercicio,
  EquipoEjercicio,
  TipoMedicion,
} from "../types";

// Opciones de los selects (las mismas listas cerradas de types/index.ts)
const GRUPOS: GrupoMuscular[] = [
  "Pecho", "Espalda", "Hombros", "Bíceps", "Tríceps", "Piernas", "Glúteos", "Abdomen", "Cardio", "Cuerpo completo",
];
const NIVELES: NivelEjercicio[] = ["Principiante", "Intermedio", "Avanzado"];
const EQUIPOS: EquipoEjercicio[] = [
  "Máquina", "Mancuerna", "Barra", "Polea", "Kettlebell", "Banda elástica", "Peso corporal",
];

// El formulario guarda los números como texto (así un campo vacío es "" y no 0);
// se convierten a number | null al guardar
type FormEjercicio = {
  nombre: string;
  descripcion: string;
  grupo_muscular: GrupoMuscular;
  nivel: NivelEjercicio;
  equipo: EquipoEjercicio;
  tipo_medicion: TipoMedicion;
  series_sugeridas: string;
  repeticiones_min_sugeridas: string;
  repeticiones_max_sugeridas: string;
  segundos_sugeridos: string;
  recurso_url: string;
};

const VACIO: FormEjercicio = {
  nombre: "",
  descripcion: "",
  grupo_muscular: "Pecho",
  nivel: "Principiante",
  equipo: "Máquina",
  tipo_medicion: "REPETICIONES",
  series_sugeridas: "",
  repeticiones_min_sugeridas: "",
  repeticiones_max_sugeridas: "",
  segundos_sugeridos: "",
  recurso_url: "",
};

// "" → null; cualquier otro texto → número (si no es un entero > 0, lo rechaza api.ejercicios)
function aNumero(texto: string): number | null {
  return texto.trim() === "" ? null : Number(texto);
}

function aTexto(n: number | null): string {
  return n === null ? "" : String(n);
}

// Resumen de lo sugerido, ej. "3 × 10–12", "3 × 30 s" o "—"
function sugerido(e: Ejercicio): string {
  let cantidad = "";
  if (e.tipo_medicion === "TIEMPO") {
    if (e.segundos_sugeridos !== null) cantidad = e.segundos_sugeridos + " s";
  } else {
    const min = e.repeticiones_min_sugeridas;
    const max = e.repeticiones_max_sugeridas;
    if (min !== null && max !== null) cantidad = min === max ? String(min) : min + "–" + max;
    else if (min !== null || max !== null) cantidad = String(min ?? max);
  }
  if (e.series_sugeridas !== null && cantidad) return e.series_sugeridas + " × " + cantidad;
  if (e.series_sugeridas !== null) return e.series_sugeridas + " series";
  return cantidad || "—";
}

export function Ejercicios() {
  const [ejercicios, setEjercicios] = useState<Ejercicio[]>([]);
  const [cargando, setCargando] = useState(true);
  const [show, setShow] = useState(false);
  const [form, setForm] = useState<FormEjercicio>(VACIO);
  const [error, setError] = useState("");
  const [editandoId, setEditandoId] = useState<number | null>(null);
  const [busqueda, setBusqueda] = useState("");

  const [alerta, setAlerta] = useState<{ tipo: "ok" | "error"; mensaje: string } | null>(null);
  const [guardando, setGuardando] = useState(false);
  const [eliminando, setEliminando] = useState(false);
  const [porEliminar, setPorEliminar] = useState<Ejercicio | null>(null);
  const [errorEliminar, setErrorEliminar] = useState("");

  async function cargar() {
    try {
      const data = await api.ejercicios.list();
      setEjercicios(data);
    } catch {
      setAlerta({ tipo: "error", mensaje: "No se pudieron cargar los ejercicios. Intenta nuevamente." });
    } finally {
      setCargando(false);
    }
  }

  useEffect(() => {
    let activo = true;
    api.ejercicios.list()
      .then((data) => { if (activo) setEjercicios(data); })
      .catch(() => {
        if (activo) setAlerta({ tipo: "error", mensaje: "No se pudieron cargar los ejercicios. Intenta nuevamente." });
      })
      .finally(() => { if (activo) setCargando(false); });
    return () => { activo = false; };
  }, []);

  // Cambia un solo campo; K hace que el valor tenga el tipo correcto de ese campo
  function setCampo<K extends keyof FormEjercicio>(campo: K, valor: FormEjercicio[K]) {
    setForm((f) => ({ ...f, [campo]: valor }));
  }

  function abrirNuevo() {
    setEditandoId(null);
    setForm(VACIO);
    setError("");
    setShow(true);
  }

  function abrirEdicion(ejercicio: Ejercicio) {
    setEditandoId(ejercicio.id_ejercicio);

    setForm({
      nombre: ejercicio.nombre,
      descripcion: ejercicio.descripcion,
      grupo_muscular: ejercicio.grupo_muscular,
      nivel: ejercicio.nivel,
      equipo: ejercicio.equipo,
      tipo_medicion: ejercicio.tipo_medicion,
      series_sugeridas: aTexto(ejercicio.series_sugeridas),
      repeticiones_min_sugeridas: aTexto(ejercicio.repeticiones_min_sugeridas),
      repeticiones_max_sugeridas: aTexto(ejercicio.repeticiones_max_sugeridas),
      segundos_sugeridos: aTexto(ejercicio.segundos_sugeridos),
      recurso_url: ejercicio.recurso_url,
    });

    setError("");
    setShow(true);
  }

  async function guardar() {
    if (guardando) return;
    if (!form.nombre.trim()) {
      setError("El nombre es obligatorio.");
      return;
    }

    const datos: EjercicioNuevo = {
      nombre: form.nombre.trim(),
      descripcion: form.descripcion.trim(),
      grupo_muscular: form.grupo_muscular,
      nivel: form.nivel,
      equipo: form.equipo,
      tipo_medicion: form.tipo_medicion,
      series_sugeridas: aNumero(form.series_sugeridas),
      repeticiones_min_sugeridas: aNumero(form.repeticiones_min_sugeridas),
      repeticiones_max_sugeridas: aNumero(form.repeticiones_max_sugeridas),
      segundos_sugeridos: aNumero(form.segundos_sugeridos),
      recurso_url: form.recurso_url.trim(),
    };

    // Las demás reglas (enteros > 0, mínimo ≤ máximo, nombre repetido) las valida api.ejercicios
    setGuardando(true);
    setError("");
    setAlerta(null);
    try {
      const respuesta = editandoId !== null
        ? await api.ejercicios.update(editandoId, datos)
        : await api.ejercicios.create(datos);
      if (!respuesta.ok) {
        setError(respuesta.mensaje || "No se pudo guardar el ejercicio.");
        return;
      }
      setShow(false);
      setAlerta({ tipo: "ok", mensaje: respuesta.mensaje });
      setCargando(true);
      await cargar();
    } catch {
      setError("No se pudo guardar el ejercicio. Intenta nuevamente.");
    } finally {
      setGuardando(false);
    }
  }

  async function eliminar() {
    if (!porEliminar || eliminando) return;
    setEliminando(true);
    setErrorEliminar("");
    setAlerta(null);
    try {
      const respuesta = await api.ejercicios.remove(porEliminar.id_ejercicio);
      if (!respuesta.ok) {
        setErrorEliminar(respuesta.mensaje || "No se pudo eliminar el ejercicio.");
        return;
      }
      setPorEliminar(null);
      setAlerta({ tipo: "ok", mensaje: respuesta.mensaje });
      setCargando(true);
      await cargar();
    } catch {
      setErrorEliminar("No se pudo eliminar el ejercicio. Intenta nuevamente.");
    } finally {
      setEliminando(false);
    }
  }

  const normalizar = (texto: string) => texto.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();
  const consulta = normalizar(busqueda.trim());
  const filtrados = ejercicios.filter((e) =>
    [e.nombre, e.grupo_muscular, e.nivel, e.equipo].some((campo) => normalizar(campo).includes(consulta))
  );

  return (
    <section className="card-g">
      <div className="card-head">
        <div>
          <h1 className="card-title">Ejercicios</h1>
          <p className="card-sub">
            Organiza los ejercicios disponibles para las rutinas
          </p>
        </div>

        <button className="btn-neon" onClick={abrirNuevo}>
          + Nuevo ejercicio
        </button>
      </div>

      {alerta && (
        <div className={"alert-g show alert-" + alerta.tipo} role={alerta.tipo === "error" ? "alert" : "status"}>
          {alerta.mensaje}
          {alerta.tipo === "error" && <button className="btn-dark ms-2" onClick={() => { setAlerta(null); setCargando(true); void cargar(); }} disabled={cargando}>Reintentar</button>}
        </div>
      )}

      <div className="toolbar mb-3">
        <div className="search-box">
          <span className="search-ico" aria-hidden="true">{"\u{1F50D}"}</span>
          <input
            type="search"
            className="form-control-dark"
            aria-label="Buscar ejercicios por nombre, grupo muscular, nivel o equipo"
            placeholder="Buscar por nombre, grupo muscular, nivel o equipo..."
            value={busqueda}
            onChange={(e) => setBusqueda(e.target.value)}
          />
        </div>
      </div>

      <div className="table-wrap">
        <table className="table-g">
          <thead>
            <tr>
              <th>Ejercicio</th>
              <th>Grupo muscular</th>
              <th>Nivel</th>
              <th>Equipo</th>
              <th>Sugerido</th>
              <th>Acciones</th>
            </tr>
          </thead>

          <tbody>
            {cargando ? (
              <tr>
                <td colSpan={6} className="loader">
                  Cargando ejercicios...
                </td>
              </tr>
            ) : ejercicios.length === 0 ? (
              <tr>
                <td colSpan={6} className="empty-state">
                  No hay ejercicios registrados.
                </td>
              </tr>
            ) : filtrados.length === 0 ? (
              <tr><td colSpan={6} className="empty-state">No hay ejercicios que coincidan con la búsqueda.</td></tr>
            ) : (
              filtrados.map((e) => (
                <tr key={e.id_ejercicio}>
                  <td>
                    <strong>{e.nombre}</strong>
                    {e.descripcion && <p className="card-sub mb-1">{e.descripcion}</p>}
                    {e.recurso_url && (
                      /^https?:\/\//i.test(e.recurso_url.trim())
                        ? <a href={e.recurso_url.trim()} target="_blank" rel="noopener noreferrer">{e.recurso_url}</a>
                        : <span className="d-block">Recurso: {e.recurso_url}</span>
                    )}
                  </td>
                  <td>{e.grupo_muscular}</td>
                  <td>{e.nivel}</td>
                  <td>{e.equipo}</td>
                  <td>{sugerido(e)}</td>
                  <td>
                    <button
                      className="btn-icon"
                      title="Editar"
                      aria-label={`Editar ${e.nombre}`}
                      onClick={() => abrirEdicion(e)}
                    >
                      ✏️
                    </button>
                    <button
                      className="btn-icon ms-1"
                      title="Eliminar"
                      aria-label={`Eliminar ${e.nombre}`}
                      onClick={() => { setPorEliminar(e); setErrorEliminar(""); }}
                    >
                      {"\u{1F5D1}️"}
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      <Modal show={show} onHide={() => { if (!guardando) setShow(false); }} backdrop={guardando ? "static" : true} keyboard={!guardando} centered size="lg">
        <Modal.Header closeButton={!guardando}>
          <Modal.Title>{editandoId !== null ? "Editar ejercicio" : "Nuevo ejercicio"}</Modal.Title>
        </Modal.Header>

        <Modal.Body>
          {error && (
            <div className="alert-g alert-error show" role="alert">{error}</div>
          )}

          <div className="row g-3">
            <div className="col-12">
              <label className="form-label-g">Nombre *</label>
              <input
                className="form-control-dark"
                value={form.nombre}
                onChange={(e) => setCampo("nombre", e.target.value)}
              />
            </div>

            <div className="col-md-4">
              <label className="form-label-g">Grupo muscular *</label>
              <select
                className="form-control-dark"
                value={form.grupo_muscular}
                onChange={(e) => setCampo("grupo_muscular", e.target.value as GrupoMuscular)}
              >
                {GRUPOS.map((g) => <option key={g} value={g}>{g}</option>)}
              </select>
            </div>

            <div className="col-md-4">
              <label className="form-label-g">Nivel *</label>
              <select
                className="form-control-dark"
                value={form.nivel}
                onChange={(e) => setCampo("nivel", e.target.value as NivelEjercicio)}
              >
                {NIVELES.map((n) => <option key={n} value={n}>{n}</option>)}
              </select>
            </div>

            <div className="col-md-4">
              <label className="form-label-g">Equipo *</label>
              <select
                className="form-control-dark"
                value={form.equipo}
                onChange={(e) => setCampo("equipo", e.target.value as EquipoEjercicio)}
              >
                {EQUIPOS.map((q) => <option key={q} value={q}>{q}</option>)}
              </select>
            </div>

            <div className="col-md-4">
              <label className="form-label-g">Se mide por *</label>
              <select
                className="form-control-dark"
                value={form.tipo_medicion}
                onChange={(e) => setCampo("tipo_medicion", e.target.value as TipoMedicion)}
              >
                <option value="REPETICIONES">Repeticiones</option>
                <option value="TIEMPO">Tiempo</option>
              </select>
            </div>

            <div className="col-md-4">
              <label className="form-label-g">Series sugeridas</label>
              <input
                type="number"
                min="1"
                className="form-control-dark"
                value={form.series_sugeridas}
                onChange={(e) => setCampo("series_sugeridas", e.target.value)}
              />
            </div>

            {/* Según cómo se mide, se pide un rango de repeticiones o los segundos */}
            {form.tipo_medicion === "REPETICIONES" ? (
              <div className="col-md-4">
                <label className="form-label-g">Repeticiones sugeridas (mín – máx)</label>
                <div className="d-flex gap-2">
                  <input
                    type="number"
                    min="1"
                    className="form-control-dark"
                    aria-label="Repeticiones mínimas"
                    value={form.repeticiones_min_sugeridas}
                    onChange={(e) => setCampo("repeticiones_min_sugeridas", e.target.value)}
                  />
                  <input
                    type="number"
                    min="1"
                    className="form-control-dark"
                    aria-label="Repeticiones máximas"
                    value={form.repeticiones_max_sugeridas}
                    onChange={(e) => setCampo("repeticiones_max_sugeridas", e.target.value)}
                  />
                </div>
              </div>
            ) : (
              <div className="col-md-4">
                <label className="form-label-g">Segundos sugeridos</label>
                <input
                  type="number"
                  min="1"
                  className="form-control-dark"
                  value={form.segundos_sugeridos}
                  onChange={(e) => setCampo("segundos_sugeridos", e.target.value)}
                />
              </div>
            )}

            <div className="col-12">
              <label className="form-label-g">Descripción</label>
              <textarea
                className="form-control-dark"
                value={form.descripcion}
                onChange={(e) => setCampo("descripcion", e.target.value)}
              />
            </div>

            <div className="col-12">
              <label className="form-label-g">Recurso URL</label>
              <input
                className="form-control-dark"
                value={form.recurso_url}
                onChange={(e) => setCampo("recurso_url", e.target.value)}
              />
            </div>
          </div>
        </Modal.Body>

        <Modal.Footer>
          <button className="btn-dark" disabled={guardando} onClick={() => setShow(false)}>
            Cancelar
          </button>

          <button className="btn-neon" disabled={guardando} onClick={guardar}>
            {guardando ? "Guardando..." : editandoId !== null ? "Guardar cambios" : "Guardar ejercicio"}
          </button>
        </Modal.Footer>
      </Modal>
      <Modal show={porEliminar !== null} onHide={() => { if (!eliminando) setPorEliminar(null); }} backdrop={eliminando ? "static" : true} keyboard={!eliminando} centered>
        <Modal.Header closeButton={!eliminando}>
          <Modal.Title>Eliminar ejercicio</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          {errorEliminar && <div className="alert-g alert-error show" role="alert">{errorEliminar}</div>}
          <p>¿Quieres eliminar el ejercicio <strong>{porEliminar?.nombre}</strong>? Esta acción no se puede deshacer.</p>
        </Modal.Body>
        <Modal.Footer>
          <button className="btn-dark" disabled={eliminando} onClick={() => setPorEliminar(null)}>Cancelar</button>
          <button className="btn-danger-g" disabled={eliminando} onClick={eliminar}>{eliminando ? "Eliminando..." : "Sí, eliminar"}</button>
        </Modal.Footer>
      </Modal>
    </section>
  );
}
