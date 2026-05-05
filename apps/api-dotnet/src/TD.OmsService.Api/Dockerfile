FROM mcr.microsoft.com/dotnet/sdk:8.0 AS build
WORKDIR /src
COPY Directory.Build.props global.json ./
COPY src/TD.OmsService.Domain/ src/TD.OmsService.Domain/
COPY src/TD.OmsService.Application/ src/TD.OmsService.Application/
COPY src/TD.OmsService.Infrastructure/ src/TD.OmsService.Infrastructure/
COPY src/TD.OmsService.Api/ src/TD.OmsService.Api/
RUN dotnet publish src/TD.OmsService.Api/TD.OmsService.Api.csproj -c Release -o /app /p:UseAppHost=false

FROM mcr.microsoft.com/dotnet/aspnet:8.0 AS runtime
WORKDIR /app
COPY --from=build /app .
EXPOSE 4111
ENTRYPOINT ["dotnet", "TD.OmsService.Api.dll"]
