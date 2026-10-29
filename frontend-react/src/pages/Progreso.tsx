import { useEffect, useState } from "react";
import { Modal } from "react-bootstrap";
import { api } from "../data/api";
import { utils } from "../lib/utils";
import { instructorEnSesion } from "../lib/sesionInstructor"; // [P3] B4 · KAN-91
import { alumnosDeInstructor } from "../lib/rutinas"; // [P3] B4 · KAN-91
import type { Cliente, Progreso as ProgresoRow } from "../types";
import { Line } from "react-chartjs-2";
import {
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Chart as ChartJS,
  Tooltip,
  Legend,
} from "chart.js";
import type { ChartData, ChartOptions } from "chart.js";

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, Tooltip, Legend);

type FormProgreso = {
  id_cliente: string;
  fecha: string;
  peso: string;
  alturaCm: string;
  porcentaje_grasa: string;
  masa_muscular: string;
  notas: string;
};

const VACIO: FormProgreso = { id_cliente: "", fecha: "", peso: "", alturaCm: "", porcentaje_grasa: "", masa_muscular: "", notas: "" };

export function Progreso() {
  const [progreso, setProgreso] = useState<ProgresoRow[]>([]);
  const [clientes, setClientes] = useState<Cliente[]>([]);
  const [cargando, setCargando] = useState(true);
  const [show, setShow] = useState(false);
  const [form, setForm] = useState<FormProgreso>(VACIO);
  const [error, setError] = useState("");
  const [clienteSel, setClienteSel] = useState<string>("");
  const [pagina, setPagina] = useState(1);
  const POR_PAGINA = 8;
  // [P3] B4 · KAN-91: si entra un INSTRUCTOR solo ve el progreso de sus alumnos (misma regla que la vista Alumnos)
  const [miCedula] = useState(instructorEnSesion);

  useEffect(() => {
    (async () => {
      const [p, todos, filas] = await Promise.all([
        api.progreso.list(),
        api.clientes.list(),
        miCedula ? api.rutinas.listaSupervision() : Promise.resolve([]),
      ]);
      const c = miCedula
        ? alumnosDeInstructor(filas, todos, miCedula)
            .map((a) => a.cliente)
            .filter((x): x is Cliente => x !== undefined)
        : todos;
      setProgreso(p);
      setClientes(c);
      setCargando(false);
      if (c.length > 0) {
        setClienteSel((sel) => sel || c[0].numero_identificacion);
      }
    })();
  }, [miCedula]);

  const setCampo = (campo: keyof FormProgreso, valor: string) =>
    setForm((f) => ({ ...f, [campo]: valor }));

  function abrirNuevo() {
    setForm({ ...VACIO, fecha: utils.isoDate(), id_cliente: clienteSel || "" });
    setError("");
    setShow(true);
  }

  async function guardar() {
    if (!form.id_cliente || !form.fecha || !form.peso || !form.alturaCm) {
      setError("Cliente, fecha, peso y altura (cm) son obligatorios");
      return;
    }
    const alturaMetros = Number(form.alturaCm) / 100;
    const res = await api.progreso.create({
      id_cliente: form.id_cliente,
      fecha: form.fecha,
      peso: Number(form.peso),
      altura: alturaMetros,
      porcentaje_grasa: form.porcentaje_grasa ? Number(form.porcentaje_grasa) : undefined,
      masa_muscular: form.masa_muscular ? Number(form.masa_muscular) : undefined,
      notas: form.notas,
    });
    if (!res.ok) {
      setError(res.mensaje);
      return;
    }
    setShow(false);
    setProgreso(await api.progreso.list());
  }

  async function eliminar(id: number) {
    if (!confirm("¿Eliminar esta medición?")) return;
    const res = await api.progreso.remove(id);
    if (res.ok) {
      const p = await api.progreso.list();
      setProgreso(p);
    }
  }

  const progresoCliente = clienteSel
    ? progreso.filter((p) => p.id_cliente === clienteSel).sort((a, b) => (a.fecha < b.fecha ? 1 : -1))
    : [];
  const progresoAsc = [...progresoCliente].sort((a, b) => (a.fecha > b.fecha ? 1 : -1));

  const kpiUltimo = progresoCliente[0];
  const kpiPrimero = progresoAsc[0];
  const difPeso = kpiUltimo && kpiPrimero ? Number((kpiUltimo.peso - kpiPrimero.peso).toFixed(2)) : 0;
  const imcUlt = kpiUltimo ? utils.imc(kpiUltimo.peso, kpiUltimo.altura) : null;
  const imcPrim = kpiPrimero ? utils.imc(kpiPrimero.peso, kpiPrimero.altura) : null;

  const chartData: ChartData<"line"> = {
    labels: progresoAsc.map((p) => utils.fecha(p.fecha)),
    datasets: [
      { label: "Peso (kg)", data: progresoAsc.map((p) => p.peso), borderColor: "#c6ff00", backgroundColor: "rgba(198,255,0,0.4)", tension: 0.2 },
      { label: "Grasa %", data: progresoAsc.map((p) => p.porcentaje_grasa ?? 0), borderColor: "#ff8a3d", backgroundColor: "rgba(255,138,61,0.4)", tension: 0.2 },
      { label: "Masa Muscular", data: progresoAsc.map((p) => p.masa_muscular ?? 0), borderColor: "#00d9c0", backgroundColor: "rgba(0,217,192,0.4)", tension: 0.2 },
    ],
  };
  const chartOpts: ChartOptions<"line"> = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: { legend: { labels: { color: "#e8eaed" } } },
    scales: {
      x: { ticks: { color: "#8a8f98" }, grid: { color: "rgba(255,255,255,.06)" } },
      y: { ticks: { color: "#8a8f98" }, grid: { color: "rgba(255,255,255,.06)" } },
    },
  };

  const totalPaginas = Math.max(1, Math.ceil(progresoCliente.length / POR_PAGINA));
  const paginaSegura = Math.min(pagina, totalPaginas);
  const paginadas = progresoCliente.slice((paginaSegura - 1) * POR_PAGINA, paginaSegura * POR_PAGINA);

  return (
    <div className="d-flex flex-column gap-3">
      <div className="card-g">
        <div className="card-head">
          <div>
            <h2 className="card-title">Progreso</h2>
            <p className="card-sub">Mediciones físicas de los miembros</p>
          </div>
          <div className="d-flex gap-2 align-items-center">
            <select className="form-control-dark" style={{ minWidth: 220 }} value={clienteSel} onChange={(e) => { setClienteSel(e.target.value); setPagina(1); }}>
              {clientes.map((c) => (
                <option key={c.numero_identificacion} value={c.numero_identificacion}>
                  {c.nombre} {c.apellidos}
                </option>
              ))}
            </select>
            <button className="btn-neon" onClick={abrirNuevo}>+ Nueva medición</button>
          </div>
        </div>
      </div>

      <div className="row g-3">
        <div className="col-md-3">
          <div className="card-g kpi h-100">
            <span className="kpi-label">Peso último</span>
            <span className="kpi-value">{kpiUltimo ? kpiUltimo.peso + " kg" : "—"}</span>
          </div>
        </div>
        <div className="col-md-3">
          <div className="card-g kpi h-100">
            <span className="kpi-label">IMC último</span>
            <span className="kpi-value">{imcUlt ?? "—"}</span>
            <span className="kpi-sub">{kpiUltimo ? (kpiUltimo.altura * 100) + " cm" : ""}</span>
          </div>
        </div>
        <div className="col-md-3">
          <div className="card-g kpi h-100">
            <span className="kpi-label">Evolución peso</span>
            <span className="kpi-value">{difPeso > 0 ? "+" + difPeso : difPeso} kg</span>
            <span className="kpi-sub">Último - Primero</span>
          </div>
        </div>
        <div className="col-md-3">
          <div className="card-g kpi h-100">
            <span className="kpi-label">IMC cambio</span>
            <span className="kpi-value">{(imcUlt && imcPrim) ? (imcUlt - imcPrim).toFixed(2) : "—"}</span>
          </div>
        </div>
      </div>

      <div className="card-g">
        <div className="card-head">
          <h3 className="card-title">Gráfico de evolución</h3>
        </div>
        <div style={{ height: 260 }}>
          <Line data={chartData} options={chartOpts} />
        </div>
      </div>

      <div className="card-g">
        <div className="card-head">
          <h3 className="card-title">Historial</h3>
        </div>
        <div className="table-wrap">
          <table className="table-g">
            <thead>
              <tr><th>Fecha</th><th>Peso</th><th>Altura</th><th>Grasa %</th><th>Masa Muscular</th><th>IMC</th><th>Notas</th><th>Acciones</th></tr>
            </thead>
            <tbody>
              {cargando ? (
                <tr><td colSpan={8} className="loader"><span className="spinner-g"></span>Cargando...</td></tr>
              ) : progresoCliente.length === 0 ? (
                <tr><td colSpan={8} className="empty-state">Sin mediciones</td></tr>
              ) : (
                paginadas.map((p) => (
                  <tr key={p.id_progreso}>
                    <td>{utils.fecha(p.fecha)}</td>
                    <td>{p.peso} kg</td>
                    <td>{(p.altura * 100).toFixed(0)} cm</td>
                    <td>{p.porcentaje_grasa ?? "—"}%</td>
                    <td>{p.masa_muscular ?? "—"}</td>
                    <td>{utils.imc(p.peso, p.altura) ?? "—"}</td>
                    <td>{p.notas || "—"}</td>
                    <td>
                      <button className="btn-dark" onClick={() => eliminar(p.id_progreso)}>Eliminar</button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
        {progresoCliente.length > POR_PAGINA && (
          <div className="d-flex justify-content-between mt-2">
            <button className="btn-dark" disabled={paginaSegura <= 1} onClick={() => setPagina((x) => x - 1)}>Anterior</button>
            <span className="card-sub">Página {paginaSegura} de {totalPaginas}</span>
            <button className="btn-dark" disabled={paginaSegura >= totalPaginas} onClick={() => setPagina((x) => x + 1)}>Siguiente</button>
          </div>
        )}
      </div>

      <Modal show={show} onHide={() => setShow(false)} centered>
        <Modal.Header closeButton>
          <Modal.Title>Nueva medición</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          {error && <div className="alert-g alert-error show">{error}</div>}
          <div className="row g-3">
            <div className="col-12">
              <label className="form-label-g">Cliente</label>
              <select className="form-control-dark" value={form.id_cliente} onChange={(e) => setCampo("id_cliente", e.target.value)}>
                <option value="">— Selecciona —</option>
                {clientes.map((c) => (
                  <option key={c.numero_identificacion} value={c.numero_identificacion}>
                    {c.nombre} {c.apellidos}
                  </option>
                ))}
              </select>
            </div>
            <div className="col-md-4">
              <label className="form-label-g">Fecha</label>
              <input type="date" className="form-control-dark" value={form.fecha} onChange={(e) => setCampo("fecha", e.target.value)} />
            </div>
            <div className="col-md-3">
              <label className="form-label-g">Peso (kg)</label>
              <input type="number" className="form-control-dark" value={form.peso} onChange={(e) => setCampo("peso", e.target.value)} />
            </div>
            <div className="col-md-3">
              <label className="form-label-g">Altura (cm)</label>
              <input type="number" step="1" className="form-control-dark" value={form.alturaCm} onChange={(e) => setCampo("alturaCm", e.target.value)} />
            </div>
            <div className="col-md-3">
              <label className="form-label-g">% Grasa</label>
              <input type="number" step="0.1" className="form-control-dark" value={form.porcentaje_grasa} onChange={(e) => setCampo("porcentaje_grasa", e.target.value)} />
            </div>
            <div className="col-md-3">
              <label className="form-label-g">Masa Muscular</label>
              <input type="number" step="0.1" className="form-control-dark" value={form.masa_muscular} onChange={(e) => setCampo("masa_muscular", e.target.value)} />
            </div>
            <div className="col-12">
              <label className="form-label-g">Notas</label>
              <input className="form-control-dark" value={form.notas} onChange={(e) => setCampo("notas", e.target.value)} />
            </div>
          </div>
        </Modal.Body>
        <Modal.Footer>
          <button className="btn-dark" onClick={() => setShow(false)}>Cancelar</button>
          <button className="btn-neon" onClick={guardar}>Guardar</button>
        </Modal.Footer>
      </Modal>
    </div>
  );
}