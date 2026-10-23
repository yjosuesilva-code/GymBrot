import type { Cliente } from "../../types";
import { utils } from "../../lib/utils";

/* [P3] Avatar con iniciales + nombre + cédula de un cliente (tablas de Rutinas y Alumnos).
   Si el cliente no se encontró, muestra la cédula. */
type Props = { cliente: Cliente | undefined; cedula?: string };

export function PersonaCliente({ cliente, cedula }: Props) {
  return (
    <div className="person">
      <div className="person-avatar">{cliente ? utils.iniciales(cliente.nombre, cliente.apellidos) : "?"}</div>
      <div>
        <div className="person-name">{cliente ? cliente.nombre + " " + cliente.apellidos : cedula}</div>
        <div className="person-sub">{cliente?.numero_identificacion ?? cedula}</div>
      </div>
    </div>
  );
}
