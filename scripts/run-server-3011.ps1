$ErrorActionPreference = 'Stop'

$ProjectRoot = Resolve-Path (Join-Path $PSScriptRoot '..')
$LogDir = Join-Path $ProjectRoot 'logs'
$LogFile = Join-Path $LogDir 'server-3011.log'
$HealthUrl = 'http://127.0.0.1:3011/api/health'

New-Item -ItemType Directory -Force -Path $LogDir | Out-Null

function Test-MineralServer {
    try {
        $response = Invoke-WebRequest -UseBasicParsing -Uri $HealthUrl -TimeoutSec 3
        return $response.StatusCode -eq 200 -and $response.Content -match '"ok"\s*:\s*true'
    } catch {
        return $false
    }
}

while ($true) {
    if (Test-MineralServer) {
        Start-Sleep -Seconds 15
        continue
    }

    Add-Content -Path $LogFile -Value "[$(Get-Date -Format o)] Starting mineral collection server on port 3011"
    Push-Location $ProjectRoot
    try {
        & node server.js *>> $LogFile
    } catch {
        Add-Content -Path $LogFile -Value "[$(Get-Date -Format o)] Server process failed: $($_.Exception.Message)"
    } finally {
        Pop-Location
    }

    Start-Sleep -Seconds 5
}
