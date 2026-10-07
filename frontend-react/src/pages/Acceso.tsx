import { useEffect, useState } from "react";
import type { FormEvent } from "react";
import { api } from "../data/api";
import { utils } from "../lib/utils";
import { useVersionDeDatos } from "../lib/datos";
import type { Cliente, Ingreso } from "../types";

type Modo = "ENTRADA" | "SALIDA";
type Metodo = Ingreso["metodo_verificacion"];

/* Crestas del mock de huella: 15 barras que se ensanchan hacia el centro,
   como las Region del RegistroEntrada.fxml. No hay lector real en el
   navegador, asi que el operador elige el dedo que simula. */
const CRESTAS = [64, 92, 116, 136, 152, 164, 172, 176, 172, 164, 152, 136, 116, 92, 64];

const ETIQUETA: Record<Metodo, string> = {
  HUELLA: "Huella",
  CONTRASENA: "Contraseña",
};

export function Acceso() {
  const [modo, setModo] = useState<Modo>("ENTRADA");
  const [metodo, setMetodo] = useState<Metodo>("HUELLA");

  const [ident, setIdent] = useState("");
  const [dedo, setDedo] = useState("");
  const [clave, setClave] = useState("");

  const [registros, setRegistros] = useState<Ingreso[]>([]);
  const [clientes, setClientes] = useState<Cliente[]>([]);
  const [cargando, setCargando] = useState(true);
  const [filtro, setFiltro] = useState("");

  const [procesando, setProcesando] = useState(false);
  const [aviso, setAviso] = useState<{ tipo: "ok" | "error"; texto: string } | null>(null);

  const [lectorConectado, setLectorConectado] = useState(() => api.lector.estaConectado());

  // El listado se relee cuando db.write avisa: registrar la entrada desde aqui
  // y ver la fila aparecer no depende de que el operador recargue.
  const version = useVersionDeDatos();

  const hoy = utils.isoDate();

  useEffect(() => {
    Promise.all([api.ingresos.delDia(hoy), api.clientes.list()])
      .then(([r, c]) => {
        setRegistros(r);
        setClientes(c);
      })
      .finally(() => setCargando(false));
  }, [version, hoy]);

  // Igual que en Login: el mock no tiene sensor, asi que el estado del lector
  // se relee cada 2s para que desconectar desde el otro panel se note aqui.
  useEffect(() => {
    const t = setInterval(() => setLectorConectado(api.lector.estaConectado()), 2000);
    return () => clearInterval(t);
  }, []);

  const porId = new Map(clientes.map((c) => [c.numero_identificacion, c]));

  const dentro = registros.filter((r) => r.hora_salida === null).length;
  const salidas = registros.length - dentro;

  const visibles = registros
    .filter((r) => {
      const texto = filtro.trim().toLowerCase();
      if (!texto) return true;
      const cliente = porId.get(r.id_cliente);
      return (
        (r.id_cliente + " " + (cliente ? cliente.nombre + " " + cliente.apellidos : ""))
          .toLowerCase()
          .includes(texto)
      );
    })
    .sort((a, b) => (a.hora_entrada < b.hora_entrada ? 1 : -1));

  const idActivo = metodo === "HUELLA" ? dedo : ident;
  const bloqueado =
    !idActivo ||
    procesando ||
    (metodo === "HUELLA" && !lectorConectado);

  function cambiarModo(siguiente: Modo) {
    if (siguiente === modo) return;
    setModo(siguiente);
    setAviso(null);
  }

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
      }
    } finally {
      setProcesando(false);
    }
  }

  /* Atajo del listado: cerrar la entrada que esta abierta sin volver a pasar
     por el panel. La API no pide clave aqui a proposito: registrarSalida solo
     identifica, no vuelve a validar las reglas de entrada. */
  async function cerrarSalida(ingreso: Ingreso) {
    if (procesando) return;
    setProcesando(true);
    setAviso(null);
    try {
      const res = await api.acceso.registrarSalida({ id_cliente: ingreso.id_cliente });
      setAviso({ tipo: res.ok ? "ok" : "error", texto: res.mensaje });
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
    <div className="card-g">
      <div className="card-head">
        <div>
          <h2 className="card-title">Control de acceso</h2>
          <p className="card-sub">Registro de entradas y salidas del día</p>
        </div>
        <div className="acceso-contadores">
          <span className="acceso-contador">
            Dentro<b className="neon">{dentro}</b>
          </span>
          <span className="acceso-contador">
            Entradas hoy<b>{registros.length}</b>
          </span>
          <span className="acceso-contador">
            Salidas hoy<b>{salidas}</b>
          </span>
        </div>
      </div>

      {aviso && (
        <div
          className={"alert-g show " + (aviso.tipo === "ok" ? "alert-ok" : "alert-error")}
          role={aviso.tipo === "ok" ? "status" : "alert"}
        >
          {aviso.texto}
        </div>
      )}

      <div className="toolbar" style={{ marginBottom: 20 }}>
        <button
          className={modo === "ENTRADA" ? "btn-neon" : "btn-dark"}
          onClick={() => cambiarModo("ENTRADA")}
        >
          Registrar entrada
        </button>
        <button
          className={modo === "SALIDA" ? "btn-neon" : "btn-dark"}
          onClick={() => cambiarModo("SALIDA")}
        >
          Registrar salida
        </button>
      </div>

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
              <label className="form-label-g" htmlFor="acceso-dedo">
                Simular dedo de…
              </label>
              <select
                id="acceso-dedo"
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
            <label className="form-label-g" htmlFor="acceso-ident">
              Número de identificación
            </label>
            <input
              id="acceso-ident"
              className="form-control-dark"
              value={ident}
              onChange={(e) => setIdent(e.target.value)}
              inputMode="numeric"
              autoComplete="off"
              autoFocus
            />
          </div>

          <div>
            <label className="form-label-g" htmlFor="acceso-clave">
              Contraseña
            </label>
            <input
              id="acceso-clave"
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
            Cada socio tiene su propia clave de acceso. Asignalas desde el modal de
            edición de Clientes.
          </p>
        </form>
      )}

      <div className="card-head" style={{ marginTop: 32 }}>
        <div>
          <h3 className="card-title">Registro del día</h3>
          <p className="card-sub">
            {utils.fecha(hoy)} · {registros.length} registros
          </p>
        </div>
        <div className="search-box">
          <span className="search-ico">🔍</span>
          <input
            type="text"
            className="form-control-dark"
            placeholder="Buscar por nombre o identificación..."
            value={filtro}
            onChange={(e) => setFiltro(e.target.value)}
          />
        </div>
      </div>

      <div className="table-wrap">
        <table className="table-g">
          <thead>
            <tr>
              <th>Cliente</th>
              <th>Entrada</th>
              <th>Salida</th>
              <th>Método</th>
              <th>Acciones</th>
            </tr>
          </thead>
          <tbody>
            {cargando ? (
              <tr>
                <td colSpan={5} className="loader">
                  <span className="spinner-g"></span>Cargando...
                </td>
              </tr>
            ) : visibles.length === 0 ? (
              <tr>
                <td colSpan={5} className="empty-state">
                  {registros.length === 0 ? "No hay registros de hoy" : "Sin resultados"}
                </td>
              </tr>
            ) : (
              visibles.map((i) => {
                const cliente = porId.get(i.id_cliente);
                return (
                  <tr key={i.id_ingreso}>
                    <td>
                      <div className="person">
                        <div className="person-avatar">
                          {cliente
                            ? utils.iniciales(cliente.nombre, cliente.apellidos)
                            : utils.iniciales("", "")}
                        </div>
                        <div>
                          <div className="person-name">
                            {cliente ? `${cliente.nombre} ${cliente.apellidos}` : "Cliente no encontrado"}
                          </div>
                          <div className="person-sub">{i.id_cliente}</div>
                        </div>
                      </div>
                    </td>
                    <td>{utils.hora(i.hora_entrada)}</td>
                    <td>
                      {i.hora_salida ? (
                        utils.hora(i.hora_salida)
                      ) : (
                        <span className="badge-g badge-activo">Dentro</span>
                      )}
                    </td>
                    <td>{ETIQUETA[i.metodo_verificacion]}</td>
                    <td>
                      <div className="cell-actions">
                        {i.hora_salida === null && (
                          <button
                            className="btn-dark"
                            disabled={procesando}
                            onClick={() => cerrarSalida(i)}
                          >
                            Registrar salida
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
