@echo off
setlocal
for %%I in ("%~dp0..\..") do set "ROOT_DIR=%%~fI"
set "SERVER_DIR=%ROOT_DIR%\prototypes\00-ic-hub\server"

if not exist "%SERVER_DIR%\server.js" (
  echo [IC-Hub] Dossier serveur introuvable : %SERVER_DIR%
  exit /b 1
)
where node >nul 2>&1 || (echo [IC-Hub] Node.js est requis mais introuvable.& exit /b 1)
where npm >nul 2>&1 || (echo [IC-Hub] npm est requis mais introuvable.& exit /b 1)
if not exist "%SERVER_DIR%\node_modules" (
  echo [IC-Hub] Dependances absentes. Executez npm install manuellement dans le dossier serveur.
  exit /b 1
)

call :port_open 8790
if not errorlevel 1 (
  echo [IC-Hub] Deja actif sur http://127.0.0.1:8790/
  exit /b 0
)

echo [IC-Hub] Demarrage dans une nouvelle fenetre...
start "IC-Lab-Next - Hub" /d "%SERVER_DIR%" cmd /k npm start
exit /b 0

:port_open
powershell -NoProfile -Command "if (Test-NetConnection -ComputerName 127.0.0.1 -Port %~1 -InformationLevel Quiet) { exit 0 } else { exit 1 }" >nul 2>&1
exit /b %errorlevel%
