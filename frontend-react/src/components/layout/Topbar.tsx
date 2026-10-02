type TopbarProps = { titulo: string };

export function Topbar({ titulo }: TopbarProps) {
  return (
    <header className="topbar">
      <div className="topbar-title">{titulo}</div>
      <div className="topbar-right">
        <span className="topbar-user">Admin</span>
        <div className="avatar">A</div>
      </div>
    </header>
  );
}
