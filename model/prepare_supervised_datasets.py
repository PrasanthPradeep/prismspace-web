"""Prepare target-specific supervised datasets from the curated source folders.

This keeps benchmark labels from being mixed with unrelated corpus metadata.  It
does not download data or run model calls; the provider dataset intentionally
contains only providers that can be mapped truthfully to Hive's provider keys.
"""
from __future__ import annotations

import argparse
import hashlib
import json
from pathlib import Path
from typing import Any, Iterable

import pandas as pd

from .utils import write_json


def _write_jsonl(path: Path, rows: Iterable[dict[str, Any]]) -> int:
    path.parent.mkdir(parents=True, exist_ok=True)
    count = 0
    with path.open("w", encoding="utf-8") as handle:
        for row in rows:
            handle.write(json.dumps(row, ensure_ascii=False) + "\n")
            count += 1
    return count


def _first_user_message(messages: Any) -> str:
    if isinstance(messages, str):
        try:
            messages = json.loads(messages)
        except json.JSONDecodeError:
            return messages
    if isinstance(messages, list):
        for message in messages:
            if isinstance(message, dict) and message.get("role") == "user":
                content = message.get("content", "")
                return content if isinstance(content, str) else json.dumps(content, ensure_ascii=False)
    return ""


def _conversation_text(value: Any) -> str:
    if isinstance(value, str):
        try:
            value = json.loads(value)
        except json.JSONDecodeError:
            return value
    if isinstance(value, list):
        return "\n".join(str(item.get("content", "")) for item in value if isinstance(item, dict))
    return "" if value is None else str(value)


def _split_group(value: str, test_fraction: int = 5) -> str:
    """Stable group-level 80/20 split; all runs of one task stay together."""
    digest = hashlib.sha256(value.encode("utf-8")).digest()[0]
    return "test" if digest % test_fraction == 0 else "train"


def _provider_from_candidate(model_name: str, service: str) -> str:
    """Map only an actual Hive provider; never pretend Together is Groq."""
    text = f"{model_name} {service}".lower()
    if "anthropic" in text or "claude" in text:
        return "anthropic"
    if "openai" in text:
        return "openai"
    if "gemini" in text or "google" in text:
        return "google"
    if "groq" in text:
        return "groq"
    if service.lower() == "nvidia" or "nvidia" in text or " nim" in text:
        return "nvidia"
    return ""


def _prepare_approval(root: Path, output: Path) -> dict[str, Any]:
    source = root / "wildguardmix"
    counts: dict[str, int] = {}
    for split in ("train", "test"):
        files = sorted((source / split).glob("*.parquet"))
        if not files:
            counts[split] = 0
            continue
        frame = pd.concat((pd.read_parquet(path) for path in files), ignore_index=True)
        rows = (
            {"prompt": prompt, "approval_required": label == "harmful"}
            for prompt, label in zip(frame["prompt"], frame["prompt_harm_label"])
            if isinstance(prompt, str) and prompt.strip() and label in {"harmful", "unharmful"}
        )
        counts[split] = _write_jsonl(output / "approval" / f"{split}.jsonl", rows)
    return counts


def _prepare_success(root: Path, output: Path) -> dict[str, Any]:
    source = root / "cx-cmu--agent_trajectories"
    rows_by_split: dict[str, list[dict[str, Any]]] = {"train": [], "test": []}
    for path in sorted(source.glob("*.parquet")):
        frame = pd.read_parquet(path)
        for record in frame.to_dict("records"):
            reward = record.get("reward")
            if not isinstance(reward, (int, float)) or reward not in (0, 1):
                continue
            prompt = _first_user_message(record.get("messages"))
            task_key = f"{record.get('benchmark', '')}:{record.get('task_id', '')}"
            if prompt.strip() and task_key != ":":
                rows_by_split[_split_group(task_key)].append({"prompt": prompt, "completed": bool(reward)})
    return {split: _write_jsonl(output / "success" / f"{split}.jsonl", rows) for split, rows in rows_by_split.items()}


def _prepare_reward(root: Path, output: Path) -> dict[str, Any]:
    source = root / "HuggingFaceH4--ultrafeedback_binarized"
    counts: dict[str, int] = {}
    for split, destination in (("train_prefs", "train"), ("test_prefs", "test")):
        files = sorted(source.glob(f"**/{split}*.parquet"))
        if not files:
            counts[destination] = 0
            continue
        frame = pd.concat((pd.read_parquet(path) for path in files), ignore_index=True)
        rows = (
            {"prompt": str(prompt), "chosen": _conversation_text(chosen), "rejected": _conversation_text(rejected)}
            for prompt, chosen, rejected in zip(frame["prompt"], frame["chosen"], frame["rejected"])
            if str(prompt).strip() and _conversation_text(chosen).strip() and _conversation_text(rejected).strip()
        )
        counts[destination] = _write_jsonl(output / "reward" / f"{destination}.jsonl", rows)
    return counts


def _prepare_provider(root: Path, output: Path) -> dict[str, Any]:
    source = root / "xRouteBench"
    candidates_path = next(iter(source.glob("llm_candidates/**/*.parquet")), None)
    if candidates_path is None:
        return {"train": 0, "test": 0, "reason": "Candidate-pool parquet is missing"}
    candidates = pd.read_parquet(candidates_path)
    provider_map = {str(row.model_name): _provider_from_candidate(str(row.model_name), str(row.service)) for row in candidates.itertuples()}
    rows_by_split: dict[str, list[dict[str, Any]]] = {"train": [], "test": []}
    for path in sorted(source.glob("**/*.parquet")):
        if path == candidates_path or "_queries" in str(path):
            continue
        frame = pd.read_parquet(path)
        required = {"query", "task_id", "model_name", "performance"}
        if not required.issubset(frame.columns):
            continue
        frame = frame.copy()
        frame["providerlabel"] = frame["model_name"].map(provider_map)
        frame = frame[frame["providerlabel"].astype(bool)]
        if frame.empty:
            continue
        # A provider label is meaningful only after comparing candidates for the same task.
        for (_, task_id), group in frame.groupby(["query", "task_id"], dropna=False):
            best = group.sort_values(["performance", "response_time"], ascending=[False, True], na_position="last").iloc[0]
            split = "test" if path.name.lower().startswith("test.") else "train"
            rows_by_split[split].append({"prompt": str(best["query"]), "providerlabel": str(best["providerlabel"])})
    label_count = len({row["providerlabel"] for rows in rows_by_split.values() for row in rows})
    result: dict[str, Any] = {split: len(rows) for split, rows in rows_by_split.items()}
    if label_count < 2:
        # Remove a stale result from an earlier mapping so training cannot use it.
        for split in ("train", "test"):
            stale = output / "provider" / f"{split}.jsonl"
            if stale.exists():
                stale.unlink()
        result["reason"] = "xRouteBench contains fewer than two truthfully mappable Hive providers; collect outcomes for the production provider pool before provider training."
        return result
    for split, rows in rows_by_split.items():
        _write_jsonl(output / "provider" / f"{split}.jsonl", rows)
    return result


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--dataset-dir", default="model/datasets")
    parser.add_argument("--output-dir", default="model/datasets/curated")
    args = parser.parse_args()
    root, output = Path(args.dataset_dir), Path(args.output_dir)
    report = {
        "approval": _prepare_approval(root, output),
        "success": _prepare_success(root, output),
        "reward": _prepare_reward(root, output),
        "provider": _prepare_provider(root, output),
    }
    write_json(output / "preparation_report.json", report)
    print(json.dumps(report, indent=2))


if __name__ == "__main__":
    main()
