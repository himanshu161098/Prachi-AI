@echo off
title Prachi AI Unified Server Hub
echo ========================================================
echo   Starting Prachi AI Ecosystem
echo   1. Python OmniCognitive Brain (Port 8000)
echo   2. Node.js Full-Stack Server  (Port 5500)
echo ========================================================
cd /d "%~dp0"

REM Ensure local portable nodejs is in PATH if present
if exist "%USERPROFILE%\.tools\nodejs" (
    set "PATH=%USERPROFILE%\.tools\nodejs;%PATH%"
)

REM Check if Python is available to launch the OmniCognitive brain
where python >nul 2>&1
if %ERRORLEVEL% equ 0 (
    echo [INFO] Launching Python OmniCognitive Brain on Port 8000...
    start "Prachi AI - OmniBrain (Port 8000)" cmd /k "cd brain && uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload"
) else (
    echo [NOTICE] Python not found in PATH. Node server will use integrated zero-latency cognitive bridge.
)

REM Launch Node Backend & Frontend Static Server
echo [INFO] Starting Node.js Backend & Frontend on Port 5500...
call npm --prefix backend run dev
pause
