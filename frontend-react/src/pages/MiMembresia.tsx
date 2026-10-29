import { useEffect, useReducer, useState } from "react";
import { Link } from "react-router-dom";
import { Paginador } from "../components/Paginador";
import { claseEstadoMembresia, seleccionarMembresiaResumen } from "../components/cliente/dashboardCliente";
import type { ResumenMembresiaCliente } from "../components/cliente/dashboardCliente";
import {
  cargarDatosMiMembresia,
  filtrarYOrdenarPagosCliente,
  formatearMetodoPago,
  formatearModalidadPago,
  resolverBeneficiosPlan,
  separarMembresiasCliente,
} from "../components/cliente/miMembresia";
import { api } from "../data/api";
import { current } from "../lib/auth";
import { estadoMembresiaPorFecha } from "../lib/membresias";
import { utils } from "../lib/utils";
import { useTenantOpcional } from "../tenant/TenantContext";
import type { Cliente, Membresia, Pago, PlanMembresia } from "../types";

const POR_PAGINA_PAGOS = 5;
const POR_PAGINA_HISTORIAL = 5;

type EstadoCarga =
  | { estado: "cargando" }
  | { estado: "sin-sesion"; mensaje: string }
  | { estado: "error"; mensaje: string }
  | {
      estado: "listo";
      idCliente: string;
      gimnasioId: string;
      cliente: Cliente;
      membresias: Membresia[];
      planes: PlanMembresia[];
      pagos: Pago[];
    };

export function MiMembresia() {
  const [sesion, setSesion] = useState(current);
  const tenant = useTenantOpcional();
  const cedula = sesion?.numero_identificacion;
  const gimnasioId = tenant?.gimnasio.gimnasio_id ?? sesion?.gimnasio_id;

  useEffect(() => {
    const actualizar = () => setSesion(current());
    const alCambiarStorage = (evento: StorageEvent) => {
      if (evento.key === "gymbrot_session" || evento.key === null) actualizar();
    };
    window.addEventListener("storage", alCambiarStorage);
    window.addEventListener("focus", actualizar);
    return () => {
      window.removeEventListener("storage", alCambiarStorage);
      window.removeEventListener("focus", actualizar);
    };
  }, []);

  return (
    <ContenidoMiMembresia
      key={JSON.stringify([gimnasioId, cedula, sesion?.tipo_usuario])}
      cedula={cedula}
      gimnasioId={gimnasioId}
      esCliente={sesion?.tipo_usuario === "CLIENTE"}
    />
  );
}

function ContenidoMiMembresia({
  cedula,
  gimnasioId,
  esCliente,
}: {
  cedula: string | undefined;
  gimnasioId: string | undefined;
  esCliente: boolean;
}) {
  const tenant = useTenantOpcional();
  const ruta = (path: string) => (tenant ? tenant.ruta(path) : path);
  const [consulta, setConsulta] = useState<EstadoCarga>({ estado: "cargando" });
  const [recarga, forzarRecarga] = useReducer((n: number) => n + 1, 0);

  const [paginaPagos, setPaginaPagos] = useState(1);
  const [paginaHistorial, setPaginaHistorial] = useState(1);

  useEffect(() => {
    let cancelado = false;

    async function cargar() {
      if (!cedula || !gimnasioId || !esCliente) {
        setConsulta({
          estado: "sin-sesion",
          mensaje:
            "No hay una sesión activa de cliente. Vuelve a iniciar sesión para consultar tu membresía.",
        });
        return;
      }

      setConsulta({ estado: "cargando" });

      try {
        const datos = await cargarDatosMiMembresia(api, cedula, gimnasioId);

        if (cancelado) return;

        setConsulta({
          estado: "listo",
          idCliente: cedula,
          gimnasioId,
          ...datos,
        });
      } catch (err: unknown) {
        if (cancelado) return;
        setConsulta({
          estado: "error",
          mensaje:
            err instanceof Error
              ? err.message
              : "No pudimos cargar la información de tu membresía. Intenta de nuevo más tarde.",
        });
      }
    }

    void cargar();
    return () => {
      cancelado = true;
    };
  }, [cedula, gimnasioId, esCliente, recarga]);

  if (consulta.estado === "sin-sesion") {
    return (
      <section className="card-g cli-dashboard cli-mi-membresia" aria-labelledby="cli-membresia-titulo">
        <div className="card-head">
          <h1 className="card-title mb-0" id="cli-membresia-titulo">
            Mi membresía
          </h1>
        </div>
        <div className="alert-g alert-error show" role="alert">
          {consulta.mensaje}
        </div>
        <Link to={ruta("/login")} className="btn-dark cli-ent-boton">
          Iniciar sesión
        </Link>
      </section>
    );
  }

  if (consulta.estado === "cargando") {
    return (
      <section className="card-g cli-dashboard cli-mi-membresia" aria-labelledby="cli-membresia-titulo">
        <div className="card-head">
          <h1 className="card-title mb-0" id="cli-membresia-titulo">
            Mi membresía
          </h1>
        </div>
        <div className="loader" role="status">
          <span className="spinner-g" aria-hidden="true" />
          Cargando datos de tu membresía…
        </div>
      </section>
    );
  }

  if (consulta.estado === "error") {
    return (
      <section className="card-g cli-dashboard cli-mi-membresia" aria-labelledby="cli-membresia-titulo">
        <div className="card-head">
          <h1 className="card-title mb-0" id="cli-membresia-titulo">
            Mi membresía
          </h1>
        </div>
        <div className="cli-ent-error">
          <p role="alert" className="mb-2">
            {consulta.mensaje}
          </p>
          <button type="button" className="btn-dark cli-ent-boton" onClick={forzarRecarga}>
            Reintentar carga
          </button>
        </div>
      </section>
    );
  }

  const { idCliente, gimnasioId: gymId, cliente, membresias, planes, pagos } = consulta;
  const hoy = utils.isoDate();

  const resumen: ResumenMembresiaCliente | null = seleccionarMembresiaResumen({
    membresias,
    cliente,
    idCliente,
    gimnasioId: gymId,
    hoy,
  });

  const beneficios = resumen
    ? resolverBeneficiosPlan(resumen.membresia.id_plan, planes)
    : [];

  const pagosCliente = filtrarYOrdenarPagosCliente(pagos, idCliente, gymId);
  const totalPaginasPagos = Math.max(1, Math.ceil(pagosCliente.length / POR_PAGINA_PAGOS));
  const paginaSeguraPagos = Math.min(paginaPagos, totalPaginasPagos);
  const pagosPaginados = pagosCliente.slice(
    (paginaSeguraPagos - 1) * POR_PAGINA_PAGOS,
    paginaSeguraPagos * POR_PAGINA_PAGOS,
  );

  const membresiasAnteriores = separarMembresiasCliente(
    membresias,
    idCliente,
    gymId,
    resumen?.membresia.id_membresia,
  );
  const totalPaginasHistorial = Math.max(
    1,
    Math.ceil(membresiasAnteriores.length / POR_PAGINA_HISTORIAL),
  );
  const paginaSeguraHistorial = Math.min(paginaHistorial, totalPaginasHistorial);
  const membresiasPaginadas = membresiasAnteriores.slice(
    (paginaSeguraHistorial - 1) * POR_PAGINA_HISTORIAL,
    paginaSeguraHistorial * POR_PAGINA_HISTORIAL,
  );

  return (
    <div className="cli-dashboard cli-mi-membresia d-flex flex-column gap-3">
      {/* 1. ENCABEZADO */}
      <header className="card-g cli-dash-bienvenida" aria-labelledby="cli-membresia-titulo">
        <div className="cli-dash-bienvenida-fila">
          <div>
            <p className="cli-dash-eyebrow mb-1">
              <i className="bi bi-ticket-perforated me-1" aria-hidden="true" />
              Afiliación al gimnasio
            </p>
            <h1 className="card-title cli-dash-saludo mb-1" id="cli-membresia-titulo">
              Mi membresía
            </h1>
            <p className="card-sub mb-0">
              Consulta el estado de tu plan contratado, beneficios e historial de pagos.
            </p>
          </div>

          <div className="d-flex align-items-center gap-2 flex-wrap">
            <Link to={ruta("/mi-dashboard")} className="btn-dark cli-ent-boton">
              <i className="bi bi-arrow-left me-1" aria-hidden="true" />
              Volver al inicio
            </Link>
          </div>
        </div>
      </header>

      {/* 2. ESTADO DE LA MEMBRESÍA (TARJETA PRINCIPAL) */}
      <section
        className="card-g cli-proximo cli-membresia-principal"
        aria-labelledby="cli-membresia-actual-titulo"
      >
        <div className="card-head cli-dash-entrenamiento-head mb-2">
          <div>
            <h2 className="card-title mb-0" id="cli-membresia-actual-titulo">
              {resumen?.estadoEfectivo === "PROGRAMADA" ? "Próxima membresía" : "Plan actual"}
            </h2>
            <p className="card-sub mb-0">Detalle de tu afiliación y vigencia registrada</p>
          </div>

          {resumen && (
            <span
              className={`badge-g ${claseEstadoMembresia(resumen.estadoEfectivo)}`}
            >
              {resumen.etiquetaEstado}
            </span>
          )}
        </div>

        {!resumen ? (
          <div className="cli-proximo-cuerpo">
            <div className="cli-proximo-mensaje">
              <p className="cli-proximo-propuesta mb-1">
                No tienes una membresía activa en este gimnasio.
              </p>
              <p className="cli-ent-secundario">
                Para acceder a las instalaciones y disfrutar de tu plan de entrenamiento, acércate a la recepción y adquiere tu afiliación.
              </p>
            </div>
          </div>
        ) : (
          <div className="cli-proximo-cuerpo">
            <div className="cli-proximo-mensaje">
              <div className="d-flex align-items-baseline gap-2 flex-wrap mb-1">
                <span className="cli-dash-resumen-principal fs-4">
                  {resumen.membresia.tipo_membresia}
                </span>
                <span className="badge-g cli-hist-cantidad">
                  {formatearModalidadPago(resumen.membresia.modalidad_pago)}
                </span>
                <span className="cli-dash-chip ms-auto">
                  <i className="bi bi-cash-stack" aria-hidden="true" />
                  Valor contratado: <strong>{utils.money(resumen.membresia.valor)}</strong>
                </span>
              </div>

              {resumen.estadoEfectivo === "POR_VENCER" && (
                <div className="alert-g show inst-alerta-info mb-2" role="status">
                  <i className="bi bi-exclamation-triangle-fill me-2" aria-hidden="true" />
                  Tu membresía está próxima a vencer ({resumen.textoVigencia}). Puedes renovarla directamente en la recepción del gimnasio.
                </div>
              )}

              {resumen.estadoEfectivo === "PROGRAMADA" && (
                <div className="alert-g show inst-alerta-info mb-2" role="status">
                  Tu membresía aún no ha comenzado: {resumen.textoVigencia.toLocaleLowerCase("es")}.
                </div>
              )}

              {resumen.estadoEfectivo === "VENCIDA" && (
                <div className="alert-g alert-error show mb-2" role="alert">
                  <i className="bi bi-x-circle-fill me-2" aria-hidden="true" />
                  Tu membresía venció ({resumen.textoVigencia}). Para ingresar nuevamente a las instalaciones, solicita su renovación en recepción.
                </div>
              )}

              {resumen.estadoEfectivo === "CUENTA_INACTIVA" && (
                <div className="alert-g alert-error show mb-2" role="alert">
                  <i className="bi bi-person-x-fill me-2" aria-hidden="true" />
                  Tu cuenta de usuario se encuentra en estado {cliente?.estado ?? "inactivo"}. Acércate a recepción para reactivar tu acceso.
                </div>
              )}

              {resumen.estadoEfectivo === "CANCELADA" && (
                <div className="alert-g show inst-alerta-info mb-2" role="status">
                  <i className="bi bi-info-circle-fill me-2" aria-hidden="true" />
                  Esta membresía fue cancelada o sustituida por una nueva renovación.
                </div>
              )}

              <dl className="cli-dash-dl mt-2">
                <div className="cli-dash-dl-item">
                  <dt>Fecha de inicio</dt>
                  <dd>
                    <time dateTime={resumen.membresia.fecha_inicio}>
                      {utils.fecha(resumen.membresia.fecha_inicio)}
                    </time>
                  </dd>
                </div>
                <div className="cli-dash-dl-item">
                  <dt>Fecha de vencimiento</dt>
                  <dd>
                    <time dateTime={resumen.membresia.fecha_vencimiento}>
                      {utils.fecha(resumen.membresia.fecha_vencimiento)}
                    </time>
                  </dd>
                </div>
                <div className="cli-dash-dl-item">
                  <dt>Vigencia restante</dt>
                  <dd>{resumen.textoVigencia}</dd>
                </div>
                <div className="cli-dash-dl-item">
                  <dt>Modalidad de cobro</dt>
                  <dd>{formatearModalidadPago(resumen.membresia.modalidad_pago)}</dd>
                </div>
              </dl>
            </div>
          </div>
        )}
      </section>

      {/* 3. BENEFICIOS DEL PLAN */}
      <section className="card-g cli-dash-card" aria-labelledby="cli-beneficios-titulo">
        <div className="card-head cli-dash-card-head mb-2">
          <div>
            <h2 className="card-title mb-0" id="cli-beneficios-titulo">
              Beneficios de tu plan
            </h2>
            <p className="card-sub mb-0">Servicios e instalaciones incluidos en tu afiliación</p>
          </div>
        </div>

        <div className="cli-dash-card-body">
          {!resumen ? (
            <p className="cli-ent-secundario mb-0">
              Cuando tengas una membresía activa, podrás consultar aquí los beneficios incluidos en tu plan.
            </p>
          ) : beneficios.length === 0 ? (
            <div className="cli-proximo-mensaje">
              <p className="cli-ent-secundario mb-0">
                No hay una lista de beneficios detallada registrada para este plan en el catálogo del gimnasio. Consulta en recepción los servicios e instalaciones disponibles.
              </p>
            </div>
          ) : (
            <div className="cli-beneficios-contenedor">
              <ul className="cli-beneficios-lista" aria-label="Lista de beneficios del plan">
                {beneficios.map((beneficio, idx) => (
                  <li key={idx} className="cli-beneficio-item">
                    <i className="bi bi-check-circle-fill me-2" aria-hidden="true" />
                    <span>{beneficio}</span>
                  </li>
                ))}
              </ul>
              <p className="cli-ent-secundario mt-2 mb-0">
                Beneficios correspondientes al plan «{resumen.membresia.tipo_membresia}» según las políticas del gimnasio.
              </p>
            </div>
          )}
        </div>
      </section>

      {/* 4. MIS PAGOS */}
      <section className="card-g cli-dash-card" aria-labelledby="cli-pagos-titulo">
        <div className="card-head cli-dash-card-head mb-2">
          <div>
            <h2 className="card-title mb-0" id="cli-pagos-titulo">
              Mis pagos
            </h2>
            <p className="card-sub mb-0">
              {pagosCliente.length === 0
                ? "Tus transacciones y recibos de pago"
                : `${pagosCliente.length} ${
                    pagosCliente.length === 1 ? "pago registrado" : "pagos registrados"
                  } · ordenados del más reciente al más antiguo`}
            </p>
          </div>
        </div>

        <div className="cli-dash-card-body">
          {pagosCliente.length === 0 ? (
            <p className="empty-state mb-0">
              Aún no tienes registros de pagos en tu cuenta de este gimnasio.
            </p>
          ) : (
            <>
              <div className="table-wrap" role="region" aria-labelledby="cli-pagos-titulo" tabIndex={0}>
                <table className="table-g cli-pagos-tabla">
                  <caption className="visually-hidden">Historial de pagos del cliente</caption>
                  <thead>
                    <tr>
                      <th scope="col">Fecha</th>
                      <th scope="col">Monto</th>
                      <th scope="col">Método</th>
                      <th scope="col">Estado</th>
                      <th scope="col">Referencia</th>
                      <th scope="col">Observaciones</th>
                    </tr>
                  </thead>
                  <tbody>
                    {pagosPaginados.map((p) => (
                      <tr key={p.id_pago}>
                        <td>
                          <time dateTime={p.fecha_pago}>{utils.fecha(p.fecha_pago)}</time>
                        </td>
                        <td className="fw-bold">{utils.money(p.valor)}</td>
                        <td>{formatearMetodoPago(p.metodo_pago)}</td>
                        <td>
                          <span className={`badge-g ${utils.badgeClass(p.estado_pago)}`}>
                            {p.estado_pago}
                          </span>
                        </td>
                        <td className="font-monospace small">
                          {p.referencia_transaccion ? p.referencia_transaccion : "—"}
                        </td>
                        <td className="small">{p.observaciones || "—"}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <Paginador
                pagina={paginaSeguraPagos}
                total={pagosCliente.length}
                porPagina={POR_PAGINA_PAGOS}
                onCambiar={(p) => setPaginaPagos(p)}
              />
            </>
          )}
        </div>
      </section>

      {/* 5. HISTORIAL DE MEMBRESÍAS */}
      <section className="card-g cli-dash-card" aria-labelledby="cli-historial-membresias-titulo">
        <div className="card-head cli-dash-card-head mb-2">
          <div>
            <h2 className="card-title mb-0" id="cli-historial-membresias-titulo">
              Otras membresías
            </h2>
            <p className="card-sub mb-0">
              {membresiasAnteriores.length === 0
                ? "Historial y próximas afiliaciones, sin incluir el plan mostrado arriba"
                : `${membresiasAnteriores.length} ${
                    membresiasAnteriores.length === 1
                      ? "membresía adicional registrada"
                      : "membresías adicionales registradas"
                  }`}
            </p>
          </div>
        </div>

        <div className="cli-dash-card-body">
          {membresiasAnteriores.length === 0 ? (
            <p className="empty-state mb-0">
              No tienes otras membresías registradas en este gimnasio.
            </p>
          ) : (
            <>
              <div className="table-wrap" role="region" aria-labelledby="cli-historial-membresias-titulo" tabIndex={0}>
                <table className="table-g cli-membresias-ant-tabla">
                  <caption className="visually-hidden">Otras membresías del cliente</caption>
                  <thead>
                    <tr>
                      <th scope="col">Plan</th>
                      <th scope="col">Modalidad</th>
                      <th scope="col">Vigencia</th>
                      <th scope="col">Valor</th>
                      <th scope="col">Estado</th>
                    </tr>
                  </thead>
                  <tbody>
                    {membresiasPaginadas.map((m) => {
                      const estado = estadoMembresiaPorFecha(m, hoy);
                      return (
                        <tr key={m.id_membresia}>
                          <td className="fw-bold">{m.tipo_membresia}</td>
                          <td>{formatearModalidadPago(m.modalidad_pago)}</td>
                          <td>
                            <time dateTime={m.fecha_inicio}>{utils.fecha(m.fecha_inicio)}</time>
                            {" – "}
                            <time dateTime={m.fecha_vencimiento}>
                              {utils.fecha(m.fecha_vencimiento)}
                            </time>
                          </td>
                          <td>{utils.money(m.valor)}</td>
                          <td>
                            <span className={`badge-g ${utils.badgeClass(estado === "PROGRAMADA" ? "PENDIENTE" : estado)}`}>
                              {estado}
                            </span>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              <Paginador
                pagina={paginaSeguraHistorial}
                total={membresiasAnteriores.length}
                porPagina={POR_PAGINA_HISTORIAL}
                onCambiar={(p) => setPaginaHistorial(p)}
              />
            </>
          )}
        </div>
      </section>
    </div>
  );
}
