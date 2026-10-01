#!/usr/bin/env bash
# Copyright 2026 Nobin Sijo (NobinSijo7T).
# SPDX-License-Identifier: Apache-2.0
# ==============================================================================
#  PrismSpace Developer OS - Unified Fullstack Runner (Bash)
#  Runs both Next.js Frontend and FastAPI Python Backend concurrently
#  with colorful diagnostic logging, pre-flight checks, and graceful shutdown.
# ==============================================================================

set -euo pipefail

# ── Color Definitions ─────────────────────────────────────────────────────────
BOLD="\033[1m"
DIM="\033[2m"
RED="\033[1;31m"
GREEN="\033[1;32m"
YELLOW="\033[1;33m"
BLUE="\033[1;34m"
MAGENTA="\033[1;35m"
CYAN="\033[1;36m"
DARKCYAN="\033[0;36m"
RESET="\033[0m"

# ── Paths ─────────────────────────────────────────────────────────────────────
RUN_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$RUN_DIR/.." && pwd)"
BACKEND_DIR="$PROJECT_ROOT/backend"

SERVICE="both"
SKIP_DEPS=false

# ── Parse Arguments ───────────────────────────────────────────────────────────
for arg in "$@"; do
  case $arg in
    --frontend|-f)
      SERVICE="frontend"
      shift
      ;;
    --backend|-b)
      SERVICE="backend"
      shift
      ;;
    --both)
      SERVICE="both"
      shift
      ;;
    --skip-deps)
      SKIP_DEPS=true
      shift
      ;;
    *)
      ;;
  esac
done

# ── Header Banner ─────────────────────────────────────────────────────────────
clear
echo ""
echo -e "${GREEN}  ██████╗ ██████╗ ██╗███████╗███╗   ███╗███████╗██████╗  █████╗  ██████╗███████╗${RESET}"
echo -e "${GREEN}  ██╔══██╗██╔══██╗██║██╔════╝████╗ ████║██╔════╝██╔══██╗██╔══██╗██╔════╝██╔════╝${RESET}"
echo -e "${GREEN}  ██████╔╝██████╔╝██║███████╗██╔████╔██║███████╗██████╔╝███████║██║     █████╗  ${RESET}"
echo -e "${CYAN}  ██╔═══╝ ██╔══██╗██║╚════██║██║╚██╔╝██║╚════██║██╔═══╝ ██╔══██║██║     ██╔══╝  ${RESET}"
echo -e "${DARKCYAN}  ██║     ██║  ██║██║███████║██║ ╚═╝ ██║███████║██║     ██║  ██║╚██████╗███████╗${RESET}"
echo -e "${DARKCYAN}  ╚═╝     ╚═╝  ╚═╝╚═╝╚══════╝╚═╝     ╚═╝╚══════╝╚═╝     ╚═╝  ╚═╝ ╚═════╝╚══════╝${RESET}"
echo -e "${YELLOW}              ⚡ AUTONOMOUS MULTI-AGENT SWARM + FULLSTACK OS ⚡${RESET}"
echo ""

print_status_card() {
  echo -e "${DARKCYAN}  ╔══════════════════════════════════════════════════════════════════════════════╗${RESET}"
  echo -e "${DARKCYAN}  ║                     ${CYAN}PRISMSPACE UNIFIED RUNNER v2.0${DARKCYAN}                           ║${RESET}"
  echo -e "${DARKCYAN}  ╠══════════════════════════════════════════════════════════════════════════════╣${RESET}"
  echo -e "${DARKCYAN}  ║  🟢 Frontend Web:     ${GREEN}http://localhost:3000${DARKCYAN}  (Next.js 14 App Router)          ║${RESET}"
  echo -e "${DARKCYAN}  ║  🟣 Swarm Mesh API:   ${MAGENTA}http://localhost:7433${DARKCYAN}  (FastAPI + ML Intelligence)      ║${RESET}"
  echo -e "${DARKCYAN}  ║  🤖 Swarm Dashboard:  ${CYAN}http://localhost:3000/swarm${DARKCYAN}  (Autonomous Orchestration)   ║${RESET}"
  echo -e "${DARKCYAN}  ║  📖 Backend OpenAPI:  ${YELLOW}http://localhost:7433/docs${DARKCYAN}   (Interactive Swagger Docs)       ║${RESET}"
  echo -e "${DARKCYAN}  ║  📡 Health Route:     ${BOLD}http://localhost:3000/api/agent-swarm/health${RESET}${DARKCYAN}                   ║${RESET}"
  echo -e "${DARKCYAN}  ╚══════════════════════════════════════════════════════════════════════════════╝${RESET}"
  echo ""
}

# ── Step 1: Pre-flight Diagnostics ───────────────────────────────────────────
echo -e "${CYAN}  [1/4] Running Pre-flight System Diagnostics...${RESET}"

if ! command -v node >/dev/null 2>&1; then
  echo -e "${RED}  ❌ Node.js is not installed or not in PATH. Please install Node.js 18+ from https://nodejs.org${RESET}"
  exit 1
fi

NODE_VERSION="$(node -v)"
NPM_VERSION="$(npm -v)"
echo -e "${GREEN}  ✅ Node.js: ${NODE_VERSION} | npm: ${NPM_VERSION}${RESET}"

choose_python() {
  for cmd in python3 python py; do
    if command -v "$cmd" >/dev/null 2>&1; then
      local ver
      ver="$("$cmd" --version 2>&1 | awk '{print $2}')"
      if [[ "$ver" =~ ^3\.(1[1-9]|[2-9][0-9]) ]]; then
        echo "$cmd"
        return 0
      fi
    fi
  done
  return 1
}

PYTHON_CMD="$(choose_python || true)"
if [[ -z "${PYTHON_CMD:-}" && "$SERVICE" != "frontend" ]]; then
  echo -e "${RED}  ❌ Python 3.11+ is required for the backend but was not found in PATH.${RESET}"
  echo -e "${YELLOW}     Please install Python 3.11 or newer: https://www.python.org/downloads/${RESET}"
  exit 1
fi

if [[ -n "${PYTHON_CMD:-}" ]]; then
  PYTHON_VERSION="$($PYTHON_CMD --version 2>&1)"
  echo -e "${GREEN}  ✅ Python:  ${PYTHON_VERSION} (via '${PYTHON_CMD}')${RESET}"
fi

# ── Step 2: Dependencies & Virtualenv ────────────────────────────────────────
echo ""
echo -e "${CYAN}  [2/4] Verifying Dependencies & Environments...${RESET}"

if [[ ! -d "$PROJECT_ROOT/node_modules" ]]; then
  echo -e "${YELLOW}  📦 Installing Frontend node_modules via npm install...${RESET}"
  cd "$PROJECT_ROOT"
  npm install
  echo -e "${GREEN}  ✅ Frontend dependencies ready.${RESET}"
else
  echo -e "${GREEN}  ✅ Frontend node_modules verified.${RESET}"
fi

VENV_PYTHON=""
if [[ "$SERVICE" != "frontend" ]]; then
  VENV_DIR="$BACKEND_DIR/.venv"
  if [[ -f "$VENV_DIR/Scripts/python.exe" ]]; then
    VENV_PYTHON="$VENV_DIR/Scripts/python.exe"
    VENV_PIP="$VENV_DIR/Scripts/pip.exe"
  elif [[ -f "$VENV_DIR/bin/python" ]]; then
    VENV_PYTHON="$VENV_DIR/bin/python"
    VENV_PIP="$VENV_DIR/bin/pip"
  else
    echo -e "${YELLOW}  📦 Creating Python virtual environment in backend/.venv...${RESET}"
    cd "$BACKEND_DIR"
    "$PYTHON_CMD" -m venv "$VENV_DIR"
    if [[ -f "$VENV_DIR/Scripts/python.exe" ]]; then
      VENV_PYTHON="$VENV_DIR/Scripts/python.exe"
      VENV_PIP="$VENV_DIR/Scripts/pip.exe"
    else
      VENV_PYTHON="$VENV_DIR/bin/python"
      VENV_PIP="$VENV_DIR/bin/pip"
    fi
    echo -e "${GREEN}  ✅ Virtual environment created.${RESET}"
  fi

  if [[ "$SKIP_DEPS" == false ]]; then
    echo -e "${YELLOW}  📦 Checking Python dependencies (backend/requirements.txt)...${RESET}"
    "$VENV_PIP" install -r "$BACKEND_DIR/requirements.txt" --quiet
    echo -e "${GREEN}  ✅ Python backend dependencies up to date.${RESET}"
  else
    echo -e "${DIM}  ⏩ Skipped Python dependency reinstall (--skip-deps).${RESET}"
  fi
fi

# ── Step 3: Network Ports ────────────────────────────────────────────────────
echo ""
echo -e "${CYAN}  [3/4] Verifying Network Ports...${RESET}"

is_port_in_use() {
  local port=$1
  if command -v lsof >/dev/null 2>&1; then
    lsof -i:"$port" >/dev/null 2>&1
  elif command -v nc >/dev/null 2>&1; then
    nc -z localhost "$port" >/dev/null 2>&1
  else
    return 1
  fi
}

if [[ "$SERVICE" != "backend" ]]; then
  if is_port_in_use 3000; then
    echo -e "${YELLOW}  ⚠️  Port 3000 is currently in use. Existing process may already be running.${RESET}"
  else
    echo -e "${GREEN}  ✅ Port 3000 is available for Frontend.${RESET}"
  fi
fi

if [[ "$SERVICE" != "frontend" ]]; then
  if is_port_in_use 7433; then
    echo -e "${YELLOW}  ⚠️  Port 7433 is currently in use. Existing Hive API process may already be running.${RESET}"
  else
    echo -e "${GREEN}  ✅ Port 7433 is available for Backend.${RESET}"
  fi
fi

# ── Step 4: Launching Services ───────────────────────────────────────────────
echo ""
echo -e "${CYAN}  [4/4] Launching Services (Mode: ${SERVICE})...${RESET}"
print_status_card

PIDS=()

cleanup() {
  echo ""
  echo -e "${RED}  🛑 Shutting down PrismSpace processes...${RESET}"
  for pid in "${PIDS[@]:-}"; do
    if kill -0 "$pid" 2>/dev/null; then
      echo -e "${YELLOW}     Stopping PID $pid...${RESET}"
      kill "$pid" 2>/dev/null || true
    fi
  done
  echo -e "${GREEN}  ✅ All processes stopped cleanly. Goodbye!${RESET}"
  echo ""
  exit 0
}

trap cleanup SIGINT SIGTERM EXIT

# 1. Start Backend
if [[ "$SERVICE" != "frontend" ]]; then
  echo -e "${MAGENTA}  🚀 [BACKEND] Starting FastAPI Hive API on http://localhost:7433...${RESET}"
  (cd "$BACKEND_DIR" && "$VENV_PYTHON" hive_api.py) &
  BACKEND_PID=$!
  PIDS+=("$BACKEND_PID")
  echo -e "${DIM}  🌟 [BACKEND] Running with PID ${BACKEND_PID}${RESET}"
fi

# 2. Start Frontend
if [[ "$SERVICE" != "backend" ]]; then
  echo -e "${CYAN}  🚀 [FRONTEND] Starting Next.js Dev Server on http://localhost:3000...${RESET}"
  (cd "$PROJECT_ROOT" && npm run dev) &
  FRONTEND_PID=$!
  PIDS+=("$FRONTEND_PID")
  echo -e "${DIM}  🌟 [FRONTEND] Running with PID ${FRONTEND_PID}${RESET}"
fi

echo ""
echo -e "${GREEN}  ✨ All selected services are online! Press Ctrl+C in this terminal to stop all.${RESET}"
echo ""

wait
