const dashboard = {
  clientes: [],
  pagos: [],
  ingresos: [],
  chartAsistencia: null,

  constructor() {
    // Esqueleto de la vista (SECCION 1 a 4)
    layout.render("dashboard", "Panel de control");
    const content = document.getElementById("main-content");

    content.innerHTML = `
      <!-- SECCION 1: Metricas -->
      <div class="row g-3">
        <div class="col-md-6 col-xl-4">
          <div class="card-g card-kpi h-100">
            <span class="kpi-label">TOTAL DE MIEMBROS</span>
            <div class="kpi-value"><span id="kpi-miembros">0</span><span class="kpi-trend" id="kpi-miembros-trend">0%</span></div>
            <div class="progress-neon"><div class="progress-neon-bar" id="bar-miembros" style="width:0%"></div></div>
          </div>
        </div>
        <div class="col-md-6 col-xl-4">
          <div class="card-g card-kpi accent-border h-100">
            <span class="kpi-label">ACTIVOS AHORA</span>
            <div class="kpi-value"><span id="kpi-activos">0</span><span class="kpi-trend"><span class="dot accent"></span> EN VIVO</span></div>
            <div class="progress-neon"><div class="progress-neon-bar progress-accent-bar" id="bar-activos" style="width:0%"></div></div>
          </div>
        </div>
        <div class="col-md-6 col-xl-4">
          <div class="card-g card-kpi h-100">
            <span class="kpi-label">INGRESOS ESTE MES</span>
            <div class="kpi-value"><span id="kpi-ingresos" class="font-grotesk" style="font-size:30px">$0</span><span class="kpi-trend" id="kpi-ingresos-status">Cargando...</span></div>
            <div class="d-flex justify-content-between"><span class="text-muted font-grotesk" style="font-size:10px">PROGRESO HACIA EL OBJETIVO</span><span class="font-grotesk kpi-trend" id="kpi-ingresos-progreso">0%</span></div>
          </div>
        </div>
      </div>

      <!-- SECCION 2: Graficas -->
      <div class="row g-3">
        <div class="col-lg-8">
          <div class="card-g h-100">
            <div class="d-flex align-items-center justify-content-between mb-1 flex-wrap gap-2">
              <span class="chart-title">Asistencia Semanal</span>
              <div class="d-flex gap-2">
                <button class="btn-dark" id="btn-diario" onclick="dashboard.verDiario()">Diario</button>
                <button class="btn-neon" id="btn-semanal" onclick="dashboard.verSemanal()">Semanal</button>
              </div>
            </div>
            <span class="chart-sub">Ingresos de miembros - ultimos 7 dias</span>
            <div class="w-100 mt-3" style="height:210px"><canvas id="chart-asistencia"></canvas></div>
          </div>
        </div>
        <div class="col-lg-4">
          <div class="card-g h-100 d-flex flex-column">
            <span class="chart-title mb-3">Demografía en Vivo</span>
            <div class="demografia">
              <div class="demo-row">
                <div class="demo-badge adulto" id="pct-adulto">0%</div>
                <div class="demo-info">
                  <span class="demo-info-name">Adulto<span class="count" id="cnt-adulto">0 presentes</span></span>
                  <span class="demo-info-range">18-55 años</span>
                </div>
              </div>
              <div class="demo-row">
                <div class="demo-badge menor" id="pct-menor">0%</div>
                <div class="demo-info">
                  <span class="demo-info-name">Menor de Edad<span class="count" id="cnt-menor">0 presentes</span></span>
                  <span class="demo-info-range">Bajo 18 años</span>
                </div>
              </div>
              <div class="demo-row">
                <div class="demo-badge senior" id="pct-senior">0%</div>
                <div class="demo-info">
                  <span class="demo-info-name">Señor<span class="count" id="cnt-senior">0 presentes</span></span>
                  <span class="demo-info-range">55 años y más</span>
                </div>
              </div>
            </div>
            <div class="mt-auto pt-3">
              <button class="btn-action" onclick="window.location.href='acceso.html'">Ver Registro Detallado</button>
            </div>
          </div>
        </div>
      </div>

      <!-- SECCION 3: Horas Pico -->
      <div class="card-g">
        <div class="d-flex align-items-center justify-content-between flex-wrap gap-2">
          <div>
            <div class="chart-title">HORAS PICO DE OPERACIÓN</div>
            <span class="chart-sub">Ocupación diaria promedio por hora</span>
          </div>
          <div class="chart-legend">
            <span><span class="dot neon"></span> TRAFICO ALTO</span>
            <span><span class="dot moderado"></span> MODERADO</span>
          </div>
        </div>
        <div class="pico-horas mt-4" id="pico-horas"></div>
        <div class="pico-baseline">
          <span>06:00 AM</span><span>10:00 AM</span><span>02:00 PM</span><span>06:00 PM</span><span>10:00 PM</span>
        </div>
      </div>

      <!-- SECCION 4: Acciones rapidas -->
      <div class="row g-3">
        <div class="col-md-6">
          <a class="quick-action h-100" href="clientes.html">
            <span class="qa-icon neon">Nuevo</span>
            <div>
              <div class="qa-title">Agregar Nuevo Miembro</div>
              <div class="qa-desc">Registro rápido de un nuevo atleta en el sistema</div>
            </div>
          </a>
        </div>
        <div class="col-md-6">
          <a class="quick-action h-100" href="#" onclick="alert('Exportar informe de rendimiento: disponible en la vista Finanzas'); return false;">
            <span class="qa-icon accent">PDF</span>
            <div>
              <div class="qa-title">Exportar Informe de Rendimiento</div>
              <div class="qa-desc">Generar PDF para resumen mensual del negocio</div>
            </div>
          </a>
        </div>
      </div>
    `;
  },

  async init() {
    this.constructor();
    await api.iniciar();
    const [clientes, pagos, ingresos] = await Promise.all([
      api.get("/clientes"),
      api.get("/pagos"),
      api.get("/ingresos"),
    ]);
    this.clientes = clientes;
    this.pagos = pagos;
    this.ingresos = ingresos;

    this.cargarMetricas();
    this.cargarAsistencia();
    this.cargarDemografia();
    this.cargarHorasPico();
  },

  cargarMetricas() {
    const db = api.leerLocal();
    const meta = db ? db.tenant.metaIngresosMensual : 15000000;
    const activos = this.clientes.filter((c) => c.estado === "ACTIVO");
    utils.setText("kpi-miembros", utils.numberText(activos.length));

    const ingresosMes = utils.sumBy(this.pagos, (p) => p.monto);
    utils.setText("kpi-ingresos", utils.money(ingresosMes));
    const pct = Math.round((ingresosMes / meta) * 100);
    utils.setText("kpi-ingresos-status", "Objetivo: " + utils.money(meta));
    utils.setText("kpi-ingresos-progreso", pct + "%");
  },

  cargarAsistencia() {
    const hoy = new Date();
    const diasMap = {};

    for (let i = 6; i >= 0; i--) {
      const d = new Date(hoy);
      d.setDate(hoy.getDate() - i);
      diasMap[utils.toIsoDate(d)] = {
        label: d.toLocaleDateString("es-CO", { weekday: "short" }).toUpperCase(),
        total: 0,
      };
    }

    this.ingresos.filter((r) => r.tipo === "ENTRADA").forEach((r) => {
      if (r.fecha in diasMap) diasMap[r.fecha].total++;
    });

    const labels = Object.values(diasMap).map((d) => d.label);
    const data = Object.values(diasMap).map((d) => d.total);

    const ctx = document.getElementById("chart-asistencia").getContext("2d");
    this.chartAsistencia = new Chart(ctx, {
      type: "bar",
      data: {
        labels,
        datasets: [{
          data,
          backgroundColor: data.map((v) => (v === Math.max(...data) ? "#D4FF00" : "#2a4a50")),
          borderRadius: 2,
          maxBarThickness: 8,
        }],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: { legend: { display: false } },
        scales: {
          y: { beginAtZero: true, grid: { color: "#1f2125" }, ticks: { color: "#6b7280" } },
          x: { grid: { display: false }, ticks: { color: "#6b7280", fontWeight: 700 } },
        },
      },
    });
  },

  cargarDemografia() {
    const hoy = utils.toIsoDate(new Date());
    const idsActivos = new Set(
      this.ingresos.filter((r) => r.tipo === "ENTRADA" && r.fecha === hoy).map((r) => r.clienteId)
    );
    const presentes = this.clientes.filter((c) => idsActivos.has(c.id));
    const total = presentes.length || 1;

    const adulto = presentes.filter((c) => c.edad >= 18 && c.edad <= 55).length;
    const menor = presentes.filter((c) => c.edad < 18).length;
    const senior = presentes.filter((c) => c.edad > 55).length;

    utils.setText("pct-adulto", Math.round((adulto / total) * 100) + "%");
    utils.setText("pct-menor", Math.round((menor / total) * 100) + "%");
    utils.setText("pct-senior", Math.round((senior / total) * 100) + "%");
    utils.setText("cnt-adulto", adulto + " presentes");
    utils.setText("cnt-menor", menor + " presentes");
    utils.setText("cnt-senior", senior + " presentes");
  },

  cargarHorasPico() {
    const horas = {};
    for (let h = 6; h <= 21; h++) horas[String(h).padStart(2, "0")] = 0;
    this.ingresos.filter((r) => r.tipo === "ENTRADA").forEach((r) => {
      const hh = r.hora.slice(0, 2);
      if (hh in horas) horas[hh]++;
    });

    const max = Math.max(...Object.values(horas));
    const bucket = document.getElementById("pico-horas");
    const altoUmbral = max * 0.7;
    const moderadoUmbral = max * 0.35;

    Object.entries(horas).forEach(([hora, count]) => {
      const h = parseInt(hora, 10);
      const pct = count === 0 ? 4 : Math.max(10, Math.round((count / max) * 100));
      const clase = max === 0 ? "" : count >= altoUmbral ? "alto" : count >= moderadoUmbral ? "moderado" : "";
      const col = document.createElement("div");
      col.className = "pico-col " + clase;
      col.style.height = pct + "%";
      col.title = h + ":00 - " + count + " ingresos";
      bucket.appendChild(col);
    });
  },

  verDiario() {
    document.getElementById("btn-diario").className = "btn-neon";
    document.getElementById("btn-semanal").className = "btn-dark";
  },

  verSemanal() {
    document.getElementById("btn-diario").className = "btn-dark";
    document.getElementById("btn-semanal").className = "btn-neon";
  },
};