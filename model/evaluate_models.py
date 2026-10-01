# Copyright 2026 Nobin Sijo (NobinSijo7T).
# SPDX-License-Identifier: Apache-2.0
"""Comprehensive CLI evaluation of all PrismSpace trained model artifacts.

Run with:
    python -m model.evaluate_models --artifacts-dir model/artifacts --curated-dir model/datasets/testing/curated

Features:
    • Auto-discovers every .joblib model, ORPO adapter, FAISS index, and workflow template
    • Re-evaluates classifiers and regressors against held-out curated test splits
    • Renders rich, coloured CLI output with per-model banners, progress steps,
      colour-coded pass/fail/warn verdicts, confusion matrices, calibration plots (ASCII),
      per-class breakdowns, and a final scoreboard
    • Exports a machine-readable evaluation_report.json
"""
from __future__ import annotations

import argparse
import json
import math
import os
import sys
import time
from dataclasses import dataclass, field
from pathlib import Path
from typing import Any

# ── Colour / style helpers (no third-party deps) ──────────────────────────

# Ensure stdout supports full Unicode on Windows (cp1252 default cannot)
if hasattr(sys.stdout, "reconfigure"):
    try:
        sys.stdout.reconfigure(encoding="utf-8", errors="replace")
    except Exception:
        pass

_FORCE_COLOR = os.environ.get("FORCE_COLOR", "")
_NO_COLOR = os.environ.get("NO_COLOR", "")
_USE_COLOR = (sys.stdout.isatty() or _FORCE_COLOR) and not _NO_COLOR


def _sgr(code: str, text: str) -> str:
    return f"\033[{code}m{text}\033[0m" if _USE_COLOR else text


def bold(t: str) -> str: return _sgr("1", t)
def dim(t: str) -> str: return _sgr("2", t)
def italic(t: str) -> str: return _sgr("3", t)
def underline(t: str) -> str: return _sgr("4", t)
def red(t: str) -> str: return _sgr("91", t)
def green(t: str) -> str: return _sgr("92", t)
def yellow(t: str) -> str: return _sgr("93", t)
def blue(t: str) -> str: return _sgr("94", t)
def magenta(t: str) -> str: return _sgr("95", t)
def cyan(t: str) -> str: return _sgr("96", t)
def white(t: str) -> str: return _sgr("97", t)
def bg_green(t: str) -> str: return _sgr("42;97", t)
def bg_red(t: str) -> str: return _sgr("41;97", t)
def bg_yellow(t: str) -> str: return _sgr("43;30", t)
def bg_blue(t: str) -> str: return _sgr("44;97", t)
def bg_magenta(t: str) -> str: return _sgr("45;97", t)
def bg_cyan(t: str) -> str: return _sgr("46;30", t)


# ── Layout helpers ─────────────────────────────────────────────────────────

try:
    TERM_WIDTH = min(os.get_terminal_size().columns, 140)
except (ValueError, OSError):
    TERM_WIDTH = 120

def _hr(char: str = "─", width: int = TERM_WIDTH) -> str:
    return dim(char * width)


def _banner(title: str, icon: str = "◆", colour=bg_blue) -> None:
    pad = TERM_WIDTH - len(icon) - len(title) - 4
    print(colour(f" {icon}  {title} " + " " * max(pad, 0)))


def _section(title: str) -> None:
    print(f"\n{bold(cyan('▸'))} {bold(title)}")
    print(_hr())


def _step(msg: str, end: str = "\n") -> None:
    print(f"  {dim('•')} {msg}", end=end, flush=True)


def _ok(msg: str = "OK") -> str: return green(f"✔ {msg}")
def _fail(msg: str = "FAIL") -> str: return red(f"✘ {msg}")
def _warn(msg: str = "WARN") -> str: return yellow(f"⚠ {msg}")
def _skip(msg: str = "SKIP") -> str: return dim(f"⊘ {msg}")


def _pct(v: float) -> str:
    return f"{v * 100:.2f}%"


def _score_colour(value: float, good: float = 0.80, ok: float = 0.50) -> str:
    text = _pct(value)
    if value >= good:
        return green(text)
    if value >= ok:
        return yellow(text)
    return red(text)


def _r2_colour(value: float) -> str:
    text = f"{value:.4f}"
    if value >= 0.80:
        return green(text)
    if value >= 0.50:
        return yellow(text)
    if value >= 0.05:
        return yellow(text)
    return red(text)


def _elapsed(seconds: float) -> str:
    if seconds < 1:
        return f"{seconds * 1000:.0f}ms"
    if seconds < 60:
        return f"{seconds:.1f}s"
    return f"{seconds / 60:.1f}m"


# ── Table renderer ─────────────────────────────────────────────────────────

def _table(headers: list[str], rows: list[list[str]], col_align: list[str] | None = None) -> None:
    """Render a formatted table to stdout.  col_align entries: 'l', 'r', 'c'."""
    if not rows:
        return
    # Strip ANSI for width calculation
    import re
    _ansi = re.compile(r"\033\[[0-9;]*m")
    def _vlen(s: str) -> int: return len(_ansi.sub("", s))

    widths = [max(_vlen(h), *((_vlen(r[i]) for r in rows) if rows else [0])) for i, h in enumerate(headers)]
    align = col_align or ["l"] * len(headers)

    def _pad(text: str, width: int, a: str) -> str:
        extra = width - _vlen(text)
        if a == "r":
            return " " * extra + text
        if a == "c":
            left = extra // 2
            return " " * left + text + " " * (extra - left)
        return text + " " * extra

    hdr = "  ".join(_pad(bold(h), w, a) for h, w, a in zip(headers, widths, align))
    sep = "  ".join("─" * w for w in widths)
    print(f"  {hdr}")
    print(f"  {dim(sep)}")
    for row in rows:
        line = "  ".join(_pad(cell, w, a) for cell, w, a in zip(row, widths, align))
        print(f"  {line}")


# ── Confusion matrix renderer ─────────────────────────────────────────────

def _render_confusion_matrix(matrix: list[list[int]], labels: list[str]) -> None:
    """Render a colour-coded confusion matrix."""
    if not matrix:
        return
    max_val = max(max(row) for row in matrix) if matrix else 1
    label_width = max(len(str(l)) for l in labels) if labels else 4

    # Header row
    header = " " * (label_width + 4)
    for label in labels:
        header += f"{str(label):>8s}"
    print(f"  {dim('Predicted →')}")
    print(f"  {dim(header)}")
    print(f"  {dim('Actual ↓')}")

    for i, row_label in enumerate(labels):
        line = f"  {str(row_label):>{label_width + 2}s}  "
        for j, count in enumerate(matrix[i]):
            if i == j:
                # Diagonal = correct predictions → green
                cell = green(f"{count:>7d} ")
            elif count > 0:
                # Off-diagonal with errors → red intensity
                cell = red(f"{count:>7d} ")
            else:
                cell = dim(f"{count:>7d} ")
            line += cell
        print(line)


# ── ASCII calibration bar ──────────────────────────────────────────────────

def _calibration_bar(ece: float, mean_conf: float, emp_acc: float) -> None:
    """Render a small ASCII calibration reliability diagram."""
    bar_width = 40
    conf_pos = int(mean_conf * bar_width)
    acc_pos = int(emp_acc * bar_width)
    bar = list("─" * bar_width)
    if 0 <= conf_pos < bar_width:
        bar[conf_pos] = "C"
    if 0 <= acc_pos < bar_width:
        bar[acc_pos] = "A" if acc_pos != conf_pos else "⊕"
    print(f"  {dim('0.0')} {''.join(bar)} {dim('1.0')}")
    legend = f"  {cyan('C')}=Mean Confidence({mean_conf:.3f})  {magenta('A')}=Empirical Accuracy({emp_acc:.3f})  ECE={yellow(f'{ece:.4f}')}"
    print(legend)


# ── Data classes ───────────────────────────────────────────────────────────

@dataclass
class ModelEvalResult:
    name: str
    artifact_path: str
    model_type: str  # classification, regression, multilabel, anomaly, unsupervised, orpo
    status: str  # PASS, FAIL, WARN, SKIP, ERROR
    primary_metric_name: str = ""
    primary_metric_value: float = 0.0
    metrics: dict[str, Any] = field(default_factory=dict)
    error: str = ""
    eval_time_seconds: float = 0.0


# ── Evaluation logic ──────────────────────────────────────────────────────

# Mapping from artifact name to (curated_target, test_column_target, task_type)
TABULAR_MODELS = {
    "intent_classifier.joblib":            ("intent",   None,                "classification"),
    "agent_router.joblib":                 ("agent",    None,                "multilabel"),
    "approval_predictor.joblib":           ("approval", "approval_required", "classification"),
    "workflow_success_predictor.joblib":    ("success",  "completed",         "classification"),
    "model_router.joblib":                 ("provider", "providerlabel",     "classification"),
    "latency_predictor.joblib":            ("latency",  None,                "regression"),
    "cost_predictor.joblib":               ("cost",     None,                "regression"),
}

DISPLAY_NAMES = {
    "intent_classifier": "Intent Classifier",
    "agent_router": "Agent Router",
    "approval_predictor": "Approval Predictor",
    "workflow_success_predictor": "Workflow Success Predictor",
    "model_router": "Provider Router",
    "latency_predictor": "Latency Predictor",
    "cost_predictor": "Cost Predictor",
    "anomaly_detector": "Anomaly Detector",
    "reward_orpo": "Reward ORPO Adapter",
    "workflow_templates": "Workflow Clusters",
    "faiss": "FAISS Retrieval Index",
}

# Minimum thresholds from README — models below these are WARN
MIN_THRESHOLDS = {
    "intent_classifier":            ("f1",  0.50),
    "agent_router":                 ("micro_f1", 0.30),
    "approval_predictor":           ("f1",  0.50),
    "workflow_success_predictor":   ("f1",  0.50),
    "model_router":                 ("f1",  0.50),
    "latency_predictor":            ("r2",  0.05),
    "cost_predictor":               ("r2",  0.05),
}


def _load_test_data(curated_dir: Path, target: str) -> Any | None:
    """Load the held-out test.jsonl for a curated target."""
    test_file = curated_dir / target / "test.jsonl"
    if not test_file.exists():
        return None
    import pandas as pd
    records = []
    with test_file.open(encoding="utf-8") as f:
        for line in f:
            line = line.strip()
            if line:
                records.append(json.loads(line))
    if not records:
        return None
    return pd.DataFrame(records)


def _evaluate_tabular(artifact_path: Path, curated_dir: Path, artifact_name: str) -> ModelEvalResult:
    """Evaluate a single tabular .joblib model."""
    import joblib
    import numpy as np
    import pandas as pd

    display_name = DISPLAY_NAMES.get(artifact_path.stem, artifact_path.stem)
    t0 = time.perf_counter()

    try:
        bundle = joblib.load(artifact_path)
    except Exception as exc:
        return ModelEvalResult(
            display_name, str(artifact_path), "unknown", "ERROR",
            error=f"Failed to load: {exc}", eval_time_seconds=time.perf_counter() - t0,
        )

    model = bundle.get("model")
    task = bundle.get("task", "classification")
    label_encoder = bundle.get("label_encoder")
    target_col = bundle.get("target")
    config = TABULAR_MODELS.get(artifact_name, (None, None, task))
    curated_target = config[0]
    model_type = config[2]

    # Try loading cached metrics from training
    log_name = (curated_target or artifact_path.stem) + "_metrics.json"
    log_path = artifact_path.parent / "logs" / log_name
    cached_metrics: dict = {}
    if log_path.exists():
        try:
            cached_metrics = json.loads(log_path.read_text(encoding="utf-8"))
        except Exception:
            pass

    # Attempt to re-evaluate against held-out test data
    test_data = _load_test_data(curated_dir, curated_target) if curated_target else None
    fresh_metrics: dict = {}
    re_evaluated = False

    if test_data is not None and model is not None and model_type in ("classification", "regression"):
        from .feature_engineering import FeatureEngineer
        from .metrics import classification_metrics, regression_metrics

        try:
            features = FeatureEngineer().transform(test_data)
            X = pd.DataFrame({
                "text": features.texts,
                **{f"numeric_{i}": features.numeric[:, i] for i in range(features.numeric.shape[1])},
            })

            # Determine the target column in test data
            test_target = config[1] or target_col
            y = None
            if test_target and test_target in test_data.columns:
                y = test_data[test_target].astype(str)
            elif curated_target in ("approval",) and "approval_required" in test_data.columns:
                y = test_data["approval_required"].astype(str)
            elif curated_target in ("success",) and "completed" in test_data.columns:
                y = test_data["completed"].astype(str)

            if y is not None:
                valid = ~y.str.strip().isin(["", "nan", "None"])
                X, y = X.loc[valid], y.loc[valid]

                pred = model.predict(X)

                if model_type == "classification" and label_encoder is not None:
                    from sklearn.preprocessing import LabelEncoder
                    if isinstance(label_encoder, LabelEncoder):
                        known = y.isin(label_encoder.classes_).values
                        X, y = X[known], y[known]
                        y_enc = pd.Series(label_encoder.transform(y), index=y.index)
                        pred = model.predict(X)
                        pred_labels = label_encoder.inverse_transform(pred.astype(int))
                        y_labels = label_encoder.inverse_transform(y_enc)
                        probabilities = None
                        if hasattr(model, "predict_proba"):
                            try:
                                probabilities = model.predict_proba(X)
                            except Exception:
                                pass
                        fresh_metrics = classification_metrics(y_labels, pred_labels, probabilities)
                        re_evaluated = True
                elif model_type == "regression":
                    y_num = pd.to_numeric(y, errors="coerce")
                    keep = y_num.notna()
                    if keep.any():
                        pred_filtered = model.predict(X.loc[keep])
                        fresh_metrics = regression_metrics(y_num[keep], pred_filtered)
                        re_evaluated = True
        except Exception as exc:
            fresh_metrics["_re_eval_error"] = str(exc)

    # Merge: prefer fresh over cached
    final_metrics = {**cached_metrics, **(fresh_metrics if re_evaluated else {})}
    if re_evaluated:
        final_metrics["_re_evaluated_on_held_out_test"] = True

    # Determine primary metric and verdict
    primary_name = ""
    primary_value = 0.0
    status = "PASS"

    if model_type == "classification":
        primary_name = "accuracy"
        primary_value = final_metrics.get("accuracy", 0.0)
    elif model_type == "multilabel":
        primary_name = "micro_f1"
        primary_value = final_metrics.get("micro_f1", 0.0)
    elif model_type == "regression":
        primary_name = "r2"
        primary_value = final_metrics.get("r2", 0.0)

    # Check against minimum threshold
    thresh_key = artifact_path.stem
    if thresh_key in MIN_THRESHOLDS:
        metric_key, threshold = MIN_THRESHOLDS[thresh_key]
        metric_val = final_metrics.get(metric_key, 0.0)
        if metric_val < threshold:
            status = "WARN"

    elapsed = time.perf_counter() - t0
    return ModelEvalResult(
        display_name, str(artifact_path), model_type, status,
        primary_name, primary_value, final_metrics, eval_time_seconds=elapsed,
    )


def _evaluate_anomaly(artifact_path: Path) -> ModelEvalResult:
    """Evaluate anomaly detector artifact."""
    import joblib
    t0 = time.perf_counter()
    try:
        bundle = joblib.load(artifact_path)
        model = bundle["model"]
        metrics = {
            "type": type(model).__name__,
            "n_features": int(model.n_features_in_),
            "contamination": str(model.contamination),
            "n_estimators": int(model.n_estimators),
            "max_samples": str(model.max_samples),
        }
        elapsed = time.perf_counter() - t0
        return ModelEvalResult(
            DISPLAY_NAMES.get("anomaly_detector", "Anomaly Detector"),
            str(artifact_path), "anomaly", "PASS",
            "n_estimators", float(model.n_estimators), metrics,
            eval_time_seconds=elapsed,
        )
    except Exception as exc:
        return ModelEvalResult(
            "Anomaly Detector", str(artifact_path), "anomaly", "ERROR",
            error=str(exc), eval_time_seconds=time.perf_counter() - t0,
        )


def _evaluate_orpo(artifacts_dir: Path) -> ModelEvalResult | None:
    """Evaluate ORPO reward adapter if present."""
    t0 = time.perf_counter()
    # Check for reward_orpo directories
    orpo_dirs = sorted(artifacts_dir.glob("reward_orpo*"))
    if not orpo_dirs:
        return None

    best_dir = orpo_dirs[-1]  # Take the latest
    eval_report = best_dir / "evaluation_report.json"
    adapter_config = best_dir / "adapter_config.json"
    adapter_weights = best_dir / "adapter_model.safetensors"

    metrics: dict[str, Any] = {"adapter_dir": str(best_dir)}

    if eval_report.exists():
        try:
            data = json.loads(eval_report.read_text(encoding="utf-8"))
            metrics["base_model"] = data.get("base_model", "unknown")
            metrics["train_pairs"] = data.get("train_pairs", 0)
            metrics["eval_pairs"] = data.get("eval_pairs", 0)
            metrics["max_length"] = data.get("max_length", 0)
            metrics["epochs"] = data.get("epochs", 0)
            metrics["beta"] = data.get("beta", 0)
            metrics["lora_rank"] = data.get("lora_rank", 0)
            metrics["effective_batch_size"] = data.get("effective_batch_size", 0)
            evaluation = data.get("evaluation", {})
            metrics["eval_loss"] = evaluation.get("eval_loss")
            metrics["eval_rewards_chosen"] = evaluation.get("eval_rewards/chosen")
            metrics["eval_rewards_rejected"] = evaluation.get("eval_rewards/rejected")
            metrics["eval_rewards_accuracies"] = evaluation.get("eval_rewards/accuracies", 0.0)
            metrics["eval_rewards_margins"] = evaluation.get("eval_rewards/margins")
            metrics["eval_nll_loss"] = evaluation.get("eval_nll_loss")
            metrics["eval_log_odds_ratio"] = evaluation.get("eval_log_odds_ratio")
            metrics["eval_runtime"] = evaluation.get("eval_runtime", 0)
        except Exception:
            pass

    if adapter_config.exists():
        try:
            cfg = json.loads(adapter_config.read_text(encoding="utf-8"))
            metrics["peft_type"] = cfg.get("peft_type", "unknown")
            metrics["r"] = cfg.get("r", 0)
            metrics["lora_alpha"] = cfg.get("lora_alpha", 0)
            metrics["target_modules"] = cfg.get("target_modules", [])
        except Exception:
            pass

    metrics["adapter_weights_present"] = adapter_weights.exists()
    metrics["adapter_weights_mb"] = round(adapter_weights.stat().st_size / 1024 / 1024, 2) if adapter_weights.exists() else 0

    # Determine status
    accuracy = metrics.get("eval_rewards_accuracies", 0.0)
    status = "PASS" if isinstance(accuracy, (int, float)) and accuracy > 0.5 else "WARN"

    # Check for NaN issues
    eval_loss = metrics.get("eval_loss")
    if eval_loss is not None and (isinstance(eval_loss, float) and math.isnan(eval_loss)):
        status = "WARN"
        metrics["_note"] = "NaN in eval_loss — likely precision mismatch during training"

    elapsed = time.perf_counter() - t0
    return ModelEvalResult(
        DISPLAY_NAMES.get("reward_orpo", "Reward ORPO Adapter"),
        str(best_dir), "orpo", status,
        "eval_rewards_accuracies", float(accuracy) if isinstance(accuracy, (int, float)) and not math.isnan(accuracy) else 0.0,
        metrics, eval_time_seconds=elapsed,
    )


def _evaluate_faiss(artifacts_dir: Path) -> ModelEvalResult | None:
    """Check FAISS index integrity."""
    t0 = time.perf_counter()
    index_path = artifacts_dir / "faiss.index"
    vectorizer_path = artifacts_dir / "faiss.vectorizer.joblib"

    if not index_path.exists():
        return None

    metrics: dict[str, Any] = {}
    try:
        import faiss
        index = faiss.read_index(str(index_path))
        metrics["backend"] = "faiss"
        metrics["total_vectors"] = int(index.ntotal)
        metrics["dimension"] = int(index.d)
        metrics["index_size_mb"] = round(index_path.stat().st_size / 1024 / 1024, 2)
        metrics["is_trained"] = bool(index.is_trained)

        if vectorizer_path.exists():
            import joblib
            vectorizer = joblib.load(vectorizer_path)
            metrics["vectorizer_features"] = int(vectorizer.max_features) if hasattr(vectorizer, "max_features") else "unknown"
            metrics["vectorizer_type"] = type(vectorizer).__name__

        status = "PASS" if index.ntotal > 0 else "WARN"
        elapsed = time.perf_counter() - t0
        return ModelEvalResult(
            "FAISS Retrieval Index", str(index_path), "unsupervised", status,
            "total_vectors", float(index.ntotal), metrics, eval_time_seconds=elapsed,
        )
    except ImportError:
        metrics["backend"] = "faiss (not installed)"
        metrics["index_size_mb"] = round(index_path.stat().st_size / 1024 / 1024, 2)
        return ModelEvalResult(
            "FAISS Retrieval Index", str(index_path), "unsupervised", "SKIP",
            error="faiss not installed — cannot validate index", metrics=metrics,
            eval_time_seconds=time.perf_counter() - t0,
        )
    except Exception as exc:
        return ModelEvalResult(
            "FAISS Retrieval Index", str(index_path), "unsupervised", "ERROR",
            error=str(exc), eval_time_seconds=time.perf_counter() - t0,
        )


def _evaluate_workflow_templates(artifacts_dir: Path) -> ModelEvalResult | None:
    """Check workflow template clusters."""
    t0 = time.perf_counter()
    pkl_path = artifacts_dir / "workflow_templates.pkl"
    if not pkl_path.exists():
        return None

    import pickle
    try:
        with pkl_path.open("rb") as f:
            data = pickle.load(f)
        metrics: dict[str, Any] = {
            "file_size_mb": round(pkl_path.stat().st_size / 1024 / 1024, 2),
        }
        if isinstance(data, dict):
            metrics["keys"] = list(data.keys())[:10]
            for key in ("n_clusters", "clusters", "templates"):
                if key in data:
                    val = data[key]
                    if isinstance(val, (int, float)):
                        metrics[key] = val
                    elif isinstance(val, (list, dict)):
                        metrics[f"{key}_count"] = len(val)
        elif isinstance(data, (list, tuple)):
            metrics["entries"] = len(data)

        return ModelEvalResult(
            "Workflow Clusters", str(pkl_path), "unsupervised", "PASS",
            "file_size_mb", metrics["file_size_mb"], metrics,
            eval_time_seconds=time.perf_counter() - t0,
        )
    except Exception as exc:
        return ModelEvalResult(
            "Workflow Clusters", str(pkl_path), "unsupervised", "ERROR",
            error=str(exc), eval_time_seconds=time.perf_counter() - t0,
        )


def _print_model_result(result: ModelEvalResult, index: int, total: int) -> None:
    """Render a single model evaluation result with full detail."""
    status_badge = {
        "PASS": bg_green(" PASS "),
        "FAIL": bg_red(" FAIL "),
        "WARN": bg_yellow(" WARN "),
        "SKIP": dim("  SKIP  "),
        "ERROR": bg_red(" ERROR "),
    }.get(result.status, dim(f" {result.status} "))

    model_colour = {
        "classification": cyan,
        "multilabel": magenta,
        "regression": blue,
        "anomaly": yellow,
        "orpo": magenta,
        "unsupervised": dim,
    }.get(result.model_type, white)

    # Banner
    print()
    counter = dim(f"[{index}/{total}]")
    type_badge = model_colour(f"[{result.model_type.upper()}]")
    print(f"  {counter} {status_badge}  {bold(result.name)}  {type_badge}")
    print(f"  {dim('Artifact:')} {dim(result.artifact_path)}")
    if result.eval_time_seconds:
        print(f"  {dim('Eval time:')} {dim(_elapsed(result.eval_time_seconds))}")

    if result.error:
        print(f"  {red('Error:')} {result.error}")
        return

    m = result.metrics
    if not m:
        print(f"  {dim('No metrics available')}")
        return

    # ── Classification detail ──────────────────────────────────────────
    if result.model_type == "classification":
        re_eval = "✦ Re-evaluated on held-out test" if m.get("_re_evaluated_on_held_out_test") else "cached from training"
        print(f"  {dim(f'({re_eval})')}")

        rows = []
        for key in ("accuracy", "precision", "recall", "f1"):
            if key in m:
                rows.append([bold(key.capitalize()), _score_colour(m[key])])
        for key in ("macro_precision", "macro_recall", "macro_f1"):
            if key in m:
                rows.append([key.replace("_", " ").title(), _score_colour(m[key])])
        if "roc_auc" in m:
            rows.append(["ROC-AUC", _score_colour(m["roc_auc"])])

        _table(["Metric", "Score"], rows, ["l", "r"])

        # Per-class breakdown
        if "per_class" in m and m["per_class"]:
            print()
            _step("Per-class breakdown:")
            class_rows = []
            for label, stats in sorted(m["per_class"].items()):
                class_rows.append([
                    label,
                    _pct(stats["precision"]),
                    _pct(stats["recall"]),
                    _score_colour(stats["f1"]),
                    str(stats.get("support", "—")),
                ])
            _table(["Class", "Precision", "Recall", "F1", "Support"], class_rows, ["l", "r", "r", "r", "r"])

        # Confusion matrix
        if "confusion_matrix" in m and "labels" in m:
            print()
            _step("Confusion matrix:")
            _render_confusion_matrix(m["confusion_matrix"], m["labels"])

        # Calibration
        if "calibration" in m:
            cal = m["calibration"]
            print()
            _step("Calibration:")
            cal_rows = [
                ["ECE", yellow(f"{cal['expected_calibration_error']:.4f}")],
                ["Mean Confidence", f"{cal['mean_confidence']:.4f}"],
                ["Empirical Accuracy", f"{cal['empirical_accuracy']:.4f}"],
            ]
            if "brier_score" in cal:
                cal_rows.append(["Brier Score", f"{cal['brier_score']:.4f}"])
            _table(["Calibration Metric", "Value"], cal_rows, ["l", "r"])
            _calibration_bar(cal["expected_calibration_error"], cal["mean_confidence"], cal["empirical_accuracy"])

    # ── Multilabel detail ──────────────────────────────────────────────
    elif result.model_type == "multilabel":
        print(f"  {dim('(cached from training)')}")
        rows = []
        for key in ("subset_accuracy", "micro_precision", "micro_recall", "micro_f1", "macro_f1"):
            if key in m:
                rows.append([key.replace("_", " ").title(), _score_colour(m[key])])
        if "hamming_loss" in m:
            hl = m["hamming_loss"]
            rows.append(["Hamming Loss", green(f"{hl:.4f}") if hl < 0.15 else yellow(f"{hl:.4f}") if hl < 0.30 else red(f"{hl:.4f}")])
        if "labels" in m:
            rows.append(["Label Count", str(len(m["labels"]))])
        if "samples" in m:
            rows.append(["Total Samples", f"{m['samples']:,}"])

        _table(["Metric", "Score"], rows, ["l", "r"])

        if "labels" in m:
            print()
            _step(f"Labels: {', '.join(cyan(l) for l in m['labels'])}")

    # ── Regression detail ──────────────────────────────────────────────
    elif result.model_type == "regression":
        re_eval = "✦ Re-evaluated on held-out test" if m.get("_re_evaluated_on_held_out_test") else "cached from training"
        print(f"  {dim(f'({re_eval})')}")

        rows = []
        if "r2" in m:
            rows.append([bold("R² Score"), _r2_colour(m["r2"])])
        if "mae" in m:
            rows.append(["MAE", f"{m['mae']:.4f}"])
        if "rmse" in m:
            rows.append(["RMSE", f"{m['rmse']:.4f}"])

        _table(["Metric", "Value"], rows, ["l", "r"])

        # ASCII bar for R²
        if "r2" in m:
            bar_width = 40
            r2 = max(0, min(1, m["r2"]))
            filled = int(r2 * bar_width)
            bar = green("█" * filled) + dim("░" * (bar_width - filled))
            print(f"\n  R²  [{bar}] {_r2_colour(m['r2'])}")

    # ── Anomaly detail ─────────────────────────────────────────────────
    elif result.model_type == "anomaly":
        rows = []
        for key in ("type", "n_features", "n_estimators", "contamination", "max_samples"):
            if key in m:
                rows.append([key.replace("_", " ").title(), str(m[key])])
        _table(["Property", "Value"], rows, ["l", "r"])

    # ── ORPO detail ────────────────────────────────────────────────────
    elif result.model_type == "orpo":
        # Training info
        train_rows = []
        for key in ("base_model", "train_pairs", "eval_pairs", "max_length", "epochs", "beta", "lora_rank", "effective_batch_size"):
            if key in m:
                train_rows.append([key.replace("_", " ").title(), str(m[key])])
        if train_rows:
            _step("Training Configuration:")
            _table(["Parameter", "Value"], train_rows, ["l", "r"])

        # PEFT info
        peft_rows = []
        for key in ("peft_type", "r", "lora_alpha", "target_modules"):
            if key in m:
                val = m[key]
                peft_rows.append([key.replace("_", " ").title(), str(val) if not isinstance(val, list) else ", ".join(val)])
        if "adapter_weights_present" in m:
            peft_rows.append(["Adapter Weights", _ok("Present") if m["adapter_weights_present"] else _fail("Missing")])
        if "adapter_weights_mb" in m:
            peft_rows.append(["Adapter Size", f"{m['adapter_weights_mb']:.2f} MB"])
        if peft_rows:
            print()
            _step("PEFT / LoRA Configuration:")
            _table(["Parameter", "Value"], peft_rows, ["l", "r"])

        # Evaluation metrics
        eval_rows = []
        for key in ("eval_loss", "eval_rewards_chosen", "eval_rewards_rejected",
                     "eval_rewards_accuracies", "eval_rewards_margins",
                     "eval_nll_loss", "eval_log_odds_ratio"):
            if key in m:
                val = m[key]
                if val is None or (isinstance(val, float) and math.isnan(val)):
                    eval_rows.append([key.replace("eval_", "").replace("_", " ").title(), red("NaN")])
                else:
                    eval_rows.append([key.replace("eval_", "").replace("_", " ").title(), f"{val:.4f}" if isinstance(val, float) else str(val)])
        if eval_rows:
            print()
            _step("Evaluation Metrics:")
            _table(["Metric", "Value"], eval_rows, ["l", "r"])

        if "_note" in m:
            print(f"\n  {_warn(m['_note'])}")

    # ── Unsupervised detail ────────────────────────────────────────────
    elif result.model_type == "unsupervised":
        rows = []
        for key, label in [
            ("backend", "Backend"), ("total_vectors", "Total Vectors"),
            ("dimension", "Dimension"), ("index_size_mb", "Index Size (MB)"),
            ("is_trained", "Index Trained"), ("vectorizer_features", "TF-IDF Features"),
            ("vectorizer_type", "Vectorizer"), ("file_size_mb", "File Size (MB)"),
            ("entries", "Entries"),
        ]:
            if key in m:
                rows.append([label, str(m[key])])
        if "keys" in m:
            rows.append(["Data Keys", ", ".join(str(k) for k in m["keys"])])
        if "clusters_count" in m:
            rows.append(["Cluster Count", str(m["clusters_count"])])
        if "templates_count" in m:
            rows.append(["Template Count", str(m["templates_count"])])
        _table(["Property", "Value"], rows, ["l", "r"])

    print(f"  {_hr()}")


def _print_scoreboard(results: list[ModelEvalResult]) -> None:
    """Print a final summary scoreboard."""
    _banner("  EVALUATION SCOREBOARD", "📊", bg_magenta)
    print()

    rows = []
    for r in results:
        status_text = {
            "PASS": green("● PASS"),
            "FAIL": red("● FAIL"),
            "WARN": yellow("● WARN"),
            "SKIP": dim("○ SKIP"),
            "ERROR": red("● ERR "),
        }.get(r.status, r.status)

        if r.model_type in ("classification",):
            score_text = _score_colour(r.primary_metric_value)
        elif r.model_type == "multilabel":
            score_text = _score_colour(r.primary_metric_value)
        elif r.model_type == "regression":
            score_text = _r2_colour(r.primary_metric_value)
        elif r.model_type == "orpo":
            score_text = _pct(r.primary_metric_value)
        else:
            score_text = str(int(r.primary_metric_value)) if r.primary_metric_value else "—"

        metric_label = r.primary_metric_name.upper() if r.primary_metric_name else "—"
        rows.append([
            status_text,
            bold(r.name),
            dim(f"[{r.model_type}]"),
            metric_label,
            score_text,
            dim(_elapsed(r.eval_time_seconds)),
        ])

    _table(
        ["Status", "Model", "Type", "Primary", "Score", "Time"],
        rows, ["l", "l", "l", "l", "r", "r"],
    )

    # Summary counts
    total = len(results)
    passed = sum(1 for r in results if r.status == "PASS")
    warned = sum(1 for r in results if r.status == "WARN")
    failed = sum(1 for r in results if r.status in ("FAIL", "ERROR"))
    skipped = sum(1 for r in results if r.status == "SKIP")

    print()
    summary_parts = [
        bold(f"Total: {total}"),
        green(f"Passed: {passed}"),
    ]
    if warned:
        summary_parts.append(yellow(f"Warnings: {warned}"))
    if failed:
        summary_parts.append(red(f"Failed: {failed}"))
    if skipped:
        summary_parts.append(dim(f"Skipped: {skipped}"))
    print("  " + "  │  ".join(summary_parts))


# ── Training report summary ───────────────────────────────────────────────

def _print_training_report_summary(artifacts_dir: Path) -> None:
    """Print a summary from training_report.json if it exists."""
    report_path = artifacts_dir / "training_report.json"
    if not report_path.exists():
        _step(_warn("training_report.json not found"))
        return

    try:
        report = json.loads(report_path.read_text(encoding="utf-8"))
    except Exception:
        _step(_warn("Could not parse training_report.json"))
        return

    row_count = report.get("rows", 0)
    col_count = len(report.get("columns", []))
    _step(f"Training corpus: {bold(f'{row_count:,}')} rows, {bold(str(col_count))} columns")

    results = report.get("results", [])
    rows = []
    for r in results:
        name = r.get("model_name", "unknown")
        trained = r.get("trained", False)
        reason = r.get("reason", "")
        if trained:
            rows.append([name, green("✔ Trained"), dim(reason[:60]) if reason else ""])
        else:
            rows.append([name, red("✘ Skipped"), dim(reason[:60]) if reason else ""])

    _table(["Model", "Status", "Reason"], rows, ["l", "l", "l"])


# ── Main ───────────────────────────────────────────────────────────────────

def main() -> None:
    parser = argparse.ArgumentParser(
        description="Comprehensive evaluation of all PrismSpace model artifacts.",
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog="""\
Examples:
  python -m model.evaluate_models
  python -m model.evaluate_models --artifacts-dir model/artifacts --curated-dir model/datasets/testing/curated
  python -m model.evaluate_models --export model/artifacts/evaluation_report.json
  python -m model.evaluate_models --models intent_classifier approval_predictor
  python -m model.evaluate_models --no-colour
""",
    )
    parser.add_argument("--artifacts-dir", default="model/artifacts",
                        help="Directory containing trained model artifacts (default: model/artifacts)")
    parser.add_argument("--curated-dir", default="model/datasets/testing/curated",
                        help="Directory containing held-out curated test JSONL files (default: model/datasets/testing/curated)")
    parser.add_argument("--export", default=None,
                        help="Path to write machine-readable JSON evaluation report")
    parser.add_argument("--models", nargs="*", default=None,
                        help="Evaluate only specific model names (e.g. intent_classifier approval_predictor)")
    parser.add_argument("--no-colour", "--no-color", action="store_true",
                        help="Disable coloured output")
    parser.add_argument("--verbose", "-v", action="store_true",
                        help="Show additional debug information")
    args = parser.parse_args()

    if args.no_colour:
        global _USE_COLOR
        _USE_COLOR = False

    artifacts_dir = Path(args.artifacts_dir)
    curated_dir = Path(args.curated_dir)

    if not artifacts_dir.exists():
        print(red(f"\n  ✘ Artifacts directory not found: {artifacts_dir}"))
        print(dim(f"    Run training first: python -m model.train\n"))
        sys.exit(1)

    # ── Header ─────────────────────────────────────────────────────────
    print()
    _banner("  PRISMSPACE MODEL EVALUATION SUITE", "🔬", bg_blue)
    print()
    _step(f"Artifacts: {bold(str(artifacts_dir))}")
    _step(f"Curated test data: {bold(str(curated_dir))}")
    _step(f"Timestamp: {bold(time.strftime('%Y-%m-%d %H:%M:%S'))}")

    # ── Training report overview ───────────────────────────────────────
    _section("Training Report Overview")
    _print_training_report_summary(artifacts_dir)

    # ── Discover artifacts ─────────────────────────────────────────────
    _section("Discovering Model Artifacts")

    all_results: list[ModelEvalResult] = []
    t_start = time.perf_counter()

    # Filter if --models is specified
    filter_set = set(args.models) if args.models else None

    # 1. Tabular .joblib models
    for artifact_name, config in TABULAR_MODELS.items():
        stem = Path(artifact_name).stem
        if filter_set and stem not in filter_set:
            continue
        path = artifacts_dir / artifact_name
        if path.exists():
            _step(f"Found {cyan(artifact_name)}")
        else:
            _step(f"{dim(artifact_name)} — {_skip('not found')}")
            all_results.append(ModelEvalResult(
                DISPLAY_NAMES.get(stem, stem), str(path),
                config[2], "SKIP", error="Artifact file not found",
            ))

    # 2. Anomaly detector
    anomaly_path = artifacts_dir / "anomaly_detector.joblib"
    if not filter_set or "anomaly_detector" in filter_set:
        if anomaly_path.exists():
            _step(f"Found {cyan('anomaly_detector.joblib')}")
        else:
            _step(f"{dim('anomaly_detector.joblib')} — {_skip('not found')}")

    # 3. ORPO adapters
    if not filter_set or "reward_orpo" in filter_set:
        orpo_dirs = sorted(artifacts_dir.glob("reward_orpo*"))
        if orpo_dirs:
            for d in orpo_dirs:
                _step(f"Found ORPO adapter: {cyan(d.name)}")
        else:
            _step(f"{dim('reward_orpo*/')} — {_skip('no ORPO adapters found')}")

    # 4. FAISS index
    if not filter_set or "faiss" in filter_set:
        if (artifacts_dir / "faiss.index").exists():
            _step(f"Found {cyan('faiss.index')}")
        else:
            _step(f"{dim('faiss.index')} — {_skip('not found')}")

    # 5. Workflow templates
    if not filter_set or "workflow_templates" in filter_set:
        if (artifacts_dir / "workflow_templates.pkl").exists():
            _step(f"Found {cyan('workflow_templates.pkl')}")
        else:
            _step(f"{dim('workflow_templates.pkl')} — {_skip('not found')}")

    # ── Evaluate each model ────────────────────────────────────────────
    _section("Evaluating Models")

    model_index = 0
    total_models = 0

    # Count total
    for artifact_name in TABULAR_MODELS:
        stem = Path(artifact_name).stem
        if filter_set and stem not in filter_set:
            continue
        if (artifacts_dir / artifact_name).exists():
            total_models += 1
    if (not filter_set or "anomaly_detector" in filter_set) and anomaly_path.exists():
        total_models += 1
    if (not filter_set or "reward_orpo" in filter_set) and sorted(artifacts_dir.glob("reward_orpo*")):
        total_models += 1
    if (not filter_set or "faiss" in filter_set) and (artifacts_dir / "faiss.index").exists():
        total_models += 1
    if (not filter_set or "workflow_templates" in filter_set) and (artifacts_dir / "workflow_templates.pkl").exists():
        total_models += 1

    # Evaluate tabular models
    for artifact_name in TABULAR_MODELS:
        stem = Path(artifact_name).stem
        if filter_set and stem not in filter_set:
            continue
        path = artifacts_dir / artifact_name
        if not path.exists():
            continue
        model_index += 1
        _step(f"Evaluating {bold(DISPLAY_NAMES.get(stem, stem))}...", end="")
        result = _evaluate_tabular(path, curated_dir, artifact_name)
        print(f" {_ok() if result.status == 'PASS' else _warn() if result.status == 'WARN' else _fail()}")
        _print_model_result(result, model_index, total_models)
        all_results.append(result)

    # Evaluate anomaly detector
    if (not filter_set or "anomaly_detector" in filter_set) and anomaly_path.exists():
        model_index += 1
        _step(f"Evaluating {bold('Anomaly Detector')}...", end="")
        result = _evaluate_anomaly(anomaly_path)
        print(f" {_ok() if result.status == 'PASS' else _fail()}")
        _print_model_result(result, model_index, total_models)
        all_results.append(result)

    # Evaluate ORPO
    if not filter_set or "reward_orpo" in filter_set:
        result = _evaluate_orpo(artifacts_dir)
        if result:
            model_index += 1
            _print_model_result(result, model_index, total_models)
            all_results.append(result)

    # Evaluate FAISS
    if not filter_set or "faiss" in filter_set:
        result = _evaluate_faiss(artifacts_dir)
        if result:
            model_index += 1
            _print_model_result(result, model_index, total_models)
            all_results.append(result)

    # Evaluate workflow templates
    if not filter_set or "workflow_templates" in filter_set:
        result = _evaluate_workflow_templates(artifacts_dir)
        if result:
            model_index += 1
            _print_model_result(result, model_index, total_models)
            all_results.append(result)

    # ── Scoreboard ─────────────────────────────────────────────────────
    print()
    _print_scoreboard(all_results)

    total_time = time.perf_counter() - t_start
    print(f"\n  {dim(f'Total evaluation time: {_elapsed(total_time)}')}")

    # ── Export ──────────────────────────────────────────────────────────
    export_path = Path(args.export) if args.export else artifacts_dir / "evaluation_report_full.json"
    export_data = {
        "timestamp": time.strftime("%Y-%m-%dT%H:%M:%S"),
        "artifacts_dir": str(artifacts_dir),
        "curated_dir": str(curated_dir),
        "total_eval_time_seconds": round(total_time, 3),
        "summary": {
            "total": len(all_results),
            "passed": sum(1 for r in all_results if r.status == "PASS"),
            "warned": sum(1 for r in all_results if r.status == "WARN"),
            "failed": sum(1 for r in all_results if r.status in ("FAIL", "ERROR")),
            "skipped": sum(1 for r in all_results if r.status == "SKIP"),
        },
        "models": [],
    }
    for r in all_results:
        # Clean NaN for JSON serialization
        cleaned_metrics = {}
        for k, v in r.metrics.items():
            if isinstance(v, float) and math.isnan(v):
                cleaned_metrics[k] = None
            else:
                cleaned_metrics[k] = v
        export_data["models"].append({
            "name": r.name,
            "artifact_path": r.artifact_path,
            "model_type": r.model_type,
            "status": r.status,
            "primary_metric": r.primary_metric_name,
            "primary_score": r.primary_metric_value if not (isinstance(r.primary_metric_value, float) and math.isnan(r.primary_metric_value)) else None,
            "metrics": cleaned_metrics,
            "error": r.error or None,
            "eval_time_seconds": round(r.eval_time_seconds, 3),
        })

    export_path.parent.mkdir(parents=True, exist_ok=True)
    export_path.write_text(json.dumps(export_data, indent=2, default=str), encoding="utf-8")
    print(f"\n  {dim('Report exported:')} {bold(str(export_path))}")

    # ── Footer ─────────────────────────────────────────────────────────
    print()
    _banner("  EVALUATION COMPLETE", "✅", bg_green)
    print()


if __name__ == "__main__":
    main()
