// Convierte un valor a Date. Un texto 'YYYY-MM-DD' (solo fecha) JavaScript lo
// interpreta en UTC, y en Colombia (UTC-5) quedaria en el dia anterior; por eso
// se le agrega "T00:00:00": una fecha con hora y sin zona se lee en hora local.
function leerFecha(valor: string | Date): Date {
  if (valor instanceof Date) return new Date(valor.getTime());
  return /^\d{4}-\d{2}-\d{2}$/.test(valor) ? new Date(valor + "T00:00:00") : new Date(valor);
}

export const utils = {
  money(valor: number): string {
    const n = Number(valor) || 0;
    return "$" + n.toLocaleString("es-CO", { maximumFractionDigits: 0 });
  },

  num(valor: number): string {
    return (Number(valor) || 0).toLocaleString("es-CO");
  },

  fecha(valor: string): string {
    if (!valor) return "—";
    const d = leerFecha(valor);
    return isNaN(d.getTime())
      ? "—"
      : d.toLocaleDateString("es-CO", {
          day: "2-digit",
          month: "short",
          year: "numeric",
        });
  },
  // Fecha local como 'YYYY-MM-DD' (sin valor = hoy). No usa toISOString(),
  // que convierte a UTC: despues de las 7 p. m. en Colombia daria la de manana.
  isoDate(valor?: string | Date): string {
    const d = valor ? leerFecha(valor) : new Date();
    if (isNaN(d.getTime())) return "";
    const mes = String(d.getMonth() + 1).padStart(2, "0");
    const dia = String(d.getDate()).padStart(2, "0");
    return d.getFullYear() + "-" + mes + "-" + dia;
  },

  hora(valor: string): string {
    if (!valor) return "—";
    const d = new Date(valor);
    return isNaN(d.getTime())
      ? "—"
      : d.toLocaleTimeString("es-CO", { hour: "2-digit", minute: "2-digit" });
  },

  edad(FechaNacimiento: string): number | null {
    if (!FechaNacimiento) return null;
    const nac = leerFecha(FechaNacimiento);
    if (isNaN(nac.getTime())) return null;
    const hoy = new Date();
    let edad = hoy.getFullYear() - nac.getFullYear();
    const m = hoy.getMonth() - nac.getMonth();
    if (m < 0 || (m === 0 && hoy.getDate() < nac.getDate())) edad--;
    return edad;
  },

  imc(peso: number, altura: number): number | null {
    const p = Number(peso),
      a = Number(altura);
    if (!p || !a) return null;
    return Math.round((p / (a * a)) * 100) / 100;
  },

  iniciales(nombre: string, apellidos: string): string {
    const a = (nombre || "").trim().charAt(0);
    const b = (apellidos || "").trim().charAt(0);
    return (a + b).toUpperCase() || "?";
  },

  esc(str: unknown): string {
    if (str == null) return "";
    return String(str)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#039;");
  },

  badgeClass(estado: string | null | undefined): string {
    const map: Record<string, string> = {
      ACTIVA: "badge-activo",
      ACTIVO: "badge-activo",
      INACTIVO: "badge-inactivo",
      INACTIVA: "badge-inactivo",
      VENCIDA: "badge-vencida",
      RECHAZADO: "badge-rechazado",
      CANCELADA: "badge-cancelada",
      SUSPENDIDO: "badge-suspendido",
      PENDIENTE: "badge-pendiente",
      BLOQUEADO: "badge-vencida",
      CONFIRMADA: "badge-confirmada",
      EXITOSO: "badge-exitoso",
      COMPLETADA: "badge-completada",
    };
    return map[(estado || "").toUpperCase()] || "badge-inactivo";
  },

  debounce<A extends unknown[]>(fn: (...args: A) => void, ms = 300) {
    let t: ReturnType<typeof setTimeout>;
    return (...args: A) => {
      clearTimeout(t);
      t = setTimeout(() => fn(...args), ms);
    };
  },
};
