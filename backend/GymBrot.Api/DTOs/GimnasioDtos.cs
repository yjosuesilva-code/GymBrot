using System.ComponentModel.DataAnnotations;
using GymBrot.Api.Models;

namespace GymBrot.Api.DTOs
{
    // Lo que la API DEVUELVE de un gimnasio.
    public class GimnasioDto
    {
        public int Id { get; set; }
        public string Slug { get; set; } = "";
        public string Nombre { get; set; } = "";
        public string Ciudad { get; set; } = "";
        public string Telefono { get; set; } = "";
        public string Estado { get; set; } = "";
        public DateTime FechaRegistro { get; set; }
        public DateTime VenceSuscripcion { get; set; }
        public int PlanSoftwareId { get; set; }

        public static GimnasioDto DesdeModelo(Gimnasio g) => new()
        {
            Id = g.Id,
            Slug = g.Slug,
            Nombre = g.Nombre,
            Ciudad = g.Ciudad,
            Telefono = g.Telefono,
            Estado = g.Estado,
            FechaRegistro = g.FechaRegistro,
            VenceSuscripcion = g.VenceSuscripcion,
            PlanSoftwareId = g.PlanSoftwareId,
        };
    }

    // POST: el gimnasio nace ACTIVO, registrado hoy y, si no se dice otra cosa, pagado por un mes.
    public class GimnasioCrearDto
    {
        // Las mismas reglas del slug que usa el frontend (lib/slug.ts): kebab-case, 3 a 40 caracteres.
        [Required(ErrorMessage = "El enlace (slug) es obligatorio."), MinLength(3), MaxLength(40),
         RegularExpression("^[a-z0-9]+(?:-[a-z0-9]+)*$", ErrorMessage = "El enlace solo admite minúsculas, números y guiones (ej. iron-house).")]
        public string Slug { get; set; } = "";

        [Required(ErrorMessage = "El nombre es obligatorio."), MaxLength(100)]
        public string Nombre { get; set; } = "";

        [MaxLength(60)]
        public string Ciudad { get; set; } = "";

        [MaxLength(20)]
        public string Telefono { get; set; } = "";

        [Range(1, int.MaxValue, ErrorMessage = "El plan es obligatorio.")]
        public int PlanSoftwareId { get; set; }

        public DateTime? VenceSuscripcion { get; set; }

        public Gimnasio CrearModelo() => new()
        {
            Slug = Slug.Trim(),
            Nombre = Nombre.Trim(),
            Ciudad = Ciudad,
            Telefono = Telefono,
            Estado = "ACTIVO",
            FechaRegistro = DateTime.Today,
            VenceSuscripcion = VenceSuscripcion ?? DateTime.Today.AddMonths(1),
            PlanSoftwareId = PlanSoftwareId,
        };
    }

    // PUT /{id}: el slug NO se cambia (es la dirección del portal y debe ser estable).
    public class GimnasioActualizarDto
    {
        [Required(ErrorMessage = "El nombre es obligatorio."), MaxLength(100)]
        public string Nombre { get; set; } = "";

        [MaxLength(60)]
        public string Ciudad { get; set; } = "";

        [MaxLength(20)]
        public string Telefono { get; set; } = "";

        [Required, RegularExpression("^(ACTIVO|INACTIVO)$", ErrorMessage = "El estado debe ser ACTIVO o INACTIVO.")]
        public string Estado { get; set; } = "ACTIVO";

        [Range(1, int.MaxValue, ErrorMessage = "El plan es obligatorio.")]
        public int PlanSoftwareId { get; set; }

        // null = se deja la fecha que ya tenía.
        public DateTime? VenceSuscripcion { get; set; }

        public void AplicarA(Gimnasio g)
        {
            g.Nombre = Nombre.Trim();
            g.Ciudad = Ciudad;
            g.Telefono = Telefono;
            g.Estado = Estado;
            g.PlanSoftwareId = PlanSoftwareId;
            if (VenceSuscripcion.HasValue) g.VenceSuscripcion = VenceSuscripcion.Value;
        }
    }
}
