import { useRef, useState } from "react";
import { utils } from "../../lib/utils";
import type { Ejercicio, LetraSesion, RegistroEntrenamiento } from "../../types";
import { Paginador } from "../Paginador";
import { DetalleEntrenamiento } from "./DetalleEntrenamiento";
import { EvolucionEjercicio } from "./EvolucionEjercicio";
import {
  filtrarYOrdenarRegistrosRutina,
  resolverEjercicioHistorial,
} from "./historialEntrenamiento";
import type { AmbitoHistorialCliente } from "./historialEntrenamiento";

const POR_PAGINA = 6;

type Props = {
  ambito: AmbitoHistorialCliente;
  division: LetraSesion[];
  registros: RegistroEntrenamiento[];
  catalogo: Ejercicio[];
  estadoCarga?: "lista" | "cargando" | "error";
  onReintentar?: () => void;
};

function resumenNombresEjercicios(
  registro: RegistroEntrenamiento,
  catalogo: Ejercicio[],
): string {
  const lista = Array.isArray(registro.ejercicios_realizados)
    ? registro.ejercicios_realizados
    : [];
  if (lista.length === 0) return "";
  const nombres = lista
    .slice(0, 3)
    .map((e) => resolverEjercicioHistorial(e.id_ejercicio, catalogo).nombre);
  const restantes = lista.length - nombres.length;
  return restantes > 0 ? `${nombres.join(", ")} y ${restantes} más` : nombres.join(", ");
}

export function HistorialEntrenamientos({
  ambito,
  division,
  registros,
  catalogo,
  estadoCarga = "lista",
  onReintentar,
}: Props) {
  const registrosOrdenados = filtrarYOrdenarRegistrosRutina(registros, ambito);
  const [filtroSesion, setFiltroSesion] = useState<LetraSesion | "TODAS">("TODAS");
  const [pagina, setPagina] = useState(1);
  const [registroAbiertoId, setRegistroAbiertoId] = useState<number | null>(() => {
    const primeroConEjercicios = registrosOrdenados.find(
      (r) => Array.isArray(r.ejercicios_realizados) && r.ejercicios_realizados.length > 0,
    );
    return (primeroConEjercicios ?? registrosOrdenados[0])?.id_registro ?? null;
  });
  const [ejercicioEvolucionId, setEjercicioEvolucionId] = useState<number | null>(null);
  const tituloEvolucionRef = useRef<HTMLHeadingElement>(null);

  const sesionesDisponibles: LetraSesion[] = Array.from(
    new Set([
      ...division,
      ...registrosOrdenados.map((r) => r.sesion),
    ]),
  );

  const registrosFiltrados =
    filtroSesion === "TODAS"
      ? registrosOrdenados
      : registrosOrdenados.filter((r) => r.sesion === filtroSesion);

  const totalPaginas = Math.max(1, Math.ceil(registrosFiltrados.length / POR_PAGINA));
  const paginaSegura = Math.min(pagina, totalPaginas);
  const registrosPagina = registrosFiltrados.slice(
    (paginaSegura - 1) * POR_PAGINA,
    paginaSegura * POR_PAGINA,
  );

  function cambiarFiltroSesion(nuevo: LetraSesion | "TODAS") {
    setFiltroSesion(nuevo);
    setPagina(1);
  }

  function alternarDetalle(idRegistro: number) {
    setRegistroAbiertoId((actual) => (actual === idRegistro ? null : idRegistro));
  }

  function irAEvolucionDeEjercicio(idEjercicio: number) {
    setEjercicioEvolucionId(idEjercicio);
    tituloEvolucionRef.current?.focus();
    tituloEvolucionRef.current?.scrollIntoView({
      behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches ? "instant" : "smooth",
      block: "start",
    });
  }

  return (
    <>
      <section className="card-g cli-historial-panel" aria-labelledby="cli-historial-titulo">
        <div className="card-head cli-historial-cabecera">
          <div>
            <h2 className="card-title mb-0" id="cli-historial-titulo">
              Historial de entrenamientos
            </h2>
            <p className="card-sub">
              {registrosOrdenados.length === 0
                ? "Tus sesiones finalizadas aparecerán aquí"
                : `${registrosOrdenados.length} ${
                    registrosOrdenados.length === 1
                      ? "entrenamiento registrado"
                      : "entrenamientos registrados"
                  } · del más reciente al más antiguo`}
            </p>
          </div>

          {registrosOrdenados.length > 0 && sesionesDisponibles.length > 1 && (
            <div
              className="cli-historial-filtros"
              role="group"
              aria-label="Filtrar historial por sesión"
            >
              <button
                type="button"
                className={`btn-dark cli-hist-filtro ${filtroSesion === "TODAS" ? "cli-hist-filtro--activo" : ""}`}
                aria-pressed={filtroSesion === "TODAS"}
                onClick={() => cambiarFiltroSesion("TODAS")}
              >
                Todas ({registrosOrdenados.length})
              </button>
              {sesionesDisponibles.map((letra) => {
                const cuenta = registrosOrdenados.filter((r) => r.sesion === letra).length;
                if (cuenta === 0) return null;
                const activo = filtroSesion === letra;
                return (
                  <button
                    key={letra}
                    type="button"
                    className={`btn-dark cli-hist-filtro ${activo ? "cli-hist-filtro--activo" : ""}`}
                    aria-pressed={activo}
                    onClick={() => cambiarFiltroSesion(letra)}
                  >
                    Sesión {letra} ({cuenta})
                  </button>
                );
              })}
            </div>
          )}
        </div>

        {estadoCarga === "cargando" ? (
          <p className="cli-ent-secundario mb-0" role="status">
            <i className="bi bi-hourglass-split me-2" aria-hidden="true" />
            Cargando historial de entrenamientos…
          </p>
        ) : estadoCarga === "error" ? (
          <div className="cli-ent-error">
            <p role="alert" className="mb-2">
              No pudimos cargar el historial de entrenamientos de tu rutina.
            </p>
            {onReintentar && (
              <button type="button" className="btn-dark cli-ent-boton" onClick={onReintentar}>
                Reintentar carga del historial
              </button>
            )}
          </div>
        ) : registrosOrdenados.length === 0 ? (
          <p className="empty-state mb-0">
            Todavía no has registrado entrenamientos en esta rutina. Cuando finalices tu primera sesión, podrás revisar aquí tus ejercicios y series.
          </p>
        ) : registrosFiltrados.length === 0 ? (
          <div className="cli-cambio-vacio">
            <p className="empty-state mb-2">
              No hay entrenamientos registrados para la Sesión {filtroSesion}.
            </p>
            <button
              type="button"
              className="btn-dark cli-ent-boton"
              onClick={() => cambiarFiltroSesion("TODAS")}
            >
              Ver todas las sesiones
            </button>
          </div>
        ) : (
          <>
            <ol
              className="cli-hist-lista"
              aria-label="Sesiones de entrenamiento registradas"
            >
              {registrosPagina.map((reg) => {
                const cantidadEjercicios = Array.isArray(reg.ejercicios_realizados)
                  ? reg.ejercicios_realizados.length
                  : 0;
                const abierto = registroAbiertoId === reg.id_registro;
                const panelId = `cli-hist-detalle-${reg.id_registro}`;
                const nombresResumen = resumenNombresEjercicios(reg, catalogo);

                return (
                  <li
                    key={reg.id_registro}
                    className={`cli-hist-item ${abierto ? "cli-hist-item--abierto" : ""}`}
                  >
                    <div className="cli-hist-item-fila">
                      <div className="cli-hist-item-info">
                        <div className="cli-hist-item-encabezado">
                          <span className="cli-hist-sesion">Sesión <strong>{reg.sesion}</strong></span>
                          <div className="cli-hist-fecha-datos">
                            <h3 className="cli-hist-item-fecha mb-0">
                              <time dateTime={reg.fecha}>{utils.fecha(reg.fecha)}</time>
                            </h3>
                            <span className="badge-g cli-hist-cantidad">
                              {cantidadEjercicios > 0
                                ? `${cantidadEjercicios} ${
                                    cantidadEjercicios === 1
                                      ? "ejercicio registrado"
                                      : "ejercicios registrados"
                                  }`
                                : "Sesión sin desglose de ejercicios"}
                            </span>
                          </div>
                        </div>

                        {nombresResumen && (
                          <p className="cli-hist-item-ejercicios mb-0">{nombresResumen}</p>
                        )}

                        {reg.notas && reg.notas.trim() !== "" && (
                          <div className="cli-hist-item-notas">
                            <span className="cli-hist-notas-etiqueta">
                              <i className="bi bi-chat-left-text" aria-hidden="true" />Notas de la sesión
                            </span>
                            <p className="mb-0">{reg.notas}</p>
                          </div>
                        )}
                      </div>

                      <div className="cli-hist-item-acciones">
                        <button
                          type="button"
                          className="btn-dark cli-ent-boton cli-hist-btn-detalle"
                          aria-expanded={abierto}
                          aria-controls={panelId}
                          aria-label={`${
                            abierto ? "Ocultar" : "Ver"
                          } detalle del entrenamiento del ${utils.fecha(reg.fecha)}, sesión ${reg.sesion}`}
                          onClick={() => alternarDetalle(reg.id_registro)}
                        >
                          <i
                            className={`bi ${abierto ? "bi-chevron-up" : "bi-chevron-down"} me-2`}
                            aria-hidden="true"
                          />
                          <span>{abierto ? "Ocultar detalle" : "Ver ejercicios y series"}</span>
                        </button>
                      </div>
                    </div>

                    {abierto && (
                      <div id={panelId} className="cli-hist-item-cuerpo">
                        <DetalleEntrenamiento
                          registro={reg}
                          catalogo={catalogo}
                          onVerEvolucion={irAEvolucionDeEjercicio}
                        />
                      </div>
                    )}
                  </li>
                );
              })}
            </ol>

            <Paginador
              pagina={paginaSegura}
              total={registrosFiltrados.length}
              porPagina={POR_PAGINA}
              onCambiar={setPagina}
            />
          </>
        )}
      </section>

      <section className="card-g cli-evolucion-panel" aria-labelledby="cli-evolucion-titulo">
        <div className="card-head">
          <div>
            <h2
              className="card-title cli-ent-titulo mb-0"
              id="cli-evolucion-titulo"
              ref={tituloEvolucionRef}
              tabIndex={-1}
            >
              Evolución de cargas
            </h2>
            <p className="card-sub">
              Progresión histórica de peso, repeticiones o duración en los ejercicios que has registrado
            </p>
          </div>
        </div>

        {estadoCarga === "cargando" ? (
          <p className="cli-ent-secundario mb-0" role="status">
            <i className="bi bi-hourglass-split me-2" aria-hidden="true" />
            Cargando evolución por ejercicio…
          </p>
        ) : estadoCarga === "error" ? (
          <div className="cli-ent-error">
            <p role="alert" className="mb-2">
              No pudimos consultar los registros para calcular la evolución de cargas.
            </p>
            {onReintentar && (
              <button type="button" className="btn-dark cli-ent-boton" onClick={onReintentar}>
                Reintentar
              </button>
            )}
          </div>
        ) : (
          <EvolucionEjercicio
            registros={registrosOrdenados}
            catalogo={catalogo}
            ejercicioSeleccionadoId={ejercicioEvolucionId}
            onSeleccionarEjercicio={setEjercicioEvolucionId}
          />
        )}
      </section>
    </>
  );
}
