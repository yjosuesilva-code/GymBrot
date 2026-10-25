/* [P3] Reduce una foto subida a un JPEG en base64 (data:image/jpeg;base64,…) de ~20 KB como máximo.
   Usa un <canvas>: se dibuja la imagen más pequeña y se exporta bajando la calidad hasta que quepa.
   La usan Ejercicios (KAN-97, 400 px) y la foto del instructor (KAN-93, 240 px).
   `cuadrada` recorta el centro de la imagen (para avatares redondos). */
const BYTES_MAX = 20 * 1024;

export function reducirFoto(archivo: File, anchoMax = 400, cuadrada = false): Promise<string> {
  return new Promise((resolver, rechazar) => {
    if (!archivo.type.startsWith("image/")) {
      rechazar(new Error("El archivo no es una imagen"));
      return;
    }
    const url = URL.createObjectURL(archivo);
    const img = new Image();
    img.onload = () => {
      URL.revokeObjectURL(url);
      // Zona de la imagen original que se usa: toda, o el cuadrado del centro
      const lado = Math.min(img.width, img.height);
      const sx = cuadrada ? (img.width - lado) / 2 : 0;
      const sy = cuadrada ? (img.height - lado) / 2 : 0;
      const sw = cuadrada ? lado : img.width;
      const sh = cuadrada ? lado : img.height;
      let ancho = Math.min(anchoMax, sw);
      let resultado = "";
      // Si ni con calidad baja cabe en ~20 KB, se reduce también el ancho
      while (ancho >= 120) {
        const alto = Math.round((sh * ancho) / sw);
        const canvas = document.createElement("canvas");
        canvas.width = ancho;
        canvas.height = alto;
        const ctx = canvas.getContext("2d");
        if (!ctx) {
          rechazar(new Error("El navegador no permite procesar la imagen"));
          return;
        }
        ctx.drawImage(img, sx, sy, sw, sh, 0, 0, ancho, alto);
        for (let calidad = 0.8; calidad >= 0.4; calidad -= 0.1) {
          resultado = canvas.toDataURL("image/jpeg", calidad);
          // base64 ocupa ~4/3 de los bytes reales
          if (resultado.length * 0.75 <= BYTES_MAX) {
            resolver(resultado);
            return;
          }
        }
        ancho = Math.round(ancho * 0.8);
      }
      resolver(resultado);
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      rechazar(new Error("No se pudo leer la imagen"));
    };
    img.src = url;
  });
}
