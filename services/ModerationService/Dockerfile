# See https://aka.ms/customizecontainer to learn how to customize your debug container and how Visual Studio uses this Dockerfile to build your images for faster debugging.

# This stage is used when running from VS in fast mode (Default for Debug configuration)
FROM mcr.microsoft.com/dotnet/aspnet:9.0 AS base
USER $APP_UID
WORKDIR /app
EXPOSE 8080
EXPOSE 8081


# This stage is used to build the service project
FROM mcr.microsoft.com/dotnet/sdk:9.0 AS build
ARG BUILD_CONFIGURATION=Release
WORKDIR /src
COPY ["services/ModerationService/ModerationService.csproj", "services/ModerationService/"]
COPY ["shared/Contracts/Contracts.csproj", "shared/Contracts/"]
RUN dotnet restore "./services/ModerationService/ModerationService.csproj"
COPY . .
WORKDIR "/src/services/ModerationService"
RUN dotnet build "./ModerationService.csproj" -c $BUILD_CONFIGURATION -o /app/build

# This stage is used to publish the service project to be copied to the final stage
FROM build AS publish
ARG BUILD_CONFIGURATION=Release
RUN dotnet publish "./ModerationService.csproj" -c $BUILD_CONFIGURATION -o /app/publish /p:UseAppHost=false

# This stage is used in production or when running from VS in regular mode (Default when not using the Debug configuration)
FROM base AS final
WORKDIR /app
COPY --from=publish /app/publish .
ENTRYPOINT ["dotnet", "ModerationService.dll"]


#FROM mcr.microsoft.com/dotnet/sdk:9.0 AS build
#WORKDIR /src
#COPY ["services/ModerationService/ModerationService.csproj", "services/ModerationService/"]
#RUN dotnet restore services/ModerationService/ModerationService.csproj
#COPY . .
#WORKDIR /src/services/ModerationService
#RUN dotnet publish -c Release -o /app/publish /p:UseAppHost=false
#
## Run
#FROM mcr.microsoft.com/dotnet/aspnet:9.0 AS final
#WORKDIR /app
#EXPOSE 8080
#ENV ASPNETCORE_URLS=http://0.0.0.0:8080
#COPY --from=build /app/publish .
#ENTRYPOINT ["dotnet", "ModerationService.dll"]