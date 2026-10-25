/* [P3] B7 · KAN-94 — Pestañas de /citas: "Citas" (1 a 1, vista de P2) y "Clases" (grupales con aforo). */
export type PestanaCitas = "citas" | "clases";

type Props = { activa: PestanaCitas; onCambiar: (p: PestanaCitas) => void };

export function PestanasCitas({ activa, onCambiar }: Props) {
  return (
    <div className="inst-seg mb-3" role="tablist" aria-label="Citas o clases">
      <button type="button" role="tab" aria-selected={activa === "citas"} className={activa === "citas" ? "activo" : ""} onClick={() => onCambiar("citas")}>
        <i className="bi bi-calendar-check" aria-hidden /> Citas
      </button>
      <button type="button" role="tab" aria-selected={activa === "clases"} className={activa === "clases" ? "activo" : ""} onClick={() => onCambiar("clases")}>
        <i className="bi bi-people" aria-hidden /> Clases
      </button>
    </div>
  );
}
