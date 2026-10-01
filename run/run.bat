:: Copyright 2026 Nobin Sijo (NobinSijo7T).
:: SPDX-License-Identifier: Apache-2.0
@echo off
setlocal enabledelayedexpansion

:: ============================================================================
::  PrismSpace Developer OS - Unified Fullstack Runner (Batch)
::  Dispatches to rich PowerShell runner with bypass policy, or standalone cmd.
:: ============================================================================

title PrismSpace Fullstack Runner

:: Check if PowerShell is available for rich cyber-color experience
where powershell >nul 2>nul
if %ERRORLEVEL% EQU 0 (
    powershell.exe -NoProfile -ExecutionPolicy Bypass -File "%~dp0run.ps1" %*
    goto :eof
)

:: ── Fallback Pure Batch Mode (if powershell is missing) ──────────────────────
cls
echo.
echo  ==============================================================
echo            PRISMSPACE DEVELOPER OS - FULLSTACK RUNNER
echo  ==============================================================
echo.
echo  [1/3] Checking runtimes...
where node >nul 2>nul
if %ERRORLEVEL% NEQ 0 (
    echo  [X] Node.js not found in PATH!
    pause
    exit /b 1
)

echo  [OK] Node.js found.

where python >nul 2>nul
if %ERRORLEVEL% NEQ 0 (
    echo  [X] Python not found in PATH!
    pause
    exit /b 1
)
echo  [OK] Python found.

echo.
echo  [2/3] Service Endpoints:
echo    - Frontend Web:    http://localhost:3000
echo    - Swarm Mesh API:  http://localhost:7433
echo    - Swarm Dashboard: http://localhost:3000/swarm
echo    - OpenAPI Docs:    http://localhost:7433/docs
echo.
echo  [3/3] Launching Frontend & Backend in separate console windows...
echo.

start "PrismSpace Backend (FastAPI)" cmd /c "cd /d "%~dp0..\backend" && if exist .venv\Scripts\python.exe (.venv\Scripts\python.exe hive_api.py) else (python hive_api.py)"
start "PrismSpace Frontend (Next.js)" cmd /c "cd /d "%~dp0.." && npm run dev"

echo  Both services launched. Keep this window open or close it when done.
pause
