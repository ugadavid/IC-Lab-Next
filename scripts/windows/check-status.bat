@echo off
setlocal
echo === Etat IC-Lab-Next ===
docker info >nul 2>&1
if errorlevel 1 (echo Docker Desktop : indisponible) else (echo Docker Desktop : disponible)
call :print_port "MariaDB" 3306
call :print_port "Dico-IC / Seven Sieves" 3000
call :print_port "Agent vocal" 8788
call :print_port "IC-Hub" 8790
exit /b 0

:print_port
powershell -NoProfile -Command "if (Test-NetConnection -ComputerName 127.0.0.1 -Port %~2 -InformationLevel Quiet) { exit 0 } else { exit 1 }" >nul 2>&1
if errorlevel 1 (echo %~1 ^(%~2^) : indisponible) else (echo %~1 ^(%~2^) : actif)
exit /b 0
