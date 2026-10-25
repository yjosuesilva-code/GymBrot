import { useEffect, useState } from "react";
import { Link, useNavigate, useParams, useSearchParams } from "react-router-dom";
import { api } from "../data/api";
import { useTenant } from "../tenant/TenantContext";
import { instructorEnSesion } from "../lib/sesionInstructor";
import { ConstructorRutina } from "../components/rutinas/ConstructorRutina";
import type { DatosRutina, RutinaInicial } from "../components/rutinas/ConstructorRutina";
import type { Cliente, Ejercicio, Instructor, SesionEjercicioNuevo } from "../types";

/* [P3] Página del constructor (KAN-56): /rutinas/nueva y /rutinas/:id/editar.
   Carga los datos, se los pasa a <ConstructorRutina> y guarda con la API:
   crear/actualizar la rutina y después guardar sus sesiones.
   ?cliente=<cédula> preselecciona el cliente (botón "Asignar rutina" de la supervisión).
   B3 · KAN-92: si entra un instructor, queda fijo como instructor de la rutina y solo puede
   editar las suyas. */
export function RutinaEditor() {
  const { ruta } = useTenant();
  const navigate = useNavigate();
  const { id } = useParams();
  const [params] = useSearchParams();
  const idRutina = id ? Number(id) : null;
  const cedulaInicial = params.get("cliente");

  const [cargando, setCargando] = useState(true);
  const [noEncontrada, setNoEncontrada] = useState(false);
  const [ajena, setAjena] = useState(false); // la rutina es de otro instructor
  const [miCedula] = useState(instructorEnSesion);
  const [candidatos, setCandidatos] = useState<Cliente[]>([]);
  const [clienteFijo, setClienteFijo] = useState<Cliente | null>(null);
  const [instructores, setInstructores] = useState<Instructor[]>([]);
  const [catalogo, setCatalogo] = useState<Ejercicio[]>([]);
  const [inicial, setInicial] = useState<RutinaInicial | undefined>(undefined);
  const [guardando, setGuardando] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    let activo = true;
    (async () => {
      const [clientes, todosInstructores, ejercicios, rutinas] = await Promise.all([
        api.clientes.list(),
        api.instructores.list(),
        api.ejercicios.list(),
        api.rutinas.list(),
      ]);
      // Candidatos: clientes ACTIVOS que no tienen una rutina vigente (o por vencer)
      const conVigente = new Set(
        rutinas
          .filter((r) => ["VIGENTE", "POR_VENCER"].includes(api.rutinas.estado(r)))
          .map((r) => r.id_cliente)
      );
      const libres = clientes.filter((c) => c.estado === "ACTIVO" && !conVigente.has(c.numero_identificacion));
      let fijo: Cliente | null = null;
      let datosIniciales: RutinaInicial | undefined;

      if (idRutina !== null) {
        const rutina = rutinas.find((r) => r.id_rutina === idRutina);
        if (!rutina) {
          if (activo) {
            setNoEncontrada(true);
            setCargando(false);
          }
          return;
        }
        if (miCedula !== null && rutina.id_instructor !== miCedula) {
          if (activo) {
            setAjena(true);
            setCargando(false);
          }
          return;
        }
        const sesiones = await api.rutinas.sesiones(idRutina);
        fijo = clientes.find((c) => c.numero_identificacion === rutina.id_cliente) ?? null;
        datosIniciales = {
          fecha_creacion: rutina.fecha_creacion,
          datos: {
            id_cliente: rutina.id_cliente,
            id_instructor: rutina.id_instructor,
            nombre: rutina.nombre,
            descripcion: rutina.descripcion,
            objetivo: rutina.objetivo,
            fecha_fin: rutina.fecha_fin,
            sesiones_planeadas: rutina.sesiones_planeadas ?? 0,
            division: rutina.division ?? ["A"],
          },
          ejercicios: sesiones.flatMap((s) => s.ejercicios),
        };
      } else if (cedulaInicial) {
        fijo = libres.find((c) => c.numero_identificacion === cedulaInicial) ?? null;
      }

      if (!activo) return;
      setCandidatos(libres);
      setClienteFijo(fijo);
      // Al editar se muestra también el instructor actual aunque esté inactivo
      setInstructores(
        todosInstructores.filter((i) => i.estado === "ACTIVO" || i.numero_identificacion === datosIniciales?.datos.id_instructor)
      );
      setCatalogo(ejercicios);
      setInicial(datosIniciales);
      setCargando(false);
    })();
    return () => {
      activo = false;
    };
  }, [idRutina, cedulaInicial, miCedula]);

  async function guardar(datos: DatosRutina, ejercicios: SesionEjercicioNuevo[]) {
    setGuardando(true);
    setError("");
    if (idRutina === null) {
      const res = await api.rutinas.create(datos);
      if (!res.ok || !res.data) {
        setGuardando(false);
        setError(res.mensaje);
        return;
      }
      const nueva = res.data;
      const ses = await api.rutinas.guardarSesiones(nueva.id_rutina, ejercicios);
      if (!ses.ok) {
        // Sin sesiones la rutina quedaría incompleta: se deshace la creación
        await api.rutinas.remove(nueva.id_rutina);
        setGuardando(false);
        setError(ses.mensaje);
        return;
      }
      navigate(ruta("/rutinas/" + nueva.id_rutina));
      return;
    }
    // Al editar el cliente no cambia
    const { id_cliente: _cliente, ...cambios } = datos;
    void _cliente;
    const res = await api.rutinas.update(idRutina, cambios);
    if (!res.ok) {
      setGuardando(false);
      setError(res.mensaje);
      return;
    }
    const ses = await api.rutinas.guardarSesiones(idRutina, ejercicios);
    setGuardando(false);
    if (!ses.ok) {
      setError(ses.mensaje);
      return;
    }
    navigate(ruta("/rutinas/" + idRutina));
  }

  const volver = idRutina !== null ? ruta("/rutinas/" + idRutina) : ruta("/rutinas");

  if (cargando) {
    return (
      <div className="card-g">
        <div className="loader"><span className="spinner-g"></span>Cargando...</div>
      </div>
    );
  }
  if (noEncontrada || ajena) {
    return (
      <div className="card-g">
        <Link to={ruta("/rutinas")} className="btn-dark" style={{ textDecoration: "none" }}><i className="bi bi-arrow-left me-1" aria-hidden /> Rutinas</Link>
        <p className="empty-state">{ajena ? "Esta rutina es de otro instructor: no puedes editarla." : "Rutina no encontrada"}</p>
      </div>
    );
  }

  return (
    <>
      <div className="inst-encabezado">
        <Link to={volver} className="btn-icon" title="Volver"><i className="bi bi-arrow-left" aria-hidden /></Link>
        <div>
          <div className="card-sub">Rutinas</div>
          <h1 className="card-title mb-0">{idRutina === null ? "Nueva rutina" : "Editar rutina"}</h1>
        </div>
      </div>
      <ConstructorRutina
        clientes={candidatos}
        clienteFijo={clienteFijo}
        instructores={instructores}
        instructorFijo={miCedula ?? undefined}
        catalogo={catalogo}
        inicial={inicial}
        guardando={guardando}
        error={error}
        onGuardar={guardar}
        onCancelar={() => navigate(volver)}
      />
    </>
  );
}
