@echo off
echo Running create_issues.ps1 with execution policy bypass...
powershell.exe -ExecutionPolicy Bypass -File "%~dp0create_issues.ps1"
pause
