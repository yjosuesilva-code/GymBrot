import { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { api } from "../data/api";
import { useTenant } from "../tenant/TenantContext"; // [multitenant-slug]
import { utils } from "../lib/utils";
import { AvatarInstructor } from "../components/instructores/AvatarInstructor"; // [P3] B5 · KAN-93
import { disponibilidadTexto, DIAS_ORDEN } from "../lib/horarios";
import { NOMBRE_TIPO_CITA, proximasCitas } from "../lib/citas"; // [P3] B6 · KAN-62
import { esActiva, idealAHoy, textoVigencia } from "../lib/rutinas"; // [P3] B6 · KAN-62
import { AvanceRutina } from "../components/rutinas/AvanceRutina";
import { BadgeEstadoRutina } from "../components/rutinas/BadgeEstadoRutina";
import { PersonaCliente } from "../components/rutinas/PersonaCliente";
import type { Instructor, DiaSemana, Cita, Cliente, FilaSupervision } from "../types";

const MAX_CITAS = 8; // próximas citas que se muestran en la agenda

const NOMBRE_DIA: Record<DiaSemana, string> = {
  LUNES: "Lunes",
  MARTES: "Martes",
  MIERCOLES: "Miércoles",
  JUEVES: "Jueves",
  VIERNES: "Viernes",
  SABADO: "Sábado",
  DOMINGO: "Domingo",
};

export function InstructorDetalle() {
  const { ruta } = useTenant(); // [multitenant-slug]
  // Lee el ":id" de la URL /instructores/:id (es el numero_identificacion)
  const { id } = useParams();

  const [instructor, setInstructor] = useState<Instructor | null>(null);
  const [cargando, setCargando] = useState(true);
  // [P3] B6 · KAN-62: agenda (próximas citas) y rutinas vigentes del instructor
  const [citas, setCitas] = useState<Cita[]>([]);
  const [rutinas, setRutinas] = useState<FilaSupervision[]>([]);
  const [clientes, setClientes] = useState<Cliente[]>([]);

  // Se vuelve a ejecutar si cambia el id de la URL
  useEffect(() => {
    if (!id) return;
    let activo = true;
    Promise.all([api.instructores.get(id), api.citas.list(), api.rutinas.listaSupervision(), api.clientes.list()]).then(
      ([i, ci, fi, cl]) => {
        if (!activo) return;
        setInstructor(i);
        setCitas(proximasCitas(ci, id));
        setRutinas(fi.filter((f) => f.rutina.id_instructor === id && esActiva(f)));
        setClientes(cl);
        setCargando(false);
      }
    );
    return () => {
      activo = false;
    };
  }, [id]);

  if (cargando) {
    return (
      <div className="card-g">
        <div className="loader"><span className="spinner-g"></span>Cargando...</div>
      </div>
    );
  }

  if (!instructor) {
    return (
      <div className="card-g">
        <Link to={ruta("/instructores")} className="btn-dark" style={{ textDecoration: "none" }}><i className="bi bi-arrow-left me-1" aria-hidden /> Volver</Link>
        <p className="empty-state">Instructor no encontrado</p>
      </div>
    );
  }

  const nombreCliente = (cedula: string) => {
    const c = clientes.find((x) => x.numero_identificacion === cedula);
    return c ? c.nombre + " " + c.apellidos : cedula;
  };

  // Filas de la ficha: [etiqueta, valor]. Se recorren con .map() más abajo
  const datos: [string, string][] = [
    ["Tipo de identificación", instructor.tipo_identificacion],
    ["Número de identificación", instructor.numero_identificacion],
    ["Teléfono", instructor.telefono],
    ["Correo", instructor.correo],
    ["Especialidad", instructor.especialidad],
    ["Disponibilidad", disponibilidadTexto(instructor.horario) || "—"],
    ["Fecha de contratación", utils.fecha(instructor.fecha_contratacion)],
  ];

  return (
    <>
      <div className="card-g">
        <Link to={ruta("/instructores")} className="btn-dark" style={{ textDecoration: "none" }}><i className="bi bi-arrow-left me-1" aria-hidden /> Volver</Link>
        <div className="person" style={{ marginTop: 16 }}>
          <AvatarInstructor key={instructor.foto ?? ""} nombre={instructor.nombre} apellidos={instructor.apellidos} foto={instructor.foto} grande />
          <div>
            <div className="person-name">{instructor.nombre} {instructor.apellidos}</div>
            <div className="person-sub">{instructor.especialidad} · {disponibilidadTexto(instructor.horario) || "Sin disponibilidad"}</div>
          </div>
          <span className={"badge-g " + utils.badgeClass(instructor.estado)} style={{ marginLeft: "auto" }}>
            {instructor.estado}
          </span>
        </div>
      </div>

      <div className="card-g">
        <h2 className="card-title">Datos del instructor</h2>
        <div className="table-wrap">
          <table className="table-g">
            <tbody>
              {datos.map(([etiqueta, valor]) => (
                <tr key={etiqueta}>
                  <th>{etiqueta}</th>
                  <td>{valor}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <div className="card-g">
        <h2 className="card-title">Horario semanal</h2>
        <div className="table-wrap">
          <table className="table-g">
            <thead>
              <tr><th>Día</th><th>Intervalos</th></tr>
            </thead>
            <tbody>
              {DIAS_ORDEN.map((dia) => {
                const ints = instructor.horario[dia] ?? [];
                return (
                  <tr key={dia}>
                    <th>{NOMBRE_DIA[dia]}</th>
                    <td>
                      {ints.length === 0
                        ? "-"
                        : ints.map((iv) => `${iv.desde} – ${iv.hasta}`).join(", ")}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* [P3] B6 · KAN-62: próximas citas (pendientes y confirmadas, desde ahora) */}
      <div className="card-g">
        <div className="card-head">
          <div>
            <h2 className="card-title">Agenda</h2>
            <p className="card-sub">Próximas citas pendientes y confirmadas</p>
          </div>
          <Link to={ruta("/citas")} className="inst-link">Ver citas</Link>
        </div>
        {citas.length === 0 ? (
          <p className="inst-auto-vacio">No tiene citas próximas.</p>
        ) : (
          <div className="inst-agenda">
            {citas.slice(0, MAX_CITAS).map((c) => (
              <div className="inst-agenda-fila" key={c.id_cita}>
                <div className="inst-agenda-fecha">
                  <strong>{c.hora}</strong>
                  <span className="card-sub">{utils.fecha(c.fecha)}</span>
                </div>
                <div className="inst-agenda-info">
                  <strong>{nombreCliente(c.id_cliente)}</strong>
                  <span className="card-sub">{NOMBRE_TIPO_CITA[c.tipo_cita]}{c.notas ? " · " + c.notas : ""}</span>
                </div>
                <span className={"badge-g badge-" + c.estado.toLowerCase()}>{c.estado.toLowerCase()}</span>
              </div>
            ))}
            {citas.length > MAX_CITAS && <p className="card-sub">Y {citas.length - MAX_CITAS} más en Citas.</p>}
          </div>
        )}
      </div>

      {/* [P3] B6 · KAN-62: rutinas vigentes con el avance de cada cliente */}
      <div className="card-g">
        <h2 className="card-title">Rutinas vigentes ({rutinas.length})</h2>
        {rutinas.length === 0 ? (
          <p className="inst-auto-vacio">No tiene rutinas vigentes.</p>
        ) : (
          <div className="inst-rutinas-grid">
            {rutinas.map((f) => (
              <div className="inst-rutina-tarjeta" key={f.rutina.id_rutina}>
                <div className="inst-rutina-tarjeta-cabeza">
                  <PersonaCliente cliente={clientes.find((c) => c.numero_identificacion === f.rutina.id_cliente)} cedula={f.rutina.id_cliente} />
                  <BadgeEstadoRutina estado={f.estado} />
                </div>
                <div className="card-sub">{f.rutina.nombre} · {textoVigencia(f.rutina, f.estado)}</div>
                <div className="inst-avance-compacto">
                  <AvanceRutina avance={f.avance} ideal={idealAHoy(f.rutina)} siguiente={f.siguiente} tamano={88} />
                </div>
                <Link to={ruta("/rutinas/" + f.rutina.id_rutina)} className="inst-link">Ver rutina</Link>
              </div>
            ))}
          </div>
        )}
      </div>
    </>
  );
}
