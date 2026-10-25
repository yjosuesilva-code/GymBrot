import { useEffect, useMemo, useState } from "react";
import { Modal } from "react-bootstrap";
import { api } from "../data/api";
import { utils } from "../lib/utils";
import { disponibilidadTexto, diaDisponible, horaDisponible, slotsPara, choque } from "../lib/horarios";
import { instructorEnSesion } from "../lib/sesionInstructor"; // [P3] B4 · KAN-91
import type { Cliente, Instructor, Cita, TipoCita } from "../types";

type FormCita = {
  id_cliente: string;
  id_instructor: string;
  fecha: string;
  hora: string;
  tipo_cita: TipoCita;
  notas: string;
};

// [P3] B4 · KAN-91: con instructor en sesión, solo sus citas; sin él (admin), todas
function citasDe(lista: Cita[], cedulaInstructor: string | null): Cita[] {
  return cedulaInstructor ? lista.filter((c) => c.id_instructor === cedulaInstructor) : lista;
}

const VACIO: FormCita = {
  id_cliente: "",
  id_instructor: "",
  fecha: "",
  hora: "",
  tipo_cita: "CONSULTA",
  notas: "",
};

const TIPOS: TipoCita[] = ["EVALUACION", "SEGUIMIENTO", "NUTRICION", "CONSULTA"];

const NOMBRE_TIPO: Record<TipoCita, string> = {
  EVALUACION: "Evaluación",
  SEGUIMIENTO: "Seguimiento",
  NUTRICION: "Nutrición",
  CONSULTA: "Consulta",
};

const DOW_CORTO = ["Lun", "Mar", "Mié", "Jue", "Vie", "Sáb", "Dom"];
const MESES = [
  "Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio",
  "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre",
];

// Todas las franjas de media hora que ofrece la agenda (06:00 a 22:30)
const SLOTS: string[] = (() => {
  const out: string[] = [];
  for (let t = 6 * 60; t <= 22 * 60 + 30; t += 30) {
    out.push(`${String(Math.floor(t / 60)).padStart(2, "0")}:${String(t % 60).padStart(2, "0")}`);
  }
  return out;
})();

type Alerta = { tipo: "ok" | "error"; mensaje: string };

function iso(anio: number, mes: number, dia: number): string {
  return anio + "-" + String(mes + 1).padStart(2, "0") + "-" + String(dia).padStart(2, "0");
}

export function Citas() {
  const [citas, setCitas] = useState<Cita[]>([]);
  const [clientes, setClientes] = useState<Cliente[]>([]);
  const [instructores, setInstructores] = useState<Instructor[]>([]);
  const [cargando, setCargando] = useState(true);
  const [alerta, setAlerta] = useState<Alerta | null>(null);

  // Calendario: mes visible y día seleccionado
  const hoyISO = utils.isoDate();
  const [mes, setMes] = useState(() => {
    const d = new Date();
    return { anio: d.getFullYear(), mes: d.getMonth() };
  });
  const [diaSel, setDiaSel] = useState<string>(hoyISO);

  // Modal
  const [show, setShow] = useState(false);
  const [editandoId, setEditandoId] = useState<number | null>(null);
  const [form, setForm] = useState<FormCita>(VACIO);
  const [error, setError] = useState("");
  const [guardando, setGuardando] = useState(false);

  // [P3] B4 · KAN-91: si entra un INSTRUCTOR solo ve y agenda sus propias citas
  const [miCedula] = useState(instructorEnSesion);
  const soloMias = (lista: Cita[]) => citasDe(lista, miCedula);

  useEffect(() => {
    Promise.all([api.citas.list(), api.clientes.list(), api.instructores.list()]).then(
      ([ci, cl, ins]) => {
        setCitas(citasDe(ci, miCedula)); // [P3] B4
        setClientes(cl);
        setInstructores(ins);
        setCargando(false);
      }
    );
  }, [miCedula]);

  useEffect(() => {
    if (!alerta) return;
    const t = setTimeout(() => setAlerta(null), 4000);
    return () => clearTimeout(t);
  }, [alerta]);

  const setCampo = <K extends keyof FormCita>(campo: K, valor: FormCita[K]) =>
    setForm((f) => ({ ...f, [campo]: valor }));

  const nombreCliente = (id: string) => {
    const c = clientes.find((x) => x.numero_identificacion === id);
    return c ? c.nombre + " " + c.apellidos : id;
  };
  const nombreInstructor = (id: string) => {
    const i = instructores.find((x) => x.numero_identificacion === id);
    return i ? i.nombre + " " + i.apellidos : id;
  };

  // --- KPIs ---------------------------------------------------------------
  const contar = (estado: Cita["estado"]) => citas.filter((c) => c.estado === estado).length;
  const kpis: { clave: string; etiqueta: string; valor: number; color: string }[] = [
    { clave: "hoy", etiqueta: "Hoy", valor: citas.filter((c) => c.fecha === hoyISO).length, color: "var(--accent)" },
    { clave: "pendiente", etiqueta: "Pendientes", valor: contar("PENDIENTE"), color: "#f5b301" },
    { clave: "confirmada", etiqueta: "Confirmadas", valor: contar("CONFIRMADA"), color: "var(--accent)" },
    { clave: "completada", etiqueta: "Completadas", valor: contar("COMPLETADA"), color: "var(--neon)" },
    { clave: "cancelada", etiqueta: "Canceladas", valor: contar("CANCELADA"), color: "#ff6b6b" },
  ];

  // --- Calendario ---------------------------------------------------------
  const celdas = useMemo(() => {
    const total = new Date(mes.anio, mes.mes + 1, 0).getDate();
    const offset = (new Date(mes.anio, mes.mes, 1).getDay() + 6) % 7; // 0 = lunes
    const out: (string | null)[] = Array<string | null>(offset).fill(null);
    for (let d = 1; d <= total; d++) out.push(iso(mes.anio, mes.mes, d));
    while (out.length % 7 !== 0) out.push(null);
    return out;
  }, [mes]);

  const citasDelDia = (fecha: string) => citas.filter((c) => c.fecha === fecha);

  const cambiarMes = (delta: number) => {
    setMes((m) => {
      const d = new Date(m.anio, m.mes + delta, 1);
      return { anio: d.getFullYear(), mes: d.getMonth() };
    });
  };

  const citasSel = citas.filter((c) => c.fecha === diaSel);
  const citasEn = (hora: string) => citasSel.filter((c) => c.hora === hora);

  // --- Instructores / horas disponibles en el modal -----------------------
  const instructoresElegibles = instructores.filter((i) => {
    if (miCedula && i.numero_identificacion !== miCedula) return false; // [P3] B4: el instructor solo se elige a sí mismo
    if (i.numero_identificacion === form.id_instructor) return true; // no perder el actual al editar
    if (!diaDisponible(i.horario, form.fecha)) return false;
    if (form.hora && !horaDisponible(i.horario, form.fecha, form.hora)) return false;
    return true;
  });

  const instructorSel = instructores.find((i) => i.numero_identificacion === form.id_instructor);
  const horasOpciones = useMemo(() => {
    if (!form.fecha) return [];
    const base = instructorSel ? slotsPara(instructorSel.horario, form.fecha) : [];
    if (form.hora && !base.includes(form.hora)) return [form.hora, ...base].sort();
    return base;
  }, [form.fecha, form.hora, instructorSel]);

  // --- Abrir modal --------------------------------------------------------
  function abrirNuevo(fecha?: string, hora?: string) {
    setEditandoId(null);
    setForm({ ...VACIO, id_instructor: miCedula ?? "", fecha: fecha ?? diaSel ?? hoyISO, hora: hora ?? "" }); // [P3] B4
    setError("");
    setShow(true);
  }

  function abrirEdicion(c: Cita) {
    setEditandoId(c.id_cita);
    setForm({
      id_cliente: c.id_cliente,
      id_instructor: c.id_instructor,
      fecha: c.fecha,
      hora: c.hora,
      tipo_cita: c.tipo_cita,
      notas: c.notas,
    });
    setError("");
    setShow(true);
  }

  async function guardar() {
    if (!form.id_cliente || !form.id_instructor || !form.fecha || !form.hora) {
      setError("Cliente, instructor, fecha y hora son obligatorios");
      return;
    }
    const instructor = instructores.find((x) => x.numero_identificacion === form.id_instructor);
    if (!instructor) {
      setError("El instructor no existe");
      return;
    }
    if (!diaDisponible(instructor.horario, form.fecha)) {
      setError(`${instructor.nombre} ${instructor.apellidos} no atiende ese día de la semana`);
      return;
    }
    if (!horaDisponible(instructor.horario, form.fecha, form.hora)) {
      setError(`${instructor.nombre} ${instructor.apellidos} no está disponible a las ${form.hora} ese día`);
      return;
    }
    if (choque(citas, form.id_instructor, form.fecha, form.hora, editandoId ?? undefined)) {
      setError(`${instructor.nombre} ${instructor.apellidos} ya tiene una cita a esa fecha y hora`);
      return;
    }

    setGuardando(true);
    const res = editandoId
      ? await api.citas.update(editandoId, form)
      : await api.citas.create(form);
    setGuardando(false);

    if (!res.ok) {
      setError(res.mensaje);
      return;
    }
    setShow(false);
    setAlerta({ tipo: "ok", mensaje: res.mensaje });
    setCitas(soloMias(await api.citas.list())); // [P3] B4
  }

  async function cambiarEstado(c: Cita, estado: Cita["estado"]) {
    const res = await api.citas.setEstado(c.id_cita, estado);
    setAlerta(res.ok ? { tipo: "ok", mensaje: res.mensaje } : { tipo: "error", mensaje: res.mensaje });
    setCitas(soloMias(await api.citas.list())); // [P3] B4
  }

  const mesNombre = MESES[mes.mes] + " " + mes.anio;

  return (
    <div className="card-g">
      <div className="card-head">
        <div>
          <h2 className="card-title">Citas</h2>
          <p className="card-sub">Agenda de entrenamientos con los instructores</p>
        </div>
        <button className="btn-neon" onClick={() => abrirNuevo()}>+ Nueva cita</button>
      </div>

      {alerta && <div className={"alert-g show alert-" + alerta.tipo}>{alerta.mensaje}</div>}

      {/* KPIs */}
      <div className="citas-kpis">
        {kpis.map((k) => (
          <div className="cita-kpi" key={k.clave}>
            <span className="cita-kpi-valor" style={{ color: k.color }}>{k.valor}</span>
            <span className="cita-kpi-label">{k.etiqueta}</span>
          </div>
        ))}
      </div>

      {cargando ? (
        <div className="loader"><span className="spinner-g"></span>Cargando...</div>
      ) : (
        <div className="citas-layout">
          {/* Calendario */}
          <div className="cal">
            <div className="cal-head">
              <button className="btn-icon" title="Mes anterior" onClick={() => cambiarMes(-1)}>
                <i className="bi bi-chevron-left" aria-hidden />
              </button>
              <span className="cal-mes">{mesNombre}</span>
              <button className="btn-icon" title="Mes siguiente" onClick={() => cambiarMes(1)}>
                <i className="bi bi-chevron-right" aria-hidden />
              </button>
            </div>
            <div className="cal-grid">
              {DOW_CORTO.map((d) => (
                <div className="cal-dow" key={d}>{d}</div>
              ))}
              {celdas.map((fecha, idx) => {
                if (!fecha) return <div className="cal-celda vacia" key={"v" + idx} />;
                const delDia = citasDelDia(fecha);
                const dia = Number(fecha.slice(-2));
                return (
                  <button
                    className={
                      "cal-celda" +
                      (fecha === diaSel ? " sel" : "") +
                      (fecha === hoyISO ? " hoy" : "")
                    }
                    key={fecha}
                    onClick={() => setDiaSel(fecha)}
                  >
                    <span className="cal-num">{dia}</span>
                    <span className="cal-dots">
                      {delDia.slice(0, 3).map((c) => (
                        <span className={"cal-dot dot-" + c.estado.toLowerCase()} key={c.id_cita} />
                      ))}
                      {delDia.length > 3 && <span className="cal-mas">+{delDia.length - 3}</span>}
                    </span>
                  </button>
                );
              })}
            </div>
            <div className="cal-leyenda">
              <span><i className="cal-dot dot-pendiente" /> Pendiente</span>
              <span><i className="cal-dot dot-confirmada" /> Confirmada</span>
              <span><i className="cal-dot dot-completada" /> Completada</span>
              <span><i className="cal-dot dot-cancelada" /> Cancelada</span>
            </div>
          </div>

          {/* Franjas del día seleccionado */}
          <div className="horas">
            <div className="horas-head">
              <span>{utils.fecha(diaSel)}</span>
              <span className="horas-sub">{citasSel.length} cita(s)</span>
            </div>
            <div className="horas-lista">
              {SLOTS.map((hora) => {
                const citasHora = citasEn(hora);
                return (
                  <div className="hora-fila" key={hora}>
                    <span className="hora-tag">{hora}</span>
                    <div className="hora-citas">
                      {citasHora.length === 0 ? (
                        <button className="hora-libre" onClick={() => abrirNuevo(diaSel, hora)}>
                          <i className="bi bi-plus" aria-hidden /> libre
                        </button>
                      ) : (
                        citasHora.map((c) => (
                          <div className={"cita-chip chip-" + c.estado.toLowerCase()} key={c.id_cita}>
                            <div className="cita-chip-info">
                              <span className="cita-chip-cliente">{nombreCliente(c.id_cliente)}</span>
                              <span className="cita-chip-sub">
                                {NOMBRE_TIPO[c.tipo_cita]} · {nombreInstructor(c.id_instructor)}
                              </span>
                            </div>
                            <div className="cita-chip-acciones">
                              <button className="btn-icon" title="Editar" onClick={() => abrirEdicion(c)}>
                                <i className="bi bi-pencil" aria-hidden />
                              </button>
                              <button className="btn-icon" title="Confirmar" onClick={() => cambiarEstado(c, "CONFIRMADA")}>
                                <i className="bi bi-check-circle" aria-hidden />
                              </button>
                              <button className="btn-icon" title="Completar" onClick={() => cambiarEstado(c, "COMPLETADA")}>
                                <i className="bi bi-flag" aria-hidden />
                              </button>
                              <button className="btn-icon" title="Cancelar" onClick={() => cambiarEstado(c, "CANCELADA")}>
                                <i className="bi bi-slash-circle" aria-hidden />
                              </button>
                            </div>
                          </div>
                        ))
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      <Modal show={show} onHide={() => setShow(false)} centered>
        <Modal.Header closeButton>
          <Modal.Title>{editandoId ? "Editar cita" : "Nueva cita"}</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          {error && <div className="alert-g alert-error show">{error}</div>}
          <div className="row g-3">
            <div className="col-12">
              <label className="form-label-g">Cliente</label>
              <select className="form-control-dark" value={form.id_cliente} onChange={(e) => setCampo("id_cliente", e.target.value)}>
                <option value="">Selecciona un cliente</option>
                {clientes.map((c) => (
                  <option key={c.numero_identificacion} value={c.numero_identificacion}>
                    {c.nombre} {c.apellidos}
                  </option>
                ))}
              </select>
            </div>
            <div className="col-12">
              <label className="form-label-g">Instructor</label>
              <select
                className="form-control-dark"
                value={form.id_instructor}
                onChange={(e) => {
                  const id = e.target.value;
                  setForm((f) => ({ ...f, id_instructor: id, hora: "" }));
                }}
              >
                <option value="">Selecciona un instructor</option>
                {instructoresElegibles.map((i) => (
                  <option key={i.numero_identificacion} value={i.numero_identificacion}>
                    {i.nombre} {i.apellidos} · {i.especialidad}
                  </option>
                ))}
              </select>
              {form.id_instructor && instructorSel && (
                <p className="form-hint">{disponibilidadTexto(instructorSel.horario) || "Sin horario cargado"}</p>
              )}
            </div>
            <div className="col-6">
              <label className="form-label-g">Fecha</label>
              <input
                type="date"
                className="form-control-dark"
                value={form.fecha}
                onChange={(e) => setForm((f) => ({ ...f, fecha: e.target.value, hora: "" }))}
              />
            </div>
            <div className="col-6">
              <label className="form-label-g">Hora</label>
              <select
                className="form-control-dark"
                value={form.hora}
                onChange={(e) => setCampo("hora", e.target.value)}
                disabled={horasOpciones.length === 0}
              >
                <option value="">Selecciona una hora</option>
                {horasOpciones.map((h) => (
                  <option key={h} value={h}>{h}</option>
                ))}
              </select>
            </div>
            <div className="col-12">
              <label className="form-label-g">Tipo de cita</label>
              <select className="form-control-dark" value={form.tipo_cita} onChange={(e) => setCampo("tipo_cita", e.target.value as TipoCita)}>
                {TIPOS.map((t) => (
                  <option key={t} value={t}>{NOMBRE_TIPO[t]}</option>
                ))}
              </select>
            </div>
            <div className="col-12">
              <label className="form-label-g">Notas</label>
              <input className="form-control-dark" value={form.notas} onChange={(e) => setCampo("notas", e.target.value)} />
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
    </div>
  );
}
