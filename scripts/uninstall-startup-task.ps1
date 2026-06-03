$ErrorActionPreference = 'Stop'

$TaskName = 'MineralCollectionSite3011'
$task = Get-ScheduledTask -TaskName $TaskName -ErrorAction SilentlyContinue

if ($task) {
    Stop-ScheduledTask -TaskName $TaskName -ErrorAction SilentlyContinue
    Unregister-ScheduledTask -TaskName $TaskName -Confirm:$false
    Write-Output "Removed scheduled task '$TaskName'."
} else {
    Write-Output "Scheduled task '$TaskName' was not installed."
}

$StartupCmd = Join-Path $env:APPDATA 'Microsoft\Windows\Start Menu\Programs\Startup\MineralCollectionSite3011.cmd'
if (Test-Path $StartupCmd) {
    Remove-Item -Path $StartupCmd -Force
    Write-Output "Removed Startup launcher: $StartupCmd"
}
