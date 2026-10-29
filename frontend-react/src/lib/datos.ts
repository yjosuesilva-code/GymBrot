import { useSyncExternalStore } from "react";

/* Version de los datos guardados en localStorage.

   Cada vista lee con un useEffect al montarse, y eso basta mientras se
   navega entre rutas: react-router desmonta la vista anterior y la nueva
   vuelve a pedir los datos. Lo que no hacía era refrescar sin moverte. Si el
   operador registra una salida en control de acceso, el KPI "Activos ahora"
   del Dashboard tiene que bajar en el acto, no cuando alguien abra esa
   pantalla.

   El punto de escritura es db.write(), el unico que hay en api.ts, asi que
   notificar ahi cubre todas las mutaciones sin que ninguna vista tenga que
   acordarse de avisar. */

let version = 0;
const suscriptores = new Set<() => void>();

export function notificarCambioDeDatos(): void {
  version++;
  for (const notificar of suscriptores) notificar();
}

function suscribirse(notificar: () => void): () => void {
  suscriptores.add(notificar);
  return () => {
    suscriptores.delete(notificar);
  };
}

/* Devuelve un numero que cambia cada vez que algo escribe en localStorage.
   Comparado en el useEffect de una vista, la refuerza a volver a leer.
   El nombre va con prefijo `use` porque es un hook: rules-of-hooks no deja
   llamar useSyncExternalStore desde cualquier funcion. */
export function useVersionDeDatos(): number {
  return useSyncExternalStore(suscribirse, () => version, () => version);
}
