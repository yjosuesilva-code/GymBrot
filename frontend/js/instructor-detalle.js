const CLAVE_STORAGE = "gymbrot_instructores";

layout.render("instructores", "Perfil de Instructor");

const parametros = new URLSearchParams(window.location.search);//leer parametros de url
const idBuscado = parametros.get("id");

function obtenerInstructores() {
    const datos = localStorage.getItem(CLAVE_STORAGE);
    return datos ? JSON.parse(datos) : [];
}

const instructores = obtenerInstructores();
const instructor = instructores.find(function (i) {
    return i.id === idBuscado;
});

if (!instructor) {
    document.getElementById("app-content").innerHTML = `
        <p>No se encontró el instructor solicitado.</p>
        <a href="instructores.html" class="btn btn-dark">Volver</a>
    `;
} else {
    document.getElementById("app-content").innerHTML = `
        <a href="instructores.html" class="btn btn-dark mb-3"><i class="bi bi-arrow-left"></i> Volver</a>

        <div class="card-g p-4">
            <h2>${instructor.nombre} ${instructor.apellidos}</h2>
            <p><strong>Identificación:</strong> ${instructor.id}</p>
            <p><strong>Especialidad:</strong> ${instructor.especialidad}</p>
            <p><strong>Estado:</strong> ${instructor.estado}</p>
        </div>
    `;
}