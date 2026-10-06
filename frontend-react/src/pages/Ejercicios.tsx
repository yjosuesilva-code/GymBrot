import { useEffect, useState } from "react";
import { Modal } from "react-bootstrap";
import { api } from "../data/api";
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

  async function cargar() {
    const data = await api.ejercicios.list();
    setEjercicios(data);
    setCargando(false);
  }

  useEffect(() => {
    cargar();
  }, []);

  function setCampo(campo: keyof typeof VACIO, valor: string) {
    setForm((f) => ({ ...f, [campo]: valor }));
  }

  function abrirNuevo() {
    setForm(VACIO);
    setError("");
    setShow(true);
  }

  async function guardar() {
    if (
      !form.nombre ||
      !form.grupoMuscular ||
      !form.nivel ||
      !form.series ||
      !form.repeticiones
    ) {
      setError("Completa los campos obligatorios");
      return;
    }

    const respuesta = await api.ejercicios.create({
      nombre: form.nombre.trim(),
      descripcion: form.descripcion.trim(),
      grupoMuscular: form.grupoMuscular.trim(),
      nivel: form.nivel.trim(),
      series: Number(form.series),
      repeticiones: Number(form.repeticiones),
      recursoUrl: form.recursoUrl.trim(),
    });

    if (!respuesta.ok) {
      setError(respuesta.mensaje);
      return;
    }

    setShow(false);
    await cargar();
  }

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

      <div className="table-wrap">
        <table className="table-g">
          <thead>
            <tr>
              <th>Ejercicio</th>
              <th>Grupo muscular</th>
              <th>Nivel</th>
              <th>Series</th>
              <th>Repeticiones</th>
            </tr>
          </thead>

          <tbody>
            {cargando ? (
              <tr>
                <td colSpan={5} className="loader">
                  Cargando ejercicios...
                </td>
              </tr>
            ) : ejercicios.length === 0 ? (
              <tr>
                <td colSpan={5} className="empty-state">
                  No hay ejercicios registrados.
                </td>
              </tr>
            ) : (
              ejercicios.map((e) => (
                <tr key={e.idEjercicio}>
                  <td>{e.nombre}</td>
                  <td>{e.grupoMuscular}</td>
                  <td>{e.nivel}</td>
                  <td>{e.series}</td>
                  <td>{e.repeticiones}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      <Modal show={show} onHide={() => setShow(false)} centered size="lg">
        <Modal.Header closeButton>
          <Modal.Title>Nuevo ejercicio</Modal.Title>
        </Modal.Header>

        <Modal.Body>
          {error && (
            <div className="alert-g alert-error show">{error}</div>
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
          <button className="btn-dark" onClick={() => setShow(false)}>
            Cancelar
          </button>

          <button className="btn-neon" onClick={guardar}>
            Guardar ejercicio
          </button>
        </Modal.Footer>
      </Modal>
    </section>
  );
}