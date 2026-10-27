using System.ComponentModel.DataAnnotations;
using GymBrot.Api.Models;

namespace GymBrot.Api.DTOs
{
    // Lo que la API DEVUELVE de un cliente. Sin la navegación Gimnasio.
    public class ClienteDto
    {
        public int Id { get; set; }
        public int GimnasioId { get; set; }
        public string NumeroIdentificacion { get; set; } = "";
        public string TipoIdentificacion { get; set; } = "";
        public string Nombre { get; set; } = "";
        public string Apellidos { get; set; } = "";
        public string Telefono { get; set; } = "";
        public string Correo { get; set; } = "";
        public string Direccion { get; set; } = "";
        public DateTime? FechaNacimiento { get; set; }
        public string Estado { get; set; } = "";
        public DateTime FechaRegistro { get; set; }

        public static ClienteDto DesdeModelo(Cliente c) => new()
        {
            Id = c.Id,
            GimnasioId = c.GimnasioId,
            NumeroIdentificacion = c.NumeroIdentificacion,
            TipoIdentificacion = c.TipoIdentificacion,
            Nombre = c.Nombre,
            Apellidos = c.Apellidos,
            Telefono = c.Telefono,
            Correo = c.Correo,
            Direccion = c.Direccion,
            FechaNacimiento = c.FechaNacimiento,
            Estado = c.Estado,
            FechaRegistro = c.FechaRegistro,
        };
    }

    // Lo que se RECIBE para crear (POST). Id, Estado y FechaRegistro los pone el servidor.
    public class ClienteCrearDto
    {
        [Range(1, int.MaxValue, ErrorMessage = "El gimnasio es obligatorio.")]
        public int GimnasioId { get; set; }

        [Required(ErrorMessage = "La identificación es obligatoria."), MaxLength(20)]
        public string NumeroIdentificacion { get; set; } = "";

        [Required, RegularExpression("^(CC|TI|CE|PP)$", ErrorMessage = "El tipo de identificación debe ser CC, TI, CE o PP.")]
        public string TipoIdentificacion { get; set; } = "CC";

        [Required(ErrorMessage = "El nombre es obligatorio."), MaxLength(100)]
        public string Nombre { get; set; } = "";

        [Required(ErrorMessage = "Los apellidos son obligatorios."), MaxLength(100)]
        public string Apellidos { get; set; } = "";

        [MaxLength(20)]
        public string Telefono { get; set; } = "";

        [MaxLength(150)]
        public string Correo { get; set; } = "";

        [MaxLength(200)]
        public string Direccion { get; set; } = "";

        public DateTime? FechaNacimiento { get; set; }

        public Cliente CrearModelo() => new()
        {
            GimnasioId = GimnasioId,
            NumeroIdentificacion = NumeroIdentificacion.Trim(),
            TipoIdentificacion = TipoIdentificacion,
            Nombre = Nombre.Trim(),
            Apellidos = Apellidos.Trim(),
            Telefono = Telefono,
            Correo = Correo,
            Direccion = Direccion,
            FechaNacimiento = FechaNacimiento,
            Estado = "ACTIVO",
            FechaRegistro = DateTime.Today,
        };
    }

    // Lo que se RECIBE para actualizar (PUT /{id}). El Id va en la URL; el gimnasio y la
    // fecha de registro no se cambian.
    public class ClienteActualizarDto
    {
        [Required(ErrorMessage = "La identificación es obligatoria."), MaxLength(20)]
        public string NumeroIdentificacion { get; set; } = "";

        [Required, RegularExpression("^(CC|TI|CE|PP)$", ErrorMessage = "El tipo de identificación debe ser CC, TI, CE o PP.")]
        public string TipoIdentificacion { get; set; } = "CC";

        [Required(ErrorMessage = "El nombre es obligatorio."), MaxLength(100)]
        public string Nombre { get; set; } = "";

        [Required(ErrorMessage = "Los apellidos son obligatorios."), MaxLength(100)]
        public string Apellidos { get; set; } = "";

        [MaxLength(20)]
        public string Telefono { get; set; } = "";

        [MaxLength(150)]
        public string Correo { get; set; } = "";

        [MaxLength(200)]
        public string Direccion { get; set; } = "";

        public DateTime? FechaNacimiento { get; set; }

        [Required, RegularExpression("^(ACTIVO|INACTIVO|SUSPENDIDO|BLOQUEADO)$", ErrorMessage = "Estado no válido.")]
        public string Estado { get; set; } = "ACTIVO";

        public void AplicarA(Cliente c)
        {
            c.NumeroIdentificacion = NumeroIdentificacion.Trim();
            c.TipoIdentificacion = TipoIdentificacion;
            c.Nombre = Nombre.Trim();
            c.Apellidos = Apellidos.Trim();
            c.Telefono = Telefono;
            c.Correo = Correo;
            c.Direccion = Direccion;
            c.FechaNacimiento = FechaNacimiento;
            c.Estado = Estado;
        }
    }
}
