using AgenticServer.Hubs;
using Microsoft.Data.SqlClient;

var builder = WebApplication.CreateBuilder(args);

builder.Services.AddSignalR();

builder.Services.AddCors(options =>
{
    options.AddPolicy("AllowAll", policy =>
    {
        policy
            .AllowAnyHeader()
            .AllowAnyMethod()
            .AllowAnyOrigin();
    });
});

var app = builder.Build();

app.UseCors("AllowAll");

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

app.Run();
