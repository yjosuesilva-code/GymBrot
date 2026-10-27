using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace GymBrot.Api.Migrations
{
    /// <inheritdoc />
    public partial class AddEjercicio : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.CreateTable(
                name: "Ejercicios",
                columns: table => new
                {
                    Id = table.Column<int>(type: "int", nullable: false)
                        .Annotation("SqlServer:Identity", "1, 1"),
                    GimnasioId = table.Column<int>(type: "int", nullable: true),
                    Nombre = table.Column<string>(type: "nvarchar(100)", maxLength: 100, nullable: false),
                    Descripcion = table.Column<string>(type: "nvarchar(500)", maxLength: 500, nullable: false),
                    GrupoMuscular = table.Column<string>(type: "nvarchar(30)", maxLength: 30, nullable: false),
                    Nivel = table.Column<string>(type: "nvarchar(20)", maxLength: 20, nullable: false),
                    Equipo = table.Column<string>(type: "nvarchar(30)", maxLength: 30, nullable: false),
                    TipoMedicion = table.Column<string>(type: "nvarchar(15)", maxLength: 15, nullable: false),
                    SeriesSugeridas = table.Column<int>(type: "int", nullable: true),
                    RepeticionesMinSugeridas = table.Column<int>(type: "int", nullable: true),
                    RepeticionesMaxSugeridas = table.Column<int>(type: "int", nullable: true),
                    SegundosSugeridos = table.Column<int>(type: "int", nullable: true),
                    RecursoUrl = table.Column<string>(type: "nvarchar(500)", maxLength: 500, nullable: false),
                    Estado = table.Column<string>(type: "nvarchar(10)", maxLength: 10, nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_Ejercicios", x => x.Id);
                    table.ForeignKey(
                        name: "FK_Ejercicios_Gimnasios_GimnasioId",
                        column: x => x.GimnasioId,
                        principalTable: "Gimnasios",
                        principalColumn: "Id");
                });

            migrationBuilder.CreateIndex(
                name: "IX_Ejercicios_GimnasioId",
                table: "Ejercicios",
                column: "GimnasioId");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "Ejercicios");
        }
    }
}
