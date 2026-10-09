import { useEffect, useRef, useState } from "react";
import type { FormEvent } from "react";
import { BIENVENIDA, respuestaIA } from "../lib/ia";
import { utils } from "../lib/utils";

type Rol = "usuario" | "bot";

interface Mensaje {
  id: number;
  rol: Rol;
  texto: string;
  hora: string;
}

/* El historial vive en localStorage, igual que el resto de la app: en el legacy
   cada sesion se guardaba en SESIONES_GYMBROT / MENSAJES_GYMBROT, pero esas
   tablas quedaron descartadas para la version web. */
const CLAVE = "gymbrot_ia_historial";
const ESPERA = 700;

function horaAhora(): string {
  return utils.hora(new Date().toISOString());
}

/* Contador unico por encima de la hora actual: los mensajes guardados en la
   sesion anterior vienen con ids anteriores a "ahora", asi que al recargar no
   se repite ninguna clave. */
let ultimoId = 0;

function siguienteId(): number {
  if (ultimoId < Date.now()) ultimoId = Date.now();
  ultimoId += 1;
  return ultimoId;
}

function bienvenida(): Mensaje {
  return { id: siguienteId(), rol: "bot", texto: BIENVENIDA, hora: horaAhora() };
}

function leerHistorial(): Mensaje[] {
  try {
    const raw = localStorage.getItem(CLAVE);
    const datos = raw ? JSON.parse(raw) : null;
    if (
      Array.isArray(datos) &&
      datos.every(
        (m) =>
          m &&
          typeof m.id === "number" &&
          typeof m.texto === "string" &&
          (m.rol === "usuario" || m.rol === "bot"),
      )
    ) {
      const guardados = datos as Mensaje[];
      for (const m of guardados) {
        if (m.id > ultimoId) ultimoId = m.id;
      }
      return guardados;
    }
  } catch {
    // JSON corrupto: se arranca con la bienvenida en vez de romper la vista.
  }
  return [];
}

function Burbuja({ m }: { m: Mensaje }) {
  if (m.rol === "usuario") {
    return (
      <div className="ia-fila ia-fila-usuario">
        <div className="ia-burbuja ia-burbuja-usuario">
          <div className="ia-contenido">{m.texto}</div>
          <span className="ia-hora">{m.hora}</span>
        </div>
      </div>
    );
  }

  return (
    <div className="ia-fila ia-fila-bot">
      <div className="ia-avatar" aria-hidden="true">
        G
      </div>
      <div className="ia-burbuja ia-burbuja-bot">
        <span className="ia-nombre">GYMBROT AI</span>
        <div className="ia-contenido">{m.texto}</div>
        <span className="ia-hora">{m.hora}</span>
      </div>
    </div>
  );
}

export function GymbrotAI() {
  const [mensajes, setMensajes] = useState<Mensaje[]>(() => {
    const guardados = leerHistorial();
    return guardados.length ? guardados : [bienvenida()];
  });
  const [texto, setTexto] = useState("");
  const [escribiendo, setEscribiendo] = useState(false);

  const hilo = useRef<HTMLDivElement>(null);
  const temporizador = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    localStorage.setItem(CLAVE, JSON.stringify(mensajes));
  }, [mensajes]);

  useEffect(() => {
    const el = hilo.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [mensajes, escribiendo]);

  useEffect(() => {
    return () => {
      if (temporizador.current) clearTimeout(temporizador.current);
    };
  }, []);

  function enviar(e?: FormEvent<HTMLFormElement>) {
    e?.preventDefault();
    const limpio = texto.trim();
    if (!limpio || escribiendo) return;

    setTexto("");
    setMensajes((prev) => [
      ...prev,
      { id: siguienteId(), rol: "usuario", texto: limpio, hora: horaAhora() },
    ]);
    setEscribiendo(true);

    temporizador.current = setTimeout(() => {
      setMensajes((prev) => [
        ...prev,
        { id: siguienteId(), rol: "bot", texto: respuestaIA(limpio), hora: horaAhora() },
      ]);
      setEscribiendo(false);
    }, ESPERA);
  }

  function reiniciar() {
    if (temporizador.current) clearTimeout(temporizador.current);
    setEscribiendo(false);
    setTexto("");
    setMensajes([bienvenida()]);
  }

  return (
    <div className="card-g ia-card">
      <div className="card-head">
        <div>
          <h2 className="card-title">Gymbrot AI</h2>
          <p className="card-sub">Asistente del gimnasio · historial guardado en este navegador</p>
        </div>
        <button className="btn-dark" type="button" onClick={reiniciar}>
          Nuevo chat
        </button>
      </div>

      <div className="ia-hilo" ref={hilo}>
        {mensajes.map((m) => (
          <Burbuja key={m.id} m={m} />
        ))}

        {escribiendo && (
          <div className="ia-fila ia-fila-bot" role="status" aria-live="polite">
            <div className="ia-avatar" aria-hidden="true">
              G
            </div>
            <div className="ia-burbuja ia-burbuja-bot">
              <span className="ia-nombre">GYMBROT AI</span>
              <div className="ia-contenido ia-escribiendo">Escribiendo...</div>
            </div>
          </div>
        )}
      </div>

      <form className="ia-form" onSubmit={enviar}>
        <input
          className="form-control-dark"
          placeholder="Pregunta lo que quieras a Gymbrot AI..."
          value={texto}
          onChange={(e) => setTexto(e.target.value)}
          autoComplete="off"
          aria-label="Mensaje para Gymbrot AI"
        />
        <button className="btn-neon ia-enviar" type="submit" disabled={escribiendo || !texto.trim()}>
          <i className="bi bi-send-fill" aria-hidden="true" />
          <span className="visually-hidden">Enviar</span>
        </button>
      </form>
    </div>
  );
}
