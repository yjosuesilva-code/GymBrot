/* ===== utils.js — funciones de formato que se usan en toda la app ===== */
const utils = {

  // Dinero en pesos colombianos, sin decimales:  180000 -> "$180.000"
  money(valor) {
    const n = Number(valor) || 0;
    return '$' + n.toLocaleString('es-CO', { maximumFractionDigits: 0 });
  },

  // Número con separador de miles: 1240 -> "1.240"
  num(valor) {
    return (Number(valor) || 0).toLocaleString('es-CO');
  },

  // Fecha legible: "2026-09-10" -> "10 sept 2026"
  fecha(valor) {
    if (!valor) return '—';
    const d = new Date(valor);
    return isNaN(d) ? '—' : d.toLocaleDateString('es-CO', { day: '2-digit', month: 'short', year: 'numeric' });
  },

  // Fecha para inputs <input type="date">: Date -> "2026-09-10"
  isoDate(valor) {
    const d = valor ? new Date(valor) : new Date();
    return isNaN(d) ? '' : d.toISOString().slice(0, 10);
  },

  // Solo la hora -> "06:30"
  hora(valor) {
    if (!valor) return '—';
    const d = new Date(valor);
    return isNaN(d) ? '—' : d.toLocaleTimeString('es-CO', { hour: '2-digit', minute: '2-digit' });
  },

  // Edad en años a partir de la fecha de nacimiento
  edad(fechaNac) {
    if (!fechaNac) return null;
    const nac = new Date(fechaNac);
    if (isNaN(nac)) return null;
    const hoy = new Date();
    let e = hoy.getFullYear() - nac.getFullYear();
    const m = hoy.getMonth() - nac.getMonth();
    if (m < 0 || (m === 0 && hoy.getDate() < nac.getDate())) e--;
    return e;
  },

  // IMC = peso / altura²  (redondeado a 2 decimales)
  imc(peso, alturaM) {
    const p = Number(peso), a = Number(alturaM);
    if (!p || !a) return null;
    return Math.round((p / (a * a)) * 100) / 100;
  },

  // Iniciales para el avatar:  ("Ana","Ruiz") -> "AR"
  iniciales(nombre, apellidos) {
    const a = (nombre || '').trim().charAt(0);
    const b = (apellidos || '').trim().charAt(0);
    return (a + b).toUpperCase() || '?';
  },

  // Protege el HTML al pintar datos (evita que un dato raro rompa la página)
  esc(str) {
    if (str == null) return '';
    return String(str)
      .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
  },

  // Estado (ACTIVA, VENCIDA, PENDIENTE...) -> clase de color del badge
  badgeClass(estado) {
    const map = {
      ACTIVA:'badge-activo', ACTIVO:'badge-activo',
      INACTIVO:'badge-inactivo', INACTIVA:'badge-inactivo',
      VENCIDA:'badge-vencida', RECHAZADO:'badge-rechazado', CANCELADA:'badge-cancelada',
      SUSPENDIDO:'badge-suspendido', PENDIENTE:'badge-pendiente', BLOQUEADO:'badge-vencida',
      CONFIRMADA:'badge-confirmada', EXITOSO:'badge-exitoso', COMPLETADA:'badge-completada'
    };
    return map[(estado || '').toUpperCase()] || 'badge-inactivo';
  },

  // Espera a que dejes de escribir antes de buscar (para el buscador)
  debounce(fn, ms = 300) {
    let t;
    return function (...args) { clearTimeout(t); t = setTimeout(() => fn.apply(this, args), ms); };
  }
};