# ⚡ PrismSpace Fullstack Runners

Unified cross-platform scripts to launch both the **Next.js Frontend** and the **FastAPI Python Multi-Agent Swarm Backend** concurrently with diagnostics, colorful CLI reporting, and graceful shutdown.

---

## 🚀 Quick Start

### Windows (PowerShell)
```powershell
# From the project root:
.\run\run.ps1

# Or with start alias:
.\run\start.ps1
```

### Windows (Command Prompt / Double Click)
```cmd
run\run.bat
```

### Linux / macOS / WSL / Git Bash
```bash
chmod +x run/*.sh
./run/run.sh

# Or with start alias:
./run/start.sh
```

---

## 🎛️ Command-Line Flags & Options

| Option | PowerShell (`.ps1`) | Bash (`.sh`) | Command Prompt (`.bat`) | Description |
|---|---|---|---|---|
| **Both Services (Default)** | `.\run\run.ps1` | `./run/run.sh` | `run\run.bat` | Runs both Frontend and Backend concurrently |
| **Frontend Only** | `.\run\run.ps1 -Service Frontend` | `./run/run.sh --frontend` | `run\run.bat -Service Frontend` | Runs only Next.js (port 3000) |
| **Backend Only** | `.\run\run.ps1 -Service Backend` | `./run/run.sh --backend` | `run\run.bat -Service Backend` | Runs only FastAPI Swarm (port 7433) |
| **Skip Python Pip Recheck** | `.\run\run.ps1 -SkipDeps` | `./run/run.sh --skip-deps` | `run\run.bat -SkipDeps` | Bypasses `pip install` check on startup |

---

## 🌐 Endpoints Map

| Service | Address | Description |
|---|---|---|
| **Frontend Web** | [`http://localhost:3000`](http://localhost:3000) | Next.js 14 Developer OS & UI |
| **Agent Swarm Dashboard** | [`http://localhost:3000/swarm`](http://localhost:3000/swarm) | Interactive Swarm Orchestration & Worker Mesh |
| **Swarm Backend API** | [`http://localhost:7433`](http://localhost:7433) | FastAPI Multi-Agent Bridge & ML Intelligence |
| **Interactive OpenAPI Docs** | [`http://localhost:7433/docs`](http://localhost:7433/docs) | Swagger UI for backend endpoints |
| **Next.js Swarm Health Proxy**| [`http://localhost:3000/api/agent-swarm/health`](http://localhost:3000/api/agent-swarm/health) | Health status bridge |

---

## 🛡️ Built-in Diagnostics & Features

1. **Pre-flight Health Checks**:
   - Validates Node.js (v18+) and npm.
   - Detects Python (3.11+) across `python`, `python3`, and `py`.
2. **Auto-Environment Setup**:
   - Detects or automatically provisions `backend/.venv`.
   - Automatically installs required dependencies from `backend/requirements.txt`.
3. **Port Conflict Detection**:
   - Checks availability of ports 3000 and 7433 before launch.
4. **Graceful Cleanup on Exit**:
   - Pressing `Ctrl+C` cleanly shuts down both background processes, preventing lingering background node/python instances.
