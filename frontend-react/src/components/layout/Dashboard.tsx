import { useEffect, useState } from "react";
import { api } from "../data/api";
import type { Cliente, Ingreso, Pago } from "../types";

export function Dashboard() {
  const [clientes, setClientes] = useState<Cliente[]>([]);
  const [ingresos, setIngresos] = useState<Ingreso[]>([]);
  const [pagos, setPagos] = useState<Pago[]>([]);
  const [cargando, setCargando] = useState(true);

  useEffect(() => {
    Promise.all([api.clientes.list(), api.ingresos.list(), api.pagos.list()])
      .then(([c, i, p]) => {
        setClientes(c);
        setIngresos(i);
        setPagos(p);
      })
      .finally(() => setCargando(false));
  }, []);

  if (cargando) {
    return (
      <div className="card-g">
        <div className="loader">
          <span className="spinner-g"></span>Cargando...
        </div>
      </div>
    );
  }

  return (
    <>
      {/* las secciones se insertan aqui, en orden */}
    </>
  );
}