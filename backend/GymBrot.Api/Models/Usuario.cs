using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;
using System.Text.Json.Serialization;

namespace GymBrot.Api.Models
{
    // Cuenta para iniciar sesión. El SUPERADMIN no pertenece a ningún gimnasio (GimnasioId null).
    public class Usuario
    {
        [Key]
        public int Id { get; set; }

        [ForeignKey(nameof(Gimnasio))]
        public int? GimnasioId { get; set; }
        [JsonIgnore]
        public Gimnasio? Gimnasio { get; set; }

        [Required, MaxLength(20)]
        public string NumeroIdentificacion { get; set; } = "";

        [Required, MaxLength(100)]
        public string Nombre { get; set; } = "";

        [MaxLength(100)]
        public string Apellidos { get; set; } = "";

        [Required, MaxLength(150)]
        public string Correo { get; set; } = "";

        // TODO: guardar con hash (BCrypt) y no devolverla en los GET cuando haya login con JWT.
        [Required, MaxLength(200)]
        public string Contrasena { get; set; } = "";

        [Required, MaxLength(15)]
        public string Estado { get; set; } = "ACTIVO";          // ACTIVO | INACTIVO | SUSPENDIDO | BLOQUEADO

        [Required, MaxLength(20)]
        public string TipoUsuario { get; set; } = "CLIENTE";    // SUPERADMIN | ADMINISTRADOR | INSTRUCTOR | CLIENTE

        [MaxLength(30)]
        public string Rol { get; set; } = "";

        public bool DebeCambiarContrasena { get; set; }
    }
}
