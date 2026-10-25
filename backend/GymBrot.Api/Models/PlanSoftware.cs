using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;
using System.Text.Json.Serialization;

namespace GymBrot.Api.Models
{
    public class PlanSoftware
    {
        [Key]
        public int Id { get; set; }

        [Required, MaxLength(20)]
        public string Codigo { get; set; } = "";       

        [Required, MaxLength(50)]
        public string Nombre { get; set; } = "";

        [Column(TypeName = "decimal(12,2)")]
        public decimal PrecioMensual { get; set; }

        public int? MaxClientes { get; set; }           
        public bool Destacado { get; set; }

        [JsonIgnore]   // evita el ciclo Plan -> Gimnasios -> Plan al devolver JSON
        public ICollection<Gimnasio> Gimnasios { get; set; } = new List<Gimnasio>();
    }
}