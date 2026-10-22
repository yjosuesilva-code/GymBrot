import { useEffect, useMemo, useState } from "react";
import { utils } from "../lib/utils";
import { useVersionDeDatos } from "../lib/datos";
import { apiPlataforma, estadoSuscripcion } from "../data/apiPlataforma";
import { BadgeEstadoGimnasio, BadgePlan, Suscripcion } from "../components/plataforma/BadgesPlataforma";
import type { Gimnasio, PlanSoftware } from "../types";

/* [plataforma] Todos los gimnasios de la plataforma, con filtros.
   TODO(T2): activar/inactivar y cambiar plan cuando T1 exporte `db`
   (apiPlataforma.gimnasios.cambiarEstado / cambiarPlan). */

type FiltroEstado = "TODOS" | Gimnasio["estado"] | "POR_VENCER" | "VENCIDA";
type FiltroPlan = "TODOS" | PlanSoftware["id_plan_software"];

function coincide(g: Gimnasio, texto: string): boolean {
  if (!texto) return true;
  const t = texto.toLowerCase();
  return [g.nombre, g.ciudad, g.slug].some((v) => v.toLowerCase().includes(t));
}

function pasaEstado(g: Gimnasio, filtro: FiltroEstado): boolean {
  switch (filtro) {
    case "TODOS":
      return true;
    case "ACTIVO":
    case "INACTIVO":
      return g.estado === filtro;
    default:
      return g.estado === "ACTIVO" && estadoSuscripcion(g) === filtro;
  }
}

export function GimnasiosPlataforma() {
  const [gimnasios, setGimnasios] = useState<Gimnasio[]>([]);
  const [planes, setPlanes] = useState<PlanSoftware[]>([]);
  const [cargando, setCargando] = useState(true);
  const [texto, setTexto] = useState("");
  const [estado, setEstado] = useState<FiltroEstado>("TODOS");
  const [plan, setPlan] = useState<FiltroPlan>("TODOS");
  const version = useVersionDeDatos();

  useEffect(() => {
    Promise.all([apiPlataforma.gimnasios.list(), apiPlataforma.planes.list()])
      .then(([g, p]) => {
        setGimnasios(g);
        setPlanes(p);
      })
      .finally(() => setCargando(false));
  }, [version]);

  const filtrados = useMemo(
    () =>
      gimnasios
        .filter((g) => coincide(g, texto.trim()) && pasaEstado(g, estado) && (plan === "TODOS" || g.plan_software === plan))
        .sort((a, b) => a.nombre.localeCompare(b.nombre, "es")),
    [gimnasios, texto, estado, plan],
  );

  const hayFiltros = texto.trim() !== "" || estado !== "TODOS" || plan !== "TODOS";

  return (
    <div className="card-g">
      <div className="card-head">
        <div>
          <h2 className="card-title">Gimnasios</h2>
          <p className="card-sub">
            Todos los gimnasios registrados en GymBrot, con su plan y el estado de su suscripción.
          </p>
        </div>
      </div>

      <div className="toolbar plat-filtros" style={{ marginBottom: 20 }}>
        <div className="search-box">
          <span className="search-ico">
            <i className="bi bi-search" aria-hidden />
          </span>
          <input
            type="text"
            className="form-control-dark"
            placeholder="Buscar por nombre, ciudad o enlace..."
            aria-label="Buscar gimnasio"
            value={texto}
            onChange={(e) => setTexto(e.target.value)}
          />
        </div>
        <select
          className="form-control-dark"
          aria-label="Filtrar por estado"
          value={estado}
          onChange={(e) => setEstado(e.target.value as FiltroEstado)}
        >
          <option value="TODOS">Todos los estados</option>
          <option value="ACTIVO">Activos</option>
          <option value="INACTIVO">Inactivos</option>
          <option value="POR_VENCER">Por vencer</option>
          <option value="VENCIDA">Vencidas</option>
        </select>
        <select
          className="form-control-dark"
          aria-label="Filtrar por plan"
          value={plan}
          onChange={(e) => setPlan(e.target.value as FiltroPlan)}
        >
          <option value="TODOS">Todos los planes</option>
          {planes.map((p) => (
            <option key={p.id_plan_software} value={p.id_plan_software}>
              {p.nombre}
            </option>
          ))}
        </select>
      </div>

      {cargando ? (
        <div className="loader">
          <span className="spinner-g"></span>Cargando...
        </div>
      ) : filtrados.length === 0 ? (
        <div className="empty-state">
          {hayFiltros ? "Ningún gimnasio coincide con los filtros." : "Todavía no hay gimnasios registrados."}
        </div>
      ) : (
        <>
          <div className="table-wrap">
            <table className="table-g tabla-stack">
              <thead>
                <tr>
                  <th>Gimnasio</th>
                  <th>Enlace</th>
                  <th>Plan</th>
                  <th>Estado</th>
                  <th>Suscripción</th>
                  <th>Registro</th>
                </tr>
              </thead>
              <tbody>
                {filtrados.map((g) => (
                  <tr key={g.gimnasio_id}>
                    <td data-label="Gimnasio">
                      <div className="plat-gym">
                        <b>{g.nombre}</b>
                        <span>
                          {g.ciudad} · {g.telefono}
                        </span>
                      </div>
                    </td>
                    <td data-label="Enlace">
                      <code className="plat-slug">/g/{g.slug}</code>
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
                    <td data-label="Registro">{utils.fecha(g.fecha_registro)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="card-sub plat-conteo">
            {filtrados.length} de {gimnasios.length} {gimnasios.length === 1 ? "gimnasio" : "gimnasios"}
          </p>
        </>
      )}
    </div>
  );
}
