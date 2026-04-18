Initialize a new ASP.NET Core Web API project named 'AgenticServer'.

Add SignalR: dotnet add package Microsoft.AspNetCore.SignalR.Common.

Create 'Hubs/NotificationHub.cs' with a simple SendMessage method.

Configure SignalR and CORS in 'Program.cs' to allow any origin (for testing).

Create a 'docker-compose.yml':

Service 'db': 'mcr.microsoft.com/mssql/server:2022-latest' (SA_PASSWORD=Password123!, ACCEPT_EULA=Y).

Service 'app': build the current project using a multi-stage Dockerfile.

Create a 'Dockerfile' for the ASP.NET app.