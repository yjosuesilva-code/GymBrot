import { useState } from "react";
import type { Cliente } from "../../types";
import { normalizar } from "../../lib/rutinas";
import { utils } from "../../lib/utils";

/* [P3] Autocompletado de clientes por nombre o cédula. Recibe la lista ya filtrada
   (ej. ACTIVOS sin rutina vigente) y avisa cuál se eligió. Lo usan el constructor y
   el modal "Duplicar". Muestra hasta 8 coincidencias. */
type Props = {
  clientes: Cliente[];
  seleccionado: Cliente | null;
  onSeleccionar: (c: Cliente | null) => void;
  autoFocus?: boolean;
};

const MAX = 8;

export function BuscadorCliente({ clientes, seleccionado, onSeleccionar, autoFocus }: Props) {
  const [texto, setTexto] = useState("");
  const [abierto, setAbierto] = useState(false);

  if (seleccionado) {
    return (
      <div className="inst-cliente-elegido">
        <div className="person">
          <div className="person-avatar">{utils.iniciales(seleccionado.nombre, seleccionado.apellidos)}</div>
          <div>
            <div className="person-name">{seleccionado.nombre} {seleccionado.apellidos}</div>
            <div className="person-sub">{seleccionado.tipo_identificacion} {seleccionado.numero_identificacion}</div>
          </div>
        </div>
        <button type="button" className="btn-icon" title="Cambiar cliente" onClick={() => onSeleccionar(null)}>
          <i className="bi bi-x-lg" aria-hidden />
        </button>
      </div>
    );
  }

  const q = normalizar(texto);
  const coincidencias = q
    ? clientes
        .filter((c) => normalizar(c.nombre + " " + c.apellidos + " " + c.numero_identificacion).includes(q))
        .slice(0, MAX)
    : [];

  return (
    <div className="inst-auto">
      <div className="search-box">
        <span className="search-ico"><i className="bi bi-search" aria-hidden /></span>
        <input
          type="search"
          className="form-control-dark"
          placeholder="Busca por nombre o cédula…"
          aria-label="Buscar cliente por nombre o cédula"
          value={texto}
          autoFocus={autoFocus}
          onChange={(e) => {
            setTexto(e.target.value);
            setAbierto(true);
          }}
          onFocus={() => setAbierto(true)}
          // Se cierra un poco después para que alcance a registrarse el clic en una opción
          onBlur={() => setTimeout(() => setAbierto(false), 150)}
        />
      </div>
      {abierto && q && (
        <ul className="inst-auto-lista" role="listbox">
          {coincidencias.length === 0 ? (
            <li className="inst-auto-vacio">Ningún cliente disponible coincide</li>
          ) : (
            coincidencias.map((c) => (
              <li key={c.numero_identificacion}>
                <button
                  type="button"
                  className="inst-auto-opcion"
                  onMouseDown={(e) => e.preventDefault()}
                  onClick={() => {
                    onSeleccionar(c);
                    setTexto("");
                    setAbierto(false);
                  }}
                >
                  <span className="person-avatar">{utils.iniciales(c.nombre, c.apellidos)}</span>
                  <span>
                    <span className="person-name">{c.nombre} {c.apellidos}</span>
                    <span className="person-sub d-block">{c.numero_identificacion}</span>
                  </span>
                </button>
              </li>
            ))
          )}
        </ul>
      )}
    </div>
  );
}
