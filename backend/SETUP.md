# 🐝 Hive Backend — Setup & Agent API Guide

> **Project:** PrismSpace Web — `backend/`  
> **FastAPI bridge:** `hive_api.py` → runs on `http://localhost:7433`  
> **Frontend proxy:** Next.js routes at `/api/agent-swarm/**` → proxies to `localhost:7433`  
> **Hive runtime:** `backend/hive/` (aden-hive/hive repo)

---

## Table of Contents

1. [Prerequisites](#1-prerequisites)
2. [Project Structure](#2-project-structure)
3. [Step 1 — Create your `.env` file](#3-step-1--create-your-env-file)
4. [Step 2 — Start the Hive Bridge (FastAPI)](#4-step-2--start-the-hive-bridge-fastapi)
5. [Step 3 — Set up the Hive Runtime](#5-step-3--set-up-the-hive-runtime)
6. [Step 4 — Start the Next.js Frontend](#6-step-4--start-the-nextjs-frontend)
7. [Supported AI Providers & Models](#7-supported-ai-providers--models)
8. [API Reference](#8-api-reference)
9. [Testing the Setup](#9-testing-the-setup)
10. [Troubleshooting](#10-troubleshooting)

---

## 1. Prerequisites

| Requirement | Version | Check |
|---|---|---|
| Python | 3.11+ | `python --version` |
| Node.js | 18+ | `node --version` |
| npm | 9+ | `npm --version` |
| Git | any | `git --version` |
| uv *(optional, for Hive runtime)* | latest | `uv --version` |

Install `uv` (fast Python package manager used by Hive):

```powershell
# Windows (PowerShell)
winget install astral-sh.uv
# or
pip install uv
```

---

## 2. Project Structure

```
prismspace-web/
├── app/
│   └── api/
│       └── agent-swarm/          ← Next.js proxy routes to backend
│           ├── agents/
│           │   ├── route.ts      ← GET/POST /api/agent-swarm/agents
│           │   └── [id]/
│           │       ├── route.ts
│           │       ├── approve/route.ts
│           │       └── logs/route.ts
├── backend/
│   ├── hive_api.py               ← FastAPI bridge (port 7433)
│   ├── requirements.txt          ← Python deps for the bridge
│   ├── start.ps1                 ← One-click startup script (Windows)
│   ├── .env                      ← 🔑 YOUR API KEYS GO HERE (create this)
│   ├── .venv/                    ← Python virtual environment (auto-created)
│   └── hive/                     ← aden-hive/hive runtime (cloned repo)
│       ├── core/framework/       ← Hive agent engine
│       ├── quickstart.ps1        ← Hive runtime setup (Windows)
│       └── .hive/                ← Hive credential store
```

---

## 3. Step 1 — Create your `.env` file

Create the file `backend/.env` (it is already in `.gitignore` — **never commit this**):

```powershell
# Run from prismspace-web root
New-Item -Path "backend\.env" -ItemType File
```

Then open and paste **whichever keys you have**:

```env
# ────────────────────────────────────────────────────────
# backend/.env
# Paste your API keys below. You only need the ones you use.
# ────────────────────────────────────────────────────────

# ── OpenAI (GPT-4o, GPT-4.1, o3, etc.) ─────────────────
OPENAI_API_KEY=sk-...

# ── Anthropic (Claude 3.5 Sonnet, Claude 4, Haiku, etc.)
ANTHROPIC_API_KEY=sk-ant-...

# ── Google Gemini ────────────────────────────────────────
GEMINI_API_KEY=AIza...
GOOGLE_API_KEY=AIza...

# ── Groq (ultra-fast inference — LLaMA, Mixtral, Gemma) ─
GROQ_API_KEY=gsk_...

# ── OpenRouter (unified gateway for 100+ models) ─────────
OPENROUTER_API_KEY=sk-or-...

# ── DeepSeek ─────────────────────────────────────────────
DEEPSEEK_API_KEY=...

# ── Mistral ──────────────────────────────────────────────
MISTRAL_API_KEY=...

# ── Cerebras ─────────────────────────────────────────────
CEREBRAS_API_KEY=...

# ── Together AI ──────────────────────────────────────────
TOGETHER_API_KEY=...

# ────────────────────────────────────────────────────────
# Optional: override Hive Bridge base URL in Next.js
# Default is http://localhost:7433 (no change needed for local dev)
# HIVE_API_URL=http://localhost:7433
# ────────────────────────────────────────────────────────
```

> **Where to get keys:**
> - OpenAI → https://platform.openai.com/api-keys
> - Anthropic → https://console.anthropic.com/keys
> - Groq → https://console.groq.com/keys
> - Google Gemini → https://aistudio.google.com/app/apikey
> - OpenRouter → https://openrouter.ai/keys

---

## 4. Step 2 — Start the Hive Bridge (FastAPI)

The bridge is the FastAPI server in `hive_api.py` that the Next.js frontend talks to.

### Option A — One-click (Recommended)

```powershell
# Run from prismspace-web root
.\backend\start.ps1
```

This script automatically:
- Checks for Python 3.11+
- Creates/activates the `.venv` virtual environment
- Installs dependencies from `requirements.txt`
- Clones `aden-hive/hive` into `backend/hive/` if not present
- Starts the FastAPI server on **http://localhost:7433**

### Option B — Manual (step by step)

```powershell
# 1. Navigate to backend
cd backend

# 2. Create virtual environment
python -m venv .venv

# 3. Activate it
.\.venv\Scripts\Activate.ps1

# 4. Install Python dependencies
pip install -r requirements.txt

# 5. Start the server (development mode with auto-reload)
python hive_api.py

# OR production mode:
uvicorn hive_api:app --host 0.0.0.0 --port 7433
```

### Verify the bridge is running

```powershell
# Should return: {"status":"ok","version":"1.0.0","agents":0}
Invoke-RestMethod http://localhost:7433/health
```

---

## 5. Step 3 — Set up the Hive Runtime

The Hive runtime (`backend/hive/`) is the actual multi-agent execution engine.
It needs its own setup separate from the FastAPI bridge.

```powershell
# Navigate into the Hive repo
cd backend\hive

# Run the Hive quickstart (Windows PowerShell)
.\quickstart.ps1
```

The quickstart will:
1. Install `uv` if not present
2. Set up the Python virtual environment for the Hive engine
3. **Interactively ask you to select a provider and paste your API key**
4. Store the key in the **encrypted credential store** at `~/.hive/credentials`
5. Open the Hive dashboard in your browser

### Set keys manually (without quickstart)

```powershell
# Set for current PowerShell session only
$env:OPENAI_API_KEY    = "sk-..."
$env:GROQ_API_KEY      = "gsk_..."
$env:ANTHROPIC_API_KEY = "sk-ant-..."

# Then run Hive
cd backend\hive
.\hive.ps1 open
```

### Set keys permanently in Windows environment

```powershell
# Permanent user-level env vars (survives reboots)
[System.Environment]::SetEnvironmentVariable("OPENAI_API_KEY",    "sk-...",     "User")
[System.Environment]::SetEnvironmentVariable("GROQ_API_KEY",      "gsk_...",    "User")
[System.Environment]::SetEnvironmentVariable("ANTHROPIC_API_KEY", "sk-ant-...", "User")
[System.Environment]::SetEnvironmentVariable("GEMINI_API_KEY",    "AIza...",    "User")
```

---

## 6. Step 4 — Start the Next.js Frontend

```powershell
# From prismspace-web root (separate terminal from the backend)
npm install        # first time only
npm run dev
```

Open **http://localhost:3000** in your browser.

> The Next.js app proxies agent requests through `/api/agent-swarm/**` → `localhost:7433`.  
> The backend URL is controlled by the `HIVE_API_URL` env var (defaults to `http://localhost:7433`).

---

## 7. Supported AI Providers & Models

Hive uses **LiteLLM** internally — it supports 100+ models. Use these model strings when creating agents.

### OpenAI

| Model string | Description |
|---|---|
| `gpt-4o` | GPT-4o (default in hive_api.py) |
| `gpt-4o-mini` | Faster, cheaper |
| `gpt-4.1` | GPT-4.1 |
| `gpt-4.1-nano` | Lightweight |
| `o3` | Reasoning model |
| `o4-mini` | Fast reasoning |

### Anthropic

| Model string | Description |
|---|---|
| `claude-3-5-sonnet-20241022` | Claude 3.5 Sonnet |
| `claude-3-5-haiku-20241022` | Claude 3.5 Haiku (fast) |
| `claude-sonnet-4-5` | Claude Sonnet 4.5 |
| `claude-opus-4-5` | Most capable Claude |

### Google Gemini

| Model string | Description |
|---|---|
| `gemini/gemini-2.0-flash` | Fast, multimodal |
| `gemini/gemini-2.5-pro` | Most capable Gemini |
| `gemini/gemini-2.5-flash` | Best speed/quality ratio |

### Groq (Ultra-fast inference)

| Model string | Description |
|---|---|
| `groq/llama-3.3-70b-versatile` | LLaMA 3.3 70B — best quality |
| `groq/llama3-70b-8192` | LLaMA 3 70B |
| `groq/llama3-8b-8192` | LLaMA 3 8B — fastest |
| `groq/mixtral-8x7b-32768` | Mixtral 8x7B — long context |
| `groq/gemma2-9b-it` | Gemma 2 9B |
| `groq/deepseek-r1-distill-llama-70b` | DeepSeek R1 on Groq |

### OpenRouter (100+ models via one key)

| Model string | Description |
|---|---|
| `openrouter/meta-llama/llama-3.3-70b-instruct` | LLaMA 3.3 70B |
| `openrouter/deepseek/deepseek-r1` | DeepSeek R1 |
| `openrouter/mistralai/mistral-large` | Mistral Large |
| `openrouter/google/gemini-2.0-flash-exp` | Gemini 2.0 Flash |
| `openrouter/qwen/qwen-2.5-72b-instruct` | Qwen 2.5 72B |

### Local Models via Ollama

```powershell
# 1. Install Ollama
winget install Ollama.Ollama

# 2. Pull a model
ollama pull llama3
ollama pull mistral
ollama pull phi3

# 3. Start Ollama server (runs on http://localhost:11434)
ollama serve
```

Then use model strings like: `ollama/llama3`, `ollama/mistral`, `ollama/phi3`

---

## 8. API Reference

The FastAPI bridge exposes these endpoints. All are also accessible from the frontend via `/api/agent-swarm/**`.

Interactive docs available at: **http://localhost:7433/docs**

---

### `GET /health`
Check if the backend is running.
```powershell
Invoke-RestMethod http://localhost:7433/health
# → {"status":"ok","version":"1.0.0","agents":0}
```

---

### `GET /api/agents`
List all agents (newest first).
```powershell
Invoke-RestMethod http://localhost:7433/api/agents
```

---

### `POST /api/agents`
Create and start a new agent task.

```powershell
$body = @{
    objective     = "Research the latest trends in AI and summarize findings"
    model         = "groq/llama-3.3-70b-versatile"
    provider      = "groq"
    max_agents    = 3
    human_in_loop = $true
} | ConvertTo-Json

Invoke-RestMethod -Method Post `
    -Uri http://localhost:7433/api/agents `
    -ContentType "application/json" `
    -Body $body
```

**Request body fields:**

| Field | Type | Default | Description |
|---|---|---|---|
| `objective` | string | *required* | What you want the agents to do |
| `model` | string | `"gpt-4o"` | Model string (see Section 7) |
| `provider` | string | `"openai"` | `openai` \| `anthropic` \| `groq` \| `gemini` \| `openrouter` |
| `max_agents` | int | `3` | Number of parallel sub-agents to spawn |
| `human_in_loop` | bool | `true` | Pause for human approval before executing |

---

### `GET /api/agents/{id}`
Get full status of a specific agent.
```powershell
Invoke-RestMethod http://localhost:7433/api/agents/<agent-id>
```

**Agent status values:** `initialising` → `planning` → `awaiting_approval` → `running` → `completed` | `failed` | `cancelled`

---

### `POST /api/agents/{id}/approve`
Approve or reject an agent waiting at a human-in-the-loop checkpoint.
```powershell
# Approve
$body = @{ approved = $true; message = "Looks good, proceed" } | ConvertTo-Json
Invoke-RestMethod -Method Post `
    -Uri http://localhost:7433/api/agents/<agent-id>/approve `
    -ContentType "application/json" `
    -Body $body

# Reject
$body = @{ approved = $false; message = "Too risky" } | ConvertTo-Json
Invoke-RestMethod -Method Post `
    -Uri http://localhost:7433/api/agents/<agent-id>/approve `
    -ContentType "application/json" `
    -Body $body
```

---

### `GET /api/agents/{id}/logs`
Stream real-time agent logs via Server-Sent Events.
```powershell
# Poll all logs (since index 0)
Invoke-RestMethod "http://localhost:7433/api/agents/<agent-id>/logs?since=0"

# Poll only new logs (since last seen index)
Invoke-RestMethod "http://localhost:7433/api/agents/<agent-id>/logs?since=12"
```

---

### `DELETE /api/agents/{id}`
Remove an agent from the registry.
```powershell
Invoke-RestMethod -Method Delete http://localhost:7433/api/agents/<agent-id>
```

---

## 9. Testing the Setup

Run these in order to verify everything works end-to-end:

```powershell
# ── Terminal 1: Start Hive Bridge ──────────────────────────────
cd C:\Users\nobin\OneDrive\Documents\Projects\prismspace-web
.\backend\start.ps1

# ── Terminal 2: Start Frontend ──────────────────────────────────
cd C:\Users\nobin\OneDrive\Documents\Projects\prismspace-web
npm run dev

# ── Terminal 3: Run API tests ───────────────────────────────────

# 1. Health check
Invoke-RestMethod http://localhost:7433/health

# 2. Create a test agent (using Groq — fast & has a free tier)
$body = @{
    objective     = "List 3 key benefits of multi-agent AI systems"
    model         = "groq/llama3-8b-8192"
    provider      = "groq"
    max_agents    = 2
    human_in_loop = $false
} | ConvertTo-Json

$agent = Invoke-RestMethod -Method Post `
    -Uri http://localhost:7433/api/agents `
    -ContentType "application/json" `
    -Body $body

Write-Host "Agent created: $($agent.id)"

# 3. Wait and check status
Start-Sleep 3
$status = Invoke-RestMethod "http://localhost:7433/api/agents/$($agent.id)"
Write-Host "Status: $($status.status)"

# 4. Read logs
Invoke-RestMethod "http://localhost:7433/api/agents/$($agent.id)/logs?since=0"

# 5. List all agents
Invoke-RestMethod http://localhost:7433/api/agents
```

---

## 10. Troubleshooting

### ❌ `python` not found
```powershell
winget install Python.Python.3.11
# Restart PowerShell after install
```

### ❌ PowerShell script execution blocked
```powershell
Set-ExecutionPolicy -ExecutionPolicy RemoteSigned -Scope CurrentUser
```

### ❌ Port 7433 already in use
```powershell
# Find what's on the port
netstat -ano | findstr :7433
# Kill by PID
taskkill /PID <PID-HERE> /F
```

### ❌ Frontend shows "Agent Swarm backend unavailable"
- Confirm Hive Bridge is running: `Invoke-RestMethod http://localhost:7433/health`
- The backend **must** be on port **7433** (not 8000 — that's the Hive runtime dashboard)
- If you changed the port, set `HIVE_API_URL=http://localhost:<port>` in `prismspace-web/.env.local`

### ❌ API key not being loaded
- The `.env` file must be in `backend/` (same directory as `hive_api.py`)
- No spaces around `=` in the `.env` file: `GROQ_API_KEY=gsk_...` ✅
- Verify `python-dotenv` is installed: `pip show python-dotenv`

### ❌ `uv` not found during Hive quickstart
```powershell
pip install uv
# or
winget install astral-sh.uv
```

### ❌ Hive runtime not picking up API keys
```powershell
# Check if the env var is set at user level
[System.Environment]::GetEnvironmentVariable("GROQ_API_KEY", "User")

# Set it for the current session then rerun Hive
$env:GROQ_API_KEY = "gsk_..."
cd backend\hive
.\hive.ps1 open
```

---

## Full Start Sequence (Quick Reference)

```powershell
# ── Terminal 1: Hive Bridge API (FastAPI on :7433) ──────
cd C:\Users\nobin\OneDrive\Documents\Projects\prismspace-web
.\backend\start.ps1

# ── Terminal 2: Next.js Frontend (on :3000) ─────────────
cd C:\Users\nobin\OneDrive\Documents\Projects\prismspace-web
npm run dev

# ── Terminal 3 (optional): Hive Runtime Dashboard ────────
cd C:\Users\nobin\OneDrive\Documents\Projects\prismspace-web\backend\hive
.\hive.ps1 open
```

| Service | URL | Purpose |
|---|---|---|
| PrismSpace Frontend | http://localhost:3000 | Main UI |
| Hive Bridge API | http://localhost:7433 | FastAPI agent orchestrator |
| Hive API Swagger | http://localhost:7433/docs | Interactive API explorer |
| Hive Runtime UI | http://localhost:8000 | Hive's own dashboard |

---

*Setup guide for PrismSpace Web — backend v1.0.0*
