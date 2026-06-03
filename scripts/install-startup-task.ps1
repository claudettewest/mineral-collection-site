$ErrorActionPreference = 'Stop'

$TaskName = 'MineralCollectionSite3011'
$ProjectRoot = Resolve-Path (Join-Path $PSScriptRoot '..')
$Runner = Join-Path $ProjectRoot 'scripts\run-server-3011.ps1'

if (-not (Test-Path $Runner)) {
    throw "Runner script not found: $Runner"
}

$Action = New-ScheduledTaskAction `
    -Execute 'powershell.exe' `
    -Argument "-NoProfile -ExecutionPolicy Bypass -WindowStyle Hidden -File `"$Runner`""
$Trigger = New-ScheduledTaskTrigger -AtLogOn
$Settings = New-ScheduledTaskSettingsSet `
    -AllowStartIfOnBatteries `
    -DontStopIfGoingOnBatteries `
    -ExecutionTimeLimit (New-TimeSpan -Days 365)

try {
    Register-ScheduledTask `
        -TaskName $TaskName `
        -Action $Action `
        -Trigger $Trigger `
        -Settings $Settings `
        -Description 'Keeps the mineral collection site running on port 3011.' `
        -Force | Out-Null

    Start-ScheduledTask -TaskName $TaskName
    Write-Output "Installed and started scheduled task '$TaskName'."
} catch {
    $StartupDir = Join-Path $env:APPDATA 'Microsoft\Windows\Start Menu\Programs\Startup'
    $StartupCmd = Join-Path $StartupDir 'MineralCollectionSite3011.cmd'
    $Command = "@echo off`r`npowershell.exe -NoProfile -ExecutionPolicy Bypass -WindowStyle Hidden -File `"$Runner`"`r`n"

    New-Item -ItemType Directory -Force -Path $StartupDir | Out-Null
    Set-Content -Path $StartupCmd -Value $Command -Encoding ASCII
    Start-Process -FilePath 'powershell.exe' -ArgumentList @('-NoProfile', '-ExecutionPolicy', 'Bypass', '-WindowStyle', 'Hidden', '-File', $Runner) -WindowStyle Hidden
    Write-Output "Scheduled task registration failed, so installed Startup launcher instead: $StartupCmd"
}

Write-Output "App URL: http://localhost:3011"
