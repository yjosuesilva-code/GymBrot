import type { Ingreso } from "../types";

/* Modo del modal unificado: la misma caja sirve para validar una entrada o una
   salida, igual que RegistroEntradaController.java resuelve ambas con el mismo
   panel. */
export type ModoRegistro = "ENTRADA" | "SALIDA";

/* Crestas del mock de huella: 15 barras que se ensanchan hacia el centro, como
   las Region del RegistroEntrada.fxml. No hay lector real en el navegador, asi
   que el operador elige el dedo que simula. */
export const CRESTAS = [64, 92, 116, 136, 152, 164, 172, 176, 172, 164, 152, 136, 116, 92, 64];

export const ETIQUETA_METODO: Record<Ingreso["metodo_verificacion"], string> = {
  HUELLA: "Huella",
  CONTRASENA: "Contraseña",
};
