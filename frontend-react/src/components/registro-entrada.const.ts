export type ModoRegistro = "ENTRADA" | "SALIDA";

export const CRESTAS_VAL = [64, 92, 116, 136, 152, 164, 172, 176, 172, 164, 152, 136, 116, 92, 64];

export const CRESTAS = CRESTAS_VAL;
export const CRESTAS_MOCK = CRESTAS_VAL;

export const ETIQUETA_METODO = {
  HUELLA: "Huella",
  CONTRASENA: "Contraseña",
} as const;