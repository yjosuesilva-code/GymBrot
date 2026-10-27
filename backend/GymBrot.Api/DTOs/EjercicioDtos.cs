using System.ComponentModel.DataAnnotations;
using GymBrot.Api.Models;

namespace GymBrot.Api.DTOs
{
    // Lo que la API DEVUELVE de un ejercicio. GimnasioId null = ejercicio base (de todos).
    public class EjercicioDto
    {
        public int Id { get; set; }
        public int? GimnasioId { get; set; }
        public string Nombre { get; set; } = "";
        public string Descripcion { get; set; } = "";
        public string GrupoMuscular { get; set; } = "";
        public string Nivel { get; set; } = "";
        public string Equipo { get; set; } = "";
        public string TipoMedicion { get; set; } = "";
        public int? SeriesSugeridas { get; set; }
        public int? RepeticionesMinSugeridas { get; set; }
        public int? RepeticionesMaxSugeridas { get; set; }
        public int? SegundosSugeridos { get; set; }
        public string RecursoUrl { get; set; } = "";
        public string Estado { get; set; } = "";

        public static EjercicioDto DesdeModelo(Ejercicio e) => new()
        {
            Id = e.Id,
            GimnasioId = e.GimnasioId,
            Nombre = e.Nombre,
            Descripcion = e.Descripcion,
            GrupoMuscular = e.GrupoMuscular,
            Nivel = e.Nivel,
            Equipo = e.Equipo,
            TipoMedicion = e.TipoMedicion,
            SeriesSugeridas = e.SeriesSugeridas,
            RepeticionesMinSugeridas = e.RepeticionesMinSugeridas,
            RepeticionesMaxSugeridas = e.RepeticionesMaxSugeridas,
            SegundosSugeridos = e.SegundosSugeridos,
            RecursoUrl = e.RecursoUrl,
            Estado = e.Estado,
        };
    }

    // Campos que se mandan al crear y al actualizar.
    public abstract class EjercicioDatosDto
    {
        [Required(ErrorMessage = "El nombre es obligatorio."), MaxLength(100)]
        public string Nombre { get; set; } = "";

        [MaxLength(500)]
        public string Descripcion { get; set; } = "";

        [Required(ErrorMessage = "El grupo muscular es obligatorio."), MaxLength(30)]
        public string GrupoMuscular { get; set; } = "";

        [Required(ErrorMessage = "El nivel es obligatorio."), MaxLength(20)]
        public string Nivel { get; set; } = "";

        [Required(ErrorMessage = "El equipo es obligatorio."), MaxLength(30)]
        public string Equipo { get; set; } = "";

        [Required, RegularExpression("^(REPETICIONES|TIEMPO)$", ErrorMessage = "El tipo de medición debe ser REPETICIONES o TIEMPO.")]
        public string TipoMedicion { get; set; } = "REPETICIONES";

        public int? SeriesSugeridas { get; set; }

        public int? RepeticionesMinSugeridas { get; set; }

        public int? RepeticionesMaxSugeridas { get; set; }

        public int? SegundosSugeridos { get; set; }

        [MaxLength(500)]
        public string RecursoUrl { get; set; } = "";

        protected void CopiarA(Ejercicio e)
        {
            e.Nombre = Nombre.Trim();
            e.Descripcion = Descripcion;
            e.GrupoMuscular = GrupoMuscular;
            e.Nivel = Nivel;
            e.Equipo = Equipo;
            e.TipoMedicion = TipoMedicion;
            e.SeriesSugeridas = SeriesSugeridas;
            e.RepeticionesMinSugeridas = RepeticionesMinSugeridas;
            e.RepeticionesMaxSugeridas = RepeticionesMaxSugeridas;
            e.SegundosSugeridos = SegundosSugeridos;
            e.RecursoUrl = RecursoUrl;
        }
    }

    // POST: GimnasioId null crea un ejercicio base. El estado empieza en ACTIVO.
    public class EjercicioCrearDto : EjercicioDatosDto
    {
        public int? GimnasioId { get; set; }

        public Ejercicio CrearModelo()
        {
            var e = new Ejercicio { GimnasioId = GimnasioId, Estado = "ACTIVO" };
            CopiarA(e);
            return e;
        }
    }

    // PUT /{id}: no cambia de gimnasio; sí se puede activar o desactivar.
    public class EjercicioActualizarDto : EjercicioDatosDto
    {
        [Required, RegularExpression("^(ACTIVO|INACTIVO)$", ErrorMessage = "El estado debe ser ACTIVO o INACTIVO.")]
        public string Estado { get; set; } = "ACTIVO";

        public void AplicarA(Ejercicio e)
        {
            CopiarA(e);
            e.Estado = Estado;
        }
    }
}
