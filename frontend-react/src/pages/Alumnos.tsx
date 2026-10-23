// [P3] B2 · KAN-90 — Alumnos del INSTRUCTOR en sesión: los clientes cuya rutina actual es suya
import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { api } from "../data/api";
import { current } from "../lib/auth";
import { utils } from "../lib/utils";
import { MOTIVO_ATENCION, alumnosDeInstructor, diasEntre, esActiva, idealAHoy, normalizar, textoVigencia } from "../lib/rutinas";
import type { MotivoAtencion } from "../lib/rutinas";
import { Paginador } from "../components/Paginador";
import { BadgeEstadoRutina } from "../components/rutinas/BadgeEstadoRutina";
import { PersonaCliente } from "../components/rutinas/PersonaCliente";
import { useTenant } from "../tenant/TenantContext";
import type { Cliente, FilaSupervision, Instructor } from "../types";

const POR_PAGINA = 10;

// "" = todos; ATENCION = con algún motivo; AL_DIA = sin motivos; o un motivo concreto
type FiltroAlumno = "" | "ATENCION" | "AL_DIA" | MotivoAtencion;

// "vas 2 atrás", "al día" o "1 adelante" frente a lo ideal a hoy (solo rutinas activas)
function textoRitmo(f: FilaSupervision): string {
  if (!esActiva(f)) return "";
  const diferencia = f.avance.completadas - idealAHoy(f.rutina);
  if (diferencia === 0) return "al día";
  return diferencia < 0 ? "vas " + -diferencia + " atrás" : diferencia + " adelante";
}

function textoUltimaSesion(fecha: string | null): string {
  if (fecha === null) return "Sin sesiones";
  const dias = diasEntre(fecha, utils.isoDate());
  if (dias === 0) return "Hoy";
  if (dias === 1) return "Ayer";
  return "Hace " + dias + " días";
}

export function Alumnos() {
  const { ruta } = useTenant();
  const [sesion] = useState(current());
  const [cargando, setCargando] = useState(true);
  const [yo, setYo] = useState<Instructor | null>(null);
  const [clientes, setClientes] = useState<Cliente[]>([]);
  const [filas, setFilas] = useState<FilaSupervision[]>([]);
  const [busqueda, setBusqueda] = useState("");
  const [filtro, setFiltro] = useState<FiltroAlumno>("");
  const [pagina, setPagina] = useState(1);

  useEffect(() => {
    let activo = true;
    Promise.all([api.instructores.list(), api.clientes.list(), api.rutinas.listaSupervision()])
      .then(([ins, cli, fil]) => {
        if (!activo) return;
        setYo(ins.find((i) => i.numero_identificacion === sesion?.numero_identificacion) ?? null);
        setClientes(cli);
        setFilas(fil);
      })
      .finally(() => activo && setCargando(false));
    return () => {
      activo = false;
    };
  }, [sesion]);

  if (cargando) return <div className="card-g empty-state">Cargando…</div>;
  if (!yo)
    return (
      <div className="card-g empty-state">
        <i className="bi bi-person-x" /> Tu cuenta no está vinculada a un instructor de este gimnasio.
      </div>
    );

  const alumnos = alumnosDeInstructor(filas, clientes, yo.numero_identificacion);
  const conAtencion = alumnos.filter((a) => a.motivos.length > 0).length;

  const texto = normalizar(busqueda);
  const filtrados = alumnos.filter((a) => {
    const nombre = a.cliente ? a.cliente.nombre + " " + a.cliente.apellidos : "";
    if (texto && !normalizar(nombre + " " + a.fila.rutina.id_cliente).includes(texto)) return false;
    if (filtro === "ATENCION") return a.motivos.length > 0;
    if (filtro === "AL_DIA") return a.motivos.length === 0;
    if (filtro !== "") return a.motivos.includes(filtro);
    return true;
  });
  const visibles = filtrados.slice((pagina - 1) * POR_PAGINA, pagina * POR_PAGINA);

  // Al cambiar la búsqueda o el filtro se vuelve a la página 1
  function conPagina1<T>(set: (v: T) => void) {
    return (v: T) => {
      set(v);
      setPagina(1);
    };
  }

  return (
    <div className="card-g">
      <div className="card-head">
        <div>
          <h2 className="card-title">Mis alumnos</h2>
          <p className="card-sub">
            {alumnos.length} alumnos · {conAtencion} requieren atención
          </p>
        </div>
      </div>

      <div className="toolbar mb-3">
        <div className="search-box">
          <span className="search-ico"><i className="bi bi-search" aria-hidden /></span>
          <input
            type="search"
            className="form-control-dark"
            placeholder="Buscar alumno o cédula…"
            aria-label="Buscar alumno o cédula"
            value={busqueda}
            onChange={(e) => conPagina1(setBusqueda)(e.target.value)}
          />
        </div>
        <select className="form-control-dark" style={{ width: "auto" }} aria-label="Estado" value={filtro} onChange={(e) => conPagina1(setFiltro)(e.target.value as FiltroAlumno)}>
          <option value="">Todos</option>
          <option value="ATENCION">Requieren atención</option>
          <option value="AL_DIA">Al día</option>
          {(Object.keys(MOTIVO_ATENCION) as MotivoAtencion[]).map((m) => (
            <option key={m} value={m}>{MOTIVO_ATENCION[m].texto}</option>
          ))}
        </select>
      </div>

      {filtrados.length === 0 ? (
        <div className="empty-state">
          {alumnos.length === 0 ? "Todavía no tienes alumnos: aparecen cuando un cliente tiene una rutina tuya." : "Ningún alumno coincide con la búsqueda."}
        </div>
      ) : (
        <>
          <div className="table-responsive">
            <table className="table-g tabla-stack inst-tabla-alumnos">
              <thead>
                <tr>
                  <th>Alumno</th>
                  <th>Rutina</th>
                  <th>Avance</th>
                  <th>Última sesión</th>
                  <th>Vigencia</th>
                  <th>Estado</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {visibles.map(({ fila, cliente, motivos }) => (
                  <tr key={fila.rutina.id_rutina}>
                    <td data-label="Alumno"><PersonaCliente cliente={cliente} cedula={fila.rutina.id_cliente} /></td>
                    <td data-label="Rutina">
                      <div>
                        <div>{fila.rutina.nombre}</div>
                        <span className="inst-letras">
                          {(fila.rutina.division ?? []).map((l) => (
                            <span key={l} className={"inst-letra inst-letra-sm" + (l === fila.siguiente ? " siguiente" : "")} title={l === fila.siguiente ? "Siguiente sesión" : undefined}>{l}</span>
                          ))}
                        </span>
                      </div>
                    </td>
                    <td data-label="Avance">
                      <div>
                        <div className="inst-avance-mini">
                          <div className="kpi-bar"><span style={{ width: fila.avance.porcentaje + "%" }}></span></div>
                          <span>{fila.avance.completadas}/{fila.avance.planeadas}</span>
                        </div>
                        <span className="card-sub">{textoRitmo(fila)}</span>
                      </div>
                    </td>
                    <td data-label="Última sesión">{textoUltimaSesion(fila.ultima_sesion)}</td>
                    <td data-label="Vigencia">
                      <div>
                        <BadgeEstadoRutina estado={fila.estado} />
                        <div className="card-sub">{textoVigencia(fila.rutina, fila.estado)}</div>
                      </div>
                    </td>
                    <td data-label="Estado">
                      {motivos.length === 0 ? (
                        <span className="badge-g badge-activo"><i className="bi bi-check2" /> Al día</span>
                      ) : (
                        <div className="inst-motivos inst-motivos-izq">
                          {motivos.map((m) => (
                            <span className="inst-chip" key={m}>
                              <i className={"bi " + MOTIVO_ATENCION[m].icono} /> {MOTIVO_ATENCION[m].texto}
                            </span>
                          ))}
                        </div>
                      )}
                    </td>
                    <td>
                      <div className="cell-actions">
                        <Link to={ruta("/rutinas/" + fila.rutina.id_rutina)} className="btn-icon" title="Ver rutina" aria-label="Ver rutina">
                          <i className="bi bi-eye" />
                        </Link>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <Paginador pagina={pagina} total={filtrados.length} porPagina={POR_PAGINA} onCambiar={setPagina} />
        </>
      )}
    </div>
  );
}
