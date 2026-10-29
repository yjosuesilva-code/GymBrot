import { useEffect, useState } from "react";
import { Modal } from "react-bootstrap";
import { api } from "../../data/api";
import { apiClases } from "../../data/apiClases";
import { DIAS_MAX_INSCRIPCION, NOMBRE_TIPO_CLASE, diaSemanaDe, horaFin, ultimoDiaReservable } from "../../lib/clases";
import { instructorEnSesion } from "../../lib/sesionInstructor";
import { utils } from "../../lib/utils";
import { ModalClase } from "./ModalClase";
import { ModalSesion } from "./ModalSesion";
import { NOMBRE_DIA } from "./textos";
import type { Clase, ClaseNueva, Cliente, Instructor, SesionClase } from "../../types";

/* [P3] B7 · KAN-94 — Pestaña "Clases" de /citas (admin e instructor).
   Es la sección completa de la página: carga sus datos con apiClases (por eso, a diferencia
   de los componentes de presentación, sí llama a la API). Arriba el horario semanal (crear,
   editar, cancelar) y abajo las sesiones de los próximos DIAS_MAX_INSCRIPCION días con su
   ocupación; al abrir una sesión se ven los inscritos y se puede cancelar esa fecha.
   Si entra un instructor, solo ve y crea sus clases. */

type Alerta = { tipo: "ok" | "error"; mensaje: string };

export function PanelClases() {
  const [miCedula] = useState(instructorEnSesion);
  const [cargando, setCargando] = useState(true);
  const [version, setVersion] = useState(0); // subirla vuelve a cargar todo
  const [clases, setClases] = useState<Clase[]>([]);
  const [sesiones, setSesiones] = useState<SesionClase[]>([]);
  const [instructores, setInstructores] = useState<Instructor[]>([]);
  const [clientes, setClientes] = useState<Cliente[]>([]);
  const [alerta, setAlerta] = useState<Alerta | null>(null);

  // Modales: crear/editar (undefined = cerrado, null = nueva), cancelar clase y detalle de sesión
  const [editando, setEditando] = useState<Clase | null | undefined>(undefined);
  const [aCancelar, setACancelar] = useState<Clase | null>(null);
  const [sesionAbierta, setSesionAbierta] = useState<SesionClase | null>(null);
  const [inscritos, setInscritos] = useState<Cliente[] | null>(null);
  const [guardando, setGuardando] = useState(false);
  const [errorModal, setErrorModal] = useState("");

  useEffect(() => {
    let activo = true;
    const hoy = utils.isoDate();
    Promise.all([apiClases.list(), apiClases.sesiones(hoy, ultimoDiaReservable(hoy)), api.instructores.list(), api.clientes.list()]).then(
      ([c, s, i, cl]) => {
        if (!activo) return;
        // El instructor en sesión solo ve sus clases (no hay guard de rutas por rol)
        const mias = (x: Clase) => miCedula === null || x.id_instructor === miCedula;
        setClases(c.filter((x) => x.estado === "ACTIVA" && mias(x)));
        setSesiones(s.filter((x) => mias(x.clase)));
        setInstructores(i);
        setClientes(cl);
        setCargando(false);
      }
    );
    return () => {
      activo = false;
    };
  }, [version, miCedula]);

  useEffect(() => {
    if (!alerta) return;
    const t = setTimeout(() => setAlerta(null), 4000);
    return () => clearTimeout(t);
  }, [alerta]);

  const nombreInstructor = (cedula: string) => {
    const i = instructores.find((x) => x.numero_identificacion === cedula);
    return i ? i.nombre + " " + i.apellidos : cedula;
  };
  const elegibles = instructores.filter((i) => i.estado === "ACTIVO");

  // Sesiones agrupadas por fecha (ya vienen ordenadas por fecha y hora)
  const fechas = [...new Set(sesiones.map((s) => s.fecha))];

  function terminar(ok: boolean, mensaje: string) {
    setGuardando(false);
    if (!ok) {
      setErrorModal(mensaje);
      return;
    }
    setEditando(undefined);
    setACancelar(null);
    setSesionAbierta(null);
    setErrorModal("");
    setAlerta({ tipo: "ok", mensaje });
    setVersion((v) => v + 1);
  }

  async function guardarClase(datos: ClaseNueva) {
    setGuardando(true);
    const res = editando ? await apiClases.update(editando.id_clase, datos) : await apiClases.create(datos);
    terminar(res.ok, res.mensaje);
  }

  async function confirmarCancelarClase() {
    if (!aCancelar) return;
    setGuardando(true);
    const res = await apiClases.cancelar(aCancelar.id_clase);
    terminar(res.ok, res.mensaje);
  }

  async function abrirSesion(s: SesionClase) {
    setErrorModal("");
    setInscritos(null);
    setSesionAbierta(s);
    const lista = await apiClases.inscritosDeSesion(s.clase.id_clase, s.fecha);
    setInscritos(lista.flatMap((x) => clientes.filter((c) => c.numero_identificacion === x.id_cliente)));
  }

  async function cancelarSesion() {
    if (!sesionAbierta) return;
    setGuardando(true);
    const res = await apiClases.cancelarSesion(sesionAbierta.clase.id_clase, sesionAbierta.fecha);
    terminar(res.ok, res.mensaje);
  }

  return (
    <div className="card-g">
      <div className="card-head">
        <div>
          <h2 className="card-title">Clases grupales</h2>
          <p className="card-sub">
            Horario semanal y sesiones de los próximos {DIAS_MAX_INSCRIPCION} días. Los clientes reservan su cupo por fecha.
          </p>
        </div>
        <button className="btn-neon" onClick={() => { setErrorModal(""); setEditando(null); }}>
          <i className="bi bi-plus-lg me-1" aria-hidden /> Nueva clase
        </button>
      </div>

      {alerta && <div className={"alert-g show alert-" + alerta.tipo}>{alerta.mensaje}</div>}

      {cargando ? (
        <div className="loader"><span className="spinner-g"></span>Cargando...</div>
      ) : (
        <>
          {/* Horario semanal */}
          <h3 className="inst-subtitulo">Horario semanal</h3>
          <div className="table-wrap">
            <table className="table-g tabla-stack">
              <thead>
                <tr>
                  <th>Clase</th>
                  {miCedula === null && <th>Instructor</th>}
                  <th>Día y hora</th>
                  <th>Aforo</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {clases.length === 0 ? (
                  <tr><td colSpan={5} className="empty-state">Todavía no hay clases. Crea la primera con «Nueva clase».</td></tr>
                ) : (
                  clases.map((c) => (
                    <tr key={c.id_clase}>
                      <td data-label="Clase">
                        <div>
                          <div className="person-name">{c.nombre}</div>
                          <span className="badge-g badge-categoria">{NOMBRE_TIPO_CLASE[c.tipo_clase]}</span>
                        </div>
                      </td>
                      {miCedula === null && <td data-label="Instructor">{nombreInstructor(c.id_instructor)}</td>}
                      <td data-label="Día y hora">{NOMBRE_DIA[c.dia_semana]} · {c.hora}–{horaFin(c)}</td>
                      <td data-label="Aforo">{c.aforo_max} personas</td>
                      <td>
                        <div className="cell-actions">
                          <button className="btn-icon" title="Editar" onClick={() => { setErrorModal(""); setEditando(c); }}><i className="bi bi-pencil" aria-hidden /></button>
                          <button className="btn-icon" title="Cancelar la clase" onClick={() => { setErrorModal(""); setACancelar(c); }}><i className="bi bi-x-circle" aria-hidden /></button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {/* Próximas sesiones con su ocupación */}
          <h3 className="inst-subtitulo">Próximas sesiones</h3>
          {fechas.length === 0 ? (
            <p className="inst-auto-vacio">No hay sesiones en los próximos {DIAS_MAX_INSCRIPCION} días.</p>
          ) : (
            fechas.map((fecha) => (
              <div className="inst-dia-sesiones" key={fecha}>
                <div className="inst-dia-titulo">{NOMBRE_DIA[diaSemanaDe(fecha)]} · {utils.fecha(fecha)}</div>
                <div className="inst-agenda">
                  {sesiones
                    .filter((s) => s.fecha === fecha)
                    .map((s) => {
                      const pct = Math.round((s.inscritos / s.clase.aforo_max) * 100);
                      return (
                        <button type="button" className="inst-agenda-fila inst-fila-link inst-sesion" key={s.clase.id_clase + s.fecha} onClick={() => abrirSesion(s)}>
                          <span className="inst-agenda-hora">{s.clase.hora}</span>
                          <div className="inst-agenda-info">
                            <strong>{s.clase.nombre}</strong>
                            <span className="card-sub">{miCedula === null ? nombreInstructor(s.clase.id_instructor) + " · " : ""}{s.clase.duracion_min} min</span>
                          </div>
                          {s.cancelada ? (
                            <span className="badge-g badge-cancelada">Cancelada</span>
                          ) : (
                            <div className="inst-ocupacion" title={s.inscritos + " de " + s.clase.aforo_max + " cupos"}>
                              <div className="kpi-bar"><span style={{ width: pct + "%" }}></span></div>
                              <span>{s.inscritos}/{s.clase.aforo_max}</span>
                              {s.cupos_libres === 0 && <span className="badge-g badge-pendiente">Llena</span>}
                            </div>
                          )}
                        </button>
                      );
                    })}
                </div>
              </div>
            ))
          )}
        </>
      )}

      {editando !== undefined && (
        <ModalClase
          key={editando?.id_clase ?? "nueva"}
          show
          inicial={editando}
          instructores={elegibles}
          instructorFijo={miCedula ?? undefined}
          guardando={guardando}
          error={errorModal}
          onGuardar={guardarClase}
          onCerrar={() => setEditando(undefined)}
        />
      )}

      <Modal show={aCancelar !== null} onHide={() => setACancelar(null)} centered>
        <Modal.Header closeButton><Modal.Title>Cancelar clase</Modal.Title></Modal.Header>
        <Modal.Body>
          {errorModal && <div className="alert-g alert-error show">{errorModal}</div>}
          <p>
            ¿Cancelar «{aCancelar?.nombre}» de los {aCancelar ? NOMBRE_DIA[aCancelar.dia_semana].toLowerCase() : ""}? Deja de ofrecerse y las
            reservas de las próximas sesiones quedan canceladas. Para cancelar una sola fecha, ábrela en «Próximas sesiones».
          </p>
        </Modal.Body>
        <Modal.Footer>
          <button className="btn-dark" onClick={() => setACancelar(null)}>Volver</button>
          <button className="btn-danger-g" disabled={guardando} onClick={confirmarCancelarClase}>Sí, cancelar la clase</button>
        </Modal.Footer>
      </Modal>

      <ModalSesion
        sesion={sesionAbierta}
        inscritos={inscritos}
        guardando={guardando}
        error={errorModal}
        onCancelarSesion={cancelarSesion}
        onCerrar={() => setSesionAbierta(null)}
      />
    </div>
  );
}
