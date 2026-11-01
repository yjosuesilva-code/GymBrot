using GymBrot.Api.Data;
using Microsoft.EntityFrameworkCore;

var builder = WebApplication.CreateBuilder(args);


builder.Services.AddDbContext<GymBrotContext>(options =>
    options.UseNpgsql(builder.Configuration.GetConnectionString("CadenaConexion")));

// Add services to the container.

// CORS: el frontend de React (Vite) corre en otro puerto y el navegador bloquea
// las llamadas si la API no lo autoriza.
builder.Services.AddCors(options =>
    options.AddPolicy("Frontend", policy => policy
        .WithOrigins("http://localhost:5173", "http://127.0.0.1:5173", "http://[::1]:5173")
        .AllowAnyHeader()
        .AllowAnyMethod()));

builder.Services.AddControllers();
// Learn more about configuring Swagger/OpenAPI at https://aka.ms/aspnetcore/swashbuckle
builder.Services.AddEndpointsApiExplorer();
builder.Services.AddSwaggerGen();

var app = builder.Build();


// Configure the HTTP request pipeline.
if (app.Environment.IsDevelopment())
{
    app.UseSwagger();
    app.UseSwaggerUI();
}

// En desarrollo no se redirige a HTTPS: React llama por http://localhost:5107 y una
// redireccion rompe el CORS (el navegador no la sigue en la consulta previa).
if (!app.Environment.IsDevelopment())
{
    app.UseHttpsRedirection();
}

app.UseCors("Frontend");

app.UseAuthorization();

app.MapControllers();

app.Run();
