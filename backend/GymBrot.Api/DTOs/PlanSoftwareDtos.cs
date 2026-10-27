using System.ComponentModel.DataAnnotations;
using GymBrot.Api.Models;

namespace GymBrot.Api.DTOs
{
    // Lo que la API DEVUELVE de un plan del software. Sin la colección de gimnasios.
    public class PlanSoftwareDto
    {
        public int Id { get; set; }
        public string Codigo { get; set; } = "";
        public string Nombre { get; set; } = "";
        public decimal PrecioMensual { get; set; }
        public int? MaxClientes { get; set; }
        public bool Destacado { get; set; }

        public static PlanSoftwareDto DesdeModelo(PlanSoftware p) => new()
        {
            Id = p.Id,
            Codigo = p.Codigo,
            Nombre = p.Nombre,
            PrecioMensual = p.PrecioMensual,
            MaxClientes = p.MaxClientes,
            Destacado = p.Destacado,
        };
    }

    // Mismo DTO para crear (POST) y para actualizar (PUT /{id}): un plan no tiene
    // campos que ponga el servidor.
    public class PlanSoftwareGuardarDto
    {
        [Required(ErrorMessage = "El código es obligatorio."), MaxLength(20)]
        public string Codigo { get; set; } = "";

        [Required(ErrorMessage = "El nombre es obligatorio."), MaxLength(50)]
        public string Nombre { get; set; } = "";

        [Range(0, 100_000_000, ErrorMessage = "El precio no puede ser negativo.")]
        public decimal PrecioMensual { get; set; }

        // null = clientes ilimitados
        [Range(1, int.MaxValue, ErrorMessage = "El máximo de clientes debe ser mayor que 0.")]
        public int? MaxClientes { get; set; }

        public bool Destacado { get; set; }

        public PlanSoftware CrearModelo()
        {
            var p = new PlanSoftware();
            AplicarA(p);
            return p;
        }

        public void AplicarA(PlanSoftware p)
        {
            p.Codigo = Codigo.Trim().ToUpperInvariant();
            p.Nombre = Nombre.Trim();
            p.PrecioMensual = PrecioMensual;
            p.MaxClientes = MaxClientes;
            p.Destacado = Destacado;
        }
    }
}
