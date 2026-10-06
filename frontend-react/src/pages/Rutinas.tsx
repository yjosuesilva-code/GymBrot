import { useEffect, useState } from "react";
import { Modal } from "react-bootstrap";
import { api } from "../data/api";
import { utils } from "../lib/utils";
import type { Rutina, RutinaNueva, Instructor, Cliente, ObjetivoRutina, DiaSemana } from "../types";

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

// Vigente = sin fecha fin, o con fecha fin de hoy en adelante (la misma regla que api.rutinas)
function esVigente(r: Rutina): boolean {
  return r.fecha_fin === null || r.fecha_fin >= utils.isoDate();
}

// El formulario usa "" en fecha_fin cuando no hay fecha (un <input type="date"> vacío vale "");
// al guardar se convierte a null
type FormRutina = Omit<RutinaNueva, "fecha_fin"> & { fecha_fin: string };

const VACIO: FormRutina = {
  nombre: "",
  objetivo: "Ganancia muscular",
  id_cliente: "",
  id_instructor: "",
  dias_semana: [],
  fecha_fin: "",
  descripcion: "",
};

// Devuelve el primer error encontrado, o "" si el formulario es válido.
// fechaOriginal: al editar, si la fecha fin no se cambió no se exige que sea de hoy en adelante
// (así se puede corregir, por ejemplo, el nombre de una rutina que ya está en el historial).
function validar(f: FormRutina, fechaOriginal: string): string {
  if (!f.nombre) return "El nombre es obligatorio";
  if (!f.id_cliente) return "Selecciona un cliente";
  if (!f.id_instructor) return "Selecciona un instructor";
  if (f.dias_semana.length === 0) return "Selecciona al menos un día";
  if (f.fecha_fin && f.fecha_fin !== fechaOriginal && f.fecha_fin < utils.isoDate())
    return "La fecha fin no puede ser anterior a hoy";
  return "";
}

// Alerta de la parte superior: tipo define el color (alert-ok verde neón, alert-error rojo).
// idCliente (opcional): muestra el botón "Crear la siguiente rutina" para ese cliente.
type Alerta = { tipo: "ok" | "error"; mensaje: string; idCliente?: string };

export function Rutinas() {
  const [rutinas, setRutinas] = useState<Rutina[]>([]);
  const [instructores, setInstructores] = useState<Instructor[]>([]);
  const [clientes, setClientes] = useState<Cliente[]>([]);
  const [cargando, setCargando] = useState(true);

  // Búsqueda, filtro ("" = todos) y modo agrupado
  const [busqueda, setBusqueda] = useState("");
  const [filtroObjetivo, setFiltroObjetivo] = useState<ObjetivoRutina | "">("");
  const [agrupar, setAgrupar] = useState(false);

  const [alerta, setAlerta] = useState<Alerta | null>(null);

  // Modal crear/editar: editandoId es null al crear y el id de la rutina al editar
  const [show, setShow] = useState(false);
  const [editandoId, setEditandoId] = useState<number | null>(null);
  const [form, setForm] = useState<FormRutina>(VACIO);
  const [error, setError] = useState("");
  const [guardando, setGuardando] = useState(false);

  // Confirmación de finalizar (aFinalizar no se limpia al cerrar, por la animación de salida)
  const [showFinalizar, setShowFinalizar] = useState(false);
  const [aFinalizar, setAFinalizar] = useState<Rutina | null>(null);
  const [errorFinalizar, setErrorFinalizar] = useState("");

  // Confirmación de eliminar (mismo patrón que finalizar)
  const [showEliminar, setShowEliminar] = useState(false);
  const [aEliminar, setAEliminar] = useState<Rutina | null>(null);
  const [errorEliminar, setErrorEliminar] = useState("");

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

  // La alerta desaparece a los 4 segundos, o a los 10 si trae un botón (para alcanzar a usarlo).
  // El cleanup cancela el temporizador anterior si llega otra alerta antes.
  useEffect(() => {
    if (!alerta) return;
    const t = setTimeout(() => setAlerta(null), alerta.idCliente ? 10000 : 4000);
    return () => clearTimeout(t);
  }, [alerta]);

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

  // ----- Modal crear/editar -----

  // Rutina vigente de cada cliente: { idCliente: "nombre de la rutina" }.
  // No cuenta la rutina que se está editando (si no, su propio cliente saldría como ocupado).
  const vigentePorCliente = rutinas
    .filter((r) => r.id_rutina !== editandoId && esVigente(r))
    .reduce<Record<string, string>>((acc, r) => {
      acc[r.id_cliente] = r.nombre;
      return acc;
    }, {});

  // Solo activos; al editar se incluye el ya elegido aunque esté inactivo, para que el select lo muestre
  const clientesSelect = clientes.filter((c) => c.estado === "ACTIVO" || c.numero_identificacion === form.id_cliente);
  const instructoresSelect = instructores.filter(
    (i) => i.estado === "ACTIVO" || i.numero_identificacion === form.id_instructor
  );

  // Cambia un solo campo; K hace que el valor tenga el tipo correcto de ese campo
  function setCampo<K extends keyof FormRutina>(campo: K, valor: FormRutina[K]) {
    setForm((f) => ({ ...f, [campo]: valor }));
  }

  // Activa o desactiva un día y deja la lista en el orden L → D
  function alternarDia(dia: DiaSemana) {
    setForm((f) => {
      const marcados = f.dias_semana.includes(dia)
        ? f.dias_semana.filter((d) => d !== dia)
        : [...f.dias_semana, dia];
      return { ...f, dias_semana: DIAS.map((d) => d.dia).filter((d) => marcados.includes(d)) };
    });
  }

  function abrirNuevo() {
    setEditandoId(null);
    setForm(VACIO);
    setError("");
    setShow(true);
  }

  function abrirEdicion(r: Rutina) {
    setEditandoId(r.id_rutina);
    setForm({
      nombre: r.nombre,
      objetivo: r.objetivo,
      id_cliente: r.id_cliente,
      id_instructor: r.id_instructor,
      dias_semana: r.dias_semana,
      fecha_fin: r.fecha_fin ?? "",
      descripcion: r.descripcion,
    });
    setError("");
    setShow(true);
  }

  async function guardar() {
    const limpio: FormRutina = { ...form, nombre: form.nombre.trim(), descripcion: form.descripcion.trim() };
    const original = rutinas.find((r) => r.id_rutina === editandoId);
    const msg = validar(limpio, original?.fecha_fin ?? "");
    if (msg) {
      setError(msg);
      return;
    }

    // Lo que espera la api: fecha_fin vacía se guarda como null
    const datos: RutinaNueva = { ...limpio, fecha_fin: limpio.fecha_fin || null };

    setGuardando(true);
    const res = editandoId !== null ? await api.rutinas.update(editandoId, datos) : await api.rutinas.create(datos);
    setGuardando(false);

    if (!res.ok) {
      setError(res.mensaje);
      return;
    }
    setShow(false);
    setAlerta({ tipo: "ok", mensaje: res.mensaje });
    setRutinas(await api.rutinas.list());
  }

  // ----- Finalizar -----

  function pedirFinalizar(r: Rutina) {
    setErrorFinalizar("");
    setAFinalizar(r);
    setShowFinalizar(true);
  }

  async function confirmarFinalizar() {
    if (!aFinalizar) return;
    const res = await api.rutinas.finalizar(aFinalizar.id_rutina);
    if (!res.ok) {
      setErrorFinalizar(res.mensaje);
      return;
    }
    setShowFinalizar(false);
    // La alerta lleva el cliente para ofrecer crearle la siguiente rutina
    setAlerta({ tipo: "ok", mensaje: res.mensaje, idCliente: aFinalizar.id_cliente });
    setRutinas(await api.rutinas.list());
  }

  // ----- Eliminar -----

  function pedirEliminar(r: Rutina) {
    setErrorEliminar("");
    setAEliminar(r);
    setShowEliminar(true);
  }

  async function confirmarEliminar() {
    if (!aEliminar) return;
    const res = await api.rutinas.remove(aEliminar.id_rutina);
    if (!res.ok) {
      setErrorEliminar(res.mensaje);
      return;
    }
    setShowEliminar(false);
    setAlerta({ tipo: "ok", mensaje: "Rutina «" + aEliminar.nombre + "» eliminada" });
    setRutinas(await api.rutinas.list());
  }

  // Desde el modal de eliminar: cambia a la confirmación de finalizar con la misma rutina
  function finalizarEnLugarDeEliminar() {
    if (!aEliminar) return;
    setShowEliminar(false);
    pedirFinalizar(aEliminar);
  }

  // Abre el modal de nueva rutina con el cliente ya elegido
  function crearSiguiente(idCliente: string) {
    setAlerta(null);
    setEditandoId(null);
    setForm({ ...VACIO, id_cliente: idCliente });
    setError("");
    setShow(true);
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

        {/* Ver solo se muestra: su lógica llega con el modal "Ver" */}
        <div className="cell-actions rutina-acciones">
          <button className="btn-icon" title="Ver detalle">👁</button>
          <button className="btn-icon" title="Editar" onClick={() => abrirEdicion(r)}>✏️</button>
          {/* Finalizar solo tiene sentido si la rutina sigue vigente */}
          {esVigente(r) && (
            <button className="btn-icon" title="Finalizar" onClick={() => pedirFinalizar(r)}>🏁</button>
          )}
          <button className="btn-icon" title="Eliminar" onClick={() => pedirEliminar(r)}>🗑️</button>
        </div>
      </div>
    );
  }

  // Para el modal de eliminar: ¿la rutina tiene historial que valga la pena conservar?
  // Si se creó hoy no hay nada que conservar; si no, se sugiere finalizarla (vigente)
  // o se avisa que forma parte del historial (vencida).
  const eliminarCreadaHoy = aEliminar !== null && aEliminar.fecha_creacion >= utils.isoDate();
  const eliminarVigente = aEliminar !== null && esVigente(aEliminar);
  const sugerirFinalizar = !eliminarCreadaHoy && eliminarVigente;

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
            ? "No hay rutinas registradas todavía. Crea la primera con «+ Nueva rutina»."
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
          <button className="btn-neon" onClick={abrirNuevo}>+ Nueva rutina</button>
        </div>

        {alerta && (
          <div className={"alert-g show alert-" + alerta.tipo + (alerta.idCliente ? " alerta-accion" : "")}>
            <span>{alerta.mensaje}</span>
            {alerta.idCliente && (
              <button className="btn-dark" onClick={() => crearSiguiente(alerta.idCliente ?? "")}>
                Crear la siguiente rutina para {nombre(buscarCliente(alerta.idCliente))}
              </button>
            )}
          </div>
        )}

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

      <Modal show={show} onHide={() => setShow(false)} centered size="lg">
        <Modal.Header closeButton>
          <Modal.Title>{editandoId !== null ? "Editar rutina" : "Nueva rutina"}</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          {error && <div className="alert-g alert-error show">{error}</div>}
          <div className="row g-3">
            <div className="col-md-8">
              <label className="form-label-g">Nombre</label>
              <input className="form-control-dark" value={form.nombre} onChange={(e) => setCampo("nombre", e.target.value)} />
            </div>
            <div className="col-md-4">
              <label className="form-label-g">Objetivo</label>
              <select
                className="form-control-dark"
                value={form.objetivo}
                onChange={(e) => setCampo("objetivo", e.target.value as ObjetivoRutina)}
              >
                {OBJETIVOS.map((o) => <option key={o} value={o}>{o}</option>)}
              </select>
            </div>
            <div className="col-md-6">
              <label className="form-label-g">Cliente</label>
              <select className="form-control-dark" value={form.id_cliente} onChange={(e) => setCampo("id_cliente", e.target.value)}>
                <option value="">Selecciona un cliente</option>
                {clientesSelect.map((c) => {
                  const vigente = vigentePorCliente[c.numero_identificacion];
                  return (
                    <option key={c.numero_identificacion} value={c.numero_identificacion} disabled={vigente !== undefined}>
                      {c.nombre} {c.apellidos}
                      {vigente !== undefined ? " — ya tiene vigente: " + vigente : ""}
                    </option>
                  );
                })}
              </select>
            </div>
            <div className="col-md-6">
              <label className="form-label-g">Instructor</label>
              <select className="form-control-dark" value={form.id_instructor} onChange={(e) => setCampo("id_instructor", e.target.value)}>
                <option value="">Selecciona un instructor</option>
                {instructoresSelect.map((i) => (
                  <option key={i.numero_identificacion} value={i.numero_identificacion}>
                    {i.nombre} {i.apellidos} — {i.especialidad}
                  </option>
                ))}
              </select>
            </div>
            <div className="col-md-6">
              <label className="form-label-g">Días de entrenamiento</label>
              <div className="rutina-dias">
                {DIAS.map(({ dia, letra }) => (
                  <button
                    key={dia}
                    type="button"
                    title={dia}
                    className={"dia-pill dia-pill-btn" + (form.dias_semana.includes(dia) ? " activo" : "")}
                    onClick={() => alternarDia(dia)}
                  >
                    {letra}
                  </button>
                ))}
              </div>
            </div>
            <div className="col-md-6">
              <label className="form-label-g">Fecha fin (opcional)</label>
              <input
                className="form-control-dark"
                type="date"
                min={utils.isoDate()}
                value={form.fecha_fin}
                onChange={(e) => setCampo("fecha_fin", e.target.value)}
              />
            </div>
            <div className="col-12">
              <label className="form-label-g">Descripción</label>
              <textarea
                className="form-control-dark"
                rows={3}
                value={form.descripcion}
                onChange={(e) => setCampo("descripcion", e.target.value)}
              />
            </div>
            <div className="col-12">
              <p className="card-sub">Los ejercicios se agregarán cuando esté listo el catálogo de ejercicios (P4).</p>
            </div>
          </div>
        </Modal.Body>
        <Modal.Footer>
          <button className="btn-dark" onClick={() => setShow(false)}>Cancelar</button>
          <button className="btn-neon" onClick={guardar} disabled={guardando}>
            {guardando ? "Guardando..." : "Guardar"}
          </button>
        </Modal.Footer>
      </Modal>

      {/* Confirmación de finalizar */}
      <Modal show={showFinalizar} onHide={() => setShowFinalizar(false)} centered>
        <Modal.Header closeButton>
          <Modal.Title>Finalizar rutina</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          {errorFinalizar && <div className="alert-g alert-error show">{errorFinalizar}</div>}
          <p>
            ¿Finalizar <strong>{aFinalizar?.nombre}</strong> de{" "}
            <strong>{aFinalizar ? nombre(buscarCliente(aFinalizar.id_cliente)) : ""}</strong>?
            Su fecha fin pasará a ser ayer y quedará en el historial del cliente, que podrá recibir una rutina nueva.
          </p>
        </Modal.Body>
        <Modal.Footer>
          <button className="btn-dark" onClick={() => setShowFinalizar(false)}>Cancelar</button>
          <button className="btn-neon" onClick={confirmarFinalizar}>Sí, finalizar</button>
        </Modal.Footer>
      </Modal>

      {/* Confirmación de eliminar */}
      <Modal show={showEliminar} onHide={() => setShowEliminar(false)} centered>
        <Modal.Header closeButton>
          <Modal.Title>Eliminar rutina</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          {errorEliminar && <div className="alert-g alert-error show">{errorEliminar}</div>}
          <p>
            ¿Seguro que quieres eliminar <strong>{aEliminar?.nombre}</strong> de{" "}
            <strong>{aEliminar ? nombre(buscarCliente(aEliminar.id_cliente)) : ""}</strong>? Esta acción no se puede
            deshacer.
          </p>
          {sugerirFinalizar && (
            <p className="card-sub">
              Esta rutina ya está en uso desde el {aEliminar ? utils.fecha(aEliminar.fecha_creacion) : ""}. Si el
              cliente solo terminó con ella, mejor <strong>finalízala</strong>: queda en su historial y el cliente
              puede recibir una rutina nueva.
            </p>
          )}
          {!eliminarCreadaHoy && !eliminarVigente && (
            <p className="card-sub">Esta rutina forma parte del historial del cliente: al eliminarla se pierde ese registro.</p>
          )}
          {eliminarCreadaHoy && <p className="card-sub">Se creó hoy, así que no hay historial que conservar.</p>}
        </Modal.Body>
        <Modal.Footer>
          <button className="btn-dark" onClick={() => setShowEliminar(false)}>Cancelar</button>
          {sugerirFinalizar && (
            <button className="btn-neon" onClick={finalizarEnLugarDeEliminar}>Finalizar en su lugar</button>
          )}
          <button className="btn-danger-g" onClick={confirmarEliminar}>Sí, eliminar</button>
        </Modal.Footer>
      </Modal>
    </>
  );
}
