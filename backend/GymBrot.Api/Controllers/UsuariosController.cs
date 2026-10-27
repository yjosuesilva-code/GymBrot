using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using GymBrot.Api.Models;
using GymBrot.Api.Data;

namespace GymBrot.Api.Controllers
{
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
        public async Task<ActionResult<IEnumerable<Usuario>>> GetUsuarios([FromQuery] int? gimnasioId)
        {
            var consulta = _context.Usuarios.AsQueryable();
            if (gimnasioId.HasValue)
            {
                consulta = consulta.Where(x => x.GimnasioId == gimnasioId.Value);
            }
            return await consulta.ToListAsync();
        }

        // GET: api/Usuarios/5
        [HttpGet("{id}")]
        public async Task<ActionResult<Usuario>> GetUsuario(int id)
        {
            var usuario = await _context.Usuarios.FindAsync(id);

            if (usuario == null)
            {
                return NotFound();
            }

            return usuario;
        }

        // PUT: api/Usuarios/5
        [HttpPut("{id}")]
        public async Task<IActionResult> PutUsuario(int id, Usuario usuario)
        {
            if (id != usuario.Id)
            {
                return BadRequest();
            }

            _context.Entry(usuario).State = EntityState.Modified;

            try
            {
                await _context.SaveChangesAsync();
            }
            catch (DbUpdateConcurrencyException)
            {
                if (!UsuarioExists(id))
                {
                    return NotFound();
                }
                else
                {
                    throw;
                }
            }

            return NoContent();
        }

        // POST: api/Usuarios
        [HttpPost]
        public async Task<ActionResult<Usuario>> PostUsuario(Usuario usuario)
        {
            // La cedula es unica por gimnasio: 409 con un mensaje claro en vez de un 500 de SQL Server.
            if (await _context.Usuarios.AnyAsync(x => x.GimnasioId == usuario.GimnasioId && x.NumeroIdentificacion == usuario.NumeroIdentificacion))
            {
                return Conflict(new { mensaje = "Ya existe un registro con esa identificación en este gimnasio" });
            }

            _context.Usuarios.Add(usuario);
            await _context.SaveChangesAsync();

            return CreatedAtAction(nameof(GetUsuario), new { id = usuario.Id }, usuario);
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
            await _context.SaveChangesAsync();

            return NoContent();
        }

        private bool UsuarioExists(int id)
        {
            return _context.Usuarios.Any(e => e.Id == id);
        }
    }
}
