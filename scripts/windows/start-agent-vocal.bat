@echo off
setlocal
for %%I in ("%~dp0..\..") do set "ROOT_DIR=%%~fI"
set "SERVER_DIR=%ROOT_DIR%\prototypes\06-voice-agent-ic\server"

if not exist "%SERVER_DIR%\server.js" (
  echo [Agent vocal] Dossier serveur introuvable : %SERVER_DIR%
  exit /b 1
)
where node >nul 2>&1 || (echo [Agent vocal] Node.js est requis mais introuvable.& exit /b 1)
where npm >nul 2>&1 || (echo [Agent vocal] npm est requis mais introuvable.& exit /b 1)

call :port_open 8788
if not errorlevel 1 (
  echo [Agent vocal] Deja actif sur http://127.0.0.1:8788/
  exit /b 0
)

echo [Agent vocal] Demarrage dans une nouvelle fenetre...
start "IC-Lab-Next - Agent vocal" /d "%SERVER_DIR%" cmd /k npm start
exit /b 0

:port_open
powershell -NoProfile -Command "if (Test-NetConnection -ComputerName 127.0.0.1 -Port %~1 -InformationLevel Quiet) { exit 0 } else { exit 1 }" >nul 2>&1
exit /b %errorlevel%
