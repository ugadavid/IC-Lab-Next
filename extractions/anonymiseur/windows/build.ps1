param(
    [Parameter(Mandatory)][string]$ElectronZip,
    [Parameter(Mandatory)][string]$FFmpegDir,
    [string]$Iscc = "$env:LOCALAPPDATA\Programs\InnoSetup7\ISCC.exe",
    [string]$OutputRoot = (Join-Path ([Environment]::GetFolderPath('MyDocuments')) 'Livraisons')
)
$ErrorActionPreference = 'Stop'
$version = (Get-Content -Raw -Encoding UTF8 "$PSScriptRoot/package.json" | ConvertFrom-Json).version
$source = Split-Path $PSScriptRoot -Parent
$destination = Join-Path ([IO.Path]::GetFullPath($OutputRoot)) "Anonymiseur-$version-ZI"
if (Test-Path $destination) { throw "Le dossier existe déjà : $destination" }
function CheckHash($file,$expected) {
    if ((Get-FileHash -Algorithm SHA256 -LiteralPath $file).Hash -ne $expected) { throw "Empreinte inattendue : $file" }
}
CheckHash $ElectronZip '2BA6223AFA9121F42831FEFE92C434334907540165294FC56697449D12E7CFE9'
CheckHash "$FFmpegDir/bin/ffmpeg.exe" '175798EB093346C635B453E7E8A99D2862D3335F26F3C1C432B446B5D84F77B5'
CheckHash "$FFmpegDir/bin/ffprobe.exe" '1C0D20E59226049212561C65FA222E0F4F70293AA8691181D33E9A5D91E648E3'
CheckHash "$FFmpegDir/README.txt" 'E251DA4DA1655AE7E61821E38BF8F738B85BD64497DB04C41A76897B991E4EF9'
CheckHash "$FFmpegDir/LICENSE" '8CEB4B9EE5ADEDDE47B31E975C1D90C73AD27B6B165A1DCD80C7C545EB65B903'
$work = Join-Path ([IO.Path]::GetTempPath()) ('atelier-build-' + [Guid]::NewGuid())
$stage = Join-Path $work 'application'
$dist = Join-Path $work 'distribution'
[void][IO.Directory]::CreateDirectory($dist)
try {
    Expand-Archive -LiteralPath $ElectronZip -DestinationPath $stage
    Rename-Item -LiteralPath "$stage/electron.exe" -NewName 'Atelier.exe'
    $app = New-Item -ItemType Directory -Path "$stage/resources/app"
    $tools = New-Item -ItemType Directory -Path "$stage/resources/outils"
    Copy-Item -LiteralPath "$PSScriptRoot/package.json" -Destination $app
    $hostDir = New-Item -ItemType Directory -Path "$app/windows"
    foreach ($item in 'main.cjs','transport.cjs') { Copy-Item -LiteralPath "$PSScriptRoot/$item" -Destination $hostDir }
    foreach ($item in 'atelier-local.js','http-local.js','stockage.js','NOTICES.md','ui','moteur') {
        Copy-Item -Recurse -LiteralPath "$source/$item" -Destination $app
    }
    Copy-Item -LiteralPath "$PSScriptRoot/DEPENDANCES.md" -Destination "$stage/DEPENDANCES.md"
    Copy-Item -LiteralPath "$FFmpegDir/LICENSE" -Destination "$tools/COPYING.txt"
    Copy-Item -LiteralPath "$FFmpegDir/README.txt" -Destination "$tools/README-Gyan.txt"
    foreach ($name in 'ffmpeg','ffprobe') {
        $exe = "$tools/$name.exe"
        Copy-Item -LiteralPath "$FFmpegDir/bin/$name.exe" -Destination $exe
        $config = & $exe -hide_banner -buildconf 2>&1 | Out-String
        if ($LASTEXITCODE -ne 0 -or $config -match '--enable-nonfree' -or $config -notmatch '--enable-libx264') { throw "Configuration inattendue : $name" }
        [IO.File]::WriteAllText("$tools/$name-buildconf.txt",$config)
        $license = & $exe -L | Out-String
        if ($LASTEXITCODE -ne 0 -or $license -notmatch 'General Public License') { throw "Licence inattendue : $name" }
        [IO.File]::WriteAllText("$tools/$name-licence.txt",$license)
    }
    & $Iscc /Qp "/DAtelierVersion=$version" "/DStage=$stage" "/DOutput=$dist" "$PSScriptRoot/atelier.iss"
    if ($LASTEXITCODE -ne 0) { throw "Échec de compilation Inno Setup ($LASTEXITCODE)" }
    $name = "Anonymiseur-$version-Setup-x64.exe"
    $sha = (Get-FileHash -LiteralPath "$dist/$name" -Algorithm SHA256).Hash.ToLowerInvariant()
    [IO.File]::WriteAllText("$dist/SHA256.txt","$sha  $name" + [Environment]::NewLine)
    Copy-Item -LiteralPath "$PSScriptRoot/MEMO-ZI.md" -Destination $dist
    [void][IO.Directory]::CreateDirectory($OutputRoot)
    [IO.Directory]::Move($dist,$destination)
    Write-Output "$destination/$name"
} finally {
    $resolved = [IO.Path]::GetFullPath($work)
    if ([IO.Path]::GetDirectoryName($resolved) -eq [IO.Path]::GetTempPath().TrimEnd('\') -and
        [IO.Path]::GetFileName($resolved) -match '^atelier-build-[a-f0-9-]{36}$') {
        Remove-Item -Recurse -Force -LiteralPath $resolved
    }
}
