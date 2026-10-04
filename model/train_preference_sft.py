# Copyright 2026 Prism AI Labs.
# SPDX-License-Identifier: Apache-2.0
"""Stable preference fine-tuning fallback for consumer GPUs.

This trains on the preferred responses from the merged Ultrafeedback/OASST1
file. It preserves the preference signal without the numerically unstable
ORPO log-odds backward pass on some Windows GPUs.
"""
from __future__ import annotations

import argparse
import json
from pathlib import Path


def _load_preferences(path: Path):
    from datasets import load_dataset

    dataset = load_dataset("json", data_files=str(path), split="train")
    required = {"prompt", "chosen"}
    missing = required - set(dataset.column_names)
    if missing:
        raise ValueError(f"{path} is missing columns: {sorted(missing)}")
    dataset = dataset.filter(
        lambda row: isinstance(row["prompt"], str)
        and row["prompt"].strip()
        and isinstance(row["chosen"], str)
        and row["chosen"].strip()
    )
    if not len(dataset):
        raise ValueError(f"{path} contains no usable preferred responses")

    def to_messages(row):
        return {
            "messages": [
                {"role": "user", "content": row["prompt"]},
                {"role": "assistant", "content": row["chosen"]},
            ]
        }

    return dataset.map(to_messages, remove_columns=dataset.column_names)


def _load_messages(path: Path):
    from datasets import load_dataset

    dataset = load_dataset("json", data_files=str(path), split="train")
    if "messages" not in dataset.column_names:
        raise ValueError(f"{path} is missing the messages column")
    dataset = dataset.filter(
        lambda row: isinstance(row["messages"], list)
        and len(row["messages"]) >= 2
        and all(
            isinstance(message, dict)
            and message.get("role") in {"system", "user", "assistant", "tool"}
            and isinstance(message.get("content"), str)
            and message["content"].strip()
            for message in row["messages"]
        )
    )
    if not len(dataset):
        raise ValueError(f"{path} contains no usable tool-use examples")
    return dataset


def _mix_replay(preferences, replay, replay_ratio: float):
    from datasets import concatenate_datasets

    if not 0 < replay_ratio < 1:
        raise ValueError("--replay-ratio must be greater than 0 and less than 1")
    preference_count = len(preferences)
    replay_count = max(1, round(preference_count * replay_ratio / (1 - replay_ratio)))
    repeats = (replay_count + len(replay) - 1) // len(replay)
    replay = replay.shuffle(seed=17).select(range(len(replay))).flatten_indices()
    replay = replay.select((list(range(len(replay))) * repeats)[:replay_count])
    return (
        concatenate_datasets([preferences.shuffle(seed=17), replay.shuffle(seed=17)]),
        preference_count,
        replay_count,
    )


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--model-path", default="model/datasets/Qwen2.5-1.5B-sft")
    parser.add_argument("--train-file", default="model/datasets/curated/reward/train.jsonl")
    parser.add_argument("--eval-file", default="model/datasets/curated/reward/test.jsonl")
    parser.add_argument("--output-dir", default="model/artifacts/preference_sft")
    parser.add_argument("--merge-output", default="model/artifacts/prismspace-qwen-sft-preference")
    parser.add_argument("--epochs", type=float, default=1.0)
    parser.add_argument("--batch-size", type=int, default=1)
    parser.add_argument("--grad-accum", type=int, default=8)
    parser.add_argument("--max-length", type=int, default=256)
    parser.add_argument("--lora-rank", type=int, default=8)
    parser.add_argument("--max-train-samples", type=int, default=0)
    parser.add_argument("--max-eval-samples", type=int, default=500)
    parser.add_argument(
        "--replay-file",
        default="model/datasets/curated/sft_envfactory/train.jsonl",
        help="EnvFactory messages JSONL to replay during preference SFT.",
    )
    parser.add_argument("--replay-eval-file", default="model/datasets/curated/sft_envfactory/test.jsonl")
    parser.add_argument("--replay-ratio", type=float, default=0.25)
    parser.add_argument("--dry-run", action="store_true")
    args = parser.parse_args()

    model_path = Path(args.model_path)
    train = _load_preferences(Path(args.train_file))
    evaluation = _load_preferences(Path(args.eval_file))
    replay = _load_messages(Path(args.replay_file))
    replay_evaluation = _load_messages(Path(args.replay_eval_file))
    if args.max_train_samples:
        train = train.select(range(min(args.max_train_samples, len(train))))
    if args.max_eval_samples:
        evaluation = evaluation.select(range(min(args.max_eval_samples, len(evaluation))))
    train, preference_train_rows, replay_train_rows = _mix_replay(
        train, replay, args.replay_ratio
    )
    from datasets import concatenate_datasets

    evaluation = concatenate_datasets([evaluation, replay_evaluation])
    manifest = {
        "base_model": str(model_path),
        "train_rows": len(train),
        "eval_rows": len(evaluation),
        "preference_train_rows": preference_train_rows,
        "replay_train_rows": replay_train_rows,
        "replay_ratio": args.replay_ratio,
        "replay_eval_rows": len(replay_evaluation),
        "epochs": args.epochs,
        "max_length": args.max_length,
        "lora_rank": args.lora_rank,
        "effective_batch_size": args.batch_size * args.grad_accum,
        "objective": "preferred-response-sft",
    }
    print(json.dumps(manifest, indent=2))
    if args.dry_run:
        return

    import torch
    from peft import LoraConfig, PeftModel
    from transformers import AutoModelForCausalLM, AutoTokenizer
    from trl import SFTConfig, SFTTrainer

    if not torch.cuda.is_available():
        raise RuntimeError("Preference SFT requires CUDA.")
    model = AutoModelForCausalLM.from_pretrained(
        model_path, local_files_only=True, torch_dtype=torch.bfloat16, device_map="auto"
    )
    tokenizer = AutoTokenizer.from_pretrained(model_path, local_files_only=True)
    tokenizer.pad_token = tokenizer.pad_token or tokenizer.eos_token
    config = SFTConfig(
        output_dir=args.output_dir,
        num_train_epochs=args.epochs,
        per_device_train_batch_size=args.batch_size,
        per_device_eval_batch_size=args.batch_size,
        gradient_accumulation_steps=args.grad_accum,
        gradient_checkpointing=True,
        bf16=True,
        max_length=args.max_length,
        eval_strategy="epoch",
        save_strategy="epoch",
        save_total_limit=1,
        report_to="none",
    )
    trainer = SFTTrainer(
        model=model,
        args=config,
        train_dataset=train,
        eval_dataset=evaluation,
        processing_class=tokenizer,
        peft_config=LoraConfig(
            r=args.lora_rank,
            lora_alpha=args.lora_rank * 2,
            lora_dropout=0.05,
            bias="none",
            task_type="CAUSAL_LM",
            target_modules=["q_proj", "k_proj", "v_proj", "o_proj"],
        ),
    )
    trainer.train()
    evaluation_report = trainer.evaluate()
    numeric = [value for value in evaluation_report.values() if isinstance(value, (int, float))]
    if any(not torch.isfinite(torch.tensor(value)) for value in numeric):
        raise RuntimeError(f"Non-finite evaluation metrics: {evaluation_report}")
    trainer.save_model(args.output_dir)
    tokenizer.save_pretrained(args.output_dir)
    if args.merge_output:
        merge_base = AutoModelForCausalLM.from_pretrained(
            model_path, local_files_only=True, torch_dtype=torch.bfloat16
        )
        merged = PeftModel.from_pretrained(merge_base, args.output_dir).merge_and_unload()
        merged.save_pretrained(args.merge_output, safe_serialization=True)
        tokenizer.save_pretrained(args.merge_output)
    Path(args.output_dir, "evaluation_report.json").write_text(
        json.dumps({**manifest, "evaluation": evaluation_report, "merge_output": args.merge_output}, indent=2, default=float),
        encoding="utf-8",
    )


if __name__ == "__main__":
    main()
