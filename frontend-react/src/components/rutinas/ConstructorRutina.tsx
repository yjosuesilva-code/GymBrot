import { useState } from "react";
import type {
  Cliente,
  Ejercicio,
  Instructor,
  LetraSesion,
  ObjetivoRutina,
  SesionEjercicioNuevo,
} from "../../types";
import { utils } from "../../lib/utils";
import { OBJETIVOS_RUTINA, duracionEstimada, gruposDeSesion, sesionesSugeridas } from "../../lib/rutinas";
import { VistaPreviaRecurso } from "../ejercicios/VistaPreviaRecurso";
import { BuscadorCliente } from "./BuscadorCliente";
import { PestanasSesion } from "./PestanasSesion";
import type { PestanaSesion } from "./PestanasSesion";
import { SelectorEjercicios } from "./SelectorEjercicios";

/* [P3] Constructor de rutinas v2 (KAN-56). Componente reutilizable: NO llama a la API.
   Recibe los datos por props y devuelve el resultado con onGuardar(datos, ejercicios);
   quien lo usa (admin hoy, instructor en la Fase B) decide cómo guardarlo.

   Estructura: 1) cliente y plan (división, frecuencia, fecha fin, sesiones planeadas)
               2) una pestaña por sesión con sus ejercicios editables. */

export type DatosRutina = {
  id_cliente: string;
  id_instructor: string;
  nombre: string;
  descripcion: string;
  objetivo: ObjetivoRutina;
  fecha_fin: string | null;
  sesiones_planeadas: number;
  division: LetraSesion[];
};

export type RutinaInicial = {
  datos: DatosRutina;
  ejercicios: SesionEjercicioNuevo[];
  fecha_creacion: string;
};

type Props = {
  clientes: Cliente[];            // candidatos para una rutina nueva (ACTIVOS sin rutina vigente)
  clienteFijo?: Cliente | null;   // al editar (o al venir de "Asignar rutina"): cliente ya elegido
  instructores: Instructor[];     // ACTIVOS
  instructorFijo?: string;        // Fase B: el instructor en sesión
  catalogo: Ejercicio[];
  inicial?: RutinaInicial;        // al editar
  guardando: boolean;
  error: string;                  // error que devolvió la API al guardar
  onGuardar: (datos: DatosRutina, ejercicios: SesionEjercicioNuevo[]) => void;
  onCancelar: () => void;
};

// Un ejercicio en el formulario: los números van como texto ("" = vacío)
type FilaForm = {
  clave: string;
  id_ejercicio: number;
  sesion: LetraSesion;
  series: string;
  reps_min: string;
  reps_max: string;
  segundos: string;
  peso_kg: string;
  descanso_seg: string;
  notas_instructor: string;
  agregado_por_cliente?: boolean;
  revisado_por_instructor?: boolean;
};

const DIVISIONES: LetraSesion[][] = [["A"], ["A", "B"], ["A", "B", "C"], ["A", "B", "C", "D"]];
const FRECUENCIAS = [1, 2, 3, 4, 5];

const aTexto = (n: number | null | undefined) => (n === null || n === undefined ? "" : String(n));
const aNumero = (t: string) => (t.trim() === "" ? null : Number(t));
const esEnteroPositivo = (t: string) => /^\d+$/.test(t.trim()) && Number(t) > 0;
const esNoNegativo = (t: string) => t.trim() === "" || (Number.isFinite(Number(t)) && Number(t) >= 0);

let contadorClaves = 0;
const nuevaClave = () => "f" + ++contadorClaves;

export function ConstructorRutina(props: Props) {
  const { clientes, clienteFijo, instructores, instructorFijo, catalogo, inicial, guardando, error, onGuardar, onCancelar } = props;
  const hoy = utils.isoDate();
  const inicio = inicial?.fecha_creacion ?? hoy;

  // useState con función: el valor inicial se calcula una sola vez, al montar
  const [cliente, setCliente] = useState<Cliente | null>(clienteFijo ?? null);
  const [nombre, setNombre] = useState(inicial?.datos.nombre ?? "");
  const [descripcion, setDescripcion] = useState(inicial?.datos.descripcion ?? "");
  const [objetivo, setObjetivo] = useState<ObjetivoRutina>(inicial?.datos.objetivo ?? "Ganancia muscular");
  const [idInstructor, setIdInstructor] = useState(instructorFijo ?? inicial?.datos.id_instructor ?? "");
  const [division, setDivision] = useState<LetraSesion[]>(inicial?.datos.division ?? ["A", "B", "C"]);
  const [frecuencia, setFrecuencia] = useState(3);
  const [fechaFin, setFechaFin] = useState(inicial?.datos.fecha_fin ?? "");
  const [sesiones, setSesiones] = useState(aTexto(inicial?.datos.sesiones_planeadas));
  const [filas, setFilas] = useState<FilaForm[]>(() =>
    (inicial?.ejercicios ?? []).map((e) => ({
      clave: nuevaClave(),
      id_ejercicio: e.id_ejercicio,
      sesion: e.sesion ?? "A",
      series: aTexto(e.series),
      reps_min: aTexto(e.reps_min),
      reps_max: aTexto(e.reps_max),
      segundos: aTexto(e.segundos),
      peso_kg: aTexto(e.peso_kg),
      descanso_seg: aTexto(e.descanso_seg),
      notas_instructor: e.notas_instructor,
      agregado_por_cliente: e.agregado_por_cliente,
      revisado_por_instructor: e.revisado_por_instructor,
    }))
  );
  const [activa, setActiva] = useState<LetraSesion>("A");
  const [selector, setSelector] = useState(false);
  const [errores, setErrores] = useState<string[]>([]);

  const ejercicioDe = (id: number) => catalogo.find((c) => c.id_ejercicio === id);
  const porTiempo = (id: number) => ejercicioDe(id)?.tipo_medicion === "TIEMPO";
  const filasDe = (s: LetraSesion) => filas.filter((f) => f.sesion === s);
  const sugeridas = sesionesSugeridas(frecuencia, inicio, fechaFin || null);

  // Problema de una fila (o "" si está bien)
  function problemaFila(f: FilaForm): string {
    const nombreEj = ejercicioDe(f.id_ejercicio)?.nombre ?? "un ejercicio";
    if (!esEnteroPositivo(f.series)) return nombreEj + ": las series deben ser un entero mayor que 0";
    if (porTiempo(f.id_ejercicio)) {
      if (!esEnteroPositivo(f.segundos)) return nombreEj + ": indica los segundos";
    } else {
      if (!esEnteroPositivo(f.reps_min) || !esEnteroPositivo(f.reps_max)) return nombreEj + ": indica el rango de repeticiones";
      if (Number(f.reps_min) > Number(f.reps_max)) return nombreEj + ": las repeticiones mínimas superan a las máximas";
    }
    if (!esNoNegativo(f.peso_kg) || !esNoNegativo(f.descanso_seg)) return nombreEj + ": peso y descanso no pueden ser negativos";
    return "";
  }

  // Aviso de cada pestaña: vacía o con valores por revisar
  function avisoSesion(s: LetraSesion): string | undefined {
    const deEsta = filasDe(s);
    if (deEsta.length === 0) return "Sesión vacía";
    if (deEsta.some((f) => problemaFila(f) !== "")) return "Revisa los valores";
    return undefined;
  }

  const pestanas: PestanaSesion[] = division.map((s) => {
    const deEsta = filasDe(s);
    const numericas = deEsta.map((f) => ({
      series: aNumero(f.series) ?? 1,
      reps_min: aNumero(f.reps_min),
      reps_max: aNumero(f.reps_max),
      segundos: porTiempo(f.id_ejercicio) ? aNumero(f.segundos) : null,
      descanso_seg: aNumero(f.descanso_seg),
    }));
    const resumen =
      deEsta.length === 0
        ? "Sin ejercicios"
        : deEsta.length + " ejerc. · ~" + duracionEstimada(numericas) + " min · " + gruposDeSesion(deEsta, catalogo).join(", ");
    return { sesion: s, resumen, aviso: avisoSesion(s) };
  });

  // Cambia la división; si la pestaña activa desaparece, vuelve a la A
  function cambiarDivision(d: LetraSesion[]) {
    setDivision(d);
    if (!d.includes(activa)) setActiva("A");
  }

  function actualizarFila(clave: string, cambios: Partial<FilaForm>) {
    setFilas((lista) => lista.map((f) => (f.clave === clave ? { ...f, ...cambios } : f)));
  }

  function quitarFila(clave: string) {
    setFilas((lista) => lista.filter((f) => f.clave !== clave));
  }

  // Sube o baja una fila dentro de su sesión (intercambia con la vecina de la misma sesión)
  function mover(clave: string, paso: -1 | 1) {
    setFilas((lista) => {
      const i = lista.findIndex((f) => f.clave === clave);
      const sesion = lista[i].sesion;
      let j = i + paso;
      while (j >= 0 && j < lista.length && lista[j].sesion !== sesion) j += paso;
      if (j < 0 || j >= lista.length) return lista;
      const copia = [...lista];
      [copia[i], copia[j]] = [copia[j], copia[i]];
      return copia;
    });
  }

  // Agrega los elegidos en el selector con los valores sugeridos del catálogo
  function agregar(elegidos: Ejercicio[]) {
    const nuevas: FilaForm[] = elegidos.map((e) => ({
      clave: nuevaClave(),
      id_ejercicio: e.id_ejercicio,
      sesion: activa,
      series: aTexto(e.series_sugeridas ?? 3),
      reps_min: e.tipo_medicion === "TIEMPO" ? "" : aTexto(e.repeticiones_min_sugeridas ?? 10),
      reps_max: e.tipo_medicion === "TIEMPO" ? "" : aTexto(e.repeticiones_max_sugeridas ?? 12),
      segundos: e.tipo_medicion === "TIEMPO" ? aTexto(e.segundos_sugeridos ?? 30) : "",
      peso_kg: "",
      descanso_seg: "60",
      notas_instructor: "",
    }));
    setFilas((lista) => [...lista, ...nuevas]);
  }

  function guardar() {
    const lista: string[] = [];
    if (!cliente) lista.push("Elige el cliente");
    if (!nombre.trim()) lista.push("Ponle un nombre a la rutina");
    if (!idInstructor) lista.push("Elige el instructor");
    if (!esEnteroPositivo(sesiones)) lista.push("Las sesiones planeadas deben ser un entero mayor que 0");
    const fechaSinCambio = inicial && (inicial.datos.fecha_fin ?? "") === fechaFin;
    if (fechaFin && fechaFin < hoy && !fechaSinCambio) lista.push("La fecha fin no puede ser anterior a hoy");
    for (const s of division) if (filasDe(s).length === 0) lista.push("La sesión " + s + " necesita al menos un ejercicio");
    for (const f of filas.filter((x) => division.includes(x.sesion))) {
      const p = problemaFila(f);
      if (p) lista.push("Sesión " + f.sesion + " · " + p);
    }
    setErrores(lista);
    if (lista.length > 0 || !cliente) return;

    const datos: DatosRutina = {
      id_cliente: cliente.numero_identificacion,
      id_instructor: idInstructor,
      nombre: nombre.trim(),
      descripcion: descripcion.trim(),
      objetivo,
      fecha_fin: fechaFin || null,
      sesiones_planeadas: Number(sesiones),
      division,
    };
    const ejercicios: SesionEjercicioNuevo[] = filas
      .filter((f) => division.includes(f.sesion))
      .map((f, i) => {
        const tiempo = porTiempo(f.id_ejercicio);
        return {
          id_ejercicio: f.id_ejercicio,
          sesion: f.sesion,
          orden: i + 1, // la API los renumera 1, 2, 3… dentro de cada sesión
          series: Number(f.series),
          reps_min: tiempo ? null : aNumero(f.reps_min),
          reps_max: tiempo ? null : aNumero(f.reps_max),
          segundos: tiempo ? aNumero(f.segundos) : null,
          peso_kg: aNumero(f.peso_kg),
          descanso_seg: aNumero(f.descanso_seg),
          notas_instructor: f.notas_instructor.trim(),
          agregado_por_cliente: f.agregado_por_cliente ?? false,
          revisado_por_instructor: f.revisado_por_instructor ?? true,
        };
      });
    onGuardar(datos, ejercicios);
  }

  const fuera = filas.filter((f) => !division.includes(f.sesion));
  const filasActiva = filasDe(activa);

  return (
    <div className="inst-constructor">
      {(errores.length > 0 || error) && (
        <div className="alert-g alert-error show" role="alert">
          <strong>Revisa la rutina:</strong>
          <ul className="mb-0 mt-1">
            {error && <li>{error}</li>}
            {errores.map((e) => <li key={e}>{e}</li>)}
          </ul>
        </div>
      )}

      {/* 1 · Cliente y plan */}
      <section className="card-g">
        <h2 className="card-title"><span className="inst-paso">1</span> Cliente y plan</h2>
        <div className="row g-3">
          <div className="col-lg-6">
            <label className="form-label-g">Cliente</label>
            {clienteFijo && inicial ? (
              <BuscadorCliente clientes={[]} seleccionado={clienteFijo} onSeleccionar={() => undefined} />
            ) : (
              <BuscadorCliente clientes={clientes} seleccionado={cliente} onSeleccionar={setCliente} />
            )}
            {!inicial && <div className="card-sub mt-1">Solo clientes activos sin rutina vigente.</div>}
          </div>
          <div className="col-lg-6">
            <label className="form-label-g">Instructor</label>
            <select
              className="form-control-dark"
              value={idInstructor}
              disabled={instructorFijo !== undefined}
              onChange={(e) => setIdInstructor(e.target.value)}
            >
              <option value="">Elige el instructor</option>
              {instructores.map((i) => (
                <option key={i.numero_identificacion} value={i.numero_identificacion}>
                  {i.nombre} {i.apellidos} — {i.especialidad}
                </option>
              ))}
            </select>
          </div>
          <div className="col-md-8">
            <label className="form-label-g">Nombre de la rutina</label>
            <input className="form-control-dark" placeholder="Ej. Hipertrofia A/B/C" value={nombre} onChange={(e) => setNombre(e.target.value)} />
          </div>
          <div className="col-md-4">
            <label className="form-label-g">Objetivo</label>
            <select className="form-control-dark" value={objetivo} onChange={(e) => setObjetivo(e.target.value as ObjetivoRutina)}>
              {OBJETIVOS_RUTINA.map((o) => <option key={o} value={o}>{o}</option>)}
            </select>
          </div>
          <div className="col-md-6">
            <label className="form-label-g">División de sesiones</label>
            <div className="inst-seg" role="group" aria-label="División">
              {DIVISIONES.map((d) => (
                <button
                  key={d.join("/")}
                  type="button"
                  className={division.join("/") === d.join("/") ? "activo" : ""}
                  onClick={() => cambiarDivision(d)}
                >
                  {d.join("/")}
                </button>
              ))}
            </div>
          </div>
          <div className="col-md-6">
            <label className="form-label-g">Frecuencia (veces por semana)</label>
            <div className="inst-seg" role="group" aria-label="Frecuencia">
              {FRECUENCIAS.map((n) => (
                <button key={n} type="button" className={frecuencia === n ? "activo" : ""} onClick={() => setFrecuencia(n)}>
                  {n}x
                </button>
              ))}
            </div>
          </div>
          <div className="col-md-4">
            <label className="form-label-g">Fecha fin (opcional)</label>
            <input className="form-control-dark" type="date" min={hoy} value={fechaFin} onChange={(e) => setFechaFin(e.target.value)} />
          </div>
          <div className="col-md-4">
            <label className="form-label-g">Sesiones planeadas</label>
            <input className="form-control-dark" type="number" min="1" value={sesiones} onChange={(e) => setSesiones(e.target.value)} />
            <div className="card-sub mt-1">
              Sugeridas: {sugeridas} ({frecuencia}x por semana{fechaFin ? " hasta " + utils.fecha(fechaFin) : ", 8 semanas"}){" "}
              <button type="button" className="inst-link" onClick={() => setSesiones(String(sugeridas))}>Usar</button>
            </div>
          </div>
          <div className="col-md-4">
            <label className="form-label-g">Descripción</label>
            <input className="form-control-dark" placeholder="Opcional" value={descripcion} onChange={(e) => setDescripcion(e.target.value)} />
          </div>
        </div>
      </section>

      {/* 2 · Sesiones */}
      <section className="card-g">
        <div className="card-head">
          <h2 className="card-title"><span className="inst-paso">2</span> Sesiones</h2>
          <button type="button" className="btn-neon" onClick={() => setSelector(true)}>
            <i className="bi bi-plus-lg me-1" aria-hidden /> Agregar ejercicios a la sesión {activa}
          </button>
        </div>
        <PestanasSesion pestanas={pestanas} activa={activa} onCambiar={setActiva} />
        {fuera.length > 0 && (
          <div className="alert-g alert-aviso show mt-3">
            {fuera.length} ejercicio(s) de sesiones que ya no están en la división no se guardarán.
          </div>
        )}

        {filasActiva.length === 0 ? (
          <p className="empty-state">
            La sesión {activa} está vacía. Usa «Agregar ejercicios» para elegirlos del catálogo.
          </p>
        ) : (
          <div className="inst-lista-edit">
            {filasActiva.map((f, i) => {
              const ej = ejercicioDe(f.id_ejercicio);
              const tiempo = porTiempo(f.id_ejercicio);
              const problema = problemaFila(f);
              return (
                <div key={f.clave} className={"inst-fila-edit" + (problema ? " con-error" : "")}>
                  <div className="inst-fila-edit-cab">
                    <div className="inst-mover">
                      <button type="button" className="btn-icon" title="Subir" disabled={i === 0} onClick={() => mover(f.clave, -1)}>
                        <i className="bi bi-arrow-up" aria-hidden />
                      </button>
                      <button type="button" className="btn-icon" title="Bajar" disabled={i === filasActiva.length - 1} onClick={() => mover(f.clave, 1)}>
                        <i className="bi bi-arrow-down" aria-hidden />
                      </button>
                    </div>
                    <VistaPreviaRecurso key={ej?.recurso_url ?? ""} url={ej?.recurso_url ?? ""} tamano="mini" alt={ej?.nombre ?? ""} grupo={ej?.grupo_muscular} />
                    <div className="inst-fila-ej-texto">
                      <div className="person-name">{i + 1}. {ej?.nombre ?? "Ejercicio " + f.id_ejercicio}</div>
                      <div className="person-sub">
                        {ej?.grupo_muscular} · {tiempo ? "por tiempo" : "por repeticiones"}
                        {f.agregado_por_cliente && !f.revisado_por_instructor && " · cambio del cliente sin revisar"}
                      </div>
                    </div>
                    <button type="button" className="btn-icon" title="Quitar de la sesión" onClick={() => quitarFila(f.clave)}>
                      <i className="bi bi-trash" aria-hidden />
                    </button>
                  </div>
                  <div className="inst-campos">
                    <label>
                      <span className="form-label-g">Series</span>
                      <input className="form-control-dark" type="number" min="1" value={f.series} onChange={(e) => actualizarFila(f.clave, { series: e.target.value })} />
                    </label>
                    {tiempo ? (
                      <label>
                        <span className="form-label-g">Segundos</span>
                        <input className="form-control-dark" type="number" min="1" value={f.segundos} onChange={(e) => actualizarFila(f.clave, { segundos: e.target.value })} />
                      </label>
                    ) : (
                      <label>
                        <span className="form-label-g">Reps mín – máx</span>
                        <span className="inst-rango">
                          <input className="form-control-dark" type="number" min="1" aria-label="Repeticiones mínimas" value={f.reps_min} onChange={(e) => actualizarFila(f.clave, { reps_min: e.target.value })} />
                          <input className="form-control-dark" type="number" min="1" aria-label="Repeticiones máximas" value={f.reps_max} onChange={(e) => actualizarFila(f.clave, { reps_max: e.target.value })} />
                        </span>
                      </label>
                    )}
                    <label>
                      <span className="form-label-g">Peso (kg)</span>
                      <input className="form-control-dark" type="number" min="0" step="0.5" placeholder="—" value={f.peso_kg} onChange={(e) => actualizarFila(f.clave, { peso_kg: e.target.value })} />
                    </label>
                    <label>
                      <span className="form-label-g">Descanso (s)</span>
                      <input className="form-control-dark" type="number" min="0" value={f.descanso_seg} onChange={(e) => actualizarFila(f.clave, { descanso_seg: e.target.value })} />
                    </label>
                    <label className="inst-campo-notas">
                      <span className="form-label-g">Notas</span>
                      <input className="form-control-dark" placeholder="Opcional" value={f.notas_instructor} onChange={(e) => actualizarFila(f.clave, { notas_instructor: e.target.value })} />
                    </label>
                  </div>
                  {problema && <div className="inst-error-fila"><i className="bi bi-exclamation-circle me-1" aria-hidden />{problema}</div>}
                </div>
              );
            })}
          </div>
        )}
      </section>

      <div className="inst-acciones-pie">
        <button type="button" className="btn-dark" onClick={onCancelar} disabled={guardando}>Cancelar</button>
        <button type="button" className="btn-neon" onClick={guardar} disabled={guardando}>
          <i className="bi bi-check2 me-1" aria-hidden />
          {guardando ? "Guardando…" : "Guardar rutina"}
        </button>
      </div>

      <SelectorEjercicios
        show={selector}
        sesion={activa}
        catalogo={catalogo}
        excluidos={filasActiva.map((f) => f.id_ejercicio)}
        onAgregar={agregar}
        onCerrar={() => setSelector(false)}
      />
    </div>
  );
}

