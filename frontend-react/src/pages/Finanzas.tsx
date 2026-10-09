import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Modal } from "react-bootstrap";
import { Bar, Doughnut } from "react-chartjs-2";
import {
  ArcElement,
  BarElement,
  CategoryScale,
  Chart as ChartJS,
  Legend,
  LinearScale,
  Tooltip,
} from "chart.js";
import type { ChartData, ChartOptions } from "chart.js";
import { api } from "../data/api";
import type { NuevoPago } from "../data/api";
import { utils } from "../lib/utils";
import { membresiaVigente } from "../lib/membresias";
import { useVersionDeDatos } from "../lib/datos";
import { META_INGRESOS_MENSUAL, porcentaje } from "../lib/config";
import type { Cliente, Membresia, Pago, PlanMembresia } from "../types";

ChartJS.register(CategoryScale, LinearScale, BarElement, ArcElement, Tooltip, Legend);

type IngresoMes = { mes: string; total: number };
type IngresoPlan = { plan: string; total: number };
type MetodoPago = { metodo: string; total: number; cantidad: number };
type NuevosClientes = { mes: string; cantidad: number };
type Vencido = {
  id_pago: number;
  cliente: string;
  plan: string;
  valor: number;
  metodo: string;
  fecha: string;
  estado: string;
};

const NOMBRES_CORTOS: Record<string, string> = {
  ENERO: "Ene", FEBRERO: "Feb", MARZO: "Mar", ABRIL: "Abr", MAYO: "May", JUNIO: "Jun",
  JULIO: "Jul", AGOSTO: "Ago", SEPTIEMBRE: "Sep", OCTUBRE: "Oct", NOVIEMBRE: "Nov",
  DICIEMBRE: "Dic",
};

const PALETA = ["#c6ff00", "#00d9c0", "#ff8a3d", "#4d9fff", "#c06cff", "#ff5d73"];

function etiquetaMes(mes: string): string {
  const [anio, m] = mes.split("-");
  const nombre = new Date(Number(anio), Number(m) - 1, 1)
    .toLocaleDateString("es-CO", { month: "short" })
    .replace(".", "")
    .toUpperCase();
  return NOMBRES_CORTOS[nombre] ?? nombre;
}

const OPCIONES_EJE: ChartOptions<"bar"> = {
  responsive: true,
  maintainAspectRatio: false,
  plugins: { legend: { display: false } },
  scales: {
    x: { ticks: { color: "#8a8f98", font: { size: 10 } }, grid: { display: false } },
    y: {
      beginAtZero: true,
      ticks: { color: "#8a8f98", font: { size: 10 }, callback: (v) => "$" + Number(v) / 1000 + "k" },
      grid: { color: "rgba(255,255,255,.06)" },
    },
  },
};

function Kpis({
  ingresosMes,
  ingresosHoy,
  membresiasVigentes,
  pendientes,
  meta,
}: {
  ingresosMes: number;
  ingresosHoy: number;
  membresiasVigentes: number;
  pendientes: number;
  meta: number;
}) {
  const avance = porcentaje(meta, ingresosMes);

  return (
    <div className="row g-3">
      <div className="col-md-6 col-xl-3">
        <div className="card-g kpi h-100">
          <span className="kpi-label">Ingresos del mes</span>
          <span className="kpi-value money neon">{utils.money(ingresosMes)}</span>
          <span className="kpi-sub">Meta {utils.money(meta)} · {avance}%</span>
          <div className="kpi-bar">
            <span style={{ width: `${avance}%` }}></span>
          </div>
        </div>
      </div>

      <div className="col-md-6 col-xl-3">
        <div className="card-g kpi h-100">
          <span className="kpi-label">Recaudado hoy</span>
          <span className="kpi-value money">{utils.money(ingresosHoy)}</span>
          <span className="kpi-sub">Pagos exitosos de hoy</span>
        </div>
      </div>

      <div className="col-md-6 col-xl-3">
        <div className="card-g kpi h-100">
          <span className="kpi-label">Membresías vigentes</span>
          <span className="kpi-value">{utils.num(membresiasVigentes)}</span>
          <span className="kpi-sub">
            <Link to="/clientes" style={{ color: "inherit" }}>Ver clientes</Link>
          </span>
        </div>
      </div>

      <div className="col-md-6 col-xl-3">
        <div className="card-g kpi kpi-accent h-100">
          <span className="kpi-label">
            <span className="live-dot"></span>
            Pagos pendientes
          </span>
          <span className="kpi-value">{utils.num(pendientes)}</span>
          <span className="kpi-sub">Sin aplicar o con membresía vencida</span>
        </div>
      </div>
    </div>
  );
}

function GraficaIngresos({ datos }: { datos: IngresoMes[] }) {
  const config: ChartData<"bar"> = {
    labels: datos.map((d) => etiquetaMes(d.mes)),
    datasets: [
      {
        data: datos.map((d) => d.total),
        backgroundColor: datos.map((_, i) => (i === datos.length - 1 ? "#c6ff00" : "rgba(198,255,0,.35)")),
        borderRadius: 3,
      },
    ],
  };

  return (
    <div className="card-g h-100">
      <div className="card-head">
        <div>
          <h2 className="card-title">Ingresos por mes</h2>
          <p className="card-sub">Solo pagos exitosos · ultimos 12 meses</p>
        </div>
      </div>
      <div style={{ height: 240 }}>
        <Bar data={config} options={OPCIONES_EJE} />
      </div>
    </div>
  );
}

function GraficaMetodo({ datos }: { datos: MetodoPago[] }) {
  const total = datos.reduce((acc, d) => acc + d.total, 0);

  const config: ChartData<"doughnut"> = {
    labels: datos.map((d) => d.metodo),
    datasets: [
      {
        data: datos.map((d) => d.total),
        backgroundColor: datos.map((_, i) => PALETA[i % PALETA.length]),
        borderColor: "#12141a",
        borderWidth: 2,
      },
    ],
  };

  return (
    <div className="card-g h-100">
      <div className="card-head">
        <div>
          <h2 className="card-title">Método de pago</h2>
          <p className="card-sub">Distribución de lo cobrado</p>
        </div>
      </div>
      <div className="d-flex flex-column flex-lg-row align-items-center gap-4 mt-2">
        <div style={{ height: 200, width: 200, flexShrink: 0 }}>
          <Doughnut data={config} options={{ responsive: true, maintainAspectRatio: false, plugins: { legend: { display: false } } }} />
        </div>
        <div className="d-flex flex-column gap-2 flex-grow-1 w-100">
          {datos.map((d, i) => (
            <div className="d-flex align-items-center gap-2" key={d.metodo}>
              <span
                style={{
                  width: 10,
                  height: 10,
                  borderRadius: 2,
                  background: PALETA[i % PALETA.length],
                  flexShrink: 0,
                }}
              ></span>
              <span style={{ fontSize: 13 }} className="flex-grow-1">
                {d.metodo}
              </span>
              <span style={{ fontSize: 13, color: "var(--muted)" }}>{d.cantidad}</span>
              <span style={{ fontSize: 13, fontWeight: 700 }}>
                {total ? Math.round((d.total / total) * 100) : 0}%
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function IngresosPorPlan({ datos }: { datos: IngresoPlan[] }) {
  const maximo = Math.max(...datos.map((d) => d.total), 1);

  return (
    <div className="card-g h-100">
      <div className="card-head">
        <div>
          <h2 className="card-title">Ingresos por plan</h2>
          <p className="card-sub">Histórico por tipo de membresía</p>
        </div>
      </div>
      <div className="demo-list mt-3">
        {datos.map((d, i) => (
          <div key={d.plan}>
            <div className="d-flex justify-content-between mb-1">
              <span style={{ fontSize: 13 }}>{d.plan}</span>
              <span style={{ fontSize: 13, fontWeight: 700 }}>{utils.money(d.total)}</span>
            </div>
            <div className="kpi-bar">
              <span
                style={{
                  width: `${Math.round((d.total / maximo) * 100)}%`,
                  background: PALETA[i % PALETA.length],
                }}
              ></span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function NuevosClientes({ datos }: { datos: NuevosClientes[] }) {
  const config: ChartData<"bar"> = {
    labels: datos.map((d) => etiquetaMes(d.mes)),
    datasets: [{ data: datos.map((d) => d.cantidad), backgroundColor: "#00d9c0", borderRadius: 3 }],
  };

  const opciones: ChartOptions<"bar"> = {
    ...OPCIONES_EJE,
    scales: {
      x: { ticks: { color: "#8a8f98", font: { size: 10 } }, grid: { display: false } },
      y: {
        beginAtZero: true,
        ticks: { color: "#8a8f98", font: { size: 10 }, precision: 0 },
        grid: { color: "rgba(255,255,255,.06)" },
      },
    },
  };

  return (
    <div className="card-g h-100">
      <div className="card-head">
        <div>
          <h2 className="card-title">Nuevos clientes</h2>
          <p className="card-sub">Altas por mes de registro</p>
        </div>
      </div>
      <div style={{ height: 200 }}>
        <Bar data={config} options={opciones} />
      </div>
    </div>
  );
}

function PagosPendientes({ datos }: { datos: Vencido[] }) {
  return (
    <div className="card-g h-100">
      <div className="card-head">
        <div>
          <h2 className="card-title">Pagos por aplicar</h2>
          <p className="card-sub">Pendientes o con membresía vencida</p>
        </div>
      </div>
      {datos.length === 0 ? (
        <p className="card-sub mt-3 mb-0">No hay pagos pendientes. Todo está al día.</p>
      ) : (
        <div className="table-responsive">
          <table className="table-g">
            <thead>
              <tr>
                <th>Cliente</th>
                <th>Plan</th>
                <th>Monto</th>
                <th>Método</th>
                <th>Fecha</th>
                <th>Estado</th>
              </tr>
            </thead>
            <tbody>
              {datos.map((d) => (
                <tr key={d.id_pago}>
                  <td>{d.cliente}</td>
                  <td>{d.plan}</td>
                  <td>{utils.money(d.valor)}</td>
                  <td>{d.metodo}</td>
                  <td>{utils.fecha(d.fecha)}</td>
                  <td>
                    <span className={"badge-g " + utils.badgeClass(d.estado)}>{d.estado}</span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

function HistorialPagos({
  pagos,
  clientes,
  filtro,
  setFiltro,
}: {
  pagos: Pago[];
  clientes: Cliente[];
  filtro: string;
  setFiltro: (v: string) => void;
}) {
  const nombres = new Map(clientes.map((c) => [c.numero_identificacion, c.nombre + " " + c.apellidos]));
  const texto = filtro.trim().toLowerCase();

  const visibles = pagos
    .filter((p) => {
      if (!texto) return true;
      return (
        (nombres.get(p.id_cliente) ?? "").toLowerCase().includes(texto) ||
        p.metodo_pago.toLowerCase().includes(texto) ||
        p.referencia_transaccion.toLowerCase().includes(texto) ||
        p.estado_pago.toLowerCase().includes(texto)
      );
    })
    .sort((a, b) => (a.fecha_pago < b.fecha_pago ? 1 : -1));

  return (
    <div className="card-g">
      <div className="card-head">
        <div>
          <h2 className="card-title">Historial de pagos</h2>
          <p className="card-sub">{utils.num(visibles.length)} de {utils.num(pagos.length)} movimientos</p>
        </div>
        <input
          className="form-control-dark"
          style={{ maxWidth: 260 }}
          placeholder="Buscar cliente, método o referencia"
          value={filtro}
          onChange={(e) => setFiltro(e.target.value)}
        />
      </div>
      <div className="table-responsive">
        <table className="table-g">
          <thead>
            <tr>
              <th>Cliente</th>
              <th>Fecha</th>
              <th>Monto</th>
              <th>Método</th>
              <th>Referencia</th>
              <th>Estado</th>
            </tr>
          </thead>
          <tbody>
            {visibles.map((p) => (
              <tr key={p.id_pago}>
                <td>{nombres.get(p.id_cliente) ?? p.id_cliente}</td>
                <td>{utils.fecha(p.fecha_pago)}</td>
                <td>{utils.money(p.valor)}</td>
                <td>{p.metodo_pago}</td>
                <td style={{ color: "var(--muted)" }}>{p.referencia_transaccion || "—"}</td>
                <td>
                  <span className={"badge-g " + utils.badgeClass(p.estado_pago)}>{p.estado_pago}</span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

const METODOS: Pago["metodo_pago"][] = ["EFECTIVO", "TRANSFERENCIA", "TARJETA", "NEQUI"];
const MODALIDADES: Membresia["modalidad_pago"][] = ["MENSUAL", "SEMESTRAL", "ANUAL"];

function precioDe(plan: PlanMembresia, modalidad: Membresia["modalidad_pago"]): number {
  if (modalidad === "SEMESTRAL") return plan.precio_semestral;
  if (modalidad === "ANUAL") return plan.precio_anual;
  return plan.precio_mensual;
}

function ModalPago({
  show,
  planes,
  clientes,
  membresias,
  bloqueado,
  alCerrar,
  alGuardar,
}: {
  show: boolean;
  planes: PlanMembresia[];
  clientes: Cliente[];
  membresias: Membresia[];
  bloqueado: boolean;
  alCerrar: () => void;
  alGuardar: (p: NuevoPago) => void;
}) {
  const [busqueda, setBusqueda] = useState("");
  const [idCliente, setIdCliente] = useState("");
  const [idPlan, setIdPlan] = useState<number | null>(null);
  const [modalidad, setModalidad] = useState<Membresia["modalidad_pago"]>("MENSUAL");
  const [montoEditado, setMontoEditado] = useState<string | null>(null);
  const [metodo, setMetodo] = useState<Pago["metodo_pago"] | "">("");
  const [referencia, setReferencia] = useState("");

  const hoy = utils.isoDate();

  // Membresia vigente del cliente elegido. Si existe, el cobro es una
  // renovacion: el plan y la modalidad vienen dados y no se pueden cambiar aqui.
  const vigente =
    membresias.find(
      (m) => m.id_cliente === idCliente && m.estado === "ACTIVA" && m.fecha_vencimiento >= hoy,
    ) ?? null;
  const tieneVigente = vigente !== null;

  const plan = planes.find((p) => p.id_plan === idPlan) ?? null;

  // El monto se deriva SIEMPRE del plan y la modalidad chosen, nunca del valor
  // guardado en la membresia anterior: ese valor pudo traer descuento de una
  // renovacion pasada y aqui el precio de lista es el vigente. Sigue siendo
  // editable para descuentos y pagos parciales.
  const monto = montoEditado ?? (plan ? String(precioDe(plan, modalidad)) : "");
  const precioLista = plan ? precioDe(plan, modalidad) : 0;
  const montoDistinto = plan !== null && Number(monto) !== precioLista;

  // Al elegir cliente se auto-completan plan, modalidad y monto. Si ya tiene
  // membresia vigente, quedan bloqueados con los datos de esa membresia; si no
  // tiene ninguna, quedan libres para elegir.
  function elegirCliente(id: string): void {
    setIdCliente(id);
    setMontoEditado(null);
    const actual = membresias.find(
      (m) => m.id_cliente === id && m.estado === "ACTIVA" && m.fecha_vencimiento >= hoy,
    );
    if (actual) {
      setIdPlan(actual.id_plan);
      setModalidad(actual.modalidad_pago);
    } else {
      setIdPlan(null);
      setModalidad("MENSUAL");
    }
  }

  const texto = busqueda.trim().toLowerCase();
  const candidatos = clientes
    .filter((c) => c.estado === "ACTIVO")
    .filter((c) => !texto || (c.nombre + " " + c.apellidos + " " + c.numero_identificacion).toLowerCase().includes(texto))
    .slice(0, 8);

  return (
    <Modal show={show} onHide={alCerrar} centered size="lg">
      <Modal.Header closeButton>
        <Modal.Title>Registrar pago</Modal.Title>
      </Modal.Header>
      <Modal.Body>
        <label className="form-label-g">Cliente</label>
        <input
          className="form-control-dark"
          style={{ marginBottom: 8 }}
          placeholder="Buscar por nombre o identificación"
          value={busqueda}
          onChange={(e) => setBusqueda(e.target.value)}
        />
        <div className="table-wrap" style={{ maxHeight: 180, overflowY: "auto", marginBottom: 16 }}>
          <table className="table-g">
            <tbody>
              {candidatos.map((c) => (
                <tr
                  key={c.numero_identificacion}
                  onClick={() => elegirCliente(c.numero_identificacion)}
                  style={{ cursor: "pointer", background: idCliente === c.numero_identificacion ? "rgba(198,255,0,.08)" : undefined }}
                >
                  <td>{c.nombre} {c.apellidos}</td>
                  <td style={{ color: "var(--muted)" }}>{c.numero_identificacion}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {tieneVigente && vigente && (
          <div className="alert-g alert-ok show" style={{ marginBottom: 16 }}>
            <strong>Renovacion de membresia vigente.</strong> {vigente.tipo_membresia} ·{" "}
            {vigente.modalidad_pago} ·{" "}
            {utils.money(plan ? precioDe(plan, vigente.modalidad_pago) : vigente.valor)} · vence
            el {utils.fecha(vigente.fecha_vencimiento)}.
            <br />
            Plan y modalidad estan bloqueados. Para cambiar alguno, cancela primero la membresia
            vigente en el apartado de Clientes.
          </div>
        )}

        <div className="row g-3">
          <div className="col-md-7">
            <label className="form-label-g">Plan</label>
            <select
              className="form-control-dark"
              disabled={tieneVigente}
              value={idPlan ?? ""}
              onChange={(e) => {
                setIdPlan(e.target.value ? Number(e.target.value) : null);
                setMontoEditado(null);   // al cambiar de plan vuelve el precio de lista
              }}
            >
              <option value="">Selecciona un plan</option>
              {planes.map((p) => (
                <option key={p.id_plan} value={p.id_plan}>{p.nombre}</option>
              ))}
            </select>
          </div>
          <div className="col-md-5">
            <label className="form-label-g">Modalidad</label>
            <select
              className="form-control-dark"
              disabled={tieneVigente}
              value={modalidad}
              onChange={(e) => {
                setModalidad(e.target.value as Membresia["modalidad_pago"]);
                setMontoEditado(null);
              }}
            >
              {MODALIDADES.map((m) => (
                <option key={m} value={m}>{m}</option>
              ))}
            </select>
          </div>
          <div className="col-md-6">
            <label className="form-label-g">Monto</label>
            <input
              className="form-control-dark"
              type="number"
              min={1}
              value={monto}
              onChange={(e) => setMontoEditado(e.target.value)}
            />
            {montoDistinto && (
              <span className="card-sub" style={{ display: "block", marginTop: 4 }}>
                Precio de lista {utils.money(precioLista)}. Editable por descuento o pago parcial.
              </span>
            )}
          </div>
          <div className="col-md-6">
            <label className="form-label-g">Metodo de pago</label>
            <select className="form-control-dark" value={metodo} onChange={(e) => setMetodo(e.target.value as Pago["metodo_pago"])}>
              <option value="">Selecciona</option>
              {METODOS.map((m) => (
                <option key={m} value={m}>{m}</option>
              ))}
            </select>
          </div>
          <div className="col-md-12">
            <label className="form-label-g">Referencia de transaccion</label>
            <input
              className="form-control-dark"
              placeholder="Opcional, pero evita cobros duplicados si la escribes"
              value={referencia}
              onChange={(e) => setReferencia(e.target.value)}
            />
          </div>
        </div>
      </Modal.Body>
      <Modal.Footer>
        <button className="btn-dark" onClick={alCerrar} disabled={bloqueado}>Cancelar</button>
        <button
          className="btn-neon"
          disabled={bloqueado || !idCliente || !plan || !metodo}
          style={{ opacity: bloqueado || !idCliente || !plan || !metodo ? .5 : 1 }}
          onClick={() =>
            alGuardar({
              id_cliente: idCliente,
              id_plan: idPlan,
              modalidad_pago: modalidad,
              valor: Number(monto),
              metodo_pago: metodo,
              fecha_pago: utils.isoDate(),
              referencia_transaccion: referencia,
              observaciones: "",
            })
          }
        >
          Procesar
        </button>
      </Modal.Footer>
    </Modal>
  );
}

export function Finanzas() {
  const [cargando, setCargando] = useState(true);
  const [porMes, setPorMes] = useState<IngresoMes[]>([]);
  const [porPlan, setPorPlan] = useState<IngresoPlan[]>([]);
  const [metodos, setMetodos] = useState<MetodoPago[]>([]);
  const [altas, setAltas] = useState<NuevosClientes[]>([]);
  const [pendientes, setPendientes] = useState<Vencido[]>([]);
  const [pagos, setPagos] = useState<Pago[]>([]);
  const [clientes, setClientes] = useState<Cliente[]>([]);
  const [planes, setPlanes] = useState<PlanMembresia[]>([]);
  const [membresias, setMembresias] = useState<Membresia[]>([]);
  const [filtro, setFiltro] = useState("");

  const [showPago, setShowPago] = useState(false);
  const [guardando, setGuardando] = useState(false);
  const [error, setError] = useState("");

  // "Membresías vigentes" cuenta lo mismo que el control de acceso: si la
  // puerta deja de contar a alguien, esta tarjeta tiene que enterarse sin que
  // nadie recargue la pantalla.
  const version = useVersionDeDatos();

  async function cargar() {
    const [m, p, me, n, v, pg, cl, pl, mb] = await Promise.all([
      api.finanzas.ingresosPorMes(12),
      api.finanzas.ingresosPorPlan(),
      api.finanzas.porMetodoPago(),
      api.finanzas.nuevosClientes(12),
      api.finanzas.pagosVencidos(),
      api.pagos.list(),
      api.clientes.list(),
      api.planes.list(),
      api.membresias.list(),
    ]);
    setPorMes(m);
    setPorPlan(p);
    setMetodos(me);
    setAltas(n);
    setPendientes(v);
    setPagos(pg);
    setClientes(cl);
    setPlanes(pl);
    setMembresias(mb);
  }

  useEffect(() => {
    // Carga inicial en linea, igual que Dashboard. La regla de lint del
    // proyecto marca como setState en efecto cualquier llamada a una funcion
    // que la contenga, asi que no se puede delegar en cargar().
    Promise.all([
      api.finanzas.ingresosPorMes(12),
      api.finanzas.ingresosPorPlan(),
      api.finanzas.porMetodoPago(),
      api.finanzas.nuevosClientes(12),
      api.finanzas.pagosVencidos(),
      api.pagos.list(),
      api.clientes.list(),
      api.planes.list(),
      api.membresias.list(),
    ])
      .then(([m, p, me, n, v, pg, cl, pl, mb]) => {
        setPorMes(m);
        setPorPlan(p);
        setMetodos(me);
        setAltas(n);
        setPendientes(v);
        setPagos(pg);
        setClientes(cl);
        setPlanes(pl);
        setMembresias(mb);
      })
      .finally(() => setCargando(false));
  }, [version]);

  async function registrarPago(input: NuevoPago) {
    // El boton se bloquea mientras corre la peticion. Sin esto, dos clics
    // seguidos generan dos membresias: la comprobacion por referencia del
    // commit anterior solo salva si el usuario escribio una.
    setGuardando(true);
    setError("");
    try {
      const resp = await api.pagos.crear(input);
      if (!resp.ok) {
        setError(resp.mensaje);
        return;
      }
      setShowPago(false);
      await cargar();
    } finally {
      setGuardando(false);
    }
  }

  const hoy = utils.isoDate();
  const ingresosMes = porMes.length ? porMes[porMes.length - 1].total : 0;
  const ingresosHoy = pagos
    .filter((p) => p.estado_pago === "EXITOSO" && p.fecha_pago === hoy)
    .reduce((acc, p) => acc + p.valor, 0);
  // La regla de vigencia vive en lib/membresias.ts y es la misma que aplica
  // el control de acceso al dejar entrar: si esta tarjeta cuenta a alguien,
  // la puerta lo deja pasar, y al reves.
  const porId = new Map(clientes.map((c) => [c.numero_identificacion, c]));
  const membresiasVigentes = membresias.filter((m) =>
    membresiaVigente(m, hoy, porId.get(m.id_cliente)),
  ).length;

  if (cargando) {
    return (
      <div className="card-g">
        <div className="loader">
          <span className="spinner-g"></span>Cargando...
        </div>
      </div>
    );
  }

  return (
    <div className="d-flex flex-column gap-3">
      {error && <div className="alert-g alert-error show">{error}</div>}

      <div className="card-g">
        <div className="card-head">
          <div>
            <h2 className="card-title">Finanzas</h2>
            <p className="card-sub">Recaudo, distribucion por plan y pagos por aplicar</p>
          </div>
          <button className="btn-neon" onClick={() => { setError(""); setShowPago(true); }}>
            Registrar pago
          </button>
        </div>
      </div>

      <Kpis
        ingresosMes={ingresosMes}
        ingresosHoy={ingresosHoy}
        membresiasVigentes={membresiasVigentes}
        pendientes={pendientes.length}
        meta={META_INGRESOS_MENSUAL}
      />

      <div className="row g-3">
        <div className="col-lg-8">
          <GraficaIngresos datos={porMes} />
        </div>
        <div className="col-lg-4">
          <GraficaMetodo datos={metodos} />
        </div>
      </div>

      <div className="row g-3">
        <div className="col-lg-4">
          <IngresosPorPlan datos={porPlan} />
        </div>
        <div className="col-lg-8">
          <NuevosClientes datos={altas} />
        </div>
      </div>

      <PagosPendientes datos={pendientes} />

      <HistorialPagos pagos={pagos} clientes={clientes} filtro={filtro} setFiltro={setFiltro} />

      <ModalPago
        show={showPago}
        planes={planes}
        clientes={clientes}
        membresias={membresias}
        bloqueado={guardando}
        alCerrar={() => !guardando && setShowPago(false)}
        alGuardar={registrarPago}
      />
    </div>
  );
}