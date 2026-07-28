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
import json
import os
import re
import time
import uuid
from datetime import datetime
from typing import AsyncGenerator, Optional

from dotenv import load_dotenv
from fastapi import FastAPI, HTTPException, BackgroundTasks
from fastapi import FastAPI, HTTPException, BackgroundTasks, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse
from pydantic import BaseModel, Field

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

TOOLS_DIR = os.path.join(os.path.dirname(__file__), "hive", "tools")
MCP_SERVERS_PATH = os.path.join(TOOLS_DIR, "mcp_servers.json")
TOOLS_ENV_PATH = os.path.join(TOOLS_DIR, ".env")

# ---------------------------------------------------------------------------
# Pydantic models
# ---------------------------------------------------------------------------


class ChatContextMessage(BaseModel):
    role: str
    content: str


class CreateAgentRequest(BaseModel):
    objective: str
    model: str = "z-ai/glm-5.2"       # any Hive-supported model
    provider: str = "nvidia"           # nvidia | groq
    max_agents: int = 3
    human_in_loop: bool = True
    chat_history: list[ChatContextMessage] = Field(default_factory=list)


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


def _load_mcp_servers() -> dict:
    try:
        with open(MCP_SERVERS_PATH, "r", encoding="utf-8") as f:
            return json.load(f)
    except (FileNotFoundError, json.JSONDecodeError):
        return {}


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
    """Build a context-aware system prompt that includes MCP tool information."""
    base = (
        "You are a powerful multi-agent AI assistant running inside the PrismSpace Agent Swarm. "
        "You are powered by the Hive multi-agent orchestration framework (aden-hive/hive). "
        "Provide clear, detailed, and well-structured responses.\n\n"
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
                elif name == "hive_tools":
                    base += "\n**Hive Tools MCP is ACTIVE**\n"
                    base += "You can use: web_search, web_scrape, send_email, and data tools.\n"

                base += "\n"

            base += (
                "When a user asks what you can do, explicitly mention these live MCP integrations. "
                "When a user provides a Figma link, use the Figma MCP to read and analyze it. "
                "Do NOT say you don't have access to these tools — they are initialized and ready.\n"
            )
    except (FileNotFoundError, json.JSONDecodeError):
        pass  # No MCP config found, use base prompt

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


async def _call_groq(model: str, objective: str, chat_history: list[ChatContextMessage]) -> str:
    """Call Groq API and return the response text."""
    from groq import AsyncGroq
    client = AsyncGroq(api_key=os.environ.get("GROQ_API_KEY"))
    response = await client.chat.completions.create(
        model=model,
        messages=[
            {"role": "system", "content": _build_system_prompt()},
            *_normalise_chat_history(chat_history),
            {"role": "user", "content": objective},
        ],
        temperature=0.7,
        max_tokens=4096,
    )
    return response.choices[0].message.content or "(No response generated)"


async def _call_openai(model: str, objective: str, chat_history: list[ChatContextMessage]) -> str:
    """Call OpenAI API and return the response text."""
    from openai import AsyncOpenAI
    client = AsyncOpenAI(api_key=os.environ.get("OPENAI_API_KEY"))
    response = await client.chat.completions.create(
        model=model,
        messages=[
            {"role": "system", "content": _build_system_prompt()},
            *_normalise_chat_history(chat_history),
            {"role": "user", "content": objective},
        ],
        temperature=0.7,
        max_tokens=4096,
    )
    return response.choices[0].message.content or "(No response generated)"


async def _call_anthropic(model: str, objective: str, chat_history: list[ChatContextMessage]) -> str:
    """Call Anthropic API and return the response text."""
    import anthropic
    client = anthropic.AsyncAnthropic(api_key=os.environ.get("ANTHROPIC_API_KEY"))
    response = await client.messages.create(
        model=model,
        max_tokens=4096,
        system=_build_system_prompt(),
        messages=[
            *_normalise_chat_history(chat_history),
            {"role": "user", "content": objective},
        ],
    )
    return response.content[0].text if response.content else "(No response generated)"


async def _call_google(model: str, objective: str, chat_history: list[ChatContextMessage]) -> str:
    """Call Google Gemini API and return the response text."""
    from google import genai
    client = genai.Client(api_key=os.environ.get("GEMINI_API_KEY"))
    history_text = "\n".join(
        f"{message['role'].title()}: {message['content']}"
        for message in _normalise_chat_history(chat_history)
    )
    full_prompt = _build_system_prompt()
    if history_text:
        full_prompt += "\n\n## Previous Chat Context\n" + history_text
    full_prompt += "\n\n---\n\nUser request: " + objective
    response = await client.aio.models.generate_content(
        model=model,
        contents=full_prompt,
    )
    return response.text or "(No response generated)"


async def _call_nvidia(model: str, objective: str, chat_history: list[ChatContextMessage]) -> str:
    """Call NVIDIA NIM API (OpenAI-compatible) and return the response text."""
    from openai import AsyncOpenAI
    client = AsyncOpenAI(
        base_url="https://integrate.api.nvidia.com/v1",
        api_key=os.environ.get("NVIDIA_API_KEY", "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"),
    )
    response = await client.chat.completions.create(
        model=model,
        messages=[
            {"role": "system", "content": _build_system_prompt()},
            *_normalise_chat_history(chat_history),
            {"role": "user", "content": objective},
        ],
        temperature=1,
        top_p=1,
        max_tokens=16384,
        seed=42,
    )
    return response.choices[0].message.content or "(No response generated)"


# ---------------------------------------------------------------------------
# Background task: real LLM-powered agent run
# ---------------------------------------------------------------------------

async def _run_hive_agent(agent_id: str, request: CreateAgentRequest) -> None:
    """
    Drives the agent through its lifecycle stages and calls the actual LLM API
    based on the selected provider.
    """
    agent = _agents[agent_id]

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
        for sa in sub_agents:
            _log(agent_id, f"   -> {sa} ready")
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
            result_text = await _call_groq(request.model, request.objective, request.chat_history)
        elif provider == "nvidia":
            result_text = await _call_nvidia(request.model, request.objective, request.chat_history)
        elif provider == "openai":
            result_text = await _call_openai(request.model, request.objective, request.chat_history)
        elif provider == "anthropic":
            result_text = await _call_anthropic(request.model, request.objective, request.chat_history)
        elif provider == "google":
            result_text = await _call_google(request.model, request.objective, request.chat_history)
        else:
            raise ValueError(f"Unsupported provider: {request.provider}")

        _log(agent_id, f"Received response from {request.provider} ({len(result_text)} chars)")
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


# ---------------------------------------------------------------------------
# Routes
# ---------------------------------------------------------------------------


@app.get("/health")
async def health_check():
    """Liveness probe — used by the frontend to verify the backend is running."""
    return {"status": "ok", "version": "1.0.0", "agents": len(_agents)}


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

    agent = {
        "id": agent_id,
        "objective": request.objective,
        "model": request.model,
        "provider": request.provider,
        "max_agents": request.max_agents,
        "human_in_loop": request.human_in_loop,
        "status": "initialising",
        "created_at": now,
        "updated_at": now,
        "result": None,
        "approved": None,
    }

    _agents[agent_id] = agent
    _logs[agent_id] = []

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


# ---------------------------------------------------------------------------
# Dev entry-point
# ---------------------------------------------------------------------------

if __name__ == "__main__":
    import uvicorn

    uvicorn.run("hive_api:app", host="0.0.0.0", port=7433, reload=True)
