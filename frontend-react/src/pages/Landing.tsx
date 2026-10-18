import { useEffect, useMemo, useRef, useState } from "react";
import type { FormEvent } from "react";
import { Link, useLocation, useNavigationType } from "react-router-dom";
import { api } from "../data/api";
import { utils } from "../lib/utils";
import * as auth from "../lib/auth";
import type { PlanSoftware } from "../types";

/* [plataforma] Pagina publica del software: lo que ve un gimnasio antes de
   tener cuenta. Vive fuera del Layout porque no exige sesion.

   Lenguaje brutalista (referencia ploy.ai): tipografia sobredimensionada,
   reticula visible, bordes rectos, marquesina de telemetria, figuras
   abstractas y entrada por scroll tipo barrido. Todo respeta
   prefers-reduced-motion. */

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
  {
    icono: "bi-people",
    titulo: "Clientes y membresías",
    texto: "Centraliza el registro de socios, gestiona sus planes, controla vencimientos y evita duplicados. Todo organizado por gimnasio.",
  },
  {
    icono: "bi-fingerprint",
    titulo: "Control de acceso",
    texto: "Valida entradas con huella o código. Solo acceden quienes tienen la membresía al día y cada ingreso queda registrado con hora y resultado.",
  },
  {
    icono: "bi-cash-coin",
    titulo: "Pagos y finanzas",
    texto: "Registra cobros, lleva ingresos por mes y por plan, identifica pagos pendientes y mantiene el estado de cada membresía actualizado.",
  },
  {
    icono: "bi-person-badge",
    titulo: "Instructores y rutinas",
    texto: "Asigna rutinas personalizadas por cliente, organiza citas con instructores y mantiene el seguimiento de cada entrenamiento.",
  },
  {
    icono: "bi-graph-up-arrow",
    titulo: "Progreso de los socios",
    texto: "Registra peso, altura, IMC y evolución en el tiempo. Cada medición queda histórica para ver resultados mes a mes.",
  },
  {
    icono: "bi-stars",
    titulo: "Gymbrot AI",
    texto: "Asistente para consultar clientes, membresías, finanzas y accesos en lenguaje natural. Responde con datos del gimnasio activo.",
  },
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

const AISLAMIENTO = [
  { titulo: "Lectura filtrada", texto: "Cada consulta filtra por el gimnasio de la sesión: nunca se cruzan dos gimnasios." },
  { titulo: "Cédula por gimnasio", texto: "La misma persona puede ser socio de dos gimnasios: son registros que no se mezclan." },
  { titulo: "Sesión con su gimnasio", texto: "Al entrar, la cuenta hereda su gimnasio y todo el panel trabaja sobre él." },
  { titulo: "Listo para RLS", texto: "En producción el aislamiento lo hace cumplir la base; el frontend solo llama a la API." },
];

const INGRESOS = [62, 55, 70, 64, 79, 72, 86, 81, 94, 89, 103, 112];
const MESES = ["E", "F", "M", "A", "M", "J", "J", "A", "S", "O", "N", "D"];

const ACCESOS = [
  { nombre: "Ana Restrepo", plan: "Premium", hora: "06:12", ok: true },
  { nombre: "Carlos Mora", plan: "Básico", hora: "06:40", ok: true },
  { nombre: "Diego Pérez", plan: "Premium", hora: "07:05", ok: false },
  { nombre: "Juan Castro", plan: "Pro", hora: "07:31", ok: true },
  { nombre: "María López", plan: "Premium", hora: "07:48", ok: true },
  { nombre: "Pedro Torres", plan: "Pro", hora: "08:16", ok: true },
];

const FAQ = [
  { q: "¿Necesito instalar algo?", a: "No. GymBrot es web: entras desde cualquier navegador, sin instalar aplicaciones ni dependencias." },
  { q: "¿Cuántos socios puedo tener?", a: "Depende del plan: Básico hasta 100, Pro hasta 500 y Premium ilimitados. El recomendador te ayuda a elegir." },
  { q: "¿Puedo cambiar de plan?", a: "Sí. Puedes subir o bajar de plan en cualquier momento. El cobro se ajusta al siguiente ciclo de facturación." },
  { q: "¿Sirve si tengo varios gimnasios?", a: "Cada gimnasio tiene su propio espacio aislado. La misma cédula puede existir en dos gimnasios sin que se mezclen los datos." },
  { q: "¿Cómo funciona el control de acceso?", a: "Usa un lector de huella compatible o el modo manual por código cuando no tengas lector. Cada acceso queda registrado." },
  { q: "¿Hay contrato o permanencia?", a: "No. Es pago mensual sin cláusula de permanencia: puedes dejar de usarlo cuando quieras." },
  { q: "¿Qué incluye el soporte?", a: "Básico y Pro tienen soporte estándar. Premium incluye soporte prioritario para resolver incidencias con mayor agilidad." },
  { q: "¿Puedo migrar mis datos?", a: "Puedes registrar a tus socios manualmente desde el panel. Si tienes muchos, el equipo te orienta para hacerlo ordenadamente." },
  { q: "¿Cuándo se activa mi gimnasio tras registrarlo?", a: "Al registrar tu gimnasio y proceder al pago del plan, ya puedes acceder a tu panel con el usuario administrador creado." },
];

const CORREO = "hola@gymbrot.app";

/* Cada seccion de la landing tiene su propia ruta (/modulos, /planes...): la
   misma landing se renderiza con `seccion` y baja hasta ella. Asi el menu no
   usa anclas con # ni salta a otra pagina, y cualquier seccion se puede
   compartir con un enlace limpio. Clave = ruta, valor = id de la seccion. */
const ID_SECCION = {
  modulos: "modulos",
  panel: "panel",
  aislamiento: "aislamiento",
  planes: "planes",
  preguntas: "faq",
  contacto: "contacto",
} as const;
export type SeccionLanding = keyof typeof ID_SECCION;

export function Landing({ seccion }: { seccion?: SeccionLanding }) {
  const conSesion = auth.current() !== null;
  const [planes, setPlanes] = useState<PlanSoftware[]>([]);
  const [socios, setSocios] = useState(200);
  const [faqAbierta, setFaqAbierta] = useState<number | null>(0);
  const raiz = useRef<HTMLDivElement>(null);
  const barra = useRef<HTMLDivElement>(null);

  useEffect(() => {
    api.gimnasios.planesSoftware().then((p) => setPlanes(p));
  }, []);

  // Baja a la seccion de la ruta; en / vuelve arriba. Depende tambien de
  // location.key para que volver a pulsar el mismo enlace (ya estando en esa
  // ruta, pero mas abajo o mas arriba) vuelva a llevar a la seccion, y de
  // planes.length porque la tabla de planes llega despues del API y empuja
  // hacia abajo todo lo que sigue: sin repetir el scroll, entrar directo a
  // /preguntas quedaba corto.
  // Con Atras/Adelante (POP) el salto es inmediato. Ademas, mientras se esta
  // en la landing, la posicion la decide la ruta y no el navegador: con la
  // restauracion automatica, al volver con Atras el navegador ponia el scroll
  // donde estaba antes y la seccion quedaba fuera de lugar.
  useEffect(() => {
    const anterior = window.history.scrollRestoration;
    window.history.scrollRestoration = "manual";
    return () => {
      window.history.scrollRestoration = anterior;
    };
  }, []);

  const { key } = useLocation();
  const tipoNavegacion = useNavigationType();
  useEffect(() => {
    const behavior: ScrollBehavior = tipoNavegacion === "POP" ? "instant" : "smooth";
    if (seccion) document.getElementById(ID_SECCION[seccion])?.scrollIntoView({ behavior });
    else window.scrollTo({ top: 0, behavior });
  }, [seccion, key, planes.length, tipoNavegacion]);

  /* El plan que encaja con la cantidad de socios elegida. Si supera todos los
     topes, cae en el Premium (max_clientes === null). */
  const recomendado = useMemo(() => {
    const p = planes.find((pl) => pl.max_clientes === null || socios <= pl.max_clientes);
    return p ? p.id_plan_software : "PREMIUM";
  }, [planes, socios]);

  /* Entrada por scroll: observa los [data-reveal] y les agrega .is-in al
     entrar en pantalla. Se manipula la clase (no estado) para no re-renderizar.
     Depende de planes.length porque las filas de planes llegan del API mas
     tarde: sin volver a observar, nacian ocultas y no aparecian nunca. */
  useEffect(() => {
    const cont = raiz.current;
    if (!cont) return;
    const nodos = Array.from(cont.querySelectorAll<HTMLElement>("[data-reveal]:not(.is-in)"));
    if (typeof IntersectionObserver === "undefined") {
      nodos.forEach((n) => n.classList.add("is-in"));
      return;
    }
    // threshold 0 y no 0.12: el [data-reveal] arranca con clip-path
    // inset(0 100% 0 0) y Chrome calcula la interseccion ya recortada, asi que
    // el ratio queda en 0 y con 0.12 nunca llegaba a mostrarse.
    const obs = new IntersectionObserver(
      (entradas) => {
        entradas.forEach((e) => {
          if (e.isIntersecting) {
            e.target.classList.add("is-in");
            obs.unobserve(e.target);
          }
        });
      },
      { rootMargin: "0px 0px -8% 0px", threshold: 0 }
    );
    nodos.forEach((n) => obs.observe(n));
    return () => obs.disconnect();
  }, [planes.length]);

  /* Barra de progreso de lectura (telemetria): refleja cuanto se ha bajado. */
  useEffect(() => {
    const onScroll = () => {
      const h = document.documentElement;
      const max = h.scrollHeight - h.clientHeight;
      const r = max > 0 ? h.scrollTop / max : 0;
      if (barra.current) barra.current.style.transform = `scaleX(${r})`;
    };
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  function enviarContacto(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const d = new FormData(e.currentTarget);
    const asunto = `Consulta de ${String(d.get("nombre") || "")}`;
    const cuerpo = `${String(d.get("mensaje") || "")}\n\n— ${String(d.get("correo") || "")}`;
    window.location.href = `mailto:${CORREO}?subject=${encodeURIComponent(asunto)}&body=${encodeURIComponent(cuerpo)}`;
  }

  return (
    <div className="land" ref={raiz}>
      <div className="land-progress" ref={barra} aria-hidden />
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
          <Link to="/modulos">[ Módulos ]</Link>
          <Link to="/panel">[ Panel ]</Link>
          <Link to="/planes">[ Planes ]</Link>
          <Link to="/contacto">[ Contacto ]</Link>
          <Link to="/preguntas">[ Preguntas ]</Link>
          {conSesion ? (
            <Link className="land-btn land-btn--neon" to="/dashboard">Ir al panel</Link>
          ) : (
            <Link className="land-btn land-btn--neon" to="/login">Iniciar sesión</Link>
          )}
        </nav>
      </header>

      <section className="land-hero">
        <div className="land-hero-txt">
          <span className="land-eyebrow">[ Plataforma / Multi-tenant ]</span>
          <h1 className="land-h1">Administra tu gimnasio</h1>
          <p className="land-lead">
            Clientes, membresías, control de acceso, pagos y rutinas en un solo
            panel. Cada gimnasio opera con sus datos aislados de los demás.
          </p>
          <div className="land-cta">
            <Link className="land-btn land-btn--neon land-btn--xl" to="/planes">Ver planes</Link>
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
          <h2 className="land-h2">Todo lo que necesita tu gimnasio</h2>
          <p className="land-sub">Seis módulos que cubren la operación diaria, del registro del socio al control de la entrada.</p>
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
            </article>
          ))}
        </div>
      </section>

      <section className="land-section" id="panel">
        <header className="land-sec-head" data-reveal>
          <h2 className="land-h2">El panel de tu gimnasio</h2>
          <p className="land-sub">Indicadores del mes, ingresos por mes y los últimos accesos, en una sola pantalla. <span className="land-sample">[ datos de ejemplo ]</span></p>
        </header>
        <div className="land-panel" data-reveal data-ui>
          <div className="land-panel-bar">
            <span className="land-panel-dot" />
            <span className="land-panel-dot" />
            <span className="land-panel-dot" />
            <span className="land-panel-url">gymbrot://panel/gym-centro</span>
            <span className="land-panel-live">● EN VIVO</span>
          </div>
          <div className="land-panel-body">
            <div className="land-panel-kpis">
              <div className="land-kpi">
                <span className="land-kpi-label">Ingresos del mes</span>
                <b>{utils.money(2480000)}</b>
                <span className="land-kpi-delta">▲ 12% vs mes anterior</span>
              </div>
              <div className="land-kpi">
                <span className="land-kpi-label">Socios activos</span>
                <b>{utils.num(100)}</b>
                <span className="land-kpi-delta">7 por vencer</span>
              </div>
              <div className="land-kpi">
                <span className="land-kpi-label">Accesos hoy</span>
                <b>{utils.num(84)}</b>
                <span className="land-kpi-delta">3 rechazados</span>
              </div>
            </div>
            <div className="land-panel-grid">
              <div className="land-panel-chart">
                <span className="land-panel-cap">Ingresos por mes (COP)</span>
                <div className="land-bars">
                  {INGRESOS.map((v, i) => (
                    <div className="land-bar" key={i}>
                      <span className={"land-bar-fill" + (i === INGRESOS.length - 1 ? " is-now" : "")} style={{ height: `${(v / 120) * 100}%` }} />
                      <span className="land-bar-mes">{MESES[i]}</span>
                    </div>
                  ))}
                </div>
              </div>
              <div className="land-panel-list">
                <span className="land-panel-cap">Últimos accesos</span>
                <ul>
                  {ACCESOS.map((a) => (
                    <li key={a.hora}>
                      <span className="land-acc-hora">{a.hora}</span>
                      <span className="land-acc-nombre">{a.nombre}</span>
                      <span className="land-acc-plan">{a.plan}</span>
                      <span className={"land-acc-estado" + (a.ok ? " ok" : " no")}>{a.ok ? "OK" : "VENCIDA"}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="land-section" id="aislamiento">
        <header className="land-sec-head" data-reveal>
          <h2 className="land-h2">Aislados por diseño</h2>
          <p className="land-sub">GymBrot es una plataforma para muchos gimnasios. El aislamiento de los datos no es un adorno: vive en la capa que lee cada consulta.</p>
        </header>
        <div className="land-aisla">
          <ul className="land-aisla-list">
            {AISLAMIENTO.map((p, i) => (
              <li key={p.titulo} data-reveal>
                <span className="land-aisla-num">{String(i + 1).padStart(2, "0")}</span>
                <div>
                  <h3>{p.titulo}</h3>
                  <p>{p.texto}</p>
                </div>
              </li>
            ))}
          </ul>
          <figure className="land-aisla-fig" data-reveal data-ui>
            <figcaption>Misma persona · dos gimnasios</figcaption>
            <div className="land-aisla-cols">
              <div className="land-aisla-col">
                <span className="land-aisla-gym">gym-centro</span>
                <div className="land-aisla-row"><span>Ana Restrepo</span><b>Premium</b></div>
                <div className="land-aisla-row"><span>Ingresos del mes</span><b>{utils.money(2480000)}</b></div>
              </div>
              <div className="land-aisla-col">
                <span className="land-aisla-gym">gym-titan</span>
                <div className="land-aisla-row"><span>Ana Restrepo</span><b>Básico</b></div>
                <div className="land-aisla-row"><span>Ingresos del mes</span><b>{utils.money(940000)}</b></div>
              </div>
            </div>
            <p className="land-aisla-nota">La misma cédula, dos registros. Ninguna fila cruza de un gimnasio al otro.</p>
          </figure>
        </div>
      </section>

      <section className="land-section" id="planes">
        <header className="land-sec-head" data-reveal>
          <h2 className="land-h2">Elige tu plan</h2>
          <p className="land-sub">Pago mensual, sin cláusula de permanencia. Elige según la cantidad de socios de tu gimnasio.</p>
        </header>

        <div className="land-reco" data-reveal>
          <label className="land-reco-label" htmlFor="reco">¿Cuántos socios tiene tu gimnasio?</label>
          <div className="land-reco-row">
            <input
              id="reco"
              type="range"
              min={10}
              max={1000}
              step={10}
              value={socios}
              onChange={(e) => setSocios(Number(e.target.value))}
              className="land-reco-range"
            />
            <output className="land-reco-num" htmlFor="reco">{utils.num(socios)} socios</output>
          </div>
          <p className="land-reco-out">
            Te recomendamos el plan <b>{planes.find((p) => p.id_plan_software === recomendado)?.nombre ?? "—"}</b>.
          </p>
        </div>

        <div className="land-spec">
          <div className="land-spec-row land-spec-row--head" aria-hidden>
            <span>Plan</span>
            <span>Precio / mes</span>
            <span>Socios</span>
            <span>Incluye</span>
            <span>Acción</span>
          </div>
          {planes.map((p) => (
            <article
              key={p.id_plan_software}
              className={"land-spec-row" + (p.destacado ? " is-top" : "") + (p.id_plan_software === recomendado ? " is-reco" : "")}
              data-reveal
            >
              <div className="land-spec-name">
                <h3>{p.nombre}</h3>
                {p.destacado && <span className="land-plan-tag">El más elegido</span>}
                {p.id_plan_software === recomendado && <span className="land-plan-tag land-plan-tag--reco">Recomendado</span>}
              </div>
              <div className="land-spec-price">
                {utils.money(p.precio_mensual)}
                <span>/mes</span>
              </div>
              <div className="land-spec-limit">
                {p.max_clientes === null ? "Ilimitados" : `Hasta ${utils.num(p.max_clientes)}`}
              </div>
              <ul className="land-spec-incluye">
                {p.incluye.map((item) => (
                  <li key={item}>
                    <i className="bi bi-check2" aria-hidden />
                    {item}
                  </li>
                ))}
              </ul>
              <div className="land-spec-cta">
                <Link
                  className={"land-btn " + (p.id_plan_software === recomendado ? "land-btn--neon" : "land-btn--line")}
                  to={`/registro?plan=${p.id_plan_software}`}
                >
                  Comprar
                </Link>
              </div>
            </article>
          ))}
        </div>

        <div className="land-compara" data-reveal>
          <span className="land-eyebrow">[ Comparativa de características ]</span>
          <h3 className="land-h3">Básico / Pro / Premium</h3>
          <div className="land-compara-grid">
            <div className="land-compara-row land-compara-head">
              <span>Característica</span>
              <span>Básico</span>
              <span>Pro</span>
              <span>Premium</span>
            </div>
            <div className="land-compara-row">
              <span>Socios máximo</span>
              <span>100</span>
              <span>500</span>
              <span>Ilimitados</span>
            </div>
            <div className="land-compara-row">
              <span>Clientes y membresías</span>
              <span><i className="bi bi-check2" aria-hidden /></span>
              <span><i className="bi bi-check2" aria-hidden /></span>
              <span><i className="bi bi-check2" aria-hidden /></span>
            </div>
            <div className="land-compara-row">
              <span>Control de acceso</span>
              <span><i className="bi bi-check2" aria-hidden /></span>
              <span><i className="bi bi-check2" aria-hidden /></span>
              <span><i className="bi bi-check2" aria-hidden /></span>
            </div>
            <div className="land-compara-row">
              <span>Pagos y registro de cobros</span>
              <span><i className="bi bi-check2" aria-hidden /></span>
              <span><i className="bi bi-check2" aria-hidden /></span>
              <span><i className="bi bi-check2" aria-hidden /></span>
            </div>
            <div className="land-compara-row">
              <span>Instructores, rutinas y citas</span>
              <span><i className="bi bi-dash" aria-hidden /></span>
              <span><i className="bi bi-check2" aria-hidden /></span>
              <span><i className="bi bi-check2" aria-hidden /></span>
            </div>
            <div className="land-compara-row">
              <span>Progreso de los socios</span>
              <span><i className="bi bi-dash" aria-hidden /></span>
              <span><i className="bi bi-check2" aria-hidden /></span>
              <span><i className="bi bi-check2" aria-hidden /></span>
            </div>
            <div className="land-compara-row">
              <span>Finanzas y reportes</span>
              <span><i className="bi bi-dash" aria-hidden /></span>
              <span><i className="bi bi-check2" aria-hidden /></span>
              <span><i className="bi bi-check2" aria-hidden /></span>
            </div>
            <div className="land-compara-row">
              <span>Gymbrot AI</span>
              <span><i className="bi bi-dash" aria-hidden /></span>
              <span><i className="bi bi-dash" aria-hidden /></span>
              <span><i className="bi bi-check2" aria-hidden /></span>
            </div>
            <div className="land-compara-row">
              <span>Soporte prioritario</span>
              <span><i className="bi bi-dash" aria-hidden /></span>
              <span><i className="bi bi-dash" aria-hidden /></span>
              <span><i className="bi bi-check2" aria-hidden /></span>
            </div>
          </div>
          <p className="land-compara-nota">Los datos de los gimnasios quedan aislados entre sí en todos los planes.</p>
        </div>
      </section>

      <section className="land-section" id="como">
        <header className="land-sec-head" data-reveal>
          <h2 className="land-h2">Cómo funciona</h2>
          <p className="land-sub">De la decisión del plan a tu panel operando, en tres pasos.</p>
        </header>
        <ol className="land-pasos">
          {PASOS.map((p, i) => (
            <li key={p.titulo} className="land-paso" data-reveal>
              <span className="land-paso-num">Paso {String(i + 1).padStart(2, "0")}</span>
              <h3>{p.titulo}</h3>
              <p>{p.texto}</p>
            </li>
          ))}
        </ol>
      </section>

      <section className="land-section" id="faq">
        <header className="land-sec-head" data-reveal>
          <h2 className="land-h2">Preguntas frecuentes</h2>
          <p className="land-sub">Lo que suelen preguntar antes de registrar un gimnasio.</p>
        </header>
        <div className="land-faq">
          {FAQ.map((f, i) => {
            const abierta = faqAbierta === i;
            return (
              <div key={f.q} className={"land-faq-item" + (abierta ? " is-open" : "")} data-reveal>
                <button
                  type="button"
                  className="land-faq-q"
                  aria-expanded={abierta}
                  onClick={() => setFaqAbierta(abierta ? null : i)}
                >
                  <span>{f.q}</span>
                  <i className="bi bi-plus-lg" aria-hidden />
                </button>
                <div className="land-faq-a">
                  <p>{f.a}</p>
                </div>
              </div>
            );
          })}
        </div>
      </section>

      <section className="land-section" id="contacto">
        <div className="land-contacto">
          <div className="land-contacto-info" data-reveal>
            <span className="land-eyebrow">[ Contacto ]</span>
            <h2 className="land-h2">Habla con nosotros</h2>
            <p className="land-sub">¿Dudas sobre los planes o quieres ver una demostración? Escríbenos y te respondemos.</p>
            <ul className="land-contacto-datos">
              <li><i className="bi bi-envelope" aria-hidden /> {CORREO}</li>
              <li><i className="bi bi-geo-alt" aria-hidden /> Valledupar, Colombia</li>
              <li><i className="bi bi-clock" aria-hidden /> Lunes a viernes, 8:00–18:00</li>
            </ul>
          </div>
          <form className="land-contacto-form" onSubmit={enviarContacto} data-reveal>
            <label htmlFor="c-nombre">Nombre</label>
            <input id="c-nombre" name="nombre" type="text" required placeholder="Tu nombre" />
            <label htmlFor="c-correo">Correo</label>
            <input id="c-correo" name="correo" type="email" required placeholder="tucorreo@ejemplo.com" />
            <label htmlFor="c-mensaje">Mensaje</label>
            <textarea id="c-mensaje" name="mensaje" rows={4} required placeholder="Cuéntanos qué necesitas" />
            <button type="submit" className="land-btn land-btn--neon land-btn--xl">Enviar mensaje</button>
          </form>
        </div>
      </section>

      <section className="land-cta-band" data-reveal>
        <h2>Empieza a operar tu gimnasio hoy</h2>
        <Link className="land-btn land-btn--dark land-btn--xl" to="/registro">
          Registrar mi gimnasio <b>&gt;&gt;&gt;</b>
        </Link>
      </section>

      <footer className="land-footer">
        <div className="land-footer-top">
          <div className="land-footer-brand">
            <img src="/logos/gymbrot-logo.png" alt="GYMBROT" width={348} height={180} />
            <p>Software de gestión para gimnasios. Clientes, membresías, control de acceso y finanzas en un solo panel.</p>
          </div>
          <nav className="land-footer-cols" aria-label="Enlaces del pie">
            <div className="land-footer-col">
              <h4>Producto</h4>
              <Link to="/modulos">Módulos</Link>
              <Link to="/panel">Panel</Link>
              <Link to="/aislamiento">Aislamiento</Link>
              <Link to="/planes">Planes</Link>
            </div>
            <div className="land-footer-col">
              <h4>Cuenta</h4>
              <Link to="/login">Iniciar sesión</Link>
              <Link to="/registro">Registrar gimnasio</Link>
            </div>
            <div className="land-footer-col">
              <h4>Ayuda</h4>
              <Link to="/preguntas">Preguntas</Link>
              <Link to="/contacto">Contacto</Link>
              <a href={`mailto:${CORREO}`}>{CORREO}</a>
            </div>
          </nav>
        </div>
        <div className="land-footer-bottom">
          <span>© {new Date().getFullYear()} Gymbrot — Software de gestión para gimnasios</span>
          <span>Valledupar, Colombia · REV 2.6</span>
        </div>
      </footer>
    </div>
  );
}
