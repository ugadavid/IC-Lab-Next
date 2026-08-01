param(
  [ValidateSet("Start", "Stop")][string]$Action = "Start",
  [string]$RepositoryRoot,
  [string]$ConfigurationPath,
  [string]$RuntimeDirectory,
  [switch]$NoBrowser,
  [switch]$NoTerminal
)

$ErrorActionPreference = "Stop"
$script:LockStream = $null
$script:ControlLog = $null

function Get-CanonicalPath {
  param([string]$Path)
  return [System.IO.Path]::GetFullPath((Resolve-Path -LiteralPath $Path).Path).TrimEnd("\")
}

function Resolve-ProjectPath {
  param([string]$Root, [string]$RelativePath)
  $candidate = [System.IO.Path]::GetFullPath((Join-Path $Root $RelativePath))
  if ($candidate -ne $Root -and -not $candidate.StartsWith("$Root\", [System.StringComparison]::OrdinalIgnoreCase)) {
    throw "Le chemin sort du depot : $RelativePath"
  }
  return $candidate
}

function Write-Control {
  param([string]$Message, [string]$Level = "INFO")
  $line = "{0} [{1}] {2}" -f (Get-Date -Format "yyyy-MM-dd HH:mm:ss"), $Level, $Message
  Write-Host $line
  if ($script:ControlLog) { Add-Content -LiteralPath $script:ControlLog -Value $line -Encoding UTF8 }
}

function Write-JsonAtomic {
  param([string]$Path, [object]$Value)
  $temporaryPath = "$Path.$PID.tmp"
  $json = $Value | ConvertTo-Json -Depth 15
  [System.IO.File]::WriteAllText($temporaryPath, $json, (New-Object System.Text.UTF8Encoding($false)))
  Move-Item -LiteralPath $temporaryPath -Destination $Path -Force
}

function Get-CommandFingerprint {
  param([string]$ExecutablePath, [object[]]$Arguments, [string]$WorkingDirectory)
  $material = "$ExecutablePath`n$WorkingDirectory`n$($Arguments -join "`n")"
  $bytes = [System.Text.Encoding]::UTF8.GetBytes($material)
  $algorithm = [System.Security.Cryptography.SHA256]::Create()
  try { return ([System.BitConverter]::ToString($algorithm.ComputeHash($bytes))).Replace("-", "").ToLowerInvariant() }
  finally { $algorithm.Dispose() }
}

function Get-LiveProcess {
  param([int]$ProcessId)
  return (Get-Process -Id $ProcessId -ErrorAction SilentlyContinue)
}

function Get-CimProcess {
  param([int]$ProcessId)
  $process = Get-CimInstance Win32_Process -Filter ("ProcessId = {0}" -f $ProcessId) -ErrorAction SilentlyContinue
  if ($process) { return $process }
  return (Get-WmiObject Win32_Process -Filter ("ProcessId = {0}" -f $ProcessId) -ErrorAction SilentlyContinue)
}

function Get-ListenerProcessIds {
  param([int]$Port)
  return @(Get-NetTCPConnection -LocalPort $Port -State Listen -ErrorAction SilentlyContinue | Select-Object -ExpandProperty OwningProcess -Unique)
}

function Test-TcpPort {
  param([string]$HostName, [int]$Port, [int]$TimeoutMilliseconds = 500)
  $client = New-Object System.Net.Sockets.TcpClient
  try {
    $pending = $client.BeginConnect($HostName, $Port, $null, $null)
    if (-not $pending.AsyncWaitHandle.WaitOne($TimeoutMilliseconds, $false)) { return $false }
    $client.EndConnect($pending)
    return $true
  } catch { return $false }
  finally { $client.Close() }
}

function Test-ServiceIdentity {
  param([object]$Record)
  $process = Get-LiveProcess -ProcessId ([int]$Record.processId)
  if (-not $process) { $script:LastIdentityFailure = "PID absent"; return $false }
  if (-not $process.Path) { $script:LastIdentityFailure = "executable non lisible"; return $false }
  if (-not ([string]$process.Path).Equals([string]$Record.executablePath, [System.StringComparison]::OrdinalIgnoreCase)) { $script:LastIdentityFailure = "executable different"; return $false }
  $cimProcess = Get-CimProcess -ProcessId ([int]$Record.processId)
  if (-not $cimProcess) { $script:LastIdentityFailure = "commande non lisible"; return $false }
  $commandLine = [string]$cimProcess.CommandLine
  foreach ($argument in @($Record.arguments)) {
    if (-not $commandLine.Contains([string]$argument)) { $script:LastIdentityFailure = "argument absent : $argument"; return $false }
  }
  if (-not $commandLine.Contains("--ic-lab-next-token=$($Record.launchToken)")) { $script:LastIdentityFailure = "jeton absent"; return $false }
  if (-not $commandLine.Contains("--ic-lab-next-service=$($Record.serviceId)")) { $script:LastIdentityFailure = "service absent"; return $false }
  $script:LastIdentityFailure = $null
  return $true
}

function Test-HostIdentity {
  param([object]$Record)
  $process = Get-LiveProcess -ProcessId ([int]$Record.hostPid)
  if (-not $process) { return $false }
  $cimProcess = Get-CimProcess -ProcessId ([int]$Record.hostPid)
  if (-not $cimProcess) { return $false }
  $commandLine = [string]$cimProcess.CommandLine
  return $commandLine.Contains([string]$Record.launchToken) -and $commandLine.Contains([string]$Record.serviceId)
}

function Read-State {
  param([string]$Path)
  if (-not (Test-Path -LiteralPath $Path)) { return $null }
  try { return Get-Content -LiteralPath $Path -Raw | ConvertFrom-Json }
  catch { throw "Etat runtime illisible : $Path" }
}

function Remove-LaunchArtifacts {
  param([object]$State, [string]$StatePath)
  foreach ($service in @($State.services)) {
    foreach ($artifact in @($service.statePath, $service.stopRequestPath)) {
      if ($artifact -and (Test-Path -LiteralPath ([string]$artifact))) { Remove-Item -LiteralPath ([string]$artifact) -Force }
    }
  }
  if ($State.descriptorPath -and (Test-Path -LiteralPath ([string]$State.descriptorPath))) {
    Remove-Item -LiteralPath ([string]$State.descriptorPath) -Force
  }
  if (Test-Path -LiteralPath $StatePath) { Remove-Item -LiteralPath $StatePath -Force }
}

function Stop-AuthenticatedLaunch {
  param([object]$State, [string]$StatePath)
  if ($State.projectId -ne $script:Configuration.projectId -or $State.repositoryRoot -ne $script:RepositoryRoot) {
    throw "L'etat runtime n'appartient pas a ce depot. Aucun processus n'a ete arrete."
  }
  $records = @($State.services)
  if ($State.descriptorPath -and (Test-Path -LiteralPath ([string]$State.descriptorPath))) {
    try {
      $descriptor = Get-Content -LiteralPath ([string]$State.descriptorPath) -Raw | ConvertFrom-Json
      foreach ($service in @($descriptor.services)) {
        if (-not $service.statePath -or -not (Test-Path -LiteralPath ([string]$service.statePath))) { continue }
        $record = Get-Content -LiteralPath ([string]$service.statePath) -Raw | ConvertFrom-Json
        if ($record.launchToken -eq $State.launchToken -and -not @($records | Where-Object { $_.serviceId -eq $record.serviceId }).Count) {
          $records += $record
        }
      }
    } catch { throw "Les identites partielles de lancement sont illisibles. Aucun processus n'a ete arrete." }
  }
  $State.services = $records
  $liveRecords = @()
  foreach ($record in $records) {
    $live = Get-LiveProcess -ProcessId ([int]$record.processId)
    if ($live) {
      if (-not (Test-ServiceIdentity -Record $record)) {
        throw "Identite invalide pour $($record.title), PID $($record.processId). Aucun processus n'a ete arrete."
      }
      if (-not (Test-HostIdentity -Record $record)) {
        throw "Superviseur invalide pour $($record.title), PID $($record.hostPid). Aucun processus n'a ete arrete."
      }
      $liveRecords += $record
    }
  }
  if (-not $liveRecords.Count) {
    Write-Control "Etat ancien sans processus vivant : nettoyage de l'etat local."
    Remove-LaunchArtifacts -State $State -StatePath $StatePath
    return
  }
  foreach ($record in $liveRecords) {
    Write-JsonAtomic -Path ([string]$record.stopRequestPath) -Value ([ordered]@{
      launchToken = [string]$record.launchToken
      serviceId = [string]$record.serviceId
      requestedAt = (Get-Date).ToUniversalTime().ToString("o")
    })
    Write-Control "Arret demande a $($record.title) (PID $($record.processId))."
  }
  $deadline = (Get-Date).AddSeconds(10)
  do {
    $remaining = @($liveRecords | Where-Object { Get-LiveProcess -ProcessId ([int]$_.processId) })
    if (-not $remaining.Count) { break }
    Start-Sleep -Milliseconds 200
  } while ((Get-Date) -lt $deadline)

  foreach ($record in $liveRecords) {
    if (Get-LiveProcess -ProcessId ([int]$record.processId)) {
      if (Test-ServiceIdentity -Record $record) {
        Write-Control "Arret force borne de $($record.title) apres delai." "WARN"
        Stop-Process -Id ([int]$record.processId) -Force -ErrorAction Stop
      } else {
        throw "L'identite de $($record.title) a change pendant l'arret."
      }
    }
  }
  Start-Sleep -Milliseconds 400
  foreach ($record in $liveRecords) {
    if ((Get-LiveProcess -ProcessId ([int]$record.hostPid)) -and (Test-HostIdentity -Record $record)) {
      Stop-Process -Id ([int]$record.hostPid) -Force -ErrorAction SilentlyContinue
    }
  }
  foreach ($record in $liveRecords) {
    if (Get-LiveProcess -ProcessId ([int]$record.processId)) {
      throw "Le processus $($record.processId) de $($record.title) est encore actif."
    }
    Write-Control "$($record.title) est arrete."
  }
  Remove-LaunchArtifacts -State $State -StatePath $StatePath
}

function Get-LegacyOwnership {
  param([object]$Service, [int]$ProcessId)
  $liveProcess = Get-LiveProcess -ProcessId $ProcessId
  $process = Get-CimProcess -ProcessId $ProcessId
  if (-not $liveProcess -or -not $process -or -not ([string]$liveProcess.Path).Equals($script:NodePath, [System.StringComparison]::OrdinalIgnoreCase)) { return $null }
  foreach ($fragment in @($Service.legacyCommandFragments)) {
    if (-not ([string]$process.CommandLine).Contains([string]$fragment)) { return $null }
  }
  $ancestorId = [int]$process.ParentProcessId
  for ($depth = 0; $depth -lt 6 -and $ancestorId -gt 0; $depth++) {
    $ancestor = Get-CimProcess -ProcessId $ancestorId
    if (-not $ancestor) { break }
    $windowTitle = ""
    try { $windowTitle = (Get-Process -Id $ancestorId -ErrorAction Stop).MainWindowTitle } catch {}
    if (([string]$ancestor.CommandLine).Contains($script:RepositoryRoot) -or $windowTitle.StartsWith("IC-Lab-Next", [System.StringComparison]::OrdinalIgnoreCase)) {
      return [ordered]@{ processId = $ProcessId; hostPid = $ancestorId; title = [string]$Service.title }
    }
    $ancestorId = [int]$ancestor.ParentProcessId
  }
  return $null
}

function Stop-AuthenticatedLegacyProcesses {
  foreach ($service in @($script:Configuration.services)) {
    foreach ($processIdValue in @(Get-ListenerProcessIds -Port ([int]$service.port))) {
      $ownership = Get-LegacyOwnership -Service $service -ProcessId ([int]$processIdValue)
      if (-not $ownership) { continue }
      Write-Control "Ancienne instance IC-Lab-Next authentifiee : arret de $($service.title), PID $processIdValue." "WARN"
      Stop-Process -Id ([int]$processIdValue) -Force -ErrorAction Stop
      Start-Sleep -Milliseconds 300
      $host = Get-LiveProcess -ProcessId ([int]$ownership.hostPid)
      if ($host) { Stop-Process -Id ([int]$ownership.hostPid) -Force -ErrorAction SilentlyContinue }
    }
  }
}

function Assert-NoForeignPortOwners {
  foreach ($service in @($script:Configuration.services)) {
    $owners = @(Get-ListenerProcessIds -Port ([int]$service.port))
    if ($owners.Count) {
      $descriptions = @($owners | ForEach-Object {
        $process = Get-LiveProcess -ProcessId ([int]$_)
        "PID $_ ($($process.Name))"
      }) -join ", "
      throw "Port $($service.port) requis par $($service.title), mais occupe par $descriptions. Processus laisse intact."
    }
  }
}

function Wait-ServiceReady {
  param([object]$Service, [int]$TimeoutSeconds = 30)
  $deadline = (Get-Date).AddSeconds($TimeoutSeconds)
  do {
    if (Test-ServiceIdentity -Record $Service) {
      $owners = @(Get-ListenerProcessIds -Port ([int]$Service.port))
      if ($owners -contains [int]$Service.processId) {
        try {
          $response = Invoke-WebRequest -Uri ([string]$Service.readinessUrl) -UseBasicParsing -TimeoutSec 2
          if ($response.StatusCode -ge 200 -and $response.StatusCode -lt 400 -and ([string]$response.Content) -match ([string]$Service.readinessPattern)) {
            return $true
          }
        } catch {}
      }
    }
    Start-Sleep -Milliseconds 250
  } while ((Get-Date) -lt $deadline)
  Write-Control "Identite/readiness non confirmee pour $($Service.title), PID $($Service.processId) : $($script:LastIdentityFailure)." "WARN"
  return $false
}

function Acquire-LauncherLock {
  param([string]$Path)
  $deadline = (Get-Date).AddSeconds(10)
  do {
    try {
      $script:LockStream = [System.IO.File]::Open($Path, [System.IO.FileMode]::OpenOrCreate, [System.IO.FileAccess]::ReadWrite, [System.IO.FileShare]::None)
      return
    } catch [System.IO.IOException] {
      Start-Sleep -Milliseconds 200
    }
  } while ((Get-Date) -lt $deadline)
  throw "Un autre START ou STOP IC-Lab-Next est en cours."
}

try {
  if (-not $RepositoryRoot) { $RepositoryRoot = Join-Path $PSScriptRoot "..\.." }
  $script:RepositoryRoot = Get-CanonicalPath -Path $RepositoryRoot
  if (-not $ConfigurationPath) { $ConfigurationPath = Join-Path $PSScriptRoot "launcher-services.json" }
  $ConfigurationPath = Get-CanonicalPath -Path $ConfigurationPath
  $script:Configuration = Get-Content -LiteralPath $ConfigurationPath -Raw | ConvertFrom-Json
  if ($script:Configuration.formatVersion -ne 1) { throw "Version de manifeste de lancement non prise en charge." }
  if (-not $RuntimeDirectory) { $RuntimeDirectory = Join-Path $script:RepositoryRoot ".ic-lab-next-runtime" }
  $RuntimeDirectory = [System.IO.Path]::GetFullPath($RuntimeDirectory)
  if (-not (Test-Path -LiteralPath $RuntimeDirectory)) { New-Item -ItemType Directory -Path $RuntimeDirectory -Force | Out-Null }
  $script:ControlLog = Join-Path $RuntimeDirectory "launcher.log"
  $statePath = Join-Path $RuntimeDirectory "active.json"
  Acquire-LauncherLock -Path (Join-Path $RuntimeDirectory "launcher.lock")

  $nodeCommand = Get-Command node.exe -ErrorAction Stop
  $script:NodePath = [string]$nodeCommand.Source
  $activeState = $null
  try { $activeState = Read-State -Path $statePath }
  catch {
    $activePorts = @($script:Configuration.services | Where-Object { (Get-ListenerProcessIds -Port ([int]$_.port)).Count })
    if ($activePorts.Count) { throw }
    Write-Control "Etat runtime illisible sans port actif : nettoyage prudent." "WARN"
    Remove-Item -LiteralPath $statePath -Force
  }

  if ($Action -eq "Stop") {
    if (-not $activeState) {
      Write-Control "IC-Lab-Next est deja arrete. Aucun processus n'a ete touche."
      exit 0
    }
    Stop-AuthenticatedLaunch -State $activeState -StatePath $statePath
    Write-Control "Tous les serveurs IC-Lab-Next authentifies sont arretes. Docker et MariaDB n'ont pas ete touches."
    exit 0
  }

  Write-Control "Redemarrage global IC-Lab-Next depuis $($script:RepositoryRoot)."
  if ($activeState) { Stop-AuthenticatedLaunch -State $activeState -StatePath $statePath }
  else { Stop-AuthenticatedLegacyProcesses }

  $releaseDeadline = (Get-Date).AddSeconds(10)
  do {
    $busy = @($script:Configuration.services | Where-Object { (Get-ListenerProcessIds -Port ([int]$_.port)).Count })
    if (-not $busy.Count) { break }
    Start-Sleep -Milliseconds 200
  } while ((Get-Date) -lt $releaseDeadline)
  Assert-NoForeignPortOwners

  foreach ($dependency in @($script:Configuration.dependencies)) {
    if (-not (Test-TcpPort -HostName ([string]$dependency.host) -Port ([int]$dependency.port))) {
      throw "$($dependency.label) ne repond pas sur $($dependency.host):$($dependency.port). Demarrez cette dependance sans utiliser le lanceur IC-Lab-Next."
    }
    Write-Control "$($dependency.label) est disponible sur $($dependency.host):$($dependency.port) (lecture seule du statut)."
  }

  $resolvedServices = @()
  $launchToken = [Guid]::NewGuid().ToString("N")
  $launchDirectory = Join-Path $RuntimeDirectory $launchToken
  New-Item -ItemType Directory -Path $launchDirectory -Force | Out-Null
  foreach ($service in @($script:Configuration.services)) {
    foreach ($requiredPath in @($service.requiredPaths)) {
      $resolvedRequiredPath = Resolve-ProjectPath -Root $script:RepositoryRoot -RelativePath ([string]$requiredPath)
      if (-not (Test-Path -LiteralPath $resolvedRequiredPath)) { throw "Prerequis absent pour $($service.title) : $resolvedRequiredPath" }
    }
    $workingDirectory = Resolve-ProjectPath -Root $script:RepositoryRoot -RelativePath ([string]$service.workingDirectory)
    $executable = Get-Command ([string]$service.executable) -ErrorAction Stop
    $arguments = @($service.arguments | ForEach-Object { [string]$_ })
    $resolvedServices += [ordered]@{
      id = [string]$service.id
      title = [string]$service.title
      workingDirectory = $workingDirectory
      executablePath = [string]$executable.Source
      arguments = $arguments
      commandIdentity = Get-CommandFingerprint -ExecutablePath ([string]$executable.Source) -Arguments $arguments -WorkingDirectory $workingDirectory
      port = [int]$service.port
      readinessUrl = [string]$service.readinessUrl
      readinessPattern = [string]$service.readinessPattern
      statePath = Join-Path $launchDirectory "service-$($service.id).json"
      stopRequestPath = Join-Path $launchDirectory "stop-$($service.id).json"
      logPath = Join-Path $launchDirectory "$($service.id).log"
    }
  }

  $terminalCommand = Get-Command wt.exe -ErrorAction SilentlyContinue
  $terminalMode = -not $NoTerminal -and $null -ne $terminalCommand
  if (-not $terminalMode) { Write-Control "Windows Terminal indisponible ou desactive : repli vers une fenetre PowerShell par service." "WARN" }
  $windowName = "IC-Lab-Next-$($launchToken.Substring(0, 8))"
  $descriptorPath = Join-Path $launchDirectory "descriptor.json"
  $descriptor = [ordered]@{
    formatVersion = 1
    projectId = [string]$script:Configuration.projectId
    repositoryRoot = $script:RepositoryRoot
    launchToken = $launchToken
    terminalWindow = $windowName
    services = $resolvedServices
  }
  Write-JsonAtomic -Path $descriptorPath -Value $descriptor
  $state = [ordered]@{
    formatVersion = 1
    projectId = [string]$script:Configuration.projectId
    repositoryRoot = $script:RepositoryRoot
    launchToken = $launchToken
    terminalWindow = $windowName
    descriptorPath = $descriptorPath
    startedAt = (Get-Date).ToUniversalTime().ToString("o")
    services = @()
  }
  Write-JsonAtomic -Path $statePath -Value $state

  $hostScript = Join-Path $PSScriptRoot "service-host.ps1"
  $powerShellPath = (Get-Command powershell.exe -ErrorAction Stop).Source
  foreach ($service in $resolvedServices) {
    Write-Control "Ouverture de l'onglet $($service.title)."
    if ($terminalMode) {
      & ([string]$terminalCommand.Source) -w $windowName new-tab --title ([string]$service.title) --suppressApplicationTitle -d ([string]$service.workingDirectory) $powerShellPath -NoLogo -NoProfile -ExecutionPolicy Bypass -File $hostScript -DescriptorPath $descriptorPath -ServiceId ([string]$service.id)
      if ($LASTEXITCODE -ne 0) { throw "Windows Terminal n'a pas pu ouvrir l'onglet $($service.title)." }
    } else {
      $hostArguments = "-NoLogo -NoProfile -ExecutionPolicy Bypass -File `"$hostScript`" -DescriptorPath `"$descriptorPath`" -ServiceId `"$($service.id)`""
      Start-Process -FilePath $powerShellPath -ArgumentList $hostArguments -WorkingDirectory ([string]$service.workingDirectory) | Out-Null
    }
    Start-Sleep -Milliseconds 250
  }

  foreach ($service in $resolvedServices) {
    $stateDeadline = (Get-Date).AddSeconds(10)
    do {
      if (Test-Path -LiteralPath ([string]$service.statePath)) { break }
      Start-Sleep -Milliseconds 100
    } while ((Get-Date) -lt $stateDeadline)
    if (-not (Test-Path -LiteralPath ([string]$service.statePath))) { throw "$($service.title) n'a pas publie son identite de processus." }
    $record = Get-Content -LiteralPath ([string]$service.statePath) -Raw | ConvertFrom-Json
    if ($record.repositoryRoot -ne $script:RepositoryRoot -or $record.launchToken -ne $launchToken -or $record.commandIdentity -ne $service.commandIdentity) {
      throw "Identite de lancement incoherente pour $($service.title)."
    }
    $state.services += $record
    Write-JsonAtomic -Path $statePath -Value $state
    if (-not (Wait-ServiceReady -Service $record -TimeoutSeconds 30)) {
      throw "$($service.title) n'est pas devenu pret sur $($service.readinessUrl). Consultez $($service.logPath)."
    }
    Write-Control "$($service.title) est pret (PID $($record.processId), port $($record.port))."
  }

  if ($terminalMode) {
    Write-Control "Tous les services executent le code present sur disque dans une seule fenetre Windows Terminal."
  } else {
    Write-Control "Tous les services executent le code present sur disque dans les fenetres PowerShell de repli."
  }
  if (-not $NoBrowser -and $env:IC_LAB_NEXT_NO_BROWSER -ne "1") {
    Start-Process ([string]$script:Configuration.browserUrl) | Out-Null
    Write-Control "IC-Hub a ete ouvert dans le navigateur."
  }
  Write-Control "Docker et MariaDB n'ont ete ni arretes, ni demarres, ni redemarres."
  exit 0
} catch {
  Write-Control $_.Exception.Message "ERROR"
  try {
    if ($statePath -and (Test-Path -LiteralPath $statePath)) {
      $failureState = Read-State -Path $statePath
      if ($failureState) { Stop-AuthenticatedLaunch -State $failureState -StatePath $statePath }
    }
  } catch { Write-Control "Nettoyage partiel impossible : $($_.Exception.Message)" "ERROR" }
  exit 1
} finally {
  if ($script:LockStream) { $script:LockStream.Dispose() }
}
