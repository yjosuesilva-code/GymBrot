using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using GymBrot.Api.Data;
using GymBrot.Api.DTOs;

namespace GymBrot.Api.Controllers
{
    [Route("api/[controller]")]
    [ApiController]
    public class GimnasiosController : ControllerBase
    {
        private readonly GymBrotContext _context;
        public GimnasiosController(GymBrotContext context)
        {
            _context = context;
        }

        // GET: api/Gimnasios
        [HttpGet]
        public async Task<ActionResult<IEnumerable<GimnasioDto>>> GetGimnasios()
        {
            var gimnasios = await _context.Gimnasios.OrderBy(g => g.Nombre).ToListAsync();
            return gimnasios.Select(GimnasioDto.DesdeModelo).ToList();
        }

        // GET: api/Gimnasios/5
        [HttpGet("{id}")]
        public async Task<ActionResult<GimnasioDto>> GetGimnasio(int id)
        {
            var gimnasio = await _context.Gimnasios.FindAsync(id);
            if (gimnasio == null)
            {
                return NotFound();
            }
            return GimnasioDto.DesdeModelo(gimnasio);
        }

        // POST: api/Gimnasios
        [HttpPost]
        public async Task<ActionResult<GimnasioDto>> PostGimnasio(GimnasioCrearDto dto)
        {
            if (!await _context.PlanesSoftware.AnyAsync(p => p.Id == dto.PlanSoftwareId))
            {
                return BadRequest(new { mensaje = "El plan de software no existe." });
            }
            if (await _context.Gimnasios.AnyAsync(g => g.Slug == dto.Slug.Trim()))
            {
                return Conflict(new { mensaje = "Ese enlace ya lo usa otro gimnasio." });
            }

            var gimnasio = dto.CrearModelo();
            _context.Gimnasios.Add(gimnasio);
            await _context.SaveChangesAsync();

            return CreatedAtAction(nameof(GetGimnasio), new { id = gimnasio.Id }, GimnasioDto.DesdeModelo(gimnasio));
        }

        // PUT: api/Gimnasios/5 (el slug no se cambia)
        [HttpPut("{id}")]
        public async Task<IActionResult> PutGimnasio(int id, GimnasioActualizarDto dto)
        {
            var gimnasio = await _context.Gimnasios.FindAsync(id);
            if (gimnasio == null)
            {
                return NotFound();
            }
            if (!await _context.PlanesSoftware.AnyAsync(p => p.Id == dto.PlanSoftwareId))
            {
                return BadRequest(new { mensaje = "El plan de software no existe." });
            }

            dto.AplicarA(gimnasio);
            await _context.SaveChangesAsync();
            return NoContent();
        }

        // DELETE: api/Gimnasios/5
        [HttpDelete("{id}")]
        public async Task<IActionResult> DeleteGimnasio(int id)
        {
            var gimnasio = await _context.Gimnasios.FindAsync(id);
            if (gimnasio == null)
            {
                return NotFound();
            }

            _context.Gimnasios.Remove(gimnasio);
            try
            {
                await _context.SaveChangesAsync();
            }
            catch (DbUpdateException)
            {
                // Restrict: un gimnasio con clientes, instructores, usuarios o ejercicios no se borra.
                return Conflict(new { mensaje = "No se puede borrar: el gimnasio tiene clientes, instructores, usuarios o ejercicios." });
            }
            return NoContent();
        }
    }
}
