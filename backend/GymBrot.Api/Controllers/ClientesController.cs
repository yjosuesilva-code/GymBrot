using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using GymBrot.Api.Data;
using GymBrot.Api.DTOs;

namespace GymBrot.Api.Controllers
{
    // Recibe y devuelve DTOs: el modelo Cliente (la tabla) nunca sale ni entra directo.
    [Route("api/[controller]")]
    [ApiController]
    public class ClientesController : ControllerBase
    {
        private readonly GymBrotContext _context;
        public ClientesController(GymBrotContext context)
        {
            _context = context;
        }

        // GET: api/Clientes            -> todos
        // GET: api/Clientes?gimnasioId=1 -> solo los de ese gimnasio
        [HttpGet]
        public async Task<ActionResult<IEnumerable<ClienteDto>>> GetClientes([FromQuery] int? gimnasioId)
        {
            var consulta = _context.Clientes.AsQueryable();
            if (gimnasioId.HasValue)
            {
                consulta = consulta.Where(c => c.GimnasioId == gimnasioId.Value);
            }
            var clientes = await consulta.OrderBy(c => c.Nombre).ToListAsync();
            return clientes.Select(ClienteDto.DesdeModelo).ToList();
        }

        // GET: api/Clientes/5
        [HttpGet("{id}")]
        public async Task<ActionResult<ClienteDto>> GetCliente(int id)
        {
            var cliente = await _context.Clientes.FindAsync(id);
            if (cliente == null)
            {
                return NotFound();
            }
            return ClienteDto.DesdeModelo(cliente);
        }

        // POST: api/Clientes
        [HttpPost]
        public async Task<ActionResult<ClienteDto>> PostCliente(ClienteCrearDto dto)
        {
            if (!await _context.Gimnasios.AnyAsync(g => g.Id == dto.GimnasioId))
            {
                return BadRequest(new { mensaje = "El gimnasio no existe." });
            }
            // La cédula es única por gimnasio: 409 con un mensaje claro en vez de un 500 de SQL Server.
            if (await _context.Clientes.AnyAsync(c => c.GimnasioId == dto.GimnasioId && c.NumeroIdentificacion == dto.NumeroIdentificacion.Trim()))
            {
                return Conflict(new { mensaje = "Ya existe un registro con esa identificación en este gimnasio" });
            }

            var cliente = dto.CrearModelo();
            _context.Clientes.Add(cliente);
            await _context.SaveChangesAsync();

            return CreatedAtAction(nameof(GetCliente), new { id = cliente.Id }, ClienteDto.DesdeModelo(cliente));
        }

        // PUT: api/Clientes/5
        [HttpPut("{id}")]
        public async Task<IActionResult> PutCliente(int id, ClienteActualizarDto dto)
        {
            var cliente = await _context.Clientes.FindAsync(id);
            if (cliente == null)
            {
                return NotFound();
            }
            var cedula = dto.NumeroIdentificacion.Trim();
            if (await _context.Clientes.AnyAsync(c => c.Id != id && c.GimnasioId == cliente.GimnasioId && c.NumeroIdentificacion == cedula))
            {
                return Conflict(new { mensaje = "Ya existe un registro con esa identificación en este gimnasio" });
            }

            dto.AplicarA(cliente);
            await _context.SaveChangesAsync();
            return NoContent();
        }

        // DELETE: api/Clientes/5
        [HttpDelete("{id}")]
        public async Task<IActionResult> DeleteCliente(int id)
        {
            var cliente = await _context.Clientes.FindAsync(id);
            if (cliente == null)
            {
                return NotFound();
            }

            _context.Clientes.Remove(cliente);
            try
            {
                await _context.SaveChangesAsync();
            }
            catch (DbUpdateException)
            {
                // Las FK son Restrict: si tiene registros relacionados, no se puede borrar.
                return Conflict(new { mensaje = "No se puede borrar: tiene registros relacionados." });
            }
            return NoContent();
        }
    }
}
