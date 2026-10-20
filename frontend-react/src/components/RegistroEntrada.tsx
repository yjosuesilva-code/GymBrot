import { useEffect, useState } from "react";
import type { FormEvent } from "react";
import { Modal } from "react-bootstrap";
import { api } from "../data/api";
import type { Cliente, Ingreso } from "../types";

const normalizar = (texto: string) =>
  texto.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
import { CRESTAS, ETIQUETA_METODO } from "./registro-entrada.const";
import type { ModoRegistro } from "./registro-entrada.const";

type Metodo = Ingreso["metodo_verificacion"];

type RegistroEntradaProps = {
  modo: ModoRegistro;
  clientes: Cliente[];
  onClose: () => void;
  onRegistrado: () => void;
};

/* Modal unico de validacion de acceso. Lo abre la vista de Clientes en modo
   ENTRADA o SALIDA y hace de puente hacia api.acceso y api.lector, que son los
   mismos que usaba la pagina Control de acceso. */
export function RegistroEntrada({ modo, clientes, onClose, onRegistrado }: RegistroEntradaProps) {
  const [metodo, setMetodo] = useState<Metodo>("HUELLA");
  const [ident, setIdent] = useState("");
  const [dedo, setDedo] = useState("");
  const [busqueda, setBusqueda] = useState("");
  const [mostrarLista, setMostrarLista] = useState(false);
  const [clave, setClave] = useState("");
  const [procesando, setProcesando] = useState(false);
  const [aviso, setAviso] = useState<{ tipo: "ok" | "error"; texto: string } | null>(null);

  const [lectorConectado, setLectorConectado] = useState(() => api.lector.estaConectado());

  // El mock no tiene sensor, asi que el estado del lector se relee cada 2s para
  // que desconectarlo desde otro panel se note aqui.
  useEffect(() => {
    const t = setInterval(() => setLectorConectado(api.lector.estaConectado()), 2000);
    return () => clearInterval(t);
  }, []);

  const idActivo = metodo === "HUELLA" ? dedo : ident;
  const bloqueado =
    !idActivo || procesando || (metodo === "HUELLA" && !lectorConectado);

  const titulo = modo === "ENTRADA" ? "Validar entrada" : "Validar salida";

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
        setBusqueda("");
        setMostrarLista(false);
        onRegistrado();
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

  return (
    <Modal show onHide={onClose} centered size="lg">
      <Modal.Header closeButton>
        <Modal.Title>{titulo}</Modal.Title>
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
                <label className="form-label-g" htmlFor="registro-busqueda">
                  Buscar socio
                </label>
                <input
                  id="registro-busqueda"
                  className="form-control-dark"
                  value={busqueda}
                  placeholder="Nombre, apellidos o identificación..."
                  onChange={(e) => {
                    setBusqueda(e.target.value);
                    setMostrarLista(true);
                    setError("");
                  }}
                  onFocus={() => setMostrarLista(true)}
                  autoComplete="off"
                />
                {mostrarLista && !dedo && (
                  <div className="acceso-lista">
                    {(() => {
                      const filtrados = clientes.filter((c) => {
                        const q = normalizar(busqueda);
                        if (!q) return true;
                        return (
                          normalizar(c.nombre + " " + c.apellidos).includes(q) ||
                          normalizar(c.numero_identificacion).includes(q)
                        );
                      }).slice(0, 8);

                      if (filtrados.length === 0) {
                        return <div className="acceso-vacio">Sin resultados</div>;
                      }

                      return (
                    <ul className="acceso-lista-items">
                      {filtrados.map((c) => (
                        <li key={c.numero_identificacion} className="acceso-item-row">
                          <button
                            type="button"
                            className="acceso-item-btn"
                            onClick={() => {
                              setDedo(c.numero_identificacion);
                              setBusqueda(c.nombre + " " + c.apellidos);
                              setMostrarLista(false);
                              setError("");
                            }}
                          >
                            <div className="acceso-item-main">
                              <span className="acceso-item-nombre">
                                {c.nombre} {c.apellidos}
                              </span>
                              <span className="pill pill-socio">SOCIO</span>
                            </div>
                            <span className="acceso-item-doc">
                              {c.numero_identificacion}
                            </span>
                          </button>
                        </li>
                      ))}
                    </ul>
                      );
                    })()}
                  </div>
                )}
                {dedo && (
                  <div className="acceso-seleccionado">
                    <span>
                      {clientes.find((c) => c.numero_identificacion === dedo)?.nombre}{" "}
                      {clientes.find((c) => c.numero_identificacion === dedo)?.apellidos} —{" "}
                      {dedo}
                    </span>
                    <button
                      type="button"
                      className="btn-icon"
                      onClick={() => {
                        setDedo("");
                        setBusqueda("");
                        setMostrarLista(false);
                      }}
                    >
                      <i className="bi bi-x" aria-hidden />
                    </button>
                  </div>
                )}
              </div>

              <button className="btn-neon" type="button" disabled={bloqueado} onClick={() => enviar()}>
                {procesando
                  ? "Verificando..."
                  : modo === "ENTRADA"
                    ? "Registrar entrada"
                    : "Registrar salida"}
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
                {ETIQUETA_METODO.CONTRASENA}
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
              {procesando
                ? "Verificando..."
                : modo === "ENTRADA"
                  ? "Registrar entrada"
                  : "Registrar salida"}
            </button>

            <p className="scan-ayuda">
              Cada socio tiene su propia clave de acceso. Asígnalas desde el modal de
              edición de Clientes.
            </p>
          </form>
        )}
      </Modal.Body>
      <Modal.Footer>
        <button className="btn-dark" onClick={onClose}>
          Cerrar
        </button>
      </Modal.Footer>
    </Modal>
  );
}
