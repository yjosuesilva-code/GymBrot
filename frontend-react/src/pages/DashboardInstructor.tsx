// [P3] B1 · KAN-89 — Dashboard del INSTRUCTOR: su día (horario y citas) y las rutinas que lo necesitan
import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { api } from "../data/api";
import { current } from "../lib/auth";
import { utils } from "../lib/utils";
import { DIAS_ORDEN } from "../lib/horarios";
import { MOTIVO_ATENCION, motivosAtencion } from "../lib/rutinas";
import type { MotivoAtencion } from "../lib/rutinas";
import { useTenant } from "../tenant/TenantContext";
import type { Cita, Cliente, FilaSupervision, Instructor, TipoCita } from "../types";

const NOMBRE_TIPO: Record<TipoCita, string> = {
  EVALUACION: "Evaluación",
  SEGUIMIENTO: "Seguimiento",
  NUTRICION: "Nutrición",
  CONSULTA: "Consulta",
};

const MAX_ATENCION = 8; // filas de "Requieren atención" que se muestran

interface ItemAtencion {
  fila: FilaSupervision;
  motivos: MotivoAtencion[];
}

// Día de hoy como DiaSemana: getDay() da 0 = domingo, y DIAS_ORDEN empieza en lunes
function diaDeHoy() {
  return DIAS_ORDEN[(new Date().getDay() + 6) % 7];
}

function horaActual(): string {
  const d = new Date();
  return String(d.getHours()).padStart(2, "0") + ":" + String(d.getMinutes()).padStart(2, "0");
}

export function DashboardInstructor() {
  const { ruta } = useTenant();
  const [sesion] = useState(current());
  const [cargando, setCargando] = useState(true);
  const [yo, setYo] = useState<Instructor | null>(null);
  const [clientes, setClientes] = useState<Cliente[]>([]);
  const [citas, setCitas] = useState<Cita[]>([]);
  const [filas, setFilas] = useState<FilaSupervision[]>([]);

  useEffect(() => {
    let activo = true; // evita actualizar el estado si el usuario ya salió de la vista
    Promise.all([api.instructores.list(), api.clientes.list(), api.citas.list(), api.rutinas.listaSupervision()])
      .then(([ins, cli, cit, fil]) => {
        if (!activo) return;
        // El instructor en sesión es el que tiene la misma cédula que el usuario
        setYo(ins.find((i) => i.numero_identificacion === sesion?.numero_identificacion) ?? null);
        setClientes(cli);
        setCitas(cit);
        setFilas(fil);
      })
      .finally(() => activo && setCargando(false));
    return () => {
      activo = false;
    };
  }, [sesion]);

  if (cargando) return <div className="card-g empty-state">Cargando…</div>;
  if (!yo)
    return (
      <div className="card-g empty-state">
        <i className="bi bi-person-x" /> Tu cuenta no está vinculada a un instructor de este gimnasio.
      </div>
    );

  const hoy = utils.isoDate();
  const ahora = horaActual();
  const nombreCliente = (id: string) => {
    const c = clientes.find((x) => x.numero_identificacion === id);
    return c ? c.nombre + " " + c.apellidos : id;
  };

  // ---- Citas: solo las mías y no canceladas ----
  const misCitas = citas
    .filter((c) => c.id_instructor === yo.numero_identificacion && c.estado !== "CANCELADA")
    .sort((a, b) => (a.fecha + a.hora).localeCompare(b.fecha + b.hora));
  const citasHoy = misCitas.filter((c) => c.fecha === hoy);
  const proxima = misCitas.find(
    (c) => (c.estado === "PENDIENTE" || c.estado === "CONFIRMADA") && (c.fecha > hoy || (c.fecha === hoy && c.hora >= ahora))
  );

  // ---- Rutinas: las mías ----
  const esActiva = (f: FilaSupervision) => f.estado === "VIGENTE" || f.estado === "POR_VENCER";
  const misFilas = filas.filter((f) => f.rutina.id_instructor === yo.numero_identificacion);
  const activas = misFilas.filter(esActiva);
  const alumnos = new Set(activas.map((f) => f.rutina.id_cliente)).size;
  const cambios = activas.filter((f) => f.cambios_sin_revisar > 0).length;

  // Una vencida solo preocupa si es la última rutina del cliente y no tiene otra vigente (de cualquier instructor)
  const renovada = (f: FilaSupervision) =>
    filas.some(
      (o) =>
        o.rutina.id_cliente === f.rutina.id_cliente &&
        o.rutina.id_rutina !== f.rutina.id_rutina &&
        (esActiva(o) || o.rutina.fecha_creacion > f.rutina.fecha_creacion)
    );
  const atencion: ItemAtencion[] = misFilas
    .map((fila) => ({ fila, motivos: motivosAtencion(fila, renovada(fila)) }))
    .filter((item) => item.motivos.length > 0)
    .sort((a, b) => b.motivos.length - a.motivos.length);

  // ---- Horario de hoy ----
  const intervalos = yo.horario?.[diaDeHoy()] ?? [];
  const textoHorario =
    intervalos.length > 0
      ? "Hoy atiendes " + intervalos.map((i) => i.desde + "–" + i.hasta).join(" · ")
      : "Hoy no tienes horario de atención";
  const fecha = new Date().toLocaleDateString("es-CO", { weekday: "long", day: "numeric", month: "long" });
  const fechaLarga = fecha.charAt(0).toUpperCase() + fecha.slice(1); // "Viernes, 23 de octubre"

  return (
    <div className="d-flex flex-column gap-3">
      <div className="card-g">
        <h2 className="card-title">Hola, {yo.nombre}</h2>
        <p className="card-sub">
          {fechaLarga} · <i className="bi bi-clock" /> {textoHorario}
        </p>
      </div>

      {/* Indicadores */}
      <div className="row g-3">
        <Indicador etiqueta="Citas hoy" valor={citasHoy.length} detalle={proxima ? "Próxima: " + (proxima.fecha === hoy ? "hoy" : utils.fecha(proxima.fecha)) + " " + proxima.hora : "Sin citas próximas"} />
        <Indicador etiqueta="Alumnos activos" valor={alumnos} detalle={activas.length + " rutinas vigentes"} />
        <Indicador etiqueta="Cambios por revisar" valor={cambios} detalle="Ejercicios cambiados por el cliente" alerta={cambios > 0} />
        <Indicador etiqueta="Requieren atención" valor={atencion.length} detalle="Atrasadas, por vencer o vencidas" alerta={atencion.length > 0} />
      </div>

      <div className="row g-3">
        {/* Agenda de hoy */}
        <div className="col-lg-5">
          <div className="card-g h-100">
            <div className="card-head">
              <div>
                <h2 className="card-title">Agenda de hoy</h2>
                <p className="card-sub">Tus citas de hoy (sin las canceladas)</p>
              </div>
              <Link to={ruta("/citas")} className="inst-link">Ver citas</Link>
            </div>
            {citasHoy.length === 0 ? (
              <p className="inst-auto-vacio">
                No tienes citas hoy.
                {proxima && <> La próxima es el {utils.fecha(proxima.fecha)} a las {proxima.hora} con {nombreCliente(proxima.id_cliente)}.</>}
              </p>
            ) : (
              <div className="inst-agenda">
                {citasHoy.map((c) => (
                  <div className={"inst-agenda-fila" + (c === proxima ? " proxima" : "")} key={c.id_cita}>
                    <span className="inst-agenda-hora">{c.hora}</span>
                    <div className="inst-agenda-info">
                      <strong>{nombreCliente(c.id_cliente)}</strong>
                      <span className="card-sub">{NOMBRE_TIPO[c.tipo_cita]}{c.notas ? " · " + c.notas : ""}</span>
                    </div>
                    <span className={"badge-g badge-" + c.estado.toLowerCase()}>{c.estado.toLowerCase()}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Rutinas que requieren atención */}
        <div className="col-lg-7">
          <div className="card-g h-100">
            <div className="card-head">
              <div>
                <h2 className="card-title">Requieren atención</h2>
                <p className="card-sub">Rutinas tuyas con cambios del cliente, atrasadas, por vencer o vencidas</p>
              </div>
              <Link to={ruta("/rutinas")} className="inst-link">Ver rutinas</Link>
            </div>
            {atencion.length === 0 ? (
              <p className="inst-auto-vacio"><i className="bi bi-check2-circle" /> Todo al día.</p>
            ) : (
              <div className="inst-agenda">
                {atencion.slice(0, MAX_ATENCION).map(({ fila, motivos }) => (
                  <Link to={ruta("/rutinas/" + fila.rutina.id_rutina)} className="inst-agenda-fila inst-fila-link" key={fila.rutina.id_rutina}>
                    <div className="inst-agenda-info">
                      <strong>{nombreCliente(fila.rutina.id_cliente)}</strong>
                      <span className="card-sub">
                        {fila.rutina.nombre} · {fila.avance.completadas} de {fila.avance.planeadas} sesiones
                      </span>
                    </div>
                    <div className="inst-motivos">
                      {motivos.map((m) => (
                        <span className="inst-chip" key={m}>
                          <i className={"bi " + MOTIVO_ATENCION[m].icono} /> {MOTIVO_ATENCION[m].texto}
                        </span>
                      ))}
                    </div>
                  </Link>
                ))}
                {atencion.length > MAX_ATENCION && (
                  <p className="card-sub">Y {atencion.length - MAX_ATENCION} más en Rutinas.</p>
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Accesos rápidos */}
      <div className="row g-3">
        <Acceso to={ruta("/alumnos")} icono="bi-people" titulo="Mis alumnos" desc="Clientes con rutina tuya" />
        <Acceso to={ruta("/citas")} icono="bi-calendar-check" titulo="Citas" desc="Agenda y estados" />
        <Acceso to={ruta("/ejercicios")} icono="bi-lightning-charge-fill" titulo="Ejercicios" desc="Catálogo del gimnasio" />
      </div>
    </div>
  );
}

function Indicador({ etiqueta, valor, detalle, alerta = false }: { etiqueta: string; valor: number; detalle: string; alerta?: boolean }) {
  return (
    <div className="col-6 col-xl-3">
      <div className={"card-g kpi h-100" + (alerta ? " inst-kpi-alerta" : "")}>
        <span className="kpi-label">{etiqueta}</span>
        <span className="kpi-value">{utils.num(valor)}</span>
        <span className="kpi-sub">{detalle}</span>
      </div>
    </div>
  );
}

function Acceso({ to, icono, titulo, desc }: { to: string; icono: string; titulo: string; desc: string }) {
  return (
    <div className="col-md-4">
      <Link to={to} className="card-g quick-action h-100">
        <span className="qa-badge neon"><i className={"bi " + icono} /></span>
        <div>
          <div className="qa-title">{titulo}</div>
          <div className="qa-desc">{desc}</div>
        </div>
      </Link>
    </div>
  );
}
