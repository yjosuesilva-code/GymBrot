using System.ComponentModel.DataAnnotations;
using GymBrot.Api.Models;

namespace GymBrot.Api.DTOs
{
    // Lo que la API DEVUELVE de un instructor.
    public class InstructorDto
    {
        public int Id { get; set; }
        public int GimnasioId { get; set; }
        public string NumeroIdentificacion { get; set; } = "";
        public string TipoIdentificacion { get; set; } = "";
        public string Nombre { get; set; } = "";
        public string Apellidos { get; set; } = "";
        public string Telefono { get; set; } = "";
        public string Correo { get; set; } = "";
        public string Especialidad { get; set; } = "";
        public DateTime FechaContratacion { get; set; }
        public string Estado { get; set; } = "";
        public string? Foto { get; set; }

        public static InstructorDto DesdeModelo(Instructor i) => new()
        {
            Id = i.Id,
            GimnasioId = i.GimnasioId,
            NumeroIdentificacion = i.NumeroIdentificacion,
            TipoIdentificacion = i.TipoIdentificacion,
            Nombre = i.Nombre,
            Apellidos = i.Apellidos,
            Telefono = i.Telefono,
            Correo = i.Correo,
            Especialidad = i.Especialidad,
            FechaContratacion = i.FechaContratacion,
            Estado = i.Estado,
            Foto = i.Foto,
        };
    }

    // POST: el estado empieza en ACTIVO y, si no se manda fecha de contratación, es hoy.
    public class InstructorCrearDto
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

        [Required(ErrorMessage = "La especialidad es obligatoria."), MaxLength(40)]
        public string Especialidad { get; set; } = "";

        public DateTime? FechaContratacion { get; set; }

        public string? Foto { get; set; }

        public Instructor CrearModelo() => new()
        {
            GimnasioId = GimnasioId,
            NumeroIdentificacion = NumeroIdentificacion.Trim(),
            TipoIdentificacion = TipoIdentificacion,
            Nombre = Nombre.Trim(),
            Apellidos = Apellidos.Trim(),
            Telefono = Telefono,
            Correo = Correo,
            Especialidad = Especialidad,
            FechaContratacion = FechaContratacion ?? DateTime.Today,
            Estado = "ACTIVO",
            Foto = Foto,
        };
    }

    // PUT /{id}: el gimnasio no se cambia.
    public class InstructorActualizarDto
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

        [Required(ErrorMessage = "La especialidad es obligatoria."), MaxLength(40)]
        public string Especialidad { get; set; } = "";

        // null = se deja la fecha que ya tenía.
        public DateTime? FechaContratacion { get; set; }

        [Required, RegularExpression("^(ACTIVO|INACTIVO)$", ErrorMessage = "El estado debe ser ACTIVO o INACTIVO.")]
        public string Estado { get; set; } = "ACTIVO";

        public string? Foto { get; set; }

        public void AplicarA(Instructor i)
        {
            i.NumeroIdentificacion = NumeroIdentificacion.Trim();
            i.TipoIdentificacion = TipoIdentificacion;
            i.Nombre = Nombre.Trim();
            i.Apellidos = Apellidos.Trim();
            i.Telefono = Telefono;
            i.Correo = Correo;
            i.Especialidad = Especialidad;
            if (FechaContratacion.HasValue) i.FechaContratacion = FechaContratacion.Value;
            i.Estado = Estado;
            i.Foto = Foto;
        }
    }
}
