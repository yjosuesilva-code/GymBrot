import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { utils } from "../lib/utils";
import { porcentaje } from "../lib/config";
import { useVersionDeDatos } from "../lib/datos";
import {
  apiPlataforma,
  diasParaVencer,
  DIAS_AVISO_VENCIMIENTO,
  type ResumenPlataforma,
} from "../data/apiPlataforma";
import { BadgeEstadoGimnasio, BadgePlan, Suscripcion } from "../components/plataforma/BadgesPlataforma";
import type { Gimnasio, PlanSoftware } from "../types";

/* [plataforma] Inicio del SUPERADMIN: como va la plataforma en un vistazo.
   Solo datos generales de cada gimnasio, sin fichas de personas. */

const MAX_FILAS = 8;

function Kpis({ r }: { r: ResumenPlataforma }) {
  const pctActivos = porcentaje(r.total_gimnasios, r.activos);
  const pctAlerta = porcentaje(r.activos, r.por_vencer + r.vencidas);
  return (
    <div className="row g-3">
      <div className="col-md-6 col-xl-3">
        <div className="card-g kpi h-100">
          <span className="kpi-label">Gimnasios activos</span>
          <span className="kpi-value neon">{utils.num(r.activos)}</span>
          <span className="kpi-sub">
            {utils.num(r.total_gimnasios)} registrados · {utils.num(r.inactivos)} inactivos
          </span>
          <div className="kpi-bar">
            <span style={{ width: `${pctActivos}%` }}></span>
          </div>
        </div>
      </div>
      <div className="col-md-6 col-xl-3">
        <div className="card-g kpi kpi-accent h-100">
          <span className="kpi-label">Ingreso mensual estimado</span>
          <span className="kpi-value money">{utils.money(r.ingreso_mensual_estimado)}</span>
          <span className="kpi-sub">Suma de los planes de los gimnasios activos</span>
        </div>
      </div>
      <div className="col-md-6 col-xl-3">
        <div className="card-g kpi h-100">
          <span className="kpi-label">Por vencer</span>
          <span className="kpi-value">{utils.num(r.por_vencer)}</span>
          <span className="kpi-sub">Suscripciones en los próximos {DIAS_AVISO_VENCIMIENTO} días</span>
          <div className="kpi-bar">
            <span className="accent" style={{ width: `${pctAlerta}%` }}></span>
          </div>
        </div>
      </div>
      <div className="col-md-6 col-xl-3">
        <div className="card-g kpi h-100">
          <span className="kpi-label">Vencidas</span>
          <span className="kpi-value">{utils.num(r.vencidas)}</span>
          <span className="kpi-sub">Gimnasios activos con la suscripción sin renovar</span>
        </div>
      </div>
    </div>
  );
}

function ProximosVencimientos({ gimnasios, planes }: { gimnasios: Gimnasio[]; planes: PlanSoftware[] }) {
  // Los que mas urgen primero: vencidos y luego los que vencen antes.
  const filas = [...gimnasios]
    .sort((a, b) => {
      if (a.estado !== b.estado) return a.estado === "ACTIVO" ? -1 : 1;
      return diasParaVencer(a) - diasParaVencer(b);
    })
    .slice(0, MAX_FILAS);

  return (
    <div className="card-g h-100">
      <div className="card-head">
        <div>
          <h2 className="card-title">Próximos vencimientos</h2>
          <p className="card-sub">Gimnasios ordenados por la fecha en que vence su suscripción.</p>
        </div>
        <Link to="/plataforma/gimnasios" className="btn-neon">
          Ver todos
        </Link>
      </div>
      {filas.length === 0 ? (
        <div className="empty-state">Todavía no hay gimnasios registrados.</div>
      ) : (
        <div className="table-wrap">
          <table className="table-g tabla-stack">
            <thead>
              <tr>
                <th>Gimnasio</th>
                <th>Plan</th>
                <th>Estado</th>
                <th>Suscripción</th>
              </tr>
            </thead>
            <tbody>
              {filas.map((g) => (
                <tr key={g.gimnasio_id}>
                  <td data-label="Gimnasio">
                    <div className="plat-gym">
                      <b>{g.nombre}</b>
                      <span>{g.ciudad}</span>
                    </div>
                  </td>
                  <td data-label="Plan">
                    <BadgePlan plan={g.plan_software} planes={planes} />
                  </td>
                  <td data-label="Estado">
                    <BadgeEstadoGimnasio estado={g.estado} />
                  </td>
                  <td data-label="Suscripción">
                    <Suscripcion gimnasio={g} />
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

function PorPlan({ r, planes }: { r: ResumenPlataforma; planes: PlanSoftware[] }) {
  return (
    <div className="card-g h-100">
      <div className="card-head">
        <div>
          <h2 className="card-title">Gimnasios por plan</h2>
          <p className="card-sub">Cuántos gimnasios tiene cada plan del software.</p>
        </div>
      </div>
      <div className="plat-planes">
        {planes.map((p) => {
          const n = r.por_plan[p.id_plan_software];
          return (
            <div key={p.id_plan_software} className="plat-plan-fila">
              <div className="plat-plan-cab">
                <span>{p.nombre}</span>
                <b>{utils.num(n)}</b>
              </div>
              <div className="kpi-bar">
                <span style={{ width: `${porcentaje(r.total_gimnasios, n)}%` }}></span>
              </div>
              <span className="kpi-sub">{utils.money(p.precio_mensual)} / mes</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

export function DashboardPlataforma() {
  const [resumen, setResumen] = useState<ResumenPlataforma | null>(null);
  const [gimnasios, setGimnasios] = useState<Gimnasio[]>([]);
  const [planes, setPlanes] = useState<PlanSoftware[]>([]);
  // Si otro panel (o /registro) escribe datos, la vista vuelve a leer.
  const version = useVersionDeDatos();

  useEffect(() => {
    Promise.all([apiPlataforma.resumen(), apiPlataforma.gimnasios.list(), apiPlataforma.planes.list()]).then(
      ([r, g, p]) => {
        setResumen(r);
        setGimnasios(g);
        setPlanes(p);
      },
    );
  }, [version]);

  if (!resumen) {
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
      <Kpis r={resumen} />
      <div className="row g-3 mt-0">
        <div className="col-lg-8">
          <ProximosVencimientos gimnasios={gimnasios} planes={planes} />
        </div>
        <div className="col-lg-4">
          <PorPlan r={resumen} planes={planes} />
        </div>
      </div>
    </>
  );
}
