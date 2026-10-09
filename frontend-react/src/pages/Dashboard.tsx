import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Bar } from "react-chartjs-2";
import {
  BarElement,
  CategoryScale,
  Chart as ChartJS,
  Legend,
  LinearScale,
  Tooltip,
} from "chart.js";
import type { ChartData, ChartOptions } from "chart.js";
import { utils } from "../lib/utils";
import { META_INGRESOS_MENSUAL, porcentaje } from "../lib/config";
import { useVersionDeDatos } from "../lib/datos";
import { api } from "../data/api";
import type { Cliente, Ingreso, Pago } from "../types";

function esDelMesActual(fechaIso: string): boolean {
  return fechaIso.slice(0, 7) === utils.isoDate().slice(0, 7);
}

function Kpis({
  clientes,
  ingresos,
  pagos,
}: {
  clientes: Cliente[];
  ingresos: Ingreso[];
  pagos: Pago[];
}) {
  const activos = clientes.filter((c) => c.estado === "ACTIVO").length;
  const total = clientes.length;

  const hoy = utils.isoDate();
  const entradasHoy = ingresos.filter((i) => i.fecha === hoy);
  const activosAhora = new Set(
    entradasHoy.filter((i) => i.hora_salida === null).map((i) => i.id_cliente),
  ).size;
  // Un cliente que entro y salio varias veces sigue siendo una sola persona, asi
  // que el denominador tambien es un Set de clientes distintos.
  const clientesConEntradaHoy = new Set(entradasHoy.map((i) => i.id_cliente)).size;

  const ingresosMes = pagos
    .filter((p) => p.estado_pago === "EXITOSO" && esDelMesActual(p.fecha_pago))
    .reduce((acc, p) => acc + p.valor, 0);

  // Cada barra mide lo que su propia tarjeta anuncia. Antes las tres usaban
  // `avance` (ingresos vs meta), asi que "Activos ahora" mostraba el % de la
  // meta de ingresos.
  const pctActivos = porcentaje(total, activos);
  const pctDentro = porcentaje(clientesConEntradaHoy, activosAhora);
  const pctIngresos = porcentaje(META_INGRESOS_MENSUAL, ingresosMes);

  return (
    <div className="row g-3">
      <div className="col-md-6 col-xl-4">
        <div className="card-g kpi h-100">
          <span className="kpi-label">Clientes activos</span>
          <span className="kpi-value neon">{utils.num(activos)}</span>
          <span className="kpi-sub">
            {utils.num(total)} en total · {pctActivos}% del total
          </span>
          <div className="kpi-bar">
            <span style={{ width: `${pctActivos}%` }}></span>
          </div>
        </div>
      </div>

      <div className="col-md-6 col-xl-4">
        <div className="card-g kpi kpi-accent h-100">
          <span className="kpi-label">
            <span className="live-dot"></span>
            Activos ahora
          </span>
          <span className="kpi-value">{utils.num(activosAhora)}</span>
          <span className="kpi-sub">
            Sin registro de salida de hoy · {pctDentro}% de los que entraron
          </span>
          <div className="kpi-bar">
            <span className="accent" style={{ width: `${pctDentro}%` }}></span>
          </div>
        </div>
      </div>

      <div className="col-md-6 col-xl-4">
        <div className="card-g kpi h-100">
          <span className="kpi-label">Ingresos este mes</span>
          <span className="kpi-value money">{utils.money(ingresosMes)}</span>
          <span className="kpi-sub">
            Meta: {utils.money(META_INGRESOS_MENSUAL)} · {pctIngresos}%
          </span>
          <div className="kpi-bar">
            <span style={{ width: `${pctIngresos}%` }}></span>
          </div>
        </div>
      </div>
    </div>
  );
}

ChartJS.register(CategoryScale, LinearScale, BarElement, Tooltip, Legend);

const HORA_INICIO = 6;
const HORA_FIN = 21;

type Rango = "diario" | "semanal";

function horasDelDia(): string[] {
  const horas: string[] = [];
  for (let h = HORA_INICIO; h <= HORA_FIN; h++) {
    horas.push(String(h).padStart(2, "0"));
  }
  return horas;
}

function ultimosDias(cantidad: number): string[] {
  const hoy = new Date();
  const dias: string[] = [];
  for (let i = cantidad - 1; i >= 0; i--) {
    const d = new Date(hoy);
    d.setDate(hoy.getDate() - i);
    dias.push(utils.isoDate(d));
  }
  return dias;
}

function etiquetaDia(iso: string): string {
  return new Date(iso + "T12:00:00")
    .toLocaleDateString("es-CO", { weekday: "short" })
    .toUpperCase();
}

function GraficaAsistencia({ ingresos }: { ingresos: Ingreso[] }) {
  const [rango, setRango] = useState<Rango>("semanal");

  const conteo = new Map<string, number>();

  if (rango === "semanal") {
    ultimosDias(7).forEach((iso) => conteo.set(iso, 0));
    ingresos.forEach((i) => {
      if (conteo.has(i.fecha)) conteo.set(i.fecha, (conteo.get(i.fecha) ?? 0) + 1);
    });
  } else {
    const hoy = utils.isoDate();
    horasDelDia().forEach((h) => conteo.set(h, 0));
    ingresos
      .filter((i) => i.fecha === hoy)
      .forEach((i) => {
        const h = i.hora_entrada.slice(11, 13);
        if (conteo.has(h)) conteo.set(h, (conteo.get(h) ?? 0) + 1);
      });
  }

  const claves = Array.from(conteo.keys());
  const valores = Array.from(conteo.values());
  const maximo = Math.max(...valores);

  const data: ChartData<"bar"> = {
    labels: rango === "semanal" ? claves.map(etiquetaDia) : claves,
    datasets: [
      {
        label: "Entradas",
        data: valores,
        backgroundColor: valores.map((v) => (maximo > 0 && v === maximo ? "#D4FF00" : "#2a4a50")),
        borderRadius: 2,
        maxBarThickness: 8,
      },
    ],
  };

  const options: ChartOptions<"bar"> = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: { legend: { display: false } },
    scales: {
      x: { grid: { display: false }, ticks: { color: "#6b7280", precision: 0 } },
      y: {
        beginAtZero: true,
        grid: { color: "#1f2125" },
        ticks: { color: "#6b7280", precision: 0 },
      },
    },
  };

  return (
    <div className="card-g h-100">
      <div className="card-head">
        <div>
          <h2 className="card-title">Asistencia</h2>
          <p className="card-sub">
            {rango === "semanal" ? "Entradas de los ultimos 7 dias" : "Entradas de hoy, por hora"}
          </p>
        </div>
        <div className="d-flex gap-2">
          <button
            className={rango === "diario" ? "btn-neon" : "btn-dark"}
            onClick={() => setRango("diario")}
          >
            Diario
          </button>
          <button
            className={rango === "semanal" ? "btn-neon" : "btn-dark"}
            onClick={() => setRango("semanal")}
          >
            Semanal
          </button>
        </div>
      </div>
      <div style={{ height: 210 }}>
        <Bar data={data} options={options} />
      </div>
    </div>
  );
}

function Demografia({ clientes }: { clientes: Cliente[] }) {
  const activos = clientes.filter((c) => c.estado === "ACTIVO");

  function contar(min: number, max: number): number {
    return activos.filter((p) => {
      const edad = utils.edad(p.fecha_nacimiento);
      return edad !== null && edad >= min && edad <= max;
    }).length;
  }

  const grupos = [
    { clave: "adulto", nombre: "Adulto", rango: "18 a 50 años", conteo: contar(18, 50) },
    { clave: "menor", nombre: "Menor de edad", rango: "Menores de 18 años", conteo: contar(0, 17) },
    { clave: "senior", nombre: "Senior", rango: "Mayores de 50 años", conteo: contar(51, 200) },
  ];

  // El total sale de la suma de los tres grupos y no del numero de clientes: un
  // cliente sin fecha de nacimiento no cae en ningun rango, y usarlo como
  // denominador haria que los porcentajes no sumen 100%. El legacy tiene el
  // mismo defecto en DashboardService.java:56.
  const total = grupos.reduce((suma, g) => suma + g.conteo, 0) || 1;

  return (
    <div className="card-g h-100 d-flex flex-column">
      <h2 className="card-title">Demografía de clientes</h2>
      <p className="card-sub">Composición por edad de los clientes activos</p>
      <div className="demo-list mt-4">
        {grupos.map((g) => (
          <div className="demo-row" key={g.clave}>
            <div className={"demo-badge demo-" + g.clave}>
              {Math.round((g.conteo / total) * 100)}%
            </div>
            <div className="demo-info">
              <span className="demo-name">
                {g.nombre}
                <span className="demo-count">{g.conteo} clientes</span>
              </span>
              <span className="demo-range">{g.rango}</span>
            </div>
          </div>
        ))}
      </div>
      <div className="mt-auto pt-3">
        <Link to="/clientes" className="btn-neon" style={{ textDecoration: "none" }}>
          Ver registro detallado
        </Link>
      </div>
    </div>
  );
}

function HorasPico({ ingresos }: { ingresos: Ingreso[] }) {
  const conteo = new Map<string, number>();
  horasDelDia().forEach((h) => conteo.set(h, 0));
  ingresos.forEach((i) => {
    const h = i.hora_entrada.slice(11, 13);
    if (conteo.has(h)) conteo.set(h, (conteo.get(h) ?? 0) + 1);
  });

  const valores = Array.from(conteo.values());
  const maximo = Math.max(...valores);
  const umbralAlto = maximo * 0.7;
  const umbralModerado = maximo * 0.35;

  return (
    <div className="card-g">
      <div className="card-head">
        <div>
          <h2 className="card-title">Horas pico de operacion</h2>
          <p className="card-sub">Entradas por hora del dia</p>
        </div>
      </div>
      <div className="pico-wrap">
        {Array.from(conteo.entries()).map(([hora, cantidad]) => {
          const vacio = maximo === 0 || cantidad === 0;
          const altura = vacio ? 4 : Math.max(10, Math.round((cantidad / maximo) * 100));
          const clase = vacio
            ? ""
            : cantidad >= umbralAlto
              ? "alto"
              : cantidad >= umbralModerado
                ? "moderado"
                : "";
          return (
            <div
              key={hora}
              className={"pico-col " + clase}
              style={{ height: altura + "%" }}
              title={hora + ":00 - " + cantidad + " ingresos"}
            ></div>
          );
        })}
      </div>
      <div className="pico-axis">
        <span>06:00</span>
        <span>10:00</span>
        <span>14:00</span>
        <span>18:00</span>
        <span>21:00</span>
      </div>
    </div>
  );
}

function AccionesRapidas() {
  return (
    <div className="row g-3">
      <div className="col-md-6">
        <Link to="/clientes" className="card-g quick-action h-100">
          <span className="qa-badge neon">+</span>
          <div>
            <div className="qa-title">Agregar nuevo cliente</div>
            <div className="qa-desc">Registro rapido de un nuevo atleta</div>
          </div>
        </Link>
      </div>
      <div className="col-md-6">
        <Link to="/finanzas" className="card-g quick-action h-100">
          <span className="qa-badge accent">$</span>
          <div>
            <div className="qa-title">Ver resumen financiero</div>
            <div className="qa-desc">Ingresos por mes y metodos de pago</div>
          </div>
        </Link>
      </div>
    </div>
  );
}

export function Dashboard() {
  const [clientes, setClientes] = useState<Cliente[]>([]);
  const [ingresos, setIngresos] = useState<Ingreso[]>([]);
  const [pagos, setPagos] = useState<Pago[]>([]);
  const [cargando, setCargando] = useState(true);

  // "Activos ahora" depende de los ingresos, y los ingresos los escribe el
  // control de acceso. Sin esto el KPI solo se movia al desmontar y volver a
  // montar la vista, es decir, cuando alguien navegaba hasta aqui.
  const version = useVersionDeDatos();

  useEffect(() => {
    Promise.all([api.clientes.list(), api.ingresos.list(), api.pagos.list()])
      .then(([c, i, p]) => {
        setClientes(c);
        setIngresos(i);
        setPagos(p);
      })
      .finally(() => setCargando(false));
  }, [version]);

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
    <>
      <Kpis clientes={clientes} ingresos={ingresos} pagos={pagos} />

      <div className="row g-3">
        <div className="col-lg-8">
          <GraficaAsistencia ingresos={ingresos} />
        </div>
        <div className="col-lg-4">
          <Demografia clientes={clientes} />
        </div>
      </div>

      <HorasPico ingresos={ingresos} />

      <AccionesRapidas />
    </>
  );
}