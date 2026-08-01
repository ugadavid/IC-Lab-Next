param([switch]$KeepFixture)

$ErrorActionPreference = "Stop"

function Get-FreePort {
  $listener = New-Object System.Net.Sockets.TcpListener([System.Net.IPAddress]::Loopback, 0)
  $listener.Start()
  try { return ([System.Net.IPEndPoint]$listener.LocalEndpoint).Port }
  finally { $listener.Stop() }
}

function Invoke-Launcher {
  param([string]$ScriptPath, [string]$Action, [string]$Root, [string]$Config, [string]$Runtime)
  $arguments = "-NoLogo -NoProfile -ExecutionPolicy Bypass -File `"$ScriptPath`" -Action $Action -RepositoryRoot `"$Root`" -ConfigurationPath `"$Config`" -RuntimeDirectory `"$Runtime`" -NoBrowser -NoTerminal"
  $startInfo = New-Object System.Diagnostics.ProcessStartInfo
  $startInfo.FileName = (Get-Command powershell.exe).Source
  $startInfo.Arguments = $arguments
  $startInfo.UseShellExecute = $false
  $startInfo.CreateNoWindow = $true
  $process = New-Object System.Diagnostics.Process
  $process.StartInfo = $startInfo
  if (-not $process.Start()) { throw "Le lanceur de test n'a pas pu demarrer." }
  $deadline = (Get-Date).AddSeconds(90)
  while (-not $process.HasExited -and (Get-Date) -lt $deadline) {
    Start-Sleep -Milliseconds 100
    $process.Refresh()
  }
  if (-not $process.HasExited) {
    Stop-Process -Id $process.Id -Force -ErrorAction SilentlyContinue
    throw "Le lanceur n'a pas rendu le controle avant le delai."
  }
  return $process.ExitCode
}

function Assert-True {
  param([bool]$Condition, [string]$Message)
  if (-not $Condition) { throw $Message }
}

$temporaryBase = [System.IO.Path]::GetFullPath([System.IO.Path]::GetTempPath()).TrimEnd("\")
$fixtureRoot = Join-Path $temporaryBase "IC Lab Next Launcher Test $([Guid]::NewGuid().ToString('N'))"
$runtime = Join-Path $fixtureRoot ".ic-lab-next-runtime"
$foreign = $null
try {
  New-Item -ItemType Directory -Path (Join-Path $fixtureRoot "scripts\windows\test") -Force | Out-Null
  Copy-Item -LiteralPath (Join-Path $PSScriptRoot "..\launcher.ps1") -Destination (Join-Path $fixtureRoot "scripts\windows\launcher.ps1")
  Copy-Item -LiteralPath (Join-Path $PSScriptRoot "..\service-host.ps1") -Destination (Join-Path $fixtureRoot "scripts\windows\service-host.ps1")
  Copy-Item -LiteralPath (Join-Path $PSScriptRoot "fixture-server.js") -Destination (Join-Path $fixtureRoot "scripts\windows\test\fixture-server.js")
  $ports = @($(Get-FreePort), $(Get-FreePort), $(Get-FreePort), $(Get-FreePort))
  $services = @()
  for ($index = 0; $index -lt 4; $index++) {
    $id = "fixture$($index + 1)"
    $services += [ordered]@{
      id = $id
      title = "Fixture $($index + 1)"
      workingDirectory = "scripts/windows/test"
      executable = "node.exe"
      arguments = @("fixture-server.js", "--port=$($ports[$index])", "--service=$id")
      requiredPaths = @("scripts/windows/test/fixture-server.js")
      port = $ports[$index]
      readinessUrl = "http://127.0.0.1:$($ports[$index])/health"
      readinessPattern = $id
      legacyCommandFragments = @("fixture-server.js", "--service=$id")
    }
  }
  $configPath = Join-Path $fixtureRoot "scripts\windows\fixture-services.json"
  $configuration = [ordered]@{
    formatVersion = 1
    projectId = "IC-Lab-Next-Fixture"
    browserUrl = "http://127.0.0.1:$($ports[0])/health"
    dependencies = @()
    services = $services
  }
  [System.IO.File]::WriteAllText($configPath, ($configuration | ConvertTo-Json -Depth 12), (New-Object System.Text.UTF8Encoding($false)))
  $launcher = Join-Path $fixtureRoot "scripts\windows\launcher.ps1"

  Assert-True ((Invoke-Launcher $launcher "Start" $fixtureRoot $configPath $runtime) -eq 0) "Premier START en echec."
  $firstState = Get-Content -LiteralPath (Join-Path $runtime "active.json") -Raw | ConvertFrom-Json
  Assert-True (@($firstState.services).Count -eq 4) "Le premier START n'a pas publie quatre services."
  $firstIds = @($firstState.services | ForEach-Object { [int]$_.processId })
  foreach ($record in $firstState.services) {
    Assert-True ($null -ne (Get-Process -Id ([int]$record.processId) -ErrorAction SilentlyContinue)) "Processus fixture absent."
  }

  Assert-True ((Invoke-Launcher $launcher "Start" $fixtureRoot $configPath $runtime) -eq 0) "Second START en echec."
  $secondState = Get-Content -LiteralPath (Join-Path $runtime "active.json") -Raw | ConvertFrom-Json
  $secondIds = @($secondState.services | ForEach-Object { [int]$_.processId })
  Assert-True (@($firstIds | Where-Object { $secondIds -contains $_ }).Count -eq 0) "Le second START a reutilise un ancien PID."
  foreach ($processIdValue in $firstIds) {
    Assert-True ($null -eq (Get-Process -Id $processIdValue -ErrorAction SilentlyContinue)) "Un ancien PID est reste actif."
  }
  Assert-True ((Get-ChildItem -LiteralPath $runtime -Recurse -Filter "*.log").Count -ge 5) "Les journaux attendus sont absents."

  Assert-True ((Invoke-Launcher $launcher "Stop" $fixtureRoot $configPath $runtime) -eq 0) "Premier STOP en echec."
  foreach ($processIdValue in $secondIds) {
    Assert-True ($null -eq (Get-Process -Id $processIdValue -ErrorAction SilentlyContinue)) "STOP a laisse un PID actif."
  }
  Assert-True ((Invoke-Launcher $launcher "Stop" $fixtureRoot $configPath $runtime) -eq 0) "Second STOP non idempotent."

  $foreign = Start-Process -FilePath (Get-Command node.exe).Source -ArgumentList @("fixture-server.js", "--port=$($ports[0])", "--service=foreign") -WorkingDirectory (Join-Path $fixtureRoot "scripts\windows\test") -PassThru -WindowStyle Hidden
  Start-Sleep -Milliseconds 500
  Assert-True ((Invoke-Launcher $launcher "Start" $fixtureRoot $configPath $runtime) -ne 0) "START aurait du refuser le port etranger."
  Assert-True ($null -ne (Get-Process -Id $foreign.Id -ErrorAction SilentlyContinue)) "Le processus etranger a ete tue."
  Stop-Process -Id $foreign.Id -Force
  $foreign = $null

  New-Item -ItemType Directory -Path $runtime -Force | Out-Null
  [System.IO.File]::WriteAllText((Join-Path $runtime "active.json"), "{illisible", (New-Object System.Text.UTF8Encoding($false)))
  Assert-True ((Invoke-Launcher $launcher "Start" $fixtureRoot $configPath $runtime) -eq 0) "La reprise apres etat illisible a echoue."
  Assert-True ((Invoke-Launcher $launcher "Stop" $fixtureRoot $configPath $runtime) -eq 0) "STOP final en echec."

  Write-Host "LAUNCHER_SMOKE_TEST_OK root=$fixtureRoot"
} finally {
  if ($foreign -and (Get-Process -Id $foreign.Id -ErrorAction SilentlyContinue)) { Stop-Process -Id $foreign.Id -Force }
  if (Test-Path -LiteralPath $runtime) {
    $statePath = Join-Path $runtime "active.json"
    if (Test-Path -LiteralPath $statePath) {
      try { Invoke-Launcher (Join-Path $fixtureRoot "scripts\windows\launcher.ps1") "Stop" $fixtureRoot (Join-Path $fixtureRoot "scripts\windows\fixture-services.json") $runtime | Out-Null } catch {}
    }
  }
  if (-not $KeepFixture -and (Test-Path -LiteralPath $fixtureRoot)) {
    $resolvedFixture = [System.IO.Path]::GetFullPath($fixtureRoot)
    if (-not $resolvedFixture.StartsWith("$temporaryBase\", [System.StringComparison]::OrdinalIgnoreCase)) {
      throw "Refus de nettoyer un chemin hors du dossier temporaire."
    }
    Remove-Item -LiteralPath $resolvedFixture -Recurse -Force
  }
}
