# Copyright 2026 Nobin Sijo (NobinSijo7T).
# SPDX-License-Identifier: Apache-2.0
<#
.SYNOPSIS
    PrismSpace Developer OS - Unified Fullstack Runner (PowerShell)
.DESCRIPTION
    Runs both the Next.js Frontend and FastAPI Python Backend concurrently
    with colorful diagnostic logging, pre-flight checks, and graceful shutdown.
.PARAMETER Service
    Service to run: 'Both' (default), 'Frontend', or 'Backend'
.PARAMETER SkipDeps
    Skip dependency and virtualenv check
.EXAMPLE
    .\run\run.ps1
    .\run\run.ps1 -Service Frontend
    .\run\run.ps1 -Service Backend
#>

[CmdletBinding()]
param (
    [ValidateSet('Both', 'Frontend', 'Backend')]
    [string]$Service = 'Both',

    [switch]$SkipDeps
)

$ErrorActionPreference = 'Stop'
$RunDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$ProjectRoot = (Resolve-Path (Join-Path $RunDir "..")).Path
$BackendDir = Join-Path $ProjectRoot "backend"

# ── Color Utilities ─────────────────────────────────────────────────────────
function Write-Color([string]$text, [ConsoleColor]$color = [ConsoleColor]::White, [switch]$NoNewline) {
    if ($NoNewline) {
        Write-Host $text -ForegroundColor $color -NoNewline
    } else {
        Write-Host $text -ForegroundColor $color
    }
}

function Write-CyberHeader {
    Clear-Host
    Write-Host ""
    Write-Host "  ================================================================================" -ForegroundColor DarkGreen
    Write-Host "   ____       _                     ____                                          " -ForegroundColor Green
    Write-Host "  |  _ \ _ __(_)___ _ __ ___  ___  / ___| _ __   __ _  ___ ___                    " -ForegroundColor Green
    Write-Host "  | |_) | '__| / __| '_ ` _ \/ __| \___ \| '_ \ / _` |/ __/ _ \                   " -ForegroundColor Cyan
    Write-Host "  |  __/| |  | \__ \ | | | | \__ \  ___) | |_) | (_| | (_|  __/                   " -ForegroundColor Cyan
    Write-Host "  |_|   |_|  |_|___/_| |_| |_|___/ |____/| .__/ \__,_|\___\___|                   " -ForegroundColor DarkCyan
    Write-Host "                                         |_|  AUTONOMOUS MULTI-AGENT SWARM OS     " -ForegroundColor Yellow
    Write-Host "  ================================================================================" -ForegroundColor DarkGreen
    Write-Host ""
}

function Write-StatusCard {
    Write-Host "  +------------------------------------------------------------------------------+" -ForegroundColor DarkCyan
    Write-Host "  |                     PRISMSPACE UNIFIED RUNNER v2.0                           |" -ForegroundColor Cyan
    Write-Host "  +------------------------------------------------------------------------------+" -ForegroundColor DarkCyan
    Write-Host "  |  [*] Frontend Web:     " -ForegroundColor DarkCyan -NoNewline
    Write-Host "http://localhost:3000" -ForegroundColor Green -NoNewline
    Write-Host "  (Next.js 14 App Router)          |" -ForegroundColor DarkCyan
    Write-Host "  |  [*] Swarm Mesh API:   " -ForegroundColor DarkCyan -NoNewline
    Write-Host "http://localhost:7433" -ForegroundColor Magenta -NoNewline
    Write-Host "  (FastAPI + ML Intelligence)      |" -ForegroundColor DarkCyan
    Write-Host "  |  [*] Swarm Dashboard:  " -ForegroundColor DarkCyan -NoNewline
    Write-Host "http://localhost:3000/swarm" -ForegroundColor Cyan -NoNewline
    Write-Host "  (Autonomous Orchestration)   |" -ForegroundColor DarkCyan
    Write-Host "  |  [*] Backend OpenAPI:  " -ForegroundColor DarkCyan -NoNewline
    Write-Host "http://localhost:7433/docs" -ForegroundColor Yellow -NoNewline
    Write-Host "   (Interactive Swagger Docs)       |" -ForegroundColor DarkCyan
    Write-Host "  |  [*] Health Route:     " -ForegroundColor DarkCyan -NoNewline
    Write-Host "http://localhost:3000/api/agent-swarm/health                   |" -ForegroundColor White
    Write-Host "  +------------------------------------------------------------------------------+" -ForegroundColor DarkCyan
    Write-Host ""
}

# ── Pre-flight Checks ────────────────────────────────────────────────────────
Write-CyberHeader
Write-Color "  [1/4] Running Pre-flight System Diagnostics..." [ConsoleColor]::Cyan

# 1. Node.js & npm check
$nodeCmd = Get-Command "node" -ErrorAction SilentlyContinue
$npmCmd = Get-Command "npm" -ErrorAction SilentlyContinue

if (-not $nodeCmd) {
    Write-Color "  [X] Node.js is not found in PATH. Please install Node.js 18+ from https://nodejs.org" [ConsoleColor]::Red
    exit 1
}

$nodeVersion = & node -v
$npmVersion = & npm -v
Write-Color "  [OK] Node.js: $nodeVersion | npm: $npmVersion" [ConsoleColor]::Green

# 2. Python check (requires 3.11+)
$pythonCmd = $null
foreach ($cmd in @("python", "python3", "py")) {
    if (Get-Command $cmd -ErrorAction SilentlyContinue) {
        $ver = & $cmd --version 2>&1
        if ($ver -match "Python 3\.(\d+)" -and [int]$Matches[1] -ge 11) {
            $pythonCmd = $cmd
            Write-Color "  [OK] Python:  $ver (via '$cmd')" [ConsoleColor]::Green
            break
        }
    }
}

if (-not $pythonCmd -and $Service -ne 'Frontend') {
    Write-Color "  [X] Python 3.11+ is required for the backend but was not found." [ConsoleColor]::Red
    Write-Color "      Please install Python 3.11 or newer: https://www.python.org/downloads/" [ConsoleColor]::Yellow
    exit 1
}

# ── Dependency Setup ─────────────────────────────────────────────────────────
Write-Host ""
Write-Color "  [2/4] Verifying Dependencies & Environments..." [ConsoleColor]::Cyan

# Frontend node_modules check
$nodeModulesPath = Join-Path $ProjectRoot "node_modules"
if (-not (Test-Path $nodeModulesPath)) {
    Write-Color "  [!] Installing Frontend node_modules via npm install..." [ConsoleColor]::Yellow
    Set-Location $ProjectRoot
    & npm install
    Write-Color "  [OK] Frontend dependencies ready." [ConsoleColor]::Green
} else {
    Write-Color "  [OK] Frontend node_modules verified." [ConsoleColor]::Green
}

# Backend virtual environment & requirements check
$venvPython = $null
if ($Service -ne 'Frontend') {
    $venvDir = Join-Path $BackendDir ".venv"
    $venvPython = Join-Path $venvDir "Scripts\python.exe"
    $venvPip = Join-Path $venvDir "Scripts\pip.exe"

    if (-not (Test-Path $venvPython)) {
        Write-Color "  [!] Creating Python virtual environment in backend\.venv..." [ConsoleColor]::Yellow
        Set-Location $BackendDir
        & $pythonCmd -m venv $venvDir
        Write-Color "  [OK] Virtual environment created." [ConsoleColor]::Green
    }

    if (-not $SkipDeps) {
        Write-Color "  [!] Checking Python dependencies (backend\requirements.txt)..." [ConsoleColor]::Yellow
        $reqPath = Join-Path $BackendDir "requirements.txt"
        & $venvPip install -r $reqPath --quiet
        Write-Color "  [OK] Python backend dependencies up to date." [ConsoleColor]::Green
    } else {
        Write-Color "  [--] Skipped Python dependency reinstall (-SkipDeps)." [ConsoleColor]::DarkGray
    }
}

# ── Port Diagnostics ─────────────────────────────────────────────────────────
Write-Host ""
Write-Color "  [3/4] Verifying Network Ports..." [ConsoleColor]::Cyan

function Check-PortInUse([int]$port) {
    $conn = Get-NetTCPConnection -LocalPort $port -ErrorAction SilentlyContinue
    return ($null -ne $conn)
}

if ($Service -ne 'Backend' -and (Check-PortInUse 3000)) {
    Write-Color "  [!] Port 3000 is currently in use. Existing process may already be running." [ConsoleColor]::Yellow
} else {
    Write-Color "  [OK] Port 3000 is available for Frontend." [ConsoleColor]::Green
}

if ($Service -ne 'Frontend' -and (Check-PortInUse 7433)) {
    Write-Color "  [!] Port 7433 is currently in use. Existing Hive API process may already be running." [ConsoleColor]::Yellow
} else {
    Write-Color "  [OK] Port 7433 is available for Backend." [ConsoleColor]::Green
}

# ── Launch Processes ─────────────────────────────────────────────────────────
Write-Host ""
Write-Color "  [4/4] Launching Services (Mode: $Service)..." [ConsoleColor]::Cyan
Write-StatusCard

$processes = @()

try {
    # 1. Start Backend if requested
    if ($Service -ne 'Frontend') {
        Write-Color "  [>>] [BACKEND] Starting FastAPI Hive API on http://localhost:7433..." [ConsoleColor]::Magenta
        $backendProcess = Start-Process -FilePath $venvPython `
            -ArgumentList "hive_api.py" `
            -WorkingDirectory $BackendDir `
            -PassThru
        $processes += $backendProcess
        Write-Color "  [*]  [BACKEND] Running with PID $($backendProcess.Id)" [ConsoleColor]::DarkMagenta
    }

    # 2. Start Frontend if requested
    if ($Service -ne 'Backend') {
        Write-Color "  [>>] [FRONTEND] Starting Next.js Dev Server on http://localhost:3000..." [ConsoleColor]::Cyan
        $frontendProcess = Start-Process -FilePath "npm.cmd" `
            -ArgumentList "run", "dev" `
            -WorkingDirectory $ProjectRoot `
            -PassThru
        $processes += $frontendProcess
        Write-Color "  [*]  [FRONTEND] Running with PID $($frontendProcess.Id)" [ConsoleColor]::DarkCyan
    }

    Write-Host ""
    Write-Color "  [SUCCESS] All selected services are online! Press Ctrl+C in this terminal to stop all." [ConsoleColor]::Green
    Write-Host ""

    # Monitor loop
    while ($true) {
        foreach ($proc in $processes) {
            if ($proc.HasExited) {
                Write-Color "  [!] Process '$($proc.ProcessName)' (PID $($proc.Id)) exited with code $($proc.ExitCode)." [ConsoleColor]::Yellow
            }
        }
        Start-Sleep -Seconds 2
    }
}
finally {
    Write-Host ""
    Write-Color "  [STOP] Shutting down PrismSpace processes..." [ConsoleColor]::Red
    foreach ($proc in $processes) {
        if (-not $proc.HasExited) {
            try {
                Write-Color "         Stopping PID $($proc.Id)..." [ConsoleColor]::DarkYellow
                Stop-Process -Id $proc.Id -Force -ErrorAction SilentlyContinue
            } catch {
                # ignore cleanup errors
            }
        }
    }
    Write-Color "  [OK] All processes stopped cleanly. Goodbye!" [ConsoleColor]::Green
    Write-Host ""
}
