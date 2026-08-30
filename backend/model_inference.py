"""
Model Inference Service for Hive Backend
==========================================
Loads trained ML model artifacts and provides intelligent predictions
for agent routing, cost/latency estimation, approval checks, and anomaly detection.

Models are loaded lazily on first call to avoid slowing backend startup.
Each prediction is wrapped in try/except so one failing model never breaks the pipeline.
"""

from __future__ import annotations

import re
import logging
from dataclasses import dataclass, field, asdict
from pathlib import Path
from typing import Optional

import joblib
import numpy as np
import pandas as pd

LOG = logging.getLogger("model_inference")

# ---------------------------------------------------------------------------
# Path to trained model artifacts
# ---------------------------------------------------------------------------

ARTIFACTS_DIR = Path(__file__).resolve().parent.parent / "model" / "artifacts"

# ---------------------------------------------------------------------------
# Singleton model registry — loaded once, reused forever
# ---------------------------------------------------------------------------

_models: dict[str, dict] = {}
_loaded = False


def _load_models() -> None:
    """Load all .joblib model bundles from the artifacts directory."""
    global _loaded
    if _loaded:
        return

    artifact_files = {
        "intent": "intent_classifier.joblib",
        "agent": "agent_router.joblib",
        "provider": "model_router.joblib",
        "success": "workflow_success_predictor.joblib",
        "approval": "approval_predictor.joblib",
        "latency": "latency_predictor.joblib",
        "cost": "cost_predictor.joblib",
        "anomaly": "anomaly_detector.joblib",
    }

    for key, filename in artifact_files.items():
        path = ARTIFACTS_DIR / filename
        if path.exists():
            try:
                _models[key] = joblib.load(path)
                LOG.info("Loaded model: %s (%s)", key, filename)
            except Exception as exc:
                LOG.warning("Failed to load %s: %s", filename, exc)
        else:
            LOG.warning("Model artifact not found: %s", path)

    _loaded = True
    LOG.info("Model inference ready — %d/%d models loaded.", len(_models), len(artifact_files))


# ---------------------------------------------------------------------------
# Feature extraction (mirrors model/feature_engineering.py)
# ---------------------------------------------------------------------------

def _build_features(text: str) -> pd.DataFrame:
    """Build the feature DataFrame expected by the trained pipelines."""
    return pd.DataFrame({
        "text": [text],
        "numeric_0": [float(len(text))],
        "numeric_1": [float(len(text.split()))],
        "numeric_2": [float(len(re.findall(r"\w+", text)))],
        "numeric_3": [float(text.count("?"))],
        "numeric_4": [float(text.count("\n"))],
    })


def _build_numeric_only(text: str) -> np.ndarray:
    """Build numeric-only features for the anomaly detector."""
    return np.array([[
        len(text),
        len(text.split()),
        len(re.findall(r"\w+", text)),
        text.count("?"),
        text.count("\n"),
    ]], dtype=np.float32)


# The heterogeneous training corpus has reliable task names but does not
# consistently pair them with natural-language requests.  Prefer precise,
# user-facing task cues when present; the trained classifier remains the
# fallback for requests that do not match one of these unambiguous patterns.
INTENT_RULES: tuple[tuple[str, tuple[str, ...]], ...] = (
    ("image_generation", (r"\b(image|picture|photo) generation\b", r"\btext[- ]to[- ]image\b", r"\bstable diffusion\b", r"\bdiffusion model\b")),
    ("object_detection", (r"\bobject detection\b", r"\bdetect objects?\b", r"\byolo\b", r"\bdetectron\b")),
    ("image_segmentation", (r"\bimage segmentation\b", r"\bsegment (this )?(image|photo|picture)\b")),
    ("image_classification", (r"\bclassify (this )?(image|photo|picture)\b", r"\bimage classification\b", r"\brecognize (this )?(image|photo|picture)\b")),
    ("translation", (r"\btranslate\b", r"\btranslation\b", r"\bconvert .+ to (english|french|spanish|german|chinese|japanese)\b")),
    ("summarization", (r"\bsummari[sz]e\b", r"\bsummarization\b", r"\btl;dr\b")),
    ("code_generation", (r"\b(write|generate|create) (a |some )?(python|javascript|typescript|java|sql|code)\b", r"\bcode generation\b", r"\bimplement (a |the )?(function|class|api)\b")),
    ("question_answering", (r"\b(question answering|answer this question)\b", r"^(what|who|when|where|why|how)\b")),
    ("text_generation", (r"\b(generate|write|compose|draft)\b", r"\b(short )?story\b", r"\btext generation\b")),
)


def _rule_based_intent(text: str) -> Optional[str]:
    """Return a task intent only for unambiguous user-request phrasing."""
    for intent, patterns in INTENT_RULES:
        if any(re.search(pattern, text, flags=re.IGNORECASE) for pattern in patterns):
            return intent
    return None


# ---------------------------------------------------------------------------
# Prediction helpers
# ---------------------------------------------------------------------------

def _predict_class(model_key: str, features: pd.DataFrame) -> tuple[Optional[str], float]:
    """Run a classification model and return (label, confidence)."""
    bundle = _models.get(model_key)
    if not bundle:
        return None, 0.0

    model = bundle["model"]
    label_enc = bundle.get("label_encoder")

    try:
        from sklearn.preprocessing import MultiLabelBinarizer, LabelEncoder

        pred = model.predict(features)

        # Get confidence from predict_proba if available
        confidence = 0.0
        try:
            proba = model.predict_proba(features)
            confidence = float(np.max(proba))
        except Exception:
            confidence = 0.5  # default if no proba

        # Decode prediction back to human-readable string
        if isinstance(label_enc, MultiLabelBinarizer):
            # Multilabel: pred is [[0, 1, 0, ...]], inverse_transform returns [('label1', 'label2')]
            labels = label_enc.inverse_transform(pred)
            label = ", ".join(labels[0]) if labels[0] else "general"
            return label, confidence
        elif isinstance(label_enc, LabelEncoder):
            # Single label: pred is [42], inverse_transform returns ['Text Generation']
            label = label_enc.inverse_transform(pred.astype(int))[0]
            return str(label), confidence
        else:
            return str(pred[0]), confidence

    except Exception as exc:
        LOG.warning("Prediction failed for %s: %s", model_key, exc)
        return None, 0.0


def _predict_regression(model_key: str, features: pd.DataFrame) -> Optional[float]:
    """Run a regression model and return the predicted value."""
    bundle = _models.get(model_key)
    if not bundle:
        return None

    try:
        pred = bundle["model"].predict(features)
        return max(0.0, float(pred[0]))  # clamp to non-negative
    except Exception as exc:
        LOG.warning("Regression prediction failed for %s: %s", model_key, exc)
        return None


def _predict_anomaly(text: str) -> bool:
    """Run the anomaly detector and return True if the request is anomalous."""
    bundle = _models.get("anomaly")
    if not bundle:
        return False

    try:
        features = _build_numeric_only(text)
        pred = bundle["model"].predict(features)
        return int(pred[0]) == -1  # IsolationForest: -1 = anomaly
    except Exception as exc:
        LOG.warning("Anomaly detection failed: %s", exc)
        return False


# ---------------------------------------------------------------------------
# Provider name normalisation
# ---------------------------------------------------------------------------

# Map model-predicted provider labels to the backend's known provider keys
PROVIDER_MAP = {
    "nvidia": "nvidia",
    "groq": "groq",
    "openai": "openai",
    "anthropic": "anthropic",
    "google": "google",
    "meta": "nvidia",       # Meta models typically served via NVIDIA NIM
    "mistral": "nvidia",    # Mistral models served via NVIDIA NIM
    "huggingface": "nvidia",
    "cohere": "nvidia",
}


def _normalise_provider(raw: Optional[str]) -> str:
    """Map a model-predicted provider label to a backend-supported provider key."""
    if not raw:
        return "nvidia"
    key = raw.lower().strip().replace("-", "").replace("_", "").replace(" ", "")
    for known, mapped in PROVIDER_MAP.items():
        if known in key:
            return mapped
    return "nvidia"  # safe default


# ---------------------------------------------------------------------------
# Rule-based approval detection (Fix 4)
# ---------------------------------------------------------------------------

APPROVAL_KEYWORDS = [
    "hack", "steal", "password", "exploit", "attack", "delete all",
    "drop table", "rm -rf", "format disk", "credit card", "ssn",
    "social security", "kill", "weapon", "illegal", "bypass",
    "inject", "phishing", "malware", "ransomware", "brute force",
    "destroy", "wipe", "erase everything", "bomb", "backdoor",
    "sudo rm", "shutdown", "disable security", "root access",
]

# These are narrowly defensive requests, not merely the presence of a safety
# keyword.  Keep the patterns specific so an adversarial request cannot evade
# approval by adding generic educational language.
DEFENSIVE_SAFETY_PATTERNS = (
    r"\bsecure password (storage|management|hashing)\b",
    r"\bprevent sql injection\b",
    r"\bphishing awareness (training|program)\b",
    r"\bresponsible[- ]disclosure policy\b",
)


def _check_approval(text: str) -> tuple[bool, float]:
    """Rule-based safety check. Returns (needs_approval, confidence)."""
    text_lower = text.lower()
    if any(re.search(pattern, text_lower) for pattern in DEFENSIVE_SAFETY_PATTERNS):
        return False, 0.10
    for keyword in APPROVAL_KEYWORDS:
        if keyword in text_lower:
            return True, 0.95
    return False, 0.10


# ---------------------------------------------------------------------------
# Heuristic latency/cost estimation (Fix 3)
# ---------------------------------------------------------------------------

LATENCY_BY_INTENT = {
    "text_generation": 5.0,
    "image_classification": 2.0,
    "object_detection": 3.0,
    "translation": 3.0,
    "question_answering": 2.0,
    "summarization": 6.0,
    "code_generation": 8.0,
    "speech": 4.0,
    "embedding": 1.5,
    "image_generation": 15.0,
    "tool_use": 5.0,
    "conversation": 3.0,
    "research": 8.0,
    "file_management": 2.0,
    "general": 3.0,
}

COST_BY_INTENT = {
    "text_generation": 0.02,
    "image_classification": 0.005,
    "object_detection": 0.01,
    "translation": 0.01,
    "question_answering": 0.008,
    "summarization": 0.03,
    "code_generation": 0.03,
    "speech": 0.02,
    "embedding": 0.002,
    "image_generation": 0.05,
    "tool_use": 0.02,
    "conversation": 0.01,
    "research": 0.04,
    "file_management": 0.005,
    "general": 0.01,
}

# Multiplier by provider
PROVIDER_COST_FACTOR = {
    "nvidia": 1.0,
    "groq": 0.5,
    "openai": 1.5,
    "anthropic": 1.3,
    "google": 1.1,
}


def _estimate_latency(intent: Optional[str], word_count: int) -> float:
    """Heuristic latency estimate based on intent and prompt length."""
    base = LATENCY_BY_INTENT.get(str(intent).lower(), 3.0)
    # Longer prompts take slightly longer
    length_factor = 1.0 + (word_count / 500) * 0.5
    return round(base * min(length_factor, 3.0), 2)


def _estimate_cost(intent: Optional[str], provider: str, word_count: int) -> float:
    """Heuristic cost estimate based on intent, provider, and prompt length."""
    base = COST_BY_INTENT.get(str(intent).lower(), 0.01)
    provider_factor = PROVIDER_COST_FACTOR.get(provider, 1.0)
    length_factor = 1.0 + (word_count / 500) * 0.3
    return round(base * provider_factor * min(length_factor, 3.0), 4)


# ---------------------------------------------------------------------------
# Public API
# ---------------------------------------------------------------------------

@dataclass
class IntelligenceResult:
    """Complete ML intelligence for a user request."""
    intent: Optional[str] = None
    intent_confidence: float = 0.0
    recommended_provider: str = "nvidia"
    provider_confidence: float = 0.0
    recommended_agent: Optional[str] = None
    agent_confidence: float = 0.0
    estimated_latency_seconds: Optional[float] = None
    estimated_cost: Optional[float] = None
    approval_required: bool = False
    approval_confidence: float = 0.0
    success_prediction: Optional[str] = None
    success_confidence: float = 0.0
    is_anomalous: bool = False
    models_loaded: int = 0
    errors: list[str] = field(default_factory=list)

    def to_dict(self) -> dict:
        return asdict(self)


def analyze_request(text: str) -> IntelligenceResult:
    """
    Run all trained models against a user's objective/prompt.
    Returns a complete intelligence report with predictions and confidence scores.

    This function is safe to call on every request — models are loaded once
    and predictions are fast (< 50ms total for all models).
    """
    _load_models()

    result = IntelligenceResult(models_loaded=len(_models))
    features = _build_features(text)

    # 1. Intent Classification
    rule_intent = _rule_based_intent(text)
    if rule_intent:
        result.intent, result.intent_confidence = rule_intent, 0.95
    else:
        result.intent, result.intent_confidence = _predict_class("intent", features)

    # 2. Agent Routing
    result.recommended_agent, result.agent_confidence = _predict_class("agent", features)

    # 3. Provider/Model Routing
    raw_provider, result.provider_confidence = _predict_class("provider", features)
    result.recommended_provider = _normalise_provider(raw_provider)

    # 4. Success Prediction
    result.success_prediction, result.success_confidence = _predict_class("success", features)

    # 5. Approval Detection (rule-based — ML model has <0.2% labeled data)
    result.approval_required, result.approval_confidence = _check_approval(text)

    # 6. Latency Estimation (heuristic — ML model only had 1.4% labeled data)
    word_count = len(text.split())
    result.estimated_latency_seconds = _estimate_latency(result.intent, word_count)

    # 7. Cost Estimation (heuristic — ML model had sparse/skewed labels)
    result.estimated_cost = _estimate_cost(result.intent, result.recommended_provider, word_count)

    # 8. Anomaly Detection
    result.is_anomalous = _predict_anomaly(text)

    return result


def get_status() -> dict:
    """Return the current status of the inference service."""
    _load_models()
    return {
        "loaded": _loaded,
        "models_count": len(_models),
        "models": list(_models.keys()),
        "artifacts_dir": str(ARTIFACTS_DIR),
    }
