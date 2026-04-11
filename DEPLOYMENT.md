# NBA OMS — Production Deployment (AWS + Cloudflare)

## Topology

```
[Users]
   │
   ├── admin.oms.toptierdigital.online   → Cloudflare DNS (DNS only, grey)
   │                                       → CloudFront d1nf0nh2h7rb2o.cloudfront.net
   │                                       → S3 nba-oms-admin-bkk-871939031923
   │
   ├── app.oms.toptierdigital.online     → CloudFront d14f0z6fa8fcxt.cloudfront.net
   │                                       → S3 nba-oms-customer-bkk-871939031923
   │
   ├── tech.oms.toptierdigital.online    → CloudFront d1bgtatizx64wh.cloudfront.net
   │                                       → S3 nba-oms-tech-bkk-871939031923
   │
   └── api.oms.toptierdigital.online     → Cloudflare DNS (Proxied, orange)
                                           → EC2 43.208.110.128 (Elastic IP)
                                           → Nginx :80 → PM2 → Fastify :4100
                                           → RDS nba-oms-db (private VPC)
```

**Region**: `ap-southeast-7` (Bangkok) — all runtime resources
**ACM cert**: `us-east-1` (mandatory for CloudFront)

---

## Infrastructure Resources

| Resource | Region | Identifier | Purpose |
|---|---|---|---|
| RDS | ap-southeast-7 | `nba-oms-db` | Postgres 16.13, db.t3.micro, 20GB |
| EC2 | ap-southeast-7 | `i-042725003dbf09c79` | t3.micro Ubuntu 22.04, 2GB swap |
| Elastic IP | ap-southeast-7 | `43.208.110.128` | Static public IP for EC2 |
| Key pair | ap-southeast-7 | `nba-oms-ec2` | SSH key (saved `.secrets/nba-oms-ec2.pem`) |
| SG EC2 | ap-southeast-7 | `sg-04a1dd5eba213b0bd` | 22/80/443 public |
| SG RDS | ap-southeast-7 | `sg-0053f20f83cf9c019` | 5432 from EC2 SG only |
| S3 admin | ap-southeast-7 | `nba-oms-admin-bkk-871939031923` | OMS web static |
| S3 customer | ap-southeast-7 | `nba-oms-customer-bkk-871939031923` | Customer PWA static |
| S3 tech | ap-southeast-7 | `nba-oms-tech-bkk-871939031923` | Tech PWA static |
| S3 uploads | ap-southeast-7 | `nba-oms-uploads-bkk-871939031923` | User-uploaded files |
| CloudFront admin | global | `EW22H033B0GHZ` → `d1nf0nh2h7rb2o.cloudfront.net` | |
| CloudFront customer | global | `EIVLJYAZ3ZDA0` → `d14f0z6fa8fcxt.cloudfront.net` | |
| CloudFront tech | global | `E2HOM05NJJQZWU` → `d1bgtatizx64wh.cloudfront.net` | |
| CloudFront OAC | global | `E1MG1LPBHEZWMK` | S3 origin access control |
| ACM cert | us-east-1 | `arn:...certificate/45caaa48-de33-41a8-802f-6873c4d68cb4` | `*.oms.toptierdigital.online` + `oms.toptierdigital.online` |
| CloudWatch alarm | us-east-1 | `nba-oms-billing-30usd` | Billing alert at $30/month |
| SNS topic | us-east-1 | `billing-alerts` | Alarm notifications |

---

## 🔧 Cloudflare DNS Records to Add (**manually in dashboard**)

Go to **Cloudflare Dashboard → `toptierdigital.online` → DNS → Records → Add record**

### Step 1: ACM validation (add first, wait for issue)

| Type  | Name | Target | Proxy |
|---|---|---|---|
| `CNAME` | `_56f9a4261cf23bd31da3eb988262206a.oms` | `_f71b1da77b37d3501b1c39df887b9f74.jkddzztszm.acm-validations.aws` | **DNS only** (grey cloud) |

> This validates the wildcard cert. After ACM status = ISSUED, I'll attach it to all 3 CloudFront distributions. Keep the record — it's needed for auto-renewal.

### Step 2: App subdomains (can add now, will work after cert issues)

| Type | Name | Target | Proxy | TTL |
|---|---|---|---|---|
| `CNAME` | `admin.oms` | `d1nf0nh2h7rb2o.cloudfront.net` | **DNS only** (grey) | Auto |
| `CNAME` | `app.oms` | `d14f0z6fa8fcxt.cloudfront.net` | **DNS only** (grey) | Auto |
| `CNAME` | `tech.oms` | `d1bgtatizx64wh.cloudfront.net` | **DNS only** (grey) | Auto |

> CloudFront handles its own TLS via ACM cert. Must be **DNS only** (grey cloud) so Cloudflare doesn't intercept.

### Step 3: API subdomain (proxied = Cloudflare handles TLS)

| Type | Name | Target | Proxy | TTL |
|---|---|---|---|---|
| `A` | `api.oms` | `43.208.110.128` | **Proxied** (orange) | Auto |

> Cloudflare terminates SSL at the edge and forwards HTTP to EC2. Origin (Nginx) serves plain HTTP on :80.

**Important**: In Cloudflare → **SSL/TLS → Overview** → set encryption mode to **"Flexible"** OR **"Full"** (NOT "Full (strict)") so Cloudflare → origin works over HTTP.

---

## After DNS records are added

1. Wait ~2-5 min for Cloudflare to propagate + AWS to validate ACM
2. Tell me "DNS added" — I'll verify + attach custom domain to CloudFront automatically
3. CloudFront takes ~5-10 min to finish config update
4. Everything will be live on the 4 custom domains

---

## Manual deploy commands

### API (EC2)
```bash
# From local repo root
pnpm deploy --filter=@oms/api --prod --legacy /tmp/nba-api-deploy

rsync -az --delete -e "ssh -i .secrets/nba-oms-ec2.pem" \
  /tmp/nba-api-deploy/ ubuntu@43.208.110.128:/var/www/nba-oms/

ssh -i .secrets/nba-oms-ec2.pem ubuntu@43.208.110.128 \
  'cd /var/www/nba-oms && npx prisma@5.22.0 migrate deploy && pm2 reload nba-oms-api'
```

### Static apps (S3 + CloudFront invalidation)
```bash
VITE_API_BASE_URL=https://api.oms.toptierdigital.online/api/v1 \
  pnpm --filter @oms/web --filter @oms/customer --filter @oms/tech run build

for app in admin customer tech; do
  src_app=$app
  [ "$app" = "admin" ] && src_app=web
  aws s3 sync "apps/${src_app}/dist/" "s3://nba-oms-${app}-bkk-871939031923/" \
    --delete --profile nba-oms --region ap-southeast-7
done

# Invalidate CloudFront
aws cloudfront create-invalidation --distribution-id EW22H033B0GHZ --paths '/*' --profile nba-oms
aws cloudfront create-invalidation --distribution-id EIVLJYAZ3ZDA0 --paths '/*' --profile nba-oms
aws cloudfront create-invalidation --distribution-id E2HOM05NJJQZWU --paths '/*' --profile nba-oms
```

---

## Seeded credentials (rotate before pilot!)

```
admin@nbasport.local    / Nba@12345   (ADMIN)
sales1@nbasport.local   / Nba@12345
install1@nbasport.local / Nba@12345
service1@nbasport.local / Nba@12345
```

Customer PWA OTP: phone `0891234567`, any 6-digit code works in dev mode.

---

## Secrets locations (never commit)

```
.secrets/
├── db-password.txt              # RDS master password
├── nba-oms-ec2.pem              # EC2 SSH key
├── acm-cert-arn.txt             # ACM cert ARN
├── cloudfront-oac-id.txt        # OAC ID
├── cloudfront-dists.txt         # Distribution IDs
├── bootstrap-ec2.sh             # EC2 bootstrap script
└── ecosystem.config.cjs         # PM2 config
```

`.secrets/` is `.gitignore`d.
