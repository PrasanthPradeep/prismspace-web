# Copyright 2026 Nobin Sijo (NobinSijo7T).
# SPDX-License-Identifier: Apache-2.0
"""Structured cross-platform operating-system tools for Hive agents."""

from __future__ import annotations

import json
import os
import platform
import shutil
import signal
import socket
import subprocess
import tarfile
import tempfile
import time
import zipfile
from pathlib import Path
from typing import Any


WORKSPACE_ROOT = Path(__file__).resolve().parent.parent
MAX_OUTPUT = 12_000


def _run(command: list[str], timeout: int = 30, cwd: Path | None = None) -> tuple[int, str]:
    try:
        result = subprocess.run(
            command,
            cwd=str(cwd or WORKSPACE_ROOT),
            capture_output=True,
            text=True,
            encoding="utf-8",
            errors="replace",
            timeout=max(1, min(timeout, 300)),
            check=False,
        )
        output = ((result.stdout or "") + ("\n" + result.stderr if result.stderr else "")).strip()
        return result.returncode, output[-MAX_OUTPUT:]
    except FileNotFoundError:
        return 127, f"Command not found: {command[0]}"
    except subprocess.TimeoutExpired:
        return 124, f"Command timed out after {timeout}s: {' '.join(command)}"
    except OSError as exc:
        return 1, str(exc)


def _workspace_path(raw: str, must_exist: bool = False) -> Path:
    path = Path(raw or ".")
    if not path.is_absolute():
        path = WORKSPACE_ROOT / path
    path = path.resolve()
    try:
        path.relative_to(WORKSPACE_ROOT)
    except ValueError as exc:
        raise ValueError(f"Path must stay inside the workspace: {path}") from exc
    if must_exist and not path.exists():
        raise ValueError(f"Path not found: {path}")
    return path


def _json(value: Any) -> str:
    return json.dumps(value, indent=2, default=str)[:MAX_OUTPUT]


def _system_info() -> str:
    usage = shutil.disk_usage(WORKSPACE_ROOT)
    result: dict[str, Any] = {
        "platform": platform.platform(),
        "system": platform.system(),
        "release": platform.release(),
        "machine": platform.machine(),
        "python": platform.python_version(),
        "hostname": socket.gethostname(),
        "cpu_count": os.cpu_count(),
        "workspace": str(WORKSPACE_ROOT),
        "disk": {"total": usage.total, "used": usage.used, "free": usage.free},
    }
    if hasattr(os, "getloadavg"):
        result["load_average"] = os.getloadavg()
    if os.name == "nt":
        code, output = _run(["powershell.exe", "-NoProfile", "-NonInteractive", "-Command", "Get-CimInstance Win32_OperatingSystem | Select-Object FreePhysicalMemory,TotalVisibleMemorySize | ConvertTo-Json"])
        if code == 0:
            result["memory"] = output
    elif Path("/proc/meminfo").exists():
        memory: dict[str, str] = {}
        for line in Path("/proc/meminfo").read_text(errors="ignore").splitlines():
            key, _, value = line.partition(":")
            if key in {"MemTotal", "MemAvailable", "SwapTotal", "SwapFree"}:
                memory[key] = value.strip()
        result["memory"] = memory
    return _json(result)


def _list_processes(args: dict) -> str:
    query = str(args.get("query", "")).lower()
    limit = max(1, min(int(args.get("limit", 100)), 500))
    if os.name == "nt":
        code, output = _run(["tasklist", "/FO", "CSV", "/NH"])
        if code != 0:
            return f"Process listing failed: {output}"
        rows = []
        for line in output.splitlines():
            fields = [part.strip('"') for part in line.split('","')]
            if fields and (not query or query in line.lower()):
                rows.append(fields)
        return _json({"platform": "windows", "processes": rows[:limit]})
    code, output = _run(["ps", "-eo", "pid,ppid,%cpu,%mem,stat,etime,comm,args", "--sort=-%cpu"])
    if code != 0:
        return f"Process listing failed: {output}"
    rows = [line for line in output.splitlines() if not query or query in line.lower()]
    return "\n".join(rows[: limit + 1])[-MAX_OUTPUT:]


def _process_action(tool: str, args: dict) -> str:
    pid = int(args.get("pid", 0))
    if pid <= 0 or pid == os.getpid():
        return "Error: a valid target pid is required and the Hive server cannot target itself."
    if tool == "stop_process":
        if os.name == "nt":
            code, output = _run(["taskkill", "/PID", str(pid), "/T", "/F"])
        else:
            try:
                os.kill(pid, signal.SIGTERM)
                return f"Stop signal sent to process {pid}."
            except OSError as exc:
                return f"Could not stop process {pid}: {exc}"
        return output or f"Process {pid} stop command exited with {code}."
    if tool == "process_status":
        if os.name == "nt":
            code, output = _run(["tasklist", "/FI", f"PID eq {pid}", "/FO", "LIST"])
        else:
            code, output = _run(["ps", "-p", str(pid), "-o", "pid,ppid,%cpu,%mem,stat,etime,args"])
        return output or f"No process information for {pid} (exit {code})."
    command = str(args.get("command", "")).strip()
    if not command:
        return "Error: restart_process requires the command to launch after stopping the process."
    stopped = _process_action("stop_process", {"pid": pid})
    if os.name == "nt":
        process = subprocess.Popen(["powershell.exe", "-NoProfile", "-Command", command], cwd=str(WORKSPACE_ROOT))
    else:
        process = subprocess.Popen(command, cwd=str(WORKSPACE_ROOT), shell=True)
    return f"{stopped}\nRestarted command with pid {process.pid}."


def _services(tool: str, args: dict) -> str:
    name = str(args.get("name", "")).strip()
    if tool != "list_services" and (not name or any(ch not in "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789_.-" for ch in name)):
        return "Error: invalid service name."
    if os.name == "nt":
        if tool == "list_services":
            code, output = _run(["powershell.exe", "-NoProfile", "-NonInteractive", "-Command", "Get-Service | Select-Object Status,Name,DisplayName | ConvertTo-Json"])
        else:
            verb = {"service_status": "Get-Service", "start_service": "Start-Service", "stop_service": "Stop-Service", "restart_service": "Restart-Service"}[tool]
            command = f"{verb} -Name '{name}'" + (" | Select-Object Status,Name,DisplayName | ConvertTo-Json" if tool == "service_status" else "")
            code, output = _run(["powershell.exe", "-NoProfile", "-NonInteractive", "-Command", command])
    else:
        if tool == "list_services":
            return _run(["systemctl", "list-units", "--type=service", "--no-pager", "--plain"])[1]
        action = {"service_status": "status", "start_service": "start", "stop_service": "stop", "restart_service": "restart"}[tool]
        code, output = _run(["systemctl", action, name])
    return output or f"Service operation exited with {code}."


def _package(tool: str, args: dict) -> str:
    if tool == "package_manager":
        for candidate in ("winget", "choco", "brew", "apt-get", "dnf", "pacman"):
            if shutil.which(candidate):
                return f"Detected package manager: {candidate}"
        return "No supported package manager found (winget/choco/brew/apt-get/dnf/pacman)."

    package = str(args.get("package", "")).strip()
    if not package or any(ch in package for ch in "\r\n;&|<>`"):
        return "Error: package must be a single package name."
    managers = (["winget", "install", "--accept-source-agreements", "--accept-package-agreements", "--id", package] if os.name == "nt" and shutil.which("winget") else None)
    if managers is None and os.name == "nt" and shutil.which("choco"):
        managers = ["choco", "install", package, "-y"]
    if managers is None and os.name != "nt" and shutil.which("brew"):
        managers = ["brew", "install", package]
    if managers is None and os.name != "nt" and shutil.which("apt-get"):
        managers = ["sudo", "apt-get", "install", "-y", package]
    if managers is None and os.name != "nt" and shutil.which("dnf"):
        managers = ["sudo", "dnf", "install", "-y", package]
    if managers is None and os.name != "nt" and shutil.which("pacman"):
        managers = ["sudo", "pacman", "-S", "--noconfirm", package]
    if managers is None:
        return "No supported package manager found (winget/choco/brew/apt-get)."
    code, output = _run(managers, timeout=600)
    return f"Package install exit {code}:\n{output}"


def _environment(tool: str, args: dict) -> str:
    key = str(args.get("key", "")).strip()
    if not key or not key.replace("_", "").isalnum() or key[0].isdigit():
        return "Error: invalid environment variable name."
    if tool == "get_environment":
        if key == "*":
            return _json(dict(sorted(os.environ.items())))
        return f"{key}={os.environ.get(key, '(not set)')}"
    if tool == "set_environment":
        value = str(args.get("value", ""))
        os.environ[key] = value
        if os.name == "nt":
            code, output = _run(["setx", key, value])
            return f"Set {key} for this process and user environment (exit {code}). {output}".strip()
        return f"Set {key} for the current Hive process. Restart the backend to reload it."
    os.environ.pop(key, None)
    if os.name == "nt":
        code, output = _run(["setx", key, ""])
        return f"Removed {key} from this process and cleared its persisted value (exit {code}). {output}".strip()
    return f"Removed {key} from the current Hive process."


def _archive(tool: str, args: dict) -> str:
    source = _workspace_path(str(args.get("source", "")), must_exist=True)
    archive = _workspace_path(str(args.get("archive", "")))
    if tool == "create_archive":
        archive.parent.mkdir(parents=True, exist_ok=True)
        if archive.suffix.lower() == ".zip":
            with zipfile.ZipFile(archive, "w", zipfile.ZIP_DEFLATED) as handle:
                if source.is_dir():
                    for item in source.rglob("*"):
                        if item.is_file():
                            handle.write(item, item.relative_to(source.parent))
                else:
                    handle.write(source, source.name)
        else:
            with tarfile.open(archive, "w:gz") as handle:
                handle.add(source, arcname=source.name)
        return f"Created archive {archive}."
    destination = _workspace_path(str(args.get("destination", "")))
    destination.mkdir(parents=True, exist_ok=True)
    if archive.suffix.lower() == ".zip":
        with zipfile.ZipFile(archive) as handle:
            destination_root = destination.resolve()
            for member in handle.infolist():
                target = (destination / member.filename).resolve()
                try:
                    target.relative_to(destination_root)
                except ValueError as exc:
                    raise ValueError(f"Archive member escapes destination: {member.filename}") from exc
            handle.extractall(destination)
    else:
        with tarfile.open(archive) as handle:
            handle.extractall(destination, filter="data")
    return f"Extracted {archive} to {destination}."


def _permissions(tool: str, args: dict) -> str:
    path = _workspace_path(str(args.get("path", "")), must_exist=True)
    if tool == "get_permissions":
        info = path.stat()
        return _json({"path": str(path), "mode": oct(info.st_mode & 0o777), "read_only": not os.access(path, os.W_OK)})
    mode = int(str(args.get("mode", "644")), 8)
    os.chmod(path, mode)
    return f"Set permissions for {path} to {oct(mode)}."


def _scheduled_tasks(tool: str, args: dict) -> str:
    name = str(args.get("name", "")).strip()
    if os.name == "nt":
        if tool == "list_scheduled_tasks":
            code, output = _run(["schtasks", "/Query", "/FO", "LIST", "/V"])
        elif tool == "delete_scheduled_task":
            code, output = _run(["schtasks", "/Delete", "/TN", name, "/F"])
        elif tool == "run_scheduled_task":
            code, output = _run(["schtasks", "/Run", "/TN", name])
        else:
            command = str(args.get("command", "")).strip()
            schedule = str(args.get("schedule", "DAILY"))
            time_value = str(args.get("time", "09:00"))
            code, output = _run(["schtasks", "/Create", "/TN", name, "/TR", command, "/SC", schedule, "/ST", time_value, "/F"])
    else:
        if tool == "list_scheduled_tasks":
            code, output = _run(["crontab", "-l"])
        else:
            return "Scheduled task mutation is supported through Windows Task Scheduler; use terminal with cron/systemd on Linux/macOS."
    return output or f"Scheduled task operation exited with {code}."


def _network(tool: str, args: dict) -> str:
    host = str(args.get("host", "")).strip()
    if not host or any(ch in host for ch in "\r\n;&|<>`"):
        return "Error: valid host is required."
    if tool == "dns_lookup":
        try:
            return _json({"host": host, "addresses": sorted({item[4][0] for item in socket.getaddrinfo(host, None)})})
        except socket.gaierror as exc:
            return f"DNS lookup failed: {exc}"
    count = str(max(1, min(int(args.get("count", 3)), 10)))
    command = ["ping", "-n" if os.name == "nt" else "-c", count, host]
    code, output = _run(command, timeout=30)
    return f"Ping exit {code}:\n{output}"


def execute_os_tool(tool: str, args: dict) -> str:
    """Dispatch a structured OS capability tool."""
    if tool == "system_info" or tool == "disk_usage":
        return _system_info() if tool == "system_info" else _json(shutil.disk_usage(WORKSPACE_ROOT)._asdict())
    if tool == "list_processes" or tool == "process_status" or tool in {"stop_process", "restart_process"}:
        return _list_processes(args) if tool == "list_processes" else _process_action(tool, args)
    if tool in {"list_services", "service_status", "start_service", "stop_service", "restart_service"}:
        return _services(tool, args)
    if tool in {"package_manager", "install_package"}:
        return _package(tool, args)
    if tool in {"get_environment", "set_environment", "remove_environment"}:
        return _environment(tool, args)
    if tool in {"create_archive", "extract_archive"}:
        return _archive(tool, args)
    if tool in {"get_permissions", "set_permissions"}:
        return _permissions(tool, args)
    if tool in {"list_scheduled_tasks", "create_scheduled_task", "delete_scheduled_task", "run_scheduled_task"}:
        return _scheduled_tasks(tool, args)
    if tool in {"ping_host", "dns_lookup"}:
        return _network(tool, args)
    return f"Unknown OS tool: {tool}"


DESTRUCTIVE_OS_TOOLS = {
    "stop_process", "restart_process", "start_service", "stop_service", "restart_service",
    "install_package", "set_environment", "remove_environment", "extract_archive",
    "set_permissions", "create_scheduled_task", "delete_scheduled_task", "run_scheduled_task",
}
