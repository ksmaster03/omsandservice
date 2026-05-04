"""Create Epic + 8 Phase Tasks for .NET migration in Azure DevOps."""
import urllib.request
import urllib.error
import json
import base64
import io
import sys

sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8')

PAT = sys.argv[1] if len(sys.argv) > 1 else ''
ORG = 'https://dev.azure.com/ToptierDigital'
PROJ = 'TD.Order_And_Service'
token = base64.b64encode((':' + PAT).encode()).decode()


def create(wtype, fields):
    url = f'{ORG}/{PROJ}/_apis/wit/workitems/${wtype}?api-version=7.1'
    ops = [{'op': 'add', 'path': f'/fields/{k}', 'value': v} for k, v in fields.items()]
    body = json.dumps(ops).encode('utf-8')
    req = urllib.request.Request(url, data=body, method='POST')
    req.add_header('Authorization', 'Basic ' + token)
    req.add_header('Content-Type', 'application/json-patch+json')
    try:
        with urllib.request.urlopen(req) as r:
            return json.loads(r.read())['id']
    except urllib.error.HTTPError as e:
        print(f'ERR create {wtype}: {e.code} {e.read().decode()[:300]}')
        return None


def link_parent(child_id, parent_id):
    url = f'{ORG}/{PROJ}/_apis/wit/workitems/{child_id}?api-version=7.1'
    ops = [{
        'op': 'add',
        'path': '/relations/-',
        'value': {
            'rel': 'System.LinkTypes.Hierarchy-Reverse',
            'url': f'{ORG}/_apis/wit/workItems/{parent_id}',
        },
    }]
    body = json.dumps(ops).encode('utf-8')
    req = urllib.request.Request(url, data=body, method='PATCH')
    req.add_header('Authorization', 'Basic ' + token)
    req.add_header('Content-Type', 'application/json-patch+json')
    try:
        with urllib.request.urlopen(req) as r:
            return True
    except urllib.error.HTTPError as e:
        print(f'LINK ERR: {e.code} {e.read().decode()[:200]}')
        return False


# ─── Create Epic ───
epic_id = create('Epic', {
    'System.Title': '[Migration] แปลง Backend API จาก Node.js เป็น .NET Core 8',
    'System.Description': (
        '<b>เป้าหมาย:</b> แปลง apps/api (Fastify + Prisma + TypeScript) เป็น ASP.NET Core 8 + EF Core '
        'โดยคง PostgreSQL schema เดิมทั้งหมด<br><br>'
        '<b>หลักการ:</b><ul>'
        '<li>เก็บ DB schema เดิม (60 models) — EF Core scaffold เข้าตาราง existing</li>'
        '<li>Strangler Fig pattern — ตั้ง Reverse Proxy (YARP) ค่อย ๆ ย้าย route ทีละกลุ่ม</li>'
        '<li>Frontend (Web Admin / Tech PWA / Customer PWA) ไม่ต้องแก้</li>'
        '<li>OpenAPI/Swagger gen TypeScript types ส่งให้ frontend</li></ul>'
        '<b>Scope:</b><ul>'
        '<li>26 route modules, ~150+ endpoints</li>'
        '<li>JWT staff + OTP customer, File upload, WebSocket → SignalR, PDF</li>'
        '<li>WMS integration, Reports/Analytics</li></ul>'
        '<b>Branch:</b> feat/dotnet-api-migration<br>'
        '<b>Timeline ประเมิน:</b> 15 สัปดาห์ (~3.5–4 เดือน)'
    ),
    'System.Tags': 'Migration; .NET; ASP.NET Core; EF Core; Backend',
})
print(f'Epic created: #{epic_id}')

phases = [
    (
        '[Phase 0] Foundation — ตั้งโครง .NET + เชื่อม DB',
        '<b>เป้า:</b> ตั้งโปรเจกต์ ASP.NET Core 8 และเชื่อม PostgreSQL<br><br>'
        '<b>งาน:</b><ul>'
        '<li>สร้าง apps/api-dotnet/ (ASP.NET Core 8 Web API)</li>'
        '<li>ติดตั้ง EF Core 8 + Npgsql provider</li>'
        '<li>Scaffold DbContext จาก existing DB</li>'
        '<li>ตั้ง YARP Reverse Proxy เป็น gateway</li>'
        '<li>Docker compose: api-node, api-dotnet, postgres, gateway</li>'
        '<li>CI: pipeline build .NET</li>'
        '<li>endpoint /api/health</li></ul>'
        '<b>Deliverable:</b> Health check ผ่าน, Entity 60 ตัว scaffold ครบ<br>'
        '<b>เวลา:</b> 1 สัปดาห์',
    ),
    (
        '[Phase 1] Cross-cutting — Auth, Validation, Storage, Logging',
        '<b>เป้า:</b> สร้างของใช้ร่วม<br><br>'
        '<b>งาน:</b><ul>'
        '<li>JWT Auth — staff + Customer OTP → ASP.NET Core JwtBearer</li>'
        '<li>Validation — แทน Zod ด้วย FluentValidation</li>'
        '<li>Storage — IFileStorageService (multipart, image/PDF)</li>'
        '<li>Logging — Serilog</li>'
        '<li>Error handling — ProblemDetails (RFC 7807)</li>'
        '<li>Plugins → ASP.NET middleware</li>'
        '<li>Generate C# DTO จาก packages/shared (NSwag)</li></ul>'
        '<b>Deliverable:</b> Login/upload ทำงาน, JWT compatible<br>'
        '<b>เวลา:</b> 1–2 สัปดาห์',
    ),
    (
        '[Phase 2] Master Data — Customers, Products, Users, Spare Parts',
        '<b>เป้า:</b> ย้ายโมดูลความเสี่ยงต่ำก่อน<br><br>'
        '<b>โมดูล:</b> customers, products, users, spare-parts, settings, health<br><br>'
        '<b>แต่ละโมดูล:</b><ul>'
        '<li>Controller + Service + Repository + DTO + Validator</li>'
        '<li>xUnit + Testcontainers (PostgreSQL)</li>'
        '<li>Smoke E2E parity test เทียบ Node เดิม</li>'
        '<li>Gateway routing สลับ .NET เมื่อผ่าน</li></ul>'
        '<b>เวลา:</b> 1–2 สัปดาห์',
    ),
    (
        '[Phase 3] Sales Flow — Leads, Quotations, Sales Orders, Installations',
        '<b>เป้า:</b> ย้าย Sales pipeline<br><br>'
        '<b>โมดูล:</b> leads, quotations, sales-orders, installations<br><br>'
        '<b>จุดระวัง:</b><ul>'
        '<li>State machine ของ Lead/Quote/SO</li>'
        '<li>PDF generation — QuestPDF (หรือคง Node microservice)</li>'
        '<li>Drag-drop Kanban API contract</li></ul>'
        '<b>เวลา:</b> 2 สัปดาห์',
    ),
    (
        '[Phase 4] After-Sales Core — Tickets, PM, Assets, RMA, Tech, Renewals',
        '<b>เป้า:</b> ย้ายระบบ After-Sales ทั้งหมด — ซับซ้อนสูงสุด<br><br>'
        '<b>โมดูล:</b> assets, pm-schedules, service-tickets, tech, renewals, rmas, service-agreements<br><br>'
        '<b>จุดระวัง:</b><ul>'
        '<li>WebSocket → SignalR แทน socket.io</li>'
        '<li>GPS tracking + state transitions</li>'
        '<li>Tech PWA เปลี่ยน client เป็น @microsoft/signalr</li></ul>'
        '<b>เวลา:</b> 2–3 สัปดาห์',
    ),
    (
        '[Phase 5] Customer Portal — Customer Auth, Data, 360 View',
        '<b>เป้า:</b> ย้าย Customer PWA backend<br><br>'
        '<b>โมดูล:</b> customer-auth, customer-data, customer-360<br><br>'
        '<b>จุดระวัง:</b><ul>'
        '<li>OTP flow</li>'
        '<li>Customer-scoped queries (RLS pattern)</li>'
        '<li>Multipart upload รูป Ticket</li></ul>'
        '<b>เวลา:</b> 1–2 สัปดาห์',
    ),
    (
        '[Phase 6] Integration & Reports — WMS, Reports, Feedback, Stock',
        '<b>เป้า:</b> ย้าย integration และ analytics<br><br>'
        '<b>โมดูล:</b> wms (24 endpoints — ใหญ่สุด), reports, feedback, stock<br><br>'
        '<b>จุดระวัง:</b><ul>'
        '<li>WMS bi-directional sync</li>'
        '<li>Reports aggregation — Dapper/raw SQL สำหรับ query หนัก</li>'
        '<li>Feedback attachments (image/PDF max 5MB × 3)</li></ul>'
        '<b>เวลา:</b> 2 สัปดาห์',
    ),
    (
        '[Phase 7] Cutover & Cleanup — เปลี่ยน Default Gateway, Decommission Node',
        '<b>เป้า:</b> ตัดระบบเก่าทิ้ง<br><br>'
        '<b>งาน:</b><ul>'
        '<li>Gateway default → .NET, Node fallback</li>'
        '<li>Parallel 1–2 สัปดาห์ ดู error/latency</li>'
        '<li>Decommission Node API — archive</li>'
        '<li>Migration ownership: Prisma → EF Core</li>'
        '<li>Update DEPLOYMENT.md + CI/CD</li></ul>'
        '<b>Deliverable:</b> Production ใช้ .NET 100% — Node decommissioned<br>'
        '<b>เวลา:</b> 1 สัปดาห์',
    ),
]

phase_ids = []
for title, desc in phases:
    pid = create('Task', {
        'System.Title': title,
        'System.Description': desc,
        'System.Tags': 'Migration; .NET; ' + title.split(']')[0].lstrip('['),
    })
    if pid:
        link_parent(pid, epic_id)
        phase_ids.append(pid)
        print(f'  Task #{pid}: {title[:65]}')

print(f'\nDone! Epic #{epic_id} + {len(phase_ids)} Tasks')
print(f'Epic URL: {ORG}/{PROJ}/_workitems/edit/{epic_id}')
