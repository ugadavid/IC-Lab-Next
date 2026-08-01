param(
  [Parameter(Mandatory = $true)][string]$DescriptorPath,
  [Parameter(Mandatory = $true)][string]$ServiceId
)

$ErrorActionPreference = "Stop"

function Write-JsonAtomic {
  param([string]$Path, [object]$Value)
  $temporaryPath = "$Path.$PID.tmp"
  $json = $Value | ConvertTo-Json -Depth 12
  [System.IO.File]::WriteAllText($temporaryPath, $json, (New-Object System.Text.UTF8Encoding($false)))
  Move-Item -LiteralPath $temporaryPath -Destination $Path -Force
}

function ConvertTo-NativeArgument {
  param([string]$Value)
  if ($Value -notmatch '[\s"]') { return $Value }
  return '"' + ($Value -replace '(\\*)"', '$1$1\"' -replace '(\\+)$', '$1$1') + '"'
}

$descriptor = Get-Content -LiteralPath $DescriptorPath -Raw | ConvertFrom-Json
$service = @($descriptor.services | Where-Object { $_.id -eq $ServiceId })[0]
if (-not $service) { throw "Service inconnu : $ServiceId" }

$hostLog = [string]$service.logPath
$hostLogDirectory = Split-Path -Parent $hostLog
if (-not (Test-Path -LiteralPath $hostLogDirectory)) {
  New-Item -ItemType Directory -Path $hostLogDirectory -Force | Out-Null
}

try { Start-Transcript -LiteralPath $hostLog -Append | Out-Null } catch {}
try {
  Set-Location -LiteralPath ([string]$service.workingDirectory)
  $env:IC_LAB_NEXT_LAUNCH_TOKEN = [string]$descriptor.launchToken
  $arguments = @($service.arguments)
  $arguments += "--ic-lab-next-token=$($descriptor.launchToken)"
  $arguments += "--ic-lab-next-service=$ServiceId"

  Write-Host "[$($service.title)] Demarrage depuis $($service.workingDirectory)"
  $startInfo = New-Object System.Diagnostics.ProcessStartInfo
  $startInfo.FileName = [string]$service.executablePath
  $startInfo.WorkingDirectory = [string]$service.workingDirectory
  $startInfo.UseShellExecute = $false
  $startInfo.CreateNoWindow = $false
  $startInfo.Arguments = (@($arguments | ForEach-Object { ConvertTo-NativeArgument -Value ([string]$_) }) -join " ")
  $child = New-Object System.Diagnostics.Process
  $child.StartInfo = $startInfo
  if (-not $child.Start()) { throw "Le processus $ServiceId n'a pas pu demarrer." }
  Write-Host "[$($service.title)] PID Node : $($child.Id)"
  $record = [ordered]@{
    formatVersion = 1
    projectId = [string]$descriptor.projectId
    repositoryRoot = [string]$descriptor.repositoryRoot
    launchToken = [string]$descriptor.launchToken
    serviceId = $ServiceId
    title = [string]$service.title
    hostPid = $PID
    processId = $child.Id
    executablePath = [string]$service.executablePath
    arguments = @($service.arguments)
    commandIdentity = [string]$service.commandIdentity
    workingDirectory = [string]$service.workingDirectory
    port = [int]$service.port
    readinessUrl = [string]$service.readinessUrl
    statePath = [string]$service.statePath
    stopRequestPath = [string]$service.stopRequestPath
    logPath = $hostLog
    startedAt = (Get-Date).ToUniversalTime().ToString("o")
  }
  Write-JsonAtomic -Path ([string]$service.statePath) -Value $record

  while (-not $child.HasExited) {
    if (Test-Path -LiteralPath ([string]$service.stopRequestPath)) {
      try {
        $request = Get-Content -LiteralPath ([string]$service.stopRequestPath) -Raw | ConvertFrom-Json
        if ($request.launchToken -eq $descriptor.launchToken -and $request.serviceId -eq $ServiceId) {
          Write-Host "[$($service.title)] Arret demande par le lanceur authentifie."
          Stop-Process -Id $child.Id -ErrorAction Stop
        }
      } catch {
        Write-Warning "Requete d'arret ignoree : $($_.Exception.Message)"
      }
    }
    Start-Sleep -Milliseconds 200
    $child.Refresh()
  }
  Write-Host "[$($service.title)] Processus termine (code $($child.ExitCode))."
  exit $child.ExitCode
} catch {
  Write-Error $_
  exit 1
} finally {
  try { Stop-Transcript | Out-Null } catch {}
}
