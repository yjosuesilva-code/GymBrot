import { useEffect, useState } from "react";

/* Estado del menu en movil. Por debajo de 768px el sidebar no cabe al lado
   del contenido y pasa a ser un panel que se abre con el boton del topbar.
   Lo usan el portal (/g/:slug) y el panel de plataforma, que tienen cada uno
   su propio shell. */

// Ids que comparten el boton (BotonMenu) y el panel (<aside> del sidebar).
export const ID_MENU = "app-sidebar";
export const ID_BOTON_MENU = "app-menu-boton";

// Mismo corte que el bloque responsive del shell en gymbrot.css.
const ESCRITORIO = "(min-width: 768px)";

export function useMenuMovil() {
  const [abierto, setAbierto] = useState(false);

  // Al abrir, el foco entra al menu; Escape lo cierra y devuelve el foco al
  // boton para no dejar al teclado perdido detras del fondo.
  useEffect(() => {
    if (!abierto) return;
    document.getElementById(ID_MENU)?.querySelector<HTMLElement>("a, button")?.focus();

    function alTeclear(e: KeyboardEvent) {
      if (e.key !== "Escape") return;
      setAbierto(false);
      document.getElementById(ID_BOTON_MENU)?.focus();
    }
    document.addEventListener("keydown", alTeclear);
    return () => document.removeEventListener("keydown", alTeclear);
  }, [abierto]);

  // Si la ventana crece a escritorio con el menu abierto, se cierra: ahi el
  // sidebar vuelve a ser el rail y el estado abierto no tiene sentido.
  useEffect(() => {
    if (!abierto) return;
    const consulta = window.matchMedia(ESCRITORIO);
    function alCambiar(e: MediaQueryListEvent) {
      if (e.matches) setAbierto(false);
    }
    consulta.addEventListener("change", alCambiar);
    return () => consulta.removeEventListener("change", alCambiar);
  }, [abierto]);

  return {
    abierto,
    alternar: () => setAbierto((a) => !a),
    cerrar: () => setAbierto(false),
  };
}

export type MenuMovil = ReturnType<typeof useMenuMovil>;
