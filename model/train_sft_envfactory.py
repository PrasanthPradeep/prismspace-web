# Copyright 2026 Prism AI Labs.
# SPDX-License-Identifier: Apache-2.0
"""Fine-tune a local causal LM on EnvFactory tool-use trajectories."""
from __future__ import annotations

import argparse
import json
from pathlib import Path


def _load_rows(path: Path):
    from datasets import load_dataset

    dataset = load_dataset("json", data_files=str(path), split="train")
    if "messages" not in dataset.column_names:
        raise ValueError(f"{path} is missing the messages column")
    dataset = dataset.filter(lambda row: isinstance(row["messages"], list) and len(row["messages"]) >= 2)
    if not len(dataset):
        raise ValueError(f"{path} contains no usable chat rows")
    return dataset


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--model-path", default="model/datasets/Qwen2.5-1.5B")
    parser.add_argument("--train-file", default="model/datasets/curated/sft_envfactory/train.jsonl")
    parser.add_argument("--eval-file", default="model/datasets/curated/sft_envfactory/test.jsonl")
    parser.add_argument("--output-dir", default="model/artifacts/sft_tooluse")
    parser.add_argument("--merge-output", default="")
    parser.add_argument("--epochs", type=float, default=1.0)
    parser.add_argument("--batch-size", type=int, default=1)
    parser.add_argument("--grad-accum", type=int, default=4)
    parser.add_argument("--max-length", type=int, default=512)
    parser.add_argument("--lora-rank", type=int, default=16)
    parser.add_argument("--max-train-samples", type=int, default=0)
    parser.add_argument("--dry-run", action="store_true")
    args = parser.parse_args()

    model_path = Path(args.model_path)
    train = _load_rows(Path(args.train_file))
    evaluation = _load_rows(Path(args.eval_file))
    if args.max_train_samples:
        train = train.select(range(min(args.max_train_samples, len(train))))
    manifest = {
        "base_model": str(model_path),
        "train_rows": len(train),
        "eval_rows": len(evaluation),
        "epochs": args.epochs,
        "max_length": args.max_length,
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
    tokenizer = AutoTokenizer.from_pretrained(model_path, local_files_only=True)
    tokenizer.pad_token = tokenizer.pad_token or tokenizer.eos_token
    model = AutoModelForCausalLM.from_pretrained(
        model_path, local_files_only=True, torch_dtype=torch.bfloat16, device_map="auto"
    )
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
    trainer.save_model(args.output_dir)
    tokenizer.save_pretrained(args.output_dir)
    if args.merge_output:
        from peft import PeftModel

        merge_base = AutoModelForCausalLM.from_pretrained(
            model_path, local_files_only=True, torch_dtype=torch.bfloat16
        )
        merged = PeftModel.from_pretrained(merge_base, args.output_dir).merge_and_unload()
        merged.save_pretrained(args.merge_output, safe_serialization=True)
        tokenizer.save_pretrained(args.merge_output)
    report = {**manifest, "evaluation": trainer.evaluate()}
    Path(args.output_dir, "evaluation_report.json").write_text(
        json.dumps(report, indent=2, default=float), encoding="utf-8"
    )


if __name__ == "__main__":
    main()
