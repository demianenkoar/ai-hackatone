AI Hackatone Chat Application

This project is a real-time chat application built with:

Backend:
- .NET 8
- SignalR
- Entity Framework Core
- SQL Server

Frontend:
- React
- Vite
- TailwindCSS

Infrastructure:
- Docker
- Docker Compose

The application supports:

- Public chat rooms
- Private rooms
- Direct messaging (Contacts)
- Real-time messaging with SignalR
- Typing indicators
- Online / AFK / Offline presence
- File uploads
- Message replies
- Message deletion
- Unread message counters
- Room member management
- Kick users from private rooms
- Invite users
- Search messages
- Search users

------------------------------------------------

Requirements

To run the project you need:

- Docker
- Docker Compose

Install Docker:
https://docs.docker.com/get-docker/

------------------------------------------------

Run the application

Clone the repository:

git clone https://github.com/demianenkoar/ai-hackatone.git

Enter the project folder:

cd ai-hackatone

Start the application:

docker compose up --build

------------------------------------------------

Access the application

Frontend (React):
http://localhost:5173

Backend API:
http://localhost:58097

SignalR hub:
http://localhost:58097/chathub

Database:
SQL Server running inside Docker

------------------------------------------------

First run

On the first startup the application will:

- start SQL Server
- start the .NET API
- run database migrations
- seed initial data

------------------------------------------------

Project structure

AgenticServer/
.NET backend with API, SignalR hub, and database logic

client-app/
React frontend built with Vite

docker-compose.yml
Runs the full stack with one command

------------------------------------------------

Development

Backend:

cd AgenticServer
dotnet run

Frontend:

cd client-app
npm install
npm run dev

------------------------------------------------

License

This project was created for the AI Hackatone.
