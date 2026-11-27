[Setup]
AppId=ICLab.AtelierAnonymisation
AppName=Atelier d’anonymisation
AppVersion={#AtelierVersion}
AppPublisher=IC-Lab
DefaultDirName={localappdata}\Programs\AtelierAnonymisation
DefaultGroupName=Atelier d’anonymisation
DisableProgramGroupPage=yes
PrivilegesRequired=lowest
ArchitecturesAllowed=x64compatible
ArchitecturesInstallIn64BitMode=x64compatible
UninstallDisplayIcon={app}\Atelier.exe
OutputDir={#Output}
OutputBaseFilename=Anonymiseur-{#AtelierVersion}-Setup-x64
Compression=lzma2/fast
SolidCompression=yes
WizardStyle=modern
CloseApplications=yes
CreateUninstallRegKey=IntegrateWithWindows

[Languages]
Name: "fr"; MessagesFile: "compiler:Languages\French.isl"

[Files]
Source: "{#Stage}\*"; DestDir: "{app}"; Flags: ignoreversion recursesubdirs createallsubdirs

[Icons]
Name: "{autoprograms}\Atelier d’anonymisation"; Filename: "{app}\Atelier.exe"; WorkingDir: "{app}"; AppUserModelID: "ICLab.AtelierAnonymisation"; Check: IntegrateWithWindows
Name: "{app}\Atelier d’anonymisation"; Filename: "{app}\Atelier.exe"; WorkingDir: "{app}"; AppUserModelID: "ICLab.AtelierAnonymisation"

[Run]
Filename: "{app}\Atelier.exe"; Description: "Ouvrir l’Atelier d’anonymisation"; Flags: postinstall nowait skipifsilent

[Code]
function IntegrateWithWindows: Boolean;
begin
  { La recette isolée conserve le raccourci du dossier installé et évite les écritures dans le compte réel. }
  Result := ExpandConstant('{param:IntegrationWindows|oui}') <> 'non';
end;
