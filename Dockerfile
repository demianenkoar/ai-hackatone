FROM mcr.microsoft.com/dotnet/sdk:8.0

WORKDIR /src

COPY . .

RUN dotnet restore

RUN dotnet publish AgenticServer -c Release -o /app/publish

WORKDIR /app/publish

EXPOSE 8080

ENV ASPNETCORE_URLS=http://+:8080

CMD ["dotnet", "AgenticServer.dll"]
