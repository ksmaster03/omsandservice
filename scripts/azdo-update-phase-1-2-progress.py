"""Update Phase 1 + Phase 2 progress in Azure DevOps."""
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


def patch(wid, ops):
    url = f'{ORG}/{PROJ}/_apis/wit/workitems/{wid}?api-version=7.1'
    body = json.dumps(ops).encode('utf-8')
    req = urllib.request.Request(url, data=body, method='PATCH')
    req.add_header('Authorization', 'Basic ' + token)
    req.add_header('Content-Type', 'application/json-patch+json')
    try:
        with urllib.request.urlopen(req) as r:
            d = json.loads(r.read())
            print(f'OK #{wid} [{d["fields"]["System.State"]}] {d["fields"]["System.Title"][:65]}')
    except urllib.error.HTTPError as e:
        print(f'ERR #{wid}: {e.code} {e.read().decode()[:250]}')


# Phase 1 (#1041) → Active with progress note
patch(1041, [
    {'op': 'add', 'path': '/fields/System.State', 'value': 'Active'},
    {
        'op': 'add',
        'path': '/fields/System.History',
        'value': (
            '<b>Phase 1 reference scaffold committed</b> (commit 324822e)<br><br>'
            'เสร็จ:<ul>'
            '<li>JWT bearer wired in Program.cs (staff/customer/admin policies)</li>'
            '<li>BCrypt password hasher</li>'
            '<li>JwtTokenService — staff + customer token signing/validation</li>'
            '<li>ICurrentUser + CurrentUser accessor (claim-based)</li>'
            '<li>FluentValidation auto-binding ผ่าน AddValidatorsFromAssemblyContaining</li>'
            '<li>IFileStorageService + LocalFileStorageService (mime allowlist ตาม lib/storage.ts)</li>'
            '<li>Serilog + ProblemDetails-style ApiResponse middleware</li>'
            '<li>AuthController + CustomerAuthController (login + OTP stubs)</li></ul>'
            '<b>เหลือ:</b><ul>'
            '<li>OTP code persistence + SMS sender integration (ISmsSender)</li>'
            '<li>NSwag client generation pipeline → frontend TS types</li>'
            '<li>Rate limiting config tuning (AspNetCoreRateLimit)</li>'
            '<li>Dev/prod secret loading (user-secrets / Key Vault)</li></ul>'
        ),
    },
])

# Phase 2 (#1042) → Active with progress note
patch(1042, [
    {'op': 'add', 'path': '/fields/System.State', 'value': 'Active'},
    {
        'op': 'add',
        'path': '/fields/System.History',
        'value': (
            '<b>Phase 2 master-data starter committed</b> (commit 324822e)<br><br>'
            'เสร็จ (3/6 modules ใช้ pattern เดียวกัน):<ul>'
            '<li>Customers — DTO/Validator/Service/Controller (Phase 0 reference)</li>'
            '<li>Products — DTO/Validator/Service/Controller</li>'
            '<li>Users — รวม change-password endpoint (Admin policy)</li>'
            '<li>Common PageQuery / PagedResult records</li>'
            '<li>EF Core LINQ search filters พร้อม pagination</li></ul>'
            '<b>เหลือ:</b><ul>'
            '<li>Spare Parts module</li>'
            '<li>Settings module</li>'
            '<li>Health module (มีแล้วบน Phase 0)</li>'
            '<li>Smoke E2E parity tests เทียบ Node เดิมต่อ module</li>'
            '<li>Gateway routing สลับ /api/v1/internal/customers, /products, /users → .NET</li></ul>'
        ),
    },
])
