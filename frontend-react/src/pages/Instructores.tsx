import { useEffect, useState } from "react";
import { api } from "../data/api";
import { utils } from "../lib/utils";
import type { Instructor } from "../types";

export function Instructores() {
  const [instructores, setInstructores] = useState<Instructor[]>([]);
  const [cargando, setCargando] = useState(true);

  // Carga la lista una sola vez, cuando la vista aparece en pantalla
  useEffect(() => {
    api.instructores.list().then((data) => {
      setInstructores(data);
      setCargando(false);
    });
  }, []);

  return (
    <div className="card-g">
      <div className="card-head">
        <div>
          <h2 className="card-title">Instructores</h2>
          <p className="card-sub">Gestiona el equipo de entrenadores del gimnasio</p>
        </div>
      </div>

      <div className="table-wrap">
        <table className="table-g">
          <thead>
            <tr>
              <th>Instructor</th><th>Identificación</th><th>Teléfono</th><th>Especialidad</th><th>Disponibilidad</th><th>Contratación</th><th>Estado</th>
            </tr>
          </thead>
          <tbody>
            {cargando ? (
              <tr><td colSpan={7} className="loader"><span className="spinner-g"></span>Cargando...</td></tr>
            ) : (
              instructores.map((i) => (
                <tr key={i.numero_identificacion}>
                  <td>
                    <div className="person">
                      <div className="person-avatar">{utils.iniciales(i.nombre, i.apellidos)}</div>
                      <div>
                        <div className="person-name">{i.nombre} {i.apellidos}</div>
                        <div className="person-sub">{i.correo}</div>
                      </div>
                    </div>
                  </td>
                  <td>{i.tipo_identificacion} {i.numero_identificacion}</td>
                  <td>{i.telefono}</td>
                  <td>{i.especialidad}</td>
                  <td>{i.disponibilidad}</td>
                  {/* "T00:00:00" hace que la fecha se lea en hora local; sin eso JS la toma en UTC y en Colombia sale un día antes */}
                  <td>{utils.fecha(i.fecha_contratacion + "T00:00:00")}</td>
                  <td><span className={"badge-g " + utils.badgeClass(i.estado)}>{i.estado}</span></td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
