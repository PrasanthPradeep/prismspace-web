# Hive Backend Startup Script (PowerShell)
# Run from the prismspace-web root:  .\backend\start.ps1

$ErrorActionPreference = "Stop"
$ScriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path

Write-Host ""
Write-Host "  ╔══════════════════════════════════════╗" -ForegroundColor Cyan
Write-Host "  ║     Hive Multi-Agent Bridge v1.0     ║" -ForegroundColor Cyan
Write-Host "  ╚══════════════════════════════════════╝" -ForegroundColor Cyan
Write-Host ""

# ── Check Python ─────────────────────────────────────────────────────────────
$pythonCmd = $null
foreach ($cmd in @("python", "python3", "py")) {
    if (Get-Command $cmd -ErrorAction SilentlyContinue) {
        $ver = & $cmd --version 2>&1
        if ($ver -match "Python 3\.(\d+)" -and [int]$Matches[1] -ge 11) {
            $pythonCmd = $cmd
            Write-Host "  ✅ Found $ver" -ForegroundColor Green
            break
        }
    }
}

if (-not $pythonCmd) {
    Write-Host "  ❌ Python 3.11+ not found. Please install it first." -ForegroundColor Red
    Write-Host "     https://www.python.org/downloads/" -ForegroundColor Yellow
    exit 1
}

# ── Create / activate virtual environment ────────────────────────────────────
$venvPath = Join-Path $ScriptDir ".venv"
if (-not (Test-Path $venvPath)) {
    Write-Host "  📦 Creating virtual environment…" -ForegroundColor Yellow
    & $pythonCmd -m venv $venvPath
}

$pip = Join-Path $venvPath "Scripts\pip.exe"
$python = Join-Path $venvPath "Scripts\python.exe"

Write-Host "  📥 Installing/updating dependencies…" -ForegroundColor Yellow
& $pip install -r (Join-Path $ScriptDir "requirements.txt") --quiet

# ── Optionally clone Hive if not already present ─────────────────────────────
$hivePath = Join-Path $ScriptDir "hive"
if (-not (Test-Path $hivePath)) {
    Write-Host ""
    Write-Host "  ⬇️  Cloning aden-hive/hive…" -ForegroundColor Yellow
    git clone https://github.com/aden-hive/hive.git $hivePath
    Write-Host "  ✅ Hive cloned to $hivePath" -ForegroundColor Green
} else {
    Write-Host "  ✅ Hive repo already present at $hivePath" -ForegroundColor Green
}

# ── Start the FastAPI bridge ──────────────────────────────────────────────────
Write-Host ""
Write-Host "  🚀 Starting Hive Bridge API on http://localhost:7433" -ForegroundColor Cyan
Write-Host "     Press Ctrl+C to stop" -ForegroundColor Gray
Write-Host ""

Set-Location $ScriptDir
& $python hive_api.py
