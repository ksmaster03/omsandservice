# Phase 7 — Production Cutover

The .NET API now serves all migrated route groups via the YARP gateway. This
document describes the steps to flip production traffic from the legacy Node
API to the new .NET API and decommission the Node service.

## Migrated route inventory

All routes below now resolve to **`api-dotnet:4111`** through the gateway:

| Group | Path | Phase | Notes |
|---|---|---|---|
| Health | `/api/v1/{ping,ready}` | 0 | Liveness + DB readiness |
| Staff Auth | `/api/v1/auth/*` | 1 | JWT login |
| Customer Auth | `/api/v1/customer/auth/*` | 5 | Dev OTP bypass |
| Customer Portal | `/api/v1/customer/{me,assets,tickets,renewals}` | 5 | Customer-scoped |
| Tech | `/api/v1/tech/{tickets,pm-jobs,location}` | 4 | + SignalR `/hubs/tech` |
| Customers / Products / Users | `/api/v1/internal/{customers,products,users}` | 2 | Master data |
| Sales | `/api/v1/internal/{leads,quotations,sales-orders}` | 3 | + state machine |
| After-Sales | `/api/v1/internal/{tickets,assets,pm-schedules,rmas,renewals,service-agreements}` | 4 | |
| Reports | `/api/v1/internal/reports/{dashboard,sales-pipeline,top-sellers,tickets-by-stage}` | 6 | |
| Stock | `/api/v1/internal/stock/*` | 6 | List/set/adjust |
| WMS observability | `/api/v1/internal/wms/{sync-logs,stock-cache}` | 6 | Read-only |
| WMS active | `/api/v1/internal/wms/{status,parts,sync-products,scan-in,scan-out,close-order,inventory-count}` | 8 | IWmsAdapter abstraction (Mock default, Live via HttpClient when `Wms:BaseUrl` set) + WmsSyncLogger audit trail |
| Feedback | `/api/v1/feedback/*` | 6 | Public create + staff manage |
| Feedback upload | `/api/v1/feedback/upload` | 8 | Multipart, image/pdf ≤5MB, via `IFileStorageService` (local-disk default, swap to S3 by registering `S3FileStorageService`) |

Anything not in the list above falls through to the Node cluster via
`node-fallback` in `gateway/appsettings.json`.

## Deployment topology

```
                      ┌───────────────────────┐
   Cloudflare Tunnel  │     YARP Gateway      │   :8080
   (HTTPS, no port)   │   apps/api-dotnet/    │
   ─────────────────► │      gateway          │
                      └─────┬─────────┬───────┘
                            │         │
              .NET routes   │         │  fallback
                            ▼         ▼
              ┌──────────────────┐  ┌──────────────────┐
              │  api-dotnet      │  │  api-node        │
              │  (ASP.NET 8)     │  │  (Fastify 5)     │
              │       :4111      │  │       :4100      │
              └────────┬─────────┘  └────────┬─────────┘
                       │                     │
                       └──────► PostgreSQL ◄─┘
                                  :5432
                              (oms_dev / oms_prod)
```

Both services share the same Postgres DB (and Prisma migrations remain the
schema source of truth during the migration). EF Core uses
`dotnet ef dbcontext scaffold` against the live DB to keep entities in sync —
**never** run `dotnet ef migrations add` on this branch; the Node side owns
migrations.

## Cutover procedure

1. **Pre-flight**:
   - `dotnet test apps/api-dotnet/api-dotnet.sln` — must pass against staging DB.
   - Confirm gateway can reach both clusters: `curl http://gateway:8080/__gateway/health`.
   - Verify SignalR hub: `wscat -c ws://gateway:8080/hubs/tech` with a test JWT.

2. **Parallel run (2 weeks recommended)**:
   - Both `api-node` and `api-dotnet` containers running.
   - Gateway routes split per the table above.
   - Watch error rate and p95 latency on each cluster
     (`/__gateway/health` + your APM dashboards).

3. **Decommission Node** (only after parallel run is clean):
   - Move remaining route groups (`feedback/upload`, `wms/active-*`) to .NET
     by adding controllers and gateway routes.
   - Update Docker compose: remove `api-node` service.
   - Update `node-fallback` in `gateway/appsettings.json` so unknown paths
     return 404 instead of forwarding to Node.
   - Archive `apps/api/` to a `legacy/` branch and delete from `main`.
   - **Hand schema ownership from Prisma to EF Core**:
     - `dotnet ef migrations add InitialFromPrismaBaseline`
     - Subsequent schema changes go through EF Core migrations.
     - Drop `apps/api/prisma/` once any tooling that depends on it is updated.

4. **Production rollout**:
   - Update CI/CD to deploy gateway + api-dotnet only.
   - Update DEPLOYMENT.md with the simplified topology.
   - Update env var docs (`Jwt:Secret` via Key Vault / user-secrets).

## Rollback

The Strangler Fig topology makes rollback per-route trivial: edit
`gateway/appsettings.json` and either delete the offending `dotnet-*` route or
change its `ClusterId` to `node-cluster`. No app rebuild required.

For full rollback, set every `dotnet-*` route's ClusterId to `node-cluster`
or delete them — gateway hot-reloads route config without a restart in dev,
or do a `kubectl rollout restart` in prod.

## What's NOT migrated (and why)

All Node features are ported, including productionisation concerns that were
previously deferred:

- **Email notifications via SMTP**: Not in the Node API either — would be net new.

## Storage backend switch (S3)

`IFileStorageService` has two implementations:

| Backend | Class | When |
|---|---|---|
| Local disk | `LocalFileStorageService` | Default. Files saved to `uploads/{kind}/{entityId}/{uuid}.{ext}`. Suitable for dev. |
| AWS S3 | `S3FileStorageService` | Selected via `Storage:Backend=s3`. Uses AWSSDK.S3 default credential chain. |

Production config example:

```json
{
  "Storage": {
    "Backend": "s3",
    "S3": {
      "Bucket": "td-oms-uploads-prod",
      "Region": "ap-southeast-7",
      "UrlPrefix": "https://cdn.td-oms.example.com",
      "CannedAcl": "private"
    }
  }
}
```

Credentials come from AWS SDK default chain (env, ~/.aws, EC2/ECS instance profile).
No secrets in config. Server-side AES-256 encryption enforced per object.

## WMS authentication

`LiveWmsAdapter` runs the same 3-step Toptier WMS auth as the Node client:

1. `GET /api/AboutApi/GetKey?username=X` → text body = `apiKey`
2. `POST /api/Authorization/UserLogin?userId=X&password=Y&deviceName=ToptierOSM&ip=server` (with `?apikey=X`) → JSON `{ AuthSid }`
3. All subsequent calls append `?apikey=X` (NOT `_apikey` — Toptier docs are wrong)

On 401 or response body containing `Invalid API-key`, state is reset and
auth re-runs once before failing.

Credentials lookup order (each request):
1. `Setting` table rows: `wms.baseUrl`, `wms.username`, `wms.password`
2. Fallback to IConfiguration: `Wms:BaseUrl`, `Wms:Username`, `Wms:Password`

`LiveWmsAdapter` is a singleton — `apiKey` and `authSid` persist across
requests, gated by `SemaphoreSlim` for thread safety.

## Operational runbook

### Re-scaffold EF entities after a Prisma migration

```pwsh
cd apps/api-dotnet/src/TD.OmsService.Infrastructure
dotnet ef dbcontext scaffold `
  "Host=localhost;Port=5432;Database=oms_dev;Username=postgres;Password=postgres" `
  Npgsql.EntityFrameworkCore.PostgreSQL `
  --output-dir Persistence/Generated `
  --context-dir Persistence/Generated `
  --context AppDbContext --no-onconfiguring --force `
  --startup-project ../TD.OmsService.Api/TD.OmsService.Api.csproj
```

Then rename `Persistence/Generated/AppDbContext.cs` → `Persistence/AppDbContext.cs`
and update the namespace from `Generated` to plain `Persistence`.

### Add a new module (the Phase-2-onwards pattern)

1. `Domain/Entities/{Module}.cs` — usually NOT needed; reuse scaffolded entity.
2. `Application/{Module}/{Module}Dto.cs` — public shapes.
3. `Application/{Module}/I{Module}Service.cs` — interface.
4. `Infrastructure/{Module}/{Module}Service.cs` — EF Core implementation.
5. `Api/Controllers/{Module}Controller.cs` — `[Authorize(Policy = "Staff")]`.
6. Register in `Infrastructure/DependencyInjection.cs`.
7. Add route to `gateway/appsettings.json`.
8. Add a smoke test in `tests/TD.OmsService.Tests/Phase{N}SmokeTests.cs`.

### Run all tests

```pwsh
cd apps/api-dotnet
dotnet test api-dotnet.sln
```
