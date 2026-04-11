# NBA Sport — OMS + Service System

Order Management System for NBA Sport (nbasport.co.th), plus customer self-service PWA and service technician PWA.

**Stack**: React 18 + Vite + TypeScript + Tailwind · Node.js + Fastify + Prisma · PostgreSQL 16 · pnpm monorepo · LINE OA · AWS (EC2/RDS/S3/CloudFront)

---

## Apps

| Path | Name | Purpose | Dev port |
|---|---|---|---|
| `apps/api` | `@oms/api` | Fastify backend (REST + webhooks) | **4100** |
| `apps/web` | `@oms/web` | OMS staff console (Sales/Install/Service/Admin) | **4110** |
| `apps/customer` | `@oms/customer` | Customer PWA — equipment, ticket, warranty, renewal | **4120** |
| `apps/tech` | `@oms/tech` | Service technician PWA — jobs, GPS, stage updates | **4130** |

> Ports chosen in the `41xx` block to avoid conflicts with common defaults
> (Vite 5173, Node 3000, Rails/Postgres 3001/5432, php-fpm 9000, etc.).
> All dev servers use `strictPort` — they fail fast instead of silently
> picking the next free port.

## Packages

| Path | Purpose |
|---|---|
| `packages/shared` | Zod schemas, TS types, constants (shared across all apps) |
| `packages/config` | Tailwind preset, shared tsconfig |

---

## Quick start

### Prerequisites
- Node.js 20+
- pnpm 10+
- PostgreSQL 16 running locally (or remote)

### 1. Install
```bash
pnpm install
```

### 2. Setup database
```bash
# Create local dev DB
createdb nba_oms_dev

# Copy env template and edit
cp apps/api/.env.example apps/api/.env
# Set DATABASE_URL and JWT_SECRET/JWT_REFRESH_SECRET (min 32 chars each)

# Generate Prisma client + run migrations
pnpm db:generate
pnpm db:migrate

# Seed initial users and sample data
pnpm db:seed
```

### 3. Run all apps in parallel
```bash
pnpm dev
```

Or individually:
```bash
pnpm dev:api       # http://localhost:4100
pnpm dev:web       # http://localhost:4110
pnpm dev:customer  # http://localhost:4120
pnpm dev:tech      # http://localhost:4130
```

### Default seed credentials
```
admin@nbasport.local    / Nba@12345   (ADMIN)
sales1@nbasport.local   / Nba@12345   (SALES)
install1@nbasport.local / Nba@12345   (INSTALL)
service1@nbasport.local / Nba@12345   (SERVICE)
```

---

## Commands

| Command | Purpose |
|---|---|
| `pnpm dev` | Run all apps (parallel) |
| `pnpm build` | Build all apps |
| `pnpm lint` | Lint all packages |
| `pnpm typecheck` | TypeScript check across workspace |
| `pnpm format` | Prettier format |
| `pnpm db:generate` | Prisma generate client |
| `pnpm db:migrate` | Prisma migrate dev |
| `pnpm db:seed` | Run seed script |
| `pnpm db:studio` | Open Prisma Studio |
| `pnpm db:reset` | Reset DB (destructive) |

---

## Architecture

```
┌─────────────────────────────────────────────┐
│            CloudFront (prod)                │
└────┬───────────────┬──────────────┬─────────┘
     │               │              │
  admin.             app.          tech.           api.
  (S3)              (S3)          (S3)            (EC2 Fastify)
                                                     │
                                                     ├─→ RDS PostgreSQL
                                                     ├─→ S3 uploads
                                                     ├─→ LINE Messaging API
                                                     └─→ WMS (mocked first)
```

Domains (planned):
- `admin.oms.toptierdigital.online` — OMS staff
- `app.oms.toptierdigital.online` — Customer PWA
- `tech.oms.toptierdigital.online` — Tech PWA
- `api.oms.toptierdigital.online` — Fastify API

---

## Roadmap (18 weeks)

See `/docs/mockups/` for design references (`nba_oms_mockup_v2.html`, `nba_mobile_app_v2.html`).

| Sprint | Focus |
|---|---|
| **0** (current) | Monorepo, API skeleton, Prisma schema, auth, seed |
| 1-2 | Master data: customers, products, users |
| 3-4 | Sales pipeline + quotation + sales order |
| 5 | Install + asset generation · Customer PWA M1 (LINE Login, equipment list) |
| 6 | WMS mock integration · Customer PWA M2 (ticket create + map picker) |
| 7 | Asset + warranty + PM · Customer PWA M3 · **Tech PWA T1 (accept jobs, GPS ping)** |
| 8 | Service ticket + SLA · Customer M4 · Tech T2 (stage updates, Google Maps link) |
| 9 | Renewal flow · Customer M5 · Tech T3 (photo close) |
| 10-12 | Dashboard, reports, LINE chat sync, polish |
| 13-15 | UAT, bug fix, load test, soft launch |
| 16-18 | Training, docs, production go-live |

---

## Project decisions (locked)

- **Photos**: ≤5 per ticket, ≤20 MB each (client-side resize)
- **Video**: ≤1 per ticket, ≤50 MB (multipart to S3)
- **GPS tracking**: every 30 seconds (admin-configurable via `Setting` table)
- **Chat**: via LINE OA, not custom WebSocket
- **Rating**: optional at ticket close
- **Navigation**: Google Maps deep link (not in-app route)
- **WMS**: mocked in Sprint 6, real integration when spec arrives
- **Staging**: none — test local → deploy prod

---

## Contributing

- Conventional Commits: `feat:`, `fix:`, `chore:`, `docs:`, `refactor:`
- Branch: `main` (prod) / `feat/<ticket>` / `fix/<ticket>`
- PR → `main` → CI green → squash merge

See `CONTRIBUTING.md` for details.

---

## License

Private — © NBA Sport Thailand
