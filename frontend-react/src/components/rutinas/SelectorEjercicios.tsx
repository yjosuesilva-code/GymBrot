import { useState } from "react";
import { Modal } from "react-bootstrap";
import type { Ejercicio, EquipoEjercicio, GrupoMuscular, LetraSesion, NivelEjercicio } from "../../types";
import { normalizar } from "../../lib/rutinas";
import { VistaPreviaRecurso } from "../ejercicios/VistaPreviaRecurso";

/* [P3] Panel para agregar ejercicios del catálogo mixto a una sesión (como el de Smart Fit:
   catálogo a la izquierda, seleccionados a la derecha). Búsqueda + filtros por grupo, nivel,
   equipo y origen; selección múltiple. No llama a la API: devuelve los elegidos con onAgregar. */
const GRUPOS: GrupoMuscular[] = [
  "Pecho", "Espalda", "Hombros", "Bíceps", "Tríceps", "Piernas", "Glúteos", "Abdomen", "Cardio", "Cuerpo completo",
];
const NIVELES: NivelEjercicio[] = ["Principiante", "Intermedio", "Avanzado"];
const EQUIPOS: EquipoEjercicio[] = ["Máquina", "Mancuerna", "Barra", "Polea", "Kettlebell", "Banda elástica", "Peso corporal"];
const MAX_LISTA = 60; // se muestran hasta 60 resultados; para más, filtrar

type Props = {
  show: boolean;
  sesion: LetraSesion;
  catalogo: Ejercicio[];
  excluidos: number[]; // ya están en la sesión
  onAgregar: (elegidos: Ejercicio[]) => void;
  onCerrar: () => void;
};

export function SelectorEjercicios({ show, sesion, catalogo, excluidos, onAgregar, onCerrar }: Props) {
  const [busqueda, setBusqueda] = useState("");
  const [grupo, setGrupo] = useState<GrupoMuscular | "">("");
  const [nivel, setNivel] = useState<NivelEjercicio | "">("");
  const [equipo, setEquipo] = useState<EquipoEjercicio | "">("");
  const [origen, setOrigen] = useState<"" | "BASE" | "PROPIO">("");
  const [elegidos, setElegidos] = useState<Ejercicio[]>([]);

  const q = normalizar(busqueda);
  const disponibles = catalogo.filter(
    (e) =>
      e.estado === "ACTIVO" &&
      !excluidos.includes(e.id_ejercicio) &&
      (q === "" || normalizar(e.nombre + " " + e.grupo_muscular + " " + e.equipo).includes(q)) &&
      (grupo === "" || e.grupo_muscular === grupo) &&
      (nivel === "" || e.nivel === nivel) &&
      (equipo === "" || e.equipo === equipo) &&
      (origen === "" || (origen === "BASE") === (e.gimnasio_id === null))
  );

  function alternar(e: Ejercicio) {
    setElegidos((lista) =>
      lista.some((x) => x.id_ejercicio === e.id_ejercicio) ? lista.filter((x) => x.id_ejercicio !== e.id_ejercicio) : [...lista, e]
    );
  }

  function cerrar() {
    setElegidos([]);
    setBusqueda("");
    onCerrar();
  }

  return (
    <Modal show={show} onHide={cerrar} size="xl" centered scrollable>
      <Modal.Header closeButton>
        <Modal.Title>Agregar ejercicios a la sesión {sesion}</Modal.Title>
      </Modal.Header>
      <Modal.Body>
        <div className="toolbar mb-3">
          <div className="search-box">
            <span className="search-ico"><i className="bi bi-search" aria-hidden /></span>
            <input
              type="search"
              className="form-control-dark"
              placeholder="Buscar por nombre, grupo o equipo…"
              aria-label="Buscar ejercicios"
              value={busqueda}
              onChange={(e) => setBusqueda(e.target.value)}
            />
          </div>
          <select className="form-control-dark" style={{ width: "auto" }} aria-label="Grupo muscular" value={grupo} onChange={(e) => setGrupo(e.target.value as GrupoMuscular | "")}>
            <option value="">Todos los grupos</option>
            {GRUPOS.map((g) => <option key={g} value={g}>{g}</option>)}
          </select>
          <select className="form-control-dark" style={{ width: "auto" }} aria-label="Nivel" value={nivel} onChange={(e) => setNivel(e.target.value as NivelEjercicio | "")}>
            <option value="">Todos los niveles</option>
            {NIVELES.map((n) => <option key={n} value={n}>{n}</option>)}
          </select>
          <select className="form-control-dark" style={{ width: "auto" }} aria-label="Equipo" value={equipo} onChange={(e) => setEquipo(e.target.value as EquipoEjercicio | "")}>
            <option value="">Todo el equipo</option>
            {EQUIPOS.map((x) => <option key={x} value={x}>{x}</option>)}
          </select>
          <select className="form-control-dark" style={{ width: "auto" }} aria-label="Origen" value={origen} onChange={(e) => setOrigen(e.target.value as "" | "BASE" | "PROPIO")}>
            <option value="">Base y propios</option>
            <option value="BASE">Catálogo base</option>
            <option value="PROPIO">Propios</option>
          </select>
        </div>

        <div className="inst-selector">
          <div className="inst-selector-lista">
            <div className="form-label-g">Catálogo ({disponibles.length})</div>
            {disponibles.length === 0 && <p className="empty-state">Ningún ejercicio coincide.</p>}
            {disponibles.slice(0, MAX_LISTA).map((e) => {
              const marcado = elegidos.some((x) => x.id_ejercicio === e.id_ejercicio);
              return (
                <label key={e.id_ejercicio} className={"inst-opcion-ej" + (marcado ? " marcado" : "")}>
                  <input type="checkbox" checked={marcado} onChange={() => alternar(e)} />
                  <VistaPreviaRecurso key={e.recurso_url} url={e.recurso_url} tamano="mini" alt={e.nombre} />
                  <span>
                    <span className="person-name">{e.nombre}</span>
                    {e.gimnasio_id === null && <span className="badge-g badge-confirmada ms-2">Base</span>}
                    <span className="person-sub d-block">{e.grupo_muscular} · {e.nivel} · {e.equipo}</span>
                  </span>
                </label>
              );
            })}
            {disponibles.length > MAX_LISTA && <p className="card-sub">Hay más resultados: usa la búsqueda o los filtros.</p>}
          </div>
          <div className="inst-selector-elegidos">
            <div className="form-label-g">Seleccionados ({elegidos.length})</div>
            {elegidos.length === 0 && <p className="card-sub">Marca los ejercicios que quieres agregar.</p>}
            {elegidos.map((e) => (
              <div key={e.id_ejercicio} className="inst-elegido">
                <span>{e.nombre}</span>
                <button type="button" className="btn-icon" title="Quitar" onClick={() => alternar(e)}>
                  <i className="bi bi-x-lg" aria-hidden />
                </button>
              </div>
            ))}
          </div>
        </div>
      </Modal.Body>
      <Modal.Footer>
        <button type="button" className="btn-dark" onClick={cerrar}>Cancelar</button>
        <button
          type="button"
          className="btn-neon"
          disabled={elegidos.length === 0}
          onClick={() => {
            onAgregar(elegidos);
            cerrar();
          }}
        >
          <i className="bi bi-plus-lg me-1" aria-hidden />
          Agregar {elegidos.length > 0 ? elegidos.length : ""}
        </button>
      </Modal.Footer>
    </Modal>
  );
}
