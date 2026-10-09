import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { api } from "../data/api";
import * as auth from "../lib/auth";
import { utils } from "../lib/utils";
import type { PlanSoftware } from "../types";

/* [plataforma] Pagina publica del software: lo que ve un gimnasio antes de
   tener cuenta. Vive fuera del Layout porque no exige sesion, y cada plan
   lleva a /registro con el plan ya elegido. */

const FUNCIONES = [
  { icono: "bi-people", titulo: "Clientes y membresías", texto: "Registra socios, planes y vencimientos sin hojas de cálculo." },
  { icono: "bi-fingerprint", titulo: "Control de acceso", texto: "Entrada con huella o código: solo pasa quien tiene la membresía al día." },
  { icono: "bi-cash-coin", titulo: "Pagos y finanzas", texto: "Cobros, ingresos por mes y por plan, y pagos pendientes en un solo lugar." },
  { icono: "bi-person-badge", titulo: "Instructores y rutinas", texto: "Asigna rutinas por día y agenda citas con los entrenadores." },
  { icono: "bi-graph-up-arrow", titulo: "Progreso de los socios", texto: "Peso, altura e IMC de cada medición para mostrar resultados." },
  { icono: "bi-stars", titulo: "Gymbrot AI", texto: "Un asistente que responde sobre tus clientes, membresías y finanzas." },
];

const PASOS = [
  { titulo: "Elige tu plan", texto: "Según la cantidad de socios de tu gimnasio." },
  { titulo: "Registra tu gimnasio", texto: "Los datos del gimnasio y de su administrador." },
  { titulo: "Empieza hoy", texto: "Pagas y entras a tu panel en el mismo momento." },
];

export function Landing() {
  const [planes, setPlanes] = useState<PlanSoftware[]>([]);
  const conSesion = auth.current() !== null;

  useEffect(() => {
    api.gimnasios.planesSoftware().then((p) => setPlanes(p));
  }, []);

  return (
    <div className="land">
      <header className="land-header">
        <img className="land-logo" src="/logos/gymbrot-logo.png" alt="GYMBROT" width={348} height={180} />
        <nav className="land-nav">
          <a href="#planes">Planes</a>
          {conSesion ? (
            <Link className="btn-neon" to="/dashboard">Ir al panel</Link>
          ) : (
            <Link className="btn-dark" to="/login">Iniciar sesión</Link>
          )}
        </nav>
      </header>

      <section className="land-hero">
        <span className="badge-g badge-activo">Software para gimnasios</span>
        <h1>Administra tu gimnasio desde un solo lugar</h1>
        <p>
          Clientes, membresías, control de acceso, pagos y rutinas en una sola
          aplicación. Cada gimnasio trabaja con sus propios datos, separados de
          los demás.
        </p>
        <div className="land-cta">
          <a className="btn-neon land-btn-lg" href="#planes">Ver planes</a>
          <Link className="btn-dark land-btn-lg" to="/registro">Registrar mi gimnasio</Link>
        </div>
      </section>

      <section className="land-section">
        <h2 className="land-h2">Todo lo que necesita tu gimnasio</h2>
        <div className="land-grid">
          {FUNCIONES.map((f) => (
            <div key={f.titulo} className="card-g land-feature">
              <i className={"bi " + f.icono} aria-hidden />
              <h3>{f.titulo}</h3>
              <p>{f.texto}</p>
            </div>
          ))}
        </div>
      </section>

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

      <section className="land-section">
        <h2 className="land-h2">Cómo funciona</h2>
        <ol className="land-pasos">
          {PASOS.map((p, i) => (
            <li key={p.titulo} className="card-g">
              <span className="qa-badge neon">{i + 1}</span>
              <div>
                <h3>{p.titulo}</h3>
                <p>{p.texto}</p>
              </div>
            </li>
          ))}
        </ol>
      </section>

      <footer className="land-footer">
        © {new Date().getFullYear()} GymBrot · Software de gestión para gimnasios
      </footer>
    </div>
  );
}
