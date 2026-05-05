#!/usr/bin/env pwsh
<#
.SYNOPSIS
  Re-scaffold the EF Core DbContext from the live PostgreSQL DB.
.DESCRIPTION
  Run after a Prisma migration to update the C# entity classes.
  Skips Postgres native enum columns — those stay attached via
  partial-class extensions in EntityEnumExtensions.cs.
.EXAMPLE
  ./scaffold-db.ps1
  ./scaffold-db.ps1 -ConnectionString "Host=prod;..."
#>
param(
    [string]$ConnectionString = "Host=localhost;Port=5432;Database=oms_dev;Username=postgres;Password=postgres"
)

$ErrorActionPreference = 'Stop'
Push-Location (Join-Path $PSScriptRoot '..' 'src' 'TD.OmsService.Infrastructure')
try {
    Write-Host "Scaffolding from $ConnectionString..." -ForegroundColor Cyan
    dotnet ef dbcontext scaffold $ConnectionString Npgsql.EntityFrameworkCore.PostgreSQL `
      --output-dir Persistence/Generated `
      --context-dir Persistence/Generated `
      --context AppDbContext `
      --no-onconfiguring --force `
      --startup-project ../TD.OmsService.Api/TD.OmsService.Api.csproj

    # The scaffold drops AppDbContext into Persistence/Generated; relocate to
    # Persistence/ and fix the namespace so existing code keeps compiling.
    $genCtx = 'Persistence/Generated/AppDbContext.cs'
    $finalCtx = 'Persistence/AppDbContext.cs'
    if (Test-Path $genCtx) {
        $content = Get-Content $genCtx -Raw
        $content = $content -replace 'namespace TD\.OmsService\.Infrastructure\.Persistence\.Generated;', `
                                     "using TD.OmsService.Infrastructure.Persistence.Generated;`n`nnamespace TD.OmsService.Infrastructure.Persistence;"
        Set-Content -Path $finalCtx -Value $content -Encoding utf8
        Remove-Item $genCtx
        Write-Host "Moved AppDbContext to $finalCtx" -ForegroundColor Green
    }
    Write-Host "Scaffold complete." -ForegroundColor Green
}
finally {
    Pop-Location
}
