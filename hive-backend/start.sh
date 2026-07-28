#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$SCRIPT_DIR"

echo ""
echo "  ╔══════════════════════════════════════╗"
echo "  ║   Hive Multi-Agent Bridge v1.0      ║"
echo "  ╚══════════════════════════════════════╝"
echo ""

choose_python() {
  if command -v python3 >/dev/null 2>&1; then
    local version
    version="$(python3 --version 2>&1 | awk '{print $2}')"
    if [[ "$version" =~ ^3\.(1[1-9]|[2-9][0-9]) ]]; then
      echo "python3"
      return 0
    fi
  fi

  if command -v python >/dev/null 2>&1; then
    local version
    version="$(python --version 2>&1 | awk '{print $2}')"
    if [[ "$version" =~ ^3\.(1[1-9]|[2-9][0-9]) ]]; then
      echo "python"
      return 0
    fi
  fi

  return 1
}

PYTHON_BIN="$(choose_python || true)"
if [[ -z "${PYTHON_BIN:-}" ]]; then
  echo "  ❌ Python 3.11+ not found. Please install it first." >&2
  exit 1
fi

PYTHON_VERSION="$($PYTHON_BIN --version 2>&1)"
echo "  ✅ Found $PYTHON_VERSION"

VENV_DIR="$SCRIPT_DIR/.venv"
if [[ ! -x "$VENV_DIR/bin/python" ]]; then
  echo "  📦 Creating virtual environment…"
  "$PYTHON_BIN" -m venv "$VENV_DIR"
fi

VENV_PYTHON="$VENV_DIR/bin/python"
VENV_PIP="$VENV_DIR/bin/pip"

echo "  📥 Installing/updating dependencies…"
"$VENV_PYTHON" -m pip install --upgrade pip >/dev/null
"$VENV_PIP" install -r "$SCRIPT_DIR/requirements.txt" >/dev/null

HIVE_DIR="$SCRIPT_DIR/hive"
if [[ ! -d "$HIVE_DIR" ]]; then
  echo ""
  echo "  ⬇️  Cloning aden-hive/hive…"
  git clone https://github.com/aden-hive/hive.git "$HIVE_DIR"
  echo "  ✅ Hive cloned to $HIVE_DIR"
else
  echo "  ✅ Hive repo already present at $HIVE_DIR"
fi

echo ""
echo "  🚀 Starting Hive Bridge API on http://localhost:7433"
echo "     Press Ctrl+C to stop"
echo ""

exec "$VENV_PYTHON" "$SCRIPT_DIR/hive_api.py"
