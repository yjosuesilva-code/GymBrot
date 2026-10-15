import { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { api } from "../data/api";
import * as auth from "../lib/auth";
import { utils } from "../lib/utils";
import type { PlanSoftware } from "../types";

/* [plataforma] Pagina publica del software: lo que ve un gimnasio antes de
   tener cuenta. Vive fuera del Layout porque no exige sesion.

   Rediseno con lenguaje brutalista (referencia ploy.ai): tipografia
   sobredimensionada, retícula visible, bordes rectos, marquesina de
   telemetria, figuras abstractas y entrada por scroll. Todo con
   prefers-reduced-motion respetado. */

const MARQUEE = [
  "Clientes",
  "Membresías",
  "Control de acceso",
  "Pagos y finanzas",
  "Instructores y rutinas",
  "Progreso de socios",
  "Gymbrot AI",
];

const FUNCIONES = [
  { codigo: "MOD-01", icono: "bi-people", titulo: "Clientes y membresías", texto: "Registra socios, planes y vencimientos sin hojas de cálculo." },
  { codigo: "MOD-02", icono: "bi-fingerprint", titulo: "Control de acceso", texto: "Entrada con huella o código: solo pasa quien tiene la membresía al día." },
  { codigo: "MOD-03", icono: "bi-cash-coin", titulo: "Pagos y finanzas", texto: "Cobros, ingresos por mes y por plan, y pagos pendientes en un solo lugar." },
  { codigo: "MOD-04", icono: "bi-person-badge", titulo: "Instructores y rutinas", texto: "Asigna rutinas por día y agenda citas con los entrenadores." },
  { codigo: "MOD-05", icono: "bi-graph-up-arrow", titulo: "Progreso de los socios", texto: "Peso, altura e IMC de cada medición para mostrar resultados." },
  { codigo: "MOD-06", icono: "bi-stars", titulo: "Gymbrot AI", texto: "Un asistente que responde sobre tus clientes, membresías y finanzas." },
];

const PASOS = [
  { titulo: "Elige tu plan", texto: "Según la cantidad de socios de tu gimnasio." },
  { titulo: "Registra tu gimnasio", texto: "Los datos del gimnasio y de su administrador." },
  { titulo: "Empieza hoy", texto: "Pagas y entras a tu panel en el mismo momento." },
];

const STATS = [
  { valor: "06", etiqueta: "módulos" },
  { valor: "100%", etiqueta: "datos aislados" },
  { valor: "24/7", etiqueta: "control de acceso" },
];

export function Landing() {
  const [planes, setPlanes] = useState<PlanSoftware[]>([]);
  const conSesion = auth.current() !== null;
  const raiz = useRef<HTMLDivElement>(null);

  useEffect(() => {
    api.gimnasios.planesSoftware().then((p) => setPlanes(p));
  }, []);

  /* Entrada por scroll: observa los [data-reveal] y les agrega .is-in al
     entrar en pantalla. Se manipula la clase (no estado) para no re-renderizar. */
  useEffect(() => {
    const cont = raiz.current;
    if (!cont) return;
    const nodos = Array.from(cont.querySelectorAll<HTMLElement>("[data-reveal]"));
    if (typeof IntersectionObserver === "undefined") {
      nodos.forEach((n) => n.classList.add("is-in"));
      return;
    }
    const obs = new IntersectionObserver(
      (entradas) => {
        entradas.forEach((e) => {
          if (e.isIntersecting) {
            e.target.classList.add("is-in");
            obs.unobserve(e.target);
          }
        });
      },
      { rootMargin: "0px 0px -8% 0px", threshold: 0.12 }
    );
    nodos.forEach((n) => obs.observe(n));
    return () => obs.disconnect();
  }, []);

  return (
    <div className="land" ref={raiz}>
      <div className="land-grain" aria-hidden />
      <div className="land-scan" aria-hidden />

      <div className="land-ticker" aria-hidden>
        <div className="land-ticker-track">
          {[...MARQUEE, ...MARQUEE].map((t, i) => (
            <span key={i}>
              {t}
              <b>///</b>
            </span>
          ))}
        </div>
      </div>

      <header className="land-header">
        <div className="land-marca">
          <img className="land-logo" src="/logos/gymbrot-logo.png" alt="GYMBROT" width={348} height={180} />
          <span className="land-rev">REV 2.6</span>
        </div>
        <nav className="land-nav">
          <a href="#modulos">[ Módulos ]</a>
          <a href="#planes">[ Planes ]</a>
          {conSesion ? (
            <Link className="land-btn land-btn--neon" to="/dashboard">Ir al panel</Link>
          ) : (
            <Link className="land-btn land-btn--line" to="/login">Iniciar sesión</Link>
          )}
        </nav>
      </header>

      <section className="land-hero">
        <div className="land-hero-txt">
          <span className="land-eyebrow">[ Plataforma / Multi-tenant ]</span>
          <h1 className="land-h1">
            Administra tu gimnasio
            <em>desde un solo lugar</em>
          </h1>
          <p className="land-lead">
            Clientes, membresías, control de acceso, pagos y rutinas en una sola
            aplicación. Cada gimnasio trabaja con sus propios datos, separados de
            los demás.
          </p>
          <div className="land-cta">
            <a className="land-btn land-btn--neon land-btn--xl" href="#planes">Ver planes</a>
            <Link className="land-btn land-btn--line land-btn--xl" to="/registro">Registrar mi gimnasio</Link>
          </div>
          <ul className="land-stats">
            {STATS.map((s) => (
              <li key={s.etiqueta}>
                <b>{s.valor}</b>
                <span>{s.etiqueta}</span>
              </li>
            ))}
          </ul>
        </div>

        <div className="land-hero-figura" aria-hidden>
          <svg className="land-fig" viewBox="0 0 400 400">
            <defs>
              <pattern id="landDots" width="9" height="9" patternUnits="userSpaceOnUse">
                <circle className="land-fig-dot" cx="2" cy="2" r="1.3" />
              </pattern>
            </defs>

            <rect className="land-fig-frame" x="4" y="4" width="392" height="392" />

            <g className="land-fig-ring">
              <circle className="land-fig-neon" cx="200" cy="200" r="158" strokeDasharray="4 10" />
            </g>

            <g className="land-fig-sq">
              <rect x="72" y="72" width="256" height="256" />
              <rect x="112" y="112" width="176" height="176" />
            </g>

            <rect x="150" y="150" width="100" height="100" fill="url(#landDots)" stroke="none" />

            <g className="land-fig-cross">
              <line x1="200" y1="24" x2="200" y2="376" />
              <line x1="24" y1="200" x2="376" y2="200" />
              <circle className="land-fig-neon" cx="200" cy="200" r="44" />
            </g>

            <g className="land-fig-bar">
              {Array.from({ length: 24 }).map((_, i) => (
                <line key={i} x1={40 + i * 14} y1="356" x2={40 + i * 14} y2={i % 3 === 0 ? 384 : 372} />
              ))}
            </g>

            <text className="land-fig-label" x="16" y="30">GYM-CENTRO / D-01</text>
          </svg>
        </div>
      </section>

      <section className="land-section" id="modulos">
        <header className="land-sec-head" data-reveal>
          <span className="land-eyebrow">[ 01 / Módulos ]</span>
          <h2 className="land-h2">Todo lo que necesita tu gimnasio</h2>
        </header>
        <div className="land-modulos">
          {FUNCIONES.map((f, i) => (
            <article key={f.titulo} className="land-mod" data-reveal>
              <div className="land-mod-top">
                <span className="land-mod-idx">{String(i + 1).padStart(2, "0")}</span>
                <i className={"bi " + f.icono} aria-hidden />
              </div>
              <h3>{f.titulo}</h3>
              <p>{f.texto}</p>
              <span className="land-mod-code">[ {f.codigo} ]</span>
            </article>
          ))}
        </div>
      </section>

      <section className="land-section" id="planes">
        <header className="land-sec-head" data-reveal>
          <span className="land-eyebrow">[ 02 / Planes ]</span>
          <h2 className="land-h2">Elige tu plan</h2>
          <p className="land-sub">Pago mensual, sin cláusula de permanencia.</p>
        </header>
        <div className="land-planes">
          {planes.map((p) => (
            <div key={p.id_plan_software} className={"land-plan" + (p.destacado ? " land-plan--top" : "")} data-reveal>
              <div className="land-plan-head">
                <h3>{p.nombre}</h3>
                {p.destacado && <span className="land-plan-tag">El más elegido</span>}
              </div>
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
                className={"land-btn land-btn--xl " + (p.destacado ? "land-btn--neon" : "land-btn--line")}
                to={`/registro?plan=${p.id_plan_software}`}
              >
                Comprar
              </Link>
            </div>
          ))}
        </div>
      </section>

      <section className="land-section">
        <header className="land-sec-head" data-reveal>
          <span className="land-eyebrow">[ 03 / Flujo ]</span>
          <h2 className="land-h2">Cómo funciona</h2>
        </header>
        <ol className="land-pasos">
          {PASOS.map((p, i) => (
            <li key={p.titulo} className="land-paso" data-reveal>
              <span className="land-paso-num">{String(i + 1).padStart(2, "0")}</span>
              <div>
                <h3>{p.titulo}</h3>
                <p>{p.texto}</p>
              </div>
            </li>
          ))}
        </ol>
      </section>

      <section className="land-cta-band" data-reveal>
        <h2>Empieza a operar tu gimnasio hoy</h2>
        <Link className="land-btn land-btn--dark land-btn--xl" to="/registro">
          Registrar mi gimnasio <b>&gt;&gt;&gt;</b>
        </Link>
      </section>

      <footer className="land-footer">
        <span>© {new Date().getFullYear()} Gymbrot — Software de gestión para gimnasios</span>
        <span>[ GYM-CENTRO ] · REV 2.6</span>
      </footer>
    </div>
  );
}
