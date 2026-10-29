using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using GymBrot.Api.Data;
using GymBrot.Api.DTOs;

namespace GymBrot.Api.Controllers
{
    [Route("api/[controller]")]
    [ApiController]
    public class EjerciciosController : ControllerBase
    {
        private readonly GymBrotContext _context;
        public EjerciciosController(GymBrotContext context)
        {
            _context = context;
        }

        // GET: api/Ejercicios              -> todos
        // GET: api/Ejercicios?gimnasioId=1 -> los base (sin gimnasio) + los propios de ese gimnasio
        [HttpGet]
        public async Task<ActionResult<IEnumerable<EjercicioDto>>> GetEjercicios([FromQuery] int? gimnasioId)
        {
            var consulta = _context.Ejercicios.AsQueryable();
            if (gimnasioId.HasValue)
            {
                consulta = consulta.Where(e => e.GimnasioId == null || e.GimnasioId == gimnasioId.Value);
            }
            var ejercicios = await consulta.OrderBy(e => e.Nombre).ToListAsync();
            return ejercicios.Select(EjercicioDto.DesdeModelo).ToList();
        }

        // GET: api/Ejercicios/5
        [HttpGet("{id}")]
        public async Task<ActionResult<EjercicioDto>> GetEjercicio(int id)
        {
            var ejercicio = await _context.Ejercicios.FindAsync(id);
            if (ejercicio == null)
            {
                return NotFound();
            }
            return EjercicioDto.DesdeModelo(ejercicio);
        }

        // POST: api/Ejercicios (gimnasioId null = ejercicio base)
        [HttpPost]
        public async Task<ActionResult<EjercicioDto>> PostEjercicio(EjercicioCrearDto dto)
        {
            if (dto.GimnasioId != null && !await _context.Gimnasios.AnyAsync(g => g.Id == dto.GimnasioId))
            {
                return BadRequest(new { mensaje = "El gimnasio no existe." });
            }

            var ejercicio = dto.CrearModelo();
            _context.Ejercicios.Add(ejercicio);
            await _context.SaveChangesAsync();

            return CreatedAtAction(nameof(GetEjercicio), new { id = ejercicio.Id }, EjercicioDto.DesdeModelo(ejercicio));
        }

        // PUT: api/Ejercicios/5 (no cambia de gimnasio)
        [HttpPut("{id}")]
        public async Task<IActionResult> PutEjercicio(int id, EjercicioActualizarDto dto)
        {
            var ejercicio = await _context.Ejercicios.FindAsync(id);
            if (ejercicio == null)
            {
                return NotFound();
            }

            dto.AplicarA(ejercicio);
            await _context.SaveChangesAsync();
            return NoContent();
        }

        // DELETE: api/Ejercicios/5
        [HttpDelete("{id}")]
        public async Task<IActionResult> DeleteEjercicio(int id)
        {
            var ejercicio = await _context.Ejercicios.FindAsync(id);
            if (ejercicio == null)
            {
                return NotFound();
            }

            _context.Ejercicios.Remove(ejercicio);
            try
            {
                await _context.SaveChangesAsync();
            }
            catch (DbUpdateException)
            {
                return Conflict(new { mensaje = "No se puede borrar: el ejercicio está en alguna rutina." });
            }
            return NoContent();
        }
    }
}
