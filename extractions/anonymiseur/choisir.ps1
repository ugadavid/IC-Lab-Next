param([ValidateSet('ouvrir','exporter')][string]$Mode)
$ErrorActionPreference = 'Stop'
Add-Type -AssemblyName System.Windows.Forms
[System.Windows.Forms.Application]::EnableVisualStyles()
Add-Type -ReferencedAssemblies ([System.Windows.Forms.IWin32Window].Assembly.Location) -TypeDefinition @'
using System;
using System.Runtime.InteropServices;
using System.Text;
using System.Windows.Forms;

public sealed class AtelierWindow : IWin32Window {
    public IntPtr Handle { get; private set; }
    [DllImport("user32.dll")] private static extern IntPtr GetForegroundWindow();
    [DllImport("user32.dll")] private static extern bool SetForegroundWindow(IntPtr window);
    [DllImport("user32.dll", CharSet = CharSet.Unicode)]
    private static extern int GetWindowText(IntPtr window, StringBuilder title, int size);
    [DllImport("user32.dll", CharSet = CharSet.Unicode)]
    private static extern int GetClassName(IntPtr window, StringBuilder name, int size);

    public static AtelierWindow FromForeground(string workshopTitle) {
        IntPtr window = GetForegroundWindow();
        var title = new StringBuilder(256);
        var name = new StringBuilder(64);
        GetWindowText(window, title, title.Capacity);
        GetClassName(window, name, name.Capacity);
        if (name.ToString() != "Chrome_WidgetWin_1" ||
            !title.ToString().StartsWith(workshopTitle, StringComparison.Ordinal)) return null;
        return new AtelierWindow { Handle = window };
    }

    public void RestoreIfActive(IntPtr dialogOwner) {
        if (GetForegroundWindow() == dialogOwner) SetForegroundWindow(Handle);
    }
}
'@
$browser = [AtelierWindow]::FromForeground("Atelier d’anonymisation")
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
    # Le dialogue a un propriétaire WinForms actif, lui-même rattaché à l’atelier.
    $owner.ShowInTaskbar = $false
    $owner.FormBorderStyle = [System.Windows.Forms.FormBorderStyle]::None
    $owner.Opacity = 0
    $owner.Size = [System.Drawing.Size]::new(1, 1)
    $owner.StartPosition = [System.Windows.Forms.FormStartPosition]::Manual
    $owner.Location = [System.Windows.Forms.Cursor]::Position
    if ($browser) { $owner.Show($browser) } else { $owner.Show() }
    $owner.Activate()
    if ($dialog.ShowDialog($owner) -eq [System.Windows.Forms.DialogResult]::OK) {
        [Console]::OutputEncoding = [Text.UTF8Encoding]::new($false)
        [Console]::Write($dialog.FileName)
    }
} finally {
    $dialog.Dispose()
    if ($browser -and $owner.IsHandleCreated) { $browser.RestoreIfActive($owner.Handle) }
    $owner.Close()
    $owner.Dispose()
}
