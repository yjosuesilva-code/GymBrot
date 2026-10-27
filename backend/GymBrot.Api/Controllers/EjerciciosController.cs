using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using GymBrot.Api.Models;
using GymBrot.Api.Data;

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

        // GET: api/Ejercicios
        [HttpGet]
        public async Task<ActionResult<IEnumerable<Ejercicio>>> GetEjercicios([FromQuery] int? gimnasioId)
        {
            var consulta = _context.Ejercicios.AsQueryable();
            if (gimnasioId.HasValue)
            {
                 consulta = consulta.Where(e => e.GimnasioId == null || e.GimnasioId == gimnasioId.Value);
            }
            return await consulta.OrderBy(e => e.Nombre).ToListAsync();
        }

        // GET: api/Ejercicio/5
        [HttpGet("{id}")]
        public async Task<ActionResult<Ejercicio>> GetEjercicio(int id)
        {
            var ejercicio = await _context.Ejercicios.FindAsync(id);

            if (ejercicio == null)
            {
                return NotFound();
            }

            return ejercicio;
        }

        // PUT: api/Ejercicio/5
        // To protect from overposting attacks, see https://go.microsoft.com/fwlink/?linkid=2123754
        [HttpPut("{id}")]
        public async Task<IActionResult> PutEjercicio(int id, Ejercicio ejercicio)
        {
            if (id != ejercicio.Id)
            {
                return BadRequest();
            }

            _context.Entry(ejercicio).State = EntityState.Modified;

            try
            {
                await _context.SaveChangesAsync();
            }
            catch (DbUpdateConcurrencyException)
            {
                if (!EjercicioExists(id))
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

        // POST: api/Ejercicio
        // To protect from overposting attacks, see https://go.microsoft.com/fwlink/?linkid=2123754
        [HttpPost]
        public async Task<ActionResult<Ejercicio>> PostEjercicio(Ejercicio ejercicio)
        {
            _context.Ejercicios.Add(ejercicio);
            await _context.SaveChangesAsync();

            return CreatedAtAction("GetEjercicio", new { id = ejercicio.Id }, ejercicio);
        }

        // DELETE: api/Ejercicio/5
        [HttpDelete("{id}")]
        public async Task<IActionResult> DeleteEjercicio(int id)
        {
            var ejercicio = await _context.Ejercicios.FindAsync(id);
            if (ejercicio == null)
            {
                return NotFound();
            }

            _context.Ejercicios.Remove(ejercicio);
            await _context.SaveChangesAsync();

            return NoContent();
        }

        private bool EjercicioExists(int id)
        {
            return _context.Ejercicios.Any(e => e.Id == id);
        }
    }
}