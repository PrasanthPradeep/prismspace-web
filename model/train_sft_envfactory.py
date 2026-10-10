# Copyright 2026 PrismSpace contributors.
# SPDX-License-Identifier: Apache-2.0
"""Supervised fine-tune a local causal LM on EnvFactory tool-use trajectories.

Stage 1 of the two-stage recipe: teach tool-call form (SFT) before teaching
taste (ORPO). Produces a PEFT/LoRA adapter and, with --merge-output, a merged
full-weight model directory that train_reward_orpo.py can use as --model-path.

Use ``--dry-run`` first; it validates the chat schema without touching CUDA.
"""
from __future__ import annotations

import argparse
import json
import os
from pathlib import Path

# Reduce CUDA memory fragmentation — must be set before torch is imported
os.environ.setdefault("PYTORCH_CUDA_ALLOC_CONF", "expandable_segments:True")


def _load_rows(path: Path, cache_dir: Path, max_samples: int = 0):
    from datasets import load_dataset

    dataset = load_dataset("json", data_files=str(path), split="train", cache_dir=str(cache_dir))
    if "messages" not in dataset.column_names:
        raise ValueError(f"{path} has no 'messages' column (need curated/sft_envfactory/*.jsonl)")

    def _valid(row: dict) -> bool:
        messages = row.get("messages")
        if not isinstance(messages, list) or len(messages) < 2:
            return False
        roles = {m.get("role") for m in messages if isinstance(m, dict)}
        texts = [m.get("content", "") for m in messages if isinstance(m, dict)]
        return {"user", "assistant"} <= roles and all(isinstance(t, str) and t.strip() for t in texts)

    dataset = dataset.filter(_valid)
    if not len(dataset):
        raise ValueError(f"{path} contains no usable chat rows")
    if max_samples:
        dataset = dataset.select(range(min(max_samples, len(dataset))))
    return dataset


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--model-path", default="model/datasets/Qwen2.5-1.5B")
    parser.add_argument("--train-file", default="model/datasets/curated/sft_envfactory/train.jsonl")
    parser.add_argument("--eval-file", default="model/datasets/curated/sft_envfactory/test.jsonl")
    parser.add_argument("--output-dir", default="model/artifacts/sft_tooluse")
    parser.add_argument("--merge-output", default="model/datasets/Qwen2.5-1.5B-sft",
                        help="Directory for the merged full-weight model used as ORPO --model-path.")
    parser.add_argument("--cache-dir", default="model/artifacts/huggingface_cache")
    parser.add_argument("--max-length", type=int, default=1024)
    parser.add_argument("--epochs", type=float, default=1.0,
                        help="Keep at 1: 2.5k rows memorize fast.")
    parser.add_argument("--learning-rate", type=float, default=2e-4)
    parser.add_argument("--max-train-samples", type=int, default=0)
    parser.add_argument("--max-eval-samples", type=int, default=200)
    parser.add_argument("--batch-size", type=int, default=2,
                        help="Per-device batch size. 8 GB VRAM handles 2x1024 with grad checkpointing.")
    parser.add_argument("--grad-accum", type=int, default=4)
    parser.add_argument("--lora-rank", type=int, default=16)
    parser.add_argument("--dataloader-workers", type=int, default=0,
                        help="Keep 0 on Windows to avoid spawn overhead.")
    parser.add_argument("--no-merge", action="store_true",
                        help="Skip merging; keep the LoRA adapter only.")
    parser.add_argument("--dry-run", action="store_true")
    args = parser.parse_args()

    model_path, train_path, eval_path, output_dir, cache_dir = map(
        Path, (args.model_path, args.train_file, args.eval_file, args.output_dir, args.cache_dir)
    )
    if not model_path.exists():
        raise FileNotFoundError(f"Base model directory does not exist: {model_path}")
    cache_dir.mkdir(parents=True, exist_ok=True)

    train_dataset = _load_rows(train_path, cache_dir, args.max_train_samples)
    eval_dataset = _load_rows(eval_path, cache_dir, args.max_eval_samples)

    manifest = {
        "base_model": str(model_path),
        "train_rows": len(train_dataset),
        "eval_rows": len(eval_dataset),
        "max_length": args.max_length,
        "epochs": args.epochs,
        "lora_rank": args.lora_rank,
        "effective_batch_size": args.batch_size * args.grad_accum,
    }
    print(json.dumps(manifest, indent=2))
    if args.dry_run:
        return

    import torch
    from peft import LoraConfig
    from transformers import AutoModelForCausalLM, AutoTokenizer
    from trl import SFTConfig, SFTTrainer

    if not torch.cuda.is_available():
        raise RuntimeError("SFT training requires CUDA. Run this on a CUDA-capable GPU host.")
    output_dir.mkdir(parents=True, exist_ok=True)

    tokenizer = AutoTokenizer.from_pretrained(model_path, local_files_only=True)
    tokenizer.pad_token = tokenizer.pad_token or tokenizer.eos_token

    model = AutoModelForCausalLM.from_pretrained(
        model_path, local_files_only=True, torch_dtype=torch.bfloat16, device_map="auto"
    )
    model.config.use_cache = False

    peft_config = LoraConfig(
        r=args.lora_rank,
        lora_alpha=args.lora_rank * 2,  # keep alpha = 2x rank
        lora_dropout=0.05,
        bias="none",
        task_type="CAUSAL_LM",
        target_modules=["q_proj", "k_proj", "v_proj", "o_proj"],
    )

    config = SFTConfig(
        output_dir=str(output_dir),
        learning_rate=args.learning_rate,
        num_train_epochs=args.epochs,
        per_device_train_batch_size=args.batch_size,
        per_device_eval_batch_size=args.batch_size,
        gradient_accumulation_steps=args.grad_accum,
        gradient_checkpointing=True,
        bf16=True,
        dataloader_num_workers=args.dataloader_workers,
        dataloader_pin_memory=False,
        logging_steps=10,
        eval_strategy="epoch",
        save_strategy="epoch",
        save_total_limit=1,
        report_to="none",
        max_seq_length=args.max_length,
        seed=42,
    )

    trainer = SFTTrainer(
        model=model,
        args=config,
        train_dataset=train_dataset,
        eval_dataset=eval_dataset,
        processing_class=tokenizer,
        peft_config=peft_config,
    )
    trainer.train()
    evaluation = {key: float(value) for key, value in trainer.evaluate().items() if isinstance(value, (int, float))}
    trainer.save_model(str(output_dir))
    tokenizer.save_pretrained(output_dir)
    (output_dir / "evaluation_report.json").write_text(
        json.dumps({**manifest, "evaluation": evaluation}, indent=2), encoding="utf-8"
    )
    print(json.dumps(evaluation, indent=2))

    if not args.no_merge:
        merged = Path(args.merge_output)
        merged.mkdir(parents=True, exist_ok=True)
        print(f"Merging LoRA adapter into full weights at {merged} ...")
        merged_model = trainer.model.merge_and_unload()
        merged_model.save_pretrained(str(merged))
        tokenizer.save_pretrained(str(merged))
        print(f"Merged model ready for ORPO: --model-path {merged}")


if __name__ == "__main__":
    main()
