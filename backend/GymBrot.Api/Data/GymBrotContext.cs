using GymBrot.Api.Models;
using Microsoft.EntityFrameworkCore;

namespace GymBrot.Api.Data
{
    public class GymBrotContext : DbContext
    {
        public GymBrotContext(DbContextOptions<GymBrotContext> options) : base(options) { }

        public DbSet<PlanSoftware> PlanesSoftware { get; set; }
        public DbSet<Gimnasio> Gimnasios { get; set; }
        public DbSet<Ejercicio> Ejercicios { get; set; }

        protected override void OnModelCreating(ModelBuilder modelBuilder)
        {
            // Dos gimnasios no pueden tener el mismo enlace, ni dos planes el mismo código
            modelBuilder.Entity<Gimnasio>().HasIndex(g => g.Slug).IsUnique();
            modelBuilder.Entity<PlanSoftware>().HasIndex(p => p.Codigo).IsUnique();

            // Los 3 planes ya creados al hacer Update-Database (los mismos del frontend)
            modelBuilder.Entity<PlanSoftware>().HasData(
                new PlanSoftware { Id = 1, Codigo = "BASICO", Nombre = "Básico", PrecioMensual = 99000, MaxClientes = 100 },
                new PlanSoftware { Id = 2, Codigo = "PRO", Nombre = "Pro", PrecioMensual = 189000, MaxClientes = 500, Destacado = true },
                new PlanSoftware { Id = 3, Codigo = "PREMIUM", Nombre = "Premium", PrecioMensual = 299000, MaxClientes = null });
        }
    }
}