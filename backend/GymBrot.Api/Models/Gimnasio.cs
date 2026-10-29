using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;
using System.Text.Json.Serialization;

namespace GymBrot.Api.Models
{
    public class Gimnasio
    {
        [Key]
        public int Id { get; set; }

        [Required, MaxLength(40)]
        public string Slug { get; set; } = "";          // el /g/:slug del frontend

        [Required, MaxLength(100)]
        public string Nombre { get; set; } = "";

        [MaxLength(60)]
        public string Ciudad { get; set; } = "";

        [MaxLength(20)]
        public string Telefono { get; set; } = "";

        [Required, MaxLength(10)]
        public string Estado { get; set; } = "ACTIVO";  

        [Column(TypeName = "date")]
        public DateTime FechaRegistro { get; set; }

        [Column(TypeName = "date")]
        public DateTime VenceSuscripcion { get; set; }

        [ForeignKey(nameof(PlanSoftware))]
        public int PlanSoftwareId { get; set; }
        [JsonIgnore]
        public PlanSoftware? PlanSoftware { get; set; } 
    }
}