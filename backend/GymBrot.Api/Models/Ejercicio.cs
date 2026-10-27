using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace GymBrot.Api.Models
{
    public class Ejercicio
    {
        [Key]
        public int Id { get; set; }

        [ForeignKey(nameof(Gimnasio))]
        public int? GimnasioId { get; set; }
        public Gimnasio? Gimnasio { get; set; }

        [Required, MaxLength(100)]
        public string Nombre { get; set; } = "";

        [MaxLength(500)]
        public string Descripcion { get; set; } = "";

        [Required, MaxLength(30)]
        public string GrupoMuscular { get; set; } = "";

        [Required, MaxLength(20)]
        public string Nivel { get; set; } = "";

        [Required, MaxLength(30)]
        public string Equipo { get; set; } = "";

        [Required, MaxLength(15)]
        public string TipoMedicion { get; set; } = "REPETICIONES";

        public int? SeriesSugeridas { get; set; }
        public int? RepeticionesMinSugeridas { get; set; }
        public int? RepeticionesMaxSugeridas { get; set; }
        public int? SegundosSugeridos { get; set; }

        [MaxLength(500)]
        public string RecursoUrl { get; set; } = "";

        [Required, MaxLength(10)]
        public string Estado { get; set; } = "ACTIVO";
    }
}
   