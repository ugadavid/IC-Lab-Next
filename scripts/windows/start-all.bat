@echo off
setlocal
set "SCRIPT_DIR=%~dp0"

echo === IC-Lab-Next : demarrage des services locaux ===
call "%SCRIPT_DIR%start-proto05.bat"
set "PROTO05_LAUNCH=%errorlevel%"
call "%SCRIPT_DIR%start-hub.bat"
set "HUB_LAUNCH=%errorlevel%"
call "%SCRIPT_DIR%start-agent-vocal.bat"
set "VOICE_LAUNCH=%errorlevel%"
call "%SCRIPT_DIR%start-dico-seven.bat"
set "DICO_LAUNCH=%errorlevel%"

call :service_status "Proto 05" 8791 %PROTO05_LAUNCH%
set "PROTO05_STATUS=%errorlevel%"
call :service_status "IC-Hub" 8790 %HUB_LAUNCH%
set "HUB_STATUS=%errorlevel%"
call :service_status "Agent vocal" 8788 %VOICE_LAUNCH%
set "VOICE_STATUS=%errorlevel%"
call :service_status "Dico-IC / Seven Sieves" 3000 %DICO_LAUNCH%
set "DICO_STATUS=%errorlevel%"

echo.
echo === Resume ===
call :print_status "Proto 05" %PROTO05_STATUS%
call :print_status "IC-Hub" %HUB_STATUS%
call :print_status "Agent vocal" %VOICE_STATUS%
call :print_status "Dico-IC / Seven Sieves" %DICO_STATUS%
echo Le portail est ouvert meme si un service autonome manque.
start "" "http://127.0.0.1:8790/"
exit /b 0

:service_status
call :wait_for_port %~2 30
if not errorlevel 1 exit /b 0
if "%~3"=="0" (
  echo [%~1] Delai depasse : le port %~2 ne repond pas.
  exit /b 2
)
echo [%~1] Indisponible : le lanceur a signale une erreur.
exit /b 1

:print_status
if "%~2"=="0" echo %~1 : demarre ou deja actif
if "%~2"=="1" echo %~1 : indisponible
if "%~2"=="2" echo %~1 : delai depasse
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
