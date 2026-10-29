using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace GymBrot.Api.Migrations
{
    /// <inheritdoc />
    public partial class AddPersonas : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropForeignKey(
                name: "FK_Ejercicios_Gimnasios_GimnasioId",
                table: "Ejercicios");

            migrationBuilder.DropForeignKey(
                name: "FK_Gimnasios_PlanesSoftware_PlanSoftwareId",
                table: "Gimnasios");

            migrationBuilder.CreateTable(
                name: "Clientes",
                columns: table => new
                {
                    Id = table.Column<int>(type: "int", nullable: false)
                        .Annotation("SqlServer:Identity", "1, 1"),
                    GimnasioId = table.Column<int>(type: "int", nullable: false),
                    NumeroIdentificacion = table.Column<string>(type: "nvarchar(20)", maxLength: 20, nullable: false),
                    TipoIdentificacion = table.Column<string>(type: "nvarchar(2)", maxLength: 2, nullable: false),
                    Nombre = table.Column<string>(type: "nvarchar(100)", maxLength: 100, nullable: false),
                    Apellidos = table.Column<string>(type: "nvarchar(100)", maxLength: 100, nullable: false),
                    Telefono = table.Column<string>(type: "nvarchar(20)", maxLength: 20, nullable: false),
                    Correo = table.Column<string>(type: "nvarchar(150)", maxLength: 150, nullable: false),
                    Direccion = table.Column<string>(type: "nvarchar(200)", maxLength: 200, nullable: false),
                    FechaNacimiento = table.Column<DateTime>(type: "date", nullable: true),
                    Estado = table.Column<string>(type: "nvarchar(15)", maxLength: 15, nullable: false),
                    FechaRegistro = table.Column<DateTime>(type: "date", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_Clientes", x => x.Id);
                    table.ForeignKey(
                        name: "FK_Clientes_Gimnasios_GimnasioId",
                        column: x => x.GimnasioId,
                        principalTable: "Gimnasios",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                });

            migrationBuilder.CreateTable(
                name: "Instructores",
                columns: table => new
                {
                    Id = table.Column<int>(type: "int", nullable: false)
                        .Annotation("SqlServer:Identity", "1, 1"),
                    GimnasioId = table.Column<int>(type: "int", nullable: false),
                    NumeroIdentificacion = table.Column<string>(type: "nvarchar(20)", maxLength: 20, nullable: false),
                    TipoIdentificacion = table.Column<string>(type: "nvarchar(2)", maxLength: 2, nullable: false),
                    Nombre = table.Column<string>(type: "nvarchar(100)", maxLength: 100, nullable: false),
                    Apellidos = table.Column<string>(type: "nvarchar(100)", maxLength: 100, nullable: false),
                    Telefono = table.Column<string>(type: "nvarchar(20)", maxLength: 20, nullable: false),
                    Correo = table.Column<string>(type: "nvarchar(150)", maxLength: 150, nullable: false),
                    Especialidad = table.Column<string>(type: "nvarchar(40)", maxLength: 40, nullable: false),
                    FechaContratacion = table.Column<DateTime>(type: "date", nullable: false),
                    Estado = table.Column<string>(type: "nvarchar(10)", maxLength: 10, nullable: false),
                    Foto = table.Column<string>(type: "nvarchar(max)", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_Instructores", x => x.Id);
                    table.ForeignKey(
                        name: "FK_Instructores_Gimnasios_GimnasioId",
                        column: x => x.GimnasioId,
                        principalTable: "Gimnasios",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                });

            migrationBuilder.CreateTable(
                name: "Usuarios",
                columns: table => new
                {
                    Id = table.Column<int>(type: "int", nullable: false)
                        .Annotation("SqlServer:Identity", "1, 1"),
                    GimnasioId = table.Column<int>(type: "int", nullable: true),
                    NumeroIdentificacion = table.Column<string>(type: "nvarchar(20)", maxLength: 20, nullable: false),
                    Nombre = table.Column<string>(type: "nvarchar(100)", maxLength: 100, nullable: false),
                    Apellidos = table.Column<string>(type: "nvarchar(100)", maxLength: 100, nullable: false),
                    Correo = table.Column<string>(type: "nvarchar(150)", maxLength: 150, nullable: false),
                    Contrasena = table.Column<string>(type: "nvarchar(200)", maxLength: 200, nullable: false),
                    Estado = table.Column<string>(type: "nvarchar(15)", maxLength: 15, nullable: false),
                    TipoUsuario = table.Column<string>(type: "nvarchar(20)", maxLength: 20, nullable: false),
                    Rol = table.Column<string>(type: "nvarchar(30)", maxLength: 30, nullable: false),
                    DebeCambiarContrasena = table.Column<bool>(type: "bit", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_Usuarios", x => x.Id);
                    table.ForeignKey(
                        name: "FK_Usuarios_Gimnasios_GimnasioId",
                        column: x => x.GimnasioId,
                        principalTable: "Gimnasios",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                });

            migrationBuilder.CreateIndex(
                name: "IX_Clientes_GimnasioId_NumeroIdentificacion",
                table: "Clientes",
                columns: new[] { "GimnasioId", "NumeroIdentificacion" },
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_Instructores_GimnasioId_NumeroIdentificacion",
                table: "Instructores",
                columns: new[] { "GimnasioId", "NumeroIdentificacion" },
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_Usuarios_GimnasioId_Correo",
                table: "Usuarios",
                columns: new[] { "GimnasioId", "Correo" },
                unique: true,
                filter: "[GimnasioId] IS NOT NULL");

            migrationBuilder.CreateIndex(
                name: "IX_Usuarios_GimnasioId_NumeroIdentificacion",
                table: "Usuarios",
                columns: new[] { "GimnasioId", "NumeroIdentificacion" },
                unique: true,
                filter: "[GimnasioId] IS NOT NULL");

            migrationBuilder.AddForeignKey(
                name: "FK_Ejercicios_Gimnasios_GimnasioId",
                table: "Ejercicios",
                column: "GimnasioId",
                principalTable: "Gimnasios",
                principalColumn: "Id",
                onDelete: ReferentialAction.Restrict);

            migrationBuilder.AddForeignKey(
                name: "FK_Gimnasios_PlanesSoftware_PlanSoftwareId",
                table: "Gimnasios",
                column: "PlanSoftwareId",
                principalTable: "PlanesSoftware",
                principalColumn: "Id",
                onDelete: ReferentialAction.Restrict);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropForeignKey(
                name: "FK_Ejercicios_Gimnasios_GimnasioId",
                table: "Ejercicios");

            migrationBuilder.DropForeignKey(
                name: "FK_Gimnasios_PlanesSoftware_PlanSoftwareId",
                table: "Gimnasios");

            migrationBuilder.DropTable(
                name: "Clientes");

            migrationBuilder.DropTable(
                name: "Instructores");

            migrationBuilder.DropTable(
                name: "Usuarios");

            migrationBuilder.AddForeignKey(
                name: "FK_Ejercicios_Gimnasios_GimnasioId",
                table: "Ejercicios",
                column: "GimnasioId",
                principalTable: "Gimnasios",
                principalColumn: "Id");

            migrationBuilder.AddForeignKey(
                name: "FK_Gimnasios_PlanesSoftware_PlanSoftwareId",
                table: "Gimnasios",
                column: "PlanSoftwareId",
                principalTable: "PlanesSoftware",
                principalColumn: "Id",
                onDelete: ReferentialAction.Cascade);
        }
    }
}
