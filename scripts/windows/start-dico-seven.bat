@echo off
setlocal
for %%I in ("%~dp0..\..") do set "ROOT_DIR=%%~fI"
set "DICO_DIR=%ROOT_DIR%\prototypes\08-dico-seven-sieves"
set "SERVER_DIR=%DICO_DIR%\Node"

if not exist "%DICO_DIR%\docker-compose.yml" (
  echo [Dico-IC] Fichier Compose introuvable : %DICO_DIR%
  exit /b 1
)
if not exist "%SERVER_DIR%\server.js" (
  echo [Dico-IC] Dossier Node introuvable : %SERVER_DIR%
  exit /b 1
)
where node >nul 2>&1 || (echo [Dico-IC] Node.js est requis mais introuvable.& exit /b 1)
where npm >nul 2>&1 || (echo [Dico-IC] npm est requis mais introuvable.& exit /b 1)
if not exist "%SERVER_DIR%\node_modules" (
  echo [Dico-IC] Dependances absentes. Executez npm install manuellement dans le dossier Node.
  exit /b 1
)

docker info >nul 2>&1
if errorlevel 1 (
  echo [Dico-IC] Docker Desktop est indisponible. Demarrez-le puis relancez ce script.
  exit /b 1
)

echo [Dico-IC] Verification de la stack Compose existante...
pushd "%DICO_DIR%"
docker compose up -d
if errorlevel 1 (
  popd
  echo [Dico-IC] La stack Compose n'a pas pu demarrer.
  exit /b 1
)
popd

call :wait_for_port 3306 30
if errorlevel 1 (
  echo [Dico-IC] MariaDB ne repond pas sur 3306 avant la fin du delai d'attente.
  exit /b 1
)

call :port_open 3000
if not errorlevel 1 (
  echo [Dico-IC] API deja active sur http://127.0.0.1:3000/
  exit /b 0
)

echo [Dico-IC] Demarrage du serveur Node dans une nouvelle fenetre...
start "IC-Lab-Next - Dico-IC et Seven Sieves" /d "%SERVER_DIR%" cmd /k npm start
exit /b 0

:wait_for_port
set /a ATTEMPTS=0
:wait_loop
call :port_open %~1
if not errorlevel 1 exit /b 0
set /a ATTEMPTS+=1
if %ATTEMPTS% GEQ %~2 exit /b 1
timeout /t 1 /nobreak >nul
goto wait_loop

:port_open
powershell -NoProfile -Command "if (Test-NetConnection -ComputerName 127.0.0.1 -Port %~1 -InformationLevel Quiet) { exit 0 } else { exit 1 }" >nul 2>&1
exit /b %errorlevel%
