"""Update migration Epic + Phase 0 status — scaffold committed but
   compile/test verification pending .NET SDK install on dev machine."""
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


# Epic 1039 → Active (in progress)
patch(1039, [{'op': 'add', 'path': '/fields/System.State', 'value': 'Active'}])

# Phase 0 (#1040) → Active with progress note
patch(1040, [
    {'op': 'add', 'path': '/fields/System.State', 'value': 'Active'},
    {
        'op': 'add',
        'path': '/fields/System.History',
        'value': (
            '<b>Phase 0 scaffold committed</b> (commit 3ac7751, branch feat/dotnet-api-migration)<br><br>'
            'เสร็จ:<ul>'
            '<li>Solution + 6 โปรเจกต์ (Api, Application, Domain, Infrastructure, Tests, Gateway)</li>'
            '<li>Clean Architecture, net8.0, FluentValidation, Serilog, JwtBearer, SignalR</li>'
            '<li>YARP gateway + Docker compose (parallel-run topology)</li>'
            '<li>EF Core + Npgsql wired (DbContext skeleton)</li>'
            '<li>ApiResponse envelope ตรงกับ Fastify { ok, data, error }</li>'
            '<li>Reference module: Customers (DTO/Validator/Service/Controller)</li>'
            '<li>Reference auth: Login + OTP stubs, BCrypt, JwtTokenService</li>'
            '<li>Health endpoints + xUnit smoke test</li></ul>'
            '<b>เหลือ (ทีมต้องลง .NET SDK บนเครื่อง):</b><ul>'
            '<li>dotnet restore + build verify</li>'
            '<li>dotnet ef dbcontext scaffold (60 entities จาก existing PostgreSQL)</li>'
            '<li>รัน health endpoint ทดสอบ DB connectivity</li>'
            '<li>เพิ่ม CI pipeline build + test</li></ul>'
        ),
    },
])
