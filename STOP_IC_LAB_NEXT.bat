@echo off
setlocal
call "%~dp0scripts\windows\stop-all.bat"
set "EXIT_CODE=%errorlevel%"
if not "%EXIT_CODE%"=="0" if not "%IC_LAB_NEXT_NO_PAUSE%"=="1" pause
exit /b %EXIT_CODE%
