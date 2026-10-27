using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using GymBrot.Api.Models;
using GymBrot.Api.Data;

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
        public async Task<ActionResult<IEnumerable<Instructor>>> GetInstructores([FromQuery] int? gimnasioId)
        {
            var consulta = _context.Instructores.AsQueryable();
            if (gimnasioId.HasValue)
            {
                consulta = consulta.Where(x => x.GimnasioId == gimnasioId.Value);
            }
            return await consulta.ToListAsync();
        }

        // GET: api/Instructores/5
        [HttpGet("{id}")]
        public async Task<ActionResult<Instructor>> GetInstructor(int id)
        {
            var instructor = await _context.Instructores.FindAsync(id);

            if (instructor == null)
            {
                return NotFound();
            }

            return instructor;
        }

        // PUT: api/Instructores/5
        [HttpPut("{id}")]
        public async Task<IActionResult> PutInstructor(int id, Instructor instructor)
        {
            if (id != instructor.Id)
            {
                return BadRequest();
            }

            _context.Entry(instructor).State = EntityState.Modified;

            try
            {
                await _context.SaveChangesAsync();
            }
            catch (DbUpdateConcurrencyException)
            {
                if (!InstructorExists(id))
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

        // POST: api/Instructores
        [HttpPost]
        public async Task<ActionResult<Instructor>> PostInstructor(Instructor instructor)
        {
            _context.Instructores.Add(instructor);
            await _context.SaveChangesAsync();

            return CreatedAtAction(nameof(GetInstructor), new { id = instructor.Id }, instructor);
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
            await _context.SaveChangesAsync();

            return NoContent();
        }

        private bool InstructorExists(int id)
        {
            return _context.Instructores.Any(e => e.Id == id);
        }
    }
}
