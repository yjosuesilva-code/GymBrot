import { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { api } from "../data/api";
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

  return (
    <div className="card-g">
      <Link to="/instructores" className="btn-dark" style={{ textDecoration: "none" }}>← Volver</Link>
      {/* Parte 2: aquí van todos los datos del instructor */}
      <h2 className="card-title" style={{ marginTop: 16 }}>
        {instructor.nombre} {instructor.apellidos}
      </h2>
    </div>
  );
}
