@echo off
setlocal
call "%~dp0scripts\windows\start-all.bat"
exit /b %errorlevel%
