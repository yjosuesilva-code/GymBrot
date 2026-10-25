using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

#pragma warning disable CA1814 // Prefer jagged arrays over multidimensional

namespace GymBrot.Api.Migrations
{
    /// <inheritdoc />
    public partial class Inicial : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.CreateTable(
                name: "PlanesSoftware",
                columns: table => new
                {
                    Id = table.Column<int>(type: "int", nullable: false)
                        .Annotation("SqlServer:Identity", "1, 1"),
                    Codigo = table.Column<string>(type: "nvarchar(20)", maxLength: 20, nullable: false),
                    Nombre = table.Column<string>(type: "nvarchar(50)", maxLength: 50, nullable: false),
                    PrecioMensual = table.Column<decimal>(type: "decimal(12,2)", nullable: false),
                    MaxClientes = table.Column<int>(type: "int", nullable: true),
                    Destacado = table.Column<bool>(type: "bit", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_PlanesSoftware", x => x.Id);
                });

            migrationBuilder.CreateTable(
                name: "Gimnasios",
                columns: table => new
                {
                    Id = table.Column<int>(type: "int", nullable: false)
                        .Annotation("SqlServer:Identity", "1, 1"),
                    Slug = table.Column<string>(type: "nvarchar(40)", maxLength: 40, nullable: false),
                    Nombre = table.Column<string>(type: "nvarchar(100)", maxLength: 100, nullable: false),
                    Ciudad = table.Column<string>(type: "nvarchar(60)", maxLength: 60, nullable: false),
                    Telefono = table.Column<string>(type: "nvarchar(20)", maxLength: 20, nullable: false),
                    Estado = table.Column<string>(type: "nvarchar(10)", maxLength: 10, nullable: false),
                    FechaRegistro = table.Column<DateTime>(type: "date", nullable: false),
                    VenceSuscripcion = table.Column<DateTime>(type: "date", nullable: false),
                    PlanSoftwareId = table.Column<int>(type: "int", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_Gimnasios", x => x.Id);
                    table.ForeignKey(
                        name: "FK_Gimnasios_PlanesSoftware_PlanSoftwareId",
                        column: x => x.PlanSoftwareId,
                        principalTable: "PlanesSoftware",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.InsertData(
                table: "PlanesSoftware",
                columns: new[] { "Id", "Codigo", "Destacado", "MaxClientes", "Nombre", "PrecioMensual" },
                values: new object[,]
                {
                    { 1, "BASICO", false, 100, "Básico", 99000m },
                    { 2, "PRO", true, 500, "Pro", 189000m },
                    { 3, "PREMIUM", false, null, "Premium", 299000m }
                });

            migrationBuilder.CreateIndex(
                name: "IX_Gimnasios_PlanSoftwareId",
                table: "Gimnasios",
                column: "PlanSoftwareId");

            migrationBuilder.CreateIndex(
                name: "IX_Gimnasios_Slug",
                table: "Gimnasios",
                column: "Slug",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_PlanesSoftware_Codigo",
                table: "PlanesSoftware",
                column: "Codigo",
                unique: true);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "Gimnasios");

            migrationBuilder.DropTable(
                name: "PlanesSoftware");
        }
    }
}
