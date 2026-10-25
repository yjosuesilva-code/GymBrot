using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using GymBrot.Api.Models;
using GymBrot.Api.Data;

[Route("api/[controller]")]
[ApiController]
public class GimnasiosController : ControllerBase
{
    private readonly GymBrotContext _context;
    public GimnasiosController(GymBrotContext context)
    {
        _context = context;
    }

    // GET: api/Gimnasio
    [HttpGet]
    public async Task<ActionResult<IEnumerable<Gimnasio>>> GetGimnasio()
    {
        return await _context.Gimnasios.ToListAsync();
    }

    // GET: api/Gimnasio/5
    [HttpGet("{id}")]
    public async Task<ActionResult<Gimnasio>> GetGimnasio(int id)
    {
        var gimnasio = await _context.Gimnasios.FindAsync(id);

        if (gimnasio == null)
        {
            return NotFound();
        }

        return gimnasio;
    }

    // PUT: api/Gimnasio/5
    // To protect from overposting attacks, see https://go.microsoft.com/fwlink/?linkid=2123754
    [HttpPut("{id}")]
    public async Task<IActionResult> PutGimnasio(int? id, Gimnasio gimnasio)
    {
        if (id != gimnasio.Id)
        {
            return BadRequest();
        }

        _context.Entry(gimnasio).State = EntityState.Modified;

        try
        {
            await _context.SaveChangesAsync();
        }
        catch (DbUpdateConcurrencyException)
        {
            if (!GimnasioExists(id))
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

    // POST: api/Gimnasio
    // To protect from overposting attacks, see https://go.microsoft.com/fwlink/?linkid=2123754
    [HttpPost]
    public async Task<ActionResult<Gimnasio>> PostGimnasio(Gimnasio gimnasio)
    {
        _context.Gimnasios.Add(gimnasio);
        await _context.SaveChangesAsync();

        return CreatedAtAction("GetGimnasio", new { id = gimnasio.Id }, gimnasio);
    }

    // DELETE: api/Gimnasio/5
    [HttpDelete("{id}")]
    public async Task<IActionResult> DeleteGimnasio(int? id)
    {
        var gimnasio = await _context.Gimnasios.FindAsync(id);
        if (gimnasio == null)
        {
            return NotFound();
        }

        _context.Gimnasios.Remove(gimnasio);
        await _context.SaveChangesAsync();

        return NoContent();
    }

    private bool GimnasioExists(int? id)
    {
        return _context.Gimnasios.Any(e => e.Id == id);
    }
}
