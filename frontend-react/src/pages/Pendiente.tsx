type PendienteProps = {
  modulo: string;
  responsable: string;
};

export function Pendiente({ modulo, responsable }: PendienteProps) {
  return (
    <div className="card-g">
      <div className="card-head">
        <div>
          <h2 className="card-title">Vista en construccion</h2>
          <p className="card-sub">El modulo {modulo} todavia no esta migrado a React</p>
        </div>
        <span className="badge-g">Pendiente</span>
      </div>
      <div className="empty-state">
        <p>
          Este modulo todavia no tiene vista. Segun la division del equipo le
          corresponde a <strong>{responsable}</strong>, asi que el menu ya lo
          muestra pero la pagina llegara con su entrega.
        </p>
      </div>
    </div>
  );
}