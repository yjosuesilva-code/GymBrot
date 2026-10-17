import { useEffect, useState } from "react";
import { api } from "../data/api";
import { utils } from "../lib/utils";
import type { Cliente, Membresia, PlanMembresia } from "../types";
import { ModalPago } from "../components/ModalPago";
import type { NuevoPago } from "../data/api";

export function Membresias() {
  const [planes, setPlanes] = useState<PlanMembresia[]>([]);
  const [clientes, setClientes] = useState<Cliente[]>([]);
  const [membresias, setMembresias] = useState<Membresia[]>([]);
  const [cargando, setCargando] = useState(true);
  const [showPago, setShowPago] = useState(false);
  const [planInicial, setPlanInicial] = useState<number | null>(null);
  const [guardando, setGuardando] = useState(false);
  const [error, setError] = useState("");
  const [exito, setExito] = useState("");

  async function cargar() {
    const [p, c, m] = await Promise.all([
      api.planes.list(),
      api.clientes.list(),
      api.membresias.list(),
    ]);
    setPlanes(p);
    setClientes(c);
    setMembresias(m);
    setCargando(false);
  }

  useEffect(() => {
    (async () => {
      await cargar();
    })();
  }, []);

  function calcularDescuentoAnual(plan: PlanMembresia): number {
    const precioMensual12 = plan.precio_mensual * 12;
    if (precioMensual12 <= 0) return 0;
    const pct = Math.round(100 - (plan.precio_anual / precioMensual12) * 100);
    return pct;
  }

  async function registrarPago(input: NuevoPago) {
    setGuardando(true);
    setError("");
    try {
      const resp = await api.pagos.crear(input);
      if (!resp.ok) {
        setError(resp.mensaje);
        return;
      }
      setShowPago(false);
      setExito("Pago registrado y membresía activada");
      await cargar();
    } finally {
      setGuardando(false);
    }
  }

  if (cargando) {
    return (
      <div className="card-g">
        <div className="loader"><span className="spinner-g"></span>Cargando...</div>
      </div>
    );
  }

  // Order: Básico left (0), Estándar right (1), Premium center (2)
  const ordenados = [...planes].sort((a, b) => {
    const map = { Básico: 0, Estándar: 1, Premium: 2 };
    return (map[a.nombre as keyof typeof map] ?? 99) - (map[b.nombre as keyof typeof map] ?? 99);
  });

  return (
    <section className="card-g">
      <div className="card-head">
        <div>
          <h1 className="card-title">Membresías</h1>
          <p className="card-sub">Catálogo de planes disponibles</p>
        </div>
      </div>
      {exito && <div className="alert-g alert-ok show" role="status">{exito}</div>}
      {error && <div className="alert-g alert-error show" role="alert">{error}</div>}

      <div className="row g-3 memb-cards">
        {ordenados.map((plan) => {
          const esPremium = plan.nombre === "Premium";
          const descAnual = calcularDescuentoAnual(plan);
          return (
            <div key={plan.id_plan} className={`col-md-4 ${esPremium ? "memb-premium" : ""}`}>
              <div className={`card-g h-100 memb-card ${esPremium ? "memb-destacada" : ""}`}>
                {esPremium && <div className="memb-badge">Más elegido</div>}
                <h3 className="memb-nombre">{plan.nombre}</h3>
                <p className="memb-desc">{plan.descripcion}</p>
                <div className="memb-precios">
                  <div><span className="memb-mes">{utils.money(plan.precio_mensual)}</span> / mes</div>
                  <div>Semestral {utils.money(plan.precio_semestral)}</div>
                  <div>Anual {utils.money(plan.precio_anual)} <span className="memb-descuento">Anual -{descAnual}%</span></div>
                </div>
                {plan.beneficios && plan.beneficios.length > 0 && (
                  <ul className="memb-beneficios">
                    {plan.beneficios.map((b, i) => (
                      <li key={i}>{b}</li>
                    ))}
                  </ul>
                )}
                <button
                  className="btn-neon w-100 mt-3"
                  onClick={() => {
                    setPlanInicial(plan.id_plan);
                    setShowPago(true);
                    setError("");
                    setExito("");
                  }}
                >
                  SELECCIONAR PLAN
                </button>
              </div>
            </div>
          );
        })}
      </div>

      <div className="card-g mt-4">
        <h3 className="card-title">Comparación de planes</h3>
        <div className="table-responsive">
          <table className="table-g">
            <thead>
              <tr>
                <th>Característica</th>
                {ordenados.map((p) => (
                  <th key={p.id_plan}>{p.nombre}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              <tr>
                <td>Precio mensual</td>
                {ordenados.map((p) => (
                  <td key={p.id_plan}>{utils.money(p.precio_mensual)}</td>
                ))}
              </tr>
              <tr>
                <td>Precio anual</td>
                {ordenados.map((p) => (
                  <td key={p.id_plan}>{utils.money(p.precio_anual)} (Anual -{calcularDescuentoAnual(p)}%)</td>
                ))}
              </tr>
              <tr>
                <td>Beneficios</td>
                {ordenados.map((p) => (
                  <td key={p.id_plan}>{(p.beneficios || []).join(", ")}</td>
                ))}
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      <ModalPago
        show={showPago}
        planes={planes}
        clientes={clientes}
        membresias={membresias}
        bloqueado={guardando}
        alCerrar={() => !guardando && setShowPago(false)}
        alGuardar={registrarPago}
        planInicial={planInicial}
      />
    </section>
  );
}
