using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using GymBrot.Api.Data;
using GymBrot.Api.DTOs;

namespace GymBrot.Api.Controllers
{
    [Route("api/[controller]")]
    [ApiController]
    public class PlanSoftwaresController : ControllerBase
    {
        private readonly GymBrotContext _context;
        public PlanSoftwaresController(GymBrotContext context)
        {
            _context = context;
        }

        // GET: api/PlanSoftwares
        [HttpGet]
        public async Task<ActionResult<IEnumerable<PlanSoftwareDto>>> GetPlanesSoftware()
        {
            var planes = await _context.PlanesSoftware.OrderBy(p => p.PrecioMensual).ToListAsync();
            return planes.Select(PlanSoftwareDto.DesdeModelo).ToList();
        }

        // GET: api/PlanSoftwares/5
        [HttpGet("{id}")]
        public async Task<ActionResult<PlanSoftwareDto>> GetPlanSoftware(int id)
        {
            var plan = await _context.PlanesSoftware.FindAsync(id);
            if (plan == null)
            {
                return NotFound();
            }
            return PlanSoftwareDto.DesdeModelo(plan);
        }

        // POST: api/PlanSoftwares
        [HttpPost]
        public async Task<ActionResult<PlanSoftwareDto>> PostPlanSoftware(PlanSoftwareGuardarDto dto)
        {
            var codigo = dto.Codigo.Trim().ToUpperInvariant();
            if (await _context.PlanesSoftware.AnyAsync(p => p.Codigo == codigo))
            {
                return Conflict(new { mensaje = "Ya existe un plan con ese código." });
            }

            var plan = dto.CrearModelo();
            _context.PlanesSoftware.Add(plan);
            await _context.SaveChangesAsync();

            return CreatedAtAction(nameof(GetPlanSoftware), new { id = plan.Id }, PlanSoftwareDto.DesdeModelo(plan));
        }

        // PUT: api/PlanSoftwares/5
        [HttpPut("{id}")]
        public async Task<IActionResult> PutPlanSoftware(int id, PlanSoftwareGuardarDto dto)
        {
            var plan = await _context.PlanesSoftware.FindAsync(id);
            if (plan == null)
            {
                return NotFound();
            }
            var codigo = dto.Codigo.Trim().ToUpperInvariant();
            if (await _context.PlanesSoftware.AnyAsync(p => p.Id != id && p.Codigo == codigo))
            {
                return Conflict(new { mensaje = "Ya existe un plan con ese código." });
            }

            dto.AplicarA(plan);
            await _context.SaveChangesAsync();
            return NoContent();
        }

        // DELETE: api/PlanSoftwares/5
        [HttpDelete("{id}")]
        public async Task<IActionResult> DeletePlanSoftware(int id)
        {
            var plan = await _context.PlanesSoftware.FindAsync(id);
            if (plan == null)
            {
                return NotFound();
            }

            _context.PlanesSoftware.Remove(plan);
            try
            {
                await _context.SaveChangesAsync();
            }
            catch (DbUpdateException)
            {
                return Conflict(new { mensaje = "No se puede borrar: hay gimnasios con este plan." });
            }
            return NoContent();
        }
    }
}
