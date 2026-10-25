import { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { api } from "../data/api";
import { useTenant } from "../tenant/TenantContext"; // [multitenant-slug]
import { utils } from "../lib/utils";
import { AvatarInstructor } from "../components/instructores/AvatarInstructor"; // [P3] B5 · KAN-93
import { disponibilidadTexto, DIAS_ORDEN } from "../lib/horarios";
import type { Instructor, DiaSemana } from "../types";

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

  // Se vuelve a ejecutar si cambia el id de la URL
  useEffect(() => {
    if (!id) return;
    api.instructores.get(id).then((i) => {
      setInstructor(i);
      setCargando(false);
    });
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
    </>
  );
}
