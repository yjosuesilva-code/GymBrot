import { ID_BOTON_MENU, ID_MENU, type MenuMovil } from "./useMenuMovil";

/* Boton hamburguesa del topbar. Solo se ve en movil (gymbrot.css); en
   escritorio el sidebar siempre esta a la vista. */
export function BotonMenu({ menu }: { menu: MenuMovil }) {
  return (
    <button
      id={ID_BOTON_MENU}
      type="button"
      className="topbar-menu"
      aria-label={menu.abierto ? "Cerrar menú" : "Abrir menú"}
      aria-expanded={menu.abierto}
      aria-controls={ID_MENU}
      onClick={menu.alternar}
    >
      <i className={"bi " + (menu.abierto ? "bi-x-lg" : "bi-list")} aria-hidden />
    </button>
  );
}
