# NBA OMS — Production Deployment (AWS + Cloudflare Tunnel)

## 🌍 Live URLs

| Service | URL |
|---|---|
| **OMS Web (staff)** | https://nba-admin.toptierdigital.space |
| **Customer PWA** | https://nba-app.toptierdigital.space |
| **Service Tech PWA** | https://nba-tech.toptierdigital.space |
| **API** | https://nba-api.toptierdigital.space |

All 4 URLs terminate TLS at Cloudflare edge and route via Cloudflare Tunnel → EC2.

## Architecture

```
[Users]
    │ HTTPS
    ▼
[Cloudflare Edge]
    │ Tunnel (persistent outbound QUIC)
    ▼
[cloudflared systemd service on EC2 43.208.110.128]
    │ HTTP localhost
    ▼
[Nginx — multi-host routing via server_name]
    ├── nba-api.*   → 127.0.0.1:4100  (Fastify via PM2)
    ├── nba-admin.* → /var/www/nba-oms-admin/     (static SPA)
    ├── nba-app.*   → /var/www/nba-oms-customer/  (static SPA)
    └── nba-tech.*  → /var/www/nba-oms-tech/      (static SPA)
         │
         └─ API calls ──→ RDS Postgres 16.13 (private VPC)
```

**Why tunnel instead of public IP + CloudFront/ACM**:
- No public port exposure on EC2 (only SSH 22 open)
- Cloudflare edge handles TLS + DDoS + rate limit
- No DNS delegation needed — domain NS can live anywhere
- Tunnel auto-creates DNS CNAMEs in zone (requires zone on Cloudflare)
- No separate CDN/cert infrastructure to maintain

---

## Infrastructure inventory (current)

| Resource | Region | Identifier |
|---|---|---|
| RDS Postgres 16.13 | ap-southeast-7 | `nba-oms-db` — db.t3.micro, 20GB gp2, private VPC |
| EC2 t3.micro Ubuntu 22.04 | ap-southeast-7 | `i-042725003dbf09c79` |
| Elastic IP | ap-southeast-7 | `43.208.110.128` (not publicly reachable, only cloudflared + SSH) |
| EC2 Key pair | ap-southeast-7 | `nba-oms-ec2` → `.secrets/nba-oms-ec2.pem` |
| Security Group EC2 | ap-southeast-7 | `sg-04a1dd5eba213b0bd` — only port 22 open |
| Security Group RDS | ap-southeast-7 | `sg-0053f20f83cf9c019` — 5432 from EC2 SG only |
| S3 uploads bucket | ap-southeast-7 | `nba-oms-uploads-bkk-871939031923` |
| cloudflared | on EC2 | systemd service, tunnel ID `447dcfa3-d481-45e0-bc87-54099cc3ff96` |
| Cloudflare Tunnel | global | `nba-oms` (zone: `toptierdigital.space`) |
| CloudWatch alarm | us-east-1 | `nba-oms-billing-30usd` |
| SNS topic | us-east-1 | `billing-alerts` |

**Removed during Sprint 6 cleanup** (was for the `.online` CloudFront approach that didn't work because NS wasn't delegated to Cloudflare):
- ~~3x CloudFront distributions~~
- ~~3x S3 static buckets (admin/customer/tech)~~
- ~~ACM wildcard cert (us-east-1)~~
- ~~Origin Access Control~~
- ~~Singapore leftover security groups~~

---

## Seeded credentials (rotate before pilot!)

```
admin@nbasport.local    / Nba@12345   (ADMIN)
sales1@nbasport.local   / Nba@12345
install1@nbasport.local / Nba@12345
service1@nbasport.local / Nba@12345
```

**Customer PWA** (DEV OTP bypass):
- Phone: `0891234567`
- Code: any 6 digits (e.g. `000000`)

---

## Deploy commands

### Deploy API changes
```bash
# Build
pnpm deploy --filter=@oms/api --prod --legacy /tmp/nba-api-deploy

# Rsync to EC2
rsync -az --delete -e "ssh -i .secrets/nba-oms-ec2.pem" \
  /tmp/nba-api-deploy/ ubuntu@43.208.110.128:/var/www/nba-oms/

# Generate Prisma client + migrate + restart PM2
ssh -i .secrets/nba-oms-ec2.pem ubuntu@43.208.110.128 '
  cd /var/www/nba-oms
  PUPPETEER_SKIP_DOWNLOAD=true npx prisma@5.22.0 generate
  npx prisma@5.22.0 migrate deploy
  pm2 restart nba-oms-api --update-env
'
```

### Deploy static app changes
```bash
# Build all 3 with prod API URL
VITE_API_BASE_URL=https://nba-api.toptierdigital.space/api/v1 \
  pnpm --filter @oms/web --filter @oms/customer --filter @oms/tech run build

# Rsync each to its /var/www dir on EC2
rsync -az --delete -e "ssh -i .secrets/nba-oms-ec2.pem" \
  apps/web/dist/ ubuntu@43.208.110.128:/var/www/nba-oms-admin/
rsync -az --delete -e "ssh -i .secrets/nba-oms-ec2.pem" \
  apps/customer/dist/ ubuntu@43.208.110.128:/var/www/nba-oms-customer/
rsync -az --delete -e "ssh -i .secrets/nba-oms-ec2.pem" \
  apps/tech/dist/ ubuntu@43.208.110.128:/var/www/nba-oms-tech/
```

No CDN invalidation needed — Nginx serves directly with proper Cache-Control headers.

### SSH access
```bash
ssh -i .secrets/nba-oms-ec2.pem ubuntu@43.208.110.128

# Service checks
sudo systemctl status cloudflared    # Cloudflare tunnel
sudo systemctl status nginx          # reverse proxy
pm2 status                           # Fastify API
pm2 logs nba-oms-api --lines 50
```

### RDS console access
```bash
# From EC2 (it's the only machine that can reach RDS)
DB_PASS=$(cat .secrets/db-password.txt)
ssh -i .secrets/nba-oms-ec2.pem ubuntu@43.208.110.128 \
  "PGPASSWORD='$DB_PASS' psql -h nba-oms-db.c3aikw4c6md9.ap-southeast-7.rds.amazonaws.com -U nba_admin -d nba_oms"
```

---

## Cloudflare Tunnel — Public Hostname routes

Managed via **Cloudflare dashboard → Zero Trust → Networks → Tunnels → nba-oms → Published application routes**.

| Hostname | Service | Purpose |
|---|---|---|
| `nba-api.toptierdigital.space` | `http://localhost:80` | API (via Nginx → Fastify) |
| `nba-admin.toptierdigital.space` | `http://localhost:80` | OMS web static |
| `nba-app.toptierdigital.space` | `http://localhost:80` | Customer PWA static |
| `nba-tech.toptierdigital.space` | `http://localhost:80` | Tech PWA static |

All point to the same `localhost:80` — Nginx routes by `Host` header.

---

## Secrets (all in `.gitignore`d `.secrets/`)

```
.secrets/
├── db-password.txt              # RDS master password
├── nba-oms-ec2.pem              # EC2 SSH key
├── cloudflared-token.txt        # Tunnel token (rotate periodically)
├── bootstrap-ec2.sh             # EC2 bootstrap script (reference)
├── ecosystem.config.cjs         # PM2 config
└── nginx-nba-oms.conf           # Nginx config (reference)
```

`.secrets/` is `.gitignore`d.

---

## 🧹 Manual cleanup user should do in Cloudflare

The old DNS records in `toptierdigital.online` zone are no longer needed (they were for the abandoned CloudFront approach). Please delete these 5 entries in **Cloudflare → toptierdigital.online → DNS → Records**:

| Type  | Name | Action |
|---|---|---|
| `CNAME` | `_56f9a4261cf23bd31da3eb988262206a.oms` | Delete (was ACM validation) |
| `CNAME` | `admin.oms` | Delete (was → CloudFront) |
| `CNAME` | `app.oms` | Delete (was → CloudFront) |
| `CNAME` | `tech.oms` | Delete (was → CloudFront) |
| `A` | `api.oms` | Delete (was → EC2 direct) |

No urgency — they resolve to nothing dangerous. Just cleanup.
