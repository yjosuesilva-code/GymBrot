import { Link } from "react-router-dom";
import { useTenant } from "../../tenant/TenantContext";
import { textoVigencia } from "../../lib/rutinas";
import { BadgeEstadoRutina } from "./BadgeEstadoRutina";
import { PersonaCliente } from "./PersonaCliente";
import type { Cliente, FilaSupervision, Instructor } from "../../types";

/* [P3] B3 · KAN-92 — Una fila <tr> de la tabla de rutinas. La usan la supervisión del admin
   y "Mis rutinas" del instructor (este no ve la columna Instructor: `instructor` = null).
   No llama a la API: las acciones se avisan con onFinalizar / onRenovar / onDuplicar. */
type Props = {
  f: FilaSupervision;
  cliente: Cliente | undefined;
  instructor: Instructor | undefined | null;   // null = no mostrar la columna
  renovable: boolean;                          // vencida sin renovar → botón "Renovar"
  onFinalizar: () => void;
  onRenovar: () => void;
  onDuplicar: () => void;
};

export function FilaTablaRutina({ f, cliente, instructor, renovable, onFinalizar, onRenovar, onDuplicar }: Props) {
  const { ruta } = useTenant();
  const r = f.rutina;
  const activa = f.estado === "VIGENTE" || f.estado === "POR_VENCER";
  return (
    <tr>
      <td data-label="Cliente">
        <PersonaCliente cliente={cliente} cedula={r.id_cliente} />
      </td>
      <td data-label="Rutina">
        <div className="person-name">
          {r.nombre}
          {f.cambios_sin_revisar > 0 && (
            <i
              className="bi bi-person-exclamation inst-icono-aviso ms-2"
              title={f.cambios_sin_revisar + " cambio(s) del cliente por revisar"}
              aria-label="Cambios del cliente por revisar"
            />
          )}
        </div>
        <div className="person-sub">{r.objetivo}</div>
      </td>
      {instructor !== null && (
        <td data-label="Instructor">{instructor ? instructor.nombre + " " + instructor.apellidos : r.id_instructor}</td>
      )}
      <td data-label="Sesiones">
        <span className="inst-letras">
          {(r.division ?? []).map((l) => (
            <span key={l} className={"inst-letra inst-letra-sm" + (l === f.siguiente ? " siguiente" : "")} title={l === f.siguiente ? "Siguiente sesión" : undefined}>{l}</span>
          ))}
        </span>
      </td>
      <td data-label="Vigencia">
        <div>
          <BadgeEstadoRutina estado={f.estado} />
          <div className="person-sub">{textoVigencia(r, f.estado)}</div>
        </div>
      </td>
      <td data-label="Avance">
        <div className="inst-avance-mini">
          <div className="kpi-bar"><span style={{ width: f.avance.porcentaje + "%" }}></span></div>
          <span>{f.avance.completadas}/{f.avance.planeadas}</span>
        </div>
      </td>
      <td>
        <div className="cell-actions">
          <Link className="btn-icon" title="Ver detalle" to={ruta("/rutinas/" + r.id_rutina)}><i className="bi bi-eye" aria-hidden /></Link>
          <Link className="btn-icon" title="Editar" to={ruta("/rutinas/" + r.id_rutina + "/editar")}><i className="bi bi-pencil" aria-hidden /></Link>
          {activa && (
            <button className="btn-icon" title="Finalizar" onClick={onFinalizar}><i className="bi bi-flag" aria-hidden /></button>
          )}
          {renovable && (
            <button className="btn-icon" title="Renovar: nueva rutina para el cliente" onClick={onRenovar}>
              <i className="bi bi-arrow-repeat" aria-hidden />
            </button>
          )}
          <button className="btn-icon" title="Duplicar para otro cliente" onClick={onDuplicar}><i className="bi bi-copy" aria-hidden /></button>
        </div>
      </td>
    </tr>
  );
}
