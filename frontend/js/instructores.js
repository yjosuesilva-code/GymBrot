const CLAVE_STORAGE = "gymbrot_instructores";
let idEditando = null;

// 1. Primero dibujamos el sidebar + topbar
layout.render("instructores", "Gestión de Instructores");

// 2. Ahora llenamos el contenido propio de esta página
document.getElementById("app-content").innerHTML = `
    <div class="d-flex justify-content-between align-items-center mb-4">
        <h1>Gestión de Instructores</h1>
        <button type="button" class="btn btn-neon" id="btnNuevoInstructor"
                data-bs-toggle="modal" data-bs-target="#modalInstructor">
            <i class="bi bi-plus-lg"></i> Nuevo instructor
        </button>
    </div>

    <table class="table table-dark">
        <thead>
            <tr>
                <th>Identificación</th>
                <th>Nombre</th>
                <th>Especialidad</th>
                <th>Estado</th>
                <th>Acciones</th>
            </tr>
        </thead>
        <tbody id="tablaInstructores"></tbody>
    </table>
`;

function obtenerInstructores() {
    const datos = localStorage.getItem(CLAVE_STORAGE);
    return datos ? JSON.parse(datos) : [];
}

function guardarInstructores(instructores) {
    localStorage.setItem(CLAVE_STORAGE, JSON.stringify(instructores));
}

function renderizarTabla() {
    const instructores = obtenerInstructores();
    const tbody = document.getElementById("tablaInstructores");

    tbody.innerHTML = "";

    instructores.forEach(function (instructor) {
        const fila = document.createElement("tr");
        fila.innerHTML = `
            <td>${instructor.id}</td>
            <td>${instructor.nombre} ${instructor.apellidos}</td>
            <td>${instructor.especialidad}</td>
            <td>${instructor.estado}</td>
            <td>
                <button class="btn btn-sm btn-dark btn-editar" data-id="${instructor.id}">Editar</button>
                <button class="btn btn-sm btn-dark btn-eliminar" data-id="${instructor.id}">Eliminar</button>
                <button class="btn-icon btn-ver" data-id="${instructor.id}"><i class="bi bi-arrow-right"></i></button>
            </td>
        `;
        tbody.appendChild(fila);
    });
}

renderizarTabla();

document.getElementById("formInstructor").addEventListener("submit", function (event) {
    event.preventDefault();

    const datosFormulario = {
        id: document.getElementById("inputId").value,
        nombre: document.getElementById("inputNombre").value,
        apellidos: document.getElementById("inputApellidos").value,
        especialidad: document.getElementById("inputEspecialidad").value,
        estado: "ACTIVO"
    };

    let instructores = obtenerInstructores();

        const yaExiste = instructores.some(function (instructor) {
        return instructor.id === datosFormulario.id && instructor.id !== idEditando;
    });

    if (yaExiste) {
        alert("Ya existe un instructor con esa identificación.");
        return;
    }


    if (idEditando === null) {
        instructores.push(datosFormulario);
    } else {
        instructores = instructores.map(function (instructor) {
            if (instructor.id === idEditando) {
                return datosFormulario;
            }
            return instructor;
        });
        idEditando = null;
    }



    guardarInstructores(instructores);
    renderizarTabla();
    event.target.reset();

    const modal = bootstrap.Modal.getInstance(document.getElementById("modalInstructor"));
    modal.hide();
});

document.getElementById("tablaInstructores").addEventListener("click", function (event) {
    if (event.target.classList.contains("btn-eliminar")) {
        const idAEliminar = event.target.dataset.id;

        let instructores = obtenerInstructores();
        instructores = instructores.filter(function (instructor) {
            return instructor.id !== idAEliminar;
        });

        guardarInstructores(instructores);
        renderizarTabla();

    }else if(event.target.classList.contains("btn-editar")){
        const idAEditar = event.target.dataset.id;
        const instructores = obtenerInstructores();
        const instructor = instructores.find(function (i) {
            return i.id === idAEditar;
        });

        document.getElementById("inputId").value = instructor.id;
        document.getElementById("inputNombre").value = instructor.nombre;
        document.getElementById("inputApellidos").value = instructor.apellidos;
        document.getElementById("inputEspecialidad").value = instructor.especialidad;

        idEditando = instructor.id;

        const modal = new bootstrap.Modal(document.getElementById("modalInstructor"));
        modal.show();
    }else if (event.target.closest(".btn-ver")) {
    const idVer = event.target.closest(".btn-ver").dataset.id;
    window.location.href = `instructor-detalle.html?id=${idVer}`;
    }

});

document.getElementById("btnNuevoInstructor").addEventListener("click", function () {
    idEditando = null;
    document.getElementById("formInstructor").reset();
});