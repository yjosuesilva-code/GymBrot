using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using GymBrot.Api.Data;
using GymBrot.Api.DTOs;

namespace GymBrot.Api.Controllers
{
    [Route("api/[controller]")]
    [ApiController]
    public class InstructoresController : ControllerBase
    {
        private readonly GymBrotContext _context;
        public InstructoresController(GymBrotContext context)
        {
            _context = context;
        }

        // GET: api/Instructores            -> todos
        // GET: api/Instructores?gimnasioId=1 -> solo los de ese gimnasio
        [HttpGet]
        public async Task<ActionResult<IEnumerable<InstructorDto>>> GetInstructores([FromQuery] int? gimnasioId)
        {
            var consulta = _context.Instructores.AsQueryable();
            if (gimnasioId.HasValue)
            {
                consulta = consulta.Where(i => i.GimnasioId == gimnasioId.Value);
            }
            var instructores = await consulta.OrderBy(i => i.Nombre).ToListAsync();
            return instructores.Select(InstructorDto.DesdeModelo).ToList();
        }

        // GET: api/Instructores/5
        [HttpGet("{id}")]
        public async Task<ActionResult<InstructorDto>> GetInstructor(int id)
        {
            var instructor = await _context.Instructores.FindAsync(id);
            if (instructor == null)
            {
                return NotFound();
            }
            return InstructorDto.DesdeModelo(instructor);
        }

        // POST: api/Instructores
        [HttpPost]
        public async Task<ActionResult<InstructorDto>> PostInstructor(InstructorCrearDto dto)
        {
            if (!await _context.Gimnasios.AnyAsync(g => g.Id == dto.GimnasioId))
            {
                return BadRequest(new { mensaje = "El gimnasio no existe." });
            }
            if (await _context.Instructores.AnyAsync(i => i.GimnasioId == dto.GimnasioId && i.NumeroIdentificacion == dto.NumeroIdentificacion.Trim()))
            {
                return Conflict(new { mensaje = "Ya existe un registro con esa identificación en este gimnasio" });
            }

            var instructor = dto.CrearModelo();
            _context.Instructores.Add(instructor);
            await _context.SaveChangesAsync();

            return CreatedAtAction(nameof(GetInstructor), new { id = instructor.Id }, InstructorDto.DesdeModelo(instructor));
        }

        // PUT: api/Instructores/5
        [HttpPut("{id}")]
        public async Task<IActionResult> PutInstructor(int id, InstructorActualizarDto dto)
        {
            var instructor = await _context.Instructores.FindAsync(id);
            if (instructor == null)
            {
                return NotFound();
            }
            var cedula = dto.NumeroIdentificacion.Trim();
            if (await _context.Instructores.AnyAsync(i => i.Id != id && i.GimnasioId == instructor.GimnasioId && i.NumeroIdentificacion == cedula))
            {
                return Conflict(new { mensaje = "Ya existe un registro con esa identificación en este gimnasio" });
            }

            dto.AplicarA(instructor);
            await _context.SaveChangesAsync();
            return NoContent();
        }

        // DELETE: api/Instructores/5
        [HttpDelete("{id}")]
        public async Task<IActionResult> DeleteInstructor(int id)
        {
            var instructor = await _context.Instructores.FindAsync(id);
            if (instructor == null)
            {
                return NotFound();
            }

            _context.Instructores.Remove(instructor);
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
