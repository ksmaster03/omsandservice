# Contributing

## Branches
- `main` — production-ready, deploys automatically
- `feat/<short-desc>` — new features
- `fix/<short-desc>` — bug fixes
- `chore/<short-desc>` — tooling/infra/non-code changes

## Commits — Conventional Commits
```
feat(web): add customer detail page
fix(api): handle null quote discount
chore(deps): bump prisma to 5.22
docs: update sprint roadmap
refactor(shared): extract ticket schema
```

Scopes: `api`, `web`, `customer`, `tech`, `shared`, `config`, `db`, `ci`, `deps`

## Pull requests
1. Rebase on latest `main`
2. `pnpm lint && pnpm typecheck && pnpm build` must all pass locally
3. Update `prisma/seed.ts` if schema changes
4. Open PR → wait for CI green → squash merge

## Code style
- Prettier on save (or `pnpm format`)
- ESLint on commit (via Husky pre-commit hook)
- Strict TypeScript — no `any` without a justification comment

## Database changes
1. Edit `apps/api/prisma/schema.prisma`
2. `pnpm db:migrate` — creates migration under `apps/api/prisma/migrations/`
3. Commit migration files along with schema change
4. `pnpm db:generate` to refresh Prisma Client types

## Env vars
- Never commit `.env` files
- Update `.env.example` in the relevant app when adding a new var
- Document what the var is for in a comment above it
