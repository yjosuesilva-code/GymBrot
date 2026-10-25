import { useState } from "react";
import { Modal } from "react-bootstrap";
import { NOMBRE_TIPO_CLASE, TIPOS_CLASE } from "../../lib/clases";
import { DIAS_ORDEN } from "../../lib/horarios";
import { NOMBRE_DIA } from "./textos";
import type { Clase, ClaseNueva, DiaSemana, Instructor, TipoClase } from "../../types";

/* [P3] B7 · KAN-94 — Crear o editar una clase. No llama a la API: avisa con onGuardar.
   Los números se guardan como texto en el formulario (un campo vacío es "", no 0).
   Quien lo usa le pone key para que el formulario arranque de cero cada vez que se abre. */

type Form = {
  nombre: string;
  tipo_clase: TipoClase;
  id_instructor: string;
  dia_semana: DiaSemana;
  hora: string;
  duracion_min: string;
  aforo_max: string;
};

type Props = {
  show: boolean;
  inicial: Clase | null;              // null = clase nueva
  instructores: Instructor[];         // los que se pueden elegir (activos)
  instructorFijo?: string;            // el instructor en sesión: no puede elegir otro
  guardando: boolean;
  error: string;
  onGuardar: (datos: ClaseNueva) => void;
  onCerrar: () => void;
};

export function ModalClase({ show, inicial, instructores, instructorFijo, guardando, error, onGuardar, onCerrar }: Props) {
  // Inicializador "perezoso": la función corre solo en el primer render
  const [form, setForm] = useState<Form>(() => ({
    nombre: inicial?.nombre ?? "",
    tipo_clase: inicial?.tipo_clase ?? "FUNCIONAL",
    id_instructor: instructorFijo ?? inicial?.id_instructor ?? "",
    dia_semana: inicial?.dia_semana ?? "LUNES",
    hora: inicial?.hora ?? "18:00",
    duracion_min: String(inicial?.duracion_min ?? 60),
    aforo_max: String(inicial?.aforo_max ?? 15),
  }));
  const [faltan, setFaltan] = useState("");

  function campo<K extends keyof Form>(k: K, v: Form[K]) {
    setForm((f) => ({ ...f, [k]: v }));
  }

  function guardar() {
    if (!form.nombre.trim() || !form.id_instructor || !form.hora) {
      setFaltan("Nombre, instructor y hora son obligatorios");
      return;
    }
    setFaltan("");
    onGuardar({
      nombre: form.nombre,
      tipo_clase: form.tipo_clase,
      id_instructor: form.id_instructor,
      dia_semana: form.dia_semana,
      hora: form.hora,
      duracion_min: Number(form.duracion_min),
      aforo_max: Number(form.aforo_max),
    });
  }

  return (
    <Modal show={show} onHide={onCerrar} centered>
      <Modal.Header closeButton>
        <Modal.Title>{inicial ? "Editar clase" : "Nueva clase"}</Modal.Title>
      </Modal.Header>
      <Modal.Body>
        {(faltan || error) && <div className="alert-g alert-error show">{faltan || error}</div>}
        <p className="card-sub">Una clase es un solo día de la semana: para lunes, miércoles y viernes crea 3 clases.</p>
        <div className="row g-3">
          <div className="col-md-8">
            <label className="form-label-g">Nombre</label>
            <input className="form-control-dark" value={form.nombre} placeholder="Ej. Rumba terapia" onChange={(e) => campo("nombre", e.target.value)} />
          </div>
          <div className="col-md-4">
            <label className="form-label-g">Tipo</label>
            <select className="form-control-dark" value={form.tipo_clase} onChange={(e) => campo("tipo_clase", e.target.value as TipoClase)}>
              {TIPOS_CLASE.map((t) => <option key={t} value={t}>{NOMBRE_TIPO_CLASE[t]}</option>)}
            </select>
          </div>
          <div className="col-12">
            <label className="form-label-g">Instructor</label>
            <select className="form-control-dark" value={form.id_instructor} disabled={instructorFijo !== undefined} onChange={(e) => campo("id_instructor", e.target.value)}>
              <option value="">Selecciona un instructor</option>
              {instructores.map((i) => (
                <option key={i.numero_identificacion} value={i.numero_identificacion}>{i.nombre} {i.apellidos}</option>
              ))}
            </select>
          </div>
          <div className="col-md-4">
            <label className="form-label-g">Día</label>
            <select className="form-control-dark" value={form.dia_semana} onChange={(e) => campo("dia_semana", e.target.value as DiaSemana)}>
              {DIAS_ORDEN.map((d) => <option key={d} value={d}>{NOMBRE_DIA[d]}</option>)}
            </select>
          </div>
          <div className="col-md-4">
            <label className="form-label-g">Hora de inicio</label>
            <input type="time" className="form-control-dark" value={form.hora} onChange={(e) => campo("hora", e.target.value)} />
          </div>
          <div className="col-md-2 col-6">
            <label className="form-label-g">Minutos</label>
            <input type="number" min="15" max="180" className="form-control-dark" value={form.duracion_min} onChange={(e) => campo("duracion_min", e.target.value)} />
          </div>
          <div className="col-md-2 col-6">
            <label className="form-label-g">Aforo</label>
            <input type="number" min="1" max="100" className="form-control-dark" value={form.aforo_max} onChange={(e) => campo("aforo_max", e.target.value)} />
          </div>
        </div>
      </Modal.Body>
      <Modal.Footer>
        <button className="btn-dark" onClick={onCerrar}>Cancelar</button>
        <button className="btn-neon" disabled={guardando} onClick={guardar}>
          {guardando ? "Guardando..." : inicial ? "Guardar cambios" : "Crear clase"}
        </button>
      </Modal.Footer>
    </Modal>
  );
}
