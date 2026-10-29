using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;
using System.Text.Json.Serialization;

namespace GymBrot.Api.Models
{
    // Socio de un gimnasio. La cédula es única dentro de cada gimnasio (índice en GymBrotContext).
    public class Cliente
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

        [MaxLength(200)]
        public string Direccion { get; set; } = "";

        [Column(TypeName = "date")]
        public DateTime? FechaNacimiento { get; set; }

        [Required, MaxLength(15)]
        public string Estado { get; set; } = "ACTIVO";          // ACTIVO | INACTIVO | SUSPENDIDO | BLOQUEADO

        [Column(TypeName = "date")]
        public DateTime FechaRegistro { get; set; } = DateTime.Today;
    }
}
