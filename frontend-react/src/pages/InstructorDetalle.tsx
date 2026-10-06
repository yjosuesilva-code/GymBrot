import { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { api } from "../data/api";
import { utils } from "../lib/utils";
import type { Instructor } from "../types";

export function InstructorDetalle() {
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
        <Link to="/instructores" className="btn-dark" style={{ textDecoration: "none" }}>← Volver</Link>
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
    ["Disponibilidad", instructor.disponibilidad],
    ["Fecha de contratación", utils.fecha(instructor.fecha_contratacion)],
  ];

  return (
    <>
      <div className="card-g">
        <Link to="/instructores" className="btn-dark" style={{ textDecoration: "none" }}>← Volver</Link>
        <div className="person" style={{ marginTop: 16 }}>
          <div className="person-avatar">{utils.iniciales(instructor.nombre, instructor.apellidos)}</div>
          <div>
            <div className="person-name">{instructor.nombre} {instructor.apellidos}</div>
            <div className="person-sub">{instructor.especialidad} · {instructor.disponibilidad}</div>
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
    </>
  );
}
