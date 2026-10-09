import { useEffect, useState } from "react";
import type { FormEvent } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { api } from "../data/api";
import type { RegistroGimnasio } from "../data/api";
import * as auth from "../lib/auth";
import { utils } from "../lib/utils";
import type { PagoSoftware, PlanSoftware } from "../types";

/* [plataforma] Compra del software en tres pasos: plan, datos y pago
   simulado. Al aprobarse el pago, api.gimnasios.registrar crea el gimnasio y
   su administrador, y aqui se inicia sesion con el login normal para que la
   sesion salga igual que la de cualquier otro usuario. */

type Paso = 1 | 2 | 3;
type IdPlan = PlanSoftware["id_plan_software"];

type FormRegistro = {
  gimnasio: RegistroGimnasio["gimnasio"];
  admin: RegistroGimnasio["admin"] & { confirmar: string };
};

const VACIO: FormRegistro = {
  gimnasio: { nombre: "", ciudad: "", telefono: "" },
  admin: { numero_identificacion: "", nombre: "", apellidos: "", correo: "", contrasena: "", confirmar: "" },
};

const METODOS: { valor: PagoSoftware["metodo_pago"]; etiqueta: string; icono: string }[] = [
  { valor: "TARJETA", etiqueta: "Tarjeta", icono: "bi-credit-card" },
  { valor: "PSE", etiqueta: "PSE", icono: "bi-bank" },
  { valor: "NEQUI", etiqueta: "Nequi", icono: "bi-phone" },
];

const NOMBRES_PASO = ["Plan", "Datos", "Pago"];

function planDeUrl(valor: string | null): IdPlan {
  return valor === "BASICO" || valor === "PRO" || valor === "PREMIUM" ? valor : "PRO";
}

export function Registro() {
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const [planes, setPlanes] = useState<PlanSoftware[]>([]);
  const [planId, setPlanId] = useState<IdPlan>(() => planDeUrl(params.get("plan")));
  const [paso, setPaso] = useState<Paso>(1);
  const [form, setForm] = useState<FormRegistro>(VACIO);
  const [metodo, setMetodo] = useState<PagoSoftware["metodo_pago"] | "">("");
  const [error, setError] = useState("");
  const [procesando, setProcesando] = useState(false);
  const [referencia, setReferencia] = useState("");

  useEffect(() => {
    api.gimnasios.planesSoftware().then((p) => setPlanes(p));
  }, []);

  const plan = planes.find((p) => p.id_plan_software === planId);

  function setGym(campo: keyof FormRegistro["gimnasio"], valor: string) {
    setForm((f) => ({ ...f, gimnasio: { ...f.gimnasio, [campo]: valor } }));
  }
  function setAdmin(campo: keyof FormRegistro["admin"], valor: string) {
    setForm((f) => ({ ...f, admin: { ...f.admin, [campo]: valor } }));
  }

  // Las mismas reglas que api.gimnasios.registrar, repetidas aqui solo para
  // avisar antes del pago; la que manda es la del api.
  function validarDatos(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const { gimnasio: g, admin: a } = form;
    if (!g.nombre.trim() || !g.ciudad.trim() || !g.telefono.trim())
      return setError("Completa los datos del gimnasio.");
    if (!a.numero_identificacion.trim() || !a.nombre.trim() || !a.apellidos.trim() || !a.correo.trim())
      return setError("Completa los datos del administrador.");
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(a.correo.trim())) return setError("El correo no es válido.");
    if (a.contrasena.trim().length < 6) return setError("La contraseña debe tener al menos 6 caracteres.");
    if (a.contrasena !== a.confirmar) return setError("Las contraseñas no coinciden.");
    setError("");
    setPaso(3);
  }

  async function pagar() {
    if (procesando) return;
    if (!metodo) return setError("Elige un método de pago.");

    setError("");
    setProcesando(true);
    try {
      // Sin el campo confirmar: es del formulario, no del api.
      const { numero_identificacion, nombre, apellidos, correo, contrasena } = form.admin;
      const admin = { numero_identificacion, nombre, apellidos, correo, contrasena };
      const res = await api.gimnasios.registrar({ plan: planId, gimnasio: form.gimnasio, admin, metodo_pago: metodo });
      if (!res.ok || !res.data) {
        // Todas las validaciones del api son de los datos del paso 2.
        setError(res.mensaje);
        setPaso(2);
        return;
      }
      const sesion = await auth.login(admin.correo, admin.contrasena);
      if (!sesion.ok) {
        setError("El gimnasio quedó registrado, pero no se pudo iniciar sesión: " + sesion.mensaje);
        return;
      }
      setReferencia(res.data.pago.referencia);
    } finally {
      setProcesando(false);
    }
  }

  if (referencia) {
    return (
      <div className="reg-wrap">
        <div className="card-g reg-card reg-ok">
          <i className="bi bi-check-circle-fill" aria-hidden />
          <h2>¡Listo! Tu gimnasio quedó registrado</h2>
          <p>
            Pago aprobado · referencia <strong>{referencia}</strong>
          </p>
          <p className="card-sub">
            Para volver a entrar usa tu correo <strong>{form.admin.correo.trim().toLowerCase()}</strong> y tu contraseña.
          </p>
          <button className="btn-neon land-btn-lg" type="button" onClick={() => navigate("/dashboard", { replace: true })}>
            Ir a mi panel
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="reg-wrap">
      <div className="card-g reg-card">
        <div className="reg-top">
          <Link to="/" className="land-link">
            <i className="bi bi-arrow-left" aria-hidden /> Volver a los planes
          </Link>
          <img className="reg-logo" src="/logos/gymbrot-logo.png" alt="GYMBROT" width={348} height={180} />
        </div>

        <h2 className="card-title">Registra tu gimnasio</h2>

        <ol className="reg-pasos" aria-label="Pasos del registro">
          {NOMBRES_PASO.map((nombre, i) => {
            const n = i + 1;
            const clase = n === paso ? " activo" : n < paso ? " hecho" : "";
            return (
              <li key={nombre} className={"reg-paso" + clase} aria-current={n === paso ? "step" : undefined}>
                <span>{n < paso ? <i className="bi bi-check2" aria-hidden /> : n}</span>
                {nombre}
              </li>
            );
          })}
        </ol>

        {error && (
          <div className="alert-g alert-error show" role="alert">
            {error}
          </div>
        )}

        {paso === 1 && (
          <>
            <div className="reg-opciones" role="radiogroup" aria-label="Plan">
              {planes.map((p) => (
                <button
                  key={p.id_plan_software}
                  type="button"
                  role="radio"
                  aria-checked={p.id_plan_software === planId}
                  className={"reg-opcion" + (p.id_plan_software === planId ? " sel" : "")}
                  onClick={() => setPlanId(p.id_plan_software)}
                >
                  <span className="reg-opcion-nombre">{p.nombre}</span>
                  <span className="reg-opcion-precio">{utils.money(p.precio_mensual)}/mes</span>
                  <span className="card-sub">
                    {p.max_clientes === null ? "Clientes ilimitados" : `Hasta ${utils.num(p.max_clientes)} clientes`}
                  </span>
                </button>
              ))}
            </div>
            <div className="reg-acciones">
              <button className="btn-neon land-btn-lg" type="button" disabled={!plan} onClick={() => setPaso(2)}>
                Continuar
              </button>
            </div>
          </>
        )}

        {paso === 2 && (
          <form onSubmit={validarDatos} noValidate>
            <fieldset className="reg-fieldset">
              <legend>Tu gimnasio</legend>
              <div className="reg-grid">
                <div className="reg-col-2">
                  <label className="form-label-g" htmlFor="gym-nombre">Nombre del gimnasio</label>
                  <input className="form-control-dark" id="gym-nombre" value={form.gimnasio.nombre}
                    onChange={(e) => setGym("nombre", e.target.value)} autoComplete="organization" autoFocus />
                </div>
                <div>
                  <label className="form-label-g" htmlFor="gym-ciudad">Ciudad</label>
                  <input className="form-control-dark" id="gym-ciudad" value={form.gimnasio.ciudad}
                    onChange={(e) => setGym("ciudad", e.target.value)} autoComplete="address-level2" />
                </div>
                <div>
                  <label className="form-label-g" htmlFor="gym-telefono">Teléfono</label>
                  <input className="form-control-dark" id="gym-telefono" type="tel" value={form.gimnasio.telefono}
                    onChange={(e) => setGym("telefono", e.target.value)} autoComplete="tel" />
                </div>
              </div>
            </fieldset>

            <fieldset className="reg-fieldset">
              <legend>Administrador</legend>
              <div className="reg-grid">
                <div>
                  <label className="form-label-g" htmlFor="adm-cedula">Cédula</label>
                  <input className="form-control-dark" id="adm-cedula" inputMode="numeric" value={form.admin.numero_identificacion}
                    onChange={(e) => setAdmin("numero_identificacion", e.target.value)} />
                </div>
                <div>
                  <label className="form-label-g" htmlFor="adm-correo">Correo (será tu usuario)</label>
                  <input className="form-control-dark" id="adm-correo" type="email" value={form.admin.correo}
                    onChange={(e) => setAdmin("correo", e.target.value)} autoComplete="email" />
                </div>
                <div>
                  <label className="form-label-g" htmlFor="adm-nombre">Nombre</label>
                  <input className="form-control-dark" id="adm-nombre" value={form.admin.nombre}
                    onChange={(e) => setAdmin("nombre", e.target.value)} autoComplete="given-name" />
                </div>
                <div>
                  <label className="form-label-g" htmlFor="adm-apellidos">Apellidos</label>
                  <input className="form-control-dark" id="adm-apellidos" value={form.admin.apellidos}
                    onChange={(e) => setAdmin("apellidos", e.target.value)} autoComplete="family-name" />
                </div>
                <div>
                  <label className="form-label-g" htmlFor="adm-clave">Contraseña</label>
                  <input className="form-control-dark" id="adm-clave" type="password" value={form.admin.contrasena}
                    onChange={(e) => setAdmin("contrasena", e.target.value)} autoComplete="new-password" />
                </div>
                <div>
                  <label className="form-label-g" htmlFor="adm-confirmar">Confirmar contraseña</label>
                  <input className="form-control-dark" id="adm-confirmar" type="password" value={form.admin.confirmar}
                    onChange={(e) => setAdmin("confirmar", e.target.value)} autoComplete="new-password" />
                </div>
              </div>
            </fieldset>

            <div className="reg-acciones">
              <button className="btn-dark land-btn-lg" type="button" onClick={() => { setError(""); setPaso(1); }}>
                Atrás
              </button>
              <button className="btn-neon land-btn-lg" type="submit">Continuar al pago</button>
            </div>
          </form>
        )}

        {paso === 3 && plan && (
          <>
            <dl className="reg-resumen">
              <div><dt>Plan</dt><dd>{plan.nombre}</dd></div>
              <div><dt>Gimnasio</dt><dd>{form.gimnasio.nombre.trim()}</dd></div>
              <div><dt>Administrador</dt><dd>{form.admin.correo.trim().toLowerCase()}</dd></div>
              <div><dt>Total hoy</dt><dd className="reg-total">{utils.money(plan.precio_mensual)}</dd></div>
            </dl>

            <p className="form-label-g">Método de pago</p>
            <div className="reg-metodos" role="radiogroup" aria-label="Método de pago">
              {METODOS.map((m) => (
                <button
                  key={m.valor}
                  type="button"
                  role="radio"
                  aria-checked={metodo === m.valor}
                  className={"reg-opcion reg-metodo" + (metodo === m.valor ? " sel" : "")}
                  onClick={() => setMetodo(m.valor)}
                  disabled={procesando}
                >
                  <i className={"bi " + m.icono} aria-hidden />
                  {m.etiqueta}
                </button>
              ))}
            </div>

            <p className="reg-aviso">
              <i className="bi bi-info-circle" aria-hidden /> Pago simulado: no se cobra nada ni se piden datos de tarjeta.
            </p>

            <div className="reg-acciones">
              <button className="btn-dark land-btn-lg" type="button" disabled={procesando} onClick={() => { setError(""); setPaso(2); }}>
                Atrás
              </button>
              <button className="btn-neon land-btn-lg" type="button" disabled={procesando} onClick={pagar}>
                {procesando ? "Procesando pago..." : `Pagar ${utils.money(plan.precio_mensual)}`}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
