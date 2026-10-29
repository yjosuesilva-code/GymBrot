using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;
using System.Text.Json.Serialization;

namespace GymBrot.Api.Models
{
    // Empleado de un gimnasio. El horario por días (lista en el frontend) se deja para después.
    public class Instructor
    {
        [Key]
        public int Id { get; set; }

        [ForeignKey(nameof(Gimnasio))]
        public int GimnasioId { get; set; }
        [JsonIgnore]
        public Gimnasio? Gimnasio { get; set; }

        [Required, MaxLength(20)]
        public string NumeroIdentificacion { get; set; } = "";

        [Required, MaxLength(2)]
        public string TipoIdentificacion { get; set; } = "CC";  // CC | TI | CE | PP

        [Required, MaxLength(100)]
        public string Nombre { get; set; } = "";

        [Required, MaxLength(100)]
        public string Apellidos { get; set; } = "";

        [MaxLength(20)]
        public string Telefono { get; set; } = "";

        [MaxLength(150)]
        public string Correo { get; set; } = "";

        [Required, MaxLength(40)]
        public string Especialidad { get; set; } = "";          // Entrenador personal, Nutrición, Cardio...

        [Column(TypeName = "date")]
        public DateTime FechaContratacion { get; set; } = DateTime.Today;

        [Required, MaxLength(10)]
        public string Estado { get; set; } = "ACTIVO";          // ACTIVO | INACTIVO

        // Ruta de la foto o dataURL base64 (puede ser largo: sin MaxLength).
        public string? Foto { get; set; }
    }
}
