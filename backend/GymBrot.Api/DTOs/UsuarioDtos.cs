using System.ComponentModel.DataAnnotations;
using GymBrot.Api.Models;

namespace GymBrot.Api.DTOs
{
    // Lo que la API DEVUELVE de un usuario. NO incluye la contraseña: es la razón
    // principal de tener DTOs (antes el GET la mostraba).
    public class UsuarioDto
    {
        public int Id { get; set; }
        public int? GimnasioId { get; set; }
        public string NumeroIdentificacion { get; set; } = "";
        public string Nombre { get; set; } = "";
        public string Apellidos { get; set; } = "";
        public string Correo { get; set; } = "";
        public string Estado { get; set; } = "";
        public string TipoUsuario { get; set; } = "";
        public string Rol { get; set; } = "";
        public bool DebeCambiarContrasena { get; set; }

        public static UsuarioDto DesdeModelo(Usuario u) => new()
        {
            Id = u.Id,
            GimnasioId = u.GimnasioId,
            NumeroIdentificacion = u.NumeroIdentificacion,
            Nombre = u.Nombre,
            Apellidos = u.Apellidos,
            Correo = u.Correo,
            Estado = u.Estado,
            TipoUsuario = u.TipoUsuario,
            Rol = u.Rol,
            DebeCambiarContrasena = u.DebeCambiarContrasena,
        };
    }

    // POST: aquí sí viaja la contraseña (solo de entrada). GimnasioId null = SUPERADMIN.
    public class UsuarioCrearDto
    {
        public int? GimnasioId { get; set; }

        [Required(ErrorMessage = "La identificación es obligatoria."), MaxLength(20)]
        public string NumeroIdentificacion { get; set; } = "";

        [Required(ErrorMessage = "El nombre es obligatorio."), MaxLength(100)]
        public string Nombre { get; set; } = "";

        [MaxLength(100)]
        public string Apellidos { get; set; } = "";

        [Required(ErrorMessage = "El correo es obligatorio."), EmailAddress(ErrorMessage = "El correo no es válido."), MaxLength(150)]
        public string Correo { get; set; } = "";

        // TODO: guardar con hash (BCrypt) cuando la API tenga login con JWT.
        [Required(ErrorMessage = "La contraseña es obligatoria."), MinLength(4, ErrorMessage = "La contraseña debe tener al menos 4 caracteres."), MaxLength(200)]
        public string Contrasena { get; set; } = "";

        [Required, RegularExpression("^(SUPERADMIN|ADMINISTRADOR|INSTRUCTOR|CLIENTE)$", ErrorMessage = "Tipo de usuario no válido.")]
        public string TipoUsuario { get; set; } = "CLIENTE";

        [MaxLength(30)]
        public string Rol { get; set; } = "";

        public bool DebeCambiarContrasena { get; set; }

        public Usuario CrearModelo() => new()
        {
            GimnasioId = GimnasioId,
            NumeroIdentificacion = NumeroIdentificacion.Trim(),
            Nombre = Nombre.Trim(),
            Apellidos = Apellidos.Trim(),
            Correo = Correo.Trim(),
            Contrasena = Contrasena,
            Estado = "ACTIVO",
            TipoUsuario = TipoUsuario,
            // Si no mandan rol, se usa el mismo tipo de usuario (así lo hace el frontend).
            Rol = string.IsNullOrWhiteSpace(Rol) ? TipoUsuario : Rol,
            DebeCambiarContrasena = DebeCambiarContrasena,
        };
    }

    // PUT /{id}: la contraseña es opcional; si no viene (null o vacía) se deja la que tenía.
    public class UsuarioActualizarDto
    {
        [Required(ErrorMessage = "El nombre es obligatorio."), MaxLength(100)]
        public string Nombre { get; set; } = "";

        [MaxLength(100)]
        public string Apellidos { get; set; } = "";

        [Required(ErrorMessage = "El correo es obligatorio."), EmailAddress(ErrorMessage = "El correo no es válido."), MaxLength(150)]
        public string Correo { get; set; } = "";

        [MinLength(4, ErrorMessage = "La contraseña debe tener al menos 4 caracteres."), MaxLength(200)]
        public string? Contrasena { get; set; }

        [Required, RegularExpression("^(ACTIVO|INACTIVO|SUSPENDIDO|BLOQUEADO)$", ErrorMessage = "Estado no válido.")]
        public string Estado { get; set; } = "ACTIVO";

        [Required, RegularExpression("^(SUPERADMIN|ADMINISTRADOR|INSTRUCTOR|CLIENTE)$", ErrorMessage = "Tipo de usuario no válido.")]
        public string TipoUsuario { get; set; } = "CLIENTE";

        [MaxLength(30)]
        public string Rol { get; set; } = "";

        public bool DebeCambiarContrasena { get; set; }

        public void AplicarA(Usuario u)
        {
            u.Nombre = Nombre.Trim();
            u.Apellidos = Apellidos.Trim();
            u.Correo = Correo.Trim();
            if (!string.IsNullOrWhiteSpace(Contrasena)) u.Contrasena = Contrasena;
            u.Estado = Estado;
            u.TipoUsuario = TipoUsuario;
            u.Rol = string.IsNullOrWhiteSpace(Rol) ? TipoUsuario : Rol;
            u.DebeCambiarContrasena = DebeCambiarContrasena;
        }
    }
}
