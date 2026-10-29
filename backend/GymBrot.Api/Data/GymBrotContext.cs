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
        public DbSet<Usuario> Usuarios { get; set; }
        public DbSet<Cliente> Clientes { get; set; }
        public DbSet<Instructor> Instructores { get; set; }

        protected override void OnModelCreating(ModelBuilder modelBuilder)
        {
            // Dos gimnasios no pueden tener el mismo enlace, ni dos planes el mismo código
            modelBuilder.Entity<Gimnasio>().HasIndex(g => g.Slug).IsUnique();
            modelBuilder.Entity<PlanSoftware>().HasIndex(p => p.Codigo).IsUnique();

            // La cédula es única DENTRO de cada gimnasio: la misma persona puede estar en dos gimnasios
            modelBuilder.Entity<Cliente>().HasIndex(c => new { c.GimnasioId, c.NumeroIdentificacion }).IsUnique();
            modelBuilder.Entity<Instructor>().HasIndex(i => new { i.GimnasioId, i.NumeroIdentificacion }).IsUnique();
            modelBuilder.Entity<Usuario>().HasIndex(u => new { u.GimnasioId, u.NumeroIdentificacion }).IsUnique();
            modelBuilder.Entity<Usuario>().HasIndex(u => new { u.GimnasioId, u.Correo }).IsUnique();

            // Sin borrado en cascada: SQL Server no permite varias rutas de cascada hacia la misma tabla
            // (ej. Gimnasio -> Cliente -> Rutina y Gimnasio -> Rutina). Borrar un gimnasio con datos da error
            // en vez de llevarse todo por delante.
            foreach (var fk in modelBuilder.Model.GetEntityTypes().SelectMany(e => e.GetForeignKeys()))
            {
                fk.DeleteBehavior = DeleteBehavior.Restrict;
            }

            // Los 3 planes ya creados al hacer Update-Database (los mismos del frontend)
            modelBuilder.Entity<PlanSoftware>().HasData(
                new PlanSoftware { Id = 1, Codigo = "BASICO", Nombre = "Básico", PrecioMensual = 99000, MaxClientes = 100 },
                new PlanSoftware { Id = 2, Codigo = "PRO", Nombre = "Pro", PrecioMensual = 189000, MaxClientes = 500, Destacado = true },
                new PlanSoftware { Id = 3, Codigo = "PREMIUM", Nombre = "Premium", PrecioMensual = 299000, MaxClientes = null });
        }
    }
}
