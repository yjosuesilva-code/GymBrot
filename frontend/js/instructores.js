const CLAVE_STORAGE = "gymbrot_instructores";

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
                <button class="btn btn-sm btn-dark">Editar</button>
                <button class="btn btn-sm btn-dark">Eliminar</button>
            </td>
        `;
        tbody.appendChild(fila);
    });
}

renderizarTabla();