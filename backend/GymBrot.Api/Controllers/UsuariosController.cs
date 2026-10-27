using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using GymBrot.Api.Data;
using GymBrot.Api.DTOs;

namespace GymBrot.Api.Controllers
{
    // Con DTOs la contraseña solo ENTRA (POST/PUT) y nunca SALE en las respuestas.
    [Route("api/[controller]")]
    [ApiController]
    public class UsuariosController : ControllerBase
    {
        private readonly GymBrotContext _context;
        public UsuariosController(GymBrotContext context)
        {
            _context = context;
        }

        // GET: api/Usuarios            -> todos
        // GET: api/Usuarios?gimnasioId=1 -> solo los de ese gimnasio
        [HttpGet]
        public async Task<ActionResult<IEnumerable<UsuarioDto>>> GetUsuarios([FromQuery] int? gimnasioId)
        {
            var consulta = _context.Usuarios.AsQueryable();
            if (gimnasioId.HasValue)
            {
                consulta = consulta.Where(u => u.GimnasioId == gimnasioId.Value);
            }
            var usuarios = await consulta.OrderBy(u => u.Nombre).ToListAsync();
            return usuarios.Select(UsuarioDto.DesdeModelo).ToList();
        }

        // GET: api/Usuarios/5
        [HttpGet("{id}")]
        public async Task<ActionResult<UsuarioDto>> GetUsuario(int id)
        {
            var usuario = await _context.Usuarios.FindAsync(id);
            if (usuario == null)
            {
                return NotFound();
            }
            return UsuarioDto.DesdeModelo(usuario);
        }

        // POST: api/Usuarios
        [HttpPost]
        public async Task<ActionResult<UsuarioDto>> PostUsuario(UsuarioCrearDto dto)
        {
            // Solo el SUPERADMIN va sin gimnasio; los demás tienen que pertenecer a uno que exista.
            if (dto.GimnasioId == null && dto.TipoUsuario != "SUPERADMIN")
            {
                return BadRequest(new { mensaje = "Solo el SUPERADMIN puede no tener gimnasio." });
            }
            if (dto.GimnasioId != null && !await _context.Gimnasios.AnyAsync(g => g.Id == dto.GimnasioId))
            {
                return BadRequest(new { mensaje = "El gimnasio no existe." });
            }
            var cedula = dto.NumeroIdentificacion.Trim();
            var correo = dto.Correo.Trim();
            if (await _context.Usuarios.AnyAsync(u => u.GimnasioId == dto.GimnasioId && (u.NumeroIdentificacion == cedula || u.Correo == correo)))
            {
                return Conflict(new { mensaje = "Ya existe un usuario con esa identificación o ese correo en este gimnasio" });
            }

            var usuario = dto.CrearModelo();
            _context.Usuarios.Add(usuario);
            await _context.SaveChangesAsync();

            return CreatedAtAction(nameof(GetUsuario), new { id = usuario.Id }, UsuarioDto.DesdeModelo(usuario));
        }

        // PUT: api/Usuarios/5 (la cédula y el gimnasio no se cambian)
        [HttpPut("{id}")]
        public async Task<IActionResult> PutUsuario(int id, UsuarioActualizarDto dto)
        {
            var usuario = await _context.Usuarios.FindAsync(id);
            if (usuario == null)
            {
                return NotFound();
            }
            var correo = dto.Correo.Trim();
            if (await _context.Usuarios.AnyAsync(u => u.Id != id && u.GimnasioId == usuario.GimnasioId && u.Correo == correo))
            {
                return Conflict(new { mensaje = "Ya existe un usuario con ese correo en este gimnasio" });
            }

            dto.AplicarA(usuario);
            await _context.SaveChangesAsync();
            return NoContent();
        }

        // DELETE: api/Usuarios/5
        [HttpDelete("{id}")]
        public async Task<IActionResult> DeleteUsuario(int id)
        {
            var usuario = await _context.Usuarios.FindAsync(id);
            if (usuario == null)
            {
                return NotFound();
            }

            _context.Usuarios.Remove(usuario);
            try
            {
                await _context.SaveChangesAsync();
            }
            catch (DbUpdateException)
            {
                return Conflict(new { mensaje = "No se puede borrar: tiene registros relacionados." });
            }
            return NoContent();
        }
    }
}
