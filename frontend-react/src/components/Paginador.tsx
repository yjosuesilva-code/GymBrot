// Paginación reutilizable para las listas largas (100 socios, 20
// instructores, 100 ejercicios, 80 membresías...). El componente es "tonto":
// recibe la página activa y el total, y avisa qué página pedir; quien lo usa
// guarda `pagina` en su state y recorta la lista filtrada con una función
// `slice(pagina - 1, pagina)`.

type PaginadorProps = {
  pagina: number;
  total: number;
  porPagina: number;
  onCambiar: (n: number) => void;
};

const MAX_BOTONES = 7; // páginas visibles antes de colapsar con "…"

// Devuelve la lista de páginas a mostrar, con "…" donde se ocultan páginas.
// Se intenta que la página activa quede siempre cerca del centro del grupo.
function rangoPaginas(actual: number, totalPaginas: number): (number | "…")[] {
  if (totalPaginas <= MAX_BOTONES) {
    return Array.from({ length: totalPaginas }, (_, i) => i + 1);
  }

  const paginas = new Set<number>([1, totalPaginas, actual - 1, actual, actual + 1]);
  const orden = [...paginas].filter((p) => p >= 1 && p <= totalPaginas).sort((a, b) => a - b);

  const resultado: (number | "…")[] = [];
  let anterior = 0;
  for (const p of orden) {
    if (p - anterior > 1) resultado.push("…");
    resultado.push(p);
    anterior = p;
  }
  return resultado;
}

export function Paginador({ pagina, total, porPagina, onCambiar }: PaginadorProps) {
  const totalPaginas = Math.max(1, Math.ceil(total / porPagina));
  if (totalPaginas <= 1) return null;

  const primera = (pagina - 1) * porPagina + 1;
  const ultima = Math.min(pagina * porPagina, total);

  function ir(p: number) {
    if (p >= 1 && p <= totalPaginas) onCambiar(p);
  }

  return (
    <nav className="paginador" aria-label="Paginación">
      <span className="paginador-info">
        {primera}–{ultima} de {total}
      </span>
      <div className="paginador-pages">
        <button
          type="button"
          className="paginador-btn"
          disabled={pagina <= 1}
          aria-label="Página anterior"
          onClick={() => ir(pagina - 1)}
        >
          ‹
        </button>
        {rangoPaginas(pagina, totalPaginas).map((p, i) =>
          p === "…" ? (
            <span key={"e" + i} className="paginador-elipsis">
              …
            </span>
          ) : (
            <button
              key={p}
              type="button"
              className={"paginador-btn" + (p === pagina ? " activo" : "")}
              aria-current={p === pagina ? "page" : undefined}
              onClick={() => ir(p)}
            >
              {p}
            </button>
          )
        )}
        <button
          type="button"
          className="paginador-btn"
          disabled={pagina >= totalPaginas}
          aria-label="Página siguiente"
          onClick={() => ir(pagina + 1)}
        >
          ›
        </button>
      </div>
    </nav>
  );
}