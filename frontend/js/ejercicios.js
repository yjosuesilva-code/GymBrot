/* P4: catálogo mínimo. La página consulta la API; no usa localStorage ni fetch. */
const ejercicios = {
  lista: [],
  modal: null,
  guardando: false,

  init() {
    layout.render('ejercicios', 'Catálogo de ejercicios');
    this.renderizarVista();
    this.prepararMenu();
    this.modal = new bootstrap.Modal(document.getElementById('modalEjercicio'));
    this.registrarEventos();
    this.cargarEjercicios();
  },

  renderizarVista() {
    document.getElementById('app-content').innerHTML = `
      <section class="card-g" aria-labelledby="tituloEjercicios">
        <div class="card-head">
          <div>
            <h1 class="card-title" id="tituloEjercicios">Ejercicios</h1>
            <p class="card-sub">Organiza los ejercicios disponibles para las rutinas</p>
          </div>
          <button class="btn-neon" type="button" id="btnNuevoEjercicio">+ Nuevo ejercicio</button>
        </div>
        <div class="alert alert-g" id="avisoEjercicios" role="status" aria-live="polite"></div>
        <div class="toolbar mb-3">
          <label class="visually-hidden" for="buscarEjercicio">Buscar ejercicios</label>
          <input class="form-control-dark" id="buscarEjercicio" type="search"
            placeholder="Buscar por nombre, grupo muscular o nivel...">
        </div>
        <p class="card-sub mb-3" id="totalEjercicios" aria-live="polite"></p>
        <div class="table-wrap" tabindex="0" role="region" aria-label="Listado de ejercicios">
          <table class="table-g">
            <thead><tr><th scope="col">Ejercicio</th><th scope="col">Grupo muscular</th>
              <th scope="col">Nivel</th><th scope="col">Series</th>
              <th scope="col">Repeticiones</th><th scope="col">Recurso</th></tr></thead>
            <tbody id="tbodyEjercicios"><tr><td colspan="6" class="loader">Cargando ejercicios...</td></tr></tbody>
          </table>
        </div>
      </section>
      <div class="modal fade" id="modalEjercicio" tabindex="-1" aria-labelledby="tituloModalEjercicio" aria-hidden="true">
        <div class="modal-dialog modal-lg modal-dialog-centered modal-dialog-scrollable">
          <div class="modal-content">
            <div class="modal-header">
              <h2 class="modal-title fs-5" id="tituloModalEjercicio">Nuevo ejercicio</h2>
              <button type="button" class="btn-close" data-bs-dismiss="modal" aria-label="Cerrar"></button>
            </div>
            <div class="modal-body">
              <div class="alert alert-g alert-error" id="errorEjercicio" role="alert"></div>
              <form id="formEjercicio">
                <div class="row g-3">
                  <div class="col-12">
                    <label class="form-label-g" for="ejNombre">Nombre *</label>
                    <input class="form-control-dark" id="ejNombre" name="nombre" required>
                  </div>
                  <div class="col-md-6">
                    <label class="form-label-g" for="ejGrupo">Grupo muscular *</label>
                    <input class="form-control-dark" id="ejGrupo" name="grupoMuscular" placeholder="Ej.: piernas" required>
                  </div>
                  <div class="col-md-6">
                    <label class="form-label-g" for="ejNivel">Nivel *</label>
                    <input class="form-control-dark" id="ejNivel" name="nivel" placeholder="Ej.: principiante" required>
                  </div>
                  <div class="col-md-6">
                    <label class="form-label-g" for="ejSeries">Series *</label>
                    <input class="form-control-dark" id="ejSeries" name="series" type="number" min="1" step="1" required>
                  </div>
                  <div class="col-md-6">
                    <label class="form-label-g" for="ejRepeticiones">Repeticiones *</label>
                    <input class="form-control-dark" id="ejRepeticiones" name="repeticiones" type="number" min="1" step="1" required>
                  </div>
                  <div class="col-12">
                    <label class="form-label-g" for="ejDescripcion">Descripción</label>
                    <textarea class="form-control-dark" id="ejDescripcion" name="descripcion" rows="3"></textarea>
                  </div>
                  <div class="col-12">
                    <label class="form-label-g" for="ejRecurso">Enlace al recurso</label>
                    <input class="form-control-dark" id="ejRecurso" name="recursoUrl" type="url" placeholder="https://...">
                  </div>
                </div>
                <p class="card-sub mt-3">* Campos obligatorios. El identificador se asigna al guardar.</p>
              </form>
            </div>
            <div class="modal-footer">
              <button class="btn-dark" type="button" data-bs-dismiss="modal">Cancelar</button>
              <button class="btn-neon" id="guardarEjercicio" type="submit" form="formEjercicio">Guardar ejercicio</button>
            </div>
          </div>
        </div>
      </div>`;
  },

  prepararMenu() {
    // Abreviaturas para la barra de 72px; conserva nombre accesible y enlace.
    const abreviaturas = ['DA', 'CL', 'IN', 'ME', 'CI', 'RU', 'EJ', 'PR', 'AC', 'FI'];
    document.querySelectorAll('.sidebar .nav-item').forEach((enlace, indice) => {
      enlace.title = enlace.textContent;
      enlace.setAttribute('aria-label', enlace.textContent);
      enlace.dataset.abreviatura = abreviaturas[indice] || enlace.textContent.slice(0, 2);
      if (enlace.classList.contains('active')) enlace.setAttribute('aria-current', 'page');
    });
  },

  registrarEventos() {
    document.getElementById('btnNuevoEjercicio').addEventListener('click', () => this.abrirFormulario());
    document.getElementById('buscarEjercicio').addEventListener('input', () => this.filtrarEjercicios());
    document.getElementById('formEjercicio').addEventListener('submit', (evento) => this.guardarEjercicio(evento));
    document.getElementById('modalEjercicio').addEventListener('shown.bs.modal', () => {
      document.getElementById('ejNombre').focus();
    });
  },

  abrirFormulario() {
    document.getElementById('formEjercicio').reset();
    document.getElementById('errorEjercicio').classList.remove('show');
    document.getElementById('avisoEjercicios').classList.remove('show');
    this.modal.show();
  },

  async cargarEjercicios() {
    try {
      this.lista = await api.get('/ejercicios');
      this.filtrarEjercicios();
    } catch (error) {
      this.mostrarAviso('No se pudo cargar el catálogo. Comprueba el bloque P4 de api.js y el almacenamiento del navegador.', true);
      document.getElementById('tbodyEjercicios').innerHTML = '<tr><td colspan="6" class="empty-state">No fue posible cargar los ejercicios.</td></tr>';
    }
  },

  filtrarEjercicios() {
    const busqueda = document.getElementById('buscarEjercicio').value.trim().toLocaleLowerCase('es');
    const filtrados = this.lista.filter((ejercicio) => {
      const texto = `${ejercicio.nombre} ${ejercicio.grupoMuscular} ${ejercicio.nivel}`;
      return texto.toLocaleLowerCase('es').includes(busqueda);
    });
    this.pintarEjercicios(filtrados);
  },

  pintarEjercicios(lista) {
    document.getElementById('totalEjercicios').textContent = `${lista.length} de ${this.lista.length} ejercicios`;
    const tbody = document.getElementById('tbodyEjercicios');
    if (lista.length === 0) {
      const mensaje = this.lista.length === 0
        ? 'Aún no hay ejercicios. Registra el primero con «Nuevo ejercicio».'
        : 'No hay ejercicios que coincidan con la búsqueda.';
      tbody.innerHTML = `<tr><td colspan="6" class="empty-state">${mensaje}</td></tr>`;
      return;
    }
    tbody.innerHTML = lista.map((ejercicio) => {
      // También se verifica el protocolo al mostrar información ya almacenada.
      const recursoSeguro = this.esRecursoSeguro(ejercicio.recursoUrl);
      const recurso = recursoSeguro
        ? `<a class="btn-dark d-inline-block text-nowrap text-decoration-none" href="${utils.esc(ejercicio.recursoUrl)}" target="_blank" rel="noopener noreferrer">Ver recurso</a>`
        : '—';
      return `<tr>
        <td><div class="person-name text-break">${utils.esc(ejercicio.nombre)}</div>
          <div class="person-sub">ID: ${utils.esc(ejercicio.idEjercicio)}</div>
          <div class="person-sub text-break">${utils.esc(ejercicio.descripcion)}</div></td>
        <td class="text-break">${utils.esc(ejercicio.grupoMuscular)}</td>
        <td class="text-break">${utils.esc(ejercicio.nivel)}</td>
        <td>${utils.esc(ejercicio.series)}</td><td>${utils.esc(ejercicio.repeticiones)}</td>
        <td>${recurso}</td></tr>`;
    }).join('');
  },

  esRecursoSeguro(valor) {
    try { return ['http:', 'https:'].includes(new URL(valor).protocol); }
    catch { return false; }
  },

  async guardarEjercicio(evento) {
    evento.preventDefault();
    if (this.guardando) return; // Evita duplicados por doble clic.
    const form = document.getElementById('formEjercicio');
    if (!form.reportValidity()) return;
    const datos = Object.fromEntries(new FormData(form));
    this.guardando = true;
    const boton = document.getElementById('guardarEjercicio');
    boton.disabled = true;
    document.getElementById('errorEjercicio').classList.remove('show');
    try {
      // create() es una propuesta de escritura para la base publicada: ver guía.
      const respuesta = await api.ejercicios.create(datos);
      if (!respuesta.ok) {
        this.mostrarError(respuesta.mensaje);
        return;
      }
      this.modal.hide();
      document.getElementById('buscarEjercicio').value = '';
      this.mostrarAviso('Ejercicio guardado correctamente.');
      await this.cargarEjercicios();
    } catch (error) {
      this.mostrarError('No se pudo guardar. Revisa el bloque P4 de api.js y los permisos de almacenamiento del navegador.');
    } finally {
      this.guardando = false;
      boton.disabled = false;
    }
  },

  mostrarError(mensaje) {
    const aviso = document.getElementById('errorEjercicio');
    aviso.textContent = mensaje;
    aviso.classList.add('show');
  },

  mostrarAviso(mensaje, error = false) {
    const aviso = document.getElementById('avisoEjercicios');
    aviso.textContent = mensaje;
    aviso.classList.remove('alert-ok', 'alert-error');
    aviso.classList.add(error ? 'alert-error' : 'alert-ok', 'show');
  }
};

ejercicios.init();
