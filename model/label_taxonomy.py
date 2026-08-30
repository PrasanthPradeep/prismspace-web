"""Controlled labels for the PrismSpace policy layer."""
from __future__ import annotations

import re

AGENT_LABELS = (
    "research", "coding", "browser", "filesystem", "github", "communication",
    "design", "planning", "validation", "general",
)
LLM_PROVIDERS = ("GPT", "Claude", "Gemini", "Groq", "NVIDIA", "Local")

# Dataset sources often describe an *implementation* (for example, "Dense
# CNN" or "Transformers") where the product needs a user-facing task.  Keep
# the intent vocabulary deliberately small so every class has useful training
# coverage and so downstream latency/cost baselines have stable keys.
INTENT_REMAP: dict[str, str] = {
    "text generation": "text_generation",
    "language modeling": "text_generation",
    "causal language modeling": "text_generation",
    "masked language modeling": "text_generation",
    "transformers": "text_generation",
    "translation": "translation",
    "machine translation": "translation",
    "summarization": "summarization",
    "text summarization": "summarization",
    "question answering": "question_answering",
    "visual question answering": "question_answering",
    "text classification": "text_classification",
    "sentiment analysis": "text_classification",
    "token classification": "text_classification",
    "named entity recognition": "text_classification",
    "image classification": "image_classification",
    "image recognition": "image_classification",
    "dense cnn": "image_classification",
    "convolutional neural network": "image_classification",
    "object detection": "object_detection",
    "image segmentation": "image_segmentation",
    "image generation": "image_generation",
    "text to image": "image_generation",
    "speech recognition": "speech",
    "speech to text": "speech",
    "text to speech": "speech",
    "audio classification": "speech",
    "code generation": "code_generation",
    "code completion": "code_generation",
    "program synthesis": "code_generation",
    "embeddings": "embedding",
    "feature extraction": "embedding",
    "semantic similarity": "embedding",
    "function calling": "tool_use",
    "tool use": "tool_use",
    "agent": "tool_use",
    "chat": "conversation",
    "conversational": "conversation",
    "research": "research",
    "retrieval": "research",
    "file management": "file_management",
}

INTENT_KEYWORDS: tuple[tuple[str, tuple[str, ...]], ...] = (
    ("image_generation", ("text-to-image", "image generation", "diffusion", "stable diffusion", "gan")),
    ("object_detection", ("object detection", "object detector", "yolo", "detectron")),
    ("image_segmentation", ("segmentation", "mask r-cnn")),
    ("image_classification", ("image classification", "image recognition", "cnn", "resnet", "vision transformer", "vit")),
    ("translation", ("translation", "translate", "multilingual")),
    ("summarization", ("summar",)),
    ("question_answering", ("question answering", "question-answering", "qa")),
    ("code_generation", ("code generation", "code completion", "program synthesis", "coding", "programming")),
    ("speech", ("speech", "audio", "asr", "tts", "voice")),
    ("embedding", ("embedding", "feature extraction", "similarity", "representation learning")),
    ("tool_use", ("function calling", "tool use", "api call", "agent")),
    ("conversation", ("conversation", "conversational", "chat")),
    ("research", ("retrieval", "search", "research", "knowledge")),
    ("text_classification", ("classification", "sentiment", "entity recognition", "ner")),
    ("text_generation", ("generation", "language model", "transformer", "gpt", "llm")),
)

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


def normalize_intent_label(value: object) -> str:
    """Map heterogeneous model/task labels to a compact product taxonomy."""
    text = re.sub(r"[._/-]+", " ", str(value).strip().lower())
    text = re.sub(r"\s+", " ", text)
    if text in {"", "nan", "none", "<na>"}:
        return ""
    if text in INTENT_REMAP:
        return INTENT_REMAP[text]
    for intent, keywords in INTENT_KEYWORDS:
        if any(keyword in text for keyword in keywords):
            return intent
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
