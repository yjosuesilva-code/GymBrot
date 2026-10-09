import { useEffect, useState } from "react";
import { Modal } from "react-bootstrap";
import { api } from "../data/api";
import { Paginador } from "../components/Paginador";
import type { Ejercicio } from "../types";

const VACIO = {
  nombre: "",
  descripcion: "",
  grupoMuscular: "",
  nivel: "",
  series: "",
  repeticiones: "",
  recursoUrl: "",
};

export function Ejercicios() {
  const [ejercicios, setEjercicios] = useState<Ejercicio[]>([]);
  const [cargando, setCargando] = useState(true);
  const [show, setShow] = useState(false);
  const [form, setForm] = useState(VACIO);
  const [error, setError] = useState("");
  const [editandoId, setEditandoId] = useState<number | null>(null);
  const [busqueda, setBusqueda] = useState("");

  // Paginación: 10 ejercicios por página (100 en el seed); al buscar se vuelve a la 1
  const POR_PAGINA = 10;
  const [pagina, setPagina] = useState(1);

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

  function setCampo(campo: keyof typeof VACIO, valor: string) {
    setForm((f) => ({ ...f, [campo]: valor }));
  }

  function abrirNuevo() {
    setEditandoId(null);
    setForm(VACIO);
    setError("");
    setShow(true);
  }

  function abrirEdicion(ejercicio: Ejercicio) {
    setEditandoId(ejercicio.idEjercicio);

    setForm({
      nombre: ejercicio.nombre,
      descripcion: ejercicio.descripcion,
      grupoMuscular: ejercicio.grupoMuscular,
      nivel: ejercicio.nivel,
      series: String(ejercicio.series),
      repeticiones: String(ejercicio.repeticiones),
      recursoUrl: ejercicio.recursoUrl,
    });

    setError("");
    setShow(true);
  }

  async function guardar() {
    if (guardando) return;
    if (!form.nombre.trim() || !form.grupoMuscular.trim() || !form.nivel.trim() ||
        !form.series.trim() || !form.repeticiones.trim()) {
      setError("Completa los campos obligatorios.");
      return;
    }

    const series = Number(form.series);
    const repeticiones = Number(form.repeticiones);
    if (!Number.isInteger(series) || series <= 0 ||
        !Number.isInteger(repeticiones) || repeticiones <= 0) {
      setError("Las series y las repeticiones deben ser números enteros mayores que 0.");
      return;
    }

    const datos = {
      nombre: form.nombre.trim(),
      descripcion: form.descripcion.trim(),
      grupoMuscular: form.grupoMuscular.trim(),
      nivel: form.nivel.trim(),
      series,
      repeticiones,
      recursoUrl: form.recursoUrl.trim(),
    };

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
      const respuesta = await api.ejercicios.remove(porEliminar.idEjercicio);
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

  const normalizar = (texto: string) => texto.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
  const consulta = normalizar(busqueda.trim());
  const filtrados = ejercicios.filter((e) =>
    [e.nombre, e.grupoMuscular, e.nivel].some((campo) => normalizar(campo).includes(consulta))
  );
  const totalPaginas = Math.max(1, Math.ceil(filtrados.length / POR_PAGINA));
  const paginaSegura = Math.min(pagina, totalPaginas);
  const paginados = filtrados.slice((paginaSegura - 1) * POR_PAGINA, paginaSegura * POR_PAGINA);

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
            aria-label="Buscar ejercicios por nombre, grupo muscular o nivel"
            placeholder="Buscar por nombre, grupo muscular o nivel..."
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
              <th>Series</th>
              <th>Repeticiones</th>
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
              paginados.map((e) => (
                <tr key={e.idEjercicio}>
                  <td>
                    <strong>{e.nombre}</strong>
                    {e.descripcion && <p className="card-sub mb-1">{e.descripcion}</p>}
                    {e.recursoUrl && (
                      /^https?:\/\//i.test(e.recursoUrl.trim())
                        ? <a href={e.recursoUrl.trim()} target="_blank" rel="noopener noreferrer">{e.recursoUrl}</a>
                        : <span className="d-block">Recurso: {e.recursoUrl}</span>
                    )}
                  </td>
                  <td>{e.grupoMuscular}</td>
                  <td>{e.nivel}</td>
                  <td>{e.series}</td>
                  <td>{e.repeticiones}</td>
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
                      {"\u{1F5D1}\uFE0F"}
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
        <Paginador
          pagina={paginaSegura}
          total={filtrados.length}
          porPagina={POR_PAGINA}
          onCambiar={setPagina}
        />
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

            <div className="col-md-6">
              <label className="form-label-g">Grupo muscular *</label>
              <input
                className="form-control-dark"
                value={form.grupoMuscular}
                onChange={(e) => setCampo("grupoMuscular", e.target.value)}
              />
            </div>

            <div className="col-md-6">
              <label className="form-label-g">Nivel *</label>
              <input
                className="form-control-dark"
                value={form.nivel}
                onChange={(e) => setCampo("nivel", e.target.value)}
              />
            </div>

            <div className="col-md-6">
              <label className="form-label-g">Series *</label>
              <input
                type="number"
                min="1"
                className="form-control-dark"
                value={form.series}
                onChange={(e) => setCampo("series", e.target.value)}
              />
            </div>

            <div className="col-md-6">
              <label className="form-label-g">Repeticiones *</label>
              <input
                type="number"
                min="1"
                className="form-control-dark"
                value={form.repeticiones}
                onChange={(e) => setCampo("repeticiones", e.target.value)}
              />
            </div>

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
                value={form.recursoUrl}
                onChange={(e) => setCampo("recursoUrl", e.target.value)}
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
