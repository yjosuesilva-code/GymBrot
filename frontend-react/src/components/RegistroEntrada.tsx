import { useEffect, useState } from "react";
import type { FormEvent } from "react";
import { Modal } from "react-bootstrap";
import { api } from "../data/api";
import type { Cliente, Ingreso } from "../types";
import { CRESTAS, type ModoRegistro } from "./registro-entrada.const";

export type { ModoRegistro };
type Metodo = Ingreso["metodo_verificacion"];

// Alias para compatibilidad temporal si otros archivos importaran este nombre
export { CRESTAS as CRESTAS_MOCK };

type Props = {
  abierto: boolean;
  modo: ModoRegistro;
  clientes: Cliente[];
  onCerrar: () => void;
};

/* Overlay de RegistroEntrada.fxml: dos tabs (biometrico / manual), el marco
   de escaneo con la linea de barrido y el formulario manual debajo. Se abre
   desde Clientes con el modo ENTRADA/SALIDA que pida el operador. */
export function RegistroEntrada({ abierto, modo, clientes, onCerrar }: Props) {
  const [metodo, setMetodo] = useState<Metodo>("HUELLA");

  const [ident, setIdent] = useState("");
  const [dedo, setDedo] = useState("");
  const [clave, setClave] = useState("");

  const [procesando, setProcesando] = useState(false);
  const [aviso, setAviso] = useState<{ tipo: "ok" | "error"; texto: string } | null>(null);

  const [lectorConectado, setLectorConectado] = useState(() => api.lector.estaConectado());

  // Igual que en Login: el mock no tiene sensor, asi que el estado del lector
  // se relee cada 2s para que desconectar desde el otro panel se note aqui.
  useEffect(() => {
    const t = setInterval(() => setLectorConectado(api.lector.estaConectado()), 2000);
    return () => clearInterval(t);
  }, []);

  // Al abrir (o cambiar de modo) limpia el aviso anterior para que el operador
  // no confunda el resultado de la ultima validacion con la que viene.
  useEffect(() => {
    if (abierto) {
      const id = setTimeout(() => setAviso(null), 0);
      return () => clearTimeout(id);
    }
  }, [abierto, modo]);

  function cambiarMetodo(siguiente: Metodo) {
    if (siguiente === metodo) return;
    setMetodo(siguiente);
    setAviso(null);
  }

  function alternarLector() {
    const siguiente = !lectorConectado;
    api.lector.setConectado(siguiente);
    setLectorConectado(siguiente);
  }

  const idActivo = metodo === "HUELLA" ? dedo : ident;
  const bloqueado = !idActivo || procesando || (metodo === "HUELLA" && !lectorConectado);

  async function enviar(e?: FormEvent<HTMLFormElement>) {
    e?.preventDefault();
    if (bloqueado) return;

    setProcesando(true);
    setAviso(null);
    try {
      const contrasena = metodo === "CONTRASENA" ? clave : undefined;
      const res =
        modo === "ENTRADA"
          ? await api.acceso.registrarEntrada({ id_cliente: idActivo, metodo, contrasena })
          : await api.acceso.registrarSalida({ id_cliente: idActivo, metodo, contrasena });

      setAviso({ tipo: res.ok ? "ok" : "error", texto: res.mensaje });
      if (res.ok) {
        setIdent("");
        setDedo("");
        setClave("");
      }
    } finally {
      setProcesando(false);
    }
  }

  const textoLector = procesando
    ? modo === "ENTRADA"
      ? "Registrando entrada..."
      : "Registrando salida..."
    : lectorConectado
      ? "Coloca el dedo en el lector"
      : "Lector desconectado";

  const etiquetaBoton =
    procesando
      ? "Verificando..."
      : modo === "ENTRADA"
        ? "Registrar entrada"
        : "Registrar salida";

  return (
    <Modal show={abierto} onHide={onCerrar} centered size="lg">
      <Modal.Header closeButton>
        <Modal.Title>
          {modo === "ENTRADA" ? "REGISTRO DE ENTRADA" : "REGISTRO DE SALIDA"}
        </Modal.Title>
      </Modal.Header>
      <Modal.Body>
        {aviso && (
          <div
            className={"alert-g show " + (aviso.tipo === "ok" ? "alert-ok" : "alert-error")}
            role={aviso.tipo === "ok" ? "status" : "alert"}
          >
            {aviso.texto}
          </div>
        )}

        <div className="acceso-tabs" role="tablist">
          <button
            role="tab"
            aria-selected={metodo === "HUELLA"}
            className={"acceso-tab" + (metodo === "HUELLA" ? " activa" : "")}
            onClick={() => cambiarMetodo("HUELLA")}
          >
            Acceso con huella
          </button>
          <button
            role="tab"
            aria-selected={metodo === "CONTRASENA"}
            className={"acceso-tab" + (metodo === "CONTRASENA" ? " activa" : "")}
            onClick={() => cambiarMetodo("CONTRASENA")}
          >
            Acceso manual
          </button>
        </div>

        {metodo === "HUELLA" ? (
          <div className="scan-wrap">
            <div className="scan-frame">
              <div className="scan-huella" aria-hidden="true">
                {CRESTAS.map((ancho, i) => (
                  <span key={i} style={{ width: ancho }} />
                ))}
              </div>
              <span className="scan-line" aria-hidden="true" />
            </div>

            <div className="scan-estado">
              <span className={"scan-punto" + (lectorConectado ? "" : " error")} />
              <p className={"scan-texto" + (lectorConectado ? "" : " error")}>{textoLector}</p>
            </div>

            <span
              className={"reader-status" + (lectorConectado ? " ok" : " off")}
              role="status"
              aria-live="polite"
            >
              <span className="reader-dot" />
              {lectorConectado ? "LECTOR CONECTADO" : "LECTOR DESCONECTADO"}
            </span>
            <button type="button" className="reader-toggle" onClick={alternarLector}>
              Simular lector {lectorConectado ? "desconectado" : "conectado"}
            </button>

            <p className="scan-ayuda">
              Elige el socio para simular el dedo. Sin lector físico en el navegador
              esta lista es la única forma de probar la huella.
            </p>

            <div className="acceso-manual">
              <div>
                <label className="form-label-g" htmlFor="registro-dedo">
                  Simular dedo de…
                </label>
                <select
                  id="registro-dedo"
                  className="form-control-dark"
                  value={dedo}
                  onChange={(e) => setDedo(e.target.value)}
                >
                  <option value="">Selecciona un socio</option>
                  {clientes.map((c) => (
                    <option key={c.numero_identificacion} value={c.numero_identificacion}>
                      {c.nombre} {c.apellidos} · {c.numero_identificacion}
                    </option>
                  ))}
                </select>
              </div>

              <button className="btn-neon" type="button" disabled={bloqueado} onClick={() => enviar()}>
                {etiquetaBoton}
              </button>
            </div>
          </div>
        ) : (
          <form className="acceso-manual" onSubmit={enviar}>
            <div>
              <label className="form-label-g" htmlFor="registro-ident">
                Número de identificación
              </label>
              <input
                id="registro-ident"
                className="form-control-dark"
                value={ident}
                onChange={(e) => setIdent(e.target.value)}
                inputMode="numeric"
                autoComplete="off"
                autoFocus
              />
            </div>

            <div>
              <label className="form-label-g" htmlFor="registro-clave">
                Contraseña
              </label>
              <input
                id="registro-clave"
                className="form-control-dark"
                type="password"
                value={clave}
                onChange={(e) => setClave(e.target.value)}
                autoComplete="off"
              />
            </div>

            <button className="btn-neon" type="submit" disabled={bloqueado}>
              {etiquetaBoton}
            </button>

            <p className="scan-ayuda">
              Cada socio tiene su propia clave de acceso. Asignalas desde el modal de
              edición de Clientes.
            </p>
          </form>
        )}
      </Modal.Body>
      <Modal.Footer>
        <button className="btn-dark" onClick={onCerrar}>
          Cancelar
        </button>
      </Modal.Footer>
    </Modal>
  );
}