"""Phase 0 verified locally: build clean (0/0), xUnit smoke test passed.
   Move Phase 0 → Closed."""
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


# Phase 0 (#1040) → Closed — foundation verified
patch(1040, [
    {'op': 'add', 'path': '/fields/System.State', 'value': 'Closed'},
    {
        'op': 'add',
        'path': '/fields/System.History',
        'value': (
            '<b>Phase 0 ปิดงาน — Foundation verified locally</b> (commit a604a39)<br><br>'
            'ผลทดสอบบนเครื่อง dev:<ul>'
            '<li>.NET 8 SDK 8.0.420 ติดตั้งผ่าน winget</li>'
            '<li>dotnet-ef tools 8.0.10 ติดตั้งสำเร็จ</li>'
            '<li>dotnet restore — 6/6 projects สำเร็จ</li>'
            '<li>dotnet build — 0 warnings, 0 errors ทุก project</li>'
            '<li>dotnet test — 1/1 passed (HealthEndpointTests.Ping_ReturnsOk)</li>'
            '<li>WebApplicationFactory&lt;Program&gt; integration host ขึ้นใช้งานได้</li>'
            '<li>/api/v1/ping ตอบ 200 OK ด้วย { ok: true } envelope</li></ul>'
            '<b>เสร็จเพิ่ม:</b><ul>'
            '<li>เพิ่ม JWT packages, HealthChecks EF, suppress noisy analyzers</li></ul>'
            '<b>เหลือสำหรับขั้นต่อ (อยู่ใน Phase 6 cutover preparation):</b><ul>'
            '<li>dotnet ef dbcontext scaffold เมื่อมี Postgres ขึ้นกับ schema จริง</li>'
            '<li>CI run บน GitHub Actions (workflow committed แล้ว — รัน auto on next push)</li></ul>'
        ),
    },
])
