# TD.OmsService — .NET 8 API (Migration)

Port of `apps/api` (Fastify + Prisma) to **ASP.NET Core 8 + EF Core 8** while
keeping the existing PostgreSQL schema and the `{ ok, data, error }` response
envelope so React frontends continue working unchanged through the gateway.

## Layout

```
apps/api-dotnet/
├── api-dotnet.sln                  # solution
├── Directory.Build.props           # net8.0, nullable, warnings-as-errors
├── global.json                     # SDK 8.0.x pin
├── docker-compose.yml              # postgres + api-node + api-dotnet + gateway
├── src/
│   ├── TD.OmsService.Api/          # ASP.NET Core Web API (controllers, middleware, SignalR hubs)
│   ├── TD.OmsService.Application/  # DTOs, validators, service interfaces
│   ├── TD.OmsService.Domain/       # Entities, enums, value objects
│   └── TD.OmsService.Infrastructure/ # EF Core, repositories, JWT, file storage
├── tests/
│   └── TD.OmsService.Tests/        # xUnit + FluentAssertions + Testcontainers
└── gateway/
    └── TD.OmsService.Gateway/      # YARP reverse proxy (Strangler Fig)
```

## Prerequisites

- **.NET 8 SDK** — https://dotnet.microsoft.com/download/dotnet/8.0
- **Docker Desktop** (for postgres + parallel-run with the Node API)
- **EF Core tools**:  `dotnet tool install --global dotnet-ef`

## Quick start

```pwsh
# Restore + build
dotnet restore apps/api-dotnet/api-dotnet.sln
dotnet build   apps/api-dotnet/api-dotnet.sln

# Configure DB connection (user secrets, not appsettings.json)
cd apps/api-dotnet/src/TD.OmsService.Api
dotnet user-secrets set "ConnectionStrings:Default" "Host=localhost;Port=5432;Database=oms_dev;Username=postgres;Password=postgres"
dotnet user-secrets set "Jwt:Secret" "$([Convert]::ToBase64String((1..32 | ForEach-Object { [byte](Get-Random -Max 256) })))"

# Run API (port 4111)
dotnet run --project apps/api-dotnet/src/TD.OmsService.Api

# Run gateway (port 4100, swap default upstream when modules graduate)
dotnet run --project apps/api-dotnet/gateway

# Run all integration tests
dotnet test apps/api-dotnet/api-dotnet.sln
```

## Phase 0 deliverables (this scaffold)

| Item | Status | Where |
|------|--------|-------|
| Solution + 4 projects + tests + gateway | ✅ | `api-dotnet.sln` |
| ASP.NET Core 8 host + Serilog + Swagger | ✅ | `Api/Program.cs` |
| EF Core + Npgsql wired | ✅ | `Infrastructure/Persistence/AppDbContext.cs` |
| YARP gateway with Node fallback | ✅ | `gateway/appsettings.json` |
| Docker compose (parallel-run topology) | ✅ | `docker-compose.yml` |
| Health endpoints `/api/v1/ping`, `/api/v1/ready` | ✅ | `Controllers/HealthController.cs` |
| ProblemDetails-style exception middleware | ✅ | `Middleware/ExceptionHandlingMiddleware.cs` |
| Reference Phase 2 module (`Customers`) | ✅ | `Customers/*` |
| Reference Phase 1 auth (login + OTP stubs) | ✅ | `Auth/*` |
| SignalR hub stub for Tech PWA | ✅ | `Hubs/TechHub.cs` |

## Scaffolding entities from existing DB

EF Core uses **DbFirst** — generate entity classes from the live PostgreSQL DB
(no migration needed since the schema is owned by Prisma during the migration):

```pwsh
cd apps/api-dotnet/src/TD.OmsService.Infrastructure

dotnet ef dbcontext scaffold `
  "Host=localhost;Port=5432;Database=oms_dev;Username=postgres;Password=postgres" `
  Npgsql.EntityFrameworkCore.PostgreSQL `
  --output-dir Persistence/Generated `
  --context-dir Persistence `
  --context AppDbContextScaffold `
  --use-database-names `
  --no-onconfiguring `
  --force
```

Then merge generated `DbSet<>` lines into the hand-maintained `AppDbContext`,
or keep both files and have `AppDbContext` inherit from the scaffolded one.

## Strangler Fig migration plan

The YARP gateway (`gateway/appsettings.json`) sends specific routes to .NET and
everything else to the Node API. As Phase 2/3/… modules graduate, move their
prefixes from `node-cluster` to `dotnet-cluster`. Cutover (Phase 7) inverts
the default and decommissions the Node API.

Current routing:
- `/api/v1/ping` → .NET
- `/api/v1/ready` → .NET
- `/{**catch-all}` → Node (existing API at `:4100`)

## Migration phases

See Azure DevOps Epic **#1039** and child Tasks **#1040–#1047** for the full
8-phase plan. Branch: `feat/dotnet-api-migration`.
