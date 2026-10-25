import { useState } from "react";
import { utils } from "../../lib/utils";

/* [P3] B5 · KAN-93 — Avatar de un instructor: su foto si la tiene, o sus iniciales.
   Si la foto no carga (enlace roto), también se muestran las iniciales.
   Quien lo usa le pone key={foto} para que el estado "falló" empiece de cero al cambiar la foto. */
type Props = {
  nombre: string;
  apellidos: string;
  foto?: string;
  grande?: boolean;   // la ficha usa el avatar grande; la lista, el normal
};

export function AvatarInstructor({ nombre, apellidos, foto, grande = false }: Props) {
  const [fallo, setFallo] = useState(false);
  const clase = "person-avatar" + (grande ? " inst-avatar-grande" : "");
  if (foto && !fallo) {
    return <img src={foto} alt={"Foto de " + nombre} className={clase + " inst-avatar-foto"} onError={() => setFallo(true)} />;
  }
  return <div className={clase}>{utils.iniciales(nombre, apellidos)}</div>;
}
