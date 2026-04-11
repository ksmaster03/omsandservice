# Performance tests (JMeter)

Apache JMeter test plans for API load testing.

## Prerequisites
- JMeter installed: `brew install jmeter`
- API server running on `http://127.0.0.1:4100`

## Run smoke test
```bash
# From repo root
pnpm test:perf

# Or directly
jmeter -n -t perf/smoke.jmx -l perf/results.jtl -e -o perf/report
```

Flags:
- `-n` → non-GUI mode
- `-t <plan>` → test plan file
- `-l <file>` → raw JTL results (CSV)
- `-e` → generate HTML report after run
- `-o <dir>` → HTML report output directory

After run, open `perf/report/index.html` for the dashboard.

## What `smoke.jmx` does

Two thread groups, total ~250 requests against the API:

| Thread Group | Threads | Loops | Total | Endpoint | Assertions |
|---|---|---|---|---|---|
| Health | 20 | 10 | 200 | `GET /health` | HTTP 200 |
| Login | 10 | 5 | 50 | `POST /api/v1/auth/login` | HTTP 200 + body contains `accessToken` |

Purpose: sanity check that the Fastify API + JWT signing + Prisma + bcrypt + Postgres
chain can handle basic concurrency without errors. This is NOT a stress test —
for MVP capacity planning we'll add bigger plans later (e.g. ramp to 500 vusers).

## Regenerate artifacts
```bash
rm -rf perf/results.jtl perf/report
```
(Both are gitignored.)
