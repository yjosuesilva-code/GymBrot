import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
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
import { utils } from "../lib/utils";
import type { Cliente, Pago } from "../types";

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
  miembrosActivos,
  pendientes,
  meta,
}: {
  ingresosMes: number;
  ingresosHoy: number;
  miembrosActivos: number;
  pendientes: number;
  meta: number;
}) {
  const avance = Math.min(100, Math.round((ingresosMes / meta) * 100));

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
          <span className="kpi-label">Membresías activas</span>
          <span className="kpi-value">{utils.num(miembrosActivos)}</span>
          <span className="kpi-sub">
            <Link to="/clientes" style={{ color: "inherit" }}>Ver socios</Link>
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

function NuevosSocios({ datos }: { datos: NuevosClientes[] }) {
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
          <h2 className="card-title">Nuevos socios</h2>
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
                <th>Socio</th>
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
          placeholder="Buscar socio, método o referencia"
          value={filtro}
          onChange={(e) => setFiltro(e.target.value)}
        />
      </div>
      <div className="table-responsive">
        <table className="table-g">
          <thead>
            <tr>
              <th>Socio</th>
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

const META_MENSUAL = 4500000;

export function Finanzas() {
  const [cargando, setCargando] = useState(true);
  const [porMes, setPorMes] = useState<IngresoMes[]>([]);
  const [porPlan, setPorPlan] = useState<IngresoPlan[]>([]);
  const [metodos, setMetodos] = useState<MetodoPago[]>([]);
  const [altas, setAltas] = useState<NuevosClientes[]>([]);
  const [pendientes, setPendientes] = useState<Vencido[]>([]);
  const [pagos, setPagos] = useState<Pago[]>([]);
  const [clientes, setClientes] = useState<Cliente[]>([]);
  const [membresias, setMembresias] = useState<{ estado: string; fecha_vencimiento: string }[]>([]);
  const [filtro, setFiltro] = useState("");

  useEffect(() => {
    Promise.all([
      api.finanzas.ingresosPorMes(12),
      api.finanzas.ingresosPorPlan(),
      api.finanzas.porMetodoPago(),
      api.finanzas.nuevosClientes(12),
      api.finanzas.pagosVencidos(),
      api.pagos.list(),
      api.clientes.list(),
      api.membresias.list(),
    ])
      .then(([m, p, me, n, v, pg, cl, mb]) => {
        setPorMes(m);
        setPorPlan(p);
        setMetodos(me);
        setAltas(n);
        setPendientes(v);
        setPagos(pg);
        setClientes(cl);
        setMembresias(mb);
      })
      .finally(() => setCargando(false));
  }, []);

  const hoy = utils.isoDate();
  const ingresosMes = porMes.length ? porMes[porMes.length - 1].total : 0;
  const ingresosHoy = pagos
    .filter((p) => p.estado_pago === "EXITOSO" && p.fecha_pago === hoy)
    .reduce((acc, p) => acc + p.valor, 0);
  const miembrosActivos = membresias.filter(
    (m) => m.estado === "ACTIVA" && m.fecha_vencimiento >= hoy,
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
      <Kpis
        ingresosMes={ingresosMes}
        ingresosHoy={ingresosHoy}
        miembrosActivos={miembrosActivos}
        pendientes={pendientes.length}
        meta={META_MENSUAL}
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
          <NuevosSocios datos={altas} />
        </div>
      </div>

      <PagosPendientes datos={pendientes} />

      <HistorialPagos pagos={pagos} clientes={clientes} filtro={filtro} setFiltro={setFiltro} />
    </div>
  );
}
