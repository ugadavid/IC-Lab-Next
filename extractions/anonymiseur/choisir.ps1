param([ValidateSet('ouvrir','exporter')][string]$Mode)
$ErrorActionPreference = 'Stop'
Add-Type -AssemblyName System.Windows.Forms
[System.Windows.Forms.Application]::EnableVisualStyles()
if ($Mode -eq 'ouvrir') {
    $dialog = [System.Windows.Forms.OpenFileDialog]::new()
    $dialog.Title = 'Ouvrir une vidéo'
    $dialog.Filter = 'Vidéos|*.mp4;*.m4v;*.mov;*.webm|Tous les fichiers|*.*'
} else {
    $dialog = [System.Windows.Forms.SaveFileDialog]::new()
    $dialog.Title = 'Enregistrer le MP4 dans un nouveau fichier'
    $dialog.Filter = 'Vidéo MP4|*.mp4'
    $dialog.DefaultExt = 'mp4'
    $dialog.FileName = $env:ANONYMISEUR_NOM_MP4
}
$owner = [System.Windows.Forms.Form]::new()
try {
    $owner.TopMost = $true
    if ($dialog.ShowDialog($owner) -eq [System.Windows.Forms.DialogResult]::OK) {
        [Console]::OutputEncoding = [Text.UTF8Encoding]::new($false)
        [Console]::Write($dialog.FileName)
    }
} finally {
    $dialog.Dispose()
    $owner.Dispose()
}
