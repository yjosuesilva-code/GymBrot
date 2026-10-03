import { useEffect, useState } from "react";
import { api } from "../data/api";
import type { Cliente, Ingreso, Pago } from "../types";

import { useEffect, useState } from "react";
import { utils } from "../lib/utils";
import { api } from "../data/api";
import type { Cliente, Ingreso, Pago } from "../types";

const META_INGRESOS_MENSUAL = 15000000;

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
  const miembros = clientes.filter((c) => c.estado === "ACTIVO").length;
  const activosAhora = ingresos.filter((i) => i.hora_salida === null).length;

  const ingresosMes = pagos
    .filter((p) => esDelMesActual(p.fecha_pago))
    .reduce((acc, p) => acc + p.valor, 0);

  const avance = Math.min(100, Math.round((ingresosMes / META_INGRESOS_MENSUAL) * 100));

  return (
    <div className="row g-3">
      <div className="col-md-6 col-xl-4">
        <div className="card-g kpi h-100">
          <span className="kpi-label">Total de miembros</span>
          <span className="kpi-value neon">{utils.num(miembros)}</span>
          <span className="kpi-sub">Clientes en estado activo</span>
          <div className="kpi-bar">
            <span style={{ width: `${avance}%` }}></span>
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
          <span className="kpi-sub">Sin registro de salida</span>
          <div className="kpi-bar">
            <span className="accent" style={{ width: `${avance}%` }}></span>
          </div>
        </div>
      </div>

      <div className="col-md-6 col-xl-4">
        <div className="card-g kpi h-100">
          <span className="kpi-label">Ingresos este mes</span>
          <span className="kpi-value money">{utils.money(ingresosMes)}</span>
          <span className="kpi-sub">
            Meta: {utils.money(META_INGRESOS_MENSUAL)} · {avance}%
          </span>
        </div>
      </div>
    </div>
  );
}

export function Dashboard() {
  const [clientes, setClientes] = useState<Cliente[]>([]);
  const [ingresos, setIngresos] = useState<Ingreso[]>([]);
  const [pagos, setPagos] = useState<Pago[]>([]);
  const [cargando, setCargando] = useState(true);

  useEffect(() => {
    Promise.all([api.clientes.list(), api.ingresos.list(), api.pagos.list()])
      .then(([c, i, p]) => {
        setClientes(c);
        setIngresos(i);
        setPagos(p);
      })
      .finally(() => setCargando(false));
  }, []);

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
      {<Kpis clientes={clientes} ingresos={ingresos} pagos={pagos} />}
    </>
  );
}