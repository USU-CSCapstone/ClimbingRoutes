# Starts the capture worker (worker.mjs) whenever this Windows account logs in, and now.
# It runs in the logged-in desktop session, where RealityScan works; started over SSH or
# as a service, RealityScan silently does nothing. The worker's window opens minimized.
#
# Usage, in PowerShell from scripts\captures (over SSH is fine; the task itself runs on the desktop):
#   .\install-task.ps1              install, or update, and start it
#   .\install-task.ps1 -Uninstall   stop it and remove it
param([switch]$Uninstall)
$ErrorActionPreference = "Stop"

$TaskName = "ClimbingRoutes capture worker"

if ($Uninstall) {
  if (Get-ScheduledTask -TaskName $TaskName -ErrorAction SilentlyContinue) {
    Stop-ScheduledTask -TaskName $TaskName
    Unregister-ScheduledTask -TaskName $TaskName -Confirm:$false
    Write-Host "Removed '$TaskName'."
  } else {
    Write-Host "'$TaskName' isn't installed."
  }
  return
}

$Here = $PSScriptRoot
$Node = (Get-Command node -ErrorAction SilentlyContinue).Source
if (-not $Node) { throw "node not found. Install Node.js first." }
if (-not (Test-Path "$Here\.env")) { throw "Missing $Here\.env. Copy .env.example and add the secret key first." }
if (-not (Test-Path "$Here\node_modules")) { throw "Run npm install in $Here first." }

$command = "Set-Location -LiteralPath '$Here'; & '$Node' --env-file=.env worker.mjs"
$action = New-ScheduledTaskAction -Execute "powershell.exe" `
  -Argument "-NoProfile -ExecutionPolicy Bypass -WindowStyle Minimized -Command `"$command`""
$trigger = New-ScheduledTaskTrigger -AtLogOn -User $env:USERNAME
# Interactive: only while this account is logged in, in its desktop session.
$principal = New-ScheduledTaskPrincipal -UserId $env:USERNAME -LogonType Interactive
# No time limit (Windows stops tasks after 3 days by default), restart if it crashes, and
# never a second copy alongside the first.
$settings = New-ScheduledTaskSettingsSet -ExecutionTimeLimit ([TimeSpan]::Zero) `
  -RestartCount 999 -RestartInterval (New-TimeSpan -Minutes 1) `
  -MultipleInstances IgnoreNew -AllowStartIfOnBatteries -DontStopIfGoingOnBatteries -StartWhenAvailable

Register-ScheduledTask -TaskName $TaskName -Action $action -Trigger $trigger -Principal $principal `
  -Settings $settings -Description "Turns uploaded wall photos into models for review." -Force | Out-Null
Start-ScheduledTask -TaskName $TaskName
Write-Host "Installed and started '$TaskName'. It starts again whenever $env:USERNAME logs in."
Write-Host "Its log: the worker window, or worker.log in the DATA_DIR folder from .env."
