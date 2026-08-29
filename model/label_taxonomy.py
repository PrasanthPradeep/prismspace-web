"""Controlled labels for the PrismSpace policy layer."""
from __future__ import annotations

import re

AGENT_LABELS = (
    "research", "coding", "browser", "filesystem", "github", "communication",
    "design", "planning", "validation", "general",
)
LLM_PROVIDERS = ("GPT", "Claude", "Gemini", "Groq", "NVIDIA", "Local")

AGENT_RULES: tuple[tuple[str, tuple[str, ...]], ...] = (
    ("github", ("github", "gitlab", "pull request", "commit", "repository", "issue")),
    ("design", ("figma", "design", "prototype", "wireframe", "canvas")),
    ("communication", ("gmail", "email", "slack", "message", "calendar", "send mail")),
    ("filesystem", ("filesystem", "file system", "directory", "folder", "local file", "google drive")),
    ("research", ("pubmed", "wikipedia", "arxiv", "scholar", "literature", "knowledge graph")),
    ("browser", ("browser", "website", "webshop", "mind2web", "search web", "web search", "maps", "amazon")),
    ("validation", ("validation", "validate", "test", "evaluate", "benchmark", "quality check")),
    ("planning", ("plan", "workflow", "orchestrat", "schedule", "task decomposition")),
    ("coding", ("code", "program", "python", "tensorflow", "pytorch", "api", "database", "terminal", "shell")),
)


def normalize_agent_label(value: object) -> str:
    text = str(value).lower()
    for label, keywords in AGENT_RULES:
        if any(keyword in text for keyword in keywords):
            return label
    return "general"


def normalize_provider_label(value: object) -> str:
    text = str(value).lower()
    if re.search(r"\b(gpt|openai)\b", text):
        return "GPT"
    if "claude" in text or "anthropic" in text:
        return "Claude"
    if "gemini" in text or "google ai" in text:
        return "Gemini"
    if "groq" in text:
        return "Groq"
    if "nvidia" in text or "nim" in text:
        return "NVIDIA"
    if any(token in text for token in ("local", "ollama", "llama.cpp", "vllm")):
        return "Local"
    return ""
