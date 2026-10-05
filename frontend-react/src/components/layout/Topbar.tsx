type TopbarProps = { titulo: string; nombre: string };

export function Topbar({ titulo, nombre }: TopbarProps) {
  return (
    <header className="topbar">
      <div className="topbar-title">{titulo}</div>
      <div className="topbar-right">
        <span className="topbar-user">{nombre}</span>
        <div className="avatar">{nombre.charAt(0) || "A"}</div>
      </div>
    </header>
  );
}