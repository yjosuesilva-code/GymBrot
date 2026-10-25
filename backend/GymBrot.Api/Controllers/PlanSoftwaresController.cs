using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using GymBrot.Api.Models;
using GymBrot.Api.Data;

[Route("api/[controller]")]
[ApiController]
public class PlanSoftwaresController : ControllerBase
{
    private readonly GymBrotContext _context;
    public PlanSoftwaresController(GymBrotContext context)
    {
        _context = context;
    }

    // GET: api/PlanSoftware
    [HttpGet]
    public async Task<ActionResult<IEnumerable<PlanSoftware>>> GetPlanSoftware()
    {
        return await _context.PlanesSoftware.ToListAsync();
    }

    // GET: api/PlanSoftware/5
    [HttpGet("{id}")]
    public async Task<ActionResult<PlanSoftware>> GetPlanSoftware(int id)
    {
        var plansoftware = await _context.PlanesSoftware.FindAsync(id);

        if (plansoftware == null)
        {
            return NotFound();
        }

        return plansoftware;
    }

    // PUT: api/PlanSoftware/5
    // To protect from overposting attacks, see https://go.microsoft.com/fwlink/?linkid=2123754
    [HttpPut("{id}")]
    public async Task<IActionResult> PutPlanSoftware(int? id, PlanSoftware plansoftware)
    {
        if (id != plansoftware.Id)
        {
            return BadRequest();
        }

        _context.Entry(plansoftware).State = EntityState.Modified;

        try
        {
            await _context.SaveChangesAsync();
        }
        catch (DbUpdateConcurrencyException)
        {
            if (!PlanSoftwareExists(id))
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

    // POST: api/PlanSoftware
    // To protect from overposting attacks, see https://go.microsoft.com/fwlink/?linkid=2123754
    [HttpPost]
    public async Task<ActionResult<PlanSoftware>> PostPlanSoftware(PlanSoftware plansoftware)
    {
        _context.PlanesSoftware.Add(plansoftware);
        await _context.SaveChangesAsync();

        return CreatedAtAction("GetPlanSoftware", new { id = plansoftware.Id }, plansoftware);
    }

    // DELETE: api/PlanSoftware/5
    [HttpDelete("{id}")]
    public async Task<IActionResult> DeletePlanSoftware(int? id)
    {
        var plansoftware = await _context.PlanesSoftware.FindAsync(id);
        if (plansoftware == null)
        {
            return NotFound();
        }

        _context.PlanesSoftware.Remove(plansoftware);
        await _context.SaveChangesAsync();

        return NoContent();
    }

    private bool PlanSoftwareExists(int? id)
    {
        return _context.PlanesSoftware.Any(e => e.Id == id);
    }
}
