import { useEffect, useState } from "react";
import { utils } from "../lib/utils";
import { useVersionDeDatos } from "../lib/datos";
import { apiPlataforma } from "../data/apiPlataforma";
import type { Gimnasio, PlanSoftware } from "../types";

/* [plataforma] Los planes que GymBrot le vende a los gimnasios y cuantos
   gimnasios tiene cada uno. Solo lectura: el catalogo vive en el seed. */

export function PlanesSoftware() {
  const [planes, setPlanes] = useState<PlanSoftware[] | null>(null);
  const [gimnasios, setGimnasios] = useState<Gimnasio[]>([]);
  const version = useVersionDeDatos();

  useEffect(() => {
    Promise.all([apiPlataforma.planes.list(), apiPlataforma.gimnasios.list()]).then(([p, g]) => {
      setPlanes(p);
      setGimnasios(g);
    });
  }, [version]);

  if (!planes) {
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
      <div className="card-g">
        <div className="card-head" style={{ marginBottom: 0 }}>
          <div>
            <h2 className="card-title">Planes del software</h2>
            <p className="card-sub">Lo que pagan los gimnasios por usar GymBrot, y cuántos tiene cada plan.</p>
          </div>
        </div>
      </div>

      <div className="row g-3 mt-0">
        {planes.map((p) => {
          const delPlan = gimnasios.filter((g) => g.plan_software === p.id_plan_software);
          const activos = delPlan.filter((g) => g.estado === "ACTIVO").length;
          return (
            <div key={p.id_plan_software} className="col-md-6 col-xl-4">
              <div className={"card-g h-100 plat-plan-card" + (p.destacado ? " plat-plan-card--destacado" : "")}>
                <div className="plat-plan-top">
                  <span className="kpi-label">{p.nombre}</span>
                  {p.destacado && <span className="badge-g badge-activo badge-g--plain">Más elegido</span>}
                </div>
                <div className="kpi-value money">
                  {utils.money(p.precio_mensual)}
                  <span className="plat-plan-mes"> / mes</span>
                </div>
                <span className="kpi-sub">
                  {p.max_clientes === null ? "Clientes ilimitados" : `Hasta ${utils.num(p.max_clientes)} clientes`}
                </span>
                <ul className="plat-plan-incluye">
                  {p.incluye.map((item) => (
                    <li key={item}>
                      <i className="bi bi-check2" aria-hidden />
                      {item}
                    </li>
                  ))}
                </ul>
                <div className="plat-plan-uso">
                  <b>{utils.num(delPlan.length)}</b> {delPlan.length === 1 ? "gimnasio" : "gimnasios"} ·{" "}
                  {utils.num(activos)} {activos === 1 ? "activo" : "activos"}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </>
  );
}
