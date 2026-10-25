import { useEffect, useState } from "react";
import { api } from "../data/api";
import { current } from "../lib/auth";
import { idealAHoy, resumenSesion } from "../lib/rutinas";
import { utils } from "../lib/utils";
import { AvanceRutina } from "../components/rutinas/AvanceRutina";
import { BadgeEstadoRutina } from "../components/rutinas/BadgeEstadoRutina";
import { FilaEjercicio } from "../components/rutinas/FilaEjercicio";
import { PestanasSesion } from "../components/rutinas/PestanasSesion";
import type { LetraSesion, Rutina } from "../types";

type DatosRutina = {
  rutina: Rutina;
  sesiones: Awaited<ReturnType<typeof api.rutinas.sesiones>>;
  avance: Awaited<ReturnType<typeof api.rutinas.avance>>;
  siguiente: LetraSesion | null;
  catalogo: Awaited<ReturnType<typeof api.ejercicios.list>>;
  instructor: Awaited<ReturnType<typeof api.instructores.get>>;
};

type Consulta =
  | { estado: "cargando" }
  | { estado: "error"; mensaje: string }
  | { estado: "sin-rutina" }
  | { estado: "lista"; datos: DatosRutina };

export function MiRutina() {
  const [sesion] = useState(current);
  const cedula = sesion?.numero_identificacion;
  const [consulta, setConsulta] = useState<Consulta>({ estado: "cargando" });
  const [activa, setActiva] = useState<LetraSesion>("A");

  useEffect(() => {
    let cancelado = false;

    async function cargar() {
      try {
        if (!cedula) throw new Error("No hay una sesión activa. Vuelve a iniciar sesión para consultar tu rutina.");

        const vigente = await api.rutinas.vigenteDeCliente(cedula);
        if (cancelado) return;
        // El historial solo se consulta para distinguir una rutina anterior de ninguna asignación.
        const rutina = vigente ?? (await api.rutinas.deCliente(cedula))[0];
        if (cancelado) return;
        if (!rutina) {
          setConsulta({ estado: "sin-rutina" });
          return;
        }

        const [sesiones, avance, siguiente, catalogo, instructor] = await Promise.all([
          api.rutinas.sesiones(rutina.id_rutina),
          api.rutinas.avance(rutina.id_rutina),
          api.rutinas.siguienteSesion(rutina.id_rutina),
          api.ejercicios.list(),
          api.instructores.get(rutina.id_instructor),
        ]);
        if (cancelado) return;
        setActiva(
          siguiente && sesiones.some((s) => s.sesion === siguiente)
            ? siguiente
            : sesiones[0]?.sesion ?? "A",
        );
        setConsulta({ estado: "lista", datos: { rutina, sesiones, avance, siguiente, catalogo, instructor } });
      } catch (error: unknown) {
        if (!cancelado) {
          setConsulta({
            estado: "error",
            mensaje: error instanceof Error ? error.message : "No se pudo cargar tu rutina. Inténtalo de nuevo más tarde.",
          });
        }
      }
    }

    void cargar();
    return () => {
      cancelado = true;
    };
  }, [cedula]);

  if (consulta.estado !== "lista") {
    return (
      <section className="card-g" aria-labelledby="mi-rutina-titulo">
        <div className="card-head">
          <h1 className="card-title" id="mi-rutina-titulo">Mi rutina</h1>
        </div>
        {consulta.estado === "cargando" && (
          <div className="loader" role="status">
            <span className="spinner-g" aria-hidden="true" />Cargando tu rutina…
          </div>
        )}
        {consulta.estado === "error" && (
          <div className="alert-g alert-error show" role="alert">{consulta.mensaje}</div>
        )}
        {consulta.estado === "sin-rutina" && (
          <p className="empty-state mb-0">
            Aún no tienes una rutina asignada. Acércate a un instructor para que te arme una.
          </p>
        )}
      </section>
    );
  }

  const { rutina, sesiones, avance, siguiente, catalogo, instructor } = consulta.datos;
  const estado = api.rutinas.estado(rutina);
  const vigente = estado === "VIGENTE" || estado === "POR_VENCER";
  const sesionActiva = sesiones.find((s) => s.sesion === activa);
  const aviso = estado === "VENCIDA"
    ? "Tu última rutina está vencida. Puedes consultarla aquí; acércate a un instructor para renovarla."
    : estado === "FINALIZADA"
      ? "Tu última rutina fue finalizada. Puedes consultarla aquí; acércate a un instructor para una nueva asignación."
      : estado === "POR_VENCER"
        ? "Tu rutina está por vencer. Consulta con tu instructor su próxima renovación."
        : null;

  return (
    <div className="d-flex flex-column gap-3">
      <section className="card-g" aria-labelledby="mi-rutina-titulo">
        <div className="card-head">
          <div>
            <p className="card-sub">Mi rutina</p>
            <h1 className="card-title" id="mi-rutina-titulo">{rutina.nombre}</h1>
            <p className="card-sub">{rutina.objetivo}</p>
          </div>
          <BadgeEstadoRutina estado={estado} />
        </div>
        {aviso && (
          <div className="alert-g show inst-alerta-info" role="status">
            <i className="bi bi-info-circle me-1" aria-hidden="true" />{aviso}
          </div>
        )}
        {rutina.descripcion && <p>{rutina.descripcion}</p>}
        <dl className="row mb-0">
          <div className="col-12 col-md-6 col-lg-4 mb-3">
            <dt className="card-sub">Instructor</dt>
            <dd className="mb-0">
              {instructor ? `${instructor.nombre} ${instructor.apellidos}` : "Instructor no disponible"}
            </dd>
          </div>
          <div className="col-12 col-md-6 col-lg-4 mb-3">
            <dt className="card-sub">Fecha de inicio</dt>
            <dd className="mb-0">{utils.fecha(rutina.fecha_creacion)}</dd>
          </div>
          <div className="col-12 col-md-6 col-lg-4 mb-3">
            <dt className="card-sub">Fecha de fin</dt>
            <dd className="mb-0">{rutina.fecha_fin ? utils.fecha(rutina.fecha_fin) : "Sin fecha de fin"}</dd>
          </div>
        </dl>
      </section>

      <section className="card-g" aria-labelledby="mi-rutina-avance">
        <div className="card-head">
          <h2 className="card-title" id="mi-rutina-avance">Mi avance</h2>
        </div>
        <AvanceRutina
          avance={avance}
          siguiente={vigente ? siguiente : null}
          ideal={vigente && (rutina.sesiones_planeadas ?? 0) > 0 ? idealAHoy(rutina) : null}
        />
      </section>

      <section className="card-g" aria-labelledby="mi-rutina-sesiones">
        <div className="card-head">
          <h2 className="card-title" id="mi-rutina-sesiones">Sesiones de la rutina</h2>
        </div>
        {sesiones.length === 0 ? (
          <p className="empty-state mb-0">
            Esta rutina aún no tiene sesiones definidas. Consulta con tu instructor.
          </p>
        ) : (
          <>
            <PestanasSesion
              pestanas={sesiones.map((s) => ({ sesion: s.sesion, resumen: resumenSesion(s.ejercicios, catalogo) }))}
              activa={activa}
              onCambiar={setActiva}
            />
            <div role="tabpanel" aria-label={`Ejercicios de la sesión ${activa}`}>
              {!sesionActiva?.ejercicios.length ? (
                <p className="empty-state mb-0">Esta sesión aún no tiene ejercicios asignados. Consulta con tu instructor.</p>
              ) : (
                <div className="inst-lista-ej">
                  {sesionActiva.ejercicios.map((fila) => (
                    <FilaEjercicio
                      key={fila.id_ejercicio}
                      fila={fila}
                      ejercicio={catalogo.find((e) => e.id_ejercicio === fila.id_ejercicio)}
                    />
                  ))}
                </div>
              )}
            </div>
          </>
        )}
      </section>
    </div>
  );
}
