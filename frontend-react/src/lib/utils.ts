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
    const d = new Date(valor);
    return isNaN(d.getTime())
      ? "—"
      : d.toLocaleDateString("es-CO", {
          day: "2-digit",
          month: "short",
          year: "numeric",
        });
  },
  isoDate(valor?: string | Date): string {
    const d = valor ? new Date(valor) : new Date();
    return isNaN(d.getTime()) ? "" : d.toISOString().slice(0, 10);
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
    const nac = new Date(FechaNacimiento);
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
