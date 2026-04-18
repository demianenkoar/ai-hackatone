using System.Text.Json.Serialization;
using AgenticServer.Hubs;
using AgenticServer.Data;
using AgenticServer.Models;
using Microsoft.Data.SqlClient;
using Microsoft.EntityFrameworkCore;

var builder = WebApplication.CreateBuilder(args);

builder.Services.AddSignalR();

builder.Services.AddControllers()
    .AddJsonOptions(options =>
    {
        options.JsonSerializerOptions.ReferenceHandler = ReferenceHandler.IgnoreCycles;
    });

builder.Services.AddCors(options =>
{
    options.AddPolicy("ReactDev", policy =>
    {
        policy
            .WithOrigins("http://localhost:5173")
            .AllowAnyHeader()
            .AllowAnyMethod()
            .AllowCredentials();
    });
});

builder.Services.AddDbContext<ApplicationDbContext>(options =>
    options.UseSqlServer(builder.Configuration.GetConnectionString("DefaultConnection")));

var app = builder.Build();

app.UseDefaultFiles();
app.UseStaticFiles();

app.UseRouting();

app.UseCors("ReactDev");

app.UseAuthorization();

app.MapGet("/", () => "AgenticServer running");

app.MapGet("/test-db", async (IConfiguration config) =>
{
    var connString = config.GetConnectionString("DefaultConnection");

    try
    {
        using var conn = new SqlConnection(connString);
        await conn.OpenAsync();

        using var cmd = new SqlCommand("SELECT 1", conn);
        var result = await cmd.ExecuteScalarAsync();

        return Results.Ok(new
        {
            status = "connected",
            result
        });
    }
    catch (Exception ex)
    {
        return Results.Problem($"Database connection failed: {ex.Message}");
    }
});

app.MapHub<NotificationHub>("/hubs/notifications");
app.MapHub<ChatHub>("/chatHub");

app.MapControllers();

try
{
    using var scope = app.Services.CreateScope();
    var db = scope.ServiceProvider.GetRequiredService<ApplicationDbContext>();

    db.Database.Migrate();

    if (!db.Rooms.Any())
    {
        var generalRoom = new Room
        {
            Id = Guid.Parse("550e8400-e29b-41d4-a716-446655440000"),
            Name = "General Chat",
            IsPrivate = false
        };

        db.Rooms.Add(generalRoom);
        db.SaveChanges();
    }
}
catch (Exception ex)
{
    Console.WriteLine($"Database migration/seeding failed: {ex.Message}");
}

app.Run();
