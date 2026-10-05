import { useEffect, useState } from "react";
import { api } from "../data/api";
import { utils } from "../lib/utils";
import type { Rutina, Instructor, Cliente, ObjetivoRutina, DiaSemana } from "../types";

const OBJETIVOS: ObjetivoRutina[] = [
  "Pérdida de peso",
  "Ganancia muscular",
  "Resistencia",
  "Tonificación",
  "Rehabilitación",
];

// Los 7 días en orden con su letra (X = miércoles, para no repetir la M de martes)
const DIAS: { dia: DiaSemana; letra: string }[] = [
  { dia: "LUNES", letra: "L" },
  { dia: "MARTES", letra: "M" },
  { dia: "MIERCOLES", letra: "X" },
  { dia: "JUEVES", letra: "J" },
  { dia: "VIERNES", letra: "V" },
  { dia: "SABADO", letra: "S" },
  { dia: "DOMINGO", letra: "D" },
];

const DIAS_AVISO = 15; // con menos días que esto se muestra "Vence en N días"

// Días entre dos fechas 'YYYY-MM-DD' (b - a). Se usa Date.UTC con año, mes y día
// para que el resultado sea un número entero exacto, sin horas ni cambios de horario.
function diasEntre(a: string, b: string): number {
  const [ya, ma, da] = a.split("-").map(Number);
  const [yb, mb, db] = b.split("-").map(Number);
  return Math.round((Date.UTC(yb, mb - 1, db) - Date.UTC(ya, ma - 1, da)) / 86400000);
}

type Vigencia = { texto: string; clase: string; avance: number | null };

// Estado de la rutina según fecha_fin, y % de avance entre fecha_creacion y fecha_fin
function calcularVigencia(r: Rutina): Vigencia {
  if (!r.fecha_fin) return { texto: "Sin fecha fin", clase: "badge-inactivo", avance: null };

  const hoy = utils.isoDate();
  const restantes = diasEntre(hoy, r.fecha_fin);
  const total = diasEntre(r.fecha_creacion, r.fecha_fin);
  const transcurridos = diasEntre(r.fecha_creacion, hoy);
  // Si total es 0 o negativo (fechas raras), se considera completa
  const avance = total > 0 ? Math.min(100, Math.max(0, Math.round((transcurridos / total) * 100))) : 100;

  if (restantes < 0) return { texto: "Vencida", clase: "badge-vencida", avance };
  if (restantes === 0) return { texto: "Vence hoy", clase: "badge-suspendido", avance };
  if (restantes < DIAS_AVISO)
    return { texto: "Vence en " + restantes + (restantes === 1 ? " día" : " días"), clase: "badge-suspendido", avance };
  return { texto: "Vigente", clase: "badge-activo", avance };
}

export function Rutinas() {
  const [rutinas, setRutinas] = useState<Rutina[]>([]);
  const [instructores, setInstructores] = useState<Instructor[]>([]);
  const [clientes, setClientes] = useState<Cliente[]>([]);
  const [cargando, setCargando] = useState(true);

  // Búsqueda, filtro ("" = todos) y modo agrupado
  const [busqueda, setBusqueda] = useState("");
  const [filtroObjetivo, setFiltroObjetivo] = useState<ObjetivoRutina | "">("");
  const [agrupar, setAgrupar] = useState(false);

  // Carga las tres colecciones a la vez: las rutinas solo guardan ids,
  // y los nombres salen de instructores y clientes
  useEffect(() => {
    Promise.all([api.rutinas.list(), api.instructores.list(), api.clientes.list()]).then(([r, i, c]) => {
      setRutinas(r);
      setInstructores(i);
      setClientes(c);
      setCargando(false);
    });
  }, []);

  function buscarInstructor(id: string): Instructor | undefined {
    return instructores.find((x) => x.numero_identificacion === id);
  }

  function buscarCliente(id: string): Cliente | undefined {
    return clientes.find((x) => x.numero_identificacion === id);
  }

  // Nombre completo o "—" si ya no existe
  function nombre(p: Instructor | Cliente | undefined): string {
    return p ? p.nombre + " " + p.apellidos : "—";
  }

  // Lista filtrada: se recalcula en cada render a partir de la lista completa y los filtros
  const texto = busqueda.trim().toLowerCase();
  const filtradas = rutinas.filter((r) => {
    const datos = (
      r.nombre + " " + nombre(buscarCliente(r.id_cliente)) + " " + nombre(buscarInstructor(r.id_instructor))
    ).toLowerCase();
    return datos.includes(texto) && (filtroObjetivo === "" || r.objetivo === filtroObjetivo);
  });
  const hayFiltros = texto !== "" || filtroObjetivo !== "";

  // Agrupa por instructor: { "2000000001": [rutina, rutina], "2000000002": [rutina] }
  const grupos = filtradas.reduce<Record<string, Rutina[]>>((acc, r) => {
    if (!acc[r.id_instructor]) acc[r.id_instructor] = [];
    acc[r.id_instructor].push(r);
    return acc;
  }, {});
  // Pasa el objeto a una lista [id, rutinas] ordenada por nombre del instructor
  const listaGrupos = Object.entries(grupos).sort(([a], [b]) =>
    nombre(buscarInstructor(a)).localeCompare(nombre(buscarInstructor(b)))
  );

  function limpiarFiltros() {
    setBusqueda("");
    setFiltroObjetivo("");
  }

  // Una tarjeta de rutina (se usa igual en la vista normal y en la agrupada)
  function tarjeta(r: Rutina) {
    const cliente = buscarCliente(r.id_cliente);
    const instructor = buscarInstructor(r.id_instructor);
    const v = calcularVigencia(r);

    return (
      <div key={r.id_rutina} className="card-g rutina-card">
        <div className="rutina-top">
          <div>
            <div className="rutina-nombre">{r.nombre}</div>
            <div className="person-sub">{r.objetivo}</div>
          </div>
          <span className={"badge-g " + v.clase}>{v.texto}</span>
        </div>

        <div className="rutina-personas">
          <div className="person">
            <div className="person-avatar">{cliente ? utils.iniciales(cliente.nombre, cliente.apellidos) : "?"}</div>
            <div>
              <div className="person-name">{nombre(cliente)}</div>
              <div className="person-sub">Cliente</div>
            </div>
          </div>
          <div className="person">
            <div className="person-avatar">{instructor ? utils.iniciales(instructor.nombre, instructor.apellidos) : "?"}</div>
            <div>
              <div className="person-name">{nombre(instructor)}</div>
              <div className="person-sub">Instructor</div>
            </div>
          </div>
        </div>

        <div className="rutina-dias">
          {DIAS.map(({ dia, letra }) => (
            <span key={dia} className={"dia-pill" + (r.dias_semana.includes(dia) ? " activo" : "")} title={dia}>
              {letra}
            </span>
          ))}
        </div>

        <div>
          <div className="rutina-fechas">
            <span>{utils.fecha(r.fecha_creacion)} → {r.fecha_fin ? utils.fecha(r.fecha_fin) : "Sin fecha fin"}</span>
            {v.avance !== null && <span>{v.avance}%</span>}
          </div>
          {v.avance !== null && (
            <div className="kpi-bar">
              <span style={{ width: v.avance + "%" }}></span>
            </div>
          )}
        </div>

        {/* Solo se muestran: la lógica llega en las Partes 4 y 5 */}
        <div className="cell-actions rutina-acciones">
          <button className="btn-icon" title="Ver detalle">👁</button>
          <button className="btn-icon" title="Editar">✏️</button>
          <button className="btn-icon" title="Eliminar">🗑️</button>
        </div>
      </div>
    );
  }

  let contenido;
  if (cargando) {
    contenido = (
      <div className="card-g">
        <div className="loader"><span className="spinner-g"></span>Cargando...</div>
      </div>
    );
  } else if (filtradas.length === 0) {
    contenido = (
      <div className="card-g">
        <p className="empty-state">
          {rutinas.length === 0
            ? "No hay rutinas registradas todavía."
            : "Ninguna rutina coincide con la búsqueda o el filtro."}
        </p>
      </div>
    );
  } else if (agrupar) {
    contenido = listaGrupos.map(([idInstructor, lista]) => {
      const instructor = buscarInstructor(idInstructor);
      return (
        <section key={idInstructor}>
          <div className="person rutina-grupo-head">
            <div className="person-avatar">{instructor ? utils.iniciales(instructor.nombre, instructor.apellidos) : "?"}</div>
            <div>
              <div className="person-name">{nombre(instructor)}</div>
              <div className="person-sub">{lista.length} {lista.length === 1 ? "rutina" : "rutinas"}</div>
            </div>
          </div>
          <div className="rutinas-grid">{lista.map(tarjeta)}</div>
        </section>
      );
    });
  } else {
    contenido = <div className="rutinas-grid">{filtradas.map(tarjeta)}</div>;
  }

  return (
    <>
      <div className="card-g">
        <div className="card-head">
          <div>
            <h2 className="card-title">Rutinas</h2>
            <p className="card-sub">Planes de entrenamiento asignados a cada cliente</p>
          </div>
        </div>

        <div className="toolbar">
          <div className="search-box">
            <span className="search-ico">🔍</span>
            <input
              type="text"
              className="form-control-dark"
              placeholder="Buscar por rutina, cliente o instructor..."
              value={busqueda}
              onChange={(e) => setBusqueda(e.target.value)}
            />
          </div>
          <select
            className="form-control-dark"
            style={{ width: "auto" }}
            value={filtroObjetivo}
            onChange={(e) => setFiltroObjetivo(e.target.value as ObjetivoRutina | "")}
          >
            <option value="">Todos los objetivos</option>
            {OBJETIVOS.map((o) => <option key={o} value={o}>{o}</option>)}
          </select>
          {/* El botón cambia de estilo cuando está activo (neón) */}
          <button className={agrupar ? "btn-neon" : "btn-dark"} onClick={() => setAgrupar(!agrupar)}>
            Agrupar por instructor
          </button>
          {hayFiltros && <button className="btn-dark" onClick={limpiarFiltros}>Limpiar</button>}
        </div>
      </div>

      {contenido}
    </>
  );
}
