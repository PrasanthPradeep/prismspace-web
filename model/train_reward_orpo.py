"""Fine-tune a local causal language model on curated preference pairs with ORPO.

The result is a PEFT/LoRA adapter, not a replacement for the tabular models.
Use ``--dry-run`` first; it validates the exact model and preference schema
without allocating the model or starting GPU training.
"""
from __future__ import annotations

import argparse
import json
import os
from pathlib import Path

# Reduce CUDA memory fragmentation — must be set before torch is imported
os.environ.setdefault("PYTORCH_CUDA_ALLOC_CONF", "expandable_segments:True")


def _load_pairs(path: Path, cache_dir: Path, max_samples: int = 0):
    from datasets import load_dataset

    dataset = load_dataset("json", data_files=str(path), split="train", cache_dir=str(cache_dir))
    required = {"prompt", "chosen", "rejected"}
    missing = required - set(dataset.column_names)
    if missing:
        raise ValueError(f"{path} is missing preference columns: {sorted(missing)}")
    dataset = dataset.filter(lambda row: all(isinstance(row[key], str) and row[key].strip() for key in required))
    if not len(dataset):
        raise ValueError(f"{path} contains no usable preference pairs")
    dataset = dataset.select_columns(["prompt", "chosen", "rejected"])
    if max_samples:
        dataset = dataset.select(range(min(max_samples, len(dataset))))
    return dataset


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--model-path", default="model/datasets/Qwen2.5-1.5B")
    parser.add_argument("--train-file", default="model/datasets/curated/reward/train.jsonl")
    parser.add_argument("--eval-file", default="model/datasets/curated/reward/test.jsonl")
    parser.add_argument("--output-dir", default="model/artifacts/reward_orpo")
    parser.add_argument("--cache-dir", default="model/artifacts/huggingface_cache")
    parser.add_argument("--max-length", type=int, default=256,
                        help="Max token length per sample. Lower = faster. Default 256.")
    parser.add_argument("--epochs", type=float, default=2.0)
    parser.add_argument("--learning-rate", type=float, default=8e-6)
    parser.add_argument("--beta", type=float, default=0.1)
    parser.add_argument("--max-train-samples", type=int, default=0,
                        help="Cap on training pairs; 0 uses every pair.")
    parser.add_argument("--max-eval-samples", type=int, default=500,
                        help="Cap on eval pairs. Reduces eval time significantly. Default 500.")
    parser.add_argument("--batch-size", type=int, default=1,
                        help="Per-device train/eval batch size. Keep at 1 for 4 GB VRAM.")
    parser.add_argument("--grad-accum", type=int, default=4,
                        help="Gradient accumulation steps. Effective batch = batch_size * grad_accum.")
    parser.add_argument("--lora-rank", type=int, default=8,
                        help="LoRA rank. Lower = fewer params = faster. Default 8.")
    parser.add_argument("--dataloader-workers", type=int, default=0,
                        help="CPU workers for data loading. Keep 0 on Windows to avoid spawn overhead.")
    parser.add_argument("--dry-run", action="store_true")
    args = parser.parse_args()

    model_path, train_path, eval_path, output_dir, cache_dir = map(
        Path, (args.model_path, args.train_file, args.eval_file, args.output_dir, args.cache_dir)
    )
    if not model_path.exists():
        raise FileNotFoundError(f"Base model directory does not exist: {model_path}")
    cache_dir.mkdir(parents=True, exist_ok=True)

    train_dataset = _load_pairs(train_path, cache_dir, args.max_train_samples)
    eval_dataset = _load_pairs(eval_path, cache_dir, args.max_eval_samples)

    manifest = {
        "base_model": str(model_path),
        "train_pairs": len(train_dataset),
        "eval_pairs": len(eval_dataset),
        "max_length": args.max_length,
        "epochs": args.epochs,
        "beta": args.beta,
        "lora_rank": args.lora_rank,
        "effective_batch_size": args.batch_size * args.grad_accum,
    }
    print(json.dumps(manifest, indent=2))
    if args.dry_run:
        return

    import torch
    from peft import LoraConfig
    from transformers import AutoModelForCausalLM, AutoTokenizer
    from trl.experimental.orpo import ORPOConfig, ORPOTrainer

    if not torch.cuda.is_available():
        raise RuntimeError("ORPO training requires CUDA. Run this on a CUDA-capable GPU host.")
    output_dir.mkdir(parents=True, exist_ok=True)

    tokenizer = AutoTokenizer.from_pretrained(model_path, local_files_only=True)
    tokenizer.pad_token = tokenizer.pad_token or tokenizer.eos_token

    # Load in native bf16 — no quantization.
    # 4-bit quant + ORPO causes NaN in log-softmax due to precision mismatch.
    # Qwen2.5-1.5B in bf16 = ~3 GB VRAM, fits RTX 3050 with batch_size=1.
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

    config = ORPOConfig(
        output_dir=str(output_dir),
        learning_rate=args.learning_rate,
        num_train_epochs=args.epochs,
        per_device_train_batch_size=args.batch_size,
        per_device_eval_batch_size=args.batch_size,
        gradient_accumulation_steps=args.grad_accum,
        gradient_checkpointing=True,
        bf16=True,
        dataloader_num_workers=args.dataloader_workers,
        dataloader_pin_memory=False,  # pin_memory uses extra VRAM — off for 4 GB cards
        logging_steps=10,
        eval_strategy="epoch",
        save_strategy="epoch",
        save_total_limit=1,
        report_to="none",
        max_length=args.max_length,
        beta=args.beta,
        seed=42,
    )

    trainer = ORPOTrainer(
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


if __name__ == "__main__":
    main()
