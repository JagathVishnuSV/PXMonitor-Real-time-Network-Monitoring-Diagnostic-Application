@echo off
:: This script starts the Node.js backend server with administrator privileges.

:: Get the directory of the current script
set "scriptDir=%~dp0"

:: Command to execute
set "command=node index.js"

:: Use PowerShell to start a new, elevated process
powershell.exe -Command "Start-Process powershell.exe -ArgumentList '-NoExit', '-Command', 'cd ''%scriptDir%''; %command%' -Verb RunAs"

echo.
echo A new administrator window has been opened to run the backend server.
echo Please close this window and use the new one.
pause
