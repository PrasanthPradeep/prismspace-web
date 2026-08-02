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
import sqlite3
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

# Workspace root: parent of the hive-backend directory (i.e. prismspace-web/)
WORKSPACE_ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))

# Hive backend directory (where most filesystem operations should happen by default)
HIVE_BACKEND_DIR = os.path.dirname(os.path.abspath(__file__))

# ---------------------------------------------------------------------------
# Helper: Smart path resolution
# ---------------------------------------------------------------------------

def _resolve_path(raw_path: str, prefer_backend: bool = True) -> pathlib.Path:
    """
    Intelligently resolve a path provided by the LLM.
    
    If the path mentions 'hive-backend' or starts with common backend-relative paths,
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
    
    # Path explicitly mentions hive-backend
    if "hive-backend" in raw_path or "hive_backend" in raw_path:
        # Strip the hive-backend prefix if present
        clean_path = raw_path.replace("hive-backend/", "").replace("hive-backend\\", "")
        clean_path = clean_path.replace("hive_backend/", "").replace("hive_backend\\", "")
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
                    base += "- `list_directory_tree(path, max_depth)` — Get a hierarchical tree view of a directory\n"
                    base += "- `get_file_metadata(path)` — Get file size, permissions, and timestamps\n"
                    base += "\nUse the Filesystem Agent to read project files, generate code, apply edits, "
                    base += "organize directories, and inspect file structures without leaving the agent run.\n"
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
    chat_history: list[ChatContextMessage] | list[dict[str, str]]
) -> str:
    """Call Groq API with stop sequences to enforce ReAct pattern."""
    from groq import AsyncGroq
    client = AsyncGroq(api_key=os.environ.get("GROQ_API_KEY"))
    
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
    chat_history: list[ChatContextMessage] | list[dict[str, str]]
) -> str:
    """Call OpenAI API with stop sequences to enforce ReAct pattern."""
    from openai import AsyncOpenAI
    client = AsyncOpenAI(api_key=os.environ.get("OPENAI_API_KEY"))
    
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
    chat_history: list[ChatContextMessage] | list[dict[str, str]]
) -> str:
    """Call Anthropic API with stop sequences to enforce ReAct pattern."""
    import anthropic
    client = anthropic.AsyncAnthropic(api_key=os.environ.get("ANTHROPIC_API_KEY"))
    
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
    chat_history: list[ChatContextMessage] | list[dict[str, str]]
) -> str:
    """Call Google Gemini API and return the response text."""
    from google import genai
    client = genai.Client(api_key=os.environ.get("GEMINI_API_KEY"))
    
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
    chat_history: list[ChatContextMessage] | list[dict[str, str]]
) -> str:
    """Call NVIDIA NIM API (OpenAI-compatible) with streaming, reasoning budget, and stop sequences."""
    from openai import AsyncOpenAI
    client = AsyncOpenAI(
        base_url="https://integrate.api.nvidia.com/v1",
        api_key=os.environ.get("NVIDIA_API_KEY", "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"),
    )
    
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
        top_p=1,
        max_tokens=16384,
        extra_body={"reasoning_budget": 16384},
        stop=["```\n\n", "```\n", "\n\n\n"],  # Stop after tool call code blocks
        stream=True,
    )
    async for chunk in stream:
        if not chunk.choices:
            continue
        delta = chunk.choices[0].delta
        if getattr(delta, "content", None) is not None:
            chunks.append(delta.content)
    result = "".join(chunks)
    return result if result.strip() else "(No response generated)"


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


def _exec_move_file(args: dict) -> str:
    raw_src = args.get("source", "")
    raw_dst = args.get("destination", "")
    
    # Use smart path resolution
    p_src = _resolve_path(raw_src)
    p_dst = _resolve_path(raw_dst)
        
    if not p_src.exists():
        return f"Error: Source not found: {raw_src} (resolved to: {p_src})"
        
    try:
        p_dst.parent.mkdir(parents=True, exist_ok=True)
        shutil.move(str(p_src), str(p_dst))
        return f"Successfully moved '{raw_src}' to '{raw_dst}' (from {p_src} to {p_dst})"
    except Exception as e:
        return f"Error moving file from '{raw_src}' to '{raw_dst}': {e}"


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


def _dispatch_tool(tool_call: dict) -> str:
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
        # Basic: treat as read + write
        return "edit_file: use read_file then write_file for now — direct patch execution coming soon."
    if tool == "create_directory":
        return _exec_create_directory(args)
    if tool == "delete_file":
        return _exec_delete_file(args)
    if tool == "move_file":
        return _exec_move_file(args)
    if tool == "list_directory_tree":
        return _exec_list_directory_tree(args)
    if tool == "get_file_metadata":
        return _exec_get_file_metadata(args)

    # SQLite tools
    if tool in ("read_query", "write_query", "create_table", "list_tables", "describe_table"):
        return _exec_sqlite(args, tool)

    # Memory tools
    if tool in ("set_memory", "get_memory", "list_memory", "delete_memory"):
        return _exec_memory(args, tool)

    return (
        f"Tool '{tool}' was recognised but has no local executor. "
        "It will be handled by the MCP server process when integrated."
    )


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
                    "- list_directory_tree: Get directory structure\n"
                    "- get_file_metadata: Get file information\n"
                    "- set_memory: Store a value in memory\n"
                    "- get_memory: Retrieve a value from memory\n"
                    "- read_query: Execute SQL SELECT query\n"
                    "- write_query: Execute SQL INSERT/UPDATE/DELETE\n\n"
                    
                    f"Original user request: {request.objective}\n\n"
                    
                    "NOW: Output the JSON tool call and NOTHING ELSE."
                )
                
                conversation_history.append({"role": "user", "content": correction_message})
                
                _log(agent_id, f"🔄 Forcing retry with correction prompt (attempt {correction_attempts}/{max_correction_attempts})...")
                
                # Call LLM again with correction
                provider = request.provider.lower()
                
                try:
                    if provider == "groq":
                        current_response = await _call_groq(request.model, "", conversation_history)
                    elif provider == "nvidia":
                        current_response = await _call_nvidia(request.model, "", conversation_history)
                    elif provider == "openai":
                        current_response = await _call_openai(request.model, "", conversation_history)
                    elif provider == "anthropic":
                        current_response = await _call_anthropic(request.model, "", conversation_history)
                    elif provider == "google":
                        current_response = await _call_google(request.model, "", conversation_history)
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
            
            result = _dispatch_tool(tc)
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
                current_response = await _call_groq(request.model, "", conversation_history)
            elif provider == "nvidia":
                current_response = await _call_nvidia(request.model, "", conversation_history)
            elif provider == "openai":
                current_response = await _call_openai(request.model, "", conversation_history)
            elif provider == "anthropic":
                current_response = await _call_anthropic(request.model, "", conversation_history)
            elif provider == "google":
                current_response = await _call_google(request.model, "", conversation_history)
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
