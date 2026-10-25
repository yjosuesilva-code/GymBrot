const utils = {
  money(value) {
    return new Intl.NumberFormat("es-CO", {
      style: "currency",
      currency: "COP",
      maximumFractionDigits: 0,
    }).format(value);
  },

  setText(id, value) {
    const el = document.getElementById(id);
    if (el) el.textContent = value;
  },

  numberText(num) {
    return new Intl.NumberFormat("es-CO").format(num);
  },

  toIsoDate(date) {
    return date.toISOString().slice(0, 10);
  },

  sumBy(arr, getter) {
    return arr.reduce((acc, item) => acc + getter(item), 0);
  },
};