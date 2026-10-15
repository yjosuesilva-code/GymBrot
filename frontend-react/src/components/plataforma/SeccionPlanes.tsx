import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { api } from "../../data/api";
import { utils } from "../../lib/utils";
import type { PlanSoftware } from "../../types";

/* [multitenant-slug] Tarjetas de planes del software. Salio de Landing.tsx
   para usarla tambien en /planes sin duplicarla. */
export function SeccionPlanes() {
  const [planes, setPlanes] = useState<PlanSoftware[]>([]);

  useEffect(() => {
    api.gimnasios.planesSoftware().then((p) => setPlanes(p));
  }, []);

  return (
    <section className="land-section" id="planes">
      <h2 className="land-h2">Planes</h2>
      <p className="land-sub">Pago mensual, sin cláusula de permanencia.</p>
      <div className="land-planes">
        {planes.map((p) => (
          <div key={p.id_plan_software} className={"card-g land-plan" + (p.destacado ? " destacado" : "")}>
            {p.destacado && <span className="land-plan-tag">El más elegido</span>}
            <h3>{p.nombre}</h3>
            <div className="land-precio">
              {utils.money(p.precio_mensual)}
              <span>/mes</span>
            </div>
            <p className="land-limite">
              {p.max_clientes === null ? "Clientes ilimitados" : `Hasta ${utils.num(p.max_clientes)} clientes`}
            </p>
            <ul>
              {p.incluye.map((item) => (
                <li key={item}>
                  <i className="bi bi-check2" aria-hidden />
                  {item}
                </li>
              ))}
            </ul>
            <Link
              className={(p.destacado ? "btn-neon" : "btn-dark") + " land-btn-lg"}
              to={`/registro?plan=${p.id_plan_software}`}
            >
              Comprar
            </Link>
          </div>
        ))}
      </div>
    </section>
  );
}
