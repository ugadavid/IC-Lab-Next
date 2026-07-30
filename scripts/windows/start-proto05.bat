@echo off
setlocal
for %%I in ("%~dp0..\..") do set "ROOT_DIR=%%~fI"
set "SERVER_DIR=%ROOT_DIR%\prototypes\05-augmented-ic-video-01\server"
if not exist "%SERVER_DIR%\server.js" (echo [Proto 05] Serveur introuvable : %SERVER_DIR%& exit /b 1)
if not exist "%SERVER_DIR%\..\.env.local" (echo [Proto 05] Configuration locale MariaDB introuvable : %SERVER_DIR%\..\.env.local& exit /b 1)
where node >nul 2>&1 || (echo [Proto 05] Node.js est requis mais introuvable.& exit /b 1)
call :port_open 8791
if not errorlevel 1 (echo [Proto 05] Deja actif sur http://127.0.0.1:8791/& exit /b 0)
echo [Proto 05] Demarrage du serveur autonome...
start "IC-Lab-Next - Proto 05" /d "%SERVER_DIR%" cmd /k "set PROTO05_DATA_MODE=mariadb&& node --env-file=../.env.local server.js"
call :wait_for_port 8791 20
if errorlevel 1 (echo [Proto 05] Le port 8791 ne repond pas.& exit /b 1)
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
