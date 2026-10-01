# Copyright 2026 Nobin Sijo (NobinSijo7T).
# SPDX-License-Identifier: Apache-2.0
"""
Hive Multi-Agent Backend Bridge
================================
A FastAPI server that sits between the PrismSpace Next.js frontend and the
aden-hive/hive Python runtime. Exposes a clean REST + SSE API so the
browser dashboard can control and observe Hive agent runs.

Run with:
    python hive_api.py          # development (auto-reload)
    uvicorn hive_api:app        # production

Requires: fastapi, uvicorn, hive (from aden-hive/hive clone)
"""

from __future__ import annotations

import asyncio
import glob
import json
import os
import pathlib
import re
import shlex
import sqlite3
import subprocess
import time
import uuid
import shutil
import stat
from datetime import datetime
from typing import AsyncGenerator, Optional

from dotenv import load_dotenv
from fastapi import FastAPI, HTTPException, BackgroundTasks
from fastapi import FastAPI, HTTPException, BackgroundTasks, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse
from pydantic import BaseModel, Field

from os_tools import DESTRUCTIVE_OS_TOOLS, execute_os_tool

# ML Model Inference
try:
    from model_inference import analyze_request as _ml_analyze, get_status as _ml_status
    _ML_AVAILABLE = True
except ImportError:
    _ML_AVAILABLE = False
    def _ml_analyze(text): return None
    def _ml_status(): return {"loaded": False, "models_count": 0, "models": []}

# Per-user Gmail OAuth (multi-user MCP)
try:
    import google_oauth as _gmail_oauth
    _GMAIL_OAUTH_AVAILABLE = True
except ImportError:
    _GMAIL_OAUTH_AVAILABLE = False
    _gmail_oauth = None  # type: ignore

# ---------------------------------------------------------------------------
# App setup
# ---------------------------------------------------------------------------

load_dotenv()  # Load API keys from .env

app = FastAPI(
    title="Hive Bridge API",
    description="Multi-Agent Harness for PrismSpace – powered by aden-hive/hive",
    version="1.0.0",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000", "http://localhost:3001"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ---------------------------------------------------------------------------
# In-memory store (replace with Hive's persistent storage in production)
# ---------------------------------------------------------------------------

# agent_id -> agent dict
_agents: dict[str, dict] = {}

# agent_id -> list of log lines
_logs: dict[str, list[str]] = {}

# Per-agent approval and cancellation state. These are intentionally kept out
# of the JSON agent object so API responses remain serializable.
_tool_approval_events: dict[str, asyncio.Event] = {}
_tool_approval_decisions: dict[str, bool] = {}
_active_operations: dict[str, subprocess.Popen] = {}
_cancelled_operations: set[str] = set()

TOOLS_DIR = os.path.join(os.path.dirname(__file__), "hive", "tools")
MCP_SERVERS_PATH = os.path.join(TOOLS_DIR, "mcp_servers.json")
TOOLS_ENV_PATH = os.path.join(TOOLS_DIR, ".env")

# Workspace root: parent of the backend directory (i.e. prismspace-web/)
WORKSPACE_ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
RUNTIME_EVENTS_PATH = pathlib.Path(WORKSPACE_ROOT) / "model" / "datasets" / "prismspace_runtime_events.jsonl"

# Hive backend directory (where most filesystem operations should happen by default)
HIVE_BACKEND_DIR = os.path.dirname(os.path.abspath(__file__))


def _record_runtime_event(agent: dict, request: "CreateAgentRequest", started: float) -> None:
    """Append a privacy-bounded training record for a completed PrismSpace run."""
    result = str(agent.get("result") or "")
    intelligence = agent.get("intelligence") or {}
    event = {
        "text": request.objective,
        "objective": request.objective,
        "selected_agents": intelligence.get("recommended_agent", "general"),
        "provider": request.provider,
        "recommended_provider": intelligence.get("recommended_provider", ""),
        "provider_confidence": intelligence.get("provider_confidence", ""),
        "model": request.model,
        "success": agent.get("status") == "completed",
        "status": agent.get("status"),
        "approval_required": request.human_in_loop,
        "approval_model_prediction": intelligence.get("approval_required", ""),
        "approval_confidence": intelligence.get("approval_confidence", ""),
        "success_prediction": intelligence.get("success_prediction", ""),
        "success_confidence": intelligence.get("success_confidence", ""),
        "latency_ms": round((time.perf_counter() - started) * 1000, 2),
        "token_cost": "",
        "retries": 0,
        "tool_failures": 0,
        "workflow_dag": agent.get("selected_agents", []),
        "accepted": result[:20_000] if agent.get("status") == "completed" else "",
        "rejected": result[:20_000] if agent.get("status") != "completed" else "",
        "_source": "prismspace_runtime",
        "recorded_at": datetime.utcnow().isoformat(),
    }
    try:
        RUNTIME_EVENTS_PATH.parent.mkdir(parents=True, exist_ok=True)
        with RUNTIME_EVENTS_PATH.open("a", encoding="utf-8") as handle:
            handle.write(json.dumps(event, ensure_ascii=False) + "\n")
    except OSError as exc:
        # Telemetry must never make an agent run fail.
        _log(agent.get("id", "runtime"), f"[WARN] Could not persist runtime telemetry: {exc}")

# ---------------------------------------------------------------------------
# Helper: Smart path resolution
# ---------------------------------------------------------------------------

def _resolve_path(raw_path: str, prefer_backend: bool = True) -> pathlib.Path:
    """
    Intelligently resolve a path provided by the LLM.
    
    If the path mentions 'backend' or starts with common backend-relative paths,
    resolve it relative to HIVE_BACKEND_DIR. Otherwise use WORKSPACE_ROOT.
    
    Args:
        raw_path: The path string from the LLM (can be relative or absolute)
        prefer_backend: If True, default to HIVE_BACKEND_DIR for relative paths
        
    Returns:
        Resolved absolute pathlib.Path
    """
    p = pathlib.Path(raw_path)
    
    # Already absolute - use as-is
    if p.is_absolute():
        return p
    
    # Path explicitly mentions backend
    if "backend" in raw_path:
        # Strip the backend prefix if present
        clean_path = raw_path.replace("backend/", "").replace("backend\\", "")
        return pathlib.Path(HIVE_BACKEND_DIR) / clean_path
    
    # Common backend-relative paths
    backend_indicators = ["test_", "hive/", ".env", "requirements.txt", "hive_api"]
    if any(indicator in raw_path for indicator in backend_indicators):
        return pathlib.Path(HIVE_BACKEND_DIR) / raw_path
    
    # Default behavior
    if prefer_backend:
        return pathlib.Path(HIVE_BACKEND_DIR) / raw_path
    else:
        return pathlib.Path(WORKSPACE_ROOT) / raw_path

# ---------------------------------------------------------------------------
# Pydantic models
# ---------------------------------------------------------------------------


class ChatContextMessage(BaseModel):
    role: str
    content: str


class CreateAgentRequest(BaseModel):
    objective: str
    model: str = "nvidia/nemotron-3.5-lightning-30b-a3b"  # NVIDIA NIM
    provider: str = "nvidia"           # nvidia | groq | openai | anthropic | google | openrouter | deepseek
    api_key: Optional[str] = None      # BYOK user key
    max_agents: int = 3
    human_in_loop: bool = True
    chat_history: list[ChatContextMessage] = Field(default_factory=list)
    user_id: Optional[str] = None  # per-user Gmail MCP owner (Google sub)
    worker_models: list[dict[str, str]] = Field(default_factory=list)


class ApproveAgentRequest(BaseModel):
    approved: bool
    message: Optional[str] = None


class McpTokenRequest(BaseModel):
    server_name: Optional[str] = None
    env_key: str
    token: str


class McpTokenRemoveRequest(BaseModel):
    server_name: Optional[str] = None
    env_key: str


# ---------------------------------------------------------------------------
# Helper: emit a log line to the in-memory log ring
# ---------------------------------------------------------------------------

def _log(agent_id: str, message: str) -> None:
    timestamp = datetime.utcnow().strftime("%H:%M:%S")
    entry = f"[{timestamp}] {message}"
    _logs.setdefault(agent_id, []).append(entry)


# ---------------------------------------------------------------------------
# LLM API call helpers
# ---------------------------------------------------------------------------

def _load_tools_env() -> dict:
    """Load environment variables from the tools .env file."""
    env_vars: dict = {}
    try:
        with open(TOOLS_ENV_PATH, encoding="utf-8") as f:
            for line in f:
                line = line.strip()
                if not line or line.startswith("#") or "=" not in line:
                    continue
                key, _, val = line.partition("=")
                env_vars[key.strip()] = val.strip()
    except FileNotFoundError:
        pass
    return env_vars


def _mask_token(value: str) -> str:
    if len(value) <= 8:
        return "••••"
    return f"{value[:4]}...{value[-4:]}"


DEFAULT_MCP_SERVERS = {
    "figma": {
        "transport": "stdio",
        "command": "npx",
        "args": ["-y", "@modelcontextprotocol/server-figma"],
        "description": "Inspect Figma design files, components, styles, design tokens, and export vector/raster assets.",
        "env": {"FIGMA_API_TOKEN": "${FIGMA_API_TOKEN}"},
    },
    "google_drive": {
        "transport": "stdio",
        "command": "npx",
        "args": ["-y", "@modelcontextprotocol/server-gdrive"],
        "description": "Search, read, create, and manage Google Docs, Sheets, Slides, and Drive folder structures.",
        "env": {"GOOGLE_DRIVE_CREDENTIALS": "${GOOGLE_DRIVE_CREDENTIALS}"},
    },
    "gmail": {
        "transport": "stdio",
        "command": "python",
        "args": ["google_oauth.py"],
        "description": "Read, draft, search, and send emails, process incoming notifications, and manage threads via Google OAuth.",
        "env": {"GMAIL_CLIENT_SECRET": "${GMAIL_CLIENT_SECRET}"},
    },
    "github": {
        "transport": "stdio",
        "command": "npx",
        "args": ["-y", "@modelcontextprotocol/server-github"],
        "description": "Access repositories, code trees, pull requests, issues, commits, branches, and code reviews.",
        "env": {"GITHUB_PERSONAL_ACCESS_TOKEN": "${GITHUB_PERSONAL_ACCESS_TOKEN}"},
    },
    "filesystem": {
        "transport": "stdio",
        "command": "npx",
        "args": ["-y", "@modelcontextprotocol/server-filesystem", "."],
        "description": "Local sandboxed workspace filesystem access: search, read, write, edit, and inspect directory trees.",
        "env": {"ALLOWED_DIRECTORIES": "${ALLOWED_DIRECTORIES}"},
    },
    "terminal": {
        "transport": "in-process",
        "command": "internal",
        "args": [],
        "description": "Run approved shell commands in the local workspace for search, builds, scripts, and file operations.",
        "env": {},
    },
    "sqlite": {
        "transport": "in-process",
        "command": "internal",
        "args": [],
        "description": "Structured local relational storage for persistence, telemetry, and fast queryable tables.",
        "env": {"SQLITE_DB_PATH": "${SQLITE_DB_PATH}"},
    },
    "memory": {
        "transport": "in-process",
        "command": "internal",
        "args": [],
        "description": "Cross-session key-value memory store for persisting facts, user preferences, and intermediate results.",
        "env": {},
    },
}


def _load_mcp_servers() -> dict:
    try:
        with open(MCP_SERVERS_PATH, "r", encoding="utf-8") as f:
            data = json.load(f)
            if data and isinstance(data, dict):
                return data
    except (FileNotFoundError, json.JSONDecodeError):
        pass

    try:
        _write_mcp_servers(DEFAULT_MCP_SERVERS)
    except Exception:
        pass
    return DEFAULT_MCP_SERVERS.copy()


def _write_mcp_servers(mcp_servers: dict) -> None:
    os.makedirs(TOOLS_DIR, exist_ok=True)
    with open(MCP_SERVERS_PATH, "w", encoding="utf-8") as f:
        json.dump(mcp_servers, f, indent=2)
        f.write("\n")


def _write_tools_env_value(key: str, value: str) -> None:
    os.makedirs(TOOLS_DIR, exist_ok=True)
    lines: list[str] = []
    if os.path.exists(TOOLS_ENV_PATH):
        with open(TOOLS_ENV_PATH, encoding="utf-8") as f:
            lines = f.read().splitlines()

    next_line = f"{key}={value}"
    found = False
    for index, line in enumerate(lines):
        if line.strip().startswith(f"{key}="):
            lines[index] = next_line
            found = True
            break

    if not found:
        if lines and lines[-1].strip():
            lines.append("")
        lines.append(next_line)

    with open(TOOLS_ENV_PATH, "w", encoding="utf-8") as f:
        f.write("\n".join(lines).rstrip() + "\n")

    os.environ[key] = value


def _extract_env_key(env_value: str) -> str:
    if env_value.startswith("${") and env_value.endswith("}"):
        return env_value[2:-1]
    return env_value


def _build_system_prompt() -> str:
    """Build a context-aware system prompt that enforces strict ReAct behavior."""
    base = (
        "You are Hive, an autonomous AI operating inside the Hive platform (version 2.0). "
        "Your responsibility is to understand user intent, plan tasks, reason through problems, "
        "invoke MCP tools when required, and deliver accurate results while maintaining project context.\n\n"
        
        "# ⚠️ CRITICAL: STRICT REACT EXECUTION PROTOCOL ⚠️\n\n"
        
        "You MUST follow the ReAct pattern (Reason → Act → STOP → Observe) for EVERY interaction:\n\n"
        
        "1. **REASON** (optional, brief): Think about what needs to be done\n"
        "2. **ACT**: If you need information, output EXACTLY ONE tool call in this format:\n"
        "```json\n"
        '{"tool": "tool_name", "arguments": {"arg1": "value1", "arg2": "value2"}}\n'
        "```\n"
        "3. **STOP IMMEDIATELY**: After outputting the tool call JSON, you MUST STOP generating text.\n"
        "   - DO NOT write 'I will now...'\n"
        "   - DO NOT write 'This will help me...'\n"
        "   - DO NOT describe what the tool will do\n"
        "   - DO NOT imagine or fabricate tool results\n"
        "   - DO NOT write a summary of expected outcomes\n"
        "   - Your generation MUST END immediately after the closing ```\n\n"
        
        "4. **OBSERVE**: Wait for the system to return the ACTUAL tool execution results\n"
        "5. **RESPOND**: Only after receiving real tool results, synthesize your final answer\n\n"
        
        "## ❌ FORBIDDEN BEHAVIORS ❌\n\n"
        
        "You are ABSOLUTELY FORBIDDEN from:\n"
        "- Hallucinating or imagining tool execution results\n"
        "- Writing fake execution summaries like 'I have successfully moved 5 files...'\n"
        "- Continuing to write text after emitting a tool call\n"
        "- Describing what a tool 'will do' - just call it and STOP\n"
        "- Outputting multiple tool calls in a single response (call one, wait for result, then call next if needed)\n"
        "- Mixing tool calls with prose explanations in the same response\n\n"
        
        "## ✅ CORRECT BEHAVIOR EXAMPLES\n\n"
        
        "### Example 1: Single Tool Call (CORRECT)\n"
        "User: 'List all TypeScript files in the project'\n"
        "You:\n"
        "```json\n"
        '{"tool": "search_files", "arguments": {"pattern": "*.tsx", "target": "files"}}\n'
        "```\n"
        "[STOP - wait for system to return results]\n\n"
        
        "### Example 2: Response After Tool Result (CORRECT)\n"
        "System: 'Tool result: Found 12 files: App.tsx, Header.tsx, ...'\n"
        "You: 'I found 12 TypeScript files in your project: App.tsx, Header.tsx, ... [provide analysis]'\n\n"
        
        "### Example 3: No Tool Needed (CORRECT)\n"
        "User: 'What is React?'\n"
        "You: 'React is a JavaScript library for building user interfaces... [provide answer]'\n\n"
        
        "## ❌ INCORRECT BEHAVIOR EXAMPLES\n\n"
        
        "### Example 1: Hallucinated Results (WRONG)\n"
        "User: 'List all TypeScript files'\n"
        "You: 'I have searched the project and found 12 TypeScript files: App.tsx, Header.tsx, ...' ❌\n"
        "[This is FORBIDDEN - you never actually called the tool!]\n\n"
        
        "### Example 2: Continuing After Tool Call (WRONG)\n"
        "```json\n"
        '{"tool": "search_files", "arguments": {"pattern": "*.tsx"}}\n'
        "```\n"
        "This will help me find all TypeScript files in the project. ❌\n"
        "[This is FORBIDDEN - you must STOP after the tool call!]\n\n"
        
        "## Tool Call Format Rules\n\n"
        "- Use ONLY the JSON format shown above\n"
        "- DO NOT use XML tags like <tool_call>\n"
        "- DO NOT use function call syntax like tool_name(arg1, arg2)\n"
        "- Output EXACTLY one tool call per response when tools are needed\n"
        "- The JSON must be wrapped in ```json and ``` markers\n\n"
        
        "## Core Objectives\n"
        "- Understand user intent before acting\n"
        "- Use MCP tools when you need information you don't have\n"
        "- NEVER fake or guess tool results - always wait for real execution\n"
        "- Provide accurate, complete answers based on actual tool results\n"
        "- Maintain context throughout the session\n\n"
    )

    # Load MCP server info
    tools_env = _load_tools_env()

    try:
        mcp_servers = _load_mcp_servers()

        if mcp_servers:
            base += "## Initialized MCP Tool Servers (LIVE & READY)\n"
            base += (
                "The following MCP (Model Context Protocol) servers are **fully initialized and ready to use**. "
                "You are NOT speculating — these tools are real, configured, and available right now.\n\n"
            )
            for name, config in mcp_servers.items():
                desc = config.get("description", "No description")
                transport = config.get("transport", "unknown")
                command = config.get("command", "")
                args = " ".join(config.get("args", []))

                # Resolve env var references like ${VAR_NAME} to their actual values
                env_config = config.get("env", {})
                resolved_env: dict = {}
                for env_key, env_val in env_config.items():
                    # Replace ${VAR} placeholders with actual values from tools .env
                    if env_val.startswith("${") and env_val.endswith("}"):
                        var_name = env_val[2:-1]
                        actual = tools_env.get(var_name) or os.environ.get(var_name, "")
                        resolved_env[env_key] = "✓ SET" if actual else "✗ NOT SET"
                    else:
                        resolved_env[env_key] = "✓ SET" if env_val else "✗ NOT SET"

                base += f"### `{name}` ({transport})\n"
                base += f"**Description:** {desc}\n"
                base += f"**Command:** `{command} {args}`\n"
                if resolved_env:
                    env_status = ", ".join(f"{k}: {v}" for k, v in resolved_env.items())
                    base += f"**Credentials:** {env_status}\n"

                # Add server-specific capability details
                if name == "figma":
                    figma_token_set = resolved_env.get("FIGMA_API_TOKEN", "✗ NOT SET")
                    base += f"\n**Figma MCP is ACTIVE** (API Token: {figma_token_set})\n"
                    base += "You can use the Figma MCP to:\n"
                    base += "- Read Figma file contents, pages, and frames by file key\n"
                    base += "- List and inspect components, component sets, and variants\n"
                    base += "- Read styles (colors, text, effects, grids)\n"
                    base += "- Read variables and variable collections\n"
                    base += "- Get dev mode specs: measurements, CSS properties, assets\n"
                    base += "- Export assets (SVG, PNG) from Figma nodes\n"
                    base += "- Answer questions about any Figma design given a file URL or key\n"
                    base += "\nTo use Figma tools, the user provides a Figma file URL like:\n"
                    base += "  `https://www.figma.com/file/ABC123/MyDesign`\n"
                    base += "The file key is the `ABC123` portion after `/file/`.\n"
                elif name == "google_drive":
                    gdrive_token_set = resolved_env.get("GOOGLE_DRIVE_CREDENTIALS", "✗ NOT SET")
                    base += f"\n**Google Drive MCP is ACTIVE** (Credentials: {gdrive_token_set})\n"
                    base += "You can use the Google Drive MCP to:\n"
                    base += "- Search files and folders: `gdrive_search(query)`\n"
                    base += "- Read Google Docs and Sheets: `gdrive_read(file_id)`\n"
                    base += "- Create files and upload docs: `gdrive_create(name, content, mime_type)`\n"
                    base += "- List folders and tree structures: `gdrive_list(folder_id)`\n"
                elif name == "github":
                    github_token_set = resolved_env.get("GITHUB_PERSONAL_ACCESS_TOKEN", "✗ NOT SET")
                    base += f"\n**GitHub MCP is ACTIVE** (Token: {github_token_set})\n"
                    base += "You can use the GitHub MCP to:\n"
                    base += "- Inspect repository overview and stats: `github_get_repo(owner, repo)`\n"
                    base += "- Search code across repositories: `github_search_code(query)`\n"
                    base += "- List and review issues: `github_list_issues(owner, repo, state)`\n"
                    base += "- Create pull requests with patches: `github_create_pr(owner, repo, title, head, base)`\n"
                    base += "- Inspect commits and diffs: `github_get_commit(owner, repo, commit_sha)`\n"
                elif name == "hive_tools":
                    base += "\n**Hive Tools MCP is ACTIVE**\n"
                    base += "You can use: web_search, web_scrape, send_email, and data tools.\n"
                elif name == "filesystem":
                    base += "\n**Filesystem MCP is ACTIVE**\n"
                    base += "You have full read/write access to local files via these tools:\n"
                    base += "- `read_file(path)` — Read the full contents of any file\n"
                    base += "- `write_file(path, content)` — Create or overwrite a file with new content\n"
                    base += "- `search_files(pattern, target)` — Search for text patterns in files (grep) or find files by name (find/ls)\n"
                    base += "  - `target='content'` — grep-style content search\n"
                    base += "  - `target='files'` — filename/path search\n"
                    base += "- `edit_file(path, mode, ...)` — Modify existing files:\n"
                    base += "  - `mode='replace'` — fuzzy find/replace in a single file\n"
                    base += "  - `mode='patch'` — apply structured multi-file patches\n"
                    base += "- `create_directory(path)` — Create a new directory and its parents\n"
                    base += "- `delete_file(path, recursive)` — Delete a file or directory tree (blocks critical paths)\n"
                    base += "- `move_file(source, destination)` — Move or rename a file or directory\n"
                    base += "- `copy_file(source, destination)` — Copy a file or directory using Robocopy on Windows or rsync on Linux/macOS\n"
                    base += "- `list_directory_tree(path, max_depth)` — Get a hierarchical tree view of a directory\n"
                    base += "- `get_file_metadata(path)` — Get file size, permissions, and timestamps\n"
                    base += "\nUse the Filesystem Agent to read project files, generate code, apply edits, "
                    base += "organize directories, and inspect file structures without leaving the agent run.\n"
                elif name == "terminal":
                    base += "\n**Terminal is ACTIVE**\n"
                    base += "You can run local shell commands in the workspace when filesystem tools are not enough.\n"
                    base += "- `terminal(command, cwd, timeout)` — Run a command and return exit code, stdout, and stderr\n"
                    base += "- Commands run from the workspace root by default; `cwd` may be a workspace-relative directory\n"
                    base += "- Use terminal for repository search, builds, tests, scripts, archive operations, and file moves/deletes\n"
                    base += "- Keep commands focused and do not claim success until the real result is returned\n"
                    base += "Structured OS tools are also available: system_info, disk_usage, list_processes, process_status, stop_process, restart_process, list_services, service_status, start_service, stop_service, restart_service, package_manager, install_package, get_environment, set_environment, remove_environment, create_archive, extract_archive, get_permissions, set_permissions, list_scheduled_tasks, create_scheduled_task, delete_scheduled_task, run_scheduled_task, ping_host, and dns_lookup.\n"
                elif name == "sqlite":
                    sqlite_db = resolved_env.get("SQLITE_DB_PATH", "✗ NOT SET")
                    base += f"\n**SQLite MCP is ACTIVE** (Database: {sqlite_db})\n"
                    base += "You can query and manage the configured SQLite database via these tools:\n"
                    base += "- `read_query(sql)` — Execute a SELECT query and return results as JSON rows\n"
                    base += "- `write_query(sql)` — Execute INSERT, UPDATE, DELETE, or DDL statements\n"
                    base += "- `list_tables()` — List all tables in the database\n"
                    base += "- `describe_table(table)` — Return column names, types, and constraints for a table\n"
                    base += "- `create_table(sql)` — Create a new table with a CREATE TABLE statement\n"
                    base += "\nUse the Database Agent with these tools to store agent results, query structured data, "
                    base += "build schemas, and persist information across sessions.\n"
                elif name == "memory":
                    base += "\n**Memory MCP is ACTIVE**\n"
                    base += "You have access to a persistent key-value memory store that survives across sessions:\n"
                    base += "- `set_memory(key, value)` — Store a value under a named key (overwrites if exists)\n"
                    base += "- `get_memory(key)` — Retrieve the value stored under a key\n"
                    base += "- `list_memory()` — List all stored memory keys\n"
                    base += "- `delete_memory(key)` — Remove a stored memory entry\n"
                    base += "\nUse the Memory Agent to:\n"
                    base += "- Remember user preferences, project context, and past decisions\n"
                    base += "- Store intermediate results between agent runs\n"
                    base += "- Maintain a knowledge base that grows over time\n"
                    base += "- Recall facts without re-fetching them from external sources\n"


                base += "\n"

            base += (
                "When a user asks what you can do, explicitly mention these live MCP integrations. "
                "When a user provides a Figma link, use the Figma MCP to read and analyze it. "
                "Do NOT say you don't have access to these tools — they are initialized and ready.\n"
            )
    except (FileNotFoundError, json.JSONDecodeError):
        pass  # No MCP config found, use base prompt

    # Per-user Gmail MCP is always available via OAuth (not mcp_servers.json)
    base += (
        "\n## Gmail MCP (per-user OAuth, LIVE)\n"
        "The user has connected their own Google account via OAuth. Use these tools when asked about email:\n"
        '- `gmail_list_messages(query, max_results)` — e.g. {"tool":"gmail_list_messages","arguments":{"query":"is:unread","max_results":5}}\n'
        '- `gmail_get_message(message_id, format)` — format metadata|full|minimal\n'
        '- `gmail_list_labels()` — list INBOX/SENT/etc.\n'
        '- `send_email(to, subject, body)` — sends a real email via the user\'s Gmail; use for send requests\n'
        "Emit exactly one JSON tool call then STOP.\n\n"
    )

    return base


def _normalise_chat_history(chat_history: list[ChatContextMessage]) -> list[dict[str, str]]:
    """Return the compact user/assistant history accepted by chat providers."""
    messages: list[dict[str, str]] = []
    for item in chat_history[-16:]:
        role = item.role if item.role in ("user", "assistant") else "user"
        content = item.content.strip()
        if content:
            messages.append({"role": role, "content": content[:6000]})
    return messages


async def _call_groq(
    model: str, 
    objective: str, 
    chat_history: list[ChatContextMessage] | list[dict[str, str]],
    api_key: Optional[str] = None
) -> str:
    """Call Groq API with stop sequences to enforce ReAct pattern."""
    from groq import AsyncGroq
    key = api_key or os.environ.get("GROQ_API_KEY")
    if not key:
        raise ValueError("GROQ_API_KEY is not configured. Please provide your Groq API key (BYOK).")
    client = AsyncGroq(api_key=key)
    
    # Handle both ChatContextMessage objects and raw dicts
    if chat_history and isinstance(chat_history[0], dict):
        messages = chat_history
    else:
        messages = _normalise_chat_history(chat_history)
    
    # Build final message list
    final_messages = [{"role": "system", "content": _build_system_prompt()}]
    final_messages.extend(messages)
    
    # Add objective as user message if provided
    if objective:
        final_messages.append({"role": "user", "content": objective})
    
    response = await client.chat.completions.create(
        model=model,
        messages=final_messages,
        temperature=0.7,
        max_tokens=4096,
        stop=["```\n\n", "```\n", "\n\n\n"],  # Stop after tool call code blocks
    )
    return response.choices[0].message.content or "(No response generated)"


async def _call_openai(
    model: str, 
    objective: str, 
    chat_history: list[ChatContextMessage] | list[dict[str, str]],
    api_key: Optional[str] = None
) -> str:
    """Call OpenAI API with stop sequences to enforce ReAct pattern."""
    from openai import AsyncOpenAI
    key = api_key or os.environ.get("OPENAI_API_KEY")
    if not key:
        raise ValueError("OPENAI_API_KEY is not configured. Please provide your OpenAI API key (BYOK).")
    client = AsyncOpenAI(api_key=key)
    
    # Handle both ChatContextMessage objects and raw dicts
    if chat_history and isinstance(chat_history[0], dict):
        messages = chat_history
    else:
        messages = _normalise_chat_history(chat_history)
    
    # Build final message list
    final_messages = [{"role": "system", "content": _build_system_prompt()}]
    final_messages.extend(messages)
    
    # Add objective as user message if provided
    if objective:
        final_messages.append({"role": "user", "content": objective})
    
    response = await client.chat.completions.create(
        model=model,
        messages=final_messages,
        temperature=0.7,
        max_tokens=4096,
        stop=["```\n\n", "```\n", "\n\n\n"],  # Stop after tool call code blocks
    )
    return response.choices[0].message.content or "(No response generated)"


async def _call_anthropic(
    model: str, 
    objective: str, 
    chat_history: list[ChatContextMessage] | list[dict[str, str]],
    api_key: Optional[str] = None
) -> str:
    """Call Anthropic API with stop sequences to enforce ReAct pattern."""
    import anthropic
    key = api_key or os.environ.get("ANTHROPIC_API_KEY")
    if not key:
        raise ValueError("ANTHROPIC_API_KEY is not configured. Please provide your Anthropic API key (BYOK).")
    client = anthropic.AsyncAnthropic(api_key=key)
    
    # Handle both ChatContextMessage objects and raw dicts
    if chat_history and isinstance(chat_history[0], dict):
        messages = chat_history
    else:
        messages = _normalise_chat_history(chat_history)
    
    # Build final message list (Anthropic doesn't include system in messages array)
    final_messages = list(messages)
    
    # Add objective as user message if provided
    if objective:
        final_messages.append({"role": "user", "content": objective})
    
    response = await client.messages.create(
        model=model,
        max_tokens=4096,
        system=_build_system_prompt(),
        messages=final_messages,
        stop_sequences=["```\n\n", "```\n", "\n\n\n"],  # Stop after tool call code blocks
    )
    return response.content[0].text if response.content else "(No response generated)"


async def _call_google(
    model: str, 
    objective: str, 
    chat_history: list[ChatContextMessage] | list[dict[str, str]],
    api_key: Optional[str] = None
) -> str:
    """Call Google Gemini API and return the response text."""
    from google import genai
    key = api_key or os.environ.get("GEMINI_API_KEY") or os.environ.get("GOOGLE_API_KEY")
    if not key:
        raise ValueError("GEMINI_API_KEY is not configured. Please provide your Google Gemini API key (BYOK).")
    client = genai.Client(api_key=key)
    
    # Handle both ChatContextMessage objects and raw dicts
    if chat_history and isinstance(chat_history[0], dict):
        messages = chat_history
    else:
        messages = _normalise_chat_history(chat_history)
    
    history_text = "\n".join(
        f"{message['role'].title()}: {message['content']}"
        for message in messages
    )
    full_prompt = _build_system_prompt()
    if history_text:
        full_prompt += "\n\n## Previous Chat Context\n" + history_text
    
    if objective:
        full_prompt += "\n\n---\n\nUser request: " + objective
    
    response = await client.aio.models.generate_content(
        model=model,
        contents=full_prompt,
    )
    return response.text or "(No response generated)"


async def _call_nvidia(
    model: str,
    objective: str,
    chat_history: list[ChatContextMessage] | list[dict[str, str]],
    api_key: Optional[str] = None
) -> str:
    """Call NVIDIA NIM API (OpenAI-compatible) for nvidia/nemotron-3.5-lightning-30b-a3b with thinking."""
    from openai import AsyncOpenAI
    key = api_key or os.environ.get("NVIDIA_API_KEY", "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")
    client = AsyncOpenAI(
        base_url="https://integrate.api.nvidia.com/v1",
        api_key=key,
    )

    # Retired models -> remap to Lightning (nemotron-3-nano EOL 2026-09-01, gemma-4 too slow)
    if not model or any(s in (model or "") for s in ("nemotron-3-nano", "glm-5", "gemma-4")):
        model = "nvidia/nemotron-3.5-lightning-30b-a3b"
    
    # Handle both ChatContextMessage objects and raw dicts
    if chat_history and isinstance(chat_history[0], dict):
        messages = chat_history
    else:
        messages = _normalise_chat_history(chat_history)
    
    # Build final message list
    final_messages = [{"role": "system", "content": _build_system_prompt()}]
    final_messages.extend(messages)
    
    # Add objective as user message if provided
    if objective:
        final_messages.append({"role": "user", "content": objective})
    
    chunks: list[str] = []
    stream = await client.chat.completions.create(
        model=model,
        messages=final_messages,
        temperature=1,
        top_p=0.95,
        max_tokens=16384,
        extra_body={"chat_template_kwargs": {"enable_thinking": True}, "reasoning_budget": 16384},
        stop=["```\n\n", "```\n", "\n\n\n"],  # Stop after tool call code blocks
        stream=True,
    )
    async for chunk in stream:
        if not chunk.choices:
            continue
        delta = chunk.choices[0].delta
        # reasoning_content is thinking trace — skip it, only tool-call content matters
        if getattr(delta, "content", None) is not None:
            chunks.append(delta.content)
    result = "".join(chunks)
    return result if result.strip() else "(No response generated)"


async def _call_openrouter(
    model: str,
    objective: str,
    chat_history: list[ChatContextMessage] | list[dict[str, str]],
    api_key: Optional[str] = None
) -> str:
    """Call OpenRouter unified API."""
    from openai import AsyncOpenAI
    key = api_key or os.environ.get("OPENROUTER_API_KEY")
    if not key:
        raise ValueError("OPENROUTER_API_KEY is not configured. Please provide your OpenRouter API key (BYOK).")
    
    clean_model = model.removeprefix("openrouter/") if model.startswith("openrouter/") else model

    client = AsyncOpenAI(
        base_url="https://openrouter.ai/api/v1",
        api_key=key,
        default_headers={
            "HTTP-Referer": "https://prismspace.app",
            "X-Title": "PrismSpace",
        },
    )

    if chat_history and isinstance(chat_history[0], dict):
        messages = chat_history
    else:
        messages = _normalise_chat_history(chat_history)

    final_messages = [{"role": "system", "content": _build_system_prompt()}]
    final_messages.extend(messages)

    if objective:
        final_messages.append({"role": "user", "content": objective})

    response = await client.chat.completions.create(
        model=clean_model,
        messages=final_messages,
        temperature=0.7,
        max_tokens=4096,
        stop=["```\n\n", "```\n", "\n\n\n"],
    )
    return response.choices[0].message.content or "(No response generated)"


async def _call_deepseek(
    model: str,
    objective: str,
    chat_history: list[ChatContextMessage] | list[dict[str, str]],
    api_key: Optional[str] = None
) -> str:
    """Call DeepSeek native API."""
    from openai import AsyncOpenAI
    key = api_key or os.environ.get("DEEPSEEK_API_KEY")
    if not key:
        raise ValueError("DEEPSEEK_API_KEY is not configured. Please provide your DeepSeek API key (BYOK).")
    client = AsyncOpenAI(
        base_url="https://api.deepseek.com",
        api_key=key,
    )

    if chat_history and isinstance(chat_history[0], dict):
        messages = chat_history
    else:
        messages = _normalise_chat_history(chat_history)

    final_messages = [{"role": "system", "content": _build_system_prompt()}]
    final_messages.extend(messages)

    if objective:
        final_messages.append({"role": "user", "content": objective})

    response = await client.chat.completions.create(
        model=model,
        messages=final_messages,
        temperature=0.7,
        max_tokens=4096,
        stop=["```\n\n", "```\n", "\n\n\n"],
    )
    return response.choices[0].message.content or "(No response generated)"


# ---------------------------------------------------------------------------
# Tool execution engine — parse & run MCP tool calls from LLM responses
# ---------------------------------------------------------------------------

_TOOL_CALL_RE = re.compile(
    r'```(?:json)?\s*(\{.*?\})\s*```|({\s*"tool"\s*:\s*"[^"]+".*?})',
    re.DOTALL,
)


def _parse_tool_calls(text: str) -> list[dict]:
    """Extract tool-call objects from an LLM response.

    Handles three formats emitted by different model families:
      1. Fenced JSON code blocks:  ```json {"tool": "...", "arguments": {...}} ```
      2. Bare JSON objects:        {"tool": "...", "arguments": {...}}
      3. XML tool_call blocks:     <tool_call><function=name><parameter=k>v</parameter></function></tool_call>
    """
    calls: list[dict] = []
    seen: set[str] = set()

    def _add(obj: dict) -> None:
        key = json.dumps(obj, sort_keys=True)
        if key not in seen:
            seen.add(key)
            calls.append(obj)

    # ------------------------------------------------------------------
    # Strategy 1: fenced JSON code blocks
    # ------------------------------------------------------------------
    for m in re.finditer(r'```(?:json)?\s*([\s\S]*?)```', text):
        raw = m.group(1).strip()
        try:
            obj = json.loads(raw)
            if isinstance(obj, dict) and "tool" in obj:
                _add(obj)
        except json.JSONDecodeError:
            pass

    # ------------------------------------------------------------------
    # Strategy 2: bare JSON objects anywhere in the text
    # ------------------------------------------------------------------
    if not calls:
        for m in re.finditer(r'\{[^{}]*(?:\{[^{}]*\}[^{}]*)*\}', text, re.DOTALL):
            try:
                obj = json.loads(m.group())
                if isinstance(obj, dict) and "tool" in obj and "arguments" in obj:
                    _add(obj)
            except json.JSONDecodeError:
                pass

    # ------------------------------------------------------------------
    # Strategy 3: XML-style <tool_call> blocks
    # e.g.:
    #   <tool_call>
    #   <function=search_files>
    #   <parameter=pattern>*.tsx</parameter>
    #   <parameter=target>files</parameter>
    #   </function>
    #   </tool_call>
    # ------------------------------------------------------------------
    if not calls:
        for block in re.finditer(
            r'<tool_call>\s*([\s\S]*?)\s*</tool_call>', text, re.IGNORECASE
        ):
            block_text = block.group(1)

            # Extract function name from <function=name> tag
            fn_match = re.search(r'<function[=\s]+([^\s>]+)', block_text, re.IGNORECASE)
            if not fn_match:
                continue
            tool_name = fn_match.group(1).strip().rstrip('>')

            # Extract all <parameter=key>value</parameter> pairs
            arguments: dict[str, str] = {}
            for p in re.finditer(
                r'<parameter[=\s]+([^\s>]+)\s*>\s*([\s\S]*?)\s*</parameter>',
                block_text, re.IGNORECASE
            ):
                param_key = p.group(1).strip().rstrip('>')
                param_val = p.group(2).strip()
                arguments[param_key] = param_val

            _add({"tool": tool_name, "arguments": arguments})

    return calls



def _exec_search_files(args: dict) -> str:
    """Execute search_files tool: find files by name pattern or grep content."""
    pattern = args.get("pattern", "*")
    target = args.get("target", "files")
    search_path = args.get("path", None)
    root = pathlib.Path(search_path) if search_path else pathlib.Path(WORKSPACE_ROOT)

    if target == "files":
        matches = sorted(root.rglob(pattern))
        files = [
            str(m.relative_to(root))
            for m in matches
            if m.is_file() and ".git" not in m.parts and "node_modules" not in m.parts
               and ".next" not in m.parts and ".venv" not in m.parts
        ]
        listing = "\n".join(files[:200])
        extra = f"\n... ({len(files) - 200} more not shown)" if len(files) > 200 else ""
        return f"Found {len(files)} file(s) matching '{pattern}' under '{root}':\n{listing}{extra}"

    # target == 'content' — grep
    results: list[str] = []
    for f in root.rglob("*"):
        if not f.is_file():
            continue
        if any(p in f.parts for p in (".git", "node_modules", ".next", ".venv")):
            continue
        try:
            text = f.read_text(encoding="utf-8", errors="ignore")
            if pattern in text:
                results.append(str(f.relative_to(root)))
        except OSError:
            pass
    listing = "\n".join(results[:200])
    return f"Found '{pattern}' in {len(results)} file(s):\n{listing}"


def _exec_read_file(args: dict) -> str:
    """Execute read_file tool."""
    raw_path = args.get("path", "")
    p = _resolve_path(raw_path)
    try:
        content = p.read_text(encoding="utf-8", errors="ignore")
        lines = content.splitlines()
        preview = "\n".join(lines[:300])
        tail = f"\n... ({len(lines) - 300} more lines)" if len(lines) > 300 else ""
        return f"--- {p} ({len(lines)} lines) ---\n{preview}{tail}"
    except OSError as exc:
        return f"Error reading '{raw_path}' (resolved to {p}): {exc}"


def _exec_write_file(args: dict) -> str:
    """Execute write_file tool."""
    raw_path = args.get("path", "")
    content = args.get("content", "")
    p = _resolve_path(raw_path)
    try:
        p.parent.mkdir(parents=True, exist_ok=True)
        p.write_text(content, encoding="utf-8")
        return f"Successfully wrote {len(content)} chars to '{p}'"
    except OSError as exc:
        return f"Error writing '{raw_path}': {exc}"


def _exec_create_directory(args: dict) -> str:
    raw_path = args.get("path", "")
    p = _resolve_path(raw_path)
    try:
        p.mkdir(parents=True, exist_ok=True)
        return f"Successfully created directory: {raw_path} (at {p})"
    except Exception as e:
        return f"Error creating directory '{raw_path}': {e}"


def _exec_delete_file(args: dict) -> str:
    raw_path = args.get("path", "")
    recursive = args.get("recursive", False)
    
    # Use smart path resolution
    p = _resolve_path(raw_path)
        
    parts = p.parts
    if any(part in (".git", "node_modules", ".next", ".venv") for part in parts):
        return f"Error: Deletion of critical directory '{raw_path}' is blocked for safety."
        
    if not p.exists():
        return f"Error: Path not found: {raw_path} (resolved to: {p})"
        
    try:
        if p.is_dir():
            if not recursive:
                return f"Error: '{raw_path}' is a directory. Use recursive=True to delete."
            shutil.rmtree(p)
            return f"Successfully deleted directory tree: {raw_path} (at {p})"
        else:
            p.unlink()
            return f"Successfully deleted file: {raw_path} (at {p})"
    except Exception as e:
        return f"Error deleting path '{raw_path}': {e}"


def _transfer_log(agent_id: Optional[str], message: str) -> None:
    if agent_id:
        _log(agent_id, f"[TRANSFER] {message}")


def _display_command(command: list[str]) -> str:
    return subprocess.list2cmdline(command) if os.name == "nt" else shlex.join(command)


def _run_transfer_command(
    command: list[str],
    operation: str,
    agent_id: Optional[str],
    timeout: int,
) -> tuple[int, str]:
    """Run a copy utility while forwarding progress lines into the agent log."""
    _transfer_log(agent_id, f"{operation} command: {_display_command(command)}")
    try:
        process = subprocess.Popen(
            command,
            stdout=subprocess.PIPE,
            stderr=subprocess.STDOUT,
            text=True,
            encoding="utf-8",
            errors="replace",
            bufsize=1,
        )
    except OSError as exc:
        return -1, str(exc)

    if agent_id:
        _active_operations[agent_id] = process

    output: list[str] = []
    started = time.monotonic()
    last_progress = -1
    try:
        if process.stdout:
            for raw_line in process.stdout:
                line = raw_line.strip()
                if not line:
                    continue
                output.append(line)
                match = re.search(r"(?<!\d)(\d{1,3})%", line)
                if match:
                    progress = min(100, int(match.group(1)))
                    if progress != last_progress:
                        _transfer_log(agent_id, f"{operation} progress {progress}%")
                        last_progress = progress
                elif len(output) <= 4:
                    _transfer_log(agent_id, f"{operation}: {line[:240]}")

                if time.monotonic() - started > timeout:
                    process.kill()
                    process.wait()
                    return -2, "transfer timed out"
        exit_code = process.wait()
        was_cancelled = bool(agent_id and agent_id in _cancelled_operations)
        if agent_id:
            _active_operations.pop(agent_id, None)
            _cancelled_operations.discard(agent_id)
        return (-3 if was_cancelled else exit_code), "\n".join(output[-20:])
    finally:
        if agent_id:
            _active_operations.pop(agent_id, None)
        if process.poll() is None:
            process.kill()
            process.wait()


def _exec_transfer(args: dict, operation: str, agent_id: Optional[str] = None) -> str:
    raw_src = args.get("source", "")
    raw_dst = args.get("destination", "")
    if not isinstance(raw_src, str) or not raw_src.strip() or not isinstance(raw_dst, str) or not raw_dst.strip():
        return f"Error: {operation} requires both source and destination paths."
    p_src = _resolve_path(raw_src, prefer_backend=False).resolve()
    p_dst = _resolve_path(raw_dst, prefer_backend=False).resolve()

    if not p_src.exists():
        return f"Error: Source not found: {raw_src} (resolved to: {p_src})"

    workspace = pathlib.Path(WORKSPACE_ROOT).resolve()
    for candidate in (p_src, p_dst):
        try:
            candidate.relative_to(workspace)
        except ValueError:
            return f"Error: transfer paths must stay inside the workspace: {candidate}"

    if p_dst.exists() and p_dst.is_dir():
        p_dst = p_dst / p_src.name
    p_dst.parent.mkdir(parents=True, exist_ok=True)
    kind = "directory" if p_src.is_dir() else "file"
    _transfer_log(agent_id, f"{operation} started: {raw_src} -> {raw_dst} ({kind})")

    try:
        timeout = max(30, min(int(args.get("timeout", 1800)), 3600))
    except (TypeError, ValueError):
        timeout = 1800
    is_move = operation == "move"
    command_name = ""
    exit_code = -1
    output = ""

    if os.name == "nt" and shutil.which("robocopy"):
        command_name = "robocopy"
        if p_src.is_dir():
            command = ["robocopy", str(p_src), str(p_dst), "/E", "/J", "/R:1", "/W:1", "/ETA"]
            if is_move:
                command.insert(3, "/MOVE")
        else:
            command = ["robocopy", str(p_src.parent), str(p_dst.parent), p_src.name, "/J", "/R:1", "/W:1", "/ETA"]
            if is_move:
                command.insert(4, "/MOV")
        exit_code, output = _run_transfer_command(command, operation, agent_id, timeout)
        success = 0 <= exit_code <= 7
        if success and p_src.is_file() and p_src.name != p_dst.name:
            copied = p_dst.parent / p_src.name
            if copied.exists():
                if is_move:
                    copied.replace(p_dst)
                else:
                    shutil.copy2(copied, p_dst)
    elif os.name != "nt" and shutil.which("rsync"):
        command_name = "rsync"
        if p_src.is_dir():
            command = ["rsync", "-a", "--info=progress2", f"{p_src}{os.sep}", f"{p_dst}{os.sep}"]
            exit_code, output = _run_transfer_command(command, operation, agent_id, timeout)
            success = exit_code == 0
            if success and is_move:
                shutil.rmtree(p_src)
        else:
            command = ["rsync", "-a", "--info=progress2", str(p_src), str(p_dst)]
            if is_move:
                command.insert(3, "--remove-source-files")
            exit_code, output = _run_transfer_command(command, operation, agent_id, timeout)
            success = exit_code == 0
    else:
        command_name = "cp"
        _transfer_log(agent_id, f"{operation} fallback command: {_display_command(['cp', '-a', str(p_src), str(p_dst)])}")
        try:
            if p_src.is_dir():
                shutil.copytree(p_src, p_dst, dirs_exist_ok=True)
                if is_move:
                    shutil.rmtree(p_src)
            else:
                shutil.copy2(p_src, p_dst)
                if is_move:
                    p_src.unlink()
            exit_code = 0
            success = True
            _transfer_log(agent_id, f"{operation} progress 100%")
        except OSError as exc:
            output = str(exc)
            success = False

    if exit_code == -3:
        _transfer_log(agent_id, f"{operation} cancelled by operator")
        return f"The {operation} operation was cancelled by the operator."

    if not success:
        _transfer_log(agent_id, f"{operation} failed via {command_name} (exit {exit_code})")
        return f"Error: {operation} failed via {command_name} (exit code {exit_code}).\n{output}"

    _transfer_log(agent_id, f"{operation} progress 100%")
    _transfer_log(agent_id, f"{operation} complete via {command_name}: {p_dst}")
    verb = "copied" if operation == "copy" else "moved"
    return f"Successfully {verb} '{raw_src}' to '{raw_dst}' via {command_name} (exit code {exit_code})."


def _exec_copy_file(args: dict, agent_id: Optional[str] = None) -> str:
    return _exec_transfer(args, "copy", agent_id)


def _exec_move_file(args: dict, agent_id: Optional[str] = None) -> str:
    return _exec_transfer(args, "move", agent_id)


def _exec_list_directory_tree(args: dict) -> str:
    raw_path = args.get("path", "")
    max_depth = int(args.get("max_depth", 3))
    p = _resolve_path(raw_path)
        
    if not p.is_dir():
        return f"Error: Not a directory: {raw_path} (resolved to: {p})"
        
    def _build_tree(dir_path: pathlib.Path, current_depth: int = 0) -> list[str]:
        if current_depth > max_depth:
            return ["  " * current_depth + "... (max depth reached)"]
            
        lines = []
        try:
            entries = sorted(list(dir_path.iterdir()), key=lambda x: (not x.is_dir(), x.name))
            for entry in entries:
                if entry.name in (".git", "node_modules", ".next", ".venv"):
                    lines.append("  " * current_depth + f"📂 {entry.name}/ (skipped)")
                    continue
                if entry.is_dir():
                    lines.append("  " * current_depth + f"📂 {entry.name}/")
                    lines.extend(_build_tree(entry, current_depth + 1))
                else:
                    lines.append("  " * current_depth + f"📄 {entry.name}")
        except Exception as e:
            lines.append("  " * current_depth + f"! Error reading: {e}")
        return lines

    tree = _build_tree(p)
    return f"Directory Tree for {raw_path} (max depth {max_depth}):\n" + "\n".join(tree[:2000])


def _exec_get_file_metadata(args: dict) -> str:
    raw_path = args.get("path", "")
    p = _resolve_path(raw_path)
        
    if not p.exists():
        return f"Error: Path not found: {raw_path} (resolved to: {p})"
        
    try:
        stat_info = p.stat()
        is_dir = p.is_dir()
        
        size = stat_info.st_size
        created = datetime.fromtimestamp(stat_info.st_ctime).isoformat()
        modified = datetime.fromtimestamp(stat_info.st_mtime).isoformat()
        permissions = stat.filemode(stat_info.st_mode)
        
        return (
            f"Metadata for {raw_path}:\n"
            f"- Type: {'Directory' if is_dir else 'File'}\n"
            f"- Size: {size:,} bytes\n"
            f"- Created: {created}\n"
            f"- Modified: {modified}\n"
            f"- Permissions: {permissions}"
        )
    except Exception as e:
        return f"Error reading metadata: {e}"


def _exec_terminal(args: dict) -> str:
    """Run a shell command from the workspace with bounded runtime and output."""
    command = args.get("command", "")
    if not isinstance(command, str) or not command.strip():
        return "Error: terminal requires a non-empty command."

    raw_cwd = args.get("cwd", "")
    cwd = _resolve_path(raw_cwd, prefer_backend=False) if raw_cwd else pathlib.Path(WORKSPACE_ROOT)
    try:
        cwd = cwd.resolve()
    except OSError as exc:
        return f"Error resolving terminal cwd '{raw_cwd}': {exc}"

    workspace = pathlib.Path(WORKSPACE_ROOT).resolve()
    try:
        cwd.relative_to(workspace)
    except ValueError:
        return f"Error: terminal cwd must stay inside the workspace: {cwd}"
    if not cwd.is_dir():
        return f"Error: terminal cwd is not a directory: {cwd}"

    try:
        timeout = max(1, min(int(args.get("timeout", 30)), 120))
    except (TypeError, ValueError):
        timeout = 30

    # Match the host's normal shell on Windows so agents can use commands such
    # as Get-ChildItem, Select-String, and Move-Item consistently.
    if os.name == "nt":
        shell_command: str | list[str] = [
            os.environ.get("HIVE_TERMINAL_SHELL", "powershell.exe"),
            "-NoLogo",
            "-NoProfile",
            "-NonInteractive",
            "-Command",
            command,
        ]
        use_shell = False
    else:
        shell_command = command
        use_shell = True

    try:
        completed = subprocess.run(
            shell_command,
            cwd=str(cwd),
            shell=use_shell,
            capture_output=True,
            text=True,
            encoding="utf-8",
            errors="replace",
            timeout=timeout,
            check=False,
        )
    except subprocess.TimeoutExpired as exc:
        stdout = (exc.stdout or "")[-20_000:]
        stderr = (exc.stderr or "")[-20_000:]
        return (
            f"Terminal command timed out after {timeout}s (cwd: {cwd}).\n"
            f"stdout:\n{stdout}\n\nstderr:\n{stderr}"
        )
    except OSError as exc:
        return f"Error starting terminal command in '{cwd}': {exc}"

    stdout = (completed.stdout or "")[-20_000:]
    stderr = (completed.stderr or "")[-20_000:]
    return (
        f"Terminal result (exit code {completed.returncode}, cwd: {cwd}):\n"
        f"stdout:\n{stdout or '(empty)'}\n\nstderr:\n{stderr or '(empty)'}"
    )


def _exec_sqlite(args: dict, operation: str) -> str:
    """Execute sqlite read_query / write_query / list_tables / describe_table / create_table."""
    tools_env = _load_tools_env()
    db_path = tools_env.get("SQLITE_DB_PATH") or os.environ.get("SQLITE_DB_PATH", "./prismspace.db")
    if not pathlib.Path(db_path).is_absolute():
        db_path = str(pathlib.Path(WORKSPACE_ROOT) / db_path)

    try:
        con = sqlite3.connect(db_path)
        cur = con.cursor()

        if operation == "list_tables":
            cur.execute("SELECT name FROM sqlite_master WHERE type='table' ORDER BY name")
            tables = [row[0] for row in cur.fetchall()]
            return f"Tables in '{db_path}':\n" + ("\n".join(tables) if tables else "(empty database)")

        if operation == "describe_table":
            table = args.get("table", "")
            cur.execute(f"PRAGMA table_info({table})")
            rows = cur.fetchall()
            header = "cid | name | type | notnull | dflt_value | pk"
            body = "\n".join(" | ".join(str(c) for c in row) for row in rows)
            return f"Schema for '{table}':\n{header}\n{body}"

        sql = args.get("sql", args.get("query", ""))
        if not sql:
            return "Error: no SQL provided"

        cur.execute(sql)
        if operation in ("write_query", "create_table"):
            con.commit()
            return f"OK — {cur.rowcount} row(s) affected."

        # read_query
        rows = cur.fetchall()
        if not rows:
            return "Query returned 0 rows."
        cols = [d[0] for d in (cur.description or [])]
        records = [dict(zip(cols, row)) for row in rows[:100]]
        extra = f"\n... ({len(rows) - 100} more rows)" if len(rows) > 100 else ""
        return json.dumps(records, indent=2, default=str) + extra

    except sqlite3.Error as exc:
        return f"SQLite error: {exc}"
    finally:
        try:
            con.close()
        except Exception:
            pass


# Simple in-process memory store (persists for the lifetime of the backend process)
_memory_store: dict[str, str] = {}


def _exec_memory(args: dict, operation: str) -> str:
    """Execute memory set/get/list/delete operations."""
    if operation == "set_memory":
        key = args.get("key", "")
        value = args.get("value", "")
        _memory_store[key] = str(value)
        return f"Memory set: '{key}' = '{value}'"
    elif operation == "get_memory":
        key = args.get("key", "")
        val = _memory_store.get(key)
        return f"Memory '{key}': {val}" if val is not None else f"Key '{key}' not found in memory."
    elif operation == "list_memory":
        if not _memory_store:
            return "Memory store is empty."
        return "Memory store keys:\n" + "\n".join(f"  {k}: {v}" for k, v in _memory_store.items())
    elif operation == "delete_memory":
        key = args.get("key", "")
        removed = _memory_store.pop(key, None)
        return f"Deleted '{key}'." if removed is not None else f"Key '{key}' not found."
    return f"Unknown memory operation: {operation}"


def _exec_gmail(tool: str, args: dict, user_id: Optional[str] = None) -> str:
    """Per-user Gmail executor. Uses the calling user's OAuth token, never the shared .env."""
    import httpx as _httpx
    token: Optional[str] = None
    if _GMAIL_OAUTH_AVAILABLE and user_id:
        try:
            token = _gmail_oauth.get_valid_access_token(user_id)  # type: ignore
        except Exception as exc:
            return f"Gmail auth error for user {user_id}: {exc}"
    if not token:  # admin fallback (single-user dev)
        token = os.environ.get("GOOGLE_ACCESS_TOKEN", "")
    if not token:
        return ("Gmail not connected. User must click 'Connect Gmail' "
                "(GET /api/auth/google/login) and complete OAuth first.")
    base = "https://gmail.googleapis.com/gmail/v1/users/me"
    hdr = {"Authorization": f"Bearer {token}", "Content-Type": "application/json"}
    try:
        if tool == "gmail_list_messages":
            r = _httpx.get(f"{base}/messages", headers=hdr,
                           params={"q": args.get("query", "is:unread"),
                                   "maxResults": max(1, min(500, int(args.get("max_results", 10))))},
                           timeout=20.0)
        elif tool == "gmail_get_message":
            mid = str(args.get("message_id", ""))
            if not mid or "/" in mid or ".." in mid:
                return "Error: valid message_id is required"
            r = _httpx.get(f"{base}/messages/{mid}", headers=hdr,
                           params={"format": args.get("format", "metadata")}, timeout=20.0)
        elif tool == "gmail_list_labels":
            r = _httpx.get(f"{base}/labels", headers=hdr, timeout=20.0)
        elif tool in ("gmail_send_message", "gmail_send_email", "send_email"):
            import base64 as _b64
            from email.mime.text import MIMEText as _MIMEText
            to = str(args.get("to", "") or args.get("recipient", "") or args.get("to_email", "")).strip()
            subject = str(args.get("subject", "") or "(no subject)")
            body = str(args.get("body", "") or args.get("html", "") or args.get("content", "") or args.get("text", ""))
            if not to or "@" not in to:
                return "Error: valid 'to' email address is required"
            if not body:
                return "Error: email 'body' is required"
            msg = _MIMEText(body, "plain", "utf-8")
            msg["To"] = to
            msg["Subject"] = subject
            raw = _b64.urlsafe_b64encode(msg.as_bytes()).decode("ascii")
            r = _httpx.post(f"{base}/messages/send", headers=hdr, json={"raw": raw}, timeout=20.0)
        else:
            return f"Gmail tool '{tool}' needs approval — supported: list/get/labels/send."
        if r.status_code == 401:
            return "Gmail token expired. Reconnect via Connect Gmail."
        if r.status_code != 200:
            return f"Gmail API error ({r.status_code}): {r.text[:500]}"
        return json.dumps(r.json(), indent=2, default=str)[:8000]
    except Exception as exc:
        return f"Gmail request failed: {exc}"


def _exec_figma(tool: str, args: dict) -> str:
    """Execute Figma MCP tools via Figma REST API if FIGMA_API_TOKEN is present."""
    import httpx as _httpx
    tools_env = _load_tools_env()
    token = (
        tools_env.get("FIGMA_API_TOKEN")
        or os.environ.get("FIGMA_API_TOKEN")
        or tools_env.get("FIGMA_PERSONAL_ACCESS_TOKEN")
        or os.environ.get("FIGMA_PERSONAL_ACCESS_TOKEN")
    )
    if not token:
        return (
            "Figma API token not configured. Please save FIGMA_API_TOKEN in the "
            "Swarm Settings > MCP Tokens panel."
        )

    raw_file_key = str(args.get("file_key") or args.get("key") or args.get("url") or "").strip()
    if "figma.com/file/" in raw_file_key or "figma.com/design/" in raw_file_key:
        match = re.search(r"figma\.com/(?:file|design)/([a-zA-Z0-9]+)", raw_file_key)
        file_key = match.group(1) if match else raw_file_key
    else:
        file_key = raw_file_key

    if not file_key:
        return "Error: 'file_key' or Figma URL is required for Figma MCP operations."

    headers = {"X-Figma-Token": token}
    try:
        if tool in ("figma_get_file", "get_file"):
            depth = args.get("depth", 2)
            r = _httpx.get(
                f"https://api.figma.com/v1/files/{file_key}",
                headers=headers,
                params={"depth": depth},
                timeout=25.0,
            )
            if r.status_code == 200:
                data = r.json()
                name = data.get("name", "Untitled")
                doc = data.get("document", {})
                pages = [child.get("name", "") for child in doc.get("children", [])]
                return (
                    f"Figma File: '{name}' (Key: {file_key})\n"
                    f"Pages: {', '.join(pages) if pages else 'None'}\n"
                    f"Structure:\n{json.dumps(data, indent=2)[:4000]}"
                )
            return f"Figma API returned {r.status_code}: {r.text[:400]}"
        elif tool in ("figma_get_file_nodes", "get_file_nodes"):
            ids = args.get("ids", [])
            ids_str = ",".join(ids) if isinstance(ids, list) else str(ids)
            r = _httpx.get(
                f"https://api.figma.com/v1/files/{file_key}/nodes",
                headers=headers,
                params={"ids": ids_str},
                timeout=25.0,
            )
            return r.text[:5000] if r.status_code == 200 else f"Figma API error ({r.status_code}): {r.text[:300]}"
        elif tool in ("figma_get_comments", "get_comments"):
            r = _httpx.get(
                f"https://api.figma.com/v1/files/{file_key}/comments",
                headers=headers,
                timeout=25.0,
            )
            return r.text[:5000] if r.status_code == 200 else f"Figma API error ({r.status_code}): {r.text[:300]}"
        return f"Figma operation '{tool}' executed with key '{file_key}'."
    except Exception as exc:
        return f"Figma request failed: {exc}"


def _exec_github(tool: str, args: dict) -> str:
    """Execute GitHub MCP tools via GitHub REST API if GITHUB_PERSONAL_ACCESS_TOKEN is present."""
    import httpx as _httpx
    tools_env = _load_tools_env()
    token = (
        tools_env.get("GITHUB_PERSONAL_ACCESS_TOKEN")
        or os.environ.get("GITHUB_PERSONAL_ACCESS_TOKEN")
        or tools_env.get("GITHUB_TOKEN")
        or os.environ.get("GITHUB_TOKEN")
    )
    headers = {"Accept": "application/vnd.github.v3+json", "User-Agent": "PrismSpace-AgentSwarm"}
    if token:
        headers["Authorization"] = f"Bearer {token}"

    try:
        if tool in ("github_get_repo", "get_repo"):
            owner = str(args.get("owner", "")).strip()
            repo = str(args.get("repo", "")).strip()
            if not owner or not repo:
                return "Error: 'owner' and 'repo' are required."
            r = _httpx.get(f"https://api.github.com/repos/{owner}/{repo}", headers=headers, timeout=20.0)
            if r.status_code == 200:
                data = r.json()
                return json.dumps({
                    "full_name": data.get("full_name"),
                    "description": data.get("description"),
                    "stars": data.get("stargazers_count"),
                    "forks": data.get("forks_count"),
                    "default_branch": data.get("default_branch"),
                    "open_issues": data.get("open_issues_count"),
                }, indent=2)
            return f"GitHub API error ({r.status_code}): {r.text[:300]}"
        elif tool in ("github_search_code", "search_code"):
            query = str(args.get("query", "")).strip()
            if not query:
                return "Error: 'query' parameter is required."
            r = _httpx.get(
                "https://api.github.com/search/code",
                headers=headers,
                params={"q": query, "per_page": 5},
                timeout=20.0,
            )
            return r.text[:4000] if r.status_code == 200 else f"GitHub Search error ({r.status_code}): {r.text[:300]}"
        elif tool in ("github_list_issues", "list_issues"):
            owner = str(args.get("owner", "")).strip()
            repo = str(args.get("repo", "")).strip()
            state = args.get("state", "open")
            if not owner or not repo:
                return "Error: 'owner' and 'repo' are required."
            r = _httpx.get(
                f"https://api.github.com/repos/{owner}/{repo}/issues",
                headers=headers,
                params={"state": state, "per_page": 10},
                timeout=20.0,
            )
            return r.text[:5000] if r.status_code == 200 else f"GitHub Issues error ({r.status_code}): {r.text[:300]}"
        return f"GitHub tool '{tool}' executed."
    except Exception as exc:
        return f"GitHub request failed: {exc}"


def _exec_google_drive(tool: str, args: dict) -> str:
    """Execute Google Drive MCP operations."""
    import httpx as _httpx
    tools_env = _load_tools_env()
    token = (
        tools_env.get("GOOGLE_DRIVE_CREDENTIALS")
        or os.environ.get("GOOGLE_DRIVE_CREDENTIALS")
        or tools_env.get("GDRIVE_API_KEY")
        or os.environ.get("GDRIVE_API_KEY")
        or os.environ.get("GOOGLE_ACCESS_TOKEN")
    )
    if not token:
        return (
            "Google Drive credentials not configured. Please save GOOGLE_DRIVE_CREDENTIALS or "
            "GDRIVE_API_KEY in Swarm Settings > MCP Tokens panel."
        )

    query = args.get("query", "")
    try:
        headers = {"Authorization": f"Bearer {token}"} if not str(token).startswith("AIza") else {}
        params = {"q": query or "trashed = false", "pageSize": 10, "fields": "files(id, name, mimeType, webViewLink)"}
        if str(token).startswith("AIza"):
            params["key"] = token
        r = _httpx.get(
            "https://www.googleapis.com/drive/v3/files",
            headers=headers,
            params=params,
            timeout=20.0,
        )
        return r.text[:5000] if r.status_code == 200 else f"Google Drive API error ({r.status_code}): {r.text[:300]}"
    except Exception as exc:
        return f"Google Drive request failed: {exc}"


def _dispatch_tool(
    tool_call: dict,
    user_id: Optional[str] = None,
    agent_id: Optional[str] = None,
) -> str:
    """Dispatch a parsed tool call to the correct executor."""
    tool = tool_call.get("tool", "").lower()
    args = tool_call.get("arguments", {})

    # Filesystem tools
    if tool == "search_files":
        return _exec_search_files(args)
    if tool == "read_file":
        return _exec_read_file(args)
    if tool == "write_file":
        return _exec_write_file(args)
    if tool == "edit_file":
        return "edit_file: use read_file then write_file for now — direct patch execution coming soon."
    if tool == "create_directory":
        return _exec_create_directory(args)
    if tool == "delete_file":
        return _exec_delete_file(args)
    if tool == "move_file":
        return _exec_move_file(args, agent_id)
    if tool == "copy_file":
        return _exec_copy_file(args, agent_id)
    if tool == "list_directory_tree":
        return _exec_list_directory_tree(args)
    if tool == "get_file_metadata":
        return _exec_get_file_metadata(args)
    if tool == "terminal":
        return _exec_terminal(args)

    # Structured operating-system tools
    if tool in {
        "system_info", "disk_usage", "list_processes", "process_status", "stop_process", "restart_process",
        "list_services", "service_status", "start_service", "stop_service", "restart_service",
        "package_manager", "install_package", "get_environment", "set_environment", "remove_environment",
        "create_archive", "extract_archive", "get_permissions", "set_permissions",
        "list_scheduled_tasks", "create_scheduled_task", "delete_scheduled_task", "run_scheduled_task",
        "ping_host", "dns_lookup",
    }:
        return execute_os_tool(tool, args)

    # SQLite tools
    if tool in ("read_query", "write_query", "create_table", "list_tables", "describe_table"):
        return _exec_sqlite(args, tool)

    # Memory tools
    if tool in ("set_memory", "get_memory", "list_memory", "delete_memory"):
        return _exec_memory(args, tool)

    # Per-user Gmail MCP (read + send)
    if tool.startswith("gmail_") or tool == "send_email":
        return _exec_gmail(tool, args, user_id)

    # Figma tools
    if tool.startswith("figma_") or tool in ("get_file", "get_file_nodes", "get_comments", "get_image"):
        return _exec_figma(tool, args)

    # GitHub tools
    if tool.startswith("github_") or tool in ("get_repo", "search_code", "list_issues", "create_pr", "get_commit"):
        return _exec_github(tool, args)

    # Google Drive tools
    if tool.startswith("gdrive_") or tool.startswith("google_drive_") or tool in ("read_doc", "create_drive_file"):
        return _exec_google_drive(tool, args)

    return (
        f"Tool '{tool}' was recognised but has no local executor. "
        "It will be handled by the MCP server process when integrated."
    )


def _tool_requires_approval(tool: str, args: dict) -> bool:
    if tool in DESTRUCTIVE_OS_TOOLS or tool in {"delete_file", "move_file", "write_file", "edit_file", "create_directory", "copy_file"}:
        return True
    if tool != "terminal":
        return False
    command = str(args.get("command", "")).lower()
    return bool(re.search(r"\b(remove-item|del|erase|rm|rmdir|move-item|mv|kill|taskkill|setx|chmod|chown|install|schtasks|systemctl\s+(start|stop|restart)|sudo)\b", command))


async def _await_tool_approval(agent_id: str, tool: str, args: dict) -> bool:
    if not _tool_requires_approval(tool, args):
        return True

    agent = _agents[agent_id]
    approval_id = uuid.uuid4().hex[:12]
    pending = {
        "id": approval_id,
        "tool": tool,
        "arguments": args,
        "reason": f"The `{tool}` operation can change system or workspace state.",
    }
    agent["pending_approval"] = pending
    agent["status"] = "awaiting_approval"
    agent["updated_at"] = datetime.utcnow().isoformat()
    _tool_approval_decisions.pop(agent_id, None)
    event = asyncio.Event()
    _tool_approval_events[agent_id] = event
    _log(agent_id, f"[APPROVAL] Waiting for operator approval before `{tool}` ({approval_id})")

    try:
        await asyncio.wait_for(event.wait(), timeout=300)
    except asyncio.TimeoutError:
        _log(agent_id, f"[APPROVAL] Timed out for `{tool}` ({approval_id})")
        approved = False
    else:
        approved = _tool_approval_decisions.pop(agent_id, False)
    finally:
        _tool_approval_events.pop(agent_id, None)
        agent["pending_approval"] = None
        if agent.get("status") == "awaiting_approval":
            agent["status"] = "running"
            agent["updated_at"] = datetime.utcnow().isoformat()

    _log(agent_id, f"[APPROVAL] {'Approved' if approved else 'Rejected'} `{tool}` ({approval_id})")
    return approved


async def _tool_use_loop(
    agent_id: str,
    initial_response: str,
    request: "CreateAgentRequest",
    max_iterations: int = 10,
    max_correction_attempts: int = 3,
) -> str:
    """
    Implements a strict ReAct loop (Reason → Act → STOP → Observe) with 
    aggressive self-correction for hallucination prevention:
    
    1. Check if LLM response contains a tool call
    2. If yes: execute tool, return result to LLM as new message, repeat
    3. If no AND first iteration: REJECT and force retry (hallucination detected)
    4. If no AND later iteration: treat as final answer
    5. Enforce max_iterations to prevent infinite loops
    
    Self-correction kicks in when the model outputs a conversational summary
    instead of a tool call on the first iteration. We reject this and force
    the model to try again with a harsh correction prompt.
    """
    conversation_history: list[dict[str, str]] = _normalise_chat_history(request.chat_history)
    conversation_history.append({"role": "user", "content": request.objective})
    
    current_response = initial_response
    iteration = 0
    correction_attempts = 0
    
    while iteration < max_iterations:
        iteration += 1
        
        # Check if current response contains a tool call
        tool_calls = _parse_tool_calls(current_response)
        
        if not tool_calls:
            # ============================================================
            # HALLUCINATION DETECTION & SELF-CORRECTION
            # ============================================================
            # If this is the first iteration and no tool calls detected,
            # the model likely hallucinated a conversational response.
            # Aggressively reject and force it to output a tool call.
            # ============================================================
            
            if iteration == 1 and correction_attempts < max_correction_attempts:
                correction_attempts += 1
                
                _log(agent_id, f"⚠️ HALLUCINATION DETECTED on iteration {iteration} (attempt {correction_attempts}/{max_correction_attempts})")
                _log(agent_id, f"   Model output conversational text instead of tool call JSON")
                _log(agent_id, f"   Response preview: {current_response[:200].replace(chr(10), ' ')}...")
                
                # Add the hallucinated response to history as assistant message
                conversation_history.append({"role": "assistant", "content": current_response})
                
                # Build a HARSH correction message
                correction_message = (
                    "❌ ERROR: HALLUCINATION DETECTED ❌\n\n"
                    "You output a conversational summary instead of executing tools.\n"
                    "This is FORBIDDEN. You are NOT allowed to:\n"
                    "- Describe what you plan to do\n"
                    "- Summarize what you 'did' without actually calling tools\n"
                    "- Write conversational responses before calling tools\n"
                    "- Imagine or fabricate tool execution results\n\n"
                    
                    "YOU MUST:\n"
                    "1. Output ONLY a raw JSON tool call object in a code block\n"
                    "2. Use this EXACT format:\n"
                    "```json\n"
                    '{"tool": "tool_name", "arguments": {"key": "value"}}\n'
                    "```\n"
                    "3. STOP IMMEDIATELY after the closing ```\n"
                    "4. DO NOT write anything else\n\n"
                    
                    "Available tools you can call:\n"
                    "- search_files: Find files by pattern or search content\n"
                    "- read_file: Read a file's contents\n"
                    "- write_file: Write content to a file\n"
                    "- create_directory: Create a new directory\n"
                    "- delete_file: Delete a file or directory\n"
                    "- move_file: Move or rename a file\n"
                    "- copy_file: Copy a file or directory using the fastest available native copier\n"
                    "- list_directory_tree: Get directory structure\n"
                    "- get_file_metadata: Get file information\n"
                    "- terminal: Run a shell command in the workspace (command, cwd, timeout)\n"
                    "- system_info/disk_usage: Inspect host and workspace resources\n"
                    "- list_processes/process_status/stop_process/restart_process: Inspect or control processes\n"
                    "- list_services/service_status/start_service/stop_service/restart_service: Inspect or control services\n"
                    "- package_manager/install_package: Detect or install packages\n"
                    "- get_environment/set_environment/remove_environment: Inspect or change environment values\n"
                    "- create_archive/extract_archive: Create or extract ZIP/TAR archives\n"
                    "- get_permissions/set_permissions: Inspect or change file permissions\n"
                    "- list_scheduled_tasks/create_scheduled_task/delete_scheduled_task/run_scheduled_task: Manage scheduled tasks\n"
                    "- ping_host/dns_lookup: Run network diagnostics\n"
                    "- set_memory: Store a value in memory\n"
                    "- get_memory: Retrieve a value from memory\n"
                    "- read_query: Execute SQL SELECT query\n"
                    "- write_query: Execute SQL INSERT/UPDATE/DELETE\n"
                    "- gmail_list_messages: List Gmail (query, max_results)\n"
                    "- gmail_get_message: Read one email (message_id, format)\n"
                    "- gmail_list_labels: List Gmail labels\n"
                    "- send_email: Send email via Gmail (to, subject, body)\n\n"
                    
                    f"Original user request: {request.objective}\n\n"
                    
                    "NOW: Output the JSON tool call and NOTHING ELSE."
                )
                
                conversation_history.append({"role": "user", "content": correction_message})
                
                _log(agent_id, f"🔄 Forcing retry with correction prompt (attempt {correction_attempts}/{max_correction_attempts})...")
                
                # Call LLM again with correction
                provider = request.provider.lower()
                
                try:
                    if provider == "groq":
                        current_response = await _call_groq(request.model, "", conversation_history, api_key=request.api_key)
                    elif provider == "nvidia":
                        current_response = await _call_nvidia(request.model, "", conversation_history, api_key=request.api_key)
                    elif provider == "openai":
                        current_response = await _call_openai(request.model, "", conversation_history, api_key=request.api_key)
                    elif provider == "anthropic":
                        current_response = await _call_anthropic(request.model, "", conversation_history, api_key=request.api_key)
                    elif provider in ("google", "gemini"):
                        current_response = await _call_google(request.model, "", conversation_history, api_key=request.api_key)
                    elif provider == "openrouter":
                        current_response = await _call_openrouter(request.model, "", conversation_history, api_key=request.api_key)
                    elif provider == "deepseek":
                        current_response = await _call_deepseek(request.model, "", conversation_history, api_key=request.api_key)
                    else:
                        _log(agent_id, f"⚠️ Unknown provider: {provider}, giving up")
                        return current_response
                except Exception as exc:
                    _log(agent_id, f"❌ Error during correction retry: {exc}")
                    return f"Error during hallucination correction: {exc}\n\nOriginal response:\n{current_response}"
                
                _log(agent_id, f"✓ Received correction retry response ({len(current_response)} chars)")
                
                # Decrement iteration counter so we don't waste iterations on corrections
                iteration -= 1
                
                # Continue loop to re-check if tool calls now exist
                continue
            
            # ============================================================
            # If we've exhausted correction attempts or this is a later
            # iteration, treat it as a final answer (with warning if first iter)
            # ============================================================
            
            if iteration == 1 and correction_attempts >= max_correction_attempts:
                _log(agent_id, f"❌ FAILED to correct hallucination after {max_correction_attempts} attempts")
                _log(agent_id, f"⚠️ Returning hallucinated response as-is (model is non-compliant)")
                return (
                    f"[WARNING: Model failed to follow tool call instructions after {max_correction_attempts} correction attempts]\n\n"
                    f"{current_response}"
                )
            
            # Normal case: no tool calls in later iteration = final answer
            _log(agent_id, f"✓ No tool calls detected in iteration {iteration} - treating as final answer")
            return current_response
        
        # ============================================================
        # Tool calls detected - execute them
        # ============================================================
        
        _log(agent_id, f"🔧 Iteration {iteration}: Detected {len(tool_calls)} tool call(s)")
        
        # Reset correction attempts counter (model is now compliant)
        if correction_attempts > 0:
            _log(agent_id, f"✓ Model corrected after {correction_attempts} attempt(s)")
            correction_attempts = 0
        
        # Execute ALL tool calls and collect results
        tool_results: list[str] = []
        for idx, tc in enumerate(tool_calls, 1):
            tool_name = tc.get("tool", "unknown")
            tool_args = tc.get("arguments", {})
            
            _log(agent_id, f"   [{idx}/{len(tool_calls)}] Executing `{tool_name}` with args: {json.dumps(tool_args, ensure_ascii=False)[:100]}...")

            approved = await _await_tool_approval(agent_id, tool_name, tool_args)
            if not approved:
                result = f"Operation `{tool_name}` was rejected or timed out by the operator."
            else:
                result = await asyncio.to_thread(
                    _dispatch_tool,
                    tc,
                    getattr(request, "user_id", None),
                    agent_id,
                )
            preview = result[:150].replace("\n", " ")
            _log(agent_id, f"   ✓ `{tool_name}` returned {len(result)} chars: {preview}...")
            
            tool_results.append(
                f"=== Tool Call {idx}: {tool_name} ===\n"
                f"Arguments:\n{json.dumps(tool_args, indent=2, ensure_ascii=False)}\n\n"
                f"Execution Result:\n{result}\n"
            )
        
        # Add assistant's tool call to conversation history
        conversation_history.append({"role": "assistant", "content": current_response})
        
        # Build observation message with REAL tool results
        observation_message = (
            f"## Tool Execution Results (Iteration {iteration})\n\n"
            f"You called {len(tool_calls)} tool(s). Here are the REAL execution results:\n\n"
            + "\n".join(tool_results)
            + "\n\n---\n\n"
            "Based on these REAL results, you can now:\n"
            "1. Call another tool if you need more information (output another tool call JSON)\n"
            "2. Provide your final answer to the user's question (if you have enough information)\n\n"
            "Remember: DO NOT hallucinate results. DO NOT describe what you 'did' - the tools were already executed. "
            "Either call another tool OR synthesize a final answer from the results above."
        )
        
        # Add observation to conversation history
        conversation_history.append({"role": "user", "content": observation_message})
        
        _log(agent_id, f"📝 Sending {len(tool_results)} tool result(s) back to LLM for iteration {iteration + 1}...")
        
        # Call LLM again with the updated conversation (including tool results)
        provider = request.provider.lower()
        
        try:
            if provider == "groq":
                current_response = await _call_groq(request.model, "", conversation_history, api_key=request.api_key)
            elif provider == "nvidia":
                current_response = await _call_nvidia(request.model, "", conversation_history, api_key=request.api_key)
            elif provider == "openai":
                current_response = await _call_openai(request.model, "", conversation_history, api_key=request.api_key)
            elif provider == "anthropic":
                current_response = await _call_anthropic(request.model, "", conversation_history, api_key=request.api_key)
            elif provider in ("google", "gemini"):
                current_response = await _call_google(request.model, "", conversation_history, api_key=request.api_key)
            elif provider == "openrouter":
                current_response = await _call_openrouter(request.model, "", conversation_history, api_key=request.api_key)
            elif provider == "deepseek":
                current_response = await _call_deepseek(request.model, "", conversation_history, api_key=request.api_key)
            else:
                _log(agent_id, f"⚠️ Unknown provider: {provider}, breaking loop")
                return current_response
        except Exception as exc:
            _log(agent_id, f"❌ Error in iteration {iteration}: {exc}")
            return f"Error during tool execution loop: {exc}\n\nLast valid response:\n{current_response}"
        
        _log(agent_id, f"✓ Received response for iteration {iteration + 1} ({len(current_response)} chars)")
        
        # Continue loop to check if new response has more tool calls
    
    # Max iterations reached
    _log(agent_id, f"⚠️ Max iterations ({max_iterations}) reached. Returning current response.")
    return (
        f"[Note: Reached maximum iteration limit of {max_iterations}]\n\n"
        f"{current_response}"
    )


# ---------------------------------------------------------------------------
# Background task: real LLM-powered agent run
# ---------------------------------------------------------------------------

async def _run_hive_agent(agent_id: str, request: CreateAgentRequest) -> None:
    """
    Drives the agent through its lifecycle stages and calls the actual LLM API
    based on the selected provider.
    """
    agent = _agents[agent_id]
    started = time.perf_counter()

    try:
        _log(agent_id, f"Initialising Hive runtime ({request.provider}/{request.model})")
        await asyncio.sleep(0.3)

        # --- Planning phase ---
        agent["status"] = "planning"
        agent["updated_at"] = datetime.utcnow().isoformat()
        _log(agent_id, f"Compiling execution DAG for: <<{request.objective}>>")
        await asyncio.sleep(0.5)

        _log(agent_id, f"Spawning {request.max_agents} specialised sub-agents")
        sub_agents = [f"Agent-{chr(65+i)}" for i in range(request.max_agents)]
        agent["selected_agents"] = sub_agents
        for i, sa in enumerate(sub_agents):
            assignment = request.worker_models[i] if i < len(request.worker_models) else {"provider": request.provider, "model": request.model}
            _log(agent_id, f"   -> {sa} ready ({assignment.get('provider', request.provider)}/{assignment.get('model', request.model)})")
            await asyncio.sleep(0.15)

        # --- Running phase ---
        agent["status"] = "running"
        agent["updated_at"] = datetime.utcnow().isoformat()

        # --- Human-in-the-Loop checkpoint ---
        if request.human_in_loop:
            agent["status"] = "awaiting_approval"
            agent["updated_at"] = datetime.utcnow().isoformat()
            _log(agent_id, "Human-in-the-Loop checkpoint -- waiting for approval...")
            for _ in range(300):
                if agent.get("approved") is True:
                    _log(agent_id, "[OK] Approved -- resuming execution")
                    break
                if agent.get("approved") is False:
                    agent["status"] = "cancelled"
                    agent["updated_at"] = datetime.utcnow().isoformat()
                    _log(agent_id, "[STOP] Execution cancelled by operator")
                    return
                await asyncio.sleep(1)
            else:
                agent["status"] = "failed"
                _log(agent_id, "[WARN] Approval timeout -- aborting")
                return

        agent["status"] = "running"
        agent["updated_at"] = datetime.utcnow().isoformat()

        # --- Actual LLM call ---
        _log(agent_id, f"Sending prompt to {request.provider}/{request.model}...")

        provider = request.provider.lower()
        if provider == "groq":
            result_text = await _call_groq(request.model, request.objective, request.chat_history, api_key=request.api_key)
        elif provider == "nvidia":
            result_text = await _call_nvidia(request.model, request.objective, request.chat_history, api_key=request.api_key)
        elif provider == "openai":
            result_text = await _call_openai(request.model, request.objective, request.chat_history, api_key=request.api_key)
        elif provider == "anthropic":
            result_text = await _call_anthropic(request.model, request.objective, request.chat_history, api_key=request.api_key)
        elif provider in ("google", "gemini"):
            result_text = await _call_google(request.model, request.objective, request.chat_history, api_key=request.api_key)
        elif provider == "openrouter":
            result_text = await _call_openrouter(request.model, request.objective, request.chat_history, api_key=request.api_key)
        elif provider == "deepseek":
            result_text = await _call_deepseek(request.model, request.objective, request.chat_history, api_key=request.api_key)
        else:
            raise ValueError(f"Unsupported provider: {request.provider}")

        _log(agent_id, f"Received response from {request.provider} ({len(result_text)} chars)")

        # --- Tool-use loop: execute any MCP tool calls and synthesise ---
        result_text = await _tool_use_loop(agent_id, result_text, request)

        _log(agent_id, "Running validation checks...")
        await asyncio.sleep(0.3)

        # --- Complete ---
        agent["status"] = "completed"
        agent["updated_at"] = datetime.utcnow().isoformat()
        agent["result"] = result_text
        _log(agent_id, "Task completed successfully!")

    except Exception as exc:
        agent["status"] = "failed"
        agent["updated_at"] = datetime.utcnow().isoformat()
        error_msg = str(exc)
        agent["result"] = f"Error: {error_msg}"
        _log(agent_id, f"[ERROR] Agent failed: {error_msg}")
    finally:
        _record_runtime_event(agent, request, started)


# ---------------------------------------------------------------------------
# Routes
# ---------------------------------------------------------------------------


@app.get("/health")
async def health_check():
    """Liveness probe — used by the frontend to verify the backend is running."""
    return {
        "status": "ok",
        "version": "1.0.0",
        "agents": len(_agents),
        "ml_models": _ml_status() if _ML_AVAILABLE else {"loaded": False},
    }


@app.get("/api/mcp")
async def list_mcp_servers():
    """Return MCP server configuration with credential values masked."""
    mcp_servers = _load_mcp_servers()
    tools_env = _load_tools_env()
    servers = []
    token_usage: dict[str, list[str]] = {}

    for name, config in mcp_servers.items():
        env_config = config.get("env", {}) or {}
        env_vars = []
        for env_key, env_value in env_config.items():
            resolved_key = _extract_env_key(env_value)
            configured = bool(tools_env.get(resolved_key) or os.environ.get(resolved_key))
            token_usage.setdefault(resolved_key, []).append(name)
            env_vars.append({
                "key": resolved_key,
                "configured": configured,
            })

        servers.append({
            "name": name,
            "transport": config.get("transport", "unknown"),
            "command": config.get("command", ""),
            "args": config.get("args", []),
            "description": config.get("description", ""),
            "env": env_vars,
        })

    token_keys = set(tools_env.keys()) | set(token_usage.keys())
    tokens = [
        {
            "key": key,
            "configured": bool(tools_env.get(key) or os.environ.get(key)),
            "masked": _mask_token(tools_env.get(key) or os.environ.get(key, "")),
            "used_by": token_usage.get(key, []),
        }
        for key in sorted(token_keys)
    ]

    return {"servers": servers, "tokens": tokens, "env_file": TOOLS_ENV_PATH}


@app.post("/api/mcp/tokens")
async def save_mcp_token(body: McpTokenRequest):
    """Attach or update an env token for a configured MCP server."""
    server_name = body.server_name.strip() if body.server_name else ""
    env_key = body.env_key.strip().upper()
    token = body.token.strip()

    if not re.fullmatch(r"[A-Z][A-Z0-9_]{2,80}", env_key):
        raise HTTPException(status_code=400, detail="Invalid environment variable name")
    if not token:
        raise HTTPException(status_code=400, detail="Token cannot be empty")

    if server_name:
        mcp_servers = _load_mcp_servers()
        server = mcp_servers.get(server_name)
        if not server:
            raise HTTPException(status_code=404, detail="MCP server not found")

        server.setdefault("env", {})
        server["env"][env_key] = f"${{{env_key}}}"
        _write_mcp_servers(mcp_servers)

    _write_tools_env_value(env_key, token)

    return {
        "ok": True,
        "server": server_name or None,
        "env_key": env_key,
        "env_file": TOOLS_ENV_PATH,
        "configured": True,
    }


@app.delete("/api/mcp/tokens")
async def remove_mcp_token(body: McpTokenRemoveRequest):
    """Remove an env token from the tools .env and optionally from an MCP server entry."""
    server_name = body.server_name.strip() if body.server_name else ""
    env_key = body.env_key.strip().upper()

    if not re.fullmatch(r"[A-Z][A-Z0-9_]{2,80}", env_key):
        raise HTTPException(status_code=400, detail="Invalid environment variable name")

    # Remove from tools .env
    try:
        if os.path.exists(TOOLS_ENV_PATH):
            with open(TOOLS_ENV_PATH, encoding="utf-8") as f:
                lines = f.read().splitlines()
        else:
            lines = []

        new_lines = [ln for ln in lines if not ln.strip().startswith(f"{env_key}=")]

        # Trim trailing empty lines
        while new_lines and not new_lines[-1].strip():
            new_lines.pop()

        with open(TOOLS_ENV_PATH, "w", encoding="utf-8") as f:
            if new_lines:
                f.write("\n".join(new_lines).rstrip() + "\n")
            else:
                f.write("")

        # Also remove env reference from MCP server config if requested
        if server_name:
            mcp_servers = _load_mcp_servers()
            server = mcp_servers.get(server_name)
            if server and server.get("env"):
                # env entries map env_key -> "${ENV_KEY}" or similar
                envs = server.get("env", {})
                # remove any env mapping that resolves to this key
                keys_to_remove = [k for k, v in envs.items() if _extract_env_key(v) == env_key]
                for k in keys_to_remove:
                    envs.pop(k, None)
                server["env"] = envs
                _write_mcp_servers(mcp_servers)

        return {"ok": True, "env_key": env_key, "env_file": TOOLS_ENV_PATH}
    except Exception as exc:
        raise HTTPException(status_code=500, detail=str(exc))


@app.get("/api/agents")
async def list_agents():
    """Return all agents ordered by creation time (newest first)."""
    agents = sorted(_agents.values(), key=lambda a: a["created_at"], reverse=True)
    return {"agents": agents}


@app.post("/api/agents", status_code=201)
async def create_agent(
    request: CreateAgentRequest,
    background_tasks: BackgroundTasks,
):
    """Create a new Hive agent task and start it in the background."""
    agent_id = str(uuid.uuid4())
    now = datetime.utcnow().isoformat()

    # --- ML Intelligence ---
    intelligence = None
    if _ML_AVAILABLE:
        try:
            result = _ml_analyze(request.objective)
            if result is not None:
                intelligence = result.to_dict()

                # Smart provider routing: if user used the default, use ML recommendation
                if request.provider == "nvidia" and result.recommended_provider != "nvidia":
                    request.provider = result.recommended_provider

                # Auto-enable human-in-loop if approval model says it's needed
                if result.approval_required and not request.human_in_loop:
                    request.human_in_loop = True
        except Exception as exc:
            intelligence = {"error": str(exc)}

    # Explicit openrouter model prefix routes to openrouter
    if request.model.startswith("openrouter/"):
        request.provider = "openrouter"

    agent = {
        "id": agent_id,
        "objective": request.objective,
        "model": request.model,
        "provider": request.provider,
        "max_agents": request.max_agents,
        "worker_models": request.worker_models,
        "human_in_loop": request.human_in_loop,
        "user_id": request.user_id,
        "status": "initialising",
        "created_at": now,
        "updated_at": now,
        "result": None,
        "approved": None,
        "pending_approval": None,
        "intelligence": intelligence,
    }

    _agents[agent_id] = agent
    _logs[agent_id] = []

    # Log intelligence results
    if intelligence and "error" not in intelligence:
        _log(agent_id, f"🧠 ML Intelligence: intent={intelligence.get('intent')} "
             f"provider={intelligence.get('recommended_provider')} "
             f"latency≈{intelligence.get('estimated_latency_seconds', '?')}s "
             f"cost≈{intelligence.get('estimated_cost', '?')} "
             f"approval={'required' if intelligence.get('approval_required') else 'not needed'} "
             f"anomaly={'⚠️ YES' if intelligence.get('is_anomalous') else 'no'}")

    background_tasks.add_task(_run_hive_agent, agent_id, request)
    return agent


@app.get("/api/agents/{agent_id}")
async def get_agent(agent_id: str):
    """Get a single agent's full status."""
    agent = _agents.get(agent_id)
    if not agent:
        raise HTTPException(status_code=404, detail="Agent not found")
    return agent


@app.post("/api/agents/{agent_id}/approve")
async def approve_agent(agent_id: str, body: ApproveAgentRequest):
    """Human-in-the-loop approval or rejection of a paused agent."""
    agent = _agents.get(agent_id)
    if not agent:
        raise HTTPException(status_code=404, detail="Agent not found")

    pending_tool = agent.get("pending_approval")
    if pending_tool:
        event = _tool_approval_events.get(agent_id)
        if event is None:
            raise HTTPException(status_code=409, detail="Tool approval is no longer active")
        _tool_approval_decisions[agent_id] = body.approved
        _log(agent_id, f"👤 Operator {'approved' if body.approved else 'rejected'} `{pending_tool.get('tool')}`" + (f": {body.message}" if body.message else ""))
        event.set()
        return {"ok": True, "action": "approved" if body.approved else "rejected", "tool": pending_tool.get("tool")}
        
    # If already approved/rejected, ignore duplicate clicks from UI
    if agent.get("approved") is not None:
        return {"ok": True, "action": "already_handled"}

    if agent["status"] != "awaiting_approval":
        raise HTTPException(status_code=400, detail="Agent is not awaiting approval")

    agent["approved"] = body.approved
    # Optimistically update status to prevent UI polling race conditions
    agent["status"] = "running" if body.approved else "cancelled"
    agent["updated_at"] = datetime.utcnow().isoformat()
    
    action = "approved" if body.approved else "rejected"
    _log(agent_id, f"👤 Operator {action}" + (f": {body.message}" if body.message else ""))
    return {"ok": True, "action": action}


@app.delete("/api/agents/{agent_id}")
async def delete_agent(agent_id: str):
    """Remove an agent from the registry."""
    if agent_id not in _agents:
        raise HTTPException(status_code=404, detail="Agent not found")
    _agents.pop(agent_id, None)
    _logs.pop(agent_id, None)
    return {"ok": True}


@app.get("/api/agents/{agent_id}/logs")
async def stream_logs(agent_id: str, since: int = 0):
    """
    Server-Sent Events stream of agent log lines.
    `since` is the index of the last log line already seen by the client.
    """
    if agent_id not in _agents:
        raise HTTPException(status_code=404, detail="Agent not found")

    async def _event_generator() -> AsyncGenerator[str, None]:
        cursor = since
        while True:
            lines = _logs.get(agent_id, [])
            if cursor < len(lines):
                for line in lines[cursor:]:
                    data = json.dumps({"line": line, "index": cursor})
                    yield f"data: {data}\n\n"
                    cursor += 1

            agent = _agents.get(agent_id, {})
            if agent.get("status") in ("completed", "failed", "cancelled"):
                yield f"data: {json.dumps({'done': True})}\n\n"
                break

            await asyncio.sleep(0.5)

    return StreamingResponse(
        _event_generator(),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "X-Accel-Buffering": "no",
        },
    )


@app.post("/api/agents/{agent_id}/cancel-operation")
async def cancel_operation(agent_id: str):
    """Cancel the active native transfer for an agent, if one is running."""
    if agent_id not in _agents:
        raise HTTPException(status_code=404, detail="Agent not found")
    process = _active_operations.get(agent_id)
    if process is None or process.poll() is not None:
        return {"ok": False, "cancelled": False, "detail": "No cancellable operation is running"}
    _cancelled_operations.add(agent_id)
    try:
        process.kill()
    except OSError:
        pass
    _log(agent_id, "[TRANSFER] Cancellation requested by operator")
    return {"ok": True, "cancelled": True}


@app.get("/api/intelligence")
async def intelligence_endpoint(text: str):
    """Standalone ML intelligence endpoint — analyze a prompt without creating an agent."""
    if not _ML_AVAILABLE:
        raise HTTPException(status_code=503, detail="ML models not loaded")
    try:
        result = _ml_analyze(text)
        if result is None:
            raise HTTPException(status_code=500, detail="Analysis returned None")
        return result.to_dict()
    except HTTPException:
        raise
    except Exception as exc:
        raise HTTPException(status_code=500, detail=str(exc))


# ---------------------------------------------------------------------------
# Per-user Gmail OAuth (production multi-user MCP)
# ---------------------------------------------------------------------------

@app.get("/api/auth/google/login")
async def google_login():
    """Return Google consent URL. Frontend redirects user there (1-click Connect)."""
    if not _GMAIL_OAUTH_AVAILABLE:
        raise HTTPException(status_code=503, detail="google_oauth module not available")
    try:
        return {"url": _gmail_oauth.build_login_url(state="prism")}  # type: ignore
    except Exception as exc:
        raise HTTPException(status_code=500, detail=str(exc))


@app.get("/api/auth/google/callback")
async def google_callback(code: str = "", state: str = ""):
    """Exchange ?code for tokens, store per user_id. Called after Google consent."""
    if not _GMAIL_OAUTH_AVAILABLE:
        raise HTTPException(status_code=503, detail="google_oauth module not available")
    if not code:
        raise HTTPException(status_code=400, detail="Missing ?code")
    try:
        return _gmail_oauth.exchange_code(code)  # type: ignore
    except Exception as exc:
        raise HTTPException(status_code=400, detail=str(exc))


@app.get("/api/gmail/status")
async def gmail_status(user_id: str = ""):
    if not _GMAIL_OAUTH_AVAILABLE or not user_id:
        return {"connected": False}
    return _gmail_oauth.get_status(user_id)  # type: ignore


@app.post("/api/gmail/disconnect")
async def gmail_disconnect(body: dict):
    if _GMAIL_OAUTH_AVAILABLE and body.get("user_id"):
        _gmail_oauth.disconnect(body["user_id"])  # type: ignore
    return {"ok": True}


# ---------------------------------------------------------------------------
# Dev entry-point
# ---------------------------------------------------------------------------

if __name__ == "__main__":
    import uvicorn

    uvicorn.run("hive_api:app", host="0.0.0.0", port=7433, reload=True)
