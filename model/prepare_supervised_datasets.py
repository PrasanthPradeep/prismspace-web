# Copyright 2026 Nobin Sijo (NobinSijo7T).
# SPDX-License-Identifier: Apache-2.0
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


def _provider_from_candidate(model_name: str, service: str = "") -> str:
    """Map only an actual Hive provider; never pretend Together is Groq."""
    text = f"{model_name} {service}".lower()
    if "anthropic" in text or "claude" in text:
        return "anthropic"
    if "openai" in text or "gpt-" in text or text.startswith("gpt"):
        return "openai"
    if "gemini" in text or "google" in text or "palm" in text:
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


def _prepare_provider(root: Path, output: Path, max_per_provider: int = 350) -> dict[str, Any]:
    rows_by_split: dict[str, list[dict[str, Any]]] = {"train": [], "test": []}
    seen_prompts: set[str] = set()
    provider_counts: dict[str, int] = {}

    coding_kw = {'code', 'python', 'def ', 'function', 'class ', 'sql', 'bug', 'algorithm', 'script', 'docker', 'api', 'json', 'typescript', 'javascript', 'c++', 'regex'}
    safety_kw = {'legal', 'compliance', 'risk', 'bias', 'ethical', 'contract', 'policy', 'review', 'privacy', 'regulatory', 'audit', 'law', 'harm', 'ethics', 'document', 'analyze', 'summarize'}
    google_kw = {'translate', 'spanish', 'french', 'german', 'japanese', 'chinese', 'language', 'search', 'country', 'geography', 'history', 'multilingual'}

    def _add_sample(prompt: Any, provider: str, split_hint: str = "") -> bool:
        if not prompt or not isinstance(prompt, str) or not prompt.strip():
            return False
        clean = prompt.strip()
        if clean in seen_prompts:
            return False
        if provider_counts.get(provider, 0) >= max_per_provider:
            return False
        seen_prompts.add(clean)
        provider_counts[provider] = provider_counts.get(provider, 0) + 1
        split = split_hint if split_hint in ("train", "test") else _split_group(clean[:64])
        rows_by_split[split].append({"prompt": clean, "providerlabel": provider})
        return True

    # 1. LMSYS Chatbot Arena Conversations (filtered by provider capability affinity)
    lmsys_source = root / "lmsyschatbot_arena_conversations"
    for parquet_path in sorted(lmsys_source.glob("**/*.parquet")):
        try:
            frame = pd.read_parquet(parquet_path)
            for record in frame.to_dict("records"):
                winner = record.get("winner")
                model = record.get("model_a") if winner == "model_a" else (record.get("model_b") if winner == "model_b" else None)
                if not model:
                    continue
                conv = record.get("conversation_a")
                if conv is None or len(conv) == 0 or not isinstance(conv[0], dict):
                    continue
                prompt = conv[0].get("content", "")
                if not isinstance(prompt, str) or len(prompt) < 20:
                    continue
                p_lower = prompt.lower()
                m_str = str(model).lower()
                provider = None
                if ("gpt" in m_str or "openai" in m_str) and any(k in p_lower for k in coding_kw):
                    provider = "openai"
                elif ("claude" in m_str or "anthropic" in m_str) and any(k in p_lower for k in safety_kw):
                    provider = "anthropic"
                elif ("palm" in m_str or "gemini" in m_str) and any(k in p_lower for k in google_kw):
                    provider = "google"
                if provider:
                    qid = str(record.get("question_id", prompt[:32]))
                    _add_sample(prompt, provider, _split_group(qid))
        except Exception:
            pass

    # 2. RouterBench (filtered by task oracle choice)
    rb_source = root / "routerbench"
    for pkl_path in sorted(rb_source.glob("*.pkl")):
        if "raw" in pkl_path.name.lower():
            continue
        try:
            import pickle
            with pkl_path.open("rb") as f:
                df_rb = pickle.load(f)
            if hasattr(df_rb, "iterrows") and "oracle_model_to_route_to" in df_rb.columns and "prompt" in df_rb.columns:
                for _, r in df_rb.iterrows():
                    m_str = str(r.get("oracle_model_to_route_to", "")).lower()
                    prompt = r.get("prompt")
                    if not isinstance(prompt, str) or len(prompt) < 20:
                        continue
                    p_lower = prompt.lower()
                    provider = None
                    if ("gpt" in m_str or "openai" in m_str) and any(k in p_lower for k in coding_kw):
                        provider = "openai"
                    elif ("claude" in m_str or "anthropic" in m_str) and any(k in p_lower for k in safety_kw):
                        provider = "anthropic"
                    if provider:
                        sid = str(r.get("sample_id", str(prompt)[:32]))
                        _add_sample(prompt, provider, _split_group(sid))
        except Exception:
            pass

    # 3. Domain templates from generate_provider_seed (to reach target for all 5 providers)
    try:
        from .generate_provider_seed import PROVIDER_TEMPLATES, _generate_samples
        import random
        rng = random.Random(42)
        for provider in ("openai", "anthropic", "google", "groq", "nvidia"):
            needed = max(0, max_per_provider - provider_counts.get(provider, 0))
            if needed > 0 and provider in PROVIDER_TEMPLATES:
                for sample in _generate_samples(provider, needed, rng):
                    _add_sample(sample["prompt"], provider)
    except Exception:
        pass

    label_count = len({row["providerlabel"] for rows in rows_by_split.values() for row in rows})
    result: dict[str, Any] = {
        split: len(rows) for split, rows in rows_by_split.items()
    }
    result["providers"] = provider_counts

    if label_count < 2:
        for split in ("train", "test"):
            stale = output / "provider" / f"{split}.jsonl"
            if stale.exists():
                stale.unlink()
        result["reason"] = "Fewer than two truthfully mappable Hive providers found."
        return result

    for split, rows in rows_by_split.items():
        _write_jsonl(output / "provider" / f"{split}.jsonl", rows)
    return result


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--dataset-dir", default="model/datasets/training")
    parser.add_argument("--output-dir", default="model/datasets/training/curated")
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
