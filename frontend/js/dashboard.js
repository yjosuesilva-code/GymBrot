/* ===== dashboard.js — Vista 1 · Dashboard (P1)
   Adaptado a la base compartida: usa api.clientes/pagos/ingresos,
   utils, layout.render y las clases de gymbrot.css (seccion [P1]). ===== */
const dashboard = {
  clientes: [],
  pagos: [],
  ingresos: [],

  async init() {
    // 1) Dibuja el marco y la estructura
    layout.render('dashboard', 'Panel de control');
    document.getElementById('app-content').innerHTML = this.plantilla();

    // 2) Trae los datos (en paralelo) desde la capa api
    const [clientes, pagos, ingresos] = await Promise.all([
      api.clientes.list(),
      api.pagos.list(),
      api.ingresos.list()
    ]);
    this.clientes = clientes;
    this.pagos = pagos;
    this.ingresos = ingresos;

    // 3) Llena cada sección
    this.metricas();
    this.asistencia();
    this.demografia();
    this.horasPico();
  },

  plantilla() {
    return `
      <div class="row g-3">
        <div class="col-md-6 col-xl-4">
          <div class="card-g kpi">
            <span class="kpi-label">Total de miembros activos</span>
            <div class="kpi-value neon" id="kpi-miembros">0</div>
            <div class="kpi-bar"><span id="bar-miembros" style="width:0%"></span></div>
          </div>
        </div>
        <div class="col-md-6 col-xl-4">
          <div class="card-g kpi kpi-accent">
            <span class="kpi-label">Activos ahora <span class="live-dot"></span> EN VIVO</span>
            <div class="kpi-value" id="kpi-activos">0</div>
            <div class="kpi-bar"><span class="accent" id="bar-activos" style="width:0%"></span></div>
          </div>
        </div>
        <div class="col-md-6 col-xl-4">
          <div class="card-g kpi">
            <span class="kpi-label">Ingresos este mes</span>
            <div class="kpi-value money" id="kpi-ingresos">$0</div>
            <span class="kpi-sub" id="kpi-ingresos-sub">&nbsp;</span>
          </div>
        </div>
      </div>

      <div class="row g-3">
        <div class="col-lg-8">
          <div class="card-g">
            <h2 class="card-title">Asistencia semanal</h2>
            <p class="card-sub">Ingresos de miembros · últimos 7 días</p>
            <div style="height:210px" class="mt-3"><canvas id="chart-asistencia"></canvas></div>
          </div>
        </div>
        <div class="col-lg-4">
          <div class="card-g">
            <h2 class="card-title">Demografía en vivo</h2>
            <p class="card-sub">Miembros presentes ahora</p>
            <div class="demo-list mt-3" id="demo-list">
              <div class="loader"><span class="spinner-g"></span>Cargando...</div>
            </div>
          </div>
        </div>
      </div>

      <div class="card-g">
        <h2 class="card-title">Horas pico de operación</h2>
        <p class="card-sub">Ocupación por hora (6:00 a 21:00)</p>
        <div class="pico-wrap" id="pico-horas"></div>
        <div class="pico-axis"><span>06:00</span><span>10:00</span><span>14:00</span><span>18:00</span><span>21:00</span></div>
      </div>

      <div class="row g-3">
        <div class="col-md-6">
          <a class="card-g quick-action" href="clientes.html">
            <span class="qa-badge neon">+</span>
            <div><div class="qa-title">Agregar nuevo miembro</div><div class="qa-desc">Registro rápido de un cliente</div></div>
          </a>
        </div>
        <div class="col-md-6">
          <a class="card-g quick-action" href="finanzas.html">
            <span class="qa-badge accent">$</span>
            <div><div class="qa-title">Ver finanzas</div><div class="qa-desc">Ingresos y reportes del mes</div></div>
          </a>
        </div>
      </div>
    `;
  },

  // KPIs: miembros activos, activos ahora, ingresos del mes
  metricas() {
    const activos = this.clientes.filter(c => c.estado === 'ACTIVO').length;
    document.getElementById('kpi-miembros').textContent = utils.num(activos);
    document.getElementById('bar-miembros').style.width = Math.min(100, activos * 12) + '%';

    const enGimnasio = this.ingresos.filter(r => !r.hora_salida).length;
    document.getElementById('kpi-activos').textContent = utils.num(enGimnasio);
    document.getElementById('bar-activos').style.width = (activos ? Math.round(enGimnasio / activos * 100) : 0) + '%';

    const mesActual = utils.isoDate().slice(0, 7); // 'YYYY-MM'
    const ingresosMes = this.pagos
      .filter(p => p.estado_pago === 'EXITOSO' && (p.fecha_pago || '').slice(0, 7) === mesActual)
      .reduce((suma, p) => suma + (Number(p.valor) || 0), 0);
    document.getElementById('kpi-ingresos').textContent = utils.money(ingresosMes);
    document.getElementById('kpi-ingresos-sub').textContent = 'Pagos exitosos de ' + mesActual;
  },

  // Gráfica de barras: ingresos por día (últimos 7 días)
  asistencia() {
    const dias = [];
    const hoy = new Date();
    for (let i = 6; i >= 0; i--) {
      const d = new Date(hoy);
      d.setDate(hoy.getDate() - i);
      dias.push({ iso: utils.isoDate(d), label: d.toLocaleDateString('es-CO', { weekday: 'short' }).toUpperCase(), total: 0 });
    }
    this.ingresos.forEach(r => {
      const dia = dias.find(x => x.iso === r.fecha);
      if (dia) dia.total++;
    });

    const data = dias.map(d => d.total);
    const max = Math.max(...data, 1);
    const ctx = document.getElementById('chart-asistencia').getContext('2d');
    new Chart(ctx, {
      type: 'bar',
      data: {
        labels: dias.map(d => d.label),
        datasets: [{
          data,
          backgroundColor: data.map(v => v === max ? '#D4FF00' : '#2a4a50'),
          borderRadius: 2,
          maxBarThickness: 22
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: { legend: { display: false } },
        scales: {
          y: { beginAtZero: true, grid: { color: '#1f2125' }, ticks: { color: '#6b7280', precision: 0 } },
          x: { grid: { display: false }, ticks: { color: '#6b7280' } }
        }
      }
    });
  },

  // Demografía de quienes están en el gimnasio ahora (ingresos sin salida)
  demografia() {
    const idsDentro = [...new Set(this.ingresos.filter(r => !r.hora_salida).map(r => r.id_cliente))];
    const presentes = this.clientes.filter(c => idsDentro.includes(c.numero_identificacion));
    const total = presentes.length || 1;

    let adulto = 0, menor = 0, senior = 0;
    presentes.forEach(c => {
      const e = utils.edad(c.fecha_nacimiento);
      if (e == null) return;
      if (e < 18) menor++;
      else if (e <= 55) adulto++;
      else senior++;
    });

    const fila = (clase, etiqueta, rango, cant) => `
      <div class="demo-row">
        <div class="demo-badge ${clase}">${Math.round(cant / total * 100)}%</div>
        <div class="demo-info">
          <span class="demo-name">${etiqueta}<span class="demo-count">${cant} presentes</span></span>
          <span class="demo-range">${rango}</span>
        </div>
      </div>`;

    document.getElementById('demo-list').innerHTML =
      fila('demo-adulto', 'Adulto', '18 a 55 años', adulto) +
      fila('demo-menor', 'Menor de edad', 'Menos de 18', menor) +
      fila('demo-senior', 'Séller', 'Más de 55', senior);
  },

  // Barras de ocupación por hora
  horasPico() {
    const horas = {};
    for (let h = 6; h <= 21; h++) horas[h] = 0;
    this.ingresos.forEach(r => {
      const h = parseInt((r.hora_entrada || '').slice(11, 13), 10);
      if (h in horas) horas[h]++;
    });

    const max = Math.max(...Object.values(horas), 1);
    const alto = max * 0.7, moderado = max * 0.35;

    document.getElementById('pico-horas').innerHTML = Object.entries(horas).map(([h, count]) => {
      const alturaPct = count === 0 ? 4 : Math.max(10, Math.round(count / max * 100));
      const clase = count === 0 ? '' : count >= alto ? 'alto' : count >= moderado ? 'moderado' : '';
      return `<div class="pico-col ${clase}" style="height:${alturaPct}%" title="${h}:00 · ${count} ingresos"></div>`;
    }).join('');
  }
};

dashboard.init();
